import express from 'express';
import { isAuth } from '../middleware/auth.middleware.js';
import {
  createPaymentIntentHandler,
  createUpiCollectHandler,
  getBillingProfileHandler,
  paymentWebhookHandler,
} from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/intents', isAuth, createPaymentIntentHandler);
router.post('/upi/collect', isAuth, createUpiCollectHandler);
router.get('/me', isAuth, getBillingProfileHandler);
router.post('/webhook', paymentWebhookHandler);

export default router;
