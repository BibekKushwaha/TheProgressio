import express from 'express';
import { pullSyncOperations, pushSyncOperations } from '../controllers/sync.controller.js';

const router = express.Router();

router.post('/push', pushSyncOperations);
router.get('/pull', pullSyncOperations);

export default router;
