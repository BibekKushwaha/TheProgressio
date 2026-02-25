import express from "express";
import {
    applyRecoveryPlan,
    createTask,
    generateSubtasks,
    getAllTasks,
    getTaskById,
    getTaskMetrics,
    parseTaskIntent,
    previewRecoveryPlan,
    previewSubtasks,
    scanSyllabusImage,
    smartCreateTask,
    taskCategories,
    toggleTask,
    updateTask,
    deleteTask,
} from "../controllers/task.controller.js";

const router = express.Router();

// GET /tasks/metrics - Count-only aggregation (no full task rows transferred)
router.get("/metrics", getTaskMetrics);

// GET /tasks - Get all tasks with pagination, filtering, searching
router.get("/", getAllTasks);

// POST /tasks - Create a new task
router.post("/", createTask);

// POST /tasks/smart-create - Create a task from natural language
router.post("/smart-create", smartCreateTask);

// POST /tasks/parse - Parse a task intent without creating it
router.post("/parse", parseTaskIntent);

// POST /tasks/scan-syllabus - Parse syllabus image into structured tasks
router.post("/scan-syllabus", scanSyllabusImage);

// POST /tasks/preview-subtasks - Generate AI subtasks without creating a task
router.post("/preview-subtasks", previewSubtasks);

// POST /tasks/recovery/preview - Preview recovery rebalance
router.post("/recovery/preview", previewRecoveryPlan);

// POST /tasks/recovery/apply - Apply recovery rebalance
router.post("/recovery/apply", applyRecoveryPlan);

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

router.get("/categories", taskCategories);

export default router;
