import { logger } from '../infra/logging/logger';

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string | null;
  createdAt: Date;
}

export interface ClassificationResult {
  model: 'gpt-4o' | 'o4-mini';
  reason: string;
  thinkingMessage: string;
}

export interface SessionContext {
  hasLabReports: boolean;
  hasActiveFormula: boolean;
  messageCount: number;
  recentMessages: Message[];
}

export function classifyQuery(
  userMessage: string,
  sessionContext: SessionContext
): ClassificationResult {
  const msg = userMessage.toLowerCase();
  const messageLength = userMessage.length;
  
  const formulaKeywords = [
    'formula', 'supplement', 'dosage', 'mg', 'ingredient',
    'formulation', 'recommendation', 'prescribe', 'adjust'
  ];
  
  const labKeywords = [
    'lab', 'blood', 'test', 'result', 'biomarker', 'level',
    'cholesterol', 'vitamin', 'deficiency', 'report'
  ];
  
  const medicalKeywords = [
    'medication', 'condition', 'symptom', 'diagnosis', 'health',
    'chronic', 'allergy', 'treatment', 'doctor'
  ];
  
  const simpleKeywords = [
    'what is', 'how does', 'explain', 'tell me about', 'when',
    'where', 'who', 'define', 'meaning of'
  ];
  
  const hasFormulaKeyword = formulaKeywords.some(k => msg.includes(k));
  const hasLabKeyword = labKeywords.some(k => msg.includes(k));
  const hasMedicalKeyword = medicalKeywords.some(k => msg.includes(k));
  const hasSimpleKeyword = simpleKeywords.some(k => msg.includes(k));
  
  // Use o4-mini for formula creation/adjustment (reasoning model for complex medical logic)
  if (hasFormulaKeyword || sessionContext.hasActiveFormula) {
    logger.debug('MODEL ROUTER: Using o4-mini (formula-related)');
    return {
      model: 'o4-mini',
      reason: 'Formula creation or adjustment requires validation and lab context',
      thinkingMessage: 'Analyzing your health data and researching personalized recommendations...'
    };
  }

  // Use o4-mini for lab-related questions
  if (hasLabKeyword || sessionContext.hasLabReports) {
    logger.debug('MODEL ROUTER: Using o4-mini (lab analysis)');
    return {
      model: 'o4-mini',
      reason: 'Lab analysis requires comprehensive medical knowledge',
      thinkingMessage: 'Reviewing your lab results and medical research...'
    };
  }

  // Use o4-mini for complex medical consultations
  if (hasMedicalKeyword && (messageLength > 200 || sessionContext.messageCount > 3)) {
    logger.debug('MODEL ROUTER: Using o4-mini (complex medical consultation)');
    return {
      model: 'o4-mini',
      reason: 'Complex medical question requiring deep analysis',
      thinkingMessage: 'Conducting comprehensive health analysis...'
    };
  }

  // Use GPT-4o for simple, straightforward questions and general conversation
  if ((hasSimpleKeyword && messageLength < 150 && !hasMedicalKeyword) ||
      (messageLength < 100 && sessionContext.messageCount < 5 && !hasMedicalKeyword)) {
    logger.debug('MODEL ROUTER: Using gpt-4o (simple/conversational)');
    return {
      model: 'gpt-4o',
      reason: 'Simple informational or conversational question',
      thinkingMessage: 'Gathering information...'
    };
  }

  // Default to o4-mini for safety (medical context)
  logger.debug('MODEL ROUTER: Using o4-mini (default/safety)');
  return {
    model: 'o4-mini',
    reason: 'Default to comprehensive analysis for safety',
    thinkingMessage: 'Analyzing your request thoroughly...'
  };
}
