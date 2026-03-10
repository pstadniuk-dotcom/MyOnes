import { Request, Response } from 'express';
import logger from '../../infra/logging/logger';
import { autoShipService } from '../../modules/billing/autoship.service';

export class AutoShipController {
  /** GET /api/auto-ship — current auto-ship status */
  async getStatus(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const autoShip = await autoShipService.getAutoShip(userId);

      if (!autoShip) {
        return res.json({ enabled: false, autoShip: null });
      }

      return res.json({
        enabled: autoShip.status === 'active',
        autoShip: {
          id: autoShip.id,
          status: autoShip.status,
          formulaId: autoShip.formulaId,
          formulaVersion: autoShip.formulaVersion,
          priceCents: autoShip.priceCents,
          supplyWeeks: autoShip.supplyWeeks,
          nextShipmentDate: autoShip.nextShipmentDate,
          memberDiscountApplied: autoShip.memberDiscountApplied,
          createdAt: autoShip.createdAt,
          updatedAt: autoShip.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error fetching auto-ship status', { error });
      return res.status(500).json({ error: 'Failed to fetch auto-ship status' });
    }
  }

  /** POST /api/auto-ship/pause — pause auto-ship */
  async pause(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const autoShip = await autoShipService.pauseAutoShip(userId);
      return res.json({
        status: autoShip.status,
        message: 'Auto-ship paused successfully. You can resume anytime.',
      });
    } catch (error: any) {
      if (error?.message === 'NO_ACTIVE_AUTO_SHIP') {
        return res.status(404).json({ error: 'No active auto-ship to pause' });
      }
      logger.error('Error pausing auto-ship', { error });
      return res.status(500).json({ error: 'Failed to pause auto-ship' });
    }
  }

  /** POST /api/auto-ship/resume — resume auto-ship */
  async resume(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const autoShip = await autoShipService.resumeAutoShip(userId);
      return res.json({
        status: autoShip.status,
        nextShipmentDate: autoShip.nextShipmentDate,
        message: 'Auto-ship resumed! Your next shipment is scheduled.',
      });
    } catch (error: any) {
      if (error?.message === 'NO_AUTO_SHIP_FOUND') {
        return res.status(404).json({ error: 'No auto-ship subscription found' });
      }
      if (error?.message === 'AUTO_SHIP_NOT_PAUSED') {
        return res.status(400).json({ error: 'Auto-ship is not currently paused' });
      }
      logger.error('Error resuming auto-ship', { error });
      return res.status(500).json({ error: 'Failed to resume auto-ship' });
    }
  }

  /** POST /api/auto-ship/cancel — cancel auto-ship */
  async cancel(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const autoShip = await autoShipService.cancelAutoShip(userId);
      return res.json({
        status: autoShip.status,
        message: 'Auto-ship cancelled. You can still place manual orders anytime.',
      });
    } catch (error: any) {
      if (error?.message === 'NO_AUTO_SHIP_TO_CANCEL') {
        return res.status(404).json({ error: 'No auto-ship to cancel' });
      }
      logger.error('Error cancelling auto-ship', { error });
      return res.status(500).json({ error: 'Failed to cancel auto-ship' });
    }
  }

  /** POST /api/auto-ship/skip-next — skip the next shipment */
  async skipNext(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const autoShip = await autoShipService.skipNextShipment(userId);
      return res.json({
        status: autoShip.status,
        nextShipmentDate: autoShip.nextShipmentDate,
        message: 'Next shipment skipped. Auto-ship will resume after.',
      });
    } catch (error: any) {
      if (error?.message === 'NO_ACTIVE_AUTO_SHIP') {
        return res.status(404).json({ error: 'No active auto-ship found' });
      }
      if (error?.message === 'AUTO_SHIP_NOT_LINKED_TO_STRIPE') {
        return res.status(400).json({ error: 'Auto-ship is not linked to a payment method' });
      }
      logger.error('Error skipping next shipment', { error });
      return res.status(500).json({ error: 'Failed to skip next shipment' });
    }
  }
}

export const autoShipController = new AutoShipController();
