import express from "express";
import { createTask, getAllTasks, getTaskById, updateTask, deleteTask, toggleTask, taskCategories } from "../controllers/task.controller.js";

const router = express.Router();

// GET /tasks - Get all tasks with pagination, filtering, searching
router.get("/", getAllTasks);

// POST /tasks - Create a new task
router.post("/", createTask);

// GET /tasks/:id - Get a single task by ID
router.get("/:id", getTaskById);

// PATCH /tasks/:id - Update a task
router.patch("/:id", updateTask);

// DELETE /tasks/:id - Delete a task
router.delete("/:id", deleteTask);

// PATCH /tasks/:id/toggle - Toggle task status
router.patch("/:id/toggle", toggleTask);

router.post("/categories", taskCategories);

export default router;