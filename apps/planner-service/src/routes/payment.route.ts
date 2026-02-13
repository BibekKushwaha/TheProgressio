import express from 'express';
import { isAuth } from '../middleware/auth.middleware.js';
import {
  cancelSubscriptionHandler,
  createOrderHandler,
  createPaymentIntentHandler,
  createUpiCollectHandler,
  getBillingProfileHandler,
  paymentHistoryHandler,
  paymentStatusHandler,
  paymentWebhookHandler,
  verifyPaymentHandler,
} from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/intents', isAuth, createPaymentIntentHandler);
router.post('/upi/collect', isAuth, createUpiCollectHandler);
router.get('/me', isAuth, getBillingProfileHandler);

router.post('/create-order', isAuth, createOrderHandler);
router.post('/verify', isAuth, verifyPaymentHandler);
router.get('/status', isAuth, paymentStatusHandler);
router.post('/cancel', isAuth, cancelSubscriptionHandler);
router.get('/history', isAuth, paymentHistoryHandler);

router.post('/webhook', paymentWebhookHandler);

export default router;
