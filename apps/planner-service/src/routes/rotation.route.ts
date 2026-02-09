import express from "express";
import {
    createRotationPattern,
    getRotationPatterns,
    getRotationPatternById,
    updateRotationPattern,
    deleteRotationPattern,
    resolveRotation,
} from "../controllers/rotation.controller.js";

const router = express.Router();

// GET /rotations/resolve - Resolve rotation for a date
router.get("/resolve", resolveRotation);

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
