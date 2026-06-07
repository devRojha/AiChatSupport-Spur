import { Router } from "express";
import chatRoutes from "./chat.routes.js"; // Remember the .js extension for ES Modules!

const router = Router();

// Mount the chat feature routes under the "/chat" path.
router.use("/chat", chatRoutes);

export default router;