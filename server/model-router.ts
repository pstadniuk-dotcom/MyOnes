import type { Message } from "./storage";

export interface ClassificationResult {
  model: 'gpt-4' | 'gpt-4o' | 'o1-mini';
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
  
  // ALWAYS use o1-mini for formula creation/adjustment
  if (hasFormulaKeyword || sessionContext.hasActiveFormula) {
    console.log('🔀 MODEL ROUTER: Using o1-mini (formula-related)');
    return {
      model: 'o1-mini',
      reason: 'Formula creation or adjustment requires validation and lab context',
      thinkingMessage: 'Analyzing your health data and researching personalized recommendations...'
    };
  }
  
  // ALWAYS use o1-mini for lab-related questions
  if (hasLabKeyword || sessionContext.hasLabReports) {
    console.log('🔀 MODEL ROUTER: Using o1-mini (lab analysis)');
    return {
      model: 'o1-mini',
      reason: 'Lab analysis requires comprehensive medical knowledge',
      thinkingMessage: 'Reviewing your lab results and medical research...'
    };
  }
  
  // ALWAYS use o1-mini for complex medical consultations
  if (hasMedicalKeyword && (messageLength > 200 || sessionContext.messageCount > 3)) {
    console.log('🔀 MODEL ROUTER: Using o1-mini (complex medical consultation)');
    return {
      model: 'o1-mini',
      reason: 'Complex medical question requiring deep analysis',
      thinkingMessage: 'Conducting comprehensive health analysis...'
    };
  }
  
  // Use GPT-4o for simple, straightforward questions
  if (hasSimpleKeyword && messageLength < 150 && !hasMedicalKeyword) {
    console.log('🔀 MODEL ROUTER: Using gpt-4o (simple question)');
    return {
      model: 'gpt-4o',
      reason: 'Simple informational question',
      thinkingMessage: 'Gathering information...'
    };
  }
  
  // Use GPT-4 for general conversation, short questions
  if (messageLength < 100 && sessionContext.messageCount < 5 && !hasMedicalKeyword) {
    console.log('🔀 MODEL ROUTER: Using gpt-4 (general conversation)');
    return {
      model: 'gpt-4',
      reason: 'Brief conversational message',
      thinkingMessage: 'Thinking...'
    };
  }
  
  // Default to o1-mini for safety (medical context)
  console.log('🔀 MODEL ROUTER: Using o1-mini (default/safety)');
  return {
    model: 'o1-mini',
    reason: 'Default to comprehensive analysis for safety',
    thinkingMessage: 'Analyzing your request thoroughly...'
  };
}
