import { clerkClient } from "@clerk/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";
import type { Post } from "@prisma/client";
import next from "next/types";


const addUserDataToPosts = async (posts: Post[]) => {

  // get all user information for each post
  const users = (await clerkClient.users.getUserList({
    userId: posts.map((post) => post.authorId),
    limit: 100,
  })).map(filterUserForClient);

  return posts.map((post) => {
    const author = users.find((user) => user.id === post.authorId);

    if (!author || !author.username) throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Author for post not found",
    });

    return {
      post,
      author: {
        ...author,
        username: author.username,
      },
    }
  })
}

// Create a new ratelimiter, that allows 3 requests per 1 minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */
  prefix: "@upstash/ratelimit",
});

export const postRouter = createTRPCRouter({

  //TODO: remove this
  // getAll: publicProcedure.query(async ({ ctx }) => {
  //   return ctx.prisma.post.findMany();
  // }),
  create: privateProcedure
    .input(z.object({ content: z.string().emoji("Only emojis are allowed!").min(1).max(200, "Too long!") }))
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.userId;

      const { success } = await ratelimit.limit(authorId);
      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

      const post = await ctx.prisma.post.create({
        data: {
          authorId,
          content: input.content,
        }
      })
      return post;
    }),

  getByPostId: publicProcedure.input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {

      const post = await ctx.prisma.post.findUnique({
        where: {
          id: input.id,
        }
      })

      if (!post) throw new TRPCError({
        code: "NOT_FOUND",
        message: "Post not found",
      });

      return (await addUserDataToPosts([post]))[0];
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100, // TODO: a good thing to do would be remove this take 100 and replace it with infiniteQuery with Pagination
      orderBy: {
        createdAt: "desc",
      },
    });
    return addUserDataToPosts(posts);
  }),

  getPostsByAuthorId: publicProcedure.input(z.object({ authorId: z.string() }))
    .query(async ({ input, ctx }) => {

      const posts = await ctx.prisma.post.findMany({
        where: {
          authorId: input.authorId,
        },
        take: 100,
        orderBy: {
          createdAt: "desc",
        },
      });

      return addUserDataToPosts(posts);

    }),

  getBatch: publicProcedure.input(z.object({
    limit: z.number().min(1).max(100).nullish(),
    cursor: z.string().nullish(),
    authorId: z.string().optional(),
  }))
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 10;
      const { cursor, authorId } = input;


      const posts = await ctx.prisma.post.findMany({
        take: limit + 1,
        where: {
          authorId
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;

      if (posts.length > limit) {
        const nextPost = posts.pop();
        nextCursor = nextPost?.id;
      }
      const postsWithUserData = await addUserDataToPosts(posts);

      return {
        postsWithUserData,
        nextCursor,
      };
    }),


  //
});
