import express from 'express';
import { loginUser, logoutUser, registerUser, getCurrentUser, updateProfile } from '../controllers/auth.controller.js';

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.delete("/logout", logoutUser);
router.get("/me", getCurrentUser);
router.put("/profile", updateProfile);
// router.post("/forgot",forgotPassword);
// router.post("/reset/:token",resetPassword);

export default router;