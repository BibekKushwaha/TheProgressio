import express from "express";
import {
  createSyllabusEdge,
  createSyllabusTopic,
  deleteSyllabusEdge,
  deleteSyllabusTopic,
  getTaskSyllabusTopics,
  listSyllabusEdges,
  listSyllabusTopics,
  setTaskSyllabusTopics,
  updateSyllabusTopic,
} from "../controllers/syllabus.controller.js";

const router = express.Router();

router.get("/topics", listSyllabusTopics);
router.post("/topics", createSyllabusTopic);
router.patch("/topics/:id", updateSyllabusTopic);
router.delete("/topics/:id", deleteSyllabusTopic);

router.get("/edges", listSyllabusEdges);
router.post("/edges", createSyllabusEdge);
router.delete("/edges/:id", deleteSyllabusEdge);

router.get("/tasks/:taskId/topics", getTaskSyllabusTopics);
router.put("/tasks/:taskId/topics", setTaskSyllabusTopics);

export default router;

