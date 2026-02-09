import express from "express";
import { createTask, getAllTasks, getTaskById, updateTask, deleteTask, toggleTask, taskCategories, smartCreateTask, generateSubtasks, previewSubtasks, parseTaskIntent } from "../controllers/task.controller.js";

const router = express.Router();

// GET /tasks - Get all tasks with pagination, filtering, searching
router.get("/", getAllTasks);

// POST /tasks - Create a new task
router.post("/", createTask);

// POST /tasks/smart-create - Create a task from natural language
router.post("/smart-create", smartCreateTask);

// POST /tasks/parse - Parse a task intent without creating it
router.post("/parse", parseTaskIntent);

// POST /tasks/preview-subtasks - Generate AI subtasks without creating a task
router.post("/preview-subtasks", previewSubtasks);

// POST /tasks/:id/subtasks - Generate AI subtasks
router.post("/:id/subtasks", generateSubtasks);

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