/**
 * AI Domain
 */

import { AiRepository } from './ai.repository';
import { AiService } from './ai.service';

const aiRepository = new AiRepository();
export const aiService = new AiService(aiRepository);

export * from './ai.repository';
export * from './ai.service';
