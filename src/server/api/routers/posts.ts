import { clerkClient } from "@clerk/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";

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
    .input(z.object({ content: z.string().emoji("Only emojis are allowed!").min(1).max(200) }))
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
    }
    ),

  getOne: publicProcedure.input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {

      const post = await ctx.prisma.post.findUnique({
        where: {
          id: input.id,
        }
      })

      console.log("TESTING:", post); //TODO: remove this

      if (!post) throw new TRPCError({
        code: "NOT_FOUND",
        message: "Post not found",
      });

      return post;
    }
    ),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
    });

    // get all user information for each post
    const users = (await clerkClient.users.getUserList({
      userId: posts.map((post) => post.authorId),
      limit: 100,
    })).map(filterUserForClient);

    //TODO: console.log("TESTING:", users);

    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId);

      if (!author || !author.username) throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Author for post not found",
      });

      //TODO: console.log("TESTING:", author.username);

      return {
        post,
        author: {
          ...author,
          username: author.username,
        },
      }
    })
  }
  ),
  getPostByAuthorId: publicProcedure.input(z.object({ authorId: z.string() }))
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

      return posts;

    })







  //
});
