import express from 'express';
import {
    createFamilyShareLink,
    deleteAccount,
    demoteFromAdmin,
    exportAccountData,
    forgotPassword,
    getCurrentUser,
    getWhatsAppPairingCode,
    googleLoginCallback,
    googleLoginStart,
    unpairWhatsApp,
    verifyWhatsAppWebhook,
    listFamilyShareLinks,
    listSessions,
    loginUser,
    logoutAllDevices,
    logoutUser,
    refreshUser,
    mobileLogin,
    mobileGoogleLogin,
    mobileLogout,
    mobileMe,
    mobileRefresh,
    promoteToAdmin,
    registerUser,
    resetPassword,
    resolveFamilyShareLink,
    revokeFamilyShareLink,
    revokeSession,
    updateProfile,
} from '../controllers/auth.controller.js';
import { requireAdminBootstrapIp } from '../utils/adminBootstrapGuard.js';

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/google", googleLoginStart);
router.get("/google/callback", googleLoginCallback);
router.post("/refresh", refreshUser);
router.delete("/logout", logoutUser);
router.get("/me", getCurrentUser);
router.put("/profile", updateProfile);
router.get("/export", exportAccountData);
router.delete("/account", deleteAccount);
router.post("/forgot", forgotPassword);
router.post("/reset/:token", resetPassword);

// WhatsApp Pairing
router.get("/whatsapp/pairing", getWhatsAppPairingCode);
router.post("/whatsapp/unpair", unpairWhatsApp);
router.post("/whatsapp/webhook", verifyWhatsAppWebhook);  // called by the bot when user sends pairing code

// Mobile token lifecycle
router.post("/mobile/login", mobileLogin);
router.post("/mobile/google", mobileGoogleLogin);
router.post("/mobile/refresh", mobileRefresh);
router.post("/mobile/logout", mobileLogout);
router.get("/mobile/me", mobileMe);

// Family / mentor share links
router.post("/family-links", createFamilyShareLink);
router.get("/family-links", listFamilyShareLinks);
router.delete("/family-links/:id", revokeFamilyShareLink);
router.get("/family-links/resolve/:token", resolveFamilyShareLink);

// Device-aware session management
router.get("/sessions", listSessions);
router.delete("/sessions", logoutAllDevices);   // revoke all sessions
router.delete("/sessions/:id", revokeSession);   // revoke one session

// Admin role management (protected by ADMIN_BOOTSTRAP_SECRET header)
router.post("/admin/promote", requireAdminBootstrapIp, promoteToAdmin);
router.post("/admin/demote", requireAdminBootstrapIp, demoteFromAdmin);



export default router;
