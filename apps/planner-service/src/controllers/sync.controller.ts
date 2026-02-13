import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { processSyncPull, processSyncPush, type IncomingSyncOperation } from '../services/sync.service.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const parseIncomingOperation = (value: unknown): IncomingSyncOperation | null => {
  if (!isObject(value)) return null;

  const opId = typeof value.opId === 'string' ? value.opId : '';
  const entityType = typeof value.entityType === 'string' ? value.entityType : '';
  const entityId = typeof value.entityId === 'string' ? value.entityId : '';
  const action = typeof value.action === 'string' ? value.action : '';
  const lamportTs = typeof value.lamportTs === 'number' ? value.lamportTs : NaN;

  if (!opId || !entityType || !entityId || !action || !Number.isFinite(lamportTs)) {
    return null;
  }

  return {
    opId,
    entityType: entityType as IncomingSyncOperation['entityType'],
    entityId,
    action,
    lamportTs,
    vectorClock: isObject(value.vectorClock) ? value.vectorClock as Record<string, number> : null,
    payload: isObject(value.payload) ? value.payload : null,
    tombstone: typeof value.tombstone === 'boolean' ? value.tombstone : false,
  };
};

export const pushSyncOperations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : '';
    if (!clientId) {
      return res.status(400).json({ message: 'clientId is required' });
    }

    const operations = asArray(req.body?.operations)
      .map(parseIncomingOperation)
      .filter((operation): operation is IncomingSyncOperation => operation !== null);

    if (operations.length === 0) {
      return res.status(400).json({ message: 'operations must contain at least one valid operation' });
    }

    const result = await processSyncPush(userId, {
      clientId,
      operations,
    });

    return res.status(200).json({
      message: 'Sync push processed',
      ...result,
    });
  } catch (error) {
    console.error('Sync push failed:', error);
    return res.status(500).json({ message: 'Failed to process sync push' });
  }
};

export const pullSyncOperations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sinceRaw = req.query.since;
    const parsedSince = typeof sinceRaw === 'string' ? Number.parseInt(sinceRaw, 10) : 0;
    const since = Number.isFinite(parsedSince) ? parsedSince : 0;

    const result = await processSyncPull(userId, since);

    return res.status(200).json({
      message: 'Sync pull result',
      ...result,
    });
  } catch (error) {
    console.error('Sync pull failed:', error);
    return res.status(500).json({ message: 'Failed to process sync pull' });
  }
};
