import { Router } from "express";
import { createSubTask, updateSubTask, deleteSubTask } from "../controllers/subtask.controller.js";

const router = Router();

router.post("/", createSubTask);
router.patch("/:id", updateSubTask);
router.delete("/:id", deleteSubTask);

export default router;
