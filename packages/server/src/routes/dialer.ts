import express from 'express';
import { DialerController } from '../controllers/DialerController';

const router = express.Router();

// Dialer control endpoints
router.post('/start', DialerController.startDialer);
router.post('/pause', DialerController.pauseDialer);
router.post('/resume', DialerController.resumeDialer);
router.post('/stop', DialerController.stopDialer);

// Dialer status endpoints
router.get('/status/:campaignId', DialerController.getDialerStatus);
router.get('/active', DialerController.getActiveDialers);

export default router;
