import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/notifications
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const notifications = await notificationService.getNotificationsForUser(req.user!.userId);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response, next) => {
  try {
    const updated = await notificationService.markAsRead(req.params.id, req.user!.userId);
    res.json({ message: 'Marked as read', notification: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
