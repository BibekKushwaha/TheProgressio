import express from "express";
import {
  createSyllabusEdge,
  importSyllabusTopics,
  createSyllabusTopic,
  deleteSyllabusEdge,
  deleteSyllabusTopic,
  getSyllabusProgress,
  getSyllabusRevisionRecommendations,
  getTaskSyllabusTopics,
  listSyllabusEdges,
  listSyllabusTopics,
  setTaskSyllabusTopics,
  updateSyllabusTopic,
} from "../controllers/syllabus.controller.js";

const router = express.Router();

router.get("/topics", listSyllabusTopics);
router.post("/topics", createSyllabusTopic);
router.post("/topics/import", importSyllabusTopics);
router.patch("/topics/:id", updateSyllabusTopic);
router.delete("/topics/:id", deleteSyllabusTopic);

router.get("/edges", listSyllabusEdges);
router.post("/edges", createSyllabusEdge);
router.delete("/edges/:id", deleteSyllabusEdge);

router.get("/progress", getSyllabusProgress);
router.get("/revision-recommendations", getSyllabusRevisionRecommendations);
router.get("/tasks/:taskId/topics", getTaskSyllabusTopics);
router.put("/tasks/:taskId/topics", setTaskSyllabusTopics);

export default router;
