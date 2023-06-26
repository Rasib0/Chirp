import { clerkClient } from "@clerk/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";

export const profileRouter = createTRPCRouter({
    getUserByUsername: publicProcedure.input(z.object({ username: z.string() }))
        .query(async ({ input }) => {
            const [user] = await clerkClient.users.getUserList({
                username: [input.username],
            })

            if (!user) throw new TRPCError({
                code: "NOT_FOUND",
                message: "User not found",
            })

            return filterUserForClient(user);
        }),

    hello: publicProcedure
        .input(z.object({ text: z.string() }))
        .query(({ input }) => {
            return {
                greeting: `Hello ${input.text}`,
            };
        }),
});
