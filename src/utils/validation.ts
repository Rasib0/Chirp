import { z } from "zod";

export const inputSchema = z.object({
    content: z
        .string()
        .emoji("Only emojis are allowed!")
        .min(1)
        .max(200, "Too long!"),
});

export type inputSchemaType = z.infer<typeof inputSchema>;
