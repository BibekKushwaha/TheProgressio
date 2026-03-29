import express from "express";
import {
    createRotationPattern,
    getRotationPatterns,
    getRotationPatternById,
    updateRotationPattern,
    deleteRotationPattern,
} from "../controllers/rotation.controller.js";

const router = express.Router();

// GET /rotations - Get all rotation patterns
router.get("/", getRotationPatterns);

// POST /rotations - Create a rotation pattern
router.post("/", createRotationPattern);

// GET /rotations/:id - Get a single rotation pattern
router.get("/:id", getRotationPatternById);

// PATCH /rotations/:id - Update a rotation pattern
router.patch("/:id", updateRotationPattern);

// DELETE /rotations/:id - Delete a rotation pattern
router.delete("/:id", deleteRotationPattern);

export default router;
