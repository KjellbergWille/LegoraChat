import { z } from 'zod';
export interface User {
    id: string;
    username: string;
    password: string;
    createdAt: string;
}
export interface Message {
    id: string;
    threadId: string;
    senderId: string;
    content: string;
    senderName?: string;
}
export interface Thread {
    id: string;
    name: string;
    participants: string[];
    createdAt: string;
    lastMessage?: Message;
}
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
export declare const createThreadSchema: z.ZodObject<{
    participantUsernames: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    participantUsernames: string[];
}, {
    participantUsernames: string[];
}>;
export declare const sendMessageSchema: z.ZodObject<{
    threadId: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    threadId: string;
    content: string;
}, {
    threadId: string;
    content: string;
}>;
//# sourceMappingURL=types.d.ts.map