import express from 'express';
import { loginUser, logoutUser, registerUser, getCurrentUser, updateProfile, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { prisma } from '@repo/db';
import bcrypt from 'bcrypt';

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.delete("/logout", logoutUser);
router.get("/me", getCurrentUser);
router.put("/profile", updateProfile);
router.post("/forgot", forgotPassword);
router.post("/reset/:token", resetPassword);



export default router;