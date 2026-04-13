import { Request, Response } from 'express';
import { logger } from '../../infra/logging/logger';
import { seoRepository } from '../../modules/seo/seo.repository';

/** GET /api/seo/admin/keywords */
export async function adminListKeywords(req: Request, res: Response) {
  try {
    const search = (req.query.search as string || '').trim() || undefined;
    const competition = (req.query.competition as string || '').trim() || undefined;
    const sort = (req.query.sort as string) || 'volume';
    const order = (req.query.order as 'asc' | 'desc') || 'desc';
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const page = Math.max(0, parseInt(req.query.page as string) || 0);

    const result = await seoRepository.getKeywords({ search, competition, sort, order, limit, offset: page * limit });
    return res.json({ ...result, page, pages: Math.ceil(result.total / limit) });
  } catch (err: any) {
    logger.error('[seo] adminListKeywords error', { error: err });
    return res.status(500).json({ error: 'Failed to load keywords' });
  }
}

/** GET /api/seo/admin/keywords/stats */
export async function adminGetKeywordStats(_req: Request, res: Response) {
  try {
    const stats = await seoRepository.getKeywordStats();
    return res.json(stats);
  } catch (err: any) {
    logger.error('[seo] adminGetKeywordStats error', { error: err });
    return res.status(500).json({ error: 'Failed to load keyword stats' });
  }
}

/** GET /api/seo/admin/pipeline */
export async function adminGetPipeline(req: Request, res: Response) {
  try {
    const tier = (req.query.tier as string || '').trim() || undefined;
    const status = (req.query.status as string) || 'all';
    const search = (req.query.search as string || '').trim() || undefined;

    const result = await seoRepository.getTopicPipeline({ tier, status, search });
    return res.json(result);
  } catch (err: any) {
    logger.error('[seo] adminGetPipeline error', { error: err });
    return res.status(500).json({ error: 'Failed to load pipeline' });
  }
}

/** GET /api/seo/admin/pipeline/queue */
export async function adminGetGenerationQueue(req: Request, res: Response) {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const result = await seoRepository.getGenerationQueue(limit);
    return res.json(result);
  } catch (err: any) {
    logger.error('[seo] adminGetGenerationQueue error', { error: err });
    return res.status(500).json({ error: 'Failed to load generation queue' });
  }
}

/** GET /api/seo/admin/strategy */
export async function adminGetStrategy(_req: Request, res: Response) {
  try {
    const strategy = await seoRepository.getStrategy();
    return res.json(strategy);
  } catch (err: any) {
    logger.error('[seo] adminGetStrategy error', { error: err });
    return res.status(500).json({ error: 'Failed to load strategy' });
  }
}

/** PATCH /api/seo/admin/strategy */
export async function adminSaveStrategy(req: Request, res: Response) {
  try {
    const strategy = await seoRepository.saveStrategy(req.body);
    return res.json(strategy);
  } catch (err: any) {
    logger.error('[seo] adminSaveStrategy error', { error: err });
    return res.status(500).json({ error: 'Failed to save strategy' });
  }
}

/** POST /api/seo/admin/keywords/:keyword/pin */
export async function adminPinKeyword(req: Request, res: Response) {
  try {
    const keyword = decodeURIComponent(req.params.keyword);
    const action = req.body.action || 'pin'; // 'pin' | 'unpin'
    const strategy = action === 'unpin'
      ? await seoRepository.unpinKeyword(keyword)
      : await seoRepository.pinKeyword(keyword);
    return res.json(strategy);
  } catch (err: any) {
    logger.error('[seo] adminPinKeyword error', { error: err });
    return res.status(500).json({ error: 'Failed to update pin status' });
  }
}

/** POST /api/seo/admin/keywords/:keyword/skip */
export async function adminSkipKeyword(req: Request, res: Response) {
  try {
    const keyword = decodeURIComponent(req.params.keyword);
    const action = req.body.action || 'skip'; // 'skip' | 'unskip'
    const strategy = action === 'unskip'
      ? await seoRepository.unskipKeyword(keyword)
      : await seoRepository.skipKeyword(keyword);
    return res.json(strategy);
  } catch (err: any) {
    logger.error('[seo] adminSkipKeyword error', { error: err });
    return res.status(500).json({ error: 'Failed to update skip status' });
  }
}
