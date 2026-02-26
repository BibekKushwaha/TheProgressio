import express from 'express';
import {
    createFamilyShareLink,
    deleteAccount,
    exportAccountData,
    forgotPassword,
    getCurrentUser,
    getWhatsAppPairingCode,
    googleLoginCallback,
    googleLoginStart,
    unpairWhatsApp,
    verifyWhatsAppWebhook,
    listFamilyShareLinks,
    loginUser,
    logoutUser,
    refreshUser,
    mobileLogin,
    mobileGoogleLogin,
    mobileLogout,
    mobileMe,
    mobileRefresh,
    registerUser,
    resetPassword,
    resolveFamilyShareLink,
    revokeFamilyShareLink,
    updateProfile,
} from '../controllers/auth.controller.js';

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



export default router;
