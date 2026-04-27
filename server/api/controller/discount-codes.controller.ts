import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../../infra/logging/logger';
import { discountCodesService } from '../../modules/discount-codes/discount-codes.service';
import { membershipService } from '../../modules/membership/membership.service';
import { formulasService } from '../../modules/formulas/formulas.service';

const createSchema = z.object({
  code: z.string().trim().min(2).max(64),
  description: z.string().max(280).optional().nullable(),
  type: z.enum(['percent', 'fixed_cents', 'free_shipping']),
  value: z.number().int().min(0).max(1_000_000),
  maxUses: z.number().int().min(1).optional().nullable(),
  maxUsesPerUser: z.number().int().min(1).default(1),
  minOrderCents: z.number().int().min(0).default(0),
  firstOrderOnly: z.boolean().default(false),
  stackableWithMember: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateSchema = createSchema.partial();

const validateSchema = z.object({
  code: z.string().trim().min(1).max(64),
  formulaId: z.string().uuid().optional(),
});

function mapValidationErrorToHttp(error: string): { status: number; message: string } {
  switch (error) {
    case 'NOT_FOUND': return { status: 404, message: 'That discount code does not exist.' };
    case 'INACTIVE': return { status: 400, message: 'That discount code is no longer active.' };
    case 'EXPIRED': return { status: 400, message: 'That discount code has expired.' };
    case 'EXHAUSTED': return { status: 409, message: 'That discount code has reached its usage limit.' };
    case 'USER_LIMIT': return { status: 400, message: 'You have already used this discount code.' };
    case 'MIN_ORDER': return { status: 400, message: 'Your order does not meet the minimum amount for this discount code.' };
    case 'FIRST_ORDER_ONLY': return { status: 400, message: 'This discount code is only valid on your first order.' };
    default: return { status: 400, message: 'Invalid discount code.' };
  }
}

export class DiscountCodesController {
  // ── User-facing: preview a code at checkout ──
  async validate(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const parsed = validateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
      }

      // Pull the user's formula price so the preview reflects what the server will actually compute.
      // Falls back to 0 (which will still trip MIN_ORDER for any code with a min_order_cents > 0).
      let formulaCents = 0;
      try {
        const quote = await formulasService.getFormulaQuote(userId, parsed.data.formulaId);
        if (quote?.quote?.total) formulaCents = Math.round(quote.quote.total * 100);
      } catch (err) {
        logger.warn('Could not fetch formula quote for discount preview', { err, userId });
      }

      const membership = await membershipService.getUserMembership(userId).catch(() => ({ hasMembership: false } as any));
      const isMember = !!(membership.hasMembership && !membership.isCancelled);

      const result = await discountCodesService.previewForCheckout({
        code: parsed.data.code,
        userId,
        formulaCents,
        isMember,
      });

      if (!result.ok) {
        const { status, message } = mapValidationErrorToHttp(result.error);
        return res.status(status).json({ error: message, code: `DISCOUNT_CODE_${result.error}` });
      }

      return res.json({ valid: true, ...result.preview });
    } catch (error) {
      logger.error('Error validating discount code', { error });
      return res.status(500).json({ error: 'Failed to validate discount code' });
    }
  }

  // ── Admin CRUD ──
  async list(_req: Request, res: Response) {
    try {
      const codes = await discountCodesService.adminList();
      return res.json(codes);
    } catch (error) {
      logger.error('Error listing discount codes', { error });
      return res.status(500).json({ error: 'Failed to list discount codes' });
    }
  }

  async stats(_req: Request, res: Response) {
    try {
      const stats = await discountCodesService.adminStats();
      return res.json(stats);
    } catch (error) {
      logger.error('Error getting discount code stats', { error });
      return res.status(500).json({ error: 'Failed to get discount code stats' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten().fieldErrors });
      }
      const created = await discountCodesService.adminCreate({
        ...parsed.data,
        description: parsed.data.description ?? null,
        maxUses: parsed.data.maxUses ?? null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        createdBy: userId,
      });
      return res.status(201).json(created);
    } catch (error: any) {
      if (error?.message === 'CODE_REQUIRED') return res.status(400).json({ error: 'Code is required' });
      if (error?.message === 'VALUE_REQUIRED') return res.status(400).json({ error: 'Value is required for this code type' });
      if (error?.message === 'PERCENT_OUT_OF_RANGE') return res.status(400).json({ error: 'Percent value must be 1–100' });
      if (typeof error?.message === 'string' && error.message.includes('duplicate key')) {
        return res.status(409).json({ error: 'A code with that name already exists' });
      }
      logger.error('Error creating discount code', { error });
      return res.status(500).json({ error: 'Failed to create discount code' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten().fieldErrors });
      }
      const updates: any = { ...parsed.data };
      if (parsed.data.expiresAt !== undefined) {
        updates.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
      }
      const updated = await discountCodesService.adminUpdate(id, updates);
      return res.json(updated);
    } catch (error: any) {
      if (error?.message === 'NOT_FOUND') return res.status(404).json({ error: 'Discount code not found' });
      if (error?.message === 'PERCENT_OUT_OF_RANGE') return res.status(400).json({ error: 'Percent value must be 1–100' });
      logger.error('Error updating discount code', { error });
      return res.status(500).json({ error: 'Failed to update discount code' });
    }
  }

  async deactivate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await discountCodesService.adminDeactivate(id);
      return res.json(updated);
    } catch (error: any) {
      if (error?.message === 'NOT_FOUND') return res.status(404).json({ error: 'Discount code not found' });
      logger.error('Error deactivating discount code', { error });
      return res.status(500).json({ error: 'Failed to deactivate discount code' });
    }
  }
}

export const discountCodesController = new DiscountCodesController();
