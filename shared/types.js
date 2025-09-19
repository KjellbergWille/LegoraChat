"use strict";
// Shared type definitions for LegoraChat
// Used by both frontend and backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageSchema = exports.createThreadSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// Zod schemas for validation (backend only)
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string(),
    password: zod_1.z.string(),
});
exports.createThreadSchema = zod_1.z.object({
    participantUsernames: zod_1.z.array(zod_1.z.string()),
});
exports.sendMessageSchema = zod_1.z.object({
    threadId: zod_1.z.string(),
    content: zod_1.z.string(),
});
//# sourceMappingURL=types.js.map