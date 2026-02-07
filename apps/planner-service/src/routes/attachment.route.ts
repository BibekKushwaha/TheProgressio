import { Router } from "express";
import { createAttachment, deleteAttachment } from "../controllers/attachment.controller.js";

const router = Router();

router.post("/", createAttachment);
router.delete("/:id", deleteAttachment);

export default router;
