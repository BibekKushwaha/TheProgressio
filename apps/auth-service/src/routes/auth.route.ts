import express from 'express';
import {
    createFamilyShareLink,
    forgotPassword,
    getCurrentUser,
    listFamilyShareLinks,
    loginUser,
    logoutUser,
    mobileLogin,
    mobileLogout,
    mobileMe,
    mobileRefresh,
    registerUser,
    resetPassword,
    resolveFamilyShareLink,
    revokeFamilyShareLink,
    updateProfile,
} from '../controllers/auth.controller.js';
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

// Mobile token lifecycle
router.post("/mobile/login", mobileLogin);
router.post("/mobile/refresh", mobileRefresh);
router.post("/mobile/logout", mobileLogout);
router.get("/mobile/me", mobileMe);

// Family / mentor share links
router.post("/family-links", createFamilyShareLink);
router.get("/family-links", listFamilyShareLinks);
router.delete("/family-links/:id", revokeFamilyShareLink);
router.get("/family-links/resolve/:token", resolveFamilyShareLink);



export default router;
