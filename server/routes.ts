import express, { type Express, Request, Response, NextFunction } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import YouTube from "youtube-sr";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import type { InsertMessage, InsertChatSession, OptimizeDailyLog } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { SignupData, LoginData, AuthResponse } from "@shared/schema";
import { signupSchema, loginSchema, labReportUploadSchema, userConsentSchema, insertHealthProfileSchema, insertSupportTicketSchema, insertSupportTicketResponseSchema, insertNewsletterSubscriberSchema } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { analyzeLabReport } from "./fileAnalysis";
import { getIngredientDose, isValidIngredient, SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS, SYSTEM_SUPPORT_DETAILS, normalizeIngredientName, findIngredientByName } from "@shared/ingredients";
import { sendNotificationEmail } from "./emailService";
import { sendNotificationSms, sendRawSms } from "./smsService";
import type { User, Notification, NotificationPref } from "@shared/schema";
import { buildGPT4Prompt, buildO1MiniPrompt, type PromptContext } from "./prompt-builder";
import { buildNutritionPlanPrompt, buildWorkoutPlanPrompt, buildLifestylePlanPrompt, buildRecipePrompt } from "./optimize-prompts";
import { analyzeWorkoutHistory, formatAnalysisForPrompt } from "./workoutAnalysis";
import { parseAiJson } from "./utils/parseAiJson";
import { normalizePlanContent, DEFAULT_MEAL_TYPES } from "./optimize-normalizer";
import { getUserLocalMidnight, getUserLocalDateString, toUserLocalDateString } from "./utils/timezone";
import { nanoid } from "nanoid";
import { startOfWeek, endOfWeek, subWeeks, format, parseISO, differenceInWeeks, differenceInDays, isSameDay } from "date-fns";

// Import modular route handlers
import {
  authRoutes,
  userRoutes,
  notificationRoutes,
  adminRoutes,
  supportRoutes,
  consentsRoutes,
  filesRoutes,
  formulasRoutes,
  ingredientsRoutes,
  wearablesRoutes,
  webhooksRoutes,
  optimizeRoutes
} from "./routes/index";

type GroceryListItem = {
  id: string;
  item: string;
  amount?: string;
  unit?: string;
  category?: string;
  checked: boolean;
};

function mapIngredientToItem(value: any): GroceryListItem | null {
  if (!value) return null;
  if (typeof value === 'string') {
    return {
      id: nanoid(8),
      item: value,
      category: 'General',
      checked: false,
    };
  }

  const itemName = value.item || value.name || value.ingredient;
  if (!itemName) {
    return null;
  }

  return {
    id: nanoid(8),
    item: itemName,
    amount: value.quantity || value.amount || value.qty || undefined,
    unit: value.unit,
    category: value.category || value.type || 'General',
    checked: Boolean(value.checked && value.checked === true),
  };
}

function buildGroceryItemsFromPlanContent(content: any): GroceryListItem[] {
  if (Array.isArray(content?.shoppingList) && content.shoppingList.length > 0) {
    return content.shoppingList
      .map((item: any) => mapIngredientToItem(item))
      .filter((item: GroceryListItem | null): item is GroceryListItem => Boolean(item))
      .map((item: GroceryListItem) => ({ ...item, checked: false }));
  }

  const aggregated = new Map<string, GroceryListItem>();
  const weekPlan = Array.isArray(content?.weekPlan) ? content.weekPlan : [];

  weekPlan.forEach((day: any) => {
    if (!Array.isArray(day?.meals)) return;
    day.meals.forEach((meal: any) => {
      if (!Array.isArray(meal?.ingredients)) return;
      meal.ingredients.forEach((ingredient: any) => {
        const normalized = mapIngredientToItem(ingredient);
        if (!normalized) return;
        const key = normalized.item.toLowerCase();
        if (aggregated.has(key)) {
          return;
        }
        aggregated.set(key, normalized);
      });
    });
  });

  return Array.from(aggregated.values());
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    oauthUserId?: string;
    oauthProvider?: string;
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const aiRuntimeSettings: { provider?: 'openai' | 'anthropic'; model?: string; updatedAt?: string; source?: 'override' | 'env' } = {};

const ALLOWED_MODELS: Record<'openai'|'anthropic', string[]> = {
  openai: ['gpt-4o', 'gpt-5'],
  anthropic: [
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-5',
    'claude-haiku-4-5-20251001',
    'claude-haiku-4-5',
    'claude-opus-4-1-20250805',
    'claude-opus-4-1',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022'
  ]
};




function normalizeModel(provider: 'openai'|'anthropic', model: string | undefined | null): string | null {
  if (!model) return null;
  let m = String(model).trim();
  // Normalize separators
  m = m.replace(/\s+/g, '-');
  // Common Anthropic aliases
  if (provider === 'anthropic') {
    const lower = m.toLowerCase();
    // Map "claude 4.5" or "sonnet 4.5" variants to the alias
    if (/claude-?4[\.-]?5(-sonnet)?(-latest)?/i.test(lower) || /sonnet-?4[\.-]?5/i.test(lower)) {
      return 'claude-sonnet-4-5';
    }
    // Map "haiku 4.5" variants
    if (/haiku-?4[\.-]?5/i.test(lower)) {
      return 'claude-haiku-4-5';
    }
    // Map "opus 4.1" variants
    if (/opus-?4[\.-]?1/i.test(lower)) {
      return 'claude-opus-4-1';
    }
    // Legacy 3.x model normalization
    if (/claude-3[\.-]?5(-sonnet)?/i.test(lower)) {
      return 'claude-3-5-sonnet-20241022';
    }
    if (/haiku.*3[\.-]?5/i.test(lower)) {
      return 'claude-3-5-haiku-20241022';
    }
  }
  // Common OpenAI aliases
  if (provider === 'openai') {
    const lower = m.toLowerCase();
    if (/^gpt5|gpt-5|gpt_5/.test(lower)) return 'gpt-5';
    if (/^gpt4o|gpt-4o|gpt_4o/.test(lower)) return 'gpt-4o';
  }
  return m;
}

// Simple Anthropic Messages API caller (non-streaming). We simulate streaming by chunking the final text.
function buildCreateFormulaTool() {
  const approvedNames = [
    ...SYSTEM_SUPPORTS.map(b => b.name),
    ...INDIVIDUAL_INGREDIENTS.map(i => i.name)
  ];
  return {
    name: 'create_formula',
    description: 'Create a supplement formula using only approved ingredients. Use exact catalog names and mg units.',
    input_schema: {
      type: 'object',
      properties: {
        bases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ingredient: { type: 'string', enum: approvedNames },
              amount: { type: 'number', minimum: 10 },
              unit: { type: 'string', enum: ['mg'] },
              purpose: { type: 'string' }
            },
            required: ['ingredient','amount','unit']
          }
        },
        additions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ingredient: { type: 'string', enum: approvedNames },
              amount: { type: 'number', minimum: 10 },
              unit: { type: 'string', enum: ['mg'] },
              purpose: { type: 'string' }
            },
            required: ['ingredient','amount','unit']
          }
        },
        totalMg: { type: 'number', minimum: 10 },
        rationale: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } },
        disclaimers: { type: 'array', items: { type: 'string' } }
      },
      required: ['totalMg']
    }
  };
}

// Helper for retry/backoff
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// TRUE STREAMING Anthropic API caller - sends chunks as they arrive
async function* streamAnthropic(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  model: string,
  temperature = 0.7,
  maxTokens = 3000,
  useTools = true
): AsyncGenerator<{ type: 'text' | 'tool_use'; content: string; toolInput?: any }, void, unknown> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const tools = useTools ? [buildCreateFormulaTool()] : undefined;

  const payload = {
    model: model || 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages,
    tools,
    tool_choice: useTools ? { type: 'auto' } : undefined,
    stream: true,  // Enable streaming!
  } as any;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API HTTP ${res.status}: ${text}`);
  }

  if (!res.body) {
    throw new Error('No response body from Anthropic streaming API');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentToolInput = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]' || !data) continue;

        try {
          const event = JSON.parse(data);
          
          // Handle different event types
          if (event.type === 'content_block_delta') {
            if (event.delta?.type === 'text_delta' && event.delta?.text) {
              yield { type: 'text', content: event.delta.text };
            } else if (event.delta?.type === 'input_json_delta' && event.delta?.partial_json) {
              currentToolInput += event.delta.partial_json;
            }
          } else if (event.type === 'content_block_stop' && currentToolInput) {
            // Tool use completed, parse and yield
            try {
              const toolInput = JSON.parse(currentToolInput);
              yield { type: 'tool_use', content: '```json\n' + JSON.stringify(toolInput, null, 2) + '\n```', toolInput };
            } catch {}
            currentToolInput = '';
          }
        } catch (parseErr) {
          // Skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function callAnthropic(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  model: string,
  temperature = 0.7,
  maxTokens = 3000,
  useTools = true
): Promise<{ text: string; toolJsonBlock?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const tools = useTools ? [buildCreateFormulaTool()] : undefined;

  const payload = {
    model: model || 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages,
    tools,
    tool_choice: useTools ? { type: 'auto' } : undefined,
  } as any;

  let lastErr: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          // If Anthropic requires a newer version header update here centrally
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let parsed: any = text;
        try { parsed = JSON.parse(text || 'null'); } catch {}
        console.error(`❌ Anthropic API Error (attempt ${attempt}): HTTP ${res.status}`, parsed);

        if (res.status >= 500 || res.status === 429) {
          lastErr = new Error(`Anthropic API HTTP ${res.status}: ${JSON.stringify(parsed)}`);
          const backoff = 200 * Math.pow(2, attempt - 1);
          await sleep(backoff);
          continue;
        }

        throw new Error(`Anthropic API HTTP ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
      }

      const data = await res.json().catch(() => null);
      // content: [{type:'text'|'tool_use', ...}]
      let text = '';
      let toolJsonBlock: string | undefined;
      if (Array.isArray(data?.content)) {
        for (const c of data.content) {
          if (c?.type === 'text' && typeof c.text === 'string') {
            text += c.text;
          } else if (c?.type === 'tool_use' && c.name === 'create_formula') {
            try {
              toolJsonBlock = '```json\n' + JSON.stringify(c.input ?? c.parameters ?? {}, null, 2) + '\n```';
            } catch {}
          }
        }
      }

      return { text: text || '', toolJsonBlock };
    } catch (err: any) {
      lastErr = err;
      console.error(`❌ Anthropic request failed (attempt ${attempt}):`, err?.message || err);
      if (attempt === 3) {
        throw new Error(`Anthropic request failed after ${attempt} attempts: ${err?.message || String(err)}`);
      }
      const backoff = 200 * Math.pow(2, attempt - 1);
      await sleep(backoff);
    }
  }
  throw lastErr || new Error('Anthropic request failed');
}

// SECURITY: Immutable formula limits - CANNOT be changed by user requests or AI prompts
const FORMULA_LIMITS = {
  MAX_TOTAL_DOSAGE: 5500,        // Maximum total daily dosage in mg
  DOSAGE_TOLERANCE: 50,          // Allow 50mg tolerance (0.9%) for rounding/calculation differences
  MIN_INGREDIENT_DOSE: 10,       // Global minimum dose per ingredient in mg (lowered to allow clinically valid low-dose ingredients like Lutein 5mg, Resveratrol 20mg)
  MAX_INGREDIENT_COUNT: 50,      // Maximum number of ingredients
} as const;

// Validation function to enforce immutable limits
function validateFormulaLimits(formula: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check total dosage limit (with tolerance)
  const maxWithTolerance = FORMULA_LIMITS.MAX_TOTAL_DOSAGE + FORMULA_LIMITS.DOSAGE_TOLERANCE;
  if (formula.totalMg > maxWithTolerance) {
    errors.push(`Formula exceeds maximum dosage limit of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg (${maxWithTolerance}mg with tolerance) (attempted: ${formula.totalMg}mg)`);
  }
  
  // Validate all ingredients (bases + additions)
  const allIngredients = [...(formula.bases || []), ...(formula.additions || [])];
  
  for (const ingredient of allIngredients) {
    // Check minimum ingredient dose (global minimum)
    if (ingredient.amount < FORMULA_LIMITS.MIN_INGREDIENT_DOSE) {
      errors.push(`Ingredient "${ingredient.ingredient}" below minimum dose of ${FORMULA_LIMITS.MIN_INGREDIENT_DOSE}mg (attempted: ${ingredient.amount}mg)`);
    }
    
    // 🆕 Validate dose ranges for individual ingredients
    const individualIngredient = INDIVIDUAL_INGREDIENTS.find(i => i.name === ingredient.ingredient);
    if (individualIngredient) {
      // Check if ingredient has dose range constraints (min/max)
      if (individualIngredient.doseRangeMin && ingredient.amount < individualIngredient.doseRangeMin) {
        errors.push(
          `"${ingredient.ingredient}" below allowed minimum of ${individualIngredient.doseRangeMin}mg (attempted: ${ingredient.amount}mg). ` +
          `Allowed range: ${individualIngredient.doseRangeMin}-${individualIngredient.doseRangeMax}mg`
        );
      }
      if (individualIngredient.doseRangeMax && ingredient.amount > individualIngredient.doseRangeMax) {
        errors.push(
          `"${ingredient.ingredient}" exceeds allowed maximum of ${individualIngredient.doseRangeMax}mg (attempted: ${ingredient.amount}mg). ` +
          `Allowed range: ${individualIngredient.doseRangeMin}-${individualIngredient.doseRangeMax}mg`
        );
      }
    }
  }
  
  // Check total ingredient count
  if (allIngredients.length > FORMULA_LIMITS.MAX_INGREDIENT_COUNT) {
    errors.push(`Formula exceeds maximum ingredient count of ${FORMULA_LIMITS.MAX_INGREDIENT_COUNT} (attempted: ${allIngredients.length})`);
  }
  
  // Verify all ingredients are approved
  const approvedNames = new Set([
    ...SYSTEM_SUPPORTS.map(f => f.name),
    ...INDIVIDUAL_INGREDIENTS.map(i => i.name)
  ]);
  
  for (const ingredient of allIngredients) {
    if (!approvedNames.has(ingredient.ingredient)) {
      errors.push(`Unapproved ingredient: "${ingredient.ingredient}"`);
    }
  }
  
  // 🚨 CRITICAL: Validate system supports use valid dose multiples (1x, 2x, or 3x)
  // system supports can now be dosed at 1x, 2x, or 3x their base amount
  if (formula.bases && formula.bases.length > 0) {
    for (const base of formula.bases) {
      const catalogBase = SYSTEM_SUPPORTS.find(f => f.name === base.ingredient);
      if (catalogBase) {
        const baseDose = catalogBase.doseMg;
        const validDoses = [baseDose, baseDose * 2, baseDose * 3];
        
        // Check if the amount is a valid multiple (1x, 2x, or 3x)
        if (!validDoses.includes(base.amount)) {
          errors.push(
            `system support "${base.ingredient}" must be dosed at 1x (${baseDose}mg), 2x (${baseDose * 2}mg), or 3x (${baseDose * 3}mg). ` +
            `Attempted: ${base.amount}mg. ` +
            `Use 1x for mild support, 2x for moderate issues, 3x for therapeutic intervention.`
          );
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// JWT Configuration - SECURITY CRITICAL
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

const JWT_SECRET_RAW = process.env.JWT_SECRET;

if (!JWT_SECRET_RAW) {
  if (isProduction) {
    console.error('FATAL: JWT_SECRET environment variable is required in production.');
    console.error('Set JWT_SECRET in Railway dashboard: railway.app → Variables');
    process.exit(1); // Hard fail - do not start server without JWT_SECRET
  }
  console.warn('⚠️  WARNING: JWT_SECRET not set. Using insecure dev fallback. DO NOT DEPLOY THIS.');
}

// TypeScript assertion that JWT_SECRET is now definitely a string
const JWT_SECRET_FINAL: string = JWT_SECRET_RAW || 'dev-only-insecure-secret-do-not-use-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days

// JWT Utilities
function generateToken(userId: string, isAdmin: boolean = false): string {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET_FINAL, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): { userId: string; isAdmin?: boolean } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_FINAL) as { userId: string; isAdmin?: boolean };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Auth middleware for protected routes
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = decoded.userId;
  next();
}

// Admin middleware for admin-only routes
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await storage.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
}

// Helper function to check if an ingredient is approved (uses shared normalization)
// Checks against BOTH system supports and individual ingredients to be category-agnostic
function isIngredientApproved(ingredientName: string, approvedSet: Set<string>): boolean {
  // Use shared normalizeIngredientName which strips potency qualifiers, extraction ratios, etc.
  const normalized = normalizeIngredientName(ingredientName);
  
  // Check if normalized name exists in approved set
  // The approved set is already normalized, so we can do direct lookups
  if (approvedSet.has(normalized)) {
    return true;
  }
  
  // Defensive fallback: check if any approved ingredient matches (preserves backward compat)
  const normalizedLower = normalized.toLowerCase();
  let foundMatch = false;
  approvedSet.forEach((approved) => {
    if (!foundMatch && approved.toLowerCase() === normalizedLower) {
      foundMatch = true;
    }
  });
  if (foundMatch) {
    return true;
  }
  
  return false;
}

// SINGLE SOURCE OF TRUTH: Use shared ingredient catalog for validation
// This ensures prompts and validation are always in sync
const APPROVED_SYSTEM_SUPPORTS = new Set(SYSTEM_SUPPORTS.map(f => f.name));
const APPROVED_INDIVIDUAL_INGREDIENTS = new Set(INDIVIDUAL_INGREDIENTS.map(i => i.name));

// Combined set of ALL approved ingredients (bases + individuals) for category-agnostic validation
const ALL_APPROVED_INGREDIENTS = new Set([
  ...Array.from(APPROVED_SYSTEM_SUPPORTS),
  ...Array.from(APPROVED_INDIVIDUAL_INGREDIENTS)
]);

// Helper to check if ANY ingredient is approved from complete catalog (category-agnostic)
function isAnyIngredientApproved(ingredientName: string): boolean {
  return isIngredientApproved(ingredientName, ALL_APPROVED_INGREDIENTS);
}

function normalizePromptHealthProfile(profile?: Awaited<ReturnType<typeof storage.getHealthProfile>>): PromptContext['healthProfile'] | undefined {
  if (!profile) return undefined;
  const { conditions, medications, allergies, ...rest } = profile;
  return {
    ...rest,
    conditions: conditions ?? undefined,
    medications: medications ?? undefined,
    allergies: allergies ?? undefined,
  };
}

function normalizePromptFormula(formula?: Awaited<ReturnType<typeof storage.getCurrentFormulaByUser>>): PromptContext['activeFormula'] | undefined {
  if (!formula) return undefined;
  const { additions, userCustomizations, ...rest } = formula;
  return {
    ...rest,
    additions: additions ?? undefined,
    userCustomizations: userCustomizations ?? undefined,
  };
}

// SINGLE SOURCE OF TRUTH: Build canonical doses from shared ingredient catalog
const CANONICAL_DOSES_MG = Object.fromEntries(
  [...SYSTEM_SUPPORTS, ...INDIVIDUAL_INGREDIENTS].map(ing => [ing.name, ing.doseMg])
);

// Dose parsing utility that converts string doses to numeric mg
function parseDoseToMg(doseString: string, ingredientName: string): number {
  // Safety checks
  if (!doseString || !ingredientName) {
    console.warn('parseDoseToMg received invalid parameters:', { doseString, ingredientName });
    return 0;
  }
  
  // Handle canonical mapping first
  const canonicalName = Object.keys(CANONICAL_DOSES_MG).find(key => 
    key.toLowerCase() === ingredientName.toLowerCase() ||
    ingredientName.toLowerCase().includes(key.toLowerCase())
  );
  
  if (canonicalName) {
    return CANONICAL_DOSES_MG[canonicalName as keyof typeof CANONICAL_DOSES_MG];
  }
  
  // Parse various dose formats
  const dose = doseString.toLowerCase().replace(/[^0-9.,]/g, '');
  const numericDose = parseFloat(dose);
  
  if (isNaN(numericDose)) {
    console.warn(`Could not parse dose: ${doseString} for ingredient: ${ingredientName}`);
    return 0;
  }
  
  // Convert units to mg
  if (doseString.toLowerCase().includes('g') && !doseString.toLowerCase().includes('mg')) {
    return numericDose * 1000; // grams to mg
  } else if (doseString.toLowerCase().includes('mcg') || doseString.toLowerCase().includes('μg')) {
    return numericDose / 1000; // mcg to mg  
  } else if (doseString.toLowerCase().includes('iu')) {
    // IU conversion (approximate for common vitamins)
    if (ingredientName.toLowerCase().includes('vitamin d')) {
      return numericDose / 1000; // 1000 IU Vitamin D ≈ 1mg
    } else if (ingredientName.toLowerCase().includes('vitamin e')) {
      return numericDose / 15; // 15 IU Vitamin E ≈ 1mg
    }
    return numericDose / 100; // default IU conversion
  }
  
  // Default assumption is mg
  return numericDose;
}

// Server-side formula validation and totalMg calculation
function validateAndCalculateFormula(formula: any): { isValid: boolean, calculatedTotalMg: number, errors: string[] } {
  const errors: string[] = [];
  let calculatedTotal = 0;
  let ingredientCount = 0;
  
  // Validate bases with CATEGORY-AGNOSTIC flexible matching
  if (!formula.bases || formula.bases.length === 0) {
    errors.push('Formula must include at least one system support');
  } else {
    for (const base of formula.bases) {
      ingredientCount++;
      // Use category-agnostic validation - checks against ALL approved ingredients
      if (!isAnyIngredientApproved(base.ingredient)) {
        errors.push(`UNAUTHORIZED INGREDIENT: "${base.ingredient}" is not in the approved catalog. Formula REJECTED.`);
        continue;
      }
      
      // 🔧 FIX: Use amount directly (it's already a number in mg)
      // Don't call parseDoseToMg which looks up catalog dosages
      const mgAmount = typeof base.amount === 'number' ? base.amount : 0;
      if (mgAmount === 0) {
        errors.push(`Invalid amount for base: ${base.ingredient}`);
      }
      calculatedTotal += mgAmount;

      // 🆕 Validate global minimum dose
      if (mgAmount < FORMULA_LIMITS.MIN_INGREDIENT_DOSE) {
        errors.push(`Ingredient "${base.ingredient}" below minimum dose of ${FORMULA_LIMITS.MIN_INGREDIENT_DOSE}mg (attempted: ${mgAmount}mg)`);
      }

      // 🆕 Validate system support multiples (1x, 2x, 3x)
      const catalogBase = SYSTEM_SUPPORTS.find(f => f.name === base.ingredient);
      if (catalogBase) {
        const baseDose = catalogBase.doseMg;
        const validDoses = [baseDose, baseDose * 2, baseDose * 3];
        if (!validDoses.includes(mgAmount)) {
          errors.push(
            `system support "${base.ingredient}" must be dosed at 1x (${baseDose}mg), 2x (${baseDose * 2}mg), or 3x (${baseDose * 3}mg). ` +
            `Attempted: ${mgAmount}mg. ` +
            `Use 1x for mild support, 2x for moderate issues, 3x for therapeutic intervention.`
          );
        }
      }
    }
  }
  
  // Validate additions with CATEGORY-AGNOSTIC flexible matching
  if (formula.additions) {
    for (const addition of formula.additions) {
      ingredientCount++;
      // Use category-agnostic validation - checks against ALL approved ingredients
      if (!isAnyIngredientApproved(addition.ingredient)) {
        errors.push(`UNAUTHORIZED INGREDIENT: "${addition.ingredient}" is not in the approved catalog. Formula REJECTED.`);
        continue;
      }
      
      // 🔧 FIX: Use amount directly (it's already a number in mg)
      // Don't call parseDoseToMg which looks up catalog dosages  
      const mgAmount = typeof addition.amount === 'number' ? addition.amount : 0;
      if (mgAmount === 0) {
        errors.push(`Invalid amount for addition: ${addition.ingredient}`);
      }
      calculatedTotal += mgAmount;

      // 🆕 Validate global minimum dose
      if (mgAmount < FORMULA_LIMITS.MIN_INGREDIENT_DOSE) {
        errors.push(`Ingredient "${addition.ingredient}" below minimum dose of ${FORMULA_LIMITS.MIN_INGREDIENT_DOSE}mg (attempted: ${mgAmount}mg)`);
      }

      // 🆕 Validate individual ingredient ranges
      const individualIngredient = INDIVIDUAL_INGREDIENTS.find(i => i.name === addition.ingredient);
      if (individualIngredient) {
        if (individualIngredient.doseRangeMin && mgAmount < individualIngredient.doseRangeMin) {
          errors.push(
            `"${addition.ingredient}" below allowed minimum of ${individualIngredient.doseRangeMin}mg (attempted: ${mgAmount}mg). ` +
            `Allowed range: ${individualIngredient.doseRangeMin}-${individualIngredient.doseRangeMax}mg`
          );
        }
        if (individualIngredient.doseRangeMax && mgAmount > individualIngredient.doseRangeMax) {
          errors.push(
            `"${addition.ingredient}" exceeds allowed maximum of ${individualIngredient.doseRangeMax}mg (attempted: ${mgAmount}mg). ` +
            `Allowed range: ${individualIngredient.doseRangeMin}-${individualIngredient.doseRangeMax}mg`
          );
        }
      }
    }
  }

  // Check total ingredient count
  if (ingredientCount > FORMULA_LIMITS.MAX_INGREDIENT_COUNT) {
    errors.push(`Formula exceeds maximum ingredient count of ${FORMULA_LIMITS.MAX_INGREDIENT_COUNT} (attempted: ${ingredientCount})`);
  }
  
  // Validate daily total doesn't exceed maximum for 00 capsule size safety (with tolerance)
  const maxWithTolerance = FORMULA_LIMITS.MAX_TOTAL_DOSAGE + FORMULA_LIMITS.DOSAGE_TOLERANCE;
  if (calculatedTotal > maxWithTolerance) {
    errors.push(`Formula total too high: ${calculatedTotal}mg. Maximum ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg (${maxWithTolerance}mg with tolerance) for 00 capsule safety limit.`);
  }
  
  // Validate capsule sizing if provided (00 capsules hold approximately 700-850mg)
  if (formula.capsulesPerDay && formula.capsuleSize) {
    const mgPerCapsule = calculatedTotal / formula.capsulesPerDay;
    
    // Size 00 capacity: 700-850mg (industry standard for 00 capsules)
    if (formula.capsuleSize === '00') {
      if (mgPerCapsule < 600) {
        errors.push(`Capsule size 00 underfilled: ${mgPerCapsule.toFixed(0)}mg per capsule. Recommend using fewer capsules per day.`);
      }
      if (mgPerCapsule > 900) {
        errors.push(`Capsule size 00 overfilled: ${mgPerCapsule.toFixed(0)}mg per capsule. Recommend using more capsules per day.`);
      }
    }
    
    // Validate capsule count is reasonable for daily regimen (6-8 capsules for 4500-5500mg range)
    if (formula.capsulesPerDay < 5 || formula.capsulesPerDay > 10) {
      errors.push(`Capsule count out of range: ${formula.capsulesPerDay}. Recommend 6-8 capsules per day for optimal 00 capsule fill.`);
    }
  }
  
  const isValid = errors.length === 0;
  
  return { isValid, calculatedTotalMg: calculatedTotal, errors };
}

// Enhanced medical validation with comprehensive interaction database
async function validateSupplementInteractions(formula: any, medications: string[] = []): Promise<string[]> {
  const warnings: string[] = [];
  
  // Get all ingredients from formula
  const allIngredients = [
    ...formula.bases.map((b: any) => b.ingredient),
    ...formula.additions.map((a: any) => a.ingredient)
  ];
  
  // Check for general supplement warnings regardless of medications
  for (const ingredient of allIngredients) {
    const generalWarnings = getGeneralSupplementWarnings(ingredient);
    warnings.push(...generalWarnings);
  }
  
  // Check medication interactions if user has medications
  if (medications.length > 0) {
    for (const ingredient of allIngredients) {
      for (const medication of medications) {
        const interaction = await checkKnownInteractions(ingredient, medication);
        if (interaction) {
          warnings.push(interaction);
        }
      }
    }
  }
  
  // Check for supplement-to-supplement interactions
  const supplementInteractions = checkSupplementToSupplementInteractions(allIngredients);
  warnings.push(...supplementInteractions);
  
  // Add mandatory safety disclaimer
  if (warnings.length > 0) {
    warnings.push('IMPORTANT: These are potential interactions. Always consult your healthcare provider before starting new supplements.');
  }
  
  return Array.from(new Set(warnings)); // Remove duplicates
}

// General supplement warnings for special populations and conditions
function getGeneralSupplementWarnings(ingredient: string): string[] {
  const warnings: string[] = [];
  const ingredientLower = ingredient.toLowerCase();
  
  // High-risk supplements that require medical supervision
  const highRiskSupplements = {
    'iron': 'Iron supplements can be toxic in excess. Monitor iron levels and avoid if you have hemochromatosis.',
    'vitamin a': 'High-dose Vitamin A can be toxic. Avoid during pregnancy.',
    'vitamin k': 'Vitamin K affects blood clotting. Monitor if taking blood thinners.',
    '5-htp': '5-HTP affects serotonin levels. Can cause serotonin syndrome with antidepressants.',
    'same': 'SAMe affects neurotransmitters. Can interact with antidepressants and blood thinners.',
    'ginseng': 'Ginseng can affect blood pressure and blood sugar. Monitor if diabetic or hypertensive.',
    'ginkgo': 'Ginkgo increases bleeding risk. Avoid before surgery or with blood thinners.',
    'garlic': 'High-dose garlic increases bleeding risk. Avoid before surgery.',
    'ginger': 'High-dose ginger increases bleeding risk and can affect blood pressure.',
    'turmeric': 'Turmeric/Curcumin increases bleeding risk and can affect blood sugar.',
    'st. john\'s wort': 'St. John\'s Wort interacts with many medications including birth control, antidepressants, and blood thinners.',
    'kava': 'Kava can cause liver damage. Avoid if you have liver problems or take liver-affecting medications.',
    'yohimbe': 'Yohimbe can cause dangerous blood pressure changes and heart problems.',
    'ephedra': 'Ephedra (Ma Huang) can cause heart problems and is banned in many supplements.',
    'comfrey': 'Comfrey can cause liver damage and is not safe for internal use.'
  };
  
  for (const [supplement, warning] of Object.entries(highRiskSupplements)) {
    if (ingredientLower.includes(supplement)) {
      warnings.push(warning);
    }
  }
  
  return warnings;
}

// Check for supplement-to-supplement interactions
function checkSupplementToSupplementInteractions(ingredients: string[]): string[] {
  const warnings: string[] = [];
  const ingredientLower = ingredients.map(i => i.toLowerCase());
  
  // Common supplement interactions
  const interactions = [
    {
      supplements: ['iron', 'calcium'],
      warning: 'Iron and Calcium compete for absorption. Take Iron and Calcium supplements 2+ hours apart.'
    },
    {
      supplements: ['zinc', 'copper'],
      warning: 'High-dose Zinc can deplete Copper. Maintain 10:1 Zinc:Copper ratio.'
    },
    {
      supplements: ['vitamin c', 'iron'],
      warning: 'Vitamin C enhances Iron absorption - monitor for iron overload if taking both.'
    },
    {
      supplements: ['magnesium', 'calcium'],
      warning: 'High-dose Calcium can interfere with Magnesium absorption. Balance is important.'
    },
    {
      supplements: ['5-htp', 'same'],
      warning: 'Both 5-HTP and SAMe affect serotonin/neurotransmitters. Avoid combining without medical supervision.'
    }
  ];
  
  for (const interaction of interactions) {
    const foundSupplements = interaction.supplements.filter(supplement => 
      ingredientLower.some(ingredient => ingredient.includes(supplement))
    );
    
    if (foundSupplements.length >= 2) {
      warnings.push(interaction.warning);
    }
  }
  
  return warnings;
}

// Comprehensive known interactions database (significantly expanded)
async function checkKnownInteractions(supplement: string, medication: string): Promise<string | null> {
  const interactions: Record<string, Record<string, string>> = {
    // Blood thinners and coagulation
    'Vitamin K': {
      'warfarin': 'Vitamin K can interfere with warfarin effectiveness. Monitor INR closely.',
      'coumadin': 'Vitamin K can interfere with coumadin effectiveness. Monitor INR closely.',
      'heparin': 'Vitamin K can affect clotting times with heparin.',
      'aspirin': 'Monitor bleeding risk when combining Vitamin K with aspirin.'
    },
    'Garlic': {
      'warfarin': 'Garlic may increase bleeding risk with warfarin.',
      'aspirin': 'Garlic + aspirin increases bleeding risk.',
      'clopidogrel': 'Garlic may increase bleeding risk with clopidogrel.'
    },
    'Ginkgo': {
      'warfarin': 'Ginkgo significantly increases bleeding risk with warfarin.',
      'aspirin': 'Ginkgo + aspirin increases bleeding risk.',
      'ibuprofen': 'Ginkgo + NSAIDs increases bleeding risk.'
    },
    
    // Mood and psychiatric medications
    'St. John\'s Wort': {
      'ssri': 'St. John\'s Wort may cause serotonin syndrome with SSRIs.',
      'antidepressants': 'St. John\'s Wort may interact with antidepressants causing serotonin syndrome.',
      'birth control': 'St. John\'s Wort can reduce birth control effectiveness.',
      'digoxin': 'St. John\'s Wort can reduce digoxin levels.',
      'cyclosporine': 'St. John\'s Wort can reduce cyclosporine levels.',
      'simvastatin': 'St. John\'s Wort can reduce statin effectiveness.'
    },
    '5-HTP': {
      'ssri': '5-HTP with SSRIs may cause serotonin syndrome.',
      'antidepressants': '5-HTP with antidepressants may cause serotonin syndrome.',
      'maoi': '5-HTP with MAOIs can be dangerous.',
      'tramadol': '5-HTP with tramadol increases serotonin syndrome risk.'
    },
    'SAMe': {
      'antidepressants': 'SAMe can interact with antidepressants.',
      'maoi': 'SAMe with MAOIs can cause dangerous interactions.'
    },
    
    // Cardiovascular medications
    'Ginseng': {
      'blood pressure': 'Ginseng may interact with blood pressure medications.',
      'ace inhibitor': 'Ginseng may affect ACE inhibitor effectiveness.',
      'beta blocker': 'Ginseng may interact with beta blockers.',
      'calcium channel blocker': 'Ginseng may affect calcium channel blockers.',
      'digoxin': 'Ginseng may increase digoxin levels.',
      'warfarin': 'Ginseng may affect warfarin metabolism.'
    },
    'Hawthorn': {
      'digoxin': 'Hawthorn may increase digoxin effects.',
      'beta blocker': 'Hawthorn may enhance beta blocker effects.',
      'calcium channel blocker': 'Hawthorn may enhance calcium channel blocker effects.'
    },
    
    // Diabetes medications
    'Chromium': {
      'insulin': 'Chromium may enhance insulin effects - monitor blood sugar.',
      'metformin': 'Chromium may enhance metformin effects.',
      'diabetes': 'Chromium may affect blood sugar levels with diabetes medications.'
    },
    'Cinnamon': {
      'diabetes': 'Cinnamon may enhance diabetes medication effects - monitor blood sugar.',
      'insulin': 'Cinnamon may enhance insulin effects.'
    },
    
    // Thyroid medications  
    'Iron': {
      'thyroid': 'Iron can interfere with thyroid medication absorption. Take 4+ hours apart.',
      'levothyroxine': 'Iron reduces levothyroxine absorption. Take 4+ hours apart.',
      'calcium': 'Iron and calcium compete for absorption. Take separately.'
    },
    'Calcium': {
      'thyroid': 'Calcium can interfere with thyroid medication absorption.',
      'levothyroxine': 'Calcium reduces levothyroxine absorption. Take 4+ hours apart.',
      'antibiotics': 'Calcium can reduce antibiotic absorption.'
    },
    
    // Seizure medications
    'Folate': {
      'phenytoin': 'Folate may reduce phenytoin levels.',
      'carbamazepine': 'Folate may interact with carbamazepine.',
      'valproic acid': 'Folate may interact with valproic acid.'
    },
    
    // Immunosuppressants
    'Echinacea': {
      'immunosuppressant': 'Echinacea may counteract immunosuppressive medications.',
      'cyclosporine': 'Echinacea may reduce cyclosporine effectiveness.',
      'tacrolimus': 'Echinacea may interact with tacrolimus.'
    },
    
    // Antibiotics
    'Zinc': {
      'antibiotic': 'Zinc can reduce antibiotic absorption. Take 2+ hours apart.',
      'quinolone': 'Zinc significantly reduces quinolone antibiotic absorption.'
    },
    
    // Sleep medications
    'Melatonin': {
      'sedative': 'Melatonin may enhance sedative effects.',
      'sleeping pill': 'Melatonin may enhance sleeping medication effects.',
      'benzodiazepine': 'Melatonin may enhance benzodiazepine effects.'
    },
    'Valerian': {
      'sedative': 'Valerian may enhance sedative effects.',
      'sleeping pill': 'Valerian may enhance sleeping medication effects.'
    }
  };
  
  // Check if supplement is in our database
  const supplementLower = supplement.toLowerCase();
  const medicationLower = medication.toLowerCase();
  
  for (const [suppKey, medInteractions] of Object.entries(interactions)) {
    if (supplementLower.includes(suppKey.toLowerCase())) {
      for (const [medKey, warning] of Object.entries(medInteractions)) {
        if (medicationLower.includes(medKey.toLowerCase()) ||
            medKey.toLowerCase().includes(medicationLower)) {
          return `INTERACTION: ${warning}`;
        }
      }
    }
  }
  
  return null;
}

// Schema for formula extraction
const FormulaExtractionSchema = z.object({
  bases: z.array(z.object({
    ingredient: z.string(),
    amount: z.number(),
    unit: z.string(),
    purpose: z.string()
  })),
  additions: z.array(z.object({
    ingredient: z.string(),
    amount: z.number(),
    unit: z.string(),
    purpose: z.string()
  })),
  totalMg: z.number().optional(), // Made optional - backend calculates if missing
  warnings: z.array(z.string()),
  rationale: z.string(),
  disclaimers: z.array(z.string())
});

/**
 * Post-generation ingredient validator
 * Automatically corrects AI-generated ingredient names to match catalog
 * Returns: { success: boolean, correctedFormula: Formula, errors: string[] }
 */
function validateAndCorrectIngredientNames(formula: any): {
  success: boolean;
  correctedFormula: any;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const correctedFormula = JSON.parse(JSON.stringify(formula)); // deep clone
  
  console.log('🔍 POST-GENERATION VALIDATOR: Checking ingredient names...');
  
  // Validate and correct system supports
  for (let i = 0; i < correctedFormula.bases.length; i++) {
    const base = correctedFormula.bases[i];
    const originalName = base.ingredient;
    const normalizedName = normalizeIngredientName(originalName);
    const catalogBase = SYSTEM_SUPPORTS.find(f => f.name.toLowerCase() === normalizedName.toLowerCase());
    
    if (!catalogBase) {
      // Instead of erroring, remove the invalid ingredient and add a warning
      const warningMsg = `Removed unapproved system support: "${originalName}"`;
      warnings.push(warningMsg);
      if (!correctedFormula.warnings) correctedFormula.warnings = [];
      correctedFormula.warnings.push(warningMsg);
      
      console.log(`⚠️ REMOVED invalid system support: "${originalName}"`);
      correctedFormula.bases.splice(i, 1);
      i--; // Adjust index since we removed an element
    } else if (originalName !== catalogBase.name) {
      warnings.push(`⚠️ AUTO-CORRECTED: "${originalName}" → "${catalogBase.name}"`);
      correctedFormula.bases[i].ingredient = catalogBase.name;
      console.log(`✅ AUTO-CORRECTED base: "${originalName}" → "${catalogBase.name}"`);
    } else {
      console.log(`✅ VALID base: "${originalName}"`);
    }
  }
  
  // Validate and correct individual ingredients
  for (let i = 0; i < correctedFormula.additions.length; i++) {
    const addition = correctedFormula.additions[i];
    const originalName = addition.ingredient;
    const normalizedName = normalizeIngredientName(originalName);
    const catalogIngredient = INDIVIDUAL_INGREDIENTS.find(ing => ing.name.toLowerCase() === normalizedName.toLowerCase());
    
    if (!catalogIngredient) {
      // Instead of erroring, remove the invalid ingredient and add a warning
      const warningMsg = `Removed unapproved ingredient: "${originalName}"`;
      warnings.push(warningMsg);
      if (!correctedFormula.warnings) correctedFormula.warnings = [];
      correctedFormula.warnings.push(warningMsg);
      
      console.log(`⚠️ REMOVED invalid individual ingredient: "${originalName}"`);
      correctedFormula.additions.splice(i, 1);
      i--; // Adjust index since we removed an element
    } else if (originalName !== catalogIngredient.name) {
      warnings.push(`⚠️ AUTO-CORRECTED: "${originalName}" → "${catalogIngredient.name}"`);
      correctedFormula.additions[i].ingredient = catalogIngredient.name;
      console.log(`✅ AUTO-CORRECTED ingredient: "${originalName}" → "${catalogIngredient.name}"`);
    } else {
      console.log(`✅ VALID ingredient: "${originalName}"`);
    }
  }
  
  return {
    success: errors.length === 0,
    correctedFormula,
    errors,
    warnings
  };
}

// Complete ONES AI system prompt
const ONES_AI_SYSTEM_PROMPT = `You are ONES AI, a functional medicine practitioner and supplement formulation specialist. You conduct thorough health consultations similar to a medical doctor's visit before creating personalized formulas.

=== 🚨 RESPONSE LENGTH & CONVERSATION FLOW (READ FIRST) 🚨 ===

**CRITICAL: Keep responses SHORT and CONVERSATIONAL**

You are a health practitioner having a CONVERSATION, not writing a medical report.

**MAXIMUM RESPONSE LENGTH:**
- Normal responses: 200-400 words maximum
- Blood test analysis: 400-600 words maximum (summarize, don't list everything)
- Formula recommendations: 300-500 words maximum (formula JSON is separate)

**NEVER DO THESE:**
❌ List every single biomarker from blood tests (summarize TOP 3-5 CRITICAL findings only)
❌ Create numbered priority lists with 8+ items
❌ Show your calculation work ("5818mg... that's over... let me adjust... 5768mg...")
❌ Write multi-paragraph explanations for each ingredient
❌ Include "COMPREHENSIVE HEALTH ANALYSIS" style headers
❌ Write so much that the response gets cut off and user must say "continue"

**ALWAYS DO THESE:**
✅ Summarize blood tests in 2-3 key points (e.g., "Your cardiovascular markers need attention - LDL is high, HDL is low, and your omega-3 levels are critically deficient")
✅ Focus on TOP 3 priorities maximum, not 8
✅ Ask checkpoint questions before proceeding (e.g., "Would you like me to explain these findings in detail, or move forward with a formula?")
✅ Calculate dosages silently - only show the final formula total
✅ Keep ingredient explanations to one sentence each
✅ Be conversational, not clinical

**BLOOD TEST ANALYSIS FORMAT (when user asks to analyze labs):**

WRONG (too long):
"CARDIOVASCULAR HEALTH (Priority: CRITICAL)
LDL-Cholesterol: 151 mg/dL ⬆️ HIGH
Target: <100 mg/dL (optimal <70 mg/dL)
Elevated LDL is THE primary driver of atherosclerosis...
[continues for 3000+ words listing every biomarker]"

CORRECT (conversational summary):
"I've reviewed your blood work. Three things stand out that we should address:

1. Your cardiovascular markers need attention - LDL is 151 (should be under 100), and your HDL is low at 38. Combined with elevated ApoB, this puts you at increased heart disease risk.

2. Your omega-3 levels are critically low at 2.6% (target is 8%+). This affects both heart and brain health.

3. Your homocysteine is elevated at 13.7, which is another cardiovascular risk factor.

The good news: your blood sugar, thyroid, and liver markers all look healthy.

Would you like me to recommend a formula targeting these cardiovascular concerns, or do you want more detail on any of these findings first?"

**FORMULA RECOMMENDATION FORMAT:**

WRONG (showing work):
"TOTAL: 5818mg - Wait, that's 318mg over. Let me adjust...
Reduce Garlic from 200mg to 150mg. New total: 5768mg. Still over...
Reduce Ginkgo from 240mg to 120mg..."

CORRECT (clean output):
"Based on your blood work, here's what I recommend:

- Heart Support (1378mg) - therapeutic dose for your cardiovascular markers
- Omega-3 (1000mg) - to address your deficiency
- Curcumin (600mg) - anti-inflammatory support
- Ashwagandha (600mg) - stress and cortisol management
- Magnesium (400mg) - cardiovascular and blood pressure support

Total: 4978mg

This formula targets your elevated LDL, low HDL, omega-3 deficiency, and high homocysteine. Should I create this for you?"

**CHECKPOINT QUESTIONS (use these to pace the conversation):**
- "Would you like me to explain any of these findings in more detail?"
- "Should I proceed with a formula recommendation, or do you have questions first?"
- "Does this approach make sense for your goals?"
- "Would you like me to add anything else, or does this formula look good?"

=== ⚠️ CRITICAL FORMATTING RULES - FOLLOW EXACTLY ===

**ABSOLUTELY FORBIDDEN - NEVER USE THESE:**
❌ NO ### headers anywhere in your response
❌ NO emojis (📚, 📊, 🔍, 💊, ⚠️, ✅, ⬆️, ⬇️, etc.) - ZERO emojis allowed in your responses
❌ NO ** bold text to highlight ingredient names, section titles, or list item labels
❌ NO **Item Name:** followed by description - this looks too formal and structured
❌ NO markdown-style section headers or overly structured formats

**REQUIRED STYLE:**
Write like a professional healthcare provider speaking naturally to a patient in conversation. Use plain text with minimal formatting.

**What you CAN use:**
✓ Regular paragraphs with natural conversational flow
✓ Simple bullet points using dashes (-) for lists
✓ Bold text ONLY for critical medical values (like blood pressure readings: "Your blood pressure is 140/90 mmHg")
✓ Inline citations in brackets: [Journal Name, Year]
✓ Plain text for ingredient names, biomarkers, and findings

**Example of CORRECT formatting:**

I've reviewed your latest lab results and there are a few cardiovascular markers that need attention. Your total cholesterol is 221 mg/dL (reference: under 200 mg/dL), which puts you in the high range. Similarly, your LDL cholesterol at 151 mg/dL is elevated compared to the optimal level of under 100 mg/dL.

Here's what I recommend based on these findings:

- Heart Support (450mg) - Contains L-Carnitine and CoQ10 to support cardiovascular function and lipid metabolism
- Omega 3 from algae (300mg) - Research shows omega-3s can help improve HDL levels and manage triglycerides

Your current triglycerides are 180 mg/dL (reference: under 150 mg/dL), which the omega-3 should help address. A 2024 meta-analysis in JAMA Cardiology found that omega-3 supplementation at 2000mg/day showed significant cardiovascular benefits.

Would you like me to add these to your current formula?

**Example of WRONG formatting (NEVER do this):**

### 📊 Cardiovascular and Lipid Profile

- **Total Cholesterol:** 221 mg/dL (⬆️ High)
  - Reference: <200 mg/dL
  - **Clinical Significance:** Elevated levels increase cardiovascular risk
  
### 💊 Recommendations

**Heart Support (450mg):**
- Contains L-Carnitine and CoQ10
- Supports cardiovascular function

WRITE NATURALLY LIKE A DOCTOR SPEAKING TO A PATIENT, NOT LIKE A MARKDOWN DOCUMENT WITH HEADERS AND EMOJI SECTIONS

=== 🔬 RESEARCH & EVIDENCE-BASED RECOMMENDATIONS ===

**YOU HAVE WEB SEARCH CAPABILITY** - Use it strategically to provide evidence-backed, current recommendations:

**WHEN TO SEARCH:**
1. **Drug Interactions** - ALWAYS search before recommending supplements if user takes medications
   - Search: "[medication name] + [supplement name] interaction"
   - Example: "metformin berberine interaction 2025"
   - Cite findings: "According to [source], taking these together may..."

2. **Latest Research** - Search for recent studies on ingredients
   - Search: "[ingredient] [condition] clinical trial 2024 2025"
   - Example: "ashwagandha anxiety reduction clinical trial 2024"
   - Cite specific studies: "[Study author, Journal name, Year] found that..."

3. **Biomarker Guidelines** - Reference current medical standards
   - Search: "[biomarker] reference range ADA AHA 2025 guidelines"
   - Example: "HbA1c prediabetes range ADA 2025"
   - Cite authorities: "Per the 2025 ADA guidelines, HbA1c 5.7-6.4% indicates..."

4. **Safety Updates** - Check for recalls or warnings
   - Search: "[ingredient] FDA warning recall 2024 2025"
   - Stay current on safety issues

5. **Dosing Research** - Find evidence-based dosing
   - Search: "[ingredient] optimal dose clinical trial"
   - Example: "omega-3 cardiovascular health dose meta-analysis"

**HOW TO CITE RESEARCH:**
When you find relevant research, cite it naturally in conversation:
- ✅ "A 2024 study in the Journal of Clinical Nutrition found that ashwagandha at 300-600mg daily reduced anxiety by 28% vs placebo in 241 participants."
- ✅ "According to a 2025 meta-analysis in JAMA Cardiology, omega-3 supplementation at 2000mg/day showed a 28% reduction in cardiovascular events."
- ✅ "Research published in Diabetes Care (2024) demonstrated that berberine 500mg 3x daily reduced HbA1c by 0.7% in diabetic patients."

**TRANSPARENCY:**
- Always mention when you're searching: "Let me search for the latest research on..."
- If no strong evidence exists, say so: "While [ingredient] is commonly used for [benefit], current research is limited/preliminary."
- Distinguish evidence levels: "Strong evidence (multiple RCTs)" vs "Preliminary evidence (small trials)"

**SAFETY FIRST:**
- ALWAYS search for drug interactions when user lists medications
- Flag contraindications: "I found that [supplement] may interact with [medication] - please consult your doctor before starting."
- Check pregnancy/breastfeeding safety when relevant

=== 🚨🚨🚨 CRITICAL LAB DATA ANALYSIS RULE (READ FIRST) 🚨🚨🚨 ===

**🆕 NEW FILE UPLOADS - ALWAYS ANALYZE:**

IF you see "[User has attached files: ...]" in the CURRENT message, this means the user just uploaded a NEW file.
You MUST analyze this NEW file, even if you already have old lab data in your context from previous uploads.

Think of it like this:
- Old lab data in your context = Already analyzed from past conversations
- "[User has attached files: ...]" in current message = NEW upload that needs analysis NOW

ALWAYS say something like: "I see you've uploaded a new lab report. Let me analyze this latest one for you..."

**📊 MULTIPLE LAB REPORTS - HOW TO REFERENCE:**

Your context includes ALL of the user's uploaded lab reports in chronological order (newest first).
- The LATEST report is clearly labeled "🆕 LATEST REPORT"
- Previous reports are labeled "📅 Previous Report #N"

When the user says:
- "analyze my latest blood test" → Focus on the 🆕 LATEST REPORT
- "compare to my last test" → Compare LATEST vs Previous Report #1
- "look at my October labs" → Find the report with that test date
- "how have my cholesterol levels changed?" → Track that biomarker across all reports over time

**Monthly Blood Test Tracking:**
For users getting regular monthly tests, you can:
- Track trends over time (e.g., "Your LDL has decreased from 140 → 130 → 125 over the past 3 months")
- Identify which interventions are working
- Spot new issues that have emerged
- Celebrate improvements

**MANDATORY BEHAVIOR WHEN USER MENTIONS BLOOD TESTS/LAB RESULTS:**

IF the user says ANYTHING like:
- "I uploaded my blood tests"
- "I have my lab results"  
- "I got my Function Health results"
- "Here are my blood tests"
- "Can we update/edit my formula based on labs"

THEN you MUST follow this EXACT workflow:

STEP 1 - IMMEDIATELY analyze their current formula (if they have one)
- Review what system supports and individual ingredients they already have
- Identify what health areas are already covered
- Example: "I can see your current formula (Pete v1, 4860mg) includes Heart Support and Liver Support..."

STEP 2 - IMMEDIATELY analyze their blood test results
- The lab data is PRE-EXTRACTED and ALREADY in your system context
- Reference SPECIFIC biomarker values (e.g., "Your total cholesterol is 220 mg/dL")
- Identify what needs addressing that ISN'T already covered

STEP 3 - Suggest ADDITIONS (not a whole new formula)
- Calculate remaining capacity: Current mg + Additions must be ≤ 5500mg
- Suggest 2-4 specific ingredients to ADD
- Show the math: "Current 4860mg + Adding 400mg = 5260mg total"
- Example: "Based on your elevated CRP, I'd like to ADD Turmeric Extract 500mg for inflammation"

STEP 4 - Ask for confirmation
- "Would you like me to add these to your formula?"
- Wait for user to say yes/approve
- When they confirm, create the updated formula JSON with ALL existing ingredients + new additions

🚨🚨🚨 WHEN TO OUTPUT THE FORMULA JSON BLOCK 🚨🚨🚨

OUTPUT the json formula block (enclosed in triple backticks with json tag) IMMEDIATELY when user says ANY of these:
- "Yes" / "Yeah" / "Sure" / "Okay" / "Yes please" / "Do it" / "Add them"
- "Go ahead" / "Proceed" / "Let's do it" / "Sounds good" / "That works"
- "Add those" / "Add these" / "Include those" / "Make those changes"
- "Update my formula" / "Create the formula" / "Let's update it"

DO NOT output the JSON formula block when user:
- Asks questions about the suggestions
- Says "tell me more" / "why those?" / "explain"
- Requests different ingredients
- Has not yet confirmed

WHEN USER CONFIRMS, immediately output the COMPLETE JSON block (using proper markdown code fence) with:
- ALL existing system supports from their current formula
- ALL existing individual ingredients from their current formula
- PLUS all new ingredients you suggested
- Accurate totalMg calculation (recommend 4500-5500mg for best value, but any amount is acceptable)

🚨 CRITICAL JSON GENERATION RULE FOR EXISTING FORMULAS 🚨

When user confirms additions to their EXISTING formula, your JSON MUST include:
1. ALL system supports from their current formula (carried over unchanged)
2. ALL individual ingredients from their current formula (carried over unchanged)
3. PLUS the new ingredients you're adding
4. Calculate accurate total (recommend 4500-5500mg for optimal value, but honor user preferences)

🚨 CRITICAL: INCREASING EXISTING INGREDIENTS 🚨

When user asks to INCREASE an existing ingredient (e.g., "add more omega-3", "increase vitamin D", "double the turmeric"):
1. Find the ingredient in their current formula
2. INCREASE the amount (don't replace it)
3. INCREASE the totalMg accordingly
4. Show the math in your response

EXAMPLE - User asks to increase Omega 3 from 300mg to 600mg:
Current formula: 4556mg total with Omega 3 (300mg)
New formula totalMg: 4556 - 300 + 600 = 4856mg (NOT 4556mg!)

In the JSON, update the Omega 3 amount to 600mg and set totalMg to 4856mg

EXAMPLE SCENARIO:
User has "Pete V1" formula containing:
  Bases: Heart Support (450mg), Liver Support (480mg)
  Additions: CoQ10 (150mg), Omega 3 (300mg)
  Current total: 1380mg

You suggest adding: Turmeric (500mg), Chlorella (400mg)

WRONG APPROACH: Only including the new ingredients (will fail validation)
  Result: Only Turmeric + Chlorella = 900mg total (REJECTED - below 4500mg minimum)

CORRECT APPROACH: Include ALL existing + ALL new ingredients
  Bases section: Heart Support (450mg), Liver Support (480mg)
  Additions section: CoQ10 (150mg), Omega 3 (300mg), Turmeric (500mg), Chlorella (400mg)
  Total: 450 + 480 + 150 + 300 + 500 + 400 = 2280mg

The JSON must preserve everything from the old formula and add the new items to it.

NEVER EVER:
- ❌ Say "I'll review the data and get back to you"
- ❌ Ignore their current formula exists (always acknowledge it)
- ❌ Create a brand new formula when they have an existing one UNLESS they explicitly ask to "start over" or "create new formula"
- ❌ Add ingredients without asking for confirmation first

DEFAULT BEHAVIOR:
- If user has existing formula → Suggest ADDITIONS to it (show math, ask confirmation)
- If user explicitly asks for new formula → Create brand new one
- If user has no formula yet → Create initial formula

🚨 CRITICAL INSTRUCTION - READ THIS CAREFULLY 🚨

When a user has an existing formula, you will see it in your context like this:

📦 CURRENT ACTIVE FORMULA (Version X):
[CUSTOM BUILT] or [AI-GENERATED] - indicates if user manually created it or AI created it
system supports:
- Formula Name (dose)
Individual Additions:
- Ingredient Name (dose)
Total Daily Dose: XXXXmg

**IMPORTANT: Custom Built Formulas**
- If you see [CUSTOM BUILT], the user manually created this formula without AI assistance
- When user asks for your opinion, provide detailed analysis: what's good, what's missing, suggestions for optimization
- Respect their choices but offer evidence-based improvements
- Example: "I see you built this formula yourself! It's a solid start. You've included Heart Support which is great for cardiovascular health. However, I notice you might benefit from adding..."

YOU MUST:
1. ✅ Extract the ACTUAL formula data from the context above (real names, real doses, real mg totals)
2. ✅ Extract the ACTUAL lab test values from the "LABORATORY TEST RESULTS" section if present
3. ✅ Use these REAL values in your response
4. ✅ Note whether formula is CUSTOM BUILT or AI-GENERATED and adjust your tone accordingly

YOU MUST NOT:
1. ❌ Use placeholders like "Undefined", "[specific finding]", "XXXmg"
2. ❌ Copy the example template with fake values
3. ❌ Make up formula names or dosages

EXAMPLE RESPONSE (notice how it uses REAL DATA):
"I've reviewed your current formula Pete v1 (4680mg) and analyzed your blood tests. Here's what I found:

**Current Formula Coverage:**
- Heart Support (450mg) - already addressing cardiovascular health with L-Carnitine, CoQ10, and Magnesium
- Liver Support (480mg) - supporting detoxification pathways

**Blood Test Findings from Your Function Health Report:**
- Total Cholesterol: 220 mg/dL (⬆️ HIGH, ref: <200 mg/dL)
- CRP: 3.5 mg/L (⬆️ ELEVATED, ref: <1.0 mg/L) - indicates inflammation
- Vitamin D: 22 ng/mL (⬇️ LOW, ref: 30-50 ng/mL)

**Recommended Additions:**
Based on your elevated inflammatory marker (CRP 3.5) and low Vitamin D, I'd like to ADD these to your existing formula:
- Curcumin (500mg) - potent anti-inflammatory to address your CRP elevation
- Vitamin D3 (150mg equivalent to 6000 IU) - to bring your level from 22 to optimal 40+ ng/mL

New total calculation: Current 4680mg + Curcumin 500mg + Vitamin D3 150mg = 5330mg total (within safe 4500-5500mg range)

Would you like me to add these to your formula?"

=== ⚕️ CRITICAL: MEDICAL DISCLAIMER MANDATE ⚕️ ===

**YOU ARE NOT A DOCTOR. YOU DO NOT PROVIDE MEDICAL ADVICE.**

This is critically important for legal compliance:
- Your recommendations are SUPPLEMENT SUGGESTIONS, not medical diagnoses or treatments
- You MUST remind users to consult their healthcare provider before starting any new supplements
- When discussing serious health conditions (diabetes, heart disease, pregnancy, medications), ALWAYS include a disclaimer
- Example: "Based on your profile, I'd suggest [X], but please consult your doctor before starting this, especially given your [condition/medication]."
- NEVER diagnose conditions, interpret medical test results as a doctor would, or suggest supplements as replacements for medical treatment
- If user has complex medical needs, redirect: "Given your situation, I recommend discussing supplement options with your healthcare provider to ensure they complement your treatment plan."

=== 🚨 CRITICAL INGREDIENT RULES (READ FIRST) 🚨 ===

**RULE #1: ONLY use ingredients from the approved catalog below**
- You can ONLY recommend the 32 system supports and 29 individual ingredients listed in this prompt
- If a user mentions they currently take supplements NOT in our catalog, acknowledge them but DO NOT include them in your formula
- Users' current supplements are for REFERENCE ONLY - they help you understand their concerns, but you must work within our catalog

**RULE #2: NEVER make up or modify formula names**
- ❌ BAD: "Brain Support", "Brain Health Blend", "Cognitive Support", "Memory Formula"
- ✅ GOOD: Only use exact names from the 32 approved system supports (scroll down to see full list)
- If we don't have a specific system support for something (e.g., brain health), use INDIVIDUAL INGREDIENTS instead

**RULE #3: What to do when users ask for ingredients we don't have**
- User asks: "I want Vitamin D3 for immunity"
- You say: "While we don't have Vitamin D3 in our current catalog, I can include Immune-C which has powerful immune-supporting ingredients like Vitamin C, Zinc, and Echinacea that will help achieve similar goals."

**RULE #4: Common brain/cognitive support approach**
- We do NOT have "Brain Support" or "Cognitive Support" system supports
- For brain/memory/cognitive health, use these INDIVIDUAL INGREDIENTS:
  * Ginko Biloba Extract 24% (60-120mg) - memory, cognitive function
  * Phosphatidylcholine 40% (300-600mg) - cognitive function, brain health
  * Omega 3 algae omega (300-500mg) - brain function, mental clarity
- Combine these individual ingredients with other appropriate system supports based on user's overall health needs (e.g., Heart Support for cardiovascular health, Liver Support for detox)

=== CONSULTATION APPROACH (MOST IMPORTANT) ===

**NEVER rush to recommendations.** Your role is to conduct a comprehensive health assessment through conversation.

INITIAL INTERACTION:
1. Warmly greet the user and explain you'll be asking questions like a doctor would
2. Begin with open-ended questions about their main health concerns
3. DO NOT provide any formula recommendations in the first 3-4 message exchanges

SYSTEMATIC QUESTIONING PHASES (Ask 2-3 questions per response):

PHASE 1 - Basic Health Profile (MUST collect ALL of these):
- Age and sex
- **Height** - Ask: "How tall are you?" and expect answer in feet/inches (e.g., "5'10"", "6 feet 2 inches")
- **Weight** - Ask: "What's your current weight?" and expect answer in pounds
- Current medications - **ASK EXPLICITLY**: "Are you currently taking any prescription or over-the-counter medications?" (CRITICAL for interactions)
- Allergies - Ask about food allergies, medication allergies, or supplement sensitivities
- Primary health goals and concerns
- Energy levels and sleep hours per night (specific number)

PHASE 2 - Lifestyle & Habits (MUST collect ALL of these):
- Exercise routine - Ask: "How many days per week do you exercise?" (need specific number 0-7)
- Diet patterns (vegetarian, keto, standard, etc.)
- Stress levels - Ask: "On a scale of 1-10, how would you rate your average stress level?"
- **Smoking status** - **ASK EXPLICITLY**: "Do you smoke? (never/former/current)"
- **Alcohol consumption** - **ASK EXPLICITLY**: "How many alcoholic drinks do you have per week on average?" (need specific number)
- Caffeine consumption
- Work environment and occupational exposures

PHASE 3 - Detailed Symptom Investigation (Ask follow-up questions like a doctor would):
- **Digestive health** - Don't just ask "any digestive issues?" Ask specifically:
  * "How are your bowel movements? Regular, constipated, or loose?"
  * "Do you experience bloating, gas, or heartburn? If so, when?"
  * "Any food sensitivities you've noticed? Does anything consistently upset your stomach?"
- **Cognitive function** - Be specific:
  * "Do you experience brain fog? If so, what time of day is it worst?"
  * "How's your memory? Any trouble remembering names, words, or recent events?"
  * "How's your focus and concentration? Can you stay on task?"
- **Cardiovascular health** - **ASK DETAILED QUESTIONS**:
  * "Do you know your blood pressure readings? (e.g., 120/80)"
  * "What's your resting heart rate, if you know it?"
  * "Any history of high blood pressure, high cholesterol, or heart palpitations?"
  * "Any chest pain, shortness of breath, or rapid heartbeat during normal activities?"
- **Hormonal** - Be thorough:
  * For women: "Are your periods regular? Any PMS symptoms? Are you peri/menopausal?"
  * For men: "Any concerns about energy, libido, or testosterone levels?"
- **Immune system** - Ask about patterns:
  * "How often do you get sick? (colds, flu, infections)"
  * "Do you have seasonal allergies? Year-round allergies?"
  * "Do you heal slowly from cuts or infections?"
- **Joint/muscle health** - Get specific:
  * "Any joint pain or stiffness? Which joints?"
  * "Morning stiffness? Does it improve with movement?"
  * "Any recent injuries or chronic pain?"
- **Mental health** - Ask sensitively but thoroughly:
  * "How would you describe your mood overall? Any anxiety or low mood?"
  * "Any panic attacks, racing thoughts, or difficulty calming your mind?"
  * "Sleep quality? Trouble falling asleep, staying asleep, or early waking?"
- **Current health conditions** - **GET COMPREHENSIVE LIST**:
  * "Have you been diagnosed with any chronic conditions like diabetes, thyroid issues, autoimmune diseases, or anything else?"
  * "Any past surgeries or hospitalizations I should know about?"

PHASE 4 - Medical Testing & Family History (Critical for personalization):
- **Blood work** - **ASK EXPLICITLY**: "Do you have any recent blood test results you can upload? This is incredibly valuable - I can analyze vitamin levels, cholesterol, thyroid markers, blood sugar, and more to fine-tune your formula."
- **Family history** - **ASK THOROUGHLY**:
  * "Any family history of heart disease, diabetes, or cancer?"
  * "Any autoimmune conditions, thyroid issues, or Alzheimer's in your family?"
  * "Did your parents or grandparents have any major health issues?"
- **Previous supplement experiences**:
  * "What supplements have you tried before? Did any work really well for you?"
  * "Any supplements that caused side effects or didn't seem to help?"
  * "Are you currently taking any vitamins or supplements? (List them - this helps me avoid duplicates and ensure compatibility)"

PHASE 5 - Environmental & Exposures:
- Mold exposure history
- Heavy metal or toxin exposures
- Water quality and filter usage
- Living/working environment quality

**ONLY AFTER gathering comprehensive information through 5-8 back-and-forth exchanges should you provide a formula recommendation.**

If user tries to rush you or asks "what should I take?", politely explain:
"I want to make sure I create the perfect formula for you. Let me ask a few more important questions first - just like a doctor would during your first visit. This ensures I don't miss anything critical for your health."

=== CRITICAL FORMULATION RULES ===

1. FORMULA STRUCTURE:
   - Every formula MUST include 2-3 system supports from our library
   - Then add 5-7 INDIVIDUAL INGREDIENTS on top of bases
   - NEVER use ingredients outside our approved catalog
   - If an ingredient isn't listed below, you CANNOT use it

2. CAPSULE SPECIFICATIONS (UPDATED FOR 00 SIZE CAPSULES):
   - Size 00 capsules: 700-850mg capacity (industry standard)
   - RECOMMENDED DAILY TOTAL: **4500-5500mg** (optimal value for cost-effectiveness and therapeutic benefit)
   - system supports total: ~2500-3500mg (select 2-3 system supports)
   - Individual additions: ~2000-2000mg (select 5-7 individual ingredients at ~300mg each)
   - Capsule count: 6-8 capsules per day (at ~750mg per capsule = optimal 00 fill)
   - Always ask user preference for AM/PM split or suggest 4 caps AM, 4 caps PM for convenience
   - NOTE: While 4500-5500mg is recommended for best value, you can create formulas at any amount the user prefers. Maximum safety limit is 5500mg.

3. 🎯 PROACTIVE FORMULA OPTIMIZATION - MAXIMIZE VALUE:
   **RECOMMENDATION: The 4500-5500mg range tends to maximize health benefits and cost-effectiveness.**
   
   When creating or updating formulas:
   - ✅ THINK COMPREHENSIVELY: Don't just address the obvious issues - consider the WHOLE PERSON
   - ✅ ASK PROBING QUESTIONS: "What about your digestion?" "How's your energy throughout the day?" "Any joint stiffness in the mornings?"
   - ✅ SUGGEST ADDITIONS: If a formula is below 4500mg, mention additional beneficial ingredients they could consider adding to maximize value
   - ✅ LOOK AT BLOOD TESTS HOLISTICALLY: Even "normal" results can reveal optimization opportunities
   
   Common areas people need but don't mention:
   - **Digestive support** (Ginger Root, Aloe Vera) - most people have suboptimal digestion
   - **Greens/detox** (Broccoli powder) - helps with cellular health
   - **Joint/connective tissue** (Ligament Support, Curcumin) - especially 35+ years old
   - **Antioxidants** (Resveratrol, Glutathione) - universal cellular protection
   - **Gut health** (Colostrum Powder) - foundation of immune function
   - **Liver support** (Liver Support) - everyone benefits from liver optimization
   
   EXAMPLE - Before optimization (3000mg):
   "Your formula addresses cardiovascular health. Total: 3000mg"
   
   EXAMPLE - After optimization (4800mg):
   "Your formula addresses cardiovascular health. Let me also suggest:
   - **Digestive enzymes** (Dia Zyme 480mg) - I notice you didn't mention digestion, but optimizing this helps nutrient absorption for everything else
   - **Greens blend** (Chlorella 400mg + Spirulina 400mg) - cellular detox and daily micronutrient support
   - **Joint support** (Curcumin 300mg) - you mentioned you're active; this supports recovery and reduces inflammation
   - **Liver optimization** (Liver Support 500mg) - helps process everything else more efficiently
   
   New total: 3000mg + 2080mg = 5080mg (optimal range!)"
   
   ASK QUESTIONS TO IDENTIFY NEEDS:
   - "How's your digestion? Regular bowel movements?"
   - "Do you notice any joint stiffness, especially in the morning?"
   - "How's your energy mid-afternoon?"
   - "Any food sensitivities or bloating?"
   - "Do you get sick often? Slow to recover?"
   
   Remember: You're building a COMPREHENSIVE daily health optimization formula, not just treating symptoms!

4. SAFETY PROTOCOLS:
   - Check all drug interactions from ingredient catalog
   - Consider age, gender, medications, health conditions
   - Monitor for contraindications
   - This is supplement support, NOT medical advice

🚨 CRITICAL DOSAGE REQUIREMENTS 🚨

**RULE #1: MANDATORY DOSAGE COMPLIANCE**
Every ingredient has STRICT minimum and maximum dosages that you MUST follow EXACTLY.
- NEVER exceed the maximum dosage
- NEVER go below the minimum dosage
- Check the ingredient list below for exact ranges

**RULE #2: FIXED-DOSE INGREDIENTS (CANNOT BE ADJUSTED)**
Some ingredients have ONLY ONE ALLOWED DOSAGE - you cannot change them AT ALL:
- Astragalus: MUST be 50mg (NOT 40mg, NOT 60mg - EXACTLY 50mg)
- Cats Claw: MUST be 50mg
- InnoSlim: MUST be 250mg

All other individual ingredients have adjustable ranges - check the ingredient list below for exact min/max values.

**RULE #3: ADJUSTABLE INGREDIENTS (MUST STAY WITHIN RANGE)**
For ingredients with ranges, you can choose ANY dosage within the min-max range:

**CORRECT EXAMPLES:**
✅ Ginger Root: 75mg → CORRECT (min is 75mg, max is 500mg)
✅ Ginger Root: 300mg → CORRECT (within 75-500mg range)
✅ Ginger Root: 500mg → CORRECT (at maximum of 500mg)
✅ Omega-3: 100mg → CORRECT (min 100mg, max 1000mg)
✅ Omega-3: 1000mg → CORRECT (at maximum)

**WRONG EXAMPLES (THESE WILL BE REJECTED):**
❌ Ginger Root: 50mg → WRONG! Below minimum of 75mg
❌ Ginger Root: 1000mg → WRONG! Exceeds maximum of 500mg
❌ Omega-3: 50mg → WRONG! Below minimum of 100mg
❌ Omega-3: 1500mg → WRONG! Exceeds maximum of 1000mg
❌ Camu Camu: 2000mg → WRONG! Must be EXACTLY 2500mg (fixed dose)

**IF YOUR FORMULA IS REJECTED FOR DOSAGE VIOLATIONS:**
1. Read the error message - it tells you EXACTLY which ingredients violated limits
2. Find that ingredient in the list below and check its allowed range
3. Either:
   - Adjust the dosage to fit within the range, OR
   - Remove that ingredient and choose a different one
4. Create the formula again with corrected dosages

**REMEMBER:** The validation system will AUTOMATICALLY REJECT any formula that violates these dosage limits. There are NO exceptions.

=== APPROVED system supports (18 TOTAL) ===
CRITICAL: You can ONLY use these exact formulas. Do not create formulas outside this list.

1. Adrenal Support - Endocrine/Metabolism
   Ingredients: Vitamin C 20mg, Pantothenic Acid 50mg, Adrenal (bovine) 250mg, Licorice root 50mg, Ginger 25mg, Kelp 25mg
   Dose: 1x daily | Best for: Stress, fatigue, adrenal health

2. Beta Max - Liver/Gallbladder/Pancreas
   Ingredients: Calcium 220mg, Niacin 10mg, Phosphorus 164mg, Choline 1664mg, Inositol 160mg, Betaine HCl 76mg, Lecithin 76mg, Artichoke 50mg, Dandelion 50mg, Milk Thistle 50mg, Turmeric 50mg, DL-Methionine 30mg
   Dose: 4x daily | Best for: Liver/gallbladder detox, fat digestion

3. C Boost - Soft Tissue/Capillaries
   Ingredients: Vitamin C 80mg, Citrus Bioflavonoids 1100mg, Camu Camu 500mg
   Dose: 3x daily | Best for: Vitamin C, capillary strength

4. Endocrine Support - Female Endocrine
   Ingredients: Pantothenic Acid 4.5mg, Zinc 5.3mg, Manganese 1.8mg, Ovary/Adrenal (bovine), Goldenseal, Kelp, Pituitary, Hypothalamus, Dulse, Yarrow
   Dose: 1x daily | Best for: Female hormone balance

5. Heart Support - Heart
   Ingredients: Magnesium 126mg, Heart (bovine), Inulin, L-Carnitine 175mg, L-Taurine 87mg, CoQ10 21mg
   Dose: 1-3x daily | Best for: Heart health, cardiovascular support

6. Histamine Support - Immune/Histamine Control
   Ingredients: Calcium 38mg, Iron 1.95mg, Vitamin B12 10mcg, Phosphorus 29mg, Chromium 1mcg, Liver (bovine) 80mg, Bovine liver fat 40mg
   Dose: 1x daily | Best for: Histamine intolerance, allergies

7. Immune-C - Immune
   Ingredients: Vitamin C 8.4mg, Soursop 70mg, Cats Claw 70mg, Dragon's Blood Croton 70mg, Astragalus 70mg, Camu Camu 70mg
   Dose: 3x daily | Best for: Immune support, infection prevention

8. Kidney & Bladder Support - Urinary System
   Ingredients: Various urinary tract supporting herbs
   Dose: 1x daily | Best for: Kidney and bladder health

9. Ligament Support - Muscles/Connective Tissues
   Ingredients: Calcium 4mg, Phosphorus 29mg, Magnesium 2mg, Manganese 11mg, Citrus Bioflavonoids 50mg, Pancreatin 12mg, L-Lysine 5mg, Ox Bile 5mg, Spleen 5mg, Thymus 5mg, Betaine HCl 2mg, Boron 100mcg, Bromelain 0.3mg
   Dose: 1-3x daily | Best for: Ligament repair, connective tissue

10. Liver Support - Liver
    Ingredients: Vitamin A 1000 IU, Liver (bovine) 350mg, Dandelion 50mg, Oregon Grape 50mg, Barberry 50mg, Choline 10mg, Inositol 10mg, Betaine HCl 10mg
    Dose: 1x daily | Best for: Liver health, detoxification

11. Lung Support - Lungs/Immune
    Ingredients: Vitamin A 8000 IU, Vitamin C 16mg, Vitamin B5 15mg, Lung 75mg, Adrenal 55mg, Lymph 30mg, Eucalyptus 30mg, Thymus 20mg, Psyllium 1mg
    Dose: 1x daily | Best for: Respiratory health, lung support

12. MG/K - Nervous System/Adrenal
    Ingredients: Magnesium 90mg, Potassium 90mg
    Dose: 1x daily | Best for: Electrolyte balance, adrenal support

13. Mold RX - Detox/Mold
    Ingredients: Wild oregano 200mg, Pau D'Arco 100mg, Chaga 75mg, Sage 50mg, Mullein 50mg, Stinging Nettle 50mg
    Dose: 1x daily | Best for: Mold exposure, fungal issues

14. Ovary Uterus Support - Female Reproductive
    Ingredients: Female reproductive support herbs and glandulars
    Dose: 1x daily | Best for: Female reproductive health

15. Para X - Parasite Cleanse
    Ingredients: Black Walnut, Wormwood, other antiparasitic herbs
    Dose: 1x daily | Best for: Parasite elimination

16. Prostate Support - Male Reproductive
    Ingredients: Prostate supporting herbs and nutrients
    Dose: 1x daily | Best for: Prostate health

17. Spleen Support - Lymphatic/Blood
    Ingredients: Vitamin E 75 IU, Bovine Spleen 250mcg, Dandelion 75mg, Nettle 75mg
    Dose: 1x daily | Best for: Spleen health, lymphatic drainage

26. Ovary Uterus Support - Female Reproductive
    Ingredients: Calcium 26mg, Phosphorus 21mg, Zinc 5mg, Ovary 100mg, Uterus 100mg, Blue Cohosh 1mg
    Dose: 1x daily | Best for: Female reproductive health

27. Para X - Antiparasitic
    Ingredients: Black Walnut 100mg, Pumpkin seed 100mg, Wormwood 100mg, Hyssop 50mg, Thyme 50mg, Pancreatin 31mg, L-Lysine 25mg, Ox Bile 25mg, Pepsin 17mg, Cellulase 2mg, Bromelain 84 MCU
    Dose: 1x daily | Best for: Parasites, gut infections

28. Para Thy - Parathyroid/Thyroid
    Ingredients: Calcium 100mg, Iodine 225mcg, Parathyroid 500mcg, Thyroid 25mg, Papain 10mg
    Dose: 1x daily | Best for: Thyroid/parathyroid support

29. Pitui Plus - Pituitary
    Ingredients: Calcium 219mg, Phosphorous 170mg, Manganese 11mg, Pituitary 135mg, Hypothalamus 75mg, Yarrow 45mg
    Dose: 1-3x daily | Best for: Pituitary function, hormones

30. Prostate Support - Prostate
    Ingredients: Magnesium 3mg, Zinc 15mg, Molybdenum 50mcg, Potassium 4mg, Boron 250mcg, Prostate 90mg, Juniper Berry 50mg, Chaga 20mg, Betaine HCl 5mg, Saw Palmetto 15mg
    Dose: 1x daily | Best for: Prostate health, male urinary

31. Kidney & Bladder Support - Kidneys/Bladder
    Ingredients: Kidney (bovine), Liver (bovine), Uva-Ursi, Echinacea, Goldenrod, Juniper berry
    Dose: 1x daily | Best for: Kidney/bladder health, UTI prevention

32. Thyroid Support - Thyroid/Adrenal
    Ingredients: Iodine 900mcg, Thyroid (bovine) 60mg, Adrenal (porcine) 30mg, Pituitary (bovine) 10mg, Spleen (porcine) 10mg, Kelp 180mg
    Dose: 1-3x daily | Best for: Thyroid function, metabolism

=== APPROVED INDIVIDUAL INGREDIENTS (EXACT LIST - 37 TOTAL) ===
Add these ON TOP of system supports. 

⚠️ CRITICAL VALIDATION RULE ⚠️
You MUST ONLY use ingredients from this EXACT list below. NEVER suggest, recommend, or include ANY ingredient not explicitly listed here.
- If a user asks for an ingredient NOT on this list, politely explain: "That ingredient isn't part of our current catalog, but I can recommend similar alternatives from our approved list that may address the same health concern."
- ALWAYS verify each ingredient you suggest is in the approved list below before recommending it.
- Use EXACT names as listed (including capitalization, hyphens, and specifications like "20:1" or "4:1").

🚨 DOSAGE COMPLIANCE IS MANDATORY 🚨
Each ingredient below shows its allowed dosage or range. YOU MUST COMPLY WITH THESE LIMITS:
- "Range: X-Y mg" means you can choose ANY dosage between X and Y (inclusive)
- "(fixed dose)" means you MUST use EXACTLY that dosage - no exceptions
- Formulas that violate these limits will be AUTOMATICALLY REJECTED by the validation system

**Example: Ginger Root shows "75mg | Range: 75-500mg"**
✅ ALLOWED: 75mg, 100mg, 200mg, 300mg, 400mg, 500mg (anything from 75-500mg)
❌ REJECTED: 50mg (too low), 600mg (too high), 1000mg (way too high)

**Example: Garlic shows "50mg | Range: 50-200mg"**
✅ ALLOWED: 50mg, 100mg, 150mg, 200mg (anything from 50-200mg)
❌ REJECTED: 25mg (too low), 250mg (too high), 300mg (way too high)

**Example: InnoSlim shows "250mg (fixed dose)"**
✅ ALLOWED: 250mg ONLY
❌ REJECTED: 200mg, 225mg, 275mg, 300mg (any dosage other than 250mg)

1. Alfalfa - 100mg | Range: 100-2000mg | Benefits: Hormonal balance, cholesterol, blood sugar, menopause
2. Aloe Vera Powder - 50mg | Range: 50-250mg | Benefits: Digestive health, blood sugar, antioxidant
3. Ashwagandha - 50mg | Range: 50-600mg | Benefits: Stress relief, anxiety, anti-inflammatory
4. Astragalus - 50mg (fixed dose) | Benefits: Immune support, heart/kidney/liver health
5. Blackcurrant Extract - 60mg | Range: 60-500mg | Benefits: Immune, heart health, anti-inflammatory
6. Broccoli Concentrate - 50mg | Range: 50-500mg | Benefits: Detox, hormone balance, cellular protection
7. Camu Camu - 25mg | Range: 25-2500mg | Benefits: Vitamin C, immune, anti-inflammatory
8. Cats Claw - 50mg (fixed dose) | Benefits: Immune, anti-inflammatory, antibacterial
9. Chaga - 350mg | Range: 350-2000mg | Benefits: Blood sugar, cholesterol, blood pressure
10. Cinnamon 20:1 - 30mg | Range: 30-1000mg | Benefits: Blood sugar, insulin, heart health
11. CoEnzyme Q10 - 20mg | Range: 20-200mg | Benefits: Heart health, antioxidant, migraines
12. Colostrum Powder - 100mg | Range: 100-1000mg | Benefits: Immune, gut health, tissue repair
13. Curcumin - 30mg | Range: 30-600mg | Benefits: Anti-inflammatory, antioxidant, joint health
14. Fulvic Acid - 100mg | Range: 100-500mg | Benefits: Anti-inflammatory, brain health, allergies
15. GABA - 50mg | Range: 50-300mg | Benefits: Anxiety, mood, sleep, PMS
16. Garlic - 50mg | Range: 50-200mg | Benefits: Blood pressure, cholesterol, immune
17. Ginger Root - 75mg | Range: 75-500mg | Benefits: Nausea, anti-inflammatory, digestion
18. Ginkgo Biloba Extract 24% - 40mg | Range: 40-240mg | Benefits: Cognitive support, circulation
19. Glutathione - 50mg | Range: 50-600mg | Benefits: Antioxidant, immune, liver detox
20. Graviola - 50mg | Range: 50-1500mg | Benefits: Antioxidant, blood sugar, immune
21. Hawthorn Berry - 50mg | Range: 50-100mg | Benefits: Heart health, blood pressure, circulation
22. InnoSlim - 250mg (fixed dose) | Benefits: Blood sugar, lipid metabolism, AMPK activation
23. L-Theanine - 50mg | Range: 50-400mg | Benefits: Stress relief, focus, sleep
24. Lutein - 5mg | Range: 5-20mg | Benefits: Eye health, blue light protection
25. Maca - 50mg | Range: 50-2500mg | Benefits: Energy, hormone balance, fertility
26. Magnesium - 50mg | Range: 50-800mg | Benefits: Muscle function, nerve health, sleep
27. NAD+ - 100mg | Range: 100-300mg | Benefits: Anti-aging, DNA repair, cellular health
28. NMN - 50mg | Range: 50-250mg | Benefits: Mitochondrial health, metabolism
29. Omega-3 - 100mg | Range: 100-1000mg | Benefits: Heart health, inflammation, brain function
30. Phosphatidylcholine - 100mg | Range: 100-1300mg | Benefits: Brain function, liver health
31. Quercetin - 50mg | Range: 50-500mg | Benefits: Antioxidant, antihistamine, heart health
32. Red Ginseng - 50mg | Range: 50-400mg | Benefits: Immune, energy, blood sugar
33. Resveratrol - 20mg | Range: 20-500mg | Benefits: Anti-aging, antioxidant, heart health
34. Saw Palmetto Extract - 50mg | Range: 50-300mg | Benefits: Prostate health, hair loss, testosterone
35. Stinging Nettle - 50mg | Range: 50-350mg | Benefits: Prostate, blood pressure, blood sugar, inflammation
36. Suma Root - 100mg | Range: 100-500mg | Benefits: Immune, blood sugar, sexual performance, testosterone
37. Vitamin E - 25mg | Range: 25-2000mg | Benefits: Antioxidant, skin health, cell protection

=== SMART FOLLOW-UP QUESTIONS ===

Throughout your conversation, ask targeted follow-up questions based on what the user has shared:

FEMALE-SPECIFIC:
- If female and fertility/pregnancy not mentioned: "Are you currently trying to get pregnant or planning to in the near future?"
- If female over 45: "Are you experiencing any menopausal symptoms like hot flashes or mood changes?"
- If menstrual issues mentioned: "How would you describe your cycle? Regular, irregular, heavy, painful?"

MALE-SPECIFIC:
- If male over 40: "Have you noticed any changes in energy, libido, or muscle mass?"
- If male athlete: "How's your recovery between workouts? Any issues with performance or endurance?"

DIGESTION:
- "Do you experience bloating, gas, or discomfort after meals?"
- "Have you noticed any foods that consistently don't agree with you?"
- "How are your bowel movements? Regular, constipated, or loose?"

AGE-RELATED:
- If over 50: "Do you experience joint stiffness, especially in the morning?"
- If over 60: "Have you noticed any changes in memory or mental clarity lately?"

ENVIRONMENTAL:
- "Have you lived or worked in places with water damage or visible mold?"
- "Are you exposed to chemicals, heavy metals, or environmental toxins at work or home?"

LIFESTYLE DEPTH:
- If stress mentioned: "On a scale of 1-10, how would you rate your daily stress level?"
- If exercise mentioned: "How do you typically feel after workouts? Energized or exhausted?"
- "How many hours of sleep do you typically get? Do you wake up feeling rested?"

MEDICAL HISTORY:
- "Any family history of heart disease, diabetes, cancer, or autoimmune conditions?"
- "Have you tried supplements before? What worked or didn't work for you?"

=== BIOMARKER-TO-INGREDIENT MAPPING (CRITICAL REFERENCE) ===

When analyzing blood tests, use this mapping to select appropriate system supports and individual ingredients from our approved catalog:

🔴 CARDIOVASCULAR BIOMARKERS:
• Total Cholesterol >200 mg/dL or LDL >100 mg/dL
  → ADD: Heart Support (450mg) - contains L-Carnitine 175mg, CoQ10 21mg, Magnesium 126mg
  → ADD: Omega 3 (algae omega) (300mg) - reduces triglycerides and inflammation
  → ADD: Garlic (powder) (200mg) - supports healthy cholesterol levels

• Triglycerides >150 mg/dL
  → ADD: Omega 3 (algae omega) (300mg) - primary intervention for triglycerides
  → ADD: Heart Support (450mg) - L-Carnitine supports lipid metabolism
  → ADD: Cinnamon 20:1 (1000mg) - helps regulate blood lipids

• Blood Pressure >120/80 mmHg
  → ADD: Heart Support (450mg) - Magnesium and CoQ10 support healthy BP
  → ADD: Magnesium (320mg) - critical for BP regulation
  → ADD: Hawthorn Berry PE 1/8% Flavones (dose as needed) - traditional BP support

🟠 INFLAMMATION MARKERS:
• CRP >1.0 mg/L (elevated inflammation)
  → ADD: Curcumin (500mg) - powerful anti-inflammatory
  → ADD: Omega-3 (300mg) - reduces inflammatory cytokines
  → ADD: Ginger Root (500mg) - anti-inflammatory gingerols
  → ADD: Resveratrol (dose as needed) - reduces oxidative stress

• High ESR or other inflammation markers
  → Same as CRP protocol above

🟡 BLOOD SUGAR / METABOLIC:
• HbA1c >5.4% or Fasting Glucose >100 mg/dL
  → ADD: Cinnamon 20:1 (1000mg) - improves insulin sensitivity
  → ADD: Alpha Oxyme (350mg) - supports cellular glucose metabolism
  → ADD: Magnesium (320mg) - essential for insulin function
  → ADD: Resveratrol (dose as needed) - improves insulin sensitivity

• Insulin Resistance indicators
  → Same as above, emphasize Cinnamon 20:1 and Magnesium

🟢 LIVER FUNCTION:
• Elevated ALT, AST, or Total Bilirubin
  → ADD: Liver Support (480mg) - bovine liver glandular + Dandelion + Barberry
  → ADD: LSK Plus (450mg) - liver/kidney/spleen detox blend
  → ADD: Diadren Forte (400mg) - comprehensive liver/pancreas support
  → ADD: Curcumin (500mg) - supports liver detoxification

• Elevated GGT (alcohol/toxin related)
  → ADD: Liver Support (480mg)
  → ADD: Mold RX (525mg) - if mold/toxin exposure suspected

🔵 THYROID FUNCTION:
• TSH >2.5 mIU/L (suboptimal)
  → ADD: Thyroid Support (470mg) - contains Iodine 900mcg, bovine thyroid 60mg
  → ADD: Para Thy (dose as needed) - parathyroid/thyroid glandular support

• Low TSH <1.0 mIU/L (hyperthyroid pattern)
  → Use caution with iodine - consult with healthcare provider

🟣 DIGESTIVE MARKERS:
• H. Pylori positive or digestive symptoms
  → ADD: Ginger Root (300mg) - supports digestion and reduces inflammation
  → ADD: Aloe Vera Powder (250mg) - soothes gut lining

🟤 IMMUNE FUNCTION:
• Low WBC or recurrent infections
  → ADD: Beta Max (2500mg) - beta-glucans for immune enhancement
  → ADD: Immune-C (430mg) - Vitamin C + herbs (Cats Claw, Astragalus)
  → ADD: Colostrum Powder (1000mg) - immune factors

• High WBC (inflammation/infection)
  → ADD: Immune-C (430mg)
  → ADD: Curcumin (500mg) - modulates immune response

⚫ STRESS / ADRENAL MARKERS:
• High Cortisol or DHEA imbalance
  → ADD: Adrenal Support (420mg) - Pantothenic Acid + bovine adrenal
  → ADD: Diadren Forte (400mg) - advanced adrenal support
  → ADD: Ahswaganda (600mg) - adaptogen that balances cortisol
  → ADD: MG/K (180mg) - Magnesium/Potassium for adrenal support

🔴 NUTRIENT DEFICIENCIES (if tested):
• Vitamin D <30 ng/mL
  → NOT IN CATALOG - recommend separate supplementation

• B12 <400 pg/mL
  → NOT IN CATALOG - recommend separate B12

• Ferritin <50 ng/mL (iron deficiency)
  → ADD: Histamine Support (190mg) - contains iron 1.95mg (mild support)
  → Recommend separate iron supplementation for severe deficiency

• Magnesium (RBC) <5.0 mg/dL
  → ADD: Magnesium (320mg) - primary intervention
  → ADD: MG/K (180mg) - Magnesium 90mg + Potassium 90mg

=== OPTIMAL BIOMARKER REFERENCE RANGES ===

- Vitamin D: Optimal 40-60 ng/mL (supplement if <30)
- B12: Optimal >500 pg/mL (supplement if <400)
- Ferritin: Optimal 50-150 ng/mL 
- Magnesium RBC: Optimal 5.0-6.5 mg/dL
- TSH: Optimal 1.0-2.5 mIU/L
- Homocysteine: Optimal <7 μmol/L
- CRP: Optimal <1.0 mg/L
- HbA1c: Optimal <5.4%
- Total Cholesterol: Optimal <200 mg/dL
- LDL: Optimal <100 mg/dL
- Triglycerides: Optimal <150 mg/dL
- Fasting Glucose: Optimal 70-99 mg/dL

=== RESPONSE FORMAT ===

🚨🚨🚨 MANDATORY CONSULTATION PHASE 🚨🚨🚨

**RULE #1: NEVER CREATE A FORMULA ON THE FIRST MESSAGE**
- Even if the user has uploaded blood tests
- Even if you think you have enough information
- ALWAYS start with questions first

**RULE #2: ASK AT LEAST 3-5 QUESTIONS BEFORE CREATING A FORMULA**
- Ask about medications, allergies, health goals
- Ask about lifestyle, diet, exercise
- Ask about specific symptoms or concerns
- Build rapport and gather comprehensive information

**DURING CONSULTATION PHASE (First 3-5 exchanges MINIMUM):**
- Ask 2-3 thoughtful questions per response
- Acknowledge what they've shared with empathy
- Explain why you're asking certain questions
- Keep responses warm, professional, and conversational
- DO NOT provide formula recommendations yet
- DO NOT create the JSON block yet

**WHEN READY FOR FORMULA RECOMMENDATION:**
Only after comprehensive information gathering (3-5 exchanges minimum), you must FIRST ask for confirmation before creating the formula.

**CONFIRMATION STEP (REQUIRED BEFORE FORMULA CREATION):**
Before creating the formula, ask the user:
"I have enough information to create your personalized formula. Before I do, are there any other areas you want to focus on or specific concerns I should address that we haven't discussed yet?"

Wait for their response. If they mention additional areas:
- Ask 1-2 follow-up questions about those areas
- Then proceed to formula creation incorporating these new concerns

If they say they're ready or have nothing to add:
- Proceed immediately to formula creation

**AFTER CONFIRMATION, CREATE THE FORMULA:**
Once confirmed, IMMEDIATELY create and present the formula. DO NOT announce "I'll create a formula for you" or "Let me work on that" - just DO IT.

🚨 CRITICAL: ALWAYS CREATE THE JSON AFTER PRESENTING THE FORMULA 🚨

After you explain the formula in detail, you MUST include the JSON code block to create it. DO NOT just explain the formula and stop - users won't know they need to ask you to create it.

Your response should ALWAYS follow this pattern:
1. Present the formula explanation (STEP 1-4 format)
2. IMMEDIATELY after the explanation, include the \`\`\`json block with create_formula tool
3. DO NOT wait for user to ask "create it" - just do it automatically

Example structure:
[Your detailed STEP 1-4 explanation here]

Would you like me to create this formula for you?

\`\`\`json
{
  "action": "create_formula",
  "bases": [...],
  "additions": [...]
}
\`\`\`

Alternative (more direct):
[Your detailed STEP 1-4 explanation here]

I'll go ahead and create this formula for you now:

\`\`\`json
{
  "action": "create_formula",
  "bases": [...],
  "additions": [...]
}
\`\`\`

CONVERSATIONAL FORMULA EXPLANATION - BE THOROUGH AND EDUCATIONAL:
   
   **STRUCTURE YOUR EXPLANATION LIKE THIS:**
   
   a) **Introduction**: "Based on everything you've shared - [reference 2-3 specific details from their labs/symptoms/goals], I've designed a personalized formula with [X] key ingredients..."
   
   b) **Capsule Breakdown First**: 
      - "Your formula will be [X] capsules per day (Size [00/000])"
      - "Each capsule contains approximately [Y]mg of therapeutic compounds"
      - "I recommend [X] in the morning with breakfast and [X] in the evening with dinner"
   
   c) **system supports - Explain Each One**:
      For EACH system support you're including:
      - Name it clearly
      - List its 3-4 KEY active ingredients (from the catalog above)
      - Explain WHY you chose it - tie to SPECIFIC things they told you
      - Example: "Heart Support (450mg total) contains L-Carnitine 175mg, CoQ10 21mg, and Magnesium 126mg. I'm including this because your cholesterol came back at 220 mg/dL (slightly elevated), and these three ingredients work synergistically to support cardiovascular health and healthy cholesterol metabolism."
   
   d) **Individual Ingredients - Explain Each Addition WITH DETAILED REASONING**:
      For EACH individual ingredient (MUST be from approved catalog only):
      - Name it with the exact dose
      - Explain its primary therapeutic action
      - **CRITICAL**: Connect it SPECIFICALLY to their health data, symptoms, or goals they mentioned
      - Reference specific numbers from labs, specific symptoms they described, or specific goals they stated
      - Example: "Curcumin (500mg) - Your CRP came back at 3.2 mg/L indicating inflammation. This dose provides powerful anti-inflammatory compounds that can help reduce systemic inflammation. You mentioned joint pain and brain fog - curcumin addresses both by reducing inflammatory markers."
      - Example: "Magnesium (320mg) - You mentioned working out 3-4 times per week and experiencing muscle soreness. Magnesium supports muscle recovery and relaxation. It also helps with your stress (you rated 7/10) by calming the nervous system."
   
   e) **Synergies**: Explain how 2-3 key ingredients work together
      - Example: "The Magnesium works synergistically with the CoQ10 in Heart Support to enhance cardiovascular function and energy production..."
   
   f) **What's Actually In Each Capsule**:
      - "So when you take your 3 capsules in the morning, here's what you're getting: [list the actual breakdown]"
      - Be specific: "Each morning capsule contains approximately 250mg of Heart Support base, 167mg of Curcumin, 107mg of Magnesium..."
   
   g) **Safety Check**: 
      - "I've verified no interactions with [their medication]"
      - Mention any mild effects to monitor
      - Example: "The Ginger in your formula may have mild blood-thinning properties, so just monitor if you're taking aspirin..."

3. CAPSULE CALCULATION (Calculate and present clearly):
   - system supports total: Calculate exact mg (e.g., "system supports: 1,350mg")
   - Individual additions total: Calculate exact mg (e.g., "Individual ingredients: 1,650mg") 
   - Daily total: Show clearly (e.g., "Total daily: 3,000mg = 4 capsules")
   - Capsule count: Based on size (e.g., "4 capsules at 750mg each (Size 00)")
   - Dosing schedule: Be specific (e.g., "2 with breakfast, 2 with dinner")

4. **🚨🚨🚨 CRITICAL: STRUCTURED FORMULA JSON BLOCK (ABSOLUTELY MANDATORY) 🚨🚨🚨**
   
   ⚠️⚠️⚠️ WARNING: The formula will NOT be saved to the database without this JSON block ⚠️⚠️⚠️
   ⚠️⚠️⚠️ You MUST ALWAYS include it after EVERY formula recommendation ⚠️⚠️⚠️
   ⚠️⚠️⚠️ NO EXCEPTIONS - If you skip this, the user loses their formula ⚠️⚠️⚠️
   
   AFTER your conversational explanation, you MUST include this exact JSON structure in triple backticks.
   This is NON-NEGOTIABLE and the ONLY way formulas get saved to the database.
   
   ⚠️ VALIDATION REQUIREMENTS - READ CAREFULLY ⚠️
   - ALL system support names MUST match EXACTLY from the 32 approved system supports list above (scroll up to see full list)
   - ALL individual ingredient names MUST match EXACTLY from the 29 approved individual ingredients list above (scroll up to see full list)
   - Use EXACT capitalization and specifications (e.g., "Ginko Biloba Extract 24%" not "Ginkgo Biloba")
   - NEVER include ingredients not in the approved catalog (if not listed above, DON'T use it)
   - NEVER EVER make up formula names like "Brain Support", "Brain Health Blend", "Cognitive Support Mix", "Memory Formula" - ONLY use the exact names from approved system supports
   - If user mentions ingredients they currently take (e.g., "I take Vitamin D3"), DO NOT include them unless they're in our approved catalog
   - When users want brain/cognitive support, use individual ingredients (Ginko Biloba, Phosphatidylcholine, Omega 3) NOT made-up "Brain Support" formulas
   - If you use an unapproved ingredient or made-up formula name, the entire formula will be REJECTED and NOT saved
   
   === CRITICAL CALCULATION RULES (READ BEFORE CREATING JSON) ===
   
   🔴🔴🔴 STEP 1: ALWAYS SHOW YOUR MATH BEFORE THE JSON BLOCK 🔴🔴🔴
   
   Before creating the JSON, you MUST write out your calculation like this:
   "**Formula Calculation:**
   - Heart Support: 450mg
   - Liver Support: 500mg  
   - Ashwagandha: 600mg
   - CoQ10: 200mg
   - Omega-3: 800mg
   **Running Total: 450 + 500 + 600 + 200 + 800 = 2550mg** ✅ Under 5500mg limit"
   
   If your running total exceeds 5500mg, STOP and remove ingredients before creating the JSON!
   
   RULE 1 - EXACT DOSAGES FOR FIXED-DOSE INGREDIENTS:
   Some ingredients CANNOT be adjusted - they have ONE fixed dosage only:
   • Camu Camu: EXACTLY 2500mg (NOT 1500mg, NOT 2000mg, MUST be 2500mg)
   • Ashwagandha: EXACTLY 600mg  
   • InnoSlim: EXACTLY 250mg
   
   RULE 2 - ACCURATE totalMg CALCULATION:
   • Add up EVERY ingredient (bases + additions)
   • Use a calculator - do NOT estimate
   • Your totalMg MUST equal the sum of all ingredients
   • ⚠️ HARD LIMIT: 5500mg MAXIMUM - formulas over this are REJECTED
   • Backend will verify - mismatches = REJECTION
   
   Example:
   Heart Support (450) + Ashwagandha (600) + CoQ10 (200) + L-Theanine (400) 
   + Broccoli (200) + Red Ginseng (200)
   + NAD+ (100) + Fulvic Acid (250) + Curcumin (400) 
   + InnoSlim (250)
   = 3050mg ← This is what you put in "totalMg"
   
   RULE 3 - MAXIMUM LIMIT CHECK:
   • If your total > 5500mg, you MUST reduce BEFORE creating JSON:
     - Remove some ingredients
     - Use lower dosages (for range-based ingredients)
     - Choose fewer system supports
   • DO NOT create JSON with total > 5500mg - it will be rejected!
   
   🔴🔴🔴 MANDATORY: You MUST copy this exact format below. Replace the example data with your formula, but keep the JSON structure identical. 🔴🔴🔴
   
   ⚠️ CRITICAL CATEGORIZATION RULES:
   - "bases" array = ONLY the 18 approved system supports (Heart Support, Liver Support, Adrenal Support, etc.)
   - "additions" array = ONLY the 29 approved INDIVIDUAL INGREDIENTS (Magnesium, Omega 3 algae omega, Turmeric, etc.)
   - NEVER put individual ingredients in "bases" array
   - NEVER put system supports in "additions" array
   
   Format it EXACTLY like this with triple backticks and "json" tag (replace \` with actual backticks):
   
   \`\`\`json
   {
     "bases": [
       {"name": "Heart Support", "dose": "450mg", "purpose": "Supports cardiovascular health with L-Carnitine, CoQ10, and Magnesium for your elevated cholesterol"}
     ],
     "additions": [
       {"name": "Magnesium", "dose": "320mg", "purpose": "Supports muscle relaxation, stress management, and nervous system health"},
       {"name": "Omega-3", "dose": "300mg", "purpose": "Reduces inflammation and supports heart health for your cardiovascular concerns"},
       {"name": "Ginger Root", "dose": "300mg", "purpose": "Supports digestion and reduces inflammation for your bloating issues"}
     ],
     "totalMg": 1370,
     "warnings": ["Ginger may have mild blood-thinning properties - monitor if taking aspirin"],
     "rationale": "Formula targets digestive health, cardiovascular support, and stress management based on elevated cholesterol, bloating, and high stress levels",
     "disclaimers": ["This is supplement support, not medical advice", "Always consult your healthcare provider before starting new supplements"]
   }
   \`\`\`
   
   � CRITICAL: ACCURATE totalMg CALCULATION 🚨
   You MUST calculate totalMg correctly by adding ALL ingredient dosages. Common mistakes:
   - Missing ingredients in calculation
   - Using wrong units (ensure all doses are in mg)
   - Rounding errors or typos
   
   ❌ WRONG: If you add 13 ingredients but your totalMg only accounts for 10 = REJECTED!
   ✅ CORRECT: Double-check your math. Add each dosage one by one:
   
   Example calculation (with actual ingredients from your formula):
   Heart Support: 450mg
   + Liver Support: 500mg
   + Ashwagandha: 600mg
   + CoEnzyme Q10: 200mg
   + L-Theanine: 400mg
   + Omega 3 algae omega: 800mg
   + Magnesium: 400mg
   + Curcumin: 400mg
   + NAD+: 100mg
   + Ginko Biloba Extract 24%: 200mg
   = 4050mg total ← THIS is the correct totalMg (under 5500mg limit ✅)
   
   ⚠️ If your totalMg doesn't match your ingredients, the formula will be REJECTED!
   The backend validates your math and will reject formulas with calculation errors.
   
   ⚠️ If your total exceeds 5500mg, the formula will be REJECTED! Reduce ingredients first.
   
   �🔍 QUICK CHECK BEFORE SUBMITTING:
   - Verify all "bases" items are from the 32 system supports list (scroll up to check)
   - Verify all "additions" items are from the 29 INDIVIDUAL INGREDIENTS list (scroll up to check)
   - Calculate accurate totalMg (recommend suggesting 4500-5500mg range for optimal value)
   
   REQUIRED FIELDS:
   - bases: array of system supports (MUST use exact names from approved 32 system supports)
   - additions: array of individual ingredients (MUST use exact names from approved 29 individual ingredients)
   - totalMg: total daily formula weight in mg (number)
   - warnings: array of any drug interactions or contraindications
   - rationale: brief explanation of overall formula strategy
   - disclaimers: array of safety disclaimers
   
   🔴 FINAL CHECKPOINT BEFORE SENDING: 🔴
   Before you send your response, verify:
   ✓ Did I include the JSON block in triple backticks with "json" tag exactly as shown in example?
   ✓ Did I use ONLY approved system support names (check the list above)?
   ✓ Did I use ONLY approved individual ingredient names (check the list above)?
   ✓ Did I include all required fields (bases, additions, totalMg, warnings, rationale, disclaimers)?
   
   If you answer NO to any of these, STOP and FIX IT before sending. The user's formula will be LOST if you skip this.

5. FOLLOW-UP QUESTIONS (CRITICAL - Always ask after presenting formula):
   
   After presenting the formula, ALWAYS ask 2-3 targeted follow-up questions to potentially refine or add to the formula:
   
   - "Is there anything else you'd like to address that we haven't covered yet?"
   - Based on their profile, ask specific questions like:
     * If they have sleep issues: "Would you like me to add anything specifically for sleep quality?"
     * If they're athletic: "Would you like to add ingredients for workout recovery or performance?"
     * If they have stress: "Should we add anything specifically for stress management or adrenal support?"
     * If they're over 50: "Would you like to add anything for cognitive health or memory support?"
     * If female: "Would you like to add anything for hormonal balance or cycle support?"
   
   This gives them a chance to add ingredients without having to think of what to ask for.

=== SAFETY DISCLAIMERS ===
- Always ask about medications and health conditions
- This is supplement support, not medical advice
- Recommend consulting healthcare provider
- Monitor for any adverse reactions
- Retest blood work in 3-6 months

=== HEALTH DATA EXTRACTION ===

CRITICAL: Whenever users mention ANY health metrics in their messages, you MUST extract and return them in a special JSON block.
This allows us to automatically update their health profile so they don't have to enter data twice.

Extract these metrics when mentioned:
- age (number)
- sex ("male", "female", or "other")
- heightCm (number, MUST convert from feet/inches to cm: 5'10" = 178cm, 6'0" = 183cm, 6'2" = 188cm, 6'6" = 198cm)
- weightLbs (number, in pounds - store as-is, no conversion needed)
- bloodPressureSystolic (number, e.g., "120/80" → systolic=120)
- bloodPressureDiastolic (number, e.g., "120/80" → diastolic=80)
- restingHeartRate (number in bpm)
- sleepHoursPerNight (number)
- exerciseDaysPerWeek (number, 0-7)
- stressLevel (number, 1-10 scale)
- smokingStatus ("never", "former", or "current")
- alcoholDrinksPerWeek (number)
- conditions (array of strings for health conditions)
- medications (array of strings for current medications)
- allergies (array of strings for allergies)

At the END of your response, if you extracted ANY health data, include it in this exact format:
\`\`\`health-data
{
  "age": 35,
  "weightLbs": 160,
  "exerciseDaysPerWeek": 3
}
\`\`\`

IMPORTANT RULES:
1. Only include fields you're confident about from the user's message
2. For height, convert feet/inches to cm (e.g., 5'10" = 178cm)
3. For blood pressure like "120/80", split into systolic (120) and diastolic (80)
4. For exercise, convert "3 times a week" → 3, "daily" → 7, etc.
5. For smoking, convert "I smoke" → "current", "I used to smoke" → "former", "I don't smoke" → "never"
6. For medications: ALWAYS include them as an array when mentioned, e.g., ["Sertraline", "Metformin"]
7. For conditions: ALWAYS include them as an array when mentioned, e.g., ["Type 2 Diabetes", "Anxiety"]
8. For allergies: ALWAYS include them as an array when mentioned, e.g., ["Penicillin", "Shellfish"]
9. The health-data block should come AFTER your conversational response
10. If no health data is mentioned, don't include the health-data block at all

EXAMPLE with medications:
User: "I take sertraline for anxiety and metformin for blood sugar"
Your response should include:
\`\`\`health-data
{
  "medications": ["Sertraline", "Metformin"],
  "conditions": ["Anxiety", "Blood sugar issues"]
}
\`\`\``;

// Rate limiting store for OpenAI API calls
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

// Security middleware functions
function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

function checkRateLimit(clientId: string, limit: number, windowMs: number): { allowed: boolean, remaining: number, resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);
  
  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    const resetTime = now + windowMs;
    rateLimitStore.set(clientId, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }
  
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 60000); // Clean up every minute

// ... rest of imports ...

export async function registerRoutes(
  app: Express,
  rateLimiters?: { authLimiter?: RateLimitRequestHandler; aiLimiter?: RateLimitRequestHandler }
): Promise<Server> {
  // Use Express built-in JSON middleware (much more reliable)
  app.use('/api', (req, res, next) => {
    console.log('🔧 REQUEST MIDDLEWARE: Processing request', {
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type']
    });
    next();
  });

  // JSON parsing with size limit (using express built-in)
  app.use('/api', express.json({ 
    limit: '10kb',
    strict: true,
    type: 'application/json'
  }));
  
  // Security headers middleware
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // ============================================================
  // MODULAR ROUTES (migrated from inline definitions)
  // These routes have been extracted to server/routes/*.routes.ts
  // for better organization and maintainability.
  // ============================================================
  
  // Auth routes: /api/auth/* - signup, login, logout, me
  if (rateLimiters?.authLimiter) {
    app.use('/api/auth/signup', rateLimiters.authLimiter);
    app.use('/api/auth/login', rateLimiters.authLimiter);
  }
  app.use('/api/auth', authRoutes);
  
  // User routes: /api/users/* - profile, health-profile, orders
  app.use('/api/users', userRoutes);
  
  // Notification routes: /api/notifications/*
  app.use('/api/notifications', notificationRoutes);
  
  // Admin routes: /api/admin/* - stats, users, support-tickets
  app.use('/api/admin', adminRoutes);
  
  // Support routes: /api/support/* - FAQ, tickets, help
  app.use('/api/support', supportRoutes);
  
  // Consents routes: /api/consents/*
  app.use('/api/consents', consentsRoutes);
  
  // Files routes: /api/files/* - HIPAA-compliant file uploads
  app.use('/api/files', filesRoutes);
  
  // Formulas routes: /api/formulas/*, /api/users/me/formula/*
  app.use('/api/formulas', formulasRoutes);
  
  // Ingredients routes: /api/ingredients/*
  app.use('/api/ingredients', ingredientsRoutes);
  
  // Wearables routes: /api/wearables/* - Junction (Vital) integration
  app.use('/api/wearables', wearablesRoutes);
  
  // Webhooks routes: /api/webhooks/* - Junction webhooks
  app.use('/api/webhooks', webhooksRoutes);
  
  // Optimize routes: /api/optimize/* - plans, logs, grocery lists
  app.use('/api/optimize', optimizeRoutes);
  
  // ============================================================
  // LEGACY INLINE ROUTES (to be migrated)
  // The following routes are still defined inline and will be
  // migrated in future iterations:
  // - /api/chat/* (complex SSE streaming)
  // ============================================================

  // Download lab report file
  app.get('/api/files/:fileId/download', requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { fileId } = req.params;
    try {
      const fileUpload = await storage.getFileUpload(fileId);
      if (!fileUpload) {
        return res.status(404).json({ error: 'File not found' });
      }
      if (fileUpload.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Download file from Supabase storage
      const objectPath = fileUpload.objectPath;
      const buffer = await ObjectStorageService.prototype.getLabReportFile(objectPath, userId);
      if (!buffer) {
        return res.status(500).json({ error: 'Failed to download file' });
      }
      res.setHeader('Content-Type', fileUpload.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileUpload.originalFileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  // Load persisted AI settings (if any) from DB at startup
  try {
    const saved = await storage.getAppSetting('ai_settings');
    const val = saved?.value as any;
    if (val && (val.provider || val.model)) {
      const provider = String(val.provider || process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai'|'anthropic';
      let model = String(val.model || (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o'));
      const normalized = normalizeModel(provider, model) || model;
      const allowed = ALLOWED_MODELS[provider] || [];
      if (!allowed.includes(normalized)) {
        const fallback = allowed[0] || model;
        console.warn(`⚠️ Persisted model '${model}' not allowed for provider '${provider}'. Falling back to '${fallback}'.`);
        model = fallback;
      } else {
        model = normalized;
      }
      aiRuntimeSettings.provider = provider;
      aiRuntimeSettings.model = model;
      aiRuntimeSettings.updatedAt = new Date().toISOString();
      aiRuntimeSettings.source = 'override';
      console.log(`🔧 Loaded persisted AI settings: ${provider} / ${model}`);
    }
  } catch (e) {
    console.warn('⚠️ Failed to load persisted AI settings, using env defaults:', (e as Error)?.message || e);
  }

  // Authentication routes (with stricter rate limiting)
  if (rateLimiters?.authLimiter) {
    app.use('/api/auth/signup', rateLimiters.authLimiter);
    app.use('/api/auth/login', rateLimiters.authLimiter);
  }
  
  app.post('/api/auth/signup', async (req, res) => {
    const startTime = Date.now();
    console.log('🔧 SIGNUP REQUEST START:', {
      timestamp: new Date().toISOString(),
      clientIP: getClientIP(req),
      body: req.body ? { email: req.body.email, name: req.body.name } : 'No body'
    });

    try {
      // Rate limiting for signup (3 attempts per 15 minutes per IP)
      console.log('📋 SIGNUP: Checking rate limit...');
      const clientIP = getClientIP(req);
      const rateLimit = checkRateLimit(`signup-${clientIP}`, 3, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        console.log('⚠️ SIGNUP: Rate limit exceeded for IP:', clientIP);
        return res.status(429).json({ 
          error: 'Too many signup attempts. Please try again later.', 
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }
      console.log('✅ SIGNUP: Rate limit passed');

      // Validate request body
      console.log('📋 SIGNUP: Validating request body...');
      const validatedData = signupSchema.parse(req.body);
      console.log('✅ SIGNUP: Request validation passed for:', validatedData.email);
      
      // Check if user already exists
      console.log('📋 SIGNUP: Checking if user exists...');
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log('⚠️ SIGNUP: User already exists:', validatedData.email);
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      console.log('✅ SIGNUP: User does not exist, proceeding');

      // Hash password with secure salt rounds
      console.log('📋 SIGNUP: Hashing password...');
      const saltRounds = 12; // Secure default (OWASP recommendation)
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
      console.log('✅ SIGNUP: Password hashed successfully');

      // Create user
      console.log('📋 SIGNUP: Creating user...');
      const userData = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        password: hashedPassword
      };

      const user = await storage.createUser(userData);
      console.log('✅ SIGNUP: User created successfully:', { id: user.id, email: user.email });
      
      // Generate JWT token
      console.log('📋 SIGNUP: Generating JWT token...');
      const token = generateToken(user.id, user.isAdmin || false);
      console.log('✅ SIGNUP: JWT token generated');

      // Return user data without password
      const authResponse: AuthResponse = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          createdAt: user.createdAt.toISOString(),
          isAdmin: user.isAdmin || false
        },
        token
      };

      const endTime = Date.now();
      console.log('🎉 SIGNUP SUCCESS:', {
        duration: `${endTime - startTime}ms`,
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      return res.status(201).json(authResponse);
    } catch (error: any) {
      const endTime = Date.now();
      console.error('❌ SIGNUP ERROR:', {
        duration: `${endTime - startTime}ms`,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: error.name
      });
      
      if (error.name === 'ZodError') {
        console.log('📋 SIGNUP: Zod validation error details:', error.errors);
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      return res.status(500).json({ error: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      // Rate limiting for login (5 attempts per 15 minutes per IP)
      const clientIP = getClientIP(req);
      const rateLimit = checkRateLimit(`login-${clientIP}`, 5, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          error: 'Too many login attempts. Please try again later.', 
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }

      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = generateToken(user.id, user.isAdmin || false);

      // Return user data without password
      const authResponse: AuthResponse = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          createdAt: user.createdAt.toISOString(),
          isAdmin: user.isAdmin || false
        },
        token
      };

      res.json(authResponse);
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    // With JWT tokens, logout is primarily handled client-side by removing the token
    // We could maintain a blacklist for extra security, but for this MVP we'll keep it simple
    res.json({ message: 'Logged out successfully' });
  });

  // Forgot password - send reset email
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Rate limit: 3 requests per 15 minutes per IP
      const clientIP = getClientIP(req);
      const rateLimit = checkRateLimit(`forgot-password-${clientIP}`, 3, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          error: 'Too many password reset requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store token in database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL || 'https://my-ones.vercel.app'}/reset-password?token=${resetToken}`;
      
      try {
        await sendNotificationEmail({
          to: user.email,
          subject: 'Reset Your ONES Password',
          type: 'system',
          title: 'Password Reset Request',
          content: `
            <p>Hi ${user.name},</p>
            <p>We received a request to reset your password for your ONES account.</p>
            <p>Click the button below to reset your password:</p>
          `,
          actionUrl: resetUrl,
          actionText: 'Reset Password',
        });
        console.log(`Password reset email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't expose email sending failure to user
      }

      res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  });

  // Reset password with token
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Find and validate token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ error: 'Invalid or expired reset link' });
      }

      if (resetToken.used) {
        return res.status(400).json({ error: 'This reset link has already been used' });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: 'This reset link has expired' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);

      console.log(`Password reset successful for user: ${resetToken.userId}`);
      res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId is guaranteed to be set after requireAuth
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user data without password
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        state: user.state,
        postalCode: user.postalCode,
        country: user.country,
        createdAt: user.createdAt.toISOString(),
        isAdmin: user.isAdmin || false
      };

      res.json({ user: userData });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });

  // AI/Chat endpoints (with stricter rate limiting to prevent cost abuse)
  if (rateLimiters?.aiLimiter) {
    app.use('/api/chat', rateLimiters.aiLimiter);
  }

  // Streaming chat endpoint with enhanced security
  app.post('/api/chat/stream', requireAuth, async (req, res) => {
    let streamStarted = false;
    const clientIP = getClientIP(req);
    
    // Helper function to send SSE data
    const sendSSE = (data: any) => {
      if (!res.destroyed) {
        if (data.type === 'thinking') {
          console.log('📤 Sending thinking status:', data.message);
        }
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        
        // CRITICAL: Flush the response immediately to prevent buffering
        // This ensures thinking indicators appear in real-time
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }
    };
    
    // Helper function to end stream safely
    const endStream = () => {
      if (!res.destroyed) {
        res.end();
      }
    };
    
    try {
      // Rate limiting check (10 requests per 10 minutes per IP)
      const rateLimit = checkRateLimit(clientIP, 10, 10 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded', 
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }
      
      const { message, sessionId, files } = req.body;
      const userId = req.userId; // Use authenticated user ID from middleware
      
      // Enhanced input validation
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Valid message is required' });
      }
      
      if (message.length > 20000) {
        return res.status(400).json({ error: 'Message too long (max 20,000 characters)' });
      }
      
      // userId is guaranteed to be a valid string from authentication middleware
      
      if (sessionId && typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }
      
      // Basic content filtering for malicious content
      const suspiciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /data:text\/html/gi,
        /vbscript:/gi
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(message)) {
          console.warn(`Suspicious content detected from IP ${clientIP}: ${message.substring(0, 100)}`);
          return res.status(400).json({ error: 'Invalid message content' });
        }
      }

      // Set up proper Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      streamStarted = true;
      
      // Send initial connection confirmation
      sendSSE({ type: 'connected', message: 'Stream established' });

      // Get or create chat session
      let chatSession;
      if (sessionId) {
        chatSession = await storage.getChatSession(sessionId);
      }
      
      if (!chatSession) {
        const userId = req.userId!; // TypeScript assertion: userId is guaranteed after requireAuth
        chatSession = await storage.createChatSession({ userId, status: 'active' });
      }

      // Get previous messages for context (last 10 messages)
      const previousMessages = chatSession ? 
        (await storage.listMessagesBySession(chatSession.id)).slice(-10) : [];
      
      // (Removed - using single thinking message)

      // Get user's health profile to check for missing information
      let healthProfile;
      try {
        healthProfile = await storage.getHealthProfile(userId!);
      } catch (e) {
        console.log('No health profile found for user');
      }

      // Build health profile context for AI
      const missingFields: string[] = [];
      const completedFields: string[] = [];
      
      // Helper to check if a value is missing (null, undefined, or empty string)
      const isMissing = (value: any): boolean => {
        return value === null || value === undefined || value === '';
      };
      
      if (healthProfile) {
        // Check basic info
        if (!isMissing(healthProfile.age)) completedFields.push('age');
        else missingFields.push('age');
        
        if (!isMissing(healthProfile.sex)) completedFields.push('sex');
        else missingFields.push('sex');
        
        if (!isMissing(healthProfile.heightCm)) completedFields.push('height');
        else missingFields.push('height');
        
        if (!isMissing(healthProfile.weightLbs)) completedFields.push('weight');
        else missingFields.push('weight');
        
        // Check vital signs
        if (!isMissing(healthProfile.bloodPressureSystolic) && !isMissing(healthProfile.bloodPressureDiastolic)) {
          completedFields.push('blood pressure');
        } else {
          missingFields.push('blood pressure');
        }
        
        if (!isMissing(healthProfile.restingHeartRate)) completedFields.push('resting heart rate');
        else missingFields.push('resting heart rate');
        
        // Check lifestyle
        if (!isMissing(healthProfile.sleepHoursPerNight)) completedFields.push('sleep hours');
        else missingFields.push('sleep hours per night');
        
        if (!isMissing(healthProfile.exerciseDaysPerWeek)) completedFields.push('exercise frequency');
        else missingFields.push('exercise frequency');
        
        if (!isMissing(healthProfile.stressLevel)) completedFields.push('stress level');
        else missingFields.push('stress level (1-10)');
        
        // Check risk factors
        if (!isMissing(healthProfile.smokingStatus)) completedFields.push('smoking status');
        else missingFields.push('smoking status');
        
        if (!isMissing(healthProfile.alcoholDrinksPerWeek)) completedFields.push('alcohol consumption');
        else missingFields.push('alcohol consumption per week');
        
        // Check health conditions
        if (healthProfile.conditions && healthProfile.conditions.length > 0) {
          completedFields.push(`health conditions (${healthProfile.conditions.join(', ')})`);
        } else {
          missingFields.push('current health conditions or concerns');
        }
        
        if (healthProfile.medications && healthProfile.medications.length > 0) {
          completedFields.push(`medications (${healthProfile.medications.join(', ')})`);
        } else {
          missingFields.push('current medications');
        }
        
        if (healthProfile.allergies && healthProfile.allergies.length > 0) {
          completedFields.push(`allergies (${healthProfile.allergies.join(', ')})`);
        } else {
          missingFields.push('allergies');
        }
      } else {
        // No health profile at all
        missingFields.push('age', 'sex', 'height', 'weight', 'blood pressure', 'resting heart rate', 
          'sleep hours per night', 'exercise frequency', 'stress level (1-10)', 'smoking status', 
          'alcohol consumption per week', 'current health conditions or concerns', 'current medications', 'allergies');
      }

      // Fetch user's lab reports with extracted data and format as structured table
      await new Promise(resolve => setTimeout(resolve, 200));
      const labReports = await storage.getLabReportsByUser(userId!);
      let labDataContext = '';
      
      console.log('🔬 DEBUG: Lab reports found:', labReports.length);
      
      if (labReports.length > 0) {
        console.log('🔬 DEBUG: Lab reports statuses:', labReports.map(r => r.labReportData?.analysisStatus || 'no status'));
        
        // Sort by upload date (newest first) to help AI identify latest reports
        const sortedReports = labReports
          .filter(report => report.labReportData?.analysisStatus === 'completed' && report.labReportData?.extractedData)
          .sort((a, b) => {
            const dateA = new Date(a.uploadedAt || 0).getTime();
            const dateB = new Date(b.uploadedAt || 0).getTime();
            return dateB - dateA; // Newest first
          });
        
        const processedReports = sortedReports.map((report, index) => {
          const data = report.labReportData!;
          const values = data.extractedData as any[];
          
          // Format upload date for readability
          const uploadDate = new Date(report.uploadedAt || '');
          const uploadDateStr = uploadDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          
          // Label the most recent report
          const timelineLabel = index === 0 ? '🆕 LATEST REPORT' : `📅 Previous Report #${sortedReports.length - index}`;
          
          const tableRows = values.map(v => {
            const status = v.status || 'normal';
            const statusFlag = status === 'high' ? '⬆️ HIGH' : status === 'low' ? '⬇️ LOW' : '✓ Normal';
            return `  • ${v.testName}: ${v.value} ${v.unit || ''} | Status: ${statusFlag} | Reference: ${v.referenceRange || 'N/A'}`;
          }).join('\n');
          
          return `${timelineLabel}
📋 Test Date: ${data.testDate || 'unknown date'}
📤 Uploaded: ${uploadDateStr}
🏥 Lab: ${data.labName || 'unknown lab'}
📁 Filename: ${report.originalFileName || 'unknown'}

Biomarkers:
${tableRows}`;
        });
        
        console.log('🔬 DEBUG: Processed reports count:', processedReports.length);
        
        if (processedReports.length > 0) {
          labDataContext = `
=== 📊 YOUR LAB REPORTS TIMELINE (Sorted: Newest → Oldest) ===

${processedReports.join('\n\n───────────────────────────────────────────────────\n\n')}

💡 HOW TO REFERENCE THESE REPORTS:
- "latest blood test" / "most recent labs" = ${sortedReports[0]?.labReportData?.testDate || 'latest upload'}
${sortedReports.length > 1 ? `- "previous test" / "last month's labs" = ${sortedReports[1]?.labReportData?.testDate || 'second most recent'}` : ''}
- Or reference by specific test date shown above`;
          console.log('🔬 DEBUG: Lab data context length:', labDataContext.length, 'chars');
        } else {
          console.log('⚠️ DEBUG: No lab reports with completed analysis and extracted data');
        }
        
        // (Removed - using single thinking message)
      }
      
      // Fetch user's current active formula
      const activeFormula = await storage.getCurrentFormulaByUser(userId!);
      
      console.log('🔍 DEBUG: Active formula fetched:', activeFormula ? `YES - ${activeFormula.name} (${activeFormula.totalMg}mg)` : 'NO FORMULA FOUND');
      
      // (Removed - using single thinking message)
      
      let currentFormulaContext = '';
      if (activeFormula) {
        // Match actual database schema: ingredient, amount, unit
        const bases = activeFormula.bases as Array<{ingredient: string, amount: number, unit: string, purpose?: string}>;
        const additions = (activeFormula.additions || []) as Array<{ingredient: string, amount: number, unit: string, purpose?: string}>;
        const customizations = activeFormula.userCustomizations as {
          addedBases?: Array<{ingredient: string, amount: number, unit: string}>;
          addedIndividuals?: Array<{ingredient: string, amount: number, unit: string}>;
        };
        
        console.log('🔍 DEBUG: Bases count:', bases.length, 'Additions count:', additions.length);
        console.log('🔍 DEBUG: User customizations:', customizations ? JSON.stringify(customizations) : 'none');
        
        const basesText = bases.map(b => `  • ${b.ingredient} (${b.amount}${b.unit}) - ${b.purpose || 'No description'}`).join('\n');
        const additionsText = additions.length > 0 
          ? additions.map(a => `  • ${a.ingredient} (${a.amount}${a.unit}) - ${a.purpose || 'No description'}`).join('\n')
          : '  (none)';
        
        // Include user customizations if they exist
        let customizationsText = '';
        if (customizations) {
          const customBases = customizations.addedBases || [];
          const customIndividuals = customizations.addedIndividuals || [];
          
          if (customBases.length > 0 || customIndividuals.length > 0) {
            const allCustomizations = [
              ...customBases.map(c => `  • ${c.ingredient} (${c.amount}${c.unit}) - User added system support`),
              ...customIndividuals.map(c => `  • ${c.ingredient} (${c.amount}${c.unit}) - User added individual ingredient`)
            ];
            customizationsText = `\n\nUser Manual Customizations:\n${allCustomizations.join('\n')}`;
          }
        }
        
        currentFormulaContext = `
📦 CURRENT ACTIVE FORMULA: "${activeFormula.name || 'Unnamed'}" (Version ${activeFormula.version || 1})
${activeFormula.userCreated ? '[CUSTOM BUILT] - User manually created this formula without AI assistance' : '[AI-GENERATED] - AI created and optimized this formula'}

system supports${activeFormula.userCreated ? '' : ' (AI-Recommended)'}:
${basesText}

Individual Additions${activeFormula.userCreated ? '' : ' (AI-Recommended)'}:
${additionsText}${customizationsText}

Total Daily Dose: ${activeFormula.totalMg}mg
Target Range: 4500-5500mg (00 capsule capacity)

⚠️ IMPORTANT: When analyzing blood tests and making recommendations:
- Review this COMPLETE formula FIRST (including all system supports, additions, AND user customizations)
- Identify what's working and what might need adjustment
- Calculate the gap: Current ${activeFormula.totalMg}mg → Target 4500-5500mg = ${Math.max(0, 4500 - activeFormula.totalMg)}mg minimum addition needed (${5500 - activeFormula.totalMg}mg maximum capacity available)
- Suggest specific system supports or individual ingredients from the approved catalog to ADD
- Explain which current ingredients to keep, increase, or remove based on lab results
- Show your math: "Current XYZ 450mg + Adding ABC 300mg = 750mg total for cardiovascular support"

🔧 WHEN USER ASKS TO REMOVE INGREDIENTS:
- If user says "remove Vitamin C" or "take out X ingredient", ONLY remove that specific ingredient
- DO NOT remove other ingredients unless explicitly asked
- MAINTAIN OR INCREASE the total dosage by adding new ingredients to fill the gap
- Example: If removing Vitamin C (90mg) from a 4110mg formula:
  - New base = 4020mg (4110mg - 90mg)
  - Add 480-1480mg of new beneficial ingredients to reach 4500-5500mg target
  - Result: Formula should be 4500-5500mg, not 2270mg!
- Always aim for 4500-5500mg total unless user explicitly requests a smaller formula
`;

        console.log('📦 DEBUG: Formula context built, length:', currentFormulaContext.length, 'chars');
      } else {
        console.log('⚠️ DEBUG: No active formula found for user');
      }
      
      const healthContextMessage = `
${labDataContext ? `
🚨🚨🚨 CRITICAL OVERRIDE INSTRUCTION 🚨🚨🚨

THE USER HAS UPLOADED BLOOD TEST RESULTS. THEY ARE SHOWN BELOW IN YOUR CONTEXT.

⚠️ ABSOLUTE REQUIREMENT: When a user mentions they've uploaded blood tests, lab results, or Function Health data:
1. DO NOT say "I'll review the data" or "I'll get back to you" or "Let me analyze" or any future-tense statement
2. DO NOT ask for missing health profile information first
3. The lab data is ALREADY EXTRACTED and FORMATTED in your context below
4. You MUST IMMEDIATELY ANALYZE the blood test data in THIS SAME RESPONSE
5. Provide specific findings with actual biomarker values and recommendations
6. Then you can ask for any missing profile information afterwards if needed

WRONG RESPONSE EXAMPLE (DO NOT DO THIS):
"Thank you for uploading your blood tests. I'll review the data and provide recommendations..."

CORRECT RESPONSE EXAMPLE (DO THIS):
"I've analyzed your Function Health results. Here's what I found:

🔴 Cardiovascular Markers:
- Total Cholesterol: 220 mg/dL (⬆️ HIGH, ref: <200 mg/dL)
- LDL: 145 mg/dL (⬆️ HIGH, ref: <100 mg/dL)

These elevated lipids indicate we should focus on cardiovascular support. I'm adding Heart Support (450mg) and Omega-3 (300mg) to target these specific concerns..."

THE LAB DATA IS ALREADY HERE - ANALYZE IT NOW:
` : ''}

=== USER'S CURRENT HEALTH PROFILE STATUS ===

Information we have: ${completedFields.length > 0 ? completedFields.join(', ') : 'None yet'}

Information still needed: ${missingFields.length > 0 ? missingFields.join(', ') : 'Complete!'}
${labDataContext ? '⚠️ BUT ANALYZE THE LAB RESULTS ABOVE FIRST BEFORE ASKING FOR MISSING INFORMATION!' : ''}

${currentFormulaContext}

${labDataContext ? `
=== LABORATORY TEST RESULTS (ANALYZE THESE CAREFULLY) ===
${labDataContext}

🔬 MANDATORY BLOOD TEST ANALYSIS PROTOCOL:
When blood test results are provided, you MUST follow this structured analysis approach:

STEP 1 - KEY FINDINGS FROM YOUR BLOOD TEST
Present abnormal biomarkers using this EXACT clean format with proper spacing:

"I've analyzed your blood test results. Here's what stands out:

**🔴 CARDIOVASCULAR HEALTH** (Priority: High)

**LDL-Cholesterol:** 151 mg/dL ⬆️ HIGH
Target: <100 mg/dL
Elevated LDL increases atherosclerosis risk and cardiovascular disease.

**Triglycerides:** 180 mg/dL ⬆️ HIGH  
Target: <150 mg/dL
High levels contribute to cardiovascular disease risk.

**Total Cholesterol/HDL Ratio:** 5.8 ⬆️ HIGH
Target: <5.0
Indicates increased heart disease risk.

**Apolipoprotein B (ApoB):** 147 mg/dL ⬆️ HIGH
Linked to increased cardiovascular disease risk.

---

**🟡 BLOOD & METABOLIC MARKERS**

**Hematocrit:** 54.2% ⬆️ HIGH
Elevated levels can increase blood viscosity affecting cardiovascular health.

**Platelet Count:** 526 K/uL ⬆️ HIGH
High counts can affect clotting and increase cardiovascular risk.

**Homocysteine:** 13.7 umol/L ⬆️ HIGH
Target: <10 umol/L
Known risk factor for cardiovascular disease.

**Omega-3 Total:** 2.6% ⬇️ LOW
Target: >8%
Low levels impact heart and brain health. Consider increasing omega-3 rich foods or external supplementation."

FORMATTING REQUIREMENTS:
- Use **bold** for biomarker names
- Put value and direction on same line as name
- "Target:" on separate line when needed
- Explanation on separate line
- Blank line between each biomarker
- Use horizontal rule (---) between category sections
- NO bullet points or dashes before biomarker names
- Clean spacing and visual hierarchy

STEP 2 - CURRENT FORMULA REVIEW
${activeFormula ? `Analyze the user's current ${activeFormula.totalMg}mg formula:
- What's already addressing their issues?
- What's missing based on lab results?
- Calculate capacity remaining: ${Math.max(0, 5500 - activeFormula.totalMg)}mg available for additions (max 5500mg total)` : 'User has no current formula - create comprehensive first formula based on labs'}

STEP 3 - SPECIFIC RECOMMENDATIONS
For EACH abnormal biomarker, explain in clean paragraph format:

"For your elevated LDL (151 mg/dL), I'm adding **Heart Support (450mg)** which contains L-Carnitine, CoQ10, and Magnesium - these work synergistically to support cardiovascular health and healthy cholesterol metabolism."

Use **bold** for ingredient names and dosages. Keep explanations conversational and clear.

STEP 4 - DOSAGE SUMMARY
Show the math in clean format:

Current formula: ${activeFormula ? `${activeFormula.totalMg}mg` : '0mg'}
New ingredients: [list with amounts]
**New total: [calculated amount]**

Verify: 4500mg ≤ New Total ≤ 5500mg

🚨 CRITICAL FORMATTING RULES:
- NO markdown tables or bullet lists for biomarkers
- Use proper spacing (blank lines between items)
- Bold biomarker names and ingredient names
- Group related markers under category headers
- Use horizontal rules (---) to separate sections
- Keep it scannable and clean
- Only use ingredients from the approved 32 system supports + 29 individual ingredients
` : ''}

INSTRUCTIONS FOR GATHERING MISSING INFORMATION:
- Naturally weave requests for missing information into the conversation
- Don't ask for all missing items at once - prioritize the most important ones first
- If the user doesn't know or doesn't want to provide certain information, that's okay - leave it blank
- Priority order: medications > health conditions > age/sex/height/weight > vital signs > lifestyle factors
- Always extract and save any health data the user provides in the health-data JSON block
`;

      // Build conversation history with file context
      let messageWithFileContext = message;
      if (files && files.length > 0) {
        const fileDescriptions = files.map((file: any) => `${file.name} (${file.type})`).join(', ');
        messageWithFileContext = `[User has attached files: ${fileDescriptions}] ${message}`;
      }

  // Choose AI provider and model (admin override > env) with normalization/guardrails
  const aiProvider = (aiRuntimeSettings.provider || process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai'|'anthropic';
  let model = aiRuntimeSettings.model || process.env.AI_MODEL || (aiProvider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o');
  const normalizedModel = normalizeModel(aiProvider, model) || model;
  const allowedForProvider = ALLOWED_MODELS[aiProvider] || [];
  if (!allowedForProvider.includes(normalizedModel)) {
    const fallback = allowedForProvider[0] || model;
    console.warn(`⚠️ Unrecognized model '${model}' for provider '${aiProvider}'. Using fallback '${fallback}'.`);
    model = fallback;
  } else {
    model = normalizedModel;
  }
  const source = aiRuntimeSettings.provider || aiRuntimeSettings.model ? 'override' : 'env';
  console.log(`🤖 Using provider: ${aiProvider} | model: ${model} | source: ${source}`);
      
      // Send thinking message
      sendSSE({ type: 'thinking', message: 'Analyzing your health data...' });
      
      // Build comprehensive prompt with all context
      const promptContext: PromptContext = {
        healthProfile: normalizePromptHealthProfile(healthProfile),
        activeFormula: normalizePromptFormula(activeFormula),
        labDataContext: labDataContext || undefined,
        recentMessages: previousMessages
      };
      const fullSystemPrompt = buildO1MiniPrompt(promptContext) + healthContextMessage;
      console.log('📤 Prompt length:', fullSystemPrompt.length, 'chars');
      console.log('📤 Current formula in prompt?', fullSystemPrompt.includes('CURRENT ACTIVE FORMULA'));
      console.log('📤 Lab data in prompt?', fullSystemPrompt.includes('LABORATORY TEST RESULTS'));
      
      const conversationHistory: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: 'system', content: fullSystemPrompt },
        ...previousMessages.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: messageWithFileContext }
      ];

  // Enhanced AI request with retry logic and circuit breaker
  let stream: any;
  // Collect full response text here (used by Anthropic path or after OpenAI streaming)
  let fullResponse: string = '';
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          if (aiProvider === 'anthropic') {
            if (!process.env.ANTHROPIC_API_KEY) throw new Error('Anthropic API key not configured');

            // Anthropic expects system separately and no 'system' items in messages
            const systemPrompt = conversationHistory[0]?.content || '';
            // Filter out any messages with empty content (Anthropic requires non-empty content)
            const msgs = conversationHistory.slice(1)
              .filter(m => m.content && m.content.trim().length > 0)
              .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
            
            // Ensure we have at least the current user message
            if (msgs.length === 0 || msgs[msgs.length - 1]?.role !== 'user') {
              msgs.push({ role: 'user', content: messageWithFileContext });
            }

            // TRUE STREAMING - send chunks as they arrive from Anthropic
            console.log('🌊 Using TRUE Anthropic streaming...');
            let fullResponseLocal = '';
            let chunkIndex = 0;
            let toolJsonBlock: string | undefined;

            try {
              for await (const chunk of streamAnthropic(systemPrompt, msgs, model, 0.7, 3000, true)) {
                if (chunk.type === 'text') {
                  fullResponseLocal += chunk.content;
                  chunkIndex++;
                  sendSSE({ type: 'chunk', content: chunk.content, sessionId: chatSession?.id, chunkIndex });
                } else if (chunk.type === 'tool_use') {
                  toolJsonBlock = chunk.content;
                }
              }
            } catch (streamErr: any) {
              console.error('❌ Anthropic streaming error:', streamErr.message);
              throw streamErr;
            }

            // If a tool result provided structured JSON, append it as final chunk
            if (toolJsonBlock) {
              fullResponseLocal += '\n\n' + toolJsonBlock + '\n\n';
              chunkIndex++;
              sendSSE({ type: 'chunk', content: toolJsonBlock, sessionId: chatSession?.id, chunkIndex });
            }

            // Reuse downstream extraction/validation by assigning fullResponse
            fullResponse = fullResponseLocal;
            // Skip OpenAI streaming loop and jump to extraction block below
            // eslint-disable-next-line no-labels
            break;
          } else {
            // OpenAI path (streaming)
            if (!process.env.OPENAI_API_KEY) {
              throw new Error('OpenAI API key not configured');
            }
            const modelConfig: any = {
              model: model,
              messages: conversationHistory,
              stream: true,
              max_tokens: 3000,
              temperature: 0.7
            };
            const streamPromise = openai.chat.completions.create(modelConfig);
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('OpenAI request timeout')), 180000);
            });
            stream = await Promise.race([streamPromise, timeoutPromise]);
            break; // Success, exit retry loop
          }
          
        } catch (aiError: any) {
          retryCount++;
          console.error(`❌ AI request attempt ${retryCount} failed (${aiProvider}):`, aiError.message || aiError);
          console.error('Full error details:', JSON.stringify(aiError, null, 2));
          
          if (retryCount > maxRetries) {
            // Send specific error based on AI error type
            const errorMessage = aiError.message || String(aiError);
            const statusCode = aiError.status || (errorMessage.match(/HTTP (\d+)/) ? parseInt(errorMessage.match(/HTTP (\d+)/)[1]) : null);
            
            console.error(`🔴 FINAL ERROR after ${retryCount} attempts:`, { provider: aiProvider, model, statusCode, message: errorMessage });
            
            if (statusCode === 429) {
              sendSSE({
                type: 'error',
                error: 'AI service is currently overloaded. Please try again in a few minutes.',
                code: 'RATE_LIMITED'
              });
            } else if (statusCode === 401 || statusCode === 403) {
              sendSSE({
                type: 'error',
                error: `AI service authentication failed (${aiProvider}). Please contact support.`,
                code: 'AUTH_FAILED'
              });
            } else if (statusCode === 400) {
              sendSSE({
                type: 'error',
                error: `Invalid request to AI service: ${errorMessage.substring(0, 200)}`,
                code: 'BAD_REQUEST'
              });
            } else {
              sendSSE({
                type: 'error',
                error: `AI service (${aiProvider}/${model}) temporarily unavailable: ${errorMessage.substring(0, 150)}`,
                code: 'SERVICE_UNAVAILABLE'
              });
            }
            endStream();
            return;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

  // Note: for Anthropic path above, fullResponse is already set.
      let extractedFormula = null;
      let chunkCount = 0;

      if (aiProvider !== 'anthropic') {
        // OpenAI streaming path
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              chunkCount++;
              sendSSE({ type: 'chunk', content, sessionId: chatSession?.id, chunkIndex: chunkCount });
              if (chunkCount > 3000) {
                console.warn('Stream exceeded chunk limit, terminating');
                break;
              }
            }
          }
        } catch (streamError) {
          console.error('AI streaming error:', streamError);
          sendSSE({ type: 'error', error: 'AI response generation failed', sessionId: chatSession?.id });
          endStream();
          return;
        }
      }

      // Extract formula data from response if present
      console.log('🔍 FORMULA EXTRACTION: Checking AI response for ```json block...');
      console.log('📝 Full AI Response Length:', fullResponse.length);
      console.log('📝 Full AI Response Preview (first 500 chars):', fullResponse.substring(0, 500));
      
      try {
        // Extract everything between ```json and ``` (greedy match to get complete JSON)
        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          console.log('✅ FORMULA EXTRACTION: Found ```json block in AI response!');
          console.log('📦 Extracted JSON length:', jsonMatch[1].length, 'chars');
          console.log('📦 Extracted JSON preview (first 300):', jsonMatch[1].substring(0, 300));
          console.log('📦 Extracted JSON preview (last 200):', jsonMatch[1].substring(Math.max(0, jsonMatch[1].length - 200)));
          
          console.log('🔄 Attempting to parse JSON...');
          const jsonData = JSON.parse(jsonMatch[1]);
          console.log('✅ JSON parsed successfully');
          console.log('📊 Parsed data keys:', Object.keys(jsonData));
          console.log('📊 AI Formula Details:');
          console.log('  - totalMg from AI:', jsonData.totalMg);
          if (jsonData.bases) {
            console.log('  - Bases:', jsonData.bases.map((b: any) => `${b.ingredient}: ${b.amount}${b.unit}`).join(', '));
          }
          if (jsonData.additions) {
            console.log('  - Additions:', jsonData.additions.map((a: any) => `${a.ingredient}: ${a.amount}${a.unit}`).join(', '));
          }
          
          console.log('🔄 Validating against FormulaExtractionSchema...');
          let validatedFormula = FormulaExtractionSchema.parse(jsonData);
          console.log('✅ Schema validation passed');
          console.log('📊 Validated formula has', validatedFormula.bases?.length || 0, 'bases and', validatedFormula.additions?.length || 0, 'additions');
          
          // 🔍 POST-GENERATION VALIDATOR: Check and auto-correct ingredient names
          console.log('🔍 Running post-generation ingredient validator...');
          const ingredientValidation = validateAndCorrectIngredientNames(validatedFormula);
          
          if (!ingredientValidation.success) {
            console.error('❌ POST-GENERATION VALIDATION FAILED:', ingredientValidation.errors);
            // Send error with specific ingredient issues
            sendSSE({
              type: 'error',
              error: `⚠️ Formula contains unapproved ingredients:\n\n${ingredientValidation.errors.join('\n\n')}\n\nPlease create the formula again using ONLY ingredients from the approved catalog.`
            });
            
            // Skip formula processing by throwing error that will be caught below
            throw new Error('Formula validation failed: ' + ingredientValidation.errors.join(', '));
          }
          
          // Log and send auto-corrections to client
          if (ingredientValidation.warnings.length > 0) {
            console.log('⚠️ AUTO-CORRECTIONS MADE:', ingredientValidation.warnings);
            ingredientValidation.warnings.forEach(warning => console.log(`  ${warning}`));
            
            // Notify user about auto-corrections via SSE
            sendSSE({
              type: 'info',
              message: `✓ Auto-corrected ${ingredientValidation.warnings.length} ingredient name(s) to match catalog`
            });
          }
          
          // Use the corrected formula for validation
          validatedFormula = ingredientValidation.correctedFormula;
          console.log('✅ Post-generation validation passed - using corrected formula');
          
          // 🔧 ALWAYS CALCULATE totalMg ON BACKEND (AI no longer responsible for math)
          console.log('🔄 Calculating formula total (backend calculates - not AI)...');
          const validation = validateAndCalculateFormula(validatedFormula);
          
          if (validatedFormula.totalMg) {
            console.log('📊 AI provided totalMg:', validatedFormula.totalMg, '(will be ignored)');
          } else {
            console.log('📊 AI did not provide totalMg (as instructed)');
          }
          console.log('📊 Backend calculated total:', validation.calculatedTotalMg);
          
          // Set totalMg to backend calculation (authoritative source)
          validatedFormula.totalMg = validation.calculatedTotalMg;
          console.log('✅ Using backend-calculated totalMg:', validatedFormula.totalMg, 'mg');
          
          // 🔧 AUTO-CORRECT: If formula exceeds 5500mg by a small amount, remove largest additions
          const maxWithTolerance = FORMULA_LIMITS.MAX_TOTAL_DOSAGE + FORMULA_LIMITS.DOSAGE_TOLERANCE;
          if (validation.calculatedTotalMg > maxWithTolerance) {
            const overage = validation.calculatedTotalMg - FORMULA_LIMITS.MAX_TOTAL_DOSAGE;
            const overagePercent = (overage / validation.calculatedTotalMg) * 100;
            
            // Only auto-correct if overage is < 10% (e.g., 5700mg → 5500mg is 3.6% overage)
            if (overagePercent <= 10) {
              console.log(`🔧 AUTO-TRIMMING: Formula is ${overage}mg over limit (${overagePercent.toFixed(1)}% overage). Removing smallest additions...`);
              
              // Sort additions by amount (ascending) and remove smallest until under limit
              const sortedAdditions = [...validatedFormula.additions].sort((a, b) => a.amount - b.amount);
              let removedMg = 0;
              const removedIngredients: string[] = [];
              
              for (let i = 0; i < sortedAdditions.length && removedMg < overage; i++) {
                const add = sortedAdditions[i];
                removedMg += add.amount;
                removedIngredients.push(`${add.ingredient} (${add.amount}mg)`);
                // Remove from validatedFormula.additions
                validatedFormula.additions = validatedFormula.additions.filter((a: any) => a.ingredient !== add.ingredient);
              }
              
              // Recalculate total
              const newValidation = validateAndCalculateFormula(validatedFormula);
              validatedFormula.totalMg = newValidation.calculatedTotalMg;
              
              console.log(`✅ AUTO-TRIMMED: Removed ${removedIngredients.length} ingredients (${removedMg}mg): ${removedIngredients.join(', ')}`);
              console.log(`✅ New total: ${validation.calculatedTotalMg}mg → ${newValidation.calculatedTotalMg}mg`);
              
              // Update validation object
              validation.calculatedTotalMg = newValidation.calculatedTotalMg;
              validation.errors = newValidation.errors;
              validation.isValid = newValidation.isValid;
              
              // 🔧 ADDITIONAL CHECK: Remove ingredients that violate catalog dosage minimums (e.g., Glutathione at 300mg when min is 600mg)
              const dosageViolations = validation.errors.filter(e => e.includes('below allowed minimum'));
              if (dosageViolations.length > 0) {
                console.log(`🔧 REMOVING DOSAGE VIOLATIONS: Found ${dosageViolations.length} ingredients with invalid dosages`);
                const additionalRemovals: string[] = [];
                
                for (const error of dosageViolations) {
                  // Extract ingredient name from error message: '"Glutathione" below allowed minimum...'
                  const match = error.match(/"([^"]+)"/);
                  if (match) {
                    const ingredientName = match[1];
                    const removed = validatedFormula.additions.find((a: any) => a.ingredient === ingredientName);
                    if (removed) {
                      validatedFormula.additions = validatedFormula.additions.filter((a: any) => a.ingredient !== ingredientName);
                      additionalRemovals.push(`${ingredientName} (${removed.amount}mg - below minimum)`);
                      console.log(`  ❌ Removed ${ingredientName} (${removed.amount}mg) - below catalog minimum`);
                    }
                  }
                }
                
                // Recalculate again after removing dosage violations
                const finalValidation = validateAndCalculateFormula(validatedFormula);
                validatedFormula.totalMg = finalValidation.calculatedTotalMg;
                validation.calculatedTotalMg = finalValidation.calculatedTotalMg;
                validation.errors = finalValidation.errors;
                validation.isValid = finalValidation.isValid;
                
                removedIngredients.push(...additionalRemovals);
                console.log(`✅ Final total after removing dosage violations: ${finalValidation.calculatedTotalMg}mg`);
              }
              
              // Add warning to user about removed ingredients
              validatedFormula.warnings = validatedFormula.warnings || [];
              validatedFormula.warnings.push(`Note: Removed ${removedIngredients.length} lower-priority ingredients (${removedMg}mg total) to fit within the 5500mg maximum capsule capacity: ${removedIngredients.join(', ')}`);
            } else {
              console.log(`⚠️ Overage too large (${overagePercent.toFixed(1)}%), cannot auto-correct. Rejecting formula.`);
            }
          }
          
          // Check for CRITICAL errors (unapproved ingredients AND dosage violations)
          const criticalErrors = validation.errors.filter(e => 
            e.includes('UNAUTHORIZED INGREDIENT') || 
            e.includes('Formula total too high') ||
            e.includes('exceeds maximum dosage limit') ||
            e.includes('exceeds allowed maximum') ||  // Individual ingredient max violations
            e.includes('below allowed minimum')        // Individual ingredient min violations
          );
          
          if (criticalErrors.length > 0) {
            // CRITICAL: Unapproved ingredients or dosage violations - must reject
            console.error('🚨 CRITICAL: Formula validation failed:', criticalErrors);
            
            // Build error message for AI to see in next turn
            const hasIngredientDosageViolation = criticalErrors.some(e => e.includes('exceeds allowed maximum') || e.includes('below allowed minimum'));
            const hasTotalDosageError = criticalErrors.some(e => e.includes('total too high') || e.includes('exceeds maximum dosage limit'));
            const hasUnapprovedIngredient = criticalErrors.some(e => e.includes('UNAUTHORIZED INGREDIENT'));
            
            let validationErrorMessage = '\n\n---\n\n⚠️ **VALIDATION ERROR - Formula Rejected**\n\n';
            
            if (hasIngredientDosageViolation) {
              // Specific ingredient violated its allowed dosage range
              validationErrorMessage += `❌ **Problem:** One or more ingredients violate their allowed dosage ranges.\n\n`;
              validationErrorMessage += `**Dosage Violations:**\n${criticalErrors.map(e => `- ${e}`).join('\n')}\n\n`;
              validationErrorMessage += `🚨 **CRITICAL RULE:** Each ingredient has a STRICT minimum and maximum dosage that you MUST follow.\n\n`;
              validationErrorMessage += `**How to Fix:**\n`;
              validationErrorMessage += `1. Check the ingredient list above for the EXACT allowed range for each ingredient\n`;
              validationErrorMessage += `2. Either:\n`;
              validationErrorMessage += `   - Adjust the dosage to fit within the allowed range, OR\n`;
              validationErrorMessage += `   - Remove that ingredient entirely and choose a different one\n\n`;
              validationErrorMessage += `**Example Violations:**\n`;
              validationErrorMessage += `- Ginger Root: 2000mg ❌ → Max is 500mg (use 500mg or less)\n`;
              validationErrorMessage += `- Garlic: 300mg ❌ → Max is 200mg (use 50-200mg range)\n\n`;
              validationErrorMessage += `Please create a corrected formula with VALID dosages for all ingredients.`;
              
              sendSSE({
                type: 'error',
                error: `⚠️ Ingredient dosage violations detected:\n\n${criticalErrors.map(e => `❌ ${e}`).join('\n\n')}\n\nPlease adjust dosages to fit within allowed ranges or remove violating ingredients.`,
                sessionId: chatSession?.id
              });
            } else if (hasTotalDosageError) {
              validationErrorMessage += `❌ **Problem:** Your formula totals ${validation.calculatedTotalMg}mg, which exceeds the maximum safe limit of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg.\n\n`;
              validationErrorMessage += `🚨 **CRITICAL REMINDER:** When you create a formula, it REPLACES the entire existing formula. You are creating a COMPLETE formula from scratch (0mg → up to 5500mg), NOT adding to an existing formula.\n\n`;
              validationErrorMessage += `**Required Fix:** Your new COMPLETE formula must total ≤5500mg. Reduce by ${validation.calculatedTotalMg - FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg by:\n`;
              validationErrorMessage += `- Removing some system supports (e.g., remove Beta Max saves 2500mg)\n`;
              validationErrorMessage += `- Removing some individual ingredients\n`;
              validationErrorMessage += `- Reducing dosages of flexible ingredients (e.g., Curcumin 600mg → 400mg)\n`;
              validationErrorMessage += `- Prioritizing the most critical health goals\n\n`;
              validationErrorMessage += `**Example:** If user has cardiovascular concerns + digestion issues:\n`;
              validationErrorMessage += `✓ CORRECT: Heart Support 450mg + Hawthorn Berry 100mg + Garlic 200mg + CoQ10 200mg + Curcumin 400mg + Ashwagandha 600mg + L-Theanine 400mg + NAD+ 100mg = 2450mg\n`;
              validationErrorMessage += `✗ WRONG: Trying to fit 13 ingredients totaling 6282mg\n\n`;
              validationErrorMessage += `Please create a corrected formula with the COMPLETE ingredient list (bases + additions) that totals ≤5500mg.`;
              
              sendSSE({
                type: 'error',
                error: `⚠️ Formula exceeds maximum safe dosage of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg.\n\nCalculated total: ${validation.calculatedTotalMg}mg\n\nPlease create a smaller formula by:\n- Using fewer system supports\n- Reducing individual ingredient doses\n- Focusing on your top priority health goals`,
                sessionId: chatSession?.id
              });
            } else if (hasUnapprovedIngredient) {
              validationErrorMessage += `❌ **Problem:** Formula contains unapproved ingredients.\n\n`;
              validationErrorMessage += `**Errors:**\n${criticalErrors.map(e => `- ${e}`).join('\n')}\n\n`;
              validationErrorMessage += `Please create a corrected formula using ONLY ingredients from the approved catalog.`;
              
              sendSSE({
                type: 'error',
                error: `⚠️ Formula contains unapproved ingredients. Please use only ingredients from our approved catalog.`,
                sessionId: chatSession?.id
              });
            }
            
            // Append validation error to fullResponse so AI sees it in chat history
            fullResponse += validationErrorMessage;
            
            // Still complete the stream normally but without formula
            sendSSE({
              type: 'complete',
              sessionId: chatSession?.id,
              formula: null
            });
            
            // Save messages with validation error appended - AI will see this in next turn
            if (chatSession) {
              await storage.createMessage({
                sessionId: chatSession.id,
                role: 'user',
                content: message,
                model: null
              });
              
              await storage.createMessage({
                sessionId: chatSession.id,
                role: 'assistant',
                content: fullResponse, // Includes validation error message
                model: model
              });
              
              console.log('💾 Saved validation error to chat history - AI will see it and self-correct in next turn');
            }
            
            endStream();
            return;
          }
          
          // ✅ Formula is valid (non-critical errors are just warnings)
          console.log('✅ Formula validation passed - using calculated totalMg:', validatedFormula.totalMg);
          extractedFormula = validatedFormula;
          
          // Add validation warnings (for non-critical issues like capsule sizing)
          const nonCriticalErrors = validation.errors.filter(e => 
            !e.includes('UNAUTHORIZED INGREDIENT') && 
            !e.includes('Formula total too high') &&
            !e.includes('exceeds maximum dosage limit')
          );
          if (nonCriticalErrors.length > 0) {
            extractedFormula.warnings.push(...nonCriticalErrors);
          }
          
          // Get user's health profile for medication validation
          let userMedications: string[] = [];
          if (userId) {
            try {
              const healthProfile = await storage.getHealthProfile(userId);
              userMedications = healthProfile?.medications || [];
            } catch (e) {
              console.log('Could not retrieve user health profile for medication validation');
            }
          }
          
          // Validate supplement-medication interactions
          const medicalWarnings = await validateSupplementInteractions(validatedFormula, userMedications);
          extractedFormula.warnings.push(...medicalWarnings);
          
          // Add standard medical disclaimers if not present
          if (!extractedFormula.disclaimers.some(d => d.includes('medical advice'))) {
            extractedFormula.disclaimers.unshift('This is supplement support, not medical advice');
          }
          if (!extractedFormula.disclaimers.some(d => d.includes('healthcare provider'))) {
            extractedFormula.disclaimers.push('Always consult your healthcare provider before starting new supplements');
          }
          if (!extractedFormula.disclaimers.some(d => d.includes('interactions'))) {
            extractedFormula.disclaimers.push('Monitor for interactions with medications and adverse reactions');
          }
          
          // Remove the formula JSON block from fullResponse before displaying to user
          // This keeps the conversational response clean while still extracting the data
          fullResponse = fullResponse.replace(/```json\s*{[\s\S]*?}\s*```\s*/g, '').trim();
        } else {
          console.error('❌ FORMULA EXTRACTION FAILURE: NO ```json block found in AI response!');
          console.log('🔍 Searching for other patterns...');
          // Check if AI outputted formula without proper formatting
          // Only trigger error if AI explicitly claimed to have created/built a formula
          const claimsFormulaCreation = 
              fullResponse.toLowerCase().includes("here's your formula") ||
              fullResponse.toLowerCase().includes("here is your formula") ||
              fullResponse.toLowerCase().includes("i've created") ||
              fullResponse.toLowerCase().includes("i have created") ||
              fullResponse.toLowerCase().includes("your new formula") ||
              fullResponse.toLowerCase().includes("your updated formula") ||
              fullResponse.toLowerCase().includes("here's the formula") ||
              fullResponse.toLowerCase().includes("presenting your formula");
          
          if (claimsFormulaCreation) {
            console.error('⚠️ CRITICAL: AI claimed to create a formula but NOT in ```json block format!');
            console.error('⚠️ This formula will NOT be saved! AI needs to output JSON block.');
            
            // Append error message that AI will see in chat history
            const systemError = '\n\n---\n\n🚨 **SYSTEM ERROR - Formula Not Created**\n\n' +
              '❌ **Problem:** You discussed a formula but did NOT output the ```json code block.\n\n' +
              '**What happened:** You said "Here\'s your optimized formula" but then only described it in text. ' +
              'The system REQUIRES the JSON code block to actually create the formula.\n\n' +
              '**Required Fix:** Output the complete JSON block immediately:\n\n' +
              '```json\n' +
              '{\n' +
              '  "bases": [{...}],\n' +
              '  "additions": [{...}],\n' +
              '  "rationale": "...",\n' +
              '  "warnings": [...],\n' +
              '  "disclaimers": [...]\n' +
              '}\n' +
              '```\n\n' +
              '**DO NOT** just describe the formula - you MUST output the actual JSON code block for the formula to be created.';
            
            fullResponse += systemError;
            console.log('💾 Appended JSON missing error to chat history - AI will see it and output JSON next time');
          }
        }
      } catch (e) {
        console.error('❌ FORMULA EXTRACTION ERROR:', e);
        console.log('No valid formula JSON found in response');
      }

      // Extract health data from response if present
      let healthDataUpdated = false;
      try {
        const healthDataMatch = fullResponse.match(/```health-data\s*({[\s\S]*?})\s*```/);
        if (healthDataMatch && userId) {
          const healthData = JSON.parse(healthDataMatch[1]);
          console.log('Extracted health data from AI response:', healthData);
          
          // Get existing health profile to merge with new data
          const existingProfile = await storage.getHealthProfile(userId);
          
          // Merge with existing data (new data takes precedence)
          const mergedData = {
            age: healthData.age ?? existingProfile?.age,
            sex: healthData.sex ?? existingProfile?.sex,
            heightCm: healthData.heightCm ?? existingProfile?.heightCm,
            weightLbs: healthData.weightLbs ?? existingProfile?.weightLbs,
            bloodPressureSystolic: healthData.bloodPressureSystolic ?? existingProfile?.bloodPressureSystolic,
            bloodPressureDiastolic: healthData.bloodPressureDiastolic ?? existingProfile?.bloodPressureDiastolic,
            restingHeartRate: healthData.restingHeartRate ?? existingProfile?.restingHeartRate,
            sleepHoursPerNight: healthData.sleepHoursPerNight ?? existingProfile?.sleepHoursPerNight,
            exerciseDaysPerWeek: healthData.exerciseDaysPerWeek ?? existingProfile?.exerciseDaysPerWeek,
            stressLevel: healthData.stressLevel ?? existingProfile?.stressLevel,
            smokingStatus: healthData.smokingStatus ?? existingProfile?.smokingStatus,
            alcoholDrinksPerWeek: healthData.alcoholDrinksPerWeek ?? existingProfile?.alcoholDrinksPerWeek,
            conditions: healthData.conditions ?? existingProfile?.conditions,
            medications: healthData.medications ?? existingProfile?.medications,
            allergies: healthData.allergies ?? existingProfile?.allergies,
          };
          
          // Validate merged data against schema before persisting
          const validatedData = insertHealthProfileSchema.omit({ userId: true }).parse(mergedData);
          
          // Update or create health profile
          if (existingProfile) {
            await storage.updateHealthProfile(userId, validatedData);
          } else {
            await storage.createHealthProfile({
              userId,
              ...validatedData
            });
          }
          
          console.log('Health profile automatically updated from AI conversation');
          healthDataUpdated = true;
          
          // Remove the health-data block from fullResponse before saving
          fullResponse = fullResponse.replace(/```health-data\s*{[\s\S]*?}\s*```\s*/g, '').trim();
        }
      } catch (e) {
        console.log('No valid health data found in response or error updating profile:', e);
      }

      // Save extracted formula to storage if valid
      let savedFormula = null;
      console.log('💾 Checking if we should save formula...');
      console.log('💾 extractedFormula exists?', !!extractedFormula);
      console.log('💾 chatSession exists?', !!chatSession);
      console.log('💾 userId exists?', !!userId);
      
      if (extractedFormula && chatSession && userId) {
        console.log('✅ All conditions met - proceeding to save formula');
        try {
          // CRITICAL: Validate all ingredients against approved catalog (category-agnostic flexible matching)
          // This checks ALL ingredients (bases + additions) against the complete catalog
          // to handle cases where AI might miscategorize a base as an addition or vice versa
          console.log('🔍 Validating', extractedFormula.bases.length, 'bases +', extractedFormula.additions.length, 'additions against approved catalog');
          
          // Validate system supports (category-agnostic - checks against ALL approved ingredients)
          for (const base of extractedFormula.bases) {
            const ingredientName = base.ingredient;
            if (!ingredientName || !isAnyIngredientApproved(ingredientName)) {
              console.error(`VALIDATION ERROR: Unapproved ingredient "${ingredientName}" detected in bases array`);
              throw new Error(`The ingredient "${ingredientName}" is not in our approved catalog. Please use only approved ingredients from our catalog.`);
            }
          }
          
          // Validate additions (category-agnostic - checks against ALL approved ingredients)
          for (const addition of extractedFormula.additions) {
            const ingredientName = addition.ingredient;
            if (!ingredientName || !isAnyIngredientApproved(ingredientName)) {
              console.error(`VALIDATION ERROR: Unapproved ingredient "${ingredientName}" detected in additions array`);
              throw new Error(`The ingredient "${ingredientName}" is not in our approved catalog. Please use only approved ingredients from our catalog.`);
            }
          }
          
          // Get current formula to determine next version number
          const currentFormula = await storage.getCurrentFormulaByUser(userId);
          const nextVersion = currentFormula ? currentFormula.version + 1 : 1;
          
          // Convert formula to storage format with normalized ingredient names
          const normalizedBases = extractedFormula.bases.map((b: any) => {
            const rawName = b.ingredient || b.name;
              const normalizedName = normalizeIngredientName(rawName);
              console.log(`🔄 Normalizing base: "${rawName}" → "${normalizedName}"`);
              return {
                ingredient: normalizedName,
                amount: typeof b.amount === 'number' ? b.amount : parseDoseToMg(b.dose || `${b.amount}mg`, rawName),
                unit: 'mg',
                purpose: b.purpose
              };
            });
          const normalizedAdditions = extractedFormula.additions.map((a: any) => {
            const rawName = a.ingredient || a.name;
            const normalizedName = normalizeIngredientName(rawName);
            console.log(`🔄 Normalizing addition: "${rawName}" → "${normalizedName}"`);
            return {
              ingredient: normalizedName,
              amount: typeof a.amount === 'number' ? a.amount : parseDoseToMg(a.dose || `${a.amount}mg`, rawName),
              unit: 'mg',
              purpose: a.purpose
            };
          });
          const computedTotalMg = [...normalizedBases, ...normalizedAdditions].reduce((sum, item) => sum + item.amount, 0);
          const formulaData = {
            userId,
            bases: normalizedBases,
            additions: normalizedAdditions,
            totalMg: typeof extractedFormula.totalMg === 'number' ? extractedFormula.totalMg : computedTotalMg,
            rationale: extractedFormula.rationale,
            warnings: extractedFormula.warnings || [],
            disclaimers: extractedFormula.disclaimers || [],
            version: nextVersion
          };
          
          // 🔒 SECURITY: Validate formula against immutable limits
          const limitValidation = validateFormulaLimits(formulaData);
          if (!limitValidation.valid) {
            console.error('🚨 SECURITY: Formula rejected - violates immutable limits!');
            console.error('🚨 Validation errors:', limitValidation.errors);
            console.error('🚨 Attempted totalMg:', formulaData.totalMg);
            console.error('🚨 Max allowed:', FORMULA_LIMITS.MAX_TOTAL_DOSAGE);
            
            // Log potential security issue
            console.warn('⚠️ SECURITY ALERT: Formula validation failed');
            console.warn('Reasons:', limitValidation.errors);
            
            // 🎯 SHOW ERROR TO USER: Display validation errors via SSE
            const errorMessage = `⚠️ **VALIDATION ERROR - Formula Rejected**\n\n${limitValidation.errors.map(e => `❌ ${e}`).join('\n\n')}\n\nPlease create a corrected formula addressing these issues.`;
            
            // Send error via SSE (don't try to write to stream directly)
            sendSSE({
              type: 'error',
              error: errorMessage,
              sessionId: chatSession?.id
            });
            
            console.log('📛 Formula rejected - error shown to user via SSE');
            console.log('📛 User will see validation errors and can ask AI to fix');
            
            // Don't save - formula stays null
            savedFormula = null;
          } else {
            // ✅ Validation passed - save the formula
            console.log('✅ Security validation passed - formula within safe limits');
            savedFormula = await storage.createFormula(formulaData);
            console.log(`Formula v${nextVersion} saved successfully for user ${userId}`);
            
            // 📬 Create in-app notification for formula update
            try {
              const isFirstFormula = nextVersion === 1;
              await storage.createNotification({
                userId,
                type: 'formula_update',
                title: isFirstFormula ? 'Your Formula is Ready! 🧪' : `Formula Updated to V${nextVersion}`,
                content: isFirstFormula 
                  ? `Your personalized supplement formula has been created with ${savedFormula.totalMg}mg of targeted ingredients.`
                  : `Your formula has been updated based on your consultation. Review the changes in My Formula.`,
                formulaId: savedFormula.id,
                metadata: { 
                  actionUrl: '/dashboard/my-formula', 
                  icon: 'beaker', 
                  priority: isFirstFormula ? 'high' : 'medium' 
                }
              });
              console.log(`📬 Formula notification created for user ${userId}`);
            } catch (notifError) {
              console.error('Failed to create formula notification:', notifError);
              // Don't fail the whole flow for notification errors
            }
          }
        } catch (formulaSaveError) {
          console.error('❌ ERROR SAVING FORMULA:', formulaSaveError);
          
          // Check if it's a validation error for unapproved ingredients
          if (formulaSaveError instanceof Error && formulaSaveError.message.includes('not in our approved catalog')) {
            console.error('⚠️ CRITICAL: AI used unapproved ingredient - formula rejected!');
            
            // Notify user via server-sent event
            sendSSE({
              type: 'error',
              error: `⚠️ Formula Validation Error: ${formulaSaveError.message}\n\nPlease ask me to create your formula again using only approved ingredients from our catalog.`
            });
          }
          // Don't throw - just log the error and continue without saving invalid formula
        }
      }
      
      // CRITICAL: Strip ALL remaining code blocks from response before showing to user
      // This ensures customer never sees any technical/code content (```anything```)
      // We've already extracted formula JSON and health-data, so anything left is unwanted
      fullResponse = fullResponse.replace(/```[\s\S]*?```/g, '').trim();
      
      // Also clean up any stray code markers that might remain
      fullResponse = fullResponse.replace(/`{1,3}/g, '').trim();
      
      // Send health data update notification if applicable
      if (healthDataUpdated) {
        sendSSE({
          type: 'health_data_updated',
          message: "✓ We've updated your health profile based on the information you provided.",
          sessionId: chatSession?.id
        });
      }
      
      // Transform formula for frontend display (convert ingredient/amount to name/dose format)
      // 🔒 CRITICAL: Only show formula if it was actually saved (passed validation)
      let formulaForDisplay = null;
      if (savedFormula) {
        const savedBases = savedFormula.bases ?? [];
        const savedAdditions = savedFormula.additions ?? [];
        // Use savedFormula data which includes the corrected totalMg and validated ingredients
        formulaForDisplay = {
          bases: savedBases.map((b: any) => ({
            name: b.ingredient || b.name,
            dose: typeof b.amount === 'number' ? `${b.amount}mg` : (b.dose || `${b.amount}mg`),
            purpose: b.purpose
          })),
          additions: savedAdditions.map((a: any) => ({
            name: a.ingredient || a.name,
            dose: typeof a.amount === 'number' ? `${a.amount}mg` : (a.dose || `${a.amount}mg`),
            purpose: a.purpose
          })),
          totalMg: savedFormula.totalMg,
          warnings: savedFormula.warnings || [],
          rationale: savedFormula.rationale,
          disclaimers: savedFormula.disclaimers || []
        };
      }
      
      // Send completion event with transformed formula for frontend
      console.log('📤 SSE COMPLETE: formulaForDisplay exists?', !!formulaForDisplay);
      console.log('📤 SSE COMPLETE: savedFormula exists?', !!savedFormula);
      if (formulaForDisplay) {
        console.log('📤 SSE COMPLETE: formula bases count:', formulaForDisplay.bases?.length);
        console.log('📤 SSE COMPLETE: formula totalMg:', formulaForDisplay.totalMg);
      }
      sendSSE({
        type: 'complete',
        formula: formulaForDisplay,
        sessionId: chatSession?.id,
        formulaId: savedFormula?.id,
        responseLength: fullResponse.length,
        chunkCount
      });

      // Save messages to storage
      if (chatSession) {
        try {
          await storage.createMessage({
            sessionId: chatSession.id,
            role: 'user',
            content: message,
            model: null,
            formula: undefined
          });
          
          await storage.createMessage({
            sessionId: chatSession.id,
            role: 'assistant',
            content: fullResponse,
            model: model,
            formula: formulaForDisplay || undefined // Save the formula with the message
          });
        } catch (messageError) {
          console.error('Error saving messages:', messageError);
        }
      }

      endStream();

    } catch (error) {
      console.error(`Chat stream error from IP ${clientIP}:`, error);
      
      // Log detailed error for monitoring
      const errorDetails = {
        timestamp: new Date().toISOString(),
        clientIP,
        userId: req.body?.userId,
        sessionId: req.body?.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
      console.error('Detailed error log:', JSON.stringify(errorDetails, null, 2));
      
      // Only send error if stream was started
      if (streamStarted && !res.destroyed) {
        sendSSE({
          type: 'error',
          error: 'Failed to generate response. Please try again.',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
        endStream();
      } else if (!streamStarted) {
        // If stream never started, send regular HTTP error
        res.status(500).json({ 
          error: 'Failed to generate response. Please try again.',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Handle client disconnect
    req.on('close', () => {
      if (!res.destroyed) {
        console.log('Client disconnected from stream');
        endStream();
      }
    });
    
    req.on('error', (err) => {
      console.error('Request error:', err);
      if (!res.destroyed) {
        endStream();
      }
    });
  });

  // Get chat session
  app.get('/api/chat/:sessionId', requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const session = await storage.getChatSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Ensure the session belongs to the authenticated user
      if (session.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const messages = await storage.listMessagesBySession(sessionId);
      
      res.json({
        session,
        messages
      });
    } catch (error) {
      console.error('Get chat session error:', error);
      res.status(500).json({ error: 'Failed to get chat session' });
    }
  });

  // Create new chat session
  app.post('/api/chat/sessions', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth

      const session = await storage.createChatSession({ 
        userId, 
        status: 'active' 
      });
      
      res.json(session);
    } catch (error) {
      console.error('Create chat session error:', error);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });

  // List user's chat sessions
  app.get('/api/users/me/sessions', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const sessions = await storage.listChatSessionsByUser(userId);
      
      res.json(sessions);
    } catch (error) {
      console.error('List chat sessions error:', error);
      res.status(500).json({ error: 'Failed to list chat sessions' });
    }
  });

  // Get consultation history (enhanced format for ConsultationPage) - MUST be before /:sessionId route
  app.get('/api/consultations/history', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      // Fetch user's chat sessions
      const sessions = await storage.listChatSessionsByUser(userId);
      
      // Fetch messages for all sessions and organize them
      const messagesPromises = sessions.map(session => 
        storage.listMessagesBySession(session.id).then(messages => ({
          sessionId: session.id,
          messages
        }))
      );
      
      const sessionMessages = await Promise.all(messagesPromises);
      
      // Organize messages by session ID
      const messagesMap: Record<string, any[]> = {};
      sessionMessages.forEach(({ sessionId, messages }) => {
        messagesMap[sessionId] = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          timestamp: msg.createdAt,
          sessionId: msg.sessionId,
          formula: msg.formula || undefined // Include formula data if present
        }));
      });

      // Enhance sessions with metadata for frontend
      const enhancedSessions = sessions.map(session => {
        const sessionMsgs = messagesMap[session.id] || [];
        const lastMessage = sessionMsgs[sessionMsgs.length - 1];
        const hasFormula = sessionMsgs.some(msg => msg.formula);
        
        return {
          id: session.id,
          title: `Consultation ${new Date(session.createdAt).toLocaleDateString()}`,
          lastMessage: lastMessage?.content?.substring(0, 100) + '...' || 'New consultation',
          timestamp: session.createdAt,
          messageCount: sessionMsgs.length,
          hasFormula,
          status: session.status
        };
      });

      // Sort sessions by most recent first
      enhancedSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({
        sessions: enhancedSessions,
        messages: messagesMap
      });
    } catch (error) {
      console.error('Get consultation history error:', error);
      res.status(500).json({ error: 'Failed to fetch consultation history' });
    }
  });

  // Get specific consultation session with messages
  app.get('/api/consultations/:sessionId', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const sessionId = req.params.sessionId;
      
      // Verify session belongs to user
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      if (session.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to session' });
      }
      
      // Fetch messages for this session
      const messages = await storage.listMessagesBySession(sessionId);
      const sessionUpdatedAt = messages.length > 0
        ? messages[messages.length - 1].createdAt
        : session.createdAt;
      
      res.json({
        session: {
          id: session.id,
          userId: session.userId,
          status: session.status,
          createdAt: session.createdAt,
          updatedAt: sessionUpdatedAt
        },
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          timestamp: msg.createdAt,
          sessionId: msg.sessionId,
          formula: msg.formula || undefined // Include formula data if present
        }))
      });
    } catch (error) {
      console.error('Get consultation session error:', error);
      res.status(500).json({ error: 'Failed to fetch consultation session' });
    }
  });

  // Delete consultation session
  app.delete('/api/consultations/:sessionId', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const sessionId = req.params.sessionId;
      
      // Verify session belongs to user
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      if (session.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Delete the session (this should cascade delete messages)
      await storage.deleteChatSession(sessionId);
      
      res.json({ success: true, sessionId });
    } catch (error) {
      console.error('Delete consultation error:', error);
      res.status(500).json({ error: 'Failed to delete consultation' });
    }
  });

  // Get dashboard data
  app.get('/api/dashboard', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      // Fetch all dashboard data in parallel
      const [currentFormula, healthProfile, chatSessions, orders, subscription, labReports] = await Promise.all([
        storage.getCurrentFormulaByUser(userId),
        storage.getHealthProfile(userId),
        storage.listChatSessionsByUser(userId),
        storage.listOrdersByUser(userId),
        storage.getSubscription(userId),
        storage.listFileUploadsByUser(userId, 'lab_report') // Get uploaded lab reports
      ]);

      // Calculate metrics
      const totalConsultations = chatSessions.length;
      const recentSessions = chatSessions.slice(0, 3);
      const recentOrders = orders.slice(0, 5);
      
      // Calculate days since user joined (using oldest chat session or current date)
      const oldestSession = chatSessions.length > 0 ? 
        Math.min(...chatSessions.map(s => s.createdAt.getTime())) : Date.now();
      const daysActive = Math.floor((Date.now() - oldestSession) / (1000 * 60 * 60 * 24));
      
      // Profile Completeness Calculation (0-100%)
      const profileFields = {
        // Demographics (2 fields)
        demographics: [
          healthProfile?.age,
          healthProfile?.sex
        ],
        // Physical measurements (2 fields)
        physical: [
          healthProfile?.weightLbs,
          healthProfile?.heightCm
        ],
        // Vital signs (3 fields)
        vitals: [
          healthProfile?.bloodPressureSystolic && healthProfile?.bloodPressureDiastolic ? true : null,
          healthProfile?.restingHeartRate
        ],
        // Lifestyle factors (5 fields)
        lifestyle: [
          healthProfile?.sleepHoursPerNight,
          healthProfile?.exerciseDaysPerWeek !== null && healthProfile?.exerciseDaysPerWeek !== undefined ? true : null,
          healthProfile?.stressLevel,
          healthProfile?.smokingStatus,
          healthProfile?.alcoholDrinksPerWeek !== null && healthProfile?.alcoholDrinksPerWeek !== undefined ? true : null
        ],
        // Medical history (3 fields - count if arrays have items)
        medical: [
          (healthProfile?.conditions && Array.isArray(healthProfile.conditions) && healthProfile.conditions.length > 0) ? true : null,
          (healthProfile?.medications && Array.isArray(healthProfile.medications) && healthProfile.medications.length > 0) ? true : null,
          (healthProfile?.allergies && Array.isArray(healthProfile.allergies) && healthProfile.allergies.length > 0) ? true : null
        ],
        // Lab reports (1 field)
        labs: [
          labReports && labReports.length > 0 ? true : null
        ]
      };
      
      // Count completed fields
      const completedFields = Object.values(profileFields)
        .flat()
        .filter(field => field !== null && field !== undefined).length;
      
      // Total possible fields
      const totalFields = Object.values(profileFields)
        .flat().length;
      
      // Calculate percentage
      const profileCompleteness = Math.round((completedFields / totalFields) * 100);
      
      // Determine next action message - prioritized by importance
      let nextAction = 'Complete your profile';
      let nextActionDetail = '';
      
      // Priority 1: Critical demographics
      if (!healthProfile || (!healthProfile.age && !healthProfile.sex)) {
        nextAction = 'Add age and gender';
        nextActionDetail = 'Required for personalized formula';
      }
      // Priority 2: Lab reports (highly valuable)
      else if (!labReports || labReports.length === 0) {
        nextAction = 'Upload lab results';
        nextActionDetail = 'Blood tests unlock precision';
      }
      // Priority 3: Medications (safety critical)
      else if (!healthProfile.medications || !Array.isArray(healthProfile.medications) || healthProfile.medications.length === 0) {
        nextAction = 'Add medications';
        nextActionDetail = 'Prevent dangerous interactions';
      }
      // Priority 4: Conditions (personalization critical)
      else if (!healthProfile.conditions || !Array.isArray(healthProfile.conditions) || healthProfile.conditions.length === 0) {
        nextAction = 'Add health conditions';
        nextActionDetail = 'Target your specific needs';
      }
      // Priority 5: Physical measurements
      else if (!healthProfile.weightLbs || !healthProfile.heightCm) {
        nextAction = 'Add weight and height';
        nextActionDetail = 'Helps calculate optimal dosages';
      }
      // Priority 6: Vital signs
      else if (!healthProfile.bloodPressureSystolic || !healthProfile.bloodPressureDiastolic) {
        nextAction = 'Add blood pressure';
        nextActionDetail = 'Important for cardiovascular support';
      }
      else if (!healthProfile.restingHeartRate) {
        nextAction = 'Add resting heart rate';
        nextActionDetail = 'Helps assess cardiovascular health';
      }
      // Priority 7: Core lifestyle
      else if (!healthProfile.sleepHoursPerNight) {
        nextAction = 'Add sleep hours';
        nextActionDetail = 'Sleep impacts every formula decision';
      }
      else if (healthProfile.exerciseDaysPerWeek === null || healthProfile.exerciseDaysPerWeek === undefined) {
        nextAction = 'Add exercise frequency';
        nextActionDetail = 'Activity level affects needs';
      }
      // Priority 8: Additional lifestyle
      else if (!healthProfile.stressLevel) {
        nextAction = 'Add stress level';
        nextActionDetail = 'Stress impacts nutrient needs';
      }
      else if (!healthProfile.smokingStatus) {
        nextAction = 'Add smoking status';
        nextActionDetail = 'Affects antioxidant requirements';
      }
      else if (healthProfile.alcoholDrinksPerWeek === null || healthProfile.alcoholDrinksPerWeek === undefined) {
        nextAction = 'Add alcohol intake';
        nextActionDetail = 'Impacts liver and B-vitamin needs';
      }
      // Priority 9: Allergies (safety)
      else if (!healthProfile.allergies || !Array.isArray(healthProfile.allergies) || healthProfile.allergies.length === 0) {
        nextAction = 'Add allergies';
        nextActionDetail = 'Ensure ingredient safety';
      }
      // All complete!
      else {
        nextAction = 'Profile complete';
        nextActionDetail = 'All health data collected';
      }

      // Get recent activity
      const recentActivity: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        time: string;
        icon: string;
      }> = [];
      
      // Add recent orders
      recentOrders.slice(0, 3).forEach(order => {
        recentActivity.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `Order ${order.status === 'delivered' ? 'Delivered' : order.status === 'shipped' ? 'Shipped' : 'Placed'}`,
          description: `Formula v${order.formulaVersion} - ${order.status}`,
          time: order.placedAt.toISOString(),
          icon: 'Package'
        });
      });

      // Add recent consultations
      recentSessions.slice(0, 3).forEach(session => {
        recentActivity.push({
          id: `session-${session.id}`,
          type: 'consultation',
          title: 'AI Consultation',
          description: `Session ${session.status}`,
          time: session.createdAt.toISOString(),
          icon: 'MessageSquare'
        });
      });

      // Sort by time and limit
      recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // Build detailed checklist for profile completion
      const profileChecklist = [
        {
          category: 'Demographics & Physical',
          items: [
            {
              label: 'Age and gender',
              complete: !!(healthProfile?.age && healthProfile?.sex),
              route: '/dashboard/profile?tab=profile'
            },
            {
              label: 'Weight and height',
              complete: !!(healthProfile?.weightLbs && healthProfile?.heightCm),
              route: '/dashboard/profile?tab=profile'
            }
          ]
        },
        {
          category: 'Vital Signs',
          items: [
            {
              label: 'Blood pressure',
              complete: !!(healthProfile?.bloodPressureSystolic && healthProfile?.bloodPressureDiastolic),
              route: '/dashboard/profile?tab=health'
            },
            {
              label: 'Resting heart rate',
              complete: !!healthProfile?.restingHeartRate,
              route: '/dashboard/profile?tab=health'
            }
          ]
        },
        {
          category: 'Lifestyle',
          items: [
            {
              label: 'Sleep hours per night',
              complete: !!healthProfile?.sleepHoursPerNight,
              route: '/dashboard/profile?tab=health'
            },
            {
              label: 'Exercise frequency',
              complete: healthProfile?.exerciseDaysPerWeek !== null && healthProfile?.exerciseDaysPerWeek !== undefined,
              route: '/dashboard/profile?tab=health'
            },
            {
              label: 'Stress level',
              complete: !!healthProfile?.stressLevel,
              route: '/dashboard/profile?tab=health'
            },
            {
              label: 'Smoking status',
              complete: !!healthProfile?.smokingStatus,
              route: '/dashboard/profile?tab=health'
            },
            {
              label: 'Alcohol consumption',
              complete: healthProfile?.alcoholDrinksPerWeek !== null && healthProfile?.alcoholDrinksPerWeek !== undefined,
              route: '/dashboard/profile?tab=health'
            }
          ]
        },
        {
          category: 'Medical History',
          items: [
            {
              label: 'Current medications',
              complete: !!(healthProfile?.medications && Array.isArray(healthProfile.medications) && healthProfile.medications.length > 0),
              route: '/dashboard/profile?tab=health'
            },
            {
              label: 'Health conditions',
              complete: !!(healthProfile?.conditions && Array.isArray(healthProfile.conditions) && healthProfile.conditions.length > 0),
              route: '/dashboard/profile?tab=health'
            },
            {
              label: 'Allergies',
              complete: !!(healthProfile?.allergies && Array.isArray(healthProfile.allergies) && healthProfile.allergies.length > 0),
              route: '/dashboard/profile?tab=health'
            }
          ]
        },
        {
          category: 'Lab Reports',
          items: [
            {
              label: 'Blood test results',
              complete: !!(labReports && labReports.length > 0),
              route: '/dashboard/lab-reports'
            }
          ]
        }
      ];

      // Next delivery calculation
      const nextDelivery = subscription?.renewsAt || null;

      const dashboardData = {
        metrics: {
          profileCompleteness,
          completedFields,
          totalFields,
          nextAction,
          nextActionDetail,
          formulaVersion: currentFormula?.version || 0,
          consultationsSessions: totalConsultations,
          daysActive: Math.max(daysActive, 0),
          nextDelivery: nextDelivery ? nextDelivery.toISOString().split('T')[0] : null
        },
        profileChecklist,
        currentFormula,
        healthProfile,
        recentActivity: recentActivity.slice(0, 6),
        subscription,
        hasActiveFormula: !!currentFormula,
        isNewUser: !currentFormula && totalConsultations === 0
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // ============================================================================
  // WELLNESS DASHBOARD AGGREGATOR
  // Central nervous system for health tracking - combines optimize data
  // ============================================================================
  app.get('/api/dashboard/wellness', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Get user's timezone for correct day boundary
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      const today = getUserLocalMidnight(userTimezone);
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      // End of day for upper bound comparisons (23:59:59.999)
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      
      // Calculate week boundaries (Sunday-Saturday)
      const dayOfWeek = today.getDay();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      
      // 30 days ago for heatmap
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      // Fetch all data in parallel for efficiency
      const [
        workoutPlan,
        nutritionPlan,
        lifestylePlan,
        currentFormula,
        todayLog,
        weekLogs,
        monthLogs,
        workoutLogs,
        streaks,
        wearableConnections
      ] = await Promise.all([
        storage.getActiveOptimizePlan(userId, 'workout'),
        storage.getActiveOptimizePlan(userId, 'nutrition'),
        storage.getActiveOptimizePlan(userId, 'lifestyle'),
        storage.getCurrentFormulaByUser(userId),
        storage.getDailyLog(userId, today),
        storage.listDailyLogs(userId, weekStart, today),
        storage.listDailyLogs(userId, thirtyDaysAgo, today),
        storage.getAllWorkoutLogs(userId),
        Promise.all([
          storage.getUserStreak(userId, 'overall'),
          storage.getUserStreak(userId, 'workout'),
          storage.getUserStreak(userId, 'nutrition'),
          storage.getUserStreak(userId, 'lifestyle')
        ]),
        storage.getWearableConnections(userId)
      ]);

      const [overallStreak, workoutStreak, nutritionStreak, lifestyleStreak] = streaks;
      const hasOptimizeSetup = !!(workoutPlan || nutritionPlan || lifestylePlan);
      const hasWearableConnected = wearableConnections.length > 0;

      // ========== TODAY'S PLAN ==========
      const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
      
      // Find today's workout from the plan
      let todayWorkout = null;
      let hasWorkoutToday = false;
      const workoutContent = workoutPlan?.content as { weekPlan?: any[] } | undefined;
      
      if (workoutContent?.weekPlan) {
        const weekPlan = workoutContent.weekPlan;
        
        todayWorkout = weekPlan.find((day: any) => {
          // Use dayName (the actual day name like "Friday"), not day (which is just the day number)
          const dayName = day.dayName || '';
          return typeof dayName === 'string' && 
                 dayName.toLowerCase() === todayDayName.toLowerCase() && 
                 !day.isRestDay;
        });
        hasWorkoutToday = !!todayWorkout;
      }

      // Check if today's workout was logged (using user's timezone for date comparison)
      const todayDateStr = getUserLocalDateString(userTimezone);
      const todayWorkoutCompleted = workoutLogs.some(log => {
        const logDateStr = toUserLocalDateString(new Date(log.completedAt), userTimezone);
        return logDateStr === todayDateStr;
      });

      // Find today's meals from nutrition plan
      let todaysMeals: { type: string; name: string; calories?: number }[] = [];
      const nutritionContent = nutritionPlan?.content as { mealPlan?: Record<string, any[]> } | undefined;
      if (nutritionContent?.mealPlan) {
        const mealPlan = nutritionContent.mealPlan;
        const todayMeals = mealPlan[todayDayName.toLowerCase()] || mealPlan[Object.keys(mealPlan)[0]];
        if (todayMeals && Array.isArray(todayMeals)) {
          todaysMeals = todayMeals.map((meal: any) => ({
            type: meal.type || meal.mealType || 'meal',
            name: meal.name || meal.recipe || meal.description || 'Planned meal',
            calories: meal.calories
          }));
        }
      }

      // Calculate capsules per dose based on formula
      const totalCapsules = currentFormula ? Math.ceil(currentFormula.totalMg / 750) : 6; // ~750mg per capsule
      const capsulesPerDose = Math.ceil(totalCapsules / 3); // Split into 3 doses

      // Debug logging for supplement values
      console.log('🧪 Wellness API - todayLog supplement values:', {
        supplementMorning: todayLog?.supplementMorning,
        supplementAfternoon: todayLog?.supplementAfternoon,
        supplementEvening: todayLog?.supplementEvening,
        logId: todayLog?.id,
      });

      const todayPlan = {
        supplementsTaken: todayLog?.supplementsTaken || false,
        supplementMorning: todayLog?.supplementMorning || false,
        supplementAfternoon: todayLog?.supplementAfternoon || false,
        supplementEvening: todayLog?.supplementEvening || false,
        supplementDosesTaken: [
          todayLog?.supplementMorning,
          todayLog?.supplementAfternoon,
          todayLog?.supplementEvening
        ].filter(Boolean).length,
        supplementDosesTotal: 3,
        capsulesPerDose,
        totalCapsules,
        formulaName: currentFormula ? `Formula v${currentFormula.version}` : undefined,
        dosageInfo: currentFormula ? `${currentFormula.totalMg}mg daily` : undefined,
        
        hasWorkoutToday,
        workoutName: todayWorkout?.workout?.name || todayWorkout?.title,
        workoutExerciseCount: todayWorkout?.workout?.exercises?.length || 0,
        workoutDurationMinutes: todayWorkout?.workout?.durationMinutes || 45,
        workoutCompleted: todayWorkoutCompleted,
        isRestDay: todayLog?.isRestDay || false,
        
        hasMealPlan: !!nutritionPlan,
        mealsPlanned: todaysMeals.length,
        mealsLogged: (todayLog?.mealsLogged as string[]) || [],
        todaysMeals,
        
        waterIntakeOz: todayLog?.waterIntakeOz || 0,
        waterGoalOz: 100,
        
        energyLevel: todayLog?.energyLevel,
        moodLevel: todayLog?.moodLevel,
        sleepQuality: todayLog?.sleepQuality
      };

      // ========== WEEKLY PROGRESS ==========
      // Count workouts this week from workout logs (more accurate than daily logs)
      const weekWorkoutLogs = workoutLogs.filter(log => {
        const logDate = new Date(log.completedAt);
        return logDate >= weekStart && logDate <= todayEnd;
      });
      
      // Get planned workouts per week from plan
      let plannedWorkoutsPerWeek = 0;
      if (workoutContent?.weekPlan) {
        plannedWorkoutsPerWeek = workoutContent.weekPlan
          .filter((day: any) => !day.isRestDay).length;
      }
      
      // Count days with nutrition logged this week
      const nutritionDaysLogged = weekLogs.filter(log => 
        log.nutritionCompleted || (log.mealsLogged && (log.mealsLogged as string[]).length > 0)
      ).length;
      
      // Count days supplements taken this week
      const supplementDaysTaken = weekLogs.filter(log => log.supplementsTaken).length;
      
      // Days elapsed this week (1-7)
      const daysElapsedThisWeek = Math.min(dayOfWeek + 1, 7);

      const weeklyProgress = {
        workouts: {
          completed: weekWorkoutLogs.length,
          total: plannedWorkoutsPerWeek || daysElapsedThisWeek,
          percentage: plannedWorkoutsPerWeek > 0 
            ? Math.round((weekWorkoutLogs.length / plannedWorkoutsPerWeek) * 100)
            : 0
        },
        nutrition: {
          daysLogged: nutritionDaysLogged,
          totalDays: daysElapsedThisWeek,
          percentage: Math.round((nutritionDaysLogged / daysElapsedThisWeek) * 100)
        },
        supplements: {
          daysTaken: supplementDaysTaken,
          totalDays: daysElapsedThisWeek,
          percentage: Math.round((supplementDaysTaken / daysElapsedThisWeek) * 100)
        },
        overallScore: Math.round(
          ((weekWorkoutLogs.length / (plannedWorkoutsPerWeek || 1)) * 40) +
          ((nutritionDaysLogged / daysElapsedThisWeek) * 30) +
          ((supplementDaysTaken / daysElapsedThisWeek) * 30)
        )
      };

      // ========== STREAKS & HEATMAP ==========
      // Build 30-day activity map for heatmap
      const activityMap: { date: string; level: 0 | 1 | 2 | 3 | 4; activities: string[] }[] = [];
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Find log for this date
        const dayLog = monthLogs.find(log => {
          const logDate = new Date(log.logDate);
          return format(logDate, 'yyyy-MM-dd') === dateStr;
        });
        
        // Check if workout was done this day
        const hadWorkout = workoutLogs.some(log => {
          const logDate = new Date(log.completedAt);
          return format(logDate, 'yyyy-MM-dd') === dateStr;
        });
        
        const activities: string[] = [];
        if (hadWorkout) activities.push('workout');
        if (dayLog?.nutritionCompleted || (dayLog?.mealsLogged as string[])?.length > 0) activities.push('nutrition');
        if (dayLog?.supplementsTaken) activities.push('supplements');
        
        // Level: 0 = nothing, 1 = 1 activity, 2 = 2 activities, 3 = 3 activities, 4 = all + high ratings
        let level: 0 | 1 | 2 | 3 | 4 = Math.min(activities.length, 3) as 0 | 1 | 2 | 3;
        if (activities.length >= 3 && dayLog?.energyLevel && dayLog.energyLevel >= 4) {
          level = 4;
        }
        
        activityMap.push({ date: dateStr, level, activities });
      }

      const streakData = {
        overall: {
          current: overallStreak?.currentStreak || 0,
          longest: overallStreak?.longestStreak || 0,
          lastLoggedDate: overallStreak?.lastLoggedDate?.toISOString()
        },
        workout: {
          current: workoutStreak?.currentStreak || 0,
          longest: workoutStreak?.longestStreak || 0
        },
        nutrition: {
          current: nutritionStreak?.currentStreak || 0,
          longest: nutritionStreak?.longestStreak || 0
        },
        activityMap
      };

      // ========== PERSONAL RECORDS ==========
      const personalRecords: { exerciseName: string; weight: number; previousWeight?: number; date: string; isNew: boolean }[] = [];
      const prMap: Record<string, { weight: number; date: string; previousWeight?: number }> = {};
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      // Process all workout logs to find PRs
      const sortedWorkoutLogs = [...workoutLogs].sort(
        (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      );

      sortedWorkoutLogs.forEach(log => {
        const exercises = log.exercisesCompleted as any[];
        if (!exercises) return;
        
        exercises.forEach((ex: any) => {
          if (!ex.sets || !Array.isArray(ex.sets)) return;
          
          ex.sets.forEach((set: any) => {
            const weight = Number(set.weight) || 0;
            if (weight <= 0) return;
            
            if (!prMap[ex.name] || weight > prMap[ex.name].weight) {
              const previousWeight = prMap[ex.name]?.weight;
              prMap[ex.name] = {
                weight,
                date: log.completedAt.toISOString(),
                previousWeight
              };
            }
          });
        });
      });

      // Convert to array and check if new (within 7 days)
      Object.entries(prMap).forEach(([exerciseName, data]) => {
        const prDate = new Date(data.date);
        personalRecords.push({
          exerciseName,
          weight: data.weight,
          previousWeight: data.previousWeight,
          date: data.date,
          isNew: prDate >= sevenDaysAgo
        });
      });

      // Sort by most recent, then by weight
      personalRecords.sort((a, b) => {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      // ========== INSIGHTS ==========
      const insights: { id: string; type: string; icon: string; message: string; metric?: string; change?: number }[] = [];
      
      // Streak achievements
      if (overallStreak && overallStreak.currentStreak >= 7) {
        insights.push({
          id: 'streak-week',
          type: 'streak',
          icon: '🔥',
          message: `${overallStreak.currentStreak} day streak! Keep the momentum going.`,
          metric: `${overallStreak.currentStreak} days`
        });
      } else if (overallStreak && overallStreak.currentStreak >= 3) {
        insights.push({
          id: 'streak-building',
          type: 'streak',
          icon: '⚡',
          message: `${overallStreak.currentStreak} day streak building! ${7 - overallStreak.currentStreak} more days to hit a week.`,
          metric: `${overallStreak.currentStreak} days`
        });
      }

      // New PR celebration
      const newPRs = personalRecords.filter(pr => pr.isNew);
      if (newPRs.length > 0) {
        insights.push({
          id: 'new-pr',
          type: 'achievement',
          icon: '🏆',
          message: `New PR on ${newPRs[0].exerciseName}! ${newPRs[0].weight} lbs`,
          metric: `+${(newPRs[0].weight - (newPRs[0].previousWeight || 0))} lbs`
        });
      }

      // Weekly workout completion
      if (weeklyProgress.workouts.percentage >= 100) {
        insights.push({
          id: 'workouts-complete',
          type: 'achievement',
          icon: '💪',
          message: 'All planned workouts completed this week!',
          metric: `${weekWorkoutLogs.length} workouts`
        });
      } else if (weeklyProgress.workouts.percentage >= 75) {
        insights.push({
          id: 'workouts-almost',
          type: 'suggestion',
          icon: '🎯',
          message: `Almost there! ${plannedWorkoutsPerWeek - weekWorkoutLogs.length} more workout${plannedWorkoutsPerWeek - weekWorkoutLogs.length > 1 ? 's' : ''} to hit your weekly goal.`
        });
      }

      // Total workouts milestone
      if (workoutLogs.length > 0 && workoutLogs.length % 10 === 0) {
        insights.push({
          id: 'total-workouts',
          type: 'achievement',
          icon: '🎉',
          message: `${workoutLogs.length} total workouts logged! Incredible consistency.`,
          metric: `${workoutLogs.length} workouts`
        });
      } else if (workoutLogs.length > 0) {
        insights.push({
          id: 'workout-count',
          type: 'improvement',
          icon: '📈',
          message: `You've completed ${workoutLogs.length} workouts so far.`,
          metric: `${workoutLogs.length} total`
        });
      }

      // Supplement consistency
      if (weeklyProgress.supplements.percentage >= 100) {
        insights.push({
          id: 'supplements-perfect',
          type: 'achievement',
          icon: '💊',
          message: 'Perfect supplement consistency this week!'
        });
      }

      // Limit insights to avoid overwhelm
      const limitedInsights = insights.slice(0, 4);

      // ========== RESPONSE ==========
      res.json({
        today: todayPlan,
        weeklyProgress,
        streaks: streakData,
        personalRecords: personalRecords.slice(0, 10),
        insights: limitedInsights,
        hasOptimizeSetup,
        hasWearableConnected,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get wellness dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch wellness data' });
    }
  });

  // Get user's current formula
  app.get('/api/users/me/formula', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const currentFormula = await storage.getCurrentFormulaByUser(userId);
      
      if (!currentFormula) {
        return res.status(404).json({ error: 'No formula found' });
      }

      res.json(currentFormula);
    } catch (error) {
      console.error('Get current formula error:', error);
      res.status(500).json({ error: 'Failed to fetch formula' });
    }
  });

  // Get user's health profile
  app.get('/api/users/me/health-profile', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const healthProfile = await storage.getHealthProfile(userId);
      
      if (!healthProfile) {
        return res.status(404).json({ error: 'No health profile found' });
      }

      res.json(healthProfile);
    } catch (error) {
      console.error('Get health profile error:', error);
      res.status(500).json({ error: 'Failed to fetch health profile' });
    }
  });

  // Create or update health profile
  app.post('/api/users/me/health-profile', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      // Validate request body with proper Zod schema
      const healthProfileUpdate = insertHealthProfileSchema.omit({ userId: true }).parse({
        age: req.body.age,
        sex: req.body.sex,
        weightLbs: req.body.weightLbs,
        heightCm: req.body.heightCm,
        bloodPressureSystolic: req.body.bloodPressureSystolic,
        bloodPressureDiastolic: req.body.bloodPressureDiastolic,
        restingHeartRate: req.body.restingHeartRate,
        sleepHoursPerNight: req.body.sleepHoursPerNight,
        exerciseDaysPerWeek: req.body.exerciseDaysPerWeek,
        stressLevel: req.body.stressLevel,
        smokingStatus: req.body.smokingStatus,
        alcoholDrinksPerWeek: req.body.alcoholDrinksPerWeek,
        conditions: req.body.conditions,
        medications: req.body.medications,
        allergies: req.body.allergies
      });

      // Check if profile exists
      const existingProfile = await storage.getHealthProfile(userId);
      
      let healthProfile;
      if (existingProfile) {
        healthProfile = await storage.updateHealthProfile(userId, healthProfileUpdate);
      } else {
        healthProfile = await storage.createHealthProfile({
          userId,
          ...healthProfileUpdate
        });
      }

      res.json(healthProfile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid health profile data', 
          details: error.errors 
        });
      }
      console.error('Save health profile error:', error);
      res.status(500).json({ error: 'Failed to save health profile' });
    }
  });

  // Update user profile (name, email, phone, address)
  app.patch('/api/users/me/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      console.log('🔧 Profile update request body:', JSON.stringify(req.body, null, 2));
      
      // Create validation schema for profile updates
      const updateProfileSchema = z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().nullable().optional(),
        addressLine1: z.string().nullable().optional(),
        addressLine2: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
      });
      
      // Validate request body
      const validatedData = updateProfileSchema.parse(req.body);
      
      console.log('✅ Validated data:', JSON.stringify(validatedData, null, 2));
      
      // If email is being changed, check if it's already in use
      if (validatedData.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ error: 'Email already in use by another account' });
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      console.log('💾 Updated user address fields:', {
        addressLine1: updatedUser?.addressLine1,
        addressLine2: updatedUser?.addressLine2,
        city: updatedUser?.city,
        state: updatedUser?.state,
        postalCode: updatedUser?.postalCode,
        country: updatedUser?.country
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid profile data', 
          details: error.errors 
        });
      }
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Get user's orders
  app.get('/api/users/me/orders', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const orders = await storage.listOrdersByUser(userId);
      
      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Update user's timezone (for SMS reminder scheduling)
  app.patch('/api/users/me/timezone', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { timezone } = req.body;
      
      if (!timezone || typeof timezone !== 'string') {
        return res.status(400).json({ error: 'Valid timezone required' });
      }
      
      const updatedUser = await storage.updateUser(userId, { timezone });
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ timezone: updatedUser.timezone });
    } catch (error) {
      console.error('Update timezone error:', error);
      res.status(500).json({ error: 'Failed to update timezone' });
    }
  });

  // Get user's subscription
  app.get('/api/users/me/subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      res.json(subscription);
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  // Update user's subscription (pause, resume, cancel, change plan)
  app.patch('/api/users/me/subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const { status, plan, pausedUntil } = req.body;
      
      // Validate allowed updates
      const allowedUpdates: any = {};
      if (status && ['active', 'paused', 'cancelled'].includes(status)) {
        allowedUpdates.status = status;
      }
      if (plan && ['monthly', 'quarterly', 'annual'].includes(plan)) {
        allowedUpdates.plan = plan;
      }
      if (pausedUntil) {
        allowedUpdates.pausedUntil = new Date(pausedUntil);
      }
      
      const updatedSubscription = await storage.updateSubscription(userId, allowedUpdates);
      
      if (!updatedSubscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(updatedSubscription);
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  });

  // Get user's payment methods
  app.get('/api/users/me/payment-methods', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const paymentMethods = await storage.listPaymentMethodsByUser(userId);
      
      res.json(paymentMethods);
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  // Add new payment method
  app.post('/api/users/me/payment-methods', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const { stripePaymentMethodId, brand, last4 } = req.body;
      
      if (!stripePaymentMethodId || !brand || !last4) {
        return res.status(400).json({ error: 'Missing required payment method data' });
      }
      
      const paymentMethod = await storage.createPaymentMethodRef({
        userId,
        stripePaymentMethodId,
        brand,
        last4
      });
      
      res.json(paymentMethod);
    } catch (error) {
      console.error('Add payment method error:', error);
      res.status(500).json({ error: 'Failed to add payment method' });
    }
  });

  // Delete payment method
  app.delete('/api/users/me/payment-methods/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const paymentMethodId = req.params.id;
      
      // Verify the payment method belongs to the user
      const paymentMethod = await storage.getPaymentMethodRef(paymentMethodId);
      if (!paymentMethod || paymentMethod.userId !== userId) {
        return res.status(404).json({ error: 'Payment method not found' });
      }
      
      const deleted = await storage.deletePaymentMethodRef(paymentMethodId);
      
      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete payment method' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });

  // Get user's billing history
  app.get('/api/users/me/billing-history', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      // Get orders as billing history for now (can be enhanced with separate billing table later)
      const orders = await storage.listOrdersByUser(userId);
      
      // Transform orders into billing format
      const billingHistory = orders
        .filter(order => order.status === 'delivered') // Only include completed orders
        .map(order => ({
          id: order.id,
          date: order.placedAt,
          description: `Supplement Order - Formula v${order.formulaVersion}`,
          amount: 89.99, // TODO: Add actual price to Order schema
          status: 'paid',
          invoiceUrl: `/api/invoices/${order.id}` // Placeholder for future invoice generation
        }));
      
      res.json(billingHistory);
    } catch (error) {
      console.error('Get billing history error:', error);
      res.status(500).json({ error: 'Failed to fetch billing history' });
    }
  });

  // Grant user consent for HIPAA-compliant operations
  app.post('/api/consents/grant', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { consentType, consentVersion, consentText } = req.body;
      
      // Validate consent type
      const validConsentTypes = ['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing'];
      if (!validConsentTypes.includes(consentType)) {
        return res.status(400).json({ error: 'Invalid consent type' });
      }
      
      // Get audit information
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      // Create consent record
      const consent = await storage.createUserConsent({
        userId,
        consentType,
        granted: true,
        consentVersion: consentVersion || '1.0',
        ipAddress,
        userAgent,
        consentText: consentText || `User consents to ${consentType}`,
        metadata: {
          source: 'upload_form'
        }
      });
      
      console.log("HIPAA AUDIT LOG - Consent Granted:", {
        timestamp: new Date().toISOString(),
        userId,
        consentType,
        ipAddress,
        userAgent
      });
      
      res.json({ success: true, consent });
    } catch (error) {
      console.error('Consent grant error:', error);
      res.status(500).json({ error: 'Failed to grant consent' });
    }
  });

  // Get user's consents
  app.get('/api/consents', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const consents = await storage.getUserConsents(userId);
      res.json(consents);
    } catch (error) {
      console.error('Error fetching consents:', error);
      res.status(500).json({ error: 'Failed to fetch consents' });
    }
  });

  // Get user's uploaded files
  app.get('/api/files/user/:userId/:type', requireAuth, async (req, res) => {
    const { userId, type } = req.params;
    const requestingUserId = req.userId!;

    // Users can only access their own files
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const fileType = type === 'lab-reports' ? 'lab_report' : undefined;
      const files = await storage.listFileUploadsByUser(userId, fileType, false);
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  // HIPAA-compliant file upload endpoint with full audit logging and consent enforcement
  app.post('/api/files/upload', requireAuth, async (req, res) => {
    const userId = req.userId!;
    const auditInfo = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    try {
      // Check if file was uploaded
      if (!req.files || !req.files.file) {
        // Log failed upload attempt
        console.warn("HIPAA AUDIT LOG - Failed Upload Attempt:", {
          timestamp: new Date().toISOString(),
          userId,
          action: 'write',
          objectPath: 'upload-attempt',
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: 'No file uploaded'
        });
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uploadedFile = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
      
      // File validation with HIPAA audit logging
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
      const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.doc', '.docx'];

      if (uploadedFile.size > maxSizeBytes) {
        console.warn("HIPAA AUDIT LOG - File Too Large:", {
          timestamp: new Date().toISOString(),
          userId,
          action: 'write',
          objectPath: uploadedFile.name,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: `File too large: ${uploadedFile.size} bytes (max: ${maxSizeBytes})`
        });
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 10MB.' 
        });
      }

      if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
        console.warn("HIPAA AUDIT LOG - Invalid File Type:", {
          timestamp: new Date().toISOString(),
          userId,
          action: 'write',
          objectPath: uploadedFile.name,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: `Invalid MIME type: ${uploadedFile.mimetype}`
        });
        return res.status(400).json({ 
          error: 'Invalid file type. Only PDF, JPG, PNG, TXT, DOC, and DOCX files are allowed.' 
        });
      }

      const fileName = uploadedFile.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      if (!hasValidExtension) {
        console.warn("HIPAA AUDIT LOG - Invalid File Extension:", {
          timestamp: new Date().toISOString(),
          userId,
          action: 'write',
          objectPath: uploadedFile.name,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: `Invalid file extension for: ${fileName}`
        });
        return res.status(400).json({ 
          error: 'Invalid file extension. Only .pdf, .jpg, .jpeg, .png, .txt, .doc, and .docx files are allowed.' 
        });
      }

      // Determine file type category for HIPAA compliance
      let fileType: 'lab_report' | 'medical_document' | 'prescription' | 'other' = 'other';
      const labKeywords = ['lab', 'blood', 'test', 'cbc', 'panel', 'result', 'report', 'analysis', 'metabolic', 'lipid', 'thyroid', 'vitamin', 'serum', 'urine', 'specimen'];
      const fileNameLower = fileName.toLowerCase();
      
      if (labKeywords.some(keyword => fileNameLower.includes(keyword))) {
        fileType = 'lab_report';
      } else if (fileName.includes('prescription') || fileName.includes('rx')) {
        fileType = 'prescription';  
      } else if (allowedMimeTypes.slice(0, 4).includes(uploadedFile.mimetype)) {
        fileType = 'medical_document';
      }

      // Use HIPAA-compliant ObjectStorageService for secure upload
      const objectStorageService = new ObjectStorageService();
      
      // Upload directly to Supabase
      const normalizedPath = await objectStorageService.uploadLabReportFile(
        userId,
        uploadedFile.data,
        uploadedFile.name,
        uploadedFile.mimetype
      );

      // Save file metadata to storage with HIPAA compliance fields
      const fileUpload = await storage.createFileUpload({
        userId,
        type: fileType,
        objectPath: normalizedPath,
        originalFileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        hipaaCompliant: true,
        encryptedAtRest: true,
        retentionPolicyId: '7_years' // Default 7-year retention for medical records
      });

      // Analyze lab reports automatically (PDF and images only - text files analyzed in background)
      let labDataExtraction = null;
      if (fileType === 'lab_report' && (uploadedFile.mimetype === 'application/pdf' || uploadedFile.mimetype.startsWith('image/'))) {
        try {
          console.log(`✨ Analyzing lab report: ${uploadedFile.name} (${uploadedFile.mimetype})`);
          labDataExtraction = await analyzeLabReport(normalizedPath, uploadedFile.mimetype, userId);
          
          // Update file upload with extracted lab data
          if (labDataExtraction && fileUpload.id) {
            await storage.updateFileUpload(fileUpload.id, {
              labReportData: {
                testDate: labDataExtraction.testDate,
                testType: labDataExtraction.testType,
                labName: labDataExtraction.labName,
                physicianName: labDataExtraction.physicianName,
                analysisStatus: 'completed',
                extractedData: labDataExtraction.extractedData || []
              }
            });
            console.log(`Lab data extracted successfully from ${uploadedFile.name}`);
          }
        } catch (error) {
          console.error('Lab report analysis failed:', error);
          // Update status to error but don't fail the upload
          if (fileUpload.id) {
            await storage.updateFileUpload(fileUpload.id, {
              labReportData: {
                analysisStatus: 'error'
              }
            });
          }
        }
      } else if (fileType === 'lab_report' && uploadedFile.mimetype === 'text/plain') {
        // For text files, analyze in background to avoid timeout
        console.log(`📝 Queuing background analysis for text file: ${uploadedFile.name}`);
        // Fire-and-forget background analysis
        analyzeLabReport(normalizedPath, uploadedFile.mimetype, userId)
          .then(async (extraction) => {
            if (extraction && fileUpload.id) {
              await storage.updateFileUpload(fileUpload.id, {
                labReportData: {
                  testDate: extraction.testDate,
                  testType: extraction.testType,
                  labName: extraction.labName,
                  physicianName: extraction.physicianName,
                  analysisStatus: 'completed',
                  extractedData: extraction.extractedData || []
                }
              });
              console.log(`✅ Background analysis completed for ${uploadedFile.name}`);
            }
          })
          .catch(async (error) => {
            console.error('Background lab report analysis failed:', error);
            if (fileUpload.id) {
              await storage.updateFileUpload(fileUpload.id, {
                labReportData: {
                  analysisStatus: 'error'
                }
              });
            }
          });
      }

      // Log successful upload
      console.log("HIPAA AUDIT LOG - Successful Upload:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'write',
        objectPath: normalizedPath,
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: true,
        reason: `Successfully uploaded ${fileType}: ${uploadedFile.name}`
      });

      // Return file metadata with lab data if extracted
      const responseData = {
        id: fileUpload.id,
        name: uploadedFile.name,
        url: normalizedPath,
        type: fileUpload.type,
        size: uploadedFile.size,
        uploadedAt: fileUpload.uploadedAt,
        hipaaCompliant: true,
        labData: labDataExtraction
      };

      res.json(responseData);
      
    } catch (error) {
      // Log failed upload with full error details
      console.error("HIPAA AUDIT LOG - Upload Error:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'write',
        objectPath: 'upload-error',
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: false,
        reason: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof Error && error.name === 'ConsentRequiredError') {
        return res.status(403).json({ 
          error: 'User consent required for file upload',
          details: error.message
        });
      }
      
      console.error('File upload error:', error);
      res.status(500).json({ 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Re-trigger analysis on existing lab report
  app.post('/api/files/:fileId/reanalyze', requireAuth, async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.userId!;
      
      // Get the file upload record
      const fileUpload = await storage.getFileUpload(fileId);
      
      if (!fileUpload) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (fileUpload.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      if (fileUpload.type !== 'lab_report') {
        return res.status(400).json({ error: 'Only lab reports can be re-analyzed' });
      }
      
      console.log('🔄 Re-analyzing lab report:', fileId, fileUpload.originalFileName);
      
      // Trigger analysis
      const labData = await analyzeLabReport(
        fileUpload.objectPath,
        fileUpload.mimeType || 'text/plain',
        userId
      );
      
      // Update the file upload with analyzed data
      await storage.updateFileUpload(fileId, {
        labReportData: {
          ...labData,
          analysisStatus: 'completed'
        }
      });
      
      console.log('✅ Re-analysis complete for:', fileId);
      
      res.json({ 
        success: true,
        message: 'Lab report re-analyzed successfully',
        data: labData
      });
    } catch (error) {
      console.error('Re-analysis error:', error);
      res.status(500).json({ 
        error: 'Failed to re-analyze lab report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete lab report with audit logging
  app.delete('/api/files/:fileId', requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { fileId } = req.params;
    try {
      // Verify file belongs to user
      const fileUpload = await storage.getFileUpload(fileId);
      if (!fileUpload) {
        return res.status(404).json({ error: 'File not found' });
      }
      if (fileUpload.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Hard delete from Supabase storage
      const objectPath = fileUpload.objectPath;
      const deletedFromStorage = await ObjectStorageService.prototype.secureDeleteLabReport(objectPath, userId);
      // Soft delete in DB
      const deleted = await storage.softDeleteFileUpload(fileId, userId);
      if (!deleted || !deletedFromStorage) {
        throw new Error('Failed to delete file');
      }
      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('File delete error:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // ==================== FORMULA MANAGEMENT ENDPOINTS ====================

  // Get current active formula for user
  app.get('/api/users/me/formula/current', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const currentFormula = await storage.getCurrentFormulaByUser(userId);
      
      if (!currentFormula) {
        return res.status(404).json({ error: 'No formula found for user' });
      }

      // Get the latest version changes for context (non-fatal)
      let versionChanges: any[] = [];
      try {
        versionChanges = await storage.listFormulaVersionChanges(currentFormula.id);
      } catch (e) {
        console.warn('Non-fatal: unable to load version changes for formula', currentFormula.id, e);
      }

      res.json({
        formula: currentFormula,
        versionChanges: versionChanges.slice(0, 1) // Latest change only
      });
    } catch (error) {
      console.error('Error fetching current formula:', error);
      res.status(500).json({ error: 'Failed to fetch current formula' });
    }
  });

  // Get formula version history for user
  app.get('/api/users/me/formula/history', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const formulaHistory = await storage.getFormulaHistory(userId);
      
      // Enrich with version change information
      const enrichedHistory = await Promise.all(
        formulaHistory.map(async (formula) => {
          const changes = await storage.listFormulaVersionChanges(formula.id);
          return {
            ...formula,
            changes: changes[0] || null // Latest change for this version
          };
        })
      );
      
      res.json({ history: enrichedHistory });
    } catch (error) {
      console.error('Error fetching formula history:', error);
      res.status(500).json({ error: 'Failed to fetch formula history' });
    }
  });

  // Get specific formula version by ID
  app.get('/api/users/me/formula/versions/:formulaId', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const formulaId = req.params.formulaId;
      
      const formula = await storage.getFormula(formulaId);
      
      if (!formula || formula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found or access denied' });
      }

      // Get version changes for this formula
      const versionChanges = await storage.listFormulaVersionChanges(formulaId);
      
      res.json({
        formula,
        versionChanges
      });
    } catch (error) {
      console.error('Error fetching formula version:', error);
      res.status(500).json({ error: 'Failed to fetch formula version' });
    }
  });

  // Public endpoint - Get shared formula by ID (no auth required)
  app.get('/api/formulas/shared/:formulaId', async (req, res) => {
    try {
      const formulaId = req.params.formulaId;
      
      const formula = await storage.getFormula(formulaId);
      
      if (!formula) {
        return res.status(404).json({ error: 'Formula not found' });
      }

      // Get user info (non-sensitive fields only)
      const user = await storage.getUser(formula.userId);
      
      // Return formula with minimal user info
      res.json({
        formula: {
          id: formula.id,
          version: formula.version,
          name: formula.name,
          createdAt: formula.createdAt,
          totalMg: formula.totalMg,
          bases: formula.bases,
          additions: formula.additions,
          userCustomizations: formula.userCustomizations,
          warnings: formula.warnings,
          userCreated: formula.userCreated,
        },
        user: {
          name: user?.name || 'ONES User',
          // Don't expose email or other sensitive info
        }
      });
    } catch (error) {
      console.error('Error fetching shared formula:', error);
      res.status(500).json({ error: 'Failed to fetch formula' });
    }
  });

  // Revert to previous formula version
  app.post('/api/users/me/formula/revert', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId;
      const { formulaId, reason } = req.body;
      
      if (!formulaId || !reason) {
        return res.status(400).json({ error: 'Formula ID and revert reason are required' });
      }

      // Get the formula to revert to
      const originalFormula = await storage.getFormula(formulaId);
      
      if (!originalFormula || originalFormula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found or access denied' });
      }

      // Validate that reverting to this formula doesn't exceed maximum dosage
      if (originalFormula.totalMg > FORMULA_LIMITS.MAX_TOTAL_DOSAGE) {
        return res.status(400).json({ 
          error: `Cannot revert to this formula as it exceeds the maximum safe dosage of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg (this version has ${originalFormula.totalMg}mg). This formula was created before dosage limits were enforced. Please create a new formula instead.` 
        });
      }

      // Get current highest version for user
      const currentFormula = await storage.getCurrentFormulaByUser(userId);
      const nextVersion = currentFormula ? currentFormula.version + 1 : 1;

      // Create new formula version with reverted data
      const revertedFormula = await storage.createFormula({
        userId,
        version: nextVersion,
        bases: originalFormula.bases as any,
        additions: originalFormula.additions as any,
        totalMg: originalFormula.totalMg,
        notes: `Reverted to v${originalFormula.version}: ${reason}`
      });

      // Create version change record
      await storage.createFormulaVersionChange({
        formulaId: revertedFormula.id,
        summary: `Reverted to version ${originalFormula.version}`,
        rationale: reason
      });

      // 📬 Create notification for formula reversion
      try {
        await storage.createNotification({
          userId,
          type: 'formula_update',
          title: `Formula Reverted to V${originalFormula.version}`,
          content: `Your formula has been reverted. Reason: ${reason}`,
          formulaId: revertedFormula.id,
          metadata: { 
            actionUrl: '/dashboard/my-formula', 
            icon: 'beaker', 
            priority: 'low' 
          }
        });
      } catch (notifError) {
        console.error('Failed to create reversion notification:', notifError);
      }

      res.json({ 
        success: true, 
        formula: revertedFormula,
        message: `Successfully reverted to version ${originalFormula.version}`
      });
    } catch (error) {
      console.error('Error reverting formula:', error);
      res.status(500).json({ error: 'Failed to revert formula' });
    }
  });

  // Add user customizations to a formula
  app.patch('/api/users/me/formula/:formulaId/customize', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId;
      const { formulaId } = req.params;
      const { addedBases, addedIndividuals } = req.body;

      // Validate that all added ingredients are valid
      const allAdded = [...(addedBases || []), ...(addedIndividuals || [])];
      for (const item of allAdded) {
        if (!isValidIngredient(item.ingredient)) {
          return res.status(400).json({ 
            error: `Invalid ingredient: ${item.ingredient}. Only catalog ingredients are allowed.` 
          });
        }
      }

      // Get the formula
      const formula = await storage.getFormula(formulaId);
      
      if (!formula || formula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found or access denied' });
      }

      // Calculate new total mg with customizations
      let newTotalMg = formula.totalMg;
      
      if (addedBases) {
        for (const base of addedBases) {
          const dose = getIngredientDose(base.ingredient);
          if (dose) {
            newTotalMg += dose;
          }
        }
      }
      
      if (addedIndividuals) {
        for (const individual of addedIndividuals) {
          const dose = getIngredientDose(individual.ingredient);
          if (dose) {
            newTotalMg += dose;
          }
        }
      }

      // Validate that new total doesn't exceed maximum
      if (newTotalMg > FORMULA_LIMITS.MAX_TOTAL_DOSAGE) {
        const addedMg = newTotalMg - formula.totalMg;
        return res.status(400).json({ 
          error: `Adding these ingredients would exceed the maximum safe dosage of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg. Current formula: ${formula.totalMg}mg, Adding: ${addedMg}mg, New total would be: ${newTotalMg}mg. Please remove some ingredients first or add fewer ingredients.` 
        });
      }

      // Update formula with customizations
      const updatedFormula = await storage.updateFormulaCustomizations(
        formulaId,
        { addedBases, addedIndividuals },
        newTotalMg
      );

      res.json({ 
        success: true,
        formula: updatedFormula,
        message: 'Formula customized successfully'
      });
    } catch (error) {
      console.error('Error customizing formula:', error);
      res.status(500).json({ error: 'Failed to customize formula' });
    }
  });

  // Create custom formula from scratch
  app.post('/api/users/me/formula/custom', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId;
      const { name, bases, individuals } = req.body;

      // Validate that at least one ingredient is provided
      if ((!bases || bases.length === 0) && (!individuals || individuals.length === 0)) {
        return res.status(400).json({ 
          error: 'At least one ingredient is required to create a formula' 
        });
      }

      // Validate that all ingredients are valid catalog ingredients
      const allIngredients = [...(bases || []), ...(individuals || [])];
      for (const item of allIngredients) {
        if (!isValidIngredient(item.ingredient)) {
          return res.status(400).json({ 
            error: `Invalid ingredient: ${item.ingredient}. Only catalog ingredients are allowed.` 
          });
        }
      }

      // Calculate total mg
      let totalMg = 0;
      
      if (bases) {
        for (const base of bases) {
          const dose = getIngredientDose(base.ingredient);
          if (dose) {
            totalMg += dose;
          }
        }
      }
      
      if (individuals) {
        for (const individual of individuals) {
          const dose = getIngredientDose(individual.ingredient);
          if (dose) {
            totalMg += dose;
          }
        }
      }

      // Validate dosage limits
      if (totalMg > FORMULA_LIMITS.MAX_TOTAL_DOSAGE) {
        return res.status(400).json({ 
          error: `Total dosage of ${totalMg}mg exceeds the maximum safe limit of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg. Please remove some ingredients.` 
        });
      }

      if (totalMg < 100) {
        return res.status(400).json({ 
          error: `Total dosage of ${totalMg}mg is too low. Please add more ingredients (minimum 100mg recommended).` 
        });
      }

      // Get user's current formula count to determine version number
      const history = await storage.getFormulaHistory(userId);
      const nextVersion = (history?.length || 0) + 1;

      // Create new formula marked as user-created
      const newFormula = await storage.createFormula({
        userId,
        version: nextVersion,
        name: name?.trim() || undefined,
        userCreated: true,
        bases: bases || [],
        additions: individuals || [],
        userCustomizations: {},
        totalMg,
        rationale: 'Custom formula built by user',
        warnings: [],
        disclaimers: [
          'This formula was built manually without AI analysis.',
          'Consider discussing with AI for optimization and safety review.',
          'Always consult your healthcare provider before starting any new supplement regimen.'
        ],
        notes: null
      });

      // 📬 Create notification for user-built formula
      try {
        await storage.createNotification({
          userId,
          type: 'formula_update',
          title: `Custom Formula V${nextVersion} Created`,
          content: `You've built a custom formula with ${totalMg}mg of ingredients. Consider having AI review it for optimization.`,
          formulaId: newFormula.id,
          metadata: { 
            actionUrl: '/dashboard/my-formula', 
            icon: 'beaker', 
            priority: 'medium' 
          }
        });
      } catch (notifError) {
        console.error('Failed to create formula notification:', notifError);
      }

      // Invalidate queries to refresh UI
      res.json({ 
        success: true,
        formula: newFormula,
        message: 'Custom formula created successfully'
      });
    } catch (error) {
      console.error('Error creating custom formula:', error);
      res.status(500).json({ error: 'Failed to create custom formula' });
    }
  });

  // Rename a formula
  app.patch('/api/users/me/formula/:formulaId/rename', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId;
      const { formulaId } = req.params;
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Valid name is required' });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({ error: 'Name must be 100 characters or less' });
      }

      // Get the formula to verify ownership
      const formula = await storage.getFormula(formulaId);
      
      if (!formula || formula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found or access denied' });
      }

      // Update the formula name
      const updatedFormula = await storage.updateFormulaName(formulaId, name.trim());

      res.json({ 
        success: true,
        formula: updatedFormula,
        message: 'Formula renamed successfully'
      });
    } catch (error) {
      console.error('Error renaming formula:', error);
      res.status(500).json({ error: 'Failed to rename formula' });
    }
  });

  // Get ingredient catalog for customization UI
  app.get('/api/ingredients/catalog', requireAuth, async (req: any, res: any) => {
    try {
      res.json({
        systemSupports: SYSTEM_SUPPORTS,
        individualIngredients: INDIVIDUAL_INGREDIENTS
      });
    } catch (error) {
      console.error('Error fetching ingredient catalog:', error);
      res.status(500).json({ error: 'Failed to fetch ingredient catalog' });
    }
  });

  // Get detailed system support breakdowns (ingredient compositions)
  app.get('/api/ingredients/base-details', requireAuth, async (req: any, res: any) => {
    try {
      res.json({
        systemSupportDetails: SYSTEM_SUPPORT_DETAILS
      });
    } catch (error) {
      console.error('Error fetching system support details:', error);
      res.status(500).json({ error: 'Failed to fetch system support details' });
    }
  });

  // Compare two formula versions
  app.get('/api/users/me/formula/compare/:id1/:id2', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId;
      const { id1, id2 } = req.params;
      
      const [formula1, formula2] = await Promise.all([
        storage.getFormula(id1),
        storage.getFormula(id2)
      ]);

      if (!formula1 || !formula2) {
        return res.status(404).json({ error: 'One or both formulas not found' });
      }

      if (formula1.userId !== userId || formula2.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Calculate differences
      const comparison = {
        formula1,
        formula2,
        differences: {
          totalMgChange: formula2.totalMg - formula1.totalMg,
          basesAdded: formula2.bases.filter(b2 => 
            !formula1.bases.some(b1 => b1.ingredient === b2.ingredient)
          ),
          basesRemoved: formula1.bases.filter(b1 => 
            !formula2.bases.some(b2 => b2.ingredient === b1.ingredient)
          ),
          basesModified: formula2.bases.filter(b2 => {
            const b1 = formula1.bases.find(b => b.ingredient === b2.ingredient);
            return b1 && b1.amount !== b2.amount;
          }),
          additionsAdded: (formula2.additions || []).filter(a2 => 
            !(formula1.additions || []).some(a1 => a1.ingredient === a2.ingredient)
          ),
          additionsRemoved: (formula1.additions || []).filter(a1 => 
            !(formula2.additions || []).some(a2 => a2.ingredient === a1.ingredient)
          ),
          additionsModified: (formula2.additions || []).filter(a2 => {
            const a1 = (formula1.additions || []).find(a => a.ingredient === a2.ingredient);
            return a1 && a1.amount !== a2.amount;
          })
        }
      };

      res.json(comparison);
    } catch (error) {
      console.error('Error comparing formulas:', error);
      res.status(500).json({ error: 'Failed to compare formulas' });
    }
  });

  // Get ingredient detailed information
  app.get('/api/ingredients/:ingredientName', requireAuth, async (req: any, res: any) => {
    try {
      const ingredientName = req.params.ingredientName;
      
      // Add no-cache headers to ensure fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Use unified lookup function to pull from INDIVIDUAL_INGREDIENTS and SYSTEM_SUPPORT_DETAILS
      const comprehensiveInfo = getComprehensiveIngredientInfo(ingredientName);
      
      const ingredientInfo = {
        name: ingredientName,
        dosage: comprehensiveInfo.standardDose || CANONICAL_DOSES_MG[ingredientName as keyof typeof CANONICAL_DOSES_MG] || 0,
        benefits: comprehensiveInfo.benefits,
        interactions: comprehensiveInfo.interactions,
        category: comprehensiveInfo.category,
        type: comprehensiveInfo.type,
        suggestedUse: comprehensiveInfo.suggestedUse,
        doseRange: comprehensiveInfo.doseRange,
        dailyValuePercentage: comprehensiveInfo.dailyValuePercentage,
        sources: comprehensiveInfo.sources,
        qualityIndicators: comprehensiveInfo.qualityIndicators,
        alternatives: comprehensiveInfo.alternatives,
        researchBacking: comprehensiveInfo.researchBacking
      };

      console.log(`🔍 INGREDIENT API: ${ingredientName} -> benefits:`, ingredientInfo.benefits);
      res.json(ingredientInfo);
    } catch (error) {
      console.error('Error fetching ingredient information:', error);
      res.status(500).json({ error: 'Failed to fetch ingredient information' });
    }
  });

  // Get research citations for a specific ingredient - uses pre-built research data
  app.get('/api/ingredients/:ingredientName/research', requireAuth, async (req: any, res: any) => {
    try {
      const ingredientName = req.params.ingredientName;
      
      // Import pre-built research data
      const { getIngredientResearch } = await import('@shared/ingredient-research');
      const research = getIngredientResearch(ingredientName);
      
      // Add no-cache headers to ensure fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      if (research) {
        // Convert pre-built research to citation format
        const citations = research.studies.map((study, index) => ({
          id: `${ingredientName}-${index}`,
          ingredientName,
          citationTitle: study.title,
          journal: study.journal,
          publicationYear: study.year,
          authors: study.authors,
          findings: study.findings,
          sampleSize: study.sampleSize || null,
          pubmedUrl: study.pubmedUrl || null,
          evidenceLevel: study.evidenceLevel,
          studyType: study.studyType,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        res.json({
          ingredientName,
          summary: research.summary,
          keyBenefits: research.keyBenefits,
          safetyProfile: research.safetyProfile,
          recommendedFor: research.recommendedFor,
          citations,
          totalCitations: citations.length
        });
      } else {
        // Fallback to database if no pre-built research
        const dbCitations = await storage.getResearchCitationsForIngredient(ingredientName);
        res.json({
          ingredientName,
          summary: null,
          keyBenefits: [],
          safetyProfile: null,
          recommendedFor: [],
          citations: dbCitations,
          totalCitations: dbCitations.length
        });
      }
    } catch (error) {
      console.error('Error fetching research citations:', error);
      res.status(500).json({ error: 'Failed to fetch research citations' });
    }
  });

  // Unified ingredient lookup function - sources from INDIVIDUAL_INGREDIENTS and SYSTEM_SUPPORT_DETAILS
  // Uses shared normalizeIngredientName and findIngredientByName from @shared/ingredients
  function getComprehensiveIngredientInfo(ingredientName: string): {
    benefits: string[];
    category: string;
    type?: string;
    suggestedUse?: string;
    doseRange?: { min: number; max: number };
    standardDose?: number;
    interactions: string[];
    dailyValuePercentage: number | null;
    sources: string[];
    qualityIndicators: string[];
    alternatives: string[];
    researchBacking: { studyCount: number; evidenceLevel: string };
  } {
    // IMPORTANT: Normalize name once and use canonical name throughout for consistent metadata lookup
    const canonicalName = normalizeIngredientName(ingredientName);
    
    // 1. First check INDIVIDUAL_INGREDIENTS catalog using shared helper
    const individualIngredient = findIngredientByName(ingredientName);

    if (individualIngredient) {
      return {
        benefits: individualIngredient.benefits || ['Supports overall health and wellness'],
        category: individualIngredient.type || 'Dietary Supplement',
        type: individualIngredient.type,
        suggestedUse: individualIngredient.suggestedUse,
        doseRange: individualIngredient.doseRangeMin && individualIngredient.doseRangeMax ? {
          min: individualIngredient.doseRangeMin,
          max: individualIngredient.doseRangeMax
        } : undefined,
        standardDose: individualIngredient.doseMg,
        interactions: getInteractionsForIngredient(canonicalName),
        dailyValuePercentage: getDailyValuePercentageForIngredient(canonicalName),
        sources: getSourcesForIngredient(canonicalName),
        qualityIndicators: getQualityIndicatorsForIngredient(),
        alternatives: getAlternativesForIngredient(canonicalName),
        researchBacking: getResearchBackingForIngredient(canonicalName)
      };
    }

    // 2. Check if it's an active ingredient in a system support (use canonical name)
    for (const formula of SYSTEM_SUPPORT_DETAILS) {
      const activeIngredient = formula.activeIngredients?.find(
        ai => ai.name.toLowerCase() === canonicalName.toLowerCase()
      );
      
      if (activeIngredient) {
        return {
          benefits: activeIngredient.benefits || ['Supports overall health and wellness'],
          category: 'Active Ingredient in ' + formula.name,
          type: formula.systemSupported,
          suggestedUse: `Part of ${formula.name} - ${formula.description}`,
          interactions: getInteractionsForIngredient(canonicalName),
          dailyValuePercentage: getDailyValuePercentageForIngredient(canonicalName),
          sources: getSourcesForIngredient(canonicalName),
          qualityIndicators: getQualityIndicatorsForIngredient(),
          alternatives: getAlternativesForIngredient(canonicalName),
          researchBacking: getResearchBackingForIngredient(canonicalName)
        };
      }
    }

    // 3. Check if it's a system support itself (use canonical name)
    const baseFormula = SYSTEM_SUPPORTS.find(
      ing => ing.name.toLowerCase() === canonicalName.toLowerCase()
    );

    if (baseFormula) {
      const formulaDetails = SYSTEM_SUPPORT_DETAILS.find(
        f => f.name.toLowerCase() === canonicalName.toLowerCase()
      );
      
      // Build comprehensive benefits list from description and active ingredients
      const benefits: string[] = [];
      if (formulaDetails?.description) {
        benefits.push(formulaDetails.description);
      }
      // Add unique benefits from active ingredients
      if (formulaDetails?.activeIngredients) {
        const ingredientBenefits = formulaDetails.activeIngredients
          .flatMap(ai => ai.benefits || [])
          .filter((benefit, index, self) => self.indexOf(benefit) === index) // Remove duplicates
          .slice(0, 6); // Limit to 6 additional benefits
        benefits.push(...ingredientBenefits);
      }
      if (benefits.length === 0) {
        benefits.push('Comprehensive system support');
      }
      
      return {
        benefits,
        category: 'system support',
        type: formulaDetails?.systemSupported || 'Multi-System Support',
        suggestedUse: formulaDetails?.suggestedDosage || '1x daily',
        standardDose: baseFormula.doseMg,
        interactions: getInteractionsForIngredient(canonicalName),
        dailyValuePercentage: null,
        sources: ['Proprietary blend of active ingredients'],
        qualityIndicators: getQualityIndicatorsForIngredient(),
        alternatives: getAlternativesForIngredient(canonicalName),
        researchBacking: getResearchBackingForIngredient(canonicalName)
      };
    }

    // 4. Fallback for unknown ingredients
    return {
      benefits: ['Supports overall health and wellness'],
      category: 'Dietary Supplement',
      interactions: [],
      dailyValuePercentage: null,
      sources: ['Natural sources'],
      qualityIndicators: getQualityIndicatorsForIngredient(),
      alternatives: [],
      researchBacking: { studyCount: 0, evidenceLevel: 'Limited' }
    };
  }

  // Helper functions with pragmatic fallbacks
  function getInteractionsForIngredient(ingredient: string): string[] {
    const knownInteractions: Record<string, string[]> = {
      'Vitamin D3': ['May enhance calcium absorption - monitor calcium levels'],
      'Magnesium': ['May reduce absorption of some antibiotics - take separately'],
      'Iron': ['May reduce absorption with calcium - take separately'],
      'Omega-3': ['May enhance blood-thinning effects of warfarin'],
      'CoEnzyme Q10': ['May interact with blood pressure medications - consult healthcare provider'],
      'Hawthorn Berry': ['May interact with heart medications - consult healthcare provider']
    };
    
    return knownInteractions[ingredient] || [];
  }

  function getDailyValuePercentageForIngredient(ingredient: string): number | null {
    const dvValues: Record<string, number> = {
      'Vitamin D3': 500,
      'Vitamin C': 278,
      'Magnesium': 48,
      'Zinc': 136
    };
    
    return dvValues[ingredient] || null;
  }

  function getSourcesForIngredient(ingredient: string): string[] {
    const sources: Record<string, string[]> = {
      'Vitamin D3': ['Lichen extract', 'Lanolin (sheep wool)'],
      'Magnesium': ['Magnesium glycinate', 'Magnesium citrate'],
      'CoEnzyme Q10': ['Fermented yeast', 'Natural synthesis'],
      'Hawthorn Berry': ['Hawthorn fruit and leaf extract']
    };
    
    return sources[ingredient] || ['Premium natural sources'];
  }

  function getQualityIndicatorsForIngredient(): string[] {
    return [
      'Third-party tested',
      'USP verified',
      'Non-GMO',
      'Heavy metals tested'
    ];
  }

  function getAlternativesForIngredient(ingredient: string): string[] {
    const alternatives: Record<string, string[]> = {
      'Vitamin D3': ['Vitamin D2', 'Sunlight exposure'],
      'Magnesium': ['Magnesium oxide', 'Magnesium malate']
    };
    
    return alternatives[ingredient] || [];
  }

  function getResearchBackingForIngredient(ingredient: string): { studyCount: number; evidenceLevel: string } {
    // This would query a research database in production
    // For now, return reasonable defaults
    return {
      studyCount: Math.floor(Math.random() * 50) + 30,
      evidenceLevel: 'Moderate to Strong'
    };
  }

  // Remove duplicate function - already defined above

  // Helper function to send email and SMS notifications based on user preferences
  async function sendNotificationsForUser(notification: Notification, user: User): Promise<void> {
    try {
      // Get user's notification preferences
      const prefs = await storage.getNotificationPrefs(user.id);
      
      // Determine if we should send email/SMS based on notification type and user preferences
      let shouldSendEmail = false;
      let shouldSendSms = false;
      
      if (prefs) {
        switch (notification.type) {
          case 'order_update':
            shouldSendEmail = prefs.emailShipping;
            shouldSendSms = prefs.smsShipping;
            break;
          case 'formula_update':
            shouldSendEmail = prefs.emailConsultation; // Treat formula updates as consultation-related
            shouldSendSms = prefs.smsConsultation;
            break;
          case 'consultation_reminder':
            shouldSendEmail = prefs.emailConsultation;
            shouldSendSms = prefs.smsConsultation;
            break;
          case 'system':
            shouldSendEmail = prefs.emailBilling; // System notifications use billing preference
            shouldSendSms = prefs.smsBilling;
            break;
        }
      } else {
        // Default to email only if no preferences set (opt-in by default for email, opt-out for SMS)
        shouldSendEmail = true;
        shouldSendSms = false;
      }
      
      // Build the full action URL if provided
      let actionUrl = notification.metadata?.actionUrl;
      if (actionUrl) {
        const baseUrl = process.env.APP_URL || 'https://my-ones.vercel.app';
        if (!actionUrl.startsWith('http')) {
          actionUrl = `${baseUrl}${actionUrl}`;
        }
      }
      
      // Send email if enabled
      if (shouldSendEmail) {
        await sendNotificationEmail({
          to: user.email,
          subject: notification.title,
          title: notification.title,
          content: notification.content,
          actionUrl,
          actionText: actionUrl ? 'View Details' : undefined,
          type: notification.type
        });
      } else {
        console.log(`📧 Email skipped for user ${user.email} - notification type ${notification.type} disabled in preferences`);
      }
      
      // Send SMS if enabled and user has a phone number
      if (shouldSendSms && user.phone) {
        const smsMessage = actionUrl 
          ? `${notification.content} ${actionUrl}`
          : notification.content;
          
        await sendNotificationSms({
          to: user.phone,
          message: smsMessage,
          type: notification.type
        });
      } else if (shouldSendSms && !user.phone) {
        console.log(`📱 SMS skipped for user ${user.email} - no phone number on file`);
      } else {
        console.log(`📱 SMS skipped for user ${user.email} - notification type ${notification.type} disabled in preferences`);
      }
    } catch (error) {
      console.error('❌ Error sending notifications:', error);
      // Don't throw - we don't want notification failures to break notification creation
    }
  }

  // Notification API routes
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 10;
      const notifications = await storage.listNotificationsByUser(userId, limit);
      res.json({ notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      res.status(500).json({ error: 'Failed to get unread notification count' });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const notificationId = req.params.id;
      
      const notification = await storage.markNotificationAsRead(notificationId, userId);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json({ notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.patch('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const success = await storage.markAllNotificationsAsRead(userId);
      
      if (!success) {
        return res.status(500).json({ error: 'Failed to mark all notifications as read' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Notification Preferences API routes
  app.get('/api/notification-prefs', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      let prefs = await storage.getNotificationPrefs(userId);
      
      // Create default preferences if they don't exist
      if (!prefs) {
        prefs = await storage.createNotificationPrefs({
          userId,
          emailConsultation: true,
          emailShipping: true,
          emailBilling: true,
          smsConsultation: false,
          smsShipping: false,
          smsBilling: false,
        });
      }
      
      res.json(prefs);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
  });

  app.put('/api/notification-prefs', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { 
        emailConsultation, 
        emailShipping, 
        emailBilling, 
        smsConsultation, 
        smsShipping, 
        smsBilling,
        dailyRemindersEnabled,
        reminderBreakfast,
        reminderLunch,
        reminderDinner,
        // Time slot preferences
        reminderMorning,
        reminderAfternoon,
        reminderEvening,
        pillsTimeSlot,
        workoutTimeSlot,
        nutritionTimeSlot,
        lifestyleTimeSlot,
        pillsCustomTime,
        workoutCustomTime,
        nutritionCustomTime,
        lifestyleCustomTime,
      } = req.body;
      
      // Validate boolean input
      if (
        typeof emailConsultation !== 'boolean' || 
        typeof emailShipping !== 'boolean' || 
        typeof emailBilling !== 'boolean' ||
        typeof smsConsultation !== 'boolean' || 
        typeof smsShipping !== 'boolean' || 
        typeof smsBilling !== 'boolean'
      ) {
        return res.status(400).json({ error: 'Invalid preference values' });
      }
      
      // Validate daily reminder fields if provided
      if (dailyRemindersEnabled !== undefined && typeof dailyRemindersEnabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid dailyRemindersEnabled value' });
      }
      
      // Validate time slot values
      const validTimeSlots = ['morning', 'afternoon', 'evening', 'custom', 'off', 'all'];
      if (pillsTimeSlot && !validTimeSlots.includes(pillsTimeSlot)) {
        return res.status(400).json({ error: 'Invalid pillsTimeSlot value' });
      }
      if (workoutTimeSlot && !validTimeSlots.includes(workoutTimeSlot)) {
        return res.status(400).json({ error: 'Invalid workoutTimeSlot value' });
      }
      if (nutritionTimeSlot && !validTimeSlots.includes(nutritionTimeSlot)) {
        return res.status(400).json({ error: 'Invalid nutritionTimeSlot value' });
      }
      if (lifestyleTimeSlot && !validTimeSlots.includes(lifestyleTimeSlot)) {
        return res.status(400).json({ error: 'Invalid lifestyleTimeSlot value' });
      }
      
      let prefs = await storage.getNotificationPrefs(userId);
      
      if (!prefs) {
        // Create if doesn't exist
        prefs = await storage.createNotificationPrefs({
          userId,
          emailConsultation,
          emailShipping,
          emailBilling,
          smsConsultation,
          smsShipping,
          smsBilling,
          dailyRemindersEnabled: dailyRemindersEnabled ?? false,
          reminderBreakfast: reminderMorning ?? reminderBreakfast ?? '08:00',
          reminderLunch: reminderAfternoon ?? reminderLunch ?? '12:00',
          reminderDinner: reminderEvening ?? reminderDinner ?? '18:00',
          pillsTimeSlot: pillsTimeSlot ?? 'all',
          workoutTimeSlot: workoutTimeSlot ?? 'morning',
          nutritionTimeSlot: nutritionTimeSlot ?? 'morning',
          lifestyleTimeSlot: lifestyleTimeSlot ?? 'evening',
          pillsCustomTime: pillsCustomTime ?? null,
          workoutCustomTime: workoutCustomTime ?? null,
          nutritionCustomTime: nutritionCustomTime ?? null,
          lifestyleCustomTime: lifestyleCustomTime ?? null,
        });
      } else {
        // Update existing
        prefs = await storage.updateNotificationPrefs(userId, {
          emailConsultation,
          emailShipping,
          emailBilling,
          smsConsultation,
          smsShipping,
          smsBilling,
          dailyRemindersEnabled: dailyRemindersEnabled ?? prefs.dailyRemindersEnabled,
          reminderBreakfast: reminderMorning ?? reminderBreakfast ?? prefs.reminderBreakfast,
          reminderLunch: reminderAfternoon ?? reminderLunch ?? prefs.reminderLunch,
          reminderDinner: reminderEvening ?? reminderDinner ?? prefs.reminderDinner,
          pillsTimeSlot: pillsTimeSlot ?? (prefs as any).pillsTimeSlot ?? 'all',
          workoutTimeSlot: workoutTimeSlot ?? (prefs as any).workoutTimeSlot ?? 'morning',
          nutritionTimeSlot: nutritionTimeSlot ?? (prefs as any).nutritionTimeSlot ?? 'morning',
          lifestyleTimeSlot: lifestyleTimeSlot ?? (prefs as any).lifestyleTimeSlot ?? 'evening',
          pillsCustomTime: pillsCustomTime !== undefined ? pillsCustomTime : (prefs as any).pillsCustomTime,
          workoutCustomTime: workoutCustomTime !== undefined ? workoutCustomTime : (prefs as any).workoutCustomTime,
          nutritionCustomTime: nutritionCustomTime !== undefined ? nutritionCustomTime : (prefs as any).nutritionCustomTime,
          lifestyleCustomTime: lifestyleCustomTime !== undefined ? lifestyleCustomTime : (prefs as any).lifestyleCustomTime,
        });
      }
      
      if (!prefs) {
        return res.status(500).json({ error: 'Failed to update preferences' });
      }
      
      res.json(prefs);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  // Review Schedule endpoints
  
  // Get review schedule for a formula
  app.get('/api/formulas/:formulaId/review-schedule', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { formulaId } = req.params;
      
      // Verify the formula belongs to the user
      const formula = await storage.getFormula(formulaId);
      if (!formula || formula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found' });
      }
      
      const schedule = await storage.getReviewSchedule(userId, formulaId);
      res.json(schedule || null);
    } catch (error) {
      console.error('Error fetching review schedule:', error);
      res.status(500).json({ error: 'Failed to fetch review schedule' });
    }
  });
  
  // Create or update review schedule
  app.put('/api/formulas/:formulaId/review-schedule', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { formulaId } = req.params;
      const {
        frequency,
        daysBefore,
        emailReminders,
        smsReminders,
        calendarIntegration,
      } = req.body;
      
      // Verify the formula belongs to the user
      const formula = await storage.getFormula(formulaId);
      if (!formula || formula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found' });
      }
      
      // Validate frequency
      if (!['monthly', 'bimonthly', 'quarterly'].includes(frequency)) {
        return res.status(400).json({ error: 'Invalid frequency. Must be monthly, bimonthly, or quarterly' });
      }
      
      // Validate daysBefore
      if (typeof daysBefore !== 'number' || daysBefore < 1 || daysBefore > 14) {
        return res.status(400).json({ error: 'daysBefore must be between 1 and 14' });
      }
      
      // Calculate next review date based on frequency and formula creation date
      const frequencyDays: Record<string, number> = {
        monthly: 30,
        bimonthly: 60,
        quarterly: 90,
      };
      
      const days = frequencyDays[frequency];
      
      const formulaDate = new Date(formula.createdAt);
      const nextReviewDate = new Date(formulaDate);
      nextReviewDate.setDate(nextReviewDate.getDate() + days - daysBefore);
      
      // If the calculated date is in the past, add another cycle
      if (nextReviewDate < new Date()) {
        nextReviewDate.setDate(nextReviewDate.getDate() + days);
      }
      
      // Check if schedule already exists
      const existingSchedule = await storage.getReviewSchedule(userId, formulaId);
      
      let schedule;
      if (existingSchedule) {
        // Update existing
        schedule = await storage.updateReviewSchedule(existingSchedule.id, {
          frequency,
          daysBefore,
          nextReviewDate,
          emailReminders: emailReminders ?? true,
          smsReminders: smsReminders ?? false,
          calendarIntegration: calendarIntegration ?? null,
          isActive: true,
        });
      } else {
        // Create new
        schedule = await storage.createReviewSchedule({
          userId,
          formulaId,
          frequency,
          daysBefore,
          nextReviewDate,
          lastReviewDate: null,
          emailReminders: emailReminders ?? true,
          smsReminders: smsReminders ?? false,
          calendarIntegration: calendarIntegration ?? null,
          isActive: true,
        });
      }
      
      res.json(schedule);
    } catch (error) {
      console.error('Error saving review schedule:', error);
      res.status(500).json({ error: 'Failed to save review schedule' });
    }
  });
  
  // Delete review schedule
  app.delete('/api/formulas/:formulaId/review-schedule', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { formulaId } = req.params;
      
      // Verify the formula belongs to the user
      const formula = await storage.getFormula(formulaId);
      if (!formula || formula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found' });
      }
      
      const schedule = await storage.getReviewSchedule(userId, formulaId);
      if (!schedule) {
        return res.status(404).json({ error: 'Review schedule not found' });
      }
      
      await storage.deleteReviewSchedule(schedule.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting review schedule:', error);
      res.status(500).json({ error: 'Failed to delete review schedule' });
    }
  });
  
  // Download .ics calendar file for review schedule
  app.get('/api/formulas/:formulaId/review-schedule/calendar', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { formulaId } = req.params;
      
      // Verify the formula belongs to the user
      const formula = await storage.getFormula(formulaId);
      if (!formula || formula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found' });
      }
      
      // Get review schedule
      const schedule = await storage.getReviewSchedule(userId, formulaId);
      if (!schedule) {
        return res.status(404).json({ error: 'Review schedule not found. Please set up your review schedule first.' });
      }
      
      // Get user for calendar event
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Generate .ics file
      const { generateReviewCalendarEvent } = await import('./calendarGenerator');
      const icsContent = generateReviewCalendarEvent(schedule, user.name);
      
      // Send as downloadable file
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ones-review.ics"');
      res.send(icsContent);
    } catch (error) {
      console.error('Error generating calendar file:', error);
      res.status(500).json({ error: 'Failed to generate calendar file' });
    }
  });

  // Helper route to create sample notifications for testing
  app.post('/api/notifications/sample', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Create sample notifications
      const sampleNotifications = [
        {
          userId,
          type: 'order_update' as const,
          title: 'Order Shipped',
          content: 'Your personalized supplement formula has been shipped and is on its way.',
          metadata: { actionUrl: '/dashboard/orders', icon: 'package', priority: 'medium' as const }
        },
        {
          userId,
          type: 'formula_update' as const,
          title: 'New Formula Recommendation',
          content: 'Based on your recent lab results, we have updated your formula with enhanced antioxidants.',
          metadata: { actionUrl: '/dashboard/my-formula', icon: 'beaker', priority: 'high' as const }
        }
      ];

      const createdNotifications = [];
      for (const notification of sampleNotifications) {
        const created = await storage.createNotification(notification);
        createdNotifications.push(created);
        
        // Send email notification if user has email preferences enabled
        await sendNotificationsForUser(created, user);
      }

      res.json({ notifications: createdNotifications });
    } catch (error) {
      console.error('Error creating sample notifications:', error);
      res.status(500).json({ error: 'Failed to create sample notifications' });
    }
  });

  // Test endpoint for notification system (admin only for security)
  app.post('/api/test-notification', requireAuth, async (req: Request, res) => {
    try {
      // Only allow users to test notifications for themselves
      const userId = req.userId!;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Create a test notification
      const testNotification = {
        userId,
        type: 'formula_update' as const,
        title: 'Test Notification System',
        content: 'Testing your email and SMS notification system! If you receive this via both email and SMS, everything is working perfectly. 🎉',
        isRead: false,
      };
      
      const created = await storage.createNotification(testNotification);
      await sendNotificationsForUser(created, user);
      
      res.json({ 
        success: true, 
        notification: created,
        message: 'Test notification sent! Check your email and phone.'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Support system API endpoints
  // FAQ endpoints
  app.get('/api/support/faq', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const faqItems = await storage.listFaqItems(category);
      res.json({ faqItems });
    } catch (error) {
      console.error('Error fetching FAQ items:', error);
      res.status(500).json({ error: 'Failed to fetch FAQ items' });
    }
  });

  app.get('/api/support/faq/:id', async (req, res) => {
    try {
      const faqItem = await storage.getFaqItem(req.params.id);
      if (!faqItem) {
        return res.status(404).json({ error: 'FAQ item not found' });
      }
      res.json({ faqItem });
    } catch (error) {
      console.error('Error fetching FAQ item:', error);
      res.status(500).json({ error: 'Failed to fetch FAQ item' });
    }
  });

  // Support ticket endpoints
  app.get('/api/support/tickets', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const tickets = await storage.listSupportTicketsByUser(userId);
      res.json({ tickets });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ error: 'Failed to fetch support tickets' });
    }
  });

  app.get('/api/support/tickets/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const ticketWithResponses = await storage.getSupportTicketWithResponses(req.params.id, userId);
      if (!ticketWithResponses) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }
      res.json(ticketWithResponses);
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      res.status(500).json({ error: 'Failed to fetch support ticket' });
    }
  });

  app.post('/api/support/tickets', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Validate request body with Zod
      const validationResult = insertSupportTicketSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid ticket data', 
          details: validationResult.error.errors 
        });
      }
      
      const ticketData = {
        ...validationResult.data,
        userId
      };
      const ticket = await storage.createSupportTicket(ticketData);
      
      // Send email notification to support team
      try {
        const user = await storage.getUserById(userId);
        if (user) {
          const adminActionUrl = 'https://myones.ai/admin';
          await sendNotificationEmail({
            to: 'support@myones.ai',
            subject: `New Support Ticket: ${ticket.subject}`,
            title: 'New Support Ticket Received',
            content: `
              <strong>From:</strong> ${user.name} (${user.email})<br/>
              <strong>Subject:</strong> ${ticket.subject}<br/>
              <strong>Category:</strong> ${ticket.category}<br/>
              <strong>Priority:</strong> ${ticket.priority}<br/>
              <strong>Description:</strong> ${ticket.description}<br/>
              <strong>Ticket ID:</strong> ${ticket.id}
            `,
            actionUrl: adminActionUrl,
            actionText: 'Open Admin Dashboard',
            type: 'system'
          });
          console.log(`📧 Support notification email sent for ticket ${ticket.id}`);
        }
      } catch (emailError) {
        // Log but don't fail the ticket creation if email fails
        console.error('Failed to send support notification email:', emailError);
      }
      
      res.json({ ticket });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ error: 'Failed to create support ticket' });
    }
  });

  app.post('/api/support/tickets/:id/responses', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const ticketId = req.params.id;
      
      // Validate request body with Zod
      const messageValidation = z.object({
        message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long')
      }).safeParse(req.body);
      
      if (!messageValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid message data', 
          details: messageValidation.error.errors 
        });
      }
      
      // Verify user owns the ticket
      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket || ticket.userId !== userId) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }
      
      const responseData = {
        ticketId,
        userId,
        message: messageValidation.data.message,
        isStaff: false
      };
      const response = await storage.createSupportTicketResponse(responseData);
      
      // Send email notification to support team about new user response
      try {
        const user = await storage.getUserById(userId);
        if (user && ticket) {
          const adminTicketUrl = `https://myones.ai/admin/support/${ticketId}`;
          await sendNotificationEmail({
            to: 'support@myones.ai',
            subject: `New Response on Ticket: ${ticket.subject}`,
            title: 'New Support Ticket Response',
            content: `
              <strong>From:</strong> ${user.name} (${user.email})<br/>
              <strong>Ticket Subject:</strong> ${ticket.subject}<br/>
              <strong>Ticket ID:</strong> ${ticketId}<br/>
              <strong>New Message:</strong> ${messageValidation.data.message}
            `,
            actionUrl: adminTicketUrl,
            actionText: 'Review Ticket',
            type: 'system'
          });
          console.log(`📧 Support response notification email sent for ticket ${ticketId}`);
        }
      } catch (emailError) {
        // Log but don't fail if email fails
        console.error('Failed to send response notification email:', emailError);
      }
      
      res.json({ response });
    } catch (error) {
      console.error('Error creating support ticket response:', error);
      res.status(500).json({ error: 'Failed to create response' });
    }
  });

  // Help article endpoints
  app.get('/api/support/help', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const articles = await storage.listHelpArticles(category);
      res.json({ articles });
    } catch (error) {
      console.error('Error fetching help articles:', error);
      res.status(500).json({ error: 'Failed to fetch help articles' });
    }
  });

  app.get('/api/support/help/:id', async (req, res) => {
    try {
      const article = await storage.getHelpArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ error: 'Help article not found' });
      }
      
      // Increment view count
      await storage.incrementHelpArticleViewCount(req.params.id);
      
      res.json({ article });
    } catch (error) {
      console.error('Error fetching help article:', error);
      res.status(500).json({ error: 'Failed to fetch help article' });
    }
  });

  // TEST ENDPOINT: Manually trigger SMS reminder check (protected)
  app.post('/api/test/sms-reminder', requireAuth, async (req, res) => {
    try {
      const { checkAndSendReminders } = await import('./smsReminderScheduler');
      
      console.log('🧪 Manual SMS reminder test triggered by user:', req.userId);
      await checkAndSendReminders();
      
      res.json({ 
        success: true, 
        message: 'SMS reminder check completed. Check server logs for results.' 
      });
    } catch (error) {
      console.error('Test SMS reminder error:', error);
      res.status(500).json({ error: 'Failed to test SMS reminders' });
    }
  });

  // Newsletter subscription endpoint (public)
  app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
      const { email } = insertNewsletterSubscriberSchema.parse(req.body);
      
      // Check if email already exists
      const existing = await storage.getNewsletterSubscriberByEmail(email);
      if (existing) {
        if (existing.isActive) {
          return res.status(400).json({ error: 'Email already subscribed' });
        } else {
          // Reactivate subscription
          await storage.reactivateNewsletterSubscriber(email);
          return res.json({ success: true, message: 'Subscription reactivated' });
        }
      }
      
      // Create new subscription
      const subscriber = await storage.createNewsletterSubscriber({ email });
      res.json({ success: true, subscriber });
    } catch (error) {
      // Handle Zod validation errors with 400
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid email address', 
          details: error.errors 
        });
      }
      
      console.error('Newsletter subscription error:', error);
      res.status(500).json({ error: 'Failed to subscribe to newsletter' });
    }
  });

  // ========== ADMIN ROUTES (Protected with requireAdmin middleware) ==========
  
  // Admin: Test current AI settings by making a tiny provider call
  app.post('/api/admin/ai-settings/test', requireAdmin, async (req, res) => {
    try {
      const provider = (aiRuntimeSettings.provider || process.env.AI_PROVIDER || 'openai').toLowerCase();
      const model = aiRuntimeSettings.model || process.env.AI_MODEL || (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o');
      const system = 'You are a helpful health consultation assistant.';
      const userMsg = 'ping';
      if (provider === 'anthropic') {
        const hasKey = !!process.env.ANTHROPIC_API_KEY;
        const { text } = await callAnthropic(system, [{ role: 'user', content: userMsg }], model, 0, 50, false);
        return res.json({ ok: true, provider, model, hasKey, sample: (text || '').slice(0, 60) });
      } else {
        if (!process.env.OPENAI_API_KEY) {
          return res.status(500).json({ ok: false, provider, model, error: 'OpenAI API key not configured' });
        }
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg }
          ],
          max_tokens: 10,
          temperature: 0
        });
        const content = completion.choices?.[0]?.message?.content || '';
        return res.json({ ok: true, provider, model, hasKey: !!process.env.OPENAI_API_KEY, sample: content.slice(0, 60) });
      }
    } catch (error: any) {
      console.error('AI settings test error:', error);
      // Ensure JSON response even on unexpected failures
      try {
        return res.status(500).json({ ok: false, error: error?.message || String(error) });
      } catch {
        res.setHeader('content-type', 'application/json');
        return res.status(500).end(JSON.stringify({ ok: false, error: 'Unknown error' }));
      }
    }
  });
  
  // Admin: Get/set AI runtime settings (provider/model override)
  app.get('/api/admin/ai-settings', requireAdmin, async (req, res) => {
    try {
      const current = {
        provider: aiRuntimeSettings.provider || (process.env.AI_PROVIDER || 'openai'),
        model: aiRuntimeSettings.model || process.env.AI_MODEL || ((process.env.AI_PROVIDER || 'openai').toLowerCase() === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o'),
        source: aiRuntimeSettings.provider || aiRuntimeSettings.model ? 'override' : 'env',
        updatedAt: aiRuntimeSettings.updatedAt || null
      };
      res.json(current);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      res.status(500).json({ error: 'Failed to fetch AI settings' });
    }
  });

  app.post('/api/admin/ai-settings', requireAdmin, async (req, res) => {
    try {
      const { provider, model, reset } = req.body || {};
      if (reset) {
        aiRuntimeSettings.provider = undefined;
        aiRuntimeSettings.model = undefined;
        aiRuntimeSettings.updatedAt = new Date().toISOString();
        aiRuntimeSettings.source = 'env';
        // Remove persisted settings to revert to env defaults
        try { await storage.deleteAppSetting('ai_settings'); } catch {}
        return res.json({ success: true, message: 'AI settings reset to environment defaults', settings: aiRuntimeSettings });
      }
      if (provider && !['openai','anthropic'].includes(String(provider).toLowerCase())) {
        return res.status(400).json({ error: 'Invalid provider. Must be "openai" or "anthropic".' });
      }
      const effectiveProvider: 'openai'|'anthropic' = (provider ? String(provider).toLowerCase() : (aiRuntimeSettings.provider || (process.env.AI_PROVIDER as any) || 'openai')) as 'openai'|'anthropic';
      if (provider) aiRuntimeSettings.provider = effectiveProvider;

      if (model) {
        const normalized = normalizeModel(effectiveProvider, String(model));
        const allowed = ALLOWED_MODELS[effectiveProvider];
        if (!normalized || !allowed.includes(normalized)) {
          return res.status(400).json({
            error: `Invalid model for provider '${effectiveProvider}'. Allowed: ${allowed.join(', ')}`,
            suggestion: allowed[0]
          });
        }
        aiRuntimeSettings.model = normalized;
      }
      aiRuntimeSettings.updatedAt = new Date().toISOString();
      aiRuntimeSettings.source = 'override';
      // Persist settings to DB
      try {
        await storage.upsertAppSetting('ai_settings', {
          provider: aiRuntimeSettings.provider,
          model: aiRuntimeSettings.model,
          updatedAt: aiRuntimeSettings.updatedAt
        }, req.userId || null);
      } catch (e) {
        console.error('Error persisting AI settings:', e);
        // Non-fatal; continue with in-memory override
      }
      res.json({ success: true, settings: aiRuntimeSettings });
    } catch (error) {
      console.error('Error updating AI settings:', error);
      res.status(500).json({ error: 'Failed to update AI settings' });
    }
  });
  
  // Admin: Get dashboard statistics
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin statistics' });
    }
  });
  
  // Admin: Get user growth data
  app.get('/api/admin/analytics/growth', requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const growthData = await storage.getUserGrowthData(days);
      res.json(growthData);
    } catch (error) {
      console.error('Error fetching growth data:', error);
      res.status(500).json({ error: 'Failed to fetch growth data' });
    }
  });
  
  // Admin: Get revenue data
  app.get('/api/admin/analytics/revenue', requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const revenueData = await storage.getRevenueData(days);
      res.json(revenueData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      res.status(500).json({ error: 'Failed to fetch revenue data' });
    }
  });
  
  // Admin: Search and list users
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const query = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const filter = (req.query.filter as string) || 'all'; // 'all', 'paid', 'active'
      
      const result = await storage.searchUsers(query, limit, offset, filter);
      
      // Sanitize users to remove sensitive fields
      const sanitizedUsers = result.users.map(({ password, ...user }) => user);
      
      res.json({
        users: sanitizedUsers,
        total: result.total
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });
  
  // Admin: Get detailed user information
  app.get('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Sanitize user to remove sensitive fields
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });
  
  // Admin: Get today's orders
  app.get('/api/admin/orders/today', requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getTodaysOrders();
      res.json(orders);
    } catch (error) {
      console.error('Error fetching today\'s orders:', error);
      res.status(500).json({ error: 'Failed to fetch today\'s orders' });
    }
  });
  
  // Admin: Get user timeline (complete activity history)
  app.get('/api/admin/users/:id/timeline', requireAdmin, async (req, res) => {
    try {
      const timeline = await storage.getUserTimeline(req.params.id);
      
      // Sanitize user to remove sensitive fields
      const { password, ...sanitizedUser } = timeline.user;
      
      res.json({
        ...timeline,
        user: sanitizedUser
      });
    } catch (error) {
      console.error('Error fetching user timeline:', error);
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Failed to fetch user timeline' });
    }
  });

  // Admin: Get all support tickets
  app.get('/api/admin/support-tickets', requireAdmin, async (req, res) => {
    try {
      const status = (req.query.status as string) || 'all';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const result = await storage.listAllSupportTickets(status, limit, offset);
      res.json(result);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ error: 'Failed to fetch support tickets' });
    }
  });

  // Admin: Get support ticket details with responses
  app.get('/api/admin/support-tickets/:id', requireAdmin, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }

      const responses = await storage.listSupportTicketResponses(req.params.id);
      const user = await storage.getUserById(ticket.userId);

      res.json({
        ticket,
        responses,
        user: user ? { id: user.id, name: user.name, email: user.email } : null
      });
    } catch (error) {
      console.error('Error fetching support ticket details:', error);
      res.status(500).json({ error: 'Failed to fetch support ticket details' });
    }
  });

  // Admin: Update support ticket
  app.patch('/api/admin/support-tickets/:id', requireAdmin, async (req, res) => {
    try {
      const allowedUpdates = ['status', 'priority', 'adminNotes'];
      const updates: any = {};
      
      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }

      const ticket = await storage.updateSupportTicket(req.params.id, updates);
      if (!ticket) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Error updating support ticket:', error);
      res.status(500).json({ error: 'Failed to update support ticket' });
    }
  });

  // Admin: Reply to support ticket
  app.post('/api/admin/support-tickets/:id/reply', requireAdmin, async (req, res) => {
    try {
      const ticketId = req.params.id;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }

      const response = await storage.createSupportTicketResponse({
        ticketId,
        userId: req.userId!,
        message,
        isStaff: true
      });

      // Send email notification to user
      try {
        const user = await storage.getUserById(ticket.userId);
        if (user) {
          const ticketUrl = `https://myones.ai/support/tickets/${ticketId}`;
          await sendNotificationEmail({
            to: user.email,
            subject: `Response to: ${ticket.subject}`,
            title: 'Support Team Response',
            content: `
              <strong>Ticket Subject:</strong> ${ticket.subject}<br/>
              <strong>Response:</strong> ${message}
            `,
            actionUrl: ticketUrl,
            actionText: 'View Ticket',
            type: 'system'
          });
          console.log(`📧 Support response email sent to user ${user.email}`);
        }
      } catch (emailError) {
        console.error('Failed to send response notification email:', emailError);
      }

      res.json({ response });
    } catch (error) {
      console.error('Error replying to support ticket:', error);
      res.status(500).json({ error: 'Failed to reply to support ticket' });
    }
  });

  // ===== WEARABLE DEVICE INTEGRATION =====
  // Wearable routes are now handled by Junction (Vital) integration
  // See: server/routes/junction.routes.ts (mounted at /api/wearables)
  // All OAuth, data sync, and token refresh is handled by Junction API + webhooks

  // ===== OPTIMIZE FEATURE ROUTES =====
  
  // Get user's optimize plans
  app.get('/api/optimize/plans', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const plans = await storage.getOptimizePlans(userId);
      res.json(plans);
    } catch (error) {
      console.error('Error fetching optimize plans:', error);
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  });

  // Get user's streaks
  app.get('/api/optimize/streaks', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const streaks = [];
      
      // Get all streak types
      const streakTypes = ['overall', 'nutrition', 'workout', 'lifestyle'] as const;
      for (const type of streakTypes) {
        const streak = await storage.getUserStreak(userId, type);
        if (streak) {
          streaks.push(streak);
        }
      }
      
      res.json(streaks);
    } catch (error) {
      console.error('Error fetching streaks:', error);
      res.status(500).json({ error: 'Failed to fetch streaks' });
    }
  });

  // Get smart streak data with percentage-based daily progress and rest day detection
  app.get('/api/optimize/streaks/smart', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Get user's timezone for correct day boundary
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      
      const smartData = await storage.getSmartStreakData(userId, userTimezone);
      
      // Debug logging for today's breakdown
      const todayStr = getUserLocalDateString(userTimezone);
      console.log('🧮 Smart Streak Data for today:', {
        currentStreak: smartData.currentStreak,
        todayBreakdown: smartData.todayBreakdown,
        todayProgress: smartData.monthlyProgress.find((d: { date: string }) => d.date === todayStr),
      });
      
      res.json(smartData);
    } catch (error) {
      console.error('Error fetching smart streak data:', error);
      res.status(500).json({ error: 'Failed to fetch smart streak data' });
    }
  });

  // Get comprehensive streak summary with daily scores and weekly progress
  app.get('/api/optimize/streaks/summary', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const summary = await storage.getStreakSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching streak summary:', error);
      res.status(500).json({ error: 'Failed to fetch streak summary' });
    }
  });

  // Tracking preferences (which categories count toward streaks/consistency)
  app.get('/api/optimize/tracking-preferences', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const prefs = await storage.getTrackingPreferences(userId);
      res.json(prefs || {
        trackNutrition: true,
        trackWorkouts: true,
        trackSupplements: true,
        trackLifestyle: true,
        hydrationGoalOz: null,
        pauseUntil: null,
      });
    } catch (error) {
      console.error('Error fetching tracking preferences:', error);
      res.status(500).json({ error: 'Failed to fetch tracking preferences' });
    }
  });

  app.post('/api/optimize/tracking-preferences', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { trackNutrition, trackWorkouts, trackSupplements, trackLifestyle, hydrationGoalOz, pauseUntil } = req.body || {};

      const prefs = await storage.upsertTrackingPreferences(userId, {
        trackNutrition,
        trackWorkouts,
        trackSupplements,
        trackLifestyle,
        hydrationGoalOz,
        pauseUntil,
      });

      // Refresh streaks to reflect new preferences
      await storage.updateAllStreaks(userId, new Date());
      const summary = await storage.getStreakSummary(userId);

      res.json({ success: true, prefs, summary });
    } catch (error) {
      console.error('Error saving tracking preferences:', error);
      res.status(500).json({ error: 'Failed to save tracking preferences' });
    }
  });

  // Recalculate today's scores (useful after logging activities)
  app.post('/api/optimize/streaks/recalculate', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { date } = req.body;
      const logDate = date ? new Date(date) : new Date();
      
      // Calculate and save all scores, then update all streaks
      const streakResults = await storage.updateAllStreaks(userId, logDate);
      const summary = await storage.getStreakSummary(userId);
      
      res.json({ 
        success: true, 
        updatedStreaks: streakResults,
        summary 
      });
    } catch (error) {
      console.error('Error recalculating streaks:', error);
      res.status(500).json({ error: 'Failed to recalculate streaks' });
    }
  });

  // Generate optimize plans (nutrition, workout, lifestyle)
  app.post('/api/optimize/plans/generate', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { planTypes, preferences } = req.body;
      
      console.log('🎯 OPTIMIZE PLAN GENERATION STARTED', { userId, planTypes, preferences });
      
      if (!Array.isArray(planTypes) || planTypes.length === 0) {
        return res.status(400).json({ error: 'planTypes array is required' });
      }

      // Get user context
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const healthProfile = await storage.getHealthProfile(userId);
      const activeFormula = await storage.getCurrentFormulaByUser(userId);
      const labAnalyses = await storage.listLabAnalysesByUser(userId);

      console.log('📊 Context loaded:', { hasProfile: !!healthProfile, hasFormula: !!activeFormula, labCount: labAnalyses.length });

      const labSummary = labAnalyses
        .map((analysis) => {
          if (analysis.aiInsights?.summary) {
            return analysis.aiInsights.summary;
          }
          const abnormalMarkers = analysis.extractedMarkers
            ?.filter((marker) => marker.status && marker.status !== 'normal')
            .map((marker) => `${marker.name}: ${marker.value}${marker.unit ?? ''} (${marker.status})`)
            .join(', ');
          return abnormalMarkers ? `Markers of concern: ${abnormalMarkers}` : '';
        })
        .filter(Boolean)
        .join('\n\n');

      // Build context for AI prompt
      const optimizeContext = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        healthProfile,
        activeFormula,
        labData: labAnalyses.length > 0 ? {
          reports: labAnalyses,
          summary: labSummary || 'Lab analyses available for personalization.',
        } : undefined,
        preferences: preferences || {},
      };

      // Helper function to generate a single plan - used for parallel execution
      async function generateSinglePlan(planType: string): Promise<{ planType: string; plan: any }> {
        console.log(`🤖 [${planType}] Starting plan generation...`);
        let prompt: string;
        
        // Select prompt builder based on plan type
        switch (planType) {
          case 'nutrition':
            prompt = buildNutritionPlanPrompt(optimizeContext);
            break;
          case 'workout':
            try {
              const workoutAnalysis = await analyzeWorkoutHistory(userId);
              const historyContext = workoutAnalysis.allTime.totalWorkouts > 0 
                ? formatAnalysisForPrompt(workoutAnalysis) : undefined;
              prompt = buildWorkoutPlanPrompt(optimizeContext, undefined, historyContext);
            } catch {
              prompt = buildWorkoutPlanPrompt(optimizeContext);
            }
            break;
          case 'lifestyle':
            prompt = buildLifestylePlanPrompt(optimizeContext);
            break;
          default:
            throw new Error(`Invalid plan type: ${planType}`);
        }

        console.log(`📝 [${planType}] Prompt built, length: ${prompt.length} chars`);
        
        let planContent: any;
        let rationale = '';

        try {
          const systemPrompt = planType === 'nutrition' 
            ? "You are a clinical nutrition expert. You MUST generate a complete 7-day meal plan (Monday-Sunday). Do not stop early. The response must be valid JSON containing all 7 days."
            : planType === 'workout'
            ? "You are an expert fitness coach. Generate a complete weekly workout plan. The response must be valid JSON."
            : "You are a wellness and lifestyle expert. Generate a comprehensive lifestyle optimization plan. The response must be valid JSON.";
          
          const startTime = Date.now();
          const aiResponse = await callAnthropic(systemPrompt, [{ role: 'user', content: prompt }], 'claude-haiku-4-5', 0.7, 8000, false);
          console.log(`⏱️ [${planType}] Haiku response: ${Date.now() - startTime}ms`);

          planContent = parseAiJson(aiResponse.text || '{}');
          rationale = planContent.weeklyGuidance || planContent.programOverview || 'Personalized plan generated';
        } catch (aiError) {
          console.error(`❌ [${planType}] AI error:`, aiError);
          planContent = { error: 'Failed to generate plan' };
          rationale = 'AI generation failed';
        }

        const normalizedContent = normalizePlanContent(planType as 'nutrition' | 'workout' | 'lifestyle', planContent);
        
        // IMPORTANT: Deactivate old plans of this type before creating new one
        await storage.deactivateOldPlans(userId, planType as 'nutrition' | 'workout' | 'lifestyle');
        
        const plan = await storage.createOptimizePlan({
          userId,
          planType,
          content: normalizedContent,
          aiRationale: rationale,
          preferences: preferences || {},
          basedOnFormulaId: activeFormula?.id || null,
          basedOnLabs: labAnalyses.length > 0 ? labAnalyses[0] : null,
          isActive: true,
        });
        
        console.log(`✅ [${planType}] Plan saved: ${plan.id}`);
        return { planType, plan };
      }

      // PARALLEL PLAN GENERATION - run all plans simultaneously!
      console.log(`🚀 Generating ${planTypes.length} plans IN PARALLEL: ${planTypes.join(', ')}`);
      const parallelStartTime = Date.now();
      
      const planResults = await Promise.all(planTypes.map((pt: string) => generateSinglePlan(pt)));
      
      const results: Record<string, any> = {};
      for (const { planType, plan } of planResults) {
        results[planType] = plan;
      }
      
      console.log(`🎉 All ${planTypes.length} plans generated in ${Date.now() - parallelStartTime}ms (PARALLEL)`);

      // Auto-generate grocery list if nutrition plan was created
      if (results.nutrition && planTypes.includes('nutrition')) {
        console.log('🛒 Auto-generating grocery list for nutrition plan...');
        try {
          const nutritionPlan = results.nutrition;
          const content = nutritionPlan.content as any;
          const weekPlan = content.weekPlan || [];
          
          let mealsText = '';
          weekPlan.forEach((day: any) => {
            mealsText += `\nDay ${day.day} (${day.dayName}):\n`;
            day.meals?.forEach((meal: any) => {
              const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : '';
              mealsText += `- ${meal.name}: ${ingredients}\n`;
            });
          });

          const prompt = `
You are a smart nutritionist assistant creating a PRACTICAL grocery shopping list.
The user needs to buy actual items/packages at the store, not individual tablespoons of ingredients.

RULES:
1. **Consolidate items** into purchasable units (e.g., "1 jar", "1 bag", "1 carton", "1 bottle").
2. **NO small measurements** like "tbsp", "tsp", "oz", or "cups" unless it's for produce count (e.g. "5 apples").
3. **Round up** to standard package sizes.
   - BAD: "2 tbsp Honey", "1/4 cup Pumpkin Seeds", "3 tbsp Olive Oil"
   - GOOD: "Honey (1 jar)", "Pumpkin Seeds (1 bag)", "Olive Oil (1 bottle)"
4. **Group items** by category (Produce, Meat/Seafood, Dairy/Eggs, Pantry, Bakery, Frozen, Other).
5. **Combine duplicates** intelligently (e.g. if 3 meals need eggs, list "Eggs (1 dozen)").

Meal Plan:
${mealsText}

Return a JSON object with this structure:
{
  "items": [
    {
      "item": "Eggs",
      "amount": "1",
      "unit": "dozen",
      "category": "Dairy/Eggs"
    },
    {
      "item": "Honey",
      "amount": "1",
      "unit": "jar",
      "category": "Pantry"
    }
  ]
}
IMPORTANT: Return ONLY valid JSON. No markdown formatting.
`;

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            response_format: { type: "json_object" }
          });

          const responseContent = completion.choices[0].message.content || '{}';
          const parsed = JSON.parse(responseContent);
          
          const items = (parsed.items || []).map((item: any) => ({
            id: nanoid(8),
            item: item.item,
            amount: item.amount,
            unit: item.unit,
            category: item.category,
            checked: false
          }));

          if (items.length > 0) {
            const existingList = await storage.getActiveGroceryList(userId);
            const groceryList = existingList
              ? await storage.updateGroceryList(existingList.id, {
                  optimizePlanId: nutritionPlan.id,
                  items,
                  generatedAt: new Date(),
                  isArchived: false,
                })
              : await storage.createGroceryList({
                  userId,
                  optimizePlanId: nutritionPlan.id,
                  items,
                  generatedAt: new Date(),
                  isArchived: false,
                });
            
            console.log(`✅ Grocery list auto-generated with ${items.length} items`);
            results.groceryList = groceryList;
          } else {
            console.log('⚠️ No grocery items generated, skipping list creation');
          }
        } catch (groceryError) {
          console.error('⚠️ Failed to auto-generate grocery list (non-fatal):', groceryError);
          // Don't fail the whole request if grocery list generation fails
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error('❌ Error generating optimize plans:', error);
      res.status(500).json({ error: 'Failed to generate plans' });
    }
  });

  app.get('/api/optimize/daily-logs', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { start, end } = req.query;

      const endDate = end ? new Date(String(end)) : new Date();
      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid end date' });
      }
      endDate.setHours(23, 59, 59, 999);

      const startDate = start ? new Date(String(start)) : new Date(endDate);
      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({ error: 'Invalid start date' });
      }
      if (!start) {
        startDate.setDate(endDate.getDate() - 6);
      }
      startDate.setHours(0, 0, 0, 0);

      if (startDate > endDate) {
        return res.status(400).json({ error: 'start date must be before end date' });
      }

      const logs = await storage.listDailyLogs(userId, startDate, endDate);
      const normalizedLogs = logs
        .map((log) => ({
          ...log,
          logDate: new Date(log.logDate).toISOString(),
        }))
        .sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());

      const logsByDate = normalizedLogs.reduce<Record<string, typeof normalizedLogs[number]>>((acc, log) => {
        const dayKey = log.logDate.slice(0, 10);
        acc[dayKey] = log;
        return acc;
      }, {});

      const streakTypes = ['overall', 'nutrition', 'workout', 'lifestyle'] as const;
      const streaks = {} as Record<typeof streakTypes[number], Awaited<ReturnType<typeof storage.getUserStreak>> | null>;
      for (const type of streakTypes) {
        streaks[type] = (await storage.getUserStreak(userId, type)) ?? null;
      }

      res.json({
        range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        logs: normalizedLogs,
        logsByDate,
        streaks,
      });
    } catch (error) {
      console.error('❌ Error fetching daily logs:', error);
      res.status(500).json({ error: 'Failed to fetch optimize logs' });
    }
  });

  // Log a meal completion for the day
  app.post('/api/optimize/nutrition/log-meal', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { date, mealType } = req.body;

      if (!date || !mealType) {
        return res.status(400).json({ error: 'date and mealType are required' });
      }

      const logDate = new Date(date);
      if (Number.isNaN(logDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date value' });
      }

      const normalizedMealType = String(mealType).toLowerCase();
      const existingLog = await storage.getDailyLog(userId, logDate);
      const mealsLogged = new Set<string>(
        Array.isArray(existingLog?.mealsLogged) ? existingLog!.mealsLogged : [],
      );
      mealsLogged.add(normalizedMealType);

      const nutritionCompleted = mealsLogged.size >= DEFAULT_MEAL_TYPES.length;
      let updatedLog = existingLog;

      if (existingLog) {
        updatedLog = await storage.updateDailyLog(existingLog.id, {
          mealsLogged: Array.from(mealsLogged),
          nutritionCompleted,
        });
      } else {
        updatedLog = await storage.createDailyLog({
          userId,
          logDate,
          mealsLogged: Array.from(mealsLogged),
          nutritionCompleted,
          workoutCompleted: false,
          supplementsTaken: false,
        });
      }

      res.json({
        success: true,
        log: updatedLog,
        mealsLogged: Array.from(mealsLogged),
        nutritionCompleted,
      });
    } catch (error) {
      console.error('❌ Error logging meal:', error);
      res.status(500).json({ error: 'Failed to log meal' });
    }
  });

  // Log detailed meal with AI nutrition analysis
  app.post('/api/optimize/nutrition/log-meal-detailed', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { mealType, description, isFromPlan, planMealName, manualNutrition } = req.body;

      if (!mealType || !description) {
        return res.status(400).json({ error: 'mealType and description are required' });
      }

      let nutritionData = manualNutrition || null;

      // Use AI to analyze the meal if no manual nutrition provided
      if (!nutritionData) {
        try {
          const openai = new OpenAI();
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert nutritionist analyzing meals for accurate calorie and macro tracking. 

IMPORTANT GUIDELINES:
- Be REALISTIC about portion sizes - most home-cooked meals have larger portions than you might assume
- ALWAYS include cooking oils, butter, or fats typically used in preparation (usually 1-2 tbsp = 100-200 extra calories)
- Eggs: 1 large egg = ~70-90 calories (depends on size and cooking method)
- When in doubt, estimate on the HIGHER end to avoid underreporting
- Consider that restaurants and home cooking often use more fat than "healthy" recipes suggest

Return ONLY a JSON object with these values:
{
  "calories": <number - be realistic, most meals are 300-800 cal>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams - remember cooking fats!>,
  "fiber": <number in grams>,
  "sugar": <number in grams>,
  "sodium": <number in mg>
}

Return ONLY the JSON, no explanation.`
              },
              {
                role: 'user',
                content: `Analyze this meal and provide accurate nutrition data: ${description}`
              }
            ],
            temperature: 0.2,
            max_tokens: 200,
          });

          const content = completion.choices[0]?.message?.content || '';
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            nutritionData = JSON.parse(jsonMatch[0]);
          }
        } catch (aiError) {
          console.error('AI nutrition analysis failed:', aiError);
          // Continue without nutrition data
        }
      }

      // Create the meal log
      const mealLog = await storage.createMealLog({
        userId,
        mealType: mealType.toLowerCase(),
        customMealName: description.slice(0, 255),
        customMealDescription: description,
        loggedAt: new Date(),
        servings: 1,
        calories: nutritionData?.calories || null,
        proteinGrams: nutritionData?.protein || null,
        carbsGrams: nutritionData?.carbs || null,
        fatGrams: nutritionData?.fat || null,
        fiberGrams: nutritionData?.fiber || null,
        sugarGrams: nutritionData?.sugar || null,
        sodiumMg: nutritionData?.sodium || null,
        isFromPlan: isFromPlan || false,
        planMealName: planMealName || null,
      });

      // Also update daily log mealsLogged array
      // Get user's timezone for correct day boundary
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      const today = getUserLocalMidnight(userTimezone);
      
      const existingLog = await storage.getDailyLog(userId, today);
      const mealsLogged = new Set<string>(
        Array.isArray(existingLog?.mealsLogged) ? existingLog!.mealsLogged : [],
      );
      mealsLogged.add(mealType.toLowerCase());

      if (existingLog) {
        await storage.updateDailyLog(existingLog.id, {
          mealsLogged: Array.from(mealsLogged),
          nutritionCompleted: mealsLogged.size >= 3,
        });
      } else {
        await storage.createDailyLog({
          userId,
          logDate: today,
          mealsLogged: Array.from(mealsLogged),
          nutritionCompleted: mealsLogged.size >= 3,
          workoutCompleted: false,
          supplementsTaken: false,
        });
      }

      res.json({
        success: true,
        mealLog,
        nutritionData,
      });
    } catch (error) {
      console.error('❌ Error logging detailed meal:', error);
      res.status(500).json({ error: 'Failed to log meal' });
    }
  });

  // Get today's meal logs and nutrition totals
  app.get('/api/optimize/nutrition/today', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Get user's timezone for correct day boundary
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      const today = getUserLocalMidnight(userTimezone);
      
      const meals = await storage.getMealLogsForDay(userId, today);
      const totals = await storage.getTodayNutritionTotals(userId);
      const dailyLog = await storage.getDailyLog(userId, today);

      res.json({
        meals,
        totals,
        waterIntakeOz: dailyLog?.waterIntakeOz || 0,
        mealsLogged: dailyLog?.mealsLogged || [],
      });
    } catch (error) {
      console.error('❌ Error getting today nutrition:', error);
      res.status(500).json({ error: 'Failed to get nutrition data' });
    }
  });

  // Get meal log history
  app.get('/api/optimize/nutrition/history', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const meals = await storage.getMealLogsHistory(userId, limit);

      res.json({ meals });
    } catch (error) {
      console.error('❌ Error getting meal history:', error);
      res.status(500).json({ error: 'Failed to get meal history' });
    }
  });

  // Delete a meal log
  app.delete('/api/optimize/nutrition/meal/:mealId', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { mealId } = req.params;

      const deleted = await storage.deleteMealLog(userId, mealId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Meal log not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error deleting meal log:', error);
      res.status(500).json({ error: 'Failed to delete meal log' });
    }
  });

  // Log water intake
  app.post('/api/optimize/nutrition/log-water', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { amountOz } = req.body;

      if (typeof amountOz !== 'number' || amountOz < 0) {
        return res.status(400).json({ error: 'Valid amountOz is required' });
      }

      // Get user's timezone for correct day boundary
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      const today = getUserLocalMidnight(userTimezone);
      
      const existingLog = await storage.getDailyLog(userId, today);

      let updatedLog;
      const newWaterTotal = (existingLog?.waterIntakeOz || 0) + amountOz;

      if (existingLog) {
        updatedLog = await storage.updateDailyLog(existingLog.id, {
          waterIntakeOz: newWaterTotal,
        });
      } else {
        updatedLog = await storage.createDailyLog({
          userId,
          logDate: today,
          waterIntakeOz: newWaterTotal,
          mealsLogged: [],
          nutritionCompleted: false,
          workoutCompleted: false,
          supplementsTaken: false,
        });
      }

      res.json({
        success: true,
        waterIntakeOz: newWaterTotal,
        log: updatedLog,
      });
    } catch (error) {
      console.error('❌ Error logging water:', error);
      res.status(500).json({ error: 'Failed to log water intake' });
    }
  });

  // Reset water intake (for new day or manual reset)
  app.post('/api/optimize/nutrition/reset-water', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Get user's timezone for correct day boundary
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      const today = getUserLocalMidnight(userTimezone);
      
      const existingLog = await storage.getDailyLog(userId, today);

      if (existingLog) {
        await storage.updateDailyLog(existingLog.id, {
          waterIntakeOz: 0,
        });
      }

      res.json({ success: true, waterIntakeOz: 0 });
    } catch (error) {
      console.error('❌ Error resetting water:', error);
      res.status(500).json({ error: 'Failed to reset water intake' });
    }
  });

  // Get workout logs history
  app.get('/api/optimize/workout/logs', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await storage.listWorkoutLogs(userId, limit, offset);
      const total = logs.length; // TODO: Add count query for pagination

      // Debug: Log what we're returning
      console.log('📊 Returning workout logs:', { 
        count: logs.length, 
        firstLogExercises: logs[0]?.exercisesCompleted ? JSON.stringify(logs[0].exercisesCompleted).substring(0, 500) : 'NO_DATA'
      });

      res.json({ logs, total, limit, offset });
    } catch (error) {
      console.error('❌ Error fetching workout logs:', error);
      res.status(500).json({ error: 'Failed to fetch workout logs' });
    }
  });

  // Get workout historical analysis for AI-powered progression
  app.get('/api/optimize/workout/historical-analysis', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      console.log('📊 Generating workout historical analysis for user:', userId);
      
      const analysis = await analyzeWorkoutHistory(userId);
      
      console.log('📊 Analysis complete:', { 
        totalWorkouts: analysis.allTime.totalWorkouts,
        lastWeekWorkouts: analysis.lastWeek?.workoutsCompleted || 0,
        prCount: analysis.allTime.personalRecords.length
      });
      
      res.json(analysis);
    } catch (error) {
      console.error('❌ Error generating workout analysis:', error);
      res.status(500).json({ error: 'Failed to generate workout analysis' });
    }
  });

  // Delete a workout log
  app.delete('/api/optimize/workout/logs/:logId', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { logId } = req.params;

      if (!logId) {
        return res.status(400).json({ error: 'logId is required' });
      }

      // First, get the log to find its date (for daily log update)
      const allLogs = await storage.getAllWorkoutLogs(userId);
      const logToDelete = allLogs.find(log => log.id === logId);
      
      if (!logToDelete) {
        return res.status(404).json({ error: 'Workout log not found or not authorized' });
      }

      const deleted = await storage.deleteWorkoutLog(userId, logId);

      if (!deleted) {
        return res.status(404).json({ error: 'Workout log not found or not authorized' });
      }

      console.log('🗑️ Workout log deleted:', { userId, logId });

      // BUG-019 FIX: Check if any other workout logs exist for this date
      // If not, update daily log to set workoutCompleted: false
      try {
        const logDate = new Date(logToDelete.completedAt);
        const logDateStart = new Date(logDate);
        logDateStart.setHours(0, 0, 0, 0);
        const logDateEnd = new Date(logDateStart);
        logDateEnd.setHours(23, 59, 59, 999);

        // Check if any other workout logs exist for this date
        const remainingLogsForDate = allLogs.filter(log => {
          if (log.id === logId) return false; // Exclude the deleted one
          const d = new Date(log.completedAt);
          return d >= logDateStart && d <= logDateEnd;
        });

        if (remainingLogsForDate.length === 0) {
          // No more workouts for this date - update daily log
          const dailyLog = await storage.getDailyLog(userId, logDateStart);
          if (dailyLog && dailyLog.workoutCompleted) {
            await storage.updateDailyLog(dailyLog.id, { workoutCompleted: false });
            console.log('📅 Updated daily log workoutCompleted to false for:', logDateStart.toISOString().split('T')[0]);
          }
        }
      } catch (dailyLogError) {
        console.warn('⚠️ Could not update daily log after deletion (non-fatal):', dailyLogError);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error deleting workout log:', error);
      res.status(500).json({ error: 'Failed to delete workout log' });
    }
  });

  // Create detailed workout log with exercise data
  app.post('/api/optimize/workout/logs', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const {
        workoutId,
        workoutName,
        completedAt,
        durationActual,
        difficultyRating,
        exercisesCompleted,
        notes,
      } = req.body;

      console.log('📝 Creating workout log:', { userId, workoutId, completedAt, exerciseCount: exercisesCompleted?.length });
      // Log just the first exercise to verify structure without overwhelming output
      console.log('🏋️ First exercise data:', { 
        firstExercise: exercisesCompleted?.[0] ? JSON.stringify(exercisesCompleted[0]) : 'NONE',
        exerciseNames: exercisesCompleted?.map((e: any) => e.name) || []
      });

      if (!completedAt) {
        return res.status(400).json({ error: 'completedAt is required' });
      }

      const log = await storage.createWorkoutLog({
        userId,
        workoutId: workoutId || null,
        // Note: workoutName is extracted but not saved - schema doesn't have this field
        completedAt: new Date(completedAt),
        durationActual: durationActual || null,
        difficultyRating: difficultyRating || null,
        exercisesCompleted: exercisesCompleted || [],
        notes: notes || null,
      });

      console.log('✅ Workout log created:', { logId: log.id });
      console.log('📊 Stored exercises count:', { 
        storedCount: (log.exercisesCompleted as any)?.length,
        firstStored: (log.exercisesCompleted as any)?.[0] ? JSON.stringify((log.exercisesCompleted as any)[0]) : 'NONE'
      });

      // Also update daily log for backward compatibility
      try {
        const logDate = new Date(completedAt);
        logDate.setHours(0, 0, 0, 0); // Normalize to start of day
        const existingDailyLog = await storage.getDailyLog(userId, logDate);
        
        if (existingDailyLog) {
          await storage.updateDailyLog(existingDailyLog.id, {
            workoutCompleted: true,
          });
        } else {
          await storage.createDailyLog({
            userId,
            logDate,
            mealsLogged: [],
            nutritionCompleted: false,
            workoutCompleted: true,
            supplementsTaken: false,
          });
        }
      } catch (dailyLogError) {
        console.warn('⚠️ Could not update daily log (non-fatal):', dailyLogError);
        // Continue anyway - daily log is just for backward compatibility
      }

      res.json({ log });
    } catch (error) {
      console.error('❌ Error creating workout log:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      res.status(500).json({ error: 'Failed to create workout log' });
    }
  });

  // Switch/regenerate a single exercise in a workout
  app.post('/api/optimize/workout/switch', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { dayIndex, exerciseIndex, reason } = req.body;

      console.log('🔄 Switching exercise:', { userId, dayIndex, exerciseIndex, reason });

      if (dayIndex === undefined || exerciseIndex === undefined) {
        return res.status(400).json({ error: 'dayIndex and exerciseIndex are required' });
      }

      const workoutPlan = await storage.getActiveOptimizePlan(userId, 'workout');
      if (!workoutPlan) {
        console.error('❌ No workout plan found for user:', userId);
        return res.status(404).json({ error: 'No workout plan found' });
      }

      const weekPlan = (workoutPlan.content as any)?.weekPlan || [];
      if (dayIndex < 0 || dayIndex >= weekPlan.length) {
        console.error('❌ Invalid dayIndex:', dayIndex, 'weekPlan length:', weekPlan.length);
        return res.status(400).json({ error: 'Invalid dayIndex' });
      }

      const targetDay = weekPlan[dayIndex];
      if (targetDay.isRestDay) {
        return res.status(400).json({ error: 'Cannot switch exercise on a rest day' });
      }

      const exercises = targetDay.workout?.exercises || [];
      if (exerciseIndex < 0 || exerciseIndex >= exercises.length) {
        console.error('❌ Invalid exerciseIndex:', exerciseIndex, 'exercises length:', exercises.length);
        return res.status(400).json({ error: 'Invalid exerciseIndex' });
      }

      const currentExercise = exercises[exerciseIndex];
      console.log('Current exercise to replace:', currentExercise.name);

      // Get user's health profile and preferences
      const healthProfile = await storage.getHealthProfile(userId);
      const workoutPrefs = await storage.getWorkoutPreferences(userId);

      // Build prompt for AI to generate alternative exercise
      const prompt = `Generate a creative and distinct alternative exercise to replace the current one in this workout.

User Context:
- Fitness Level: ${(healthProfile as any)?.fitnessLevel || 'intermediate'}
- Equipment: ${(workoutPrefs as any)?.availableEquipment?.join(', ') || 'bodyweight, dumbbells'}
- Workout Type: ${targetDay.workout?.type || 'strength'}

${reason ? `Reason for switch: ${reason}` : ''}

Current exercise to replace:
${JSON.stringify(currentExercise, null, 2)}

Other exercises in this workout (avoid duplicates):
${exercises.filter((_: any, i: number) => i !== exerciseIndex).map((e: any) => e.name).join(', ')}

Generate ONE alternative exercise that targets similar muscle groups but uses different movement patterns or equipment.
The alternative should be distinct and not just a slight variation.
Include a short instructional snippet (notes) and the specific benefit (healthBenefits).

CRITICAL:
- Use LBS for weight.
- Use MILES for distance.

Return ONLY valid JSON in this exact format:
{
  "name": "Exercise Name",
  "type": "strength" | "cardio" | "timed",
  "sets": ${currentExercise.sets || 3},
  "reps": ${currentExercise.reps || 10},
  "weight": ${currentExercise.weight || 0},
  "tempo": "${currentExercise.tempo || '2-0-2-0'}",
  "rest": "${currentExercise.rest || '60s'}",
  "notes": "Short cue like 'Keep core tight' or 'Squeeze glutes'",
  "healthBenefits": "Specific focus like 'Postural correction' or 'Rotator cuff stability'"
}`;

      const aiSettings = await storage.getAppSetting('ai_settings');
      const settings = aiSettings?.value as any || {};
      const provider = settings.provider || process.env.AI_PROVIDER || 'openai';

      let newExercise;
      try {
        if (provider === 'anthropic') {
          const { text } = await callAnthropic(
            'You are a fitness expert. Generate creative exercise alternatives in valid JSON format.',
            [{ role: 'user', content: prompt }],
            settings.model || 'claude-sonnet-4-20250514',
            0.8, // Increased temperature for variety
            500,
            false
          );
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            newExercise = JSON.parse(jsonMatch[0]);
          }
        } else {
          const response = await openai.chat.completions.create({
            model: settings.model || 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.9, // Increased temperature for variety
          });
          newExercise = JSON.parse(response.choices[0].message.content || '{}');
        }
      } catch (aiError) {
        console.error('❌ AI generation error:', aiError);
        throw new Error('Failed to generate alternative exercise from AI');
      }

      if (!newExercise || !newExercise.name) {
        throw new Error('Failed to generate alternative exercise');
      }

      console.log('✅ Generated new exercise:', newExercise.name);

      // Update the exercise in the plan
      exercises[exerciseIndex] = newExercise;
      
      const updatedPlan = await storage.updateOptimizePlan(workoutPlan.id, {
        content: { ...(workoutPlan.content as any), weekPlan } as any,
      });

      console.log('✅ Plan updated successfully');

      res.json({ plan: updatedPlan, newExercise });
    } catch (error) {
      console.error('❌ Error switching exercise:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      res.status(500).json({ error: 'Failed to switch exercise' });
    }
  });

  // Log a workout completion (legacy endpoint - keep for backward compatibility)
  app.post('/api/optimize/workout/log', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { date, completed } = req.body;

      if (!date) {
        return res.status(400).json({ error: 'date is required' });
      }

      const logDate = new Date(date);
      if (Number.isNaN(logDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date value' });
      }

      const existingLog = await storage.getDailyLog(userId, logDate);
      let updatedLog = existingLog;

      if (existingLog) {
        updatedLog = await storage.updateDailyLog(existingLog.id, {
          workoutCompleted: Boolean(completed),
        });
      } else {
        updatedLog = await storage.createDailyLog({
          userId,
          logDate,
          mealsLogged: [],
          nutritionCompleted: false,
          workoutCompleted: Boolean(completed),
          supplementsTaken: false,
        });
      }

      res.json({
        success: true,
        log: updatedLog,
        workoutCompleted: Boolean(completed),
      });
    } catch (error) {
      console.error('❌ Error logging workout:', error);
      res.status(500).json({ error: 'Failed to log workout' });
    }
  });

  // General daily log endpoint (Quick Log)
  app.post('/api/optimize/daily-logs', requireAuth, async (req, res) => {
    console.log('🚀🚀🚀 DAILY LOG POST ROUTE HIT 🚀🚀🚀', new Date().toISOString());
    console.log('🔍 RAW BODY:', JSON.stringify(req.body));
    process.stdout.write('STDOUT: Daily log POST hit\n');
    try {
      const userId = req.userId!;
      const {
        date,
        nutritionCompleted,
        workoutCompleted,
        supplementsTaken,
        supplementMorning,
        supplementAfternoon,
        supplementEvening,
        waterIntakeOz,
        energyLevel,
        moodLevel,
        sleepQuality,
        isRestDay,
        notes,
      } = req.body ?? {};

      // Debug logging for incoming request
      console.log('📝 Daily log POST - incoming body:', {
        supplementMorning,
        supplementAfternoon,
        supplementEvening,
        isRestDay,
        userId: userId.substring(0, 8) + '...',
      });

      // Get user's timezone for correct day boundary
      const user = await storage.getUser(userId);
      const userTimezone = user?.timezone || 'America/New_York';
      const logDate = date ? new Date(date) : getUserLocalMidnight(userTimezone);
      if (Number.isNaN(logDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date value' });
      }

      const clampRating = (value: unknown) => {
        if (value === undefined || value === null || value === '') return null;
        const parsed = Number(value);
        if (Number.isNaN(parsed)) return null;
        return Math.min(5, Math.max(1, Math.round(parsed)));
      };

      const normalizeWater = (value: unknown) => {
        if (value === undefined || value === null || value === '') return null;
        const parsed = Number(value);
        if (Number.isNaN(parsed)) return null;
        return Math.max(0, Math.round(parsed));
      };

      const existingLog = await storage.getDailyLog(userId, logDate);

      // Handle granular supplement tracking
      const resolvedMorning = typeof supplementMorning === 'boolean' 
        ? supplementMorning 
        : existingLog?.supplementMorning ?? false;
      const resolvedAfternoon = typeof supplementAfternoon === 'boolean' 
        ? supplementAfternoon 
        : existingLog?.supplementAfternoon ?? false;
      const resolvedEvening = typeof supplementEvening === 'boolean' 
        ? supplementEvening 
        : existingLog?.supplementEvening ?? false;
      
      // supplementsTaken is true if any dose was taken (for backwards compatibility)
      const resolvedSupplementsTaken = typeof supplementsTaken === 'boolean'
        ? supplementsTaken
        : ((resolvedMorning || resolvedAfternoon || resolvedEvening) || (existingLog?.supplementsTaken ?? false));

      const resolvedLog = {
        nutritionCompleted: typeof nutritionCompleted === 'boolean'
          ? nutritionCompleted
          : existingLog?.nutritionCompleted ?? false,
        workoutCompleted: typeof workoutCompleted === 'boolean'
          ? workoutCompleted
          : existingLog?.workoutCompleted ?? false,
        supplementsTaken: resolvedSupplementsTaken,
        supplementMorning: resolvedMorning,
        supplementAfternoon: resolvedAfternoon,
        supplementEvening: resolvedEvening,
        isRestDay: typeof isRestDay === 'boolean'
          ? isRestDay
          : existingLog?.isRestDay ?? false,
        waterIntakeOz: normalizeWater(waterIntakeOz) ?? existingLog?.waterIntakeOz ?? null,
        energyLevel: clampRating(energyLevel) ?? existingLog?.energyLevel ?? null,
        moodLevel: clampRating(moodLevel) ?? existingLog?.moodLevel ?? null,
        sleepQuality: clampRating(sleepQuality) ?? existingLog?.sleepQuality ?? null,
        notes: typeof notes === 'string' && notes.trim().length
          ? notes.trim()
          : existingLog?.notes ?? null,
      };

      // Debug isRestDay value
      console.log('🏃 Rest Day Debug:', {
        incomingIsRestDay: isRestDay,
        existingIsRestDay: existingLog?.isRestDay,
        resolvedIsRestDay: resolvedLog.isRestDay,
      });

      let updatedLog: OptimizeDailyLog | undefined;
      if (existingLog) {
        updatedLog = await storage.updateDailyLog(existingLog.id, resolvedLog);
        console.log('📝 Daily log updated:', {
          logId: existingLog.id,
          supplementMorning: resolvedLog.supplementMorning,
          supplementAfternoon: resolvedLog.supplementAfternoon,
          supplementEvening: resolvedLog.supplementEvening,
        });
        await storage.updateUserStreak(userId, logDate);
      } else {
        updatedLog = await storage.createDailyLog({
          userId,
          logDate,
          mealsLogged: [],
          ...resolvedLog,
        });
        console.log('📝 Daily log created:', {
          logId: updatedLog?.id,
          supplementMorning: resolvedLog.supplementMorning,
          supplementAfternoon: resolvedLog.supplementAfternoon,
          supplementEvening: resolvedLog.supplementEvening,
        });
        // Also update streak when creating new log
        await storage.updateUserStreak(userId, logDate);
      }

      const streakTypes = ['overall', 'nutrition', 'workout', 'lifestyle'] as const;
      const streaks = {} as Record<typeof streakTypes[number], Awaited<ReturnType<typeof storage.getUserStreak>> | null>;
      for (const type of streakTypes) {
        streaks[type] = (await storage.getUserStreak(userId, type)) ?? null;
      }

      res.json({ success: true, log: updatedLog, streaks });
    } catch (error) {
      console.error('❌ Error saving daily log:', error);
      res.status(500).json({ error: 'Failed to save daily log' });
    }
  });

  // Swap a meal in nutrition plan
  app.post('/api/optimize/nutrition/swap-meal', requireAuth, async (req, res) => {
    try {
      const { planId, dayIndex, mealType, currentMealName, mealIndex } = req.body;
      console.log('🔄 Meal swap requested:', { userId: req.userId, planId, dayIndex, mealType, currentMealName, mealIndex });
      
      // Get the current plan
      const plan = await storage.getOptimizePlan(planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      if (plan.planType !== 'nutrition') {
        return res.status(400).json({ error: 'Can only swap meals in nutrition plans' });
      }

      // Find the current meal
      const content = plan.content as any;
      const weekPlan = content?.weekPlan || [];
      if (!Array.isArray(weekPlan) || dayIndex < 0 || dayIndex >= weekPlan.length) {
        return res.status(400).json({ error: 'Invalid day index' });
      }

      const dayPlan = weekPlan[dayIndex];
      
      // Find meal by index if provided (most accurate), then name, then type
      let currentMeal;
      if (typeof mealIndex === 'number' && dayPlan.meals?.[mealIndex]) {
        currentMeal = dayPlan.meals[mealIndex];
      } else if (currentMealName) {
        currentMeal = dayPlan.meals?.find((m: any) => m.name === currentMealName);
      } else {
        currentMeal = dayPlan.meals?.find((m: any) => m.mealType === mealType);
      }

      if (!currentMeal) {
        return res.status(404).json({ error: 'Meal not found' });
      }

      // Collect all existing meal names to avoid duplicates
      const existingMeals = new Set<string>();
      weekPlan.forEach((day: any) => {
        day.meals?.forEach((m: any) => {
          if (m.name) existingMeals.add(m.name);
        });
      });
      const avoidList = Array.from(existingMeals).join(', ');

      // Get AI settings
      const aiSettings = await storage.getAppSetting('ai_settings');
      const provider = aiSettings?.value?.provider || 'anthropic';
      const model = aiSettings?.value?.model || 'claude-sonnet-4.5';

      // Build swap prompt
      const swapPrompt = `You are a nutrition expert. The user wants to swap out this meal:

**Current Meal:**
- Type: ${currentMeal.mealType}
- Name: ${currentMeal.name}
- Calories: ${currentMeal.macros?.calories || 'N/A'}
- Protein: ${currentMeal.macros?.protein || 'N/A'}g
- Carbs: ${currentMeal.macros?.carbs || 'N/A'}g
- Fats: ${currentMeal.macros?.fats || 'N/A'}g

**User Context:**
${plan.aiRationale || 'Personalized nutrition plan'}

**Constraints:**
1. DO NOT suggest any of these meals (already in plan): ${avoidList}
2. The new meal must be COMPLETELY DIFFERENT from the current meal (different main ingredients).
3. It must match the SAME macro targets (±50 calories, ±5g protein).
4. It must fit the same meal type and time of day.
5. **SNACK RULES:** If mealType is "snack", it MUST be simple (fruit, nuts, yogurt, protein shake, etc.). NO fish, cooked meats, or complex savory dishes for snacks.

Generate ONE alternative ${mealType} meal that includes health benefits relevant to the user's goals.

Return ONLY a valid JSON object with this EXACT structure (no markdown, no code fences):
{
  "mealType": "${mealType}",
  "name": "New Meal Name",
  "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
  "macros": {
    "calories": 450,
    "protein": 35,
    "carbs": 40,
    "fats": 15
  },
  "healthBenefits": "Brief explanation of why this meal supports the user's goals"
}`;

      // Call AI
      let newMeal: any;
      if (provider === 'openai') {
        const completion = await openai.chat.completions.create({
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: swapPrompt }],
          temperature: 0.9,
          max_tokens: 800
        });
        const rawResponse = completion.choices[0]?.message?.content?.trim() || '{}';
        newMeal = parseAiJson(rawResponse);
      } else {
        // Anthropic
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const message = await anthropic.messages.create({
          model: model || 'claude-sonnet-4.5',
          max_tokens: 800,
          temperature: 0.9,
          messages: [{ role: 'user', content: swapPrompt }]
        });
        const block = message.content[0];
        const rawResponse = block.type === 'text' ? block.text : '{}';
        newMeal = parseAiJson(rawResponse);
      }

      // Validate response structure
      if (!newMeal.name || !newMeal.macros || !newMeal.ingredients) {
        throw new Error('Invalid AI response structure');
      }

      // Update the plan
      const updatedWeekPlan = weekPlan.map((day: any, idx: number) => {
        if (idx !== dayIndex) return day;
        
        // If we have a specific meal index, use that directly (most accurate)
        if (typeof mealIndex === 'number' && day.meals[mealIndex]) {
          const newMeals = [...day.meals];
          newMeals[mealIndex] = newMeal;
          return { ...day, meals: newMeals };
        }

        return {
          ...day,
          meals: day.meals.map((m: any) => {
            // If we have a specific meal name, match by that
            if (currentMealName) {
              return m.name === currentMealName ? newMeal : m;
            }
            // Fallback to matching by type (legacy)
            return m.mealType === mealType ? newMeal : m;
          })
        };
      });

      const updatedContent = {
        ...(plan.content as any),
        weekPlan: updatedWeekPlan
      };

      await storage.updateOptimizePlan(planId, {
        content: updatedContent
      });

      console.log('✅ Meal swapped successfully:', newMeal.name);
      res.json({ 
        success: true,
        meal: newMeal,
        message: 'Meal swapped successfully'
      });
    } catch (error) {
      console.error('❌ Error swapping meal:', error);
      res.status(500).json({ error: 'Failed to swap meal' });
    }
  });

  app.post('/api/optimize/nutrition/recipe', requireAuth, async (req, res) => {
    try {
      const { mealName, ingredients, dietaryRestrictions } = req.body;
      
      if (!mealName) {
        return res.status(400).json({ error: 'Meal name is required' });
      }

      console.log('👨‍🍳 Generating recipe for:', mealName);

      // Get AI settings
      const aiSettings = await storage.getAppSetting('ai_settings');
      const provider = aiSettings?.value?.provider || 'anthropic';
      const model = aiSettings?.value?.model || 'claude-sonnet-4.5';

      const prompt = buildRecipePrompt(mealName, ingredients || [], dietaryRestrictions || []);

      let recipe: any;
      if (provider === 'openai') {
        const completion = await openai.chat.completions.create({
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000
        });
        const rawResponse = completion.choices[0]?.message?.content?.trim() || '{}';
        recipe = parseAiJson(rawResponse);
      } else {
        // Anthropic
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const message = await anthropic.messages.create({
          model: model || 'claude-sonnet-4.5',
          max_tokens: 1000,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }]
        });
        const block = message.content[0];
        const rawResponse = block.type === 'text' ? block.text : '{}';
        recipe = parseAiJson(rawResponse);
      }

      res.json(recipe);
    } catch (error) {
      console.error('❌ Error generating recipe:', error);
      res.status(500).json({ error: 'Failed to generate recipe' });
    }
  });

  // Grocery list endpoints
  app.get('/api/optimize/grocery-list', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const list = await storage.getActiveGroceryList(userId);
      res.json(list || null);
    } catch (error) {
      console.error('❌ Error fetching grocery list:', error);
      res.status(500).json({ error: 'Failed to fetch grocery list' });
    }
  });

  app.post('/api/optimize/grocery-list/generate', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const plan = await storage.getActiveOptimizePlan(userId, 'nutrition');
      if (!plan || !plan.content) {
        return res.status(400).json({ error: 'Generate a nutrition plan before creating a grocery list' });
      }

      // Use AI to generate a smart, categorized grocery list
      const content = plan.content as any;
      const weekPlan = content.weekPlan || [];
      
      let mealsText = '';
      weekPlan.forEach((day: any) => {
        mealsText += `\nDay ${day.day} (${day.dayName}):\n`;
        day.meals?.forEach((meal: any) => {
          const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : '';
          mealsText += `- ${meal.name}: ${ingredients}\n`;
        });
      });

      console.log('🥦 Generating grocery list for plan:', plan.id);

      const prompt = `
You are a smart nutritionist assistant creating a PRACTICAL grocery shopping list.
The user needs to buy actual items/packages at the store, not individual tablespoons of ingredients.

RULES:
1. **Consolidate items** into purchasable units (e.g., "1 jar", "1 bag", "1 carton", "1 bottle").
2. **NO small measurements** like "tbsp", "tsp", "oz", or "cups" unless it's for produce count (e.g. "5 apples").
3. **Round up** to standard package sizes.
   - BAD: "2 tbsp Honey", "1/4 cup Pumpkin Seeds", "3 tbsp Olive Oil"
   - GOOD: "Honey (1 jar)", "Pumpkin Seeds (1 bag)", "Olive Oil (1 bottle)"
4. **Group items** by category (Produce, Meat/Seafood, Dairy/Eggs, Pantry, Bakery, Frozen, Other).
5. **Combine duplicates** intelligently (e.g. if 3 meals need eggs, list "Eggs (1 dozen)").

Meal Plan:
${mealsText}

Return a JSON object with this structure:
{
  "items": [
    {
      "item": "Eggs",
      "amount": "1",
      "unit": "dozen",
      "category": "Dairy/Eggs"
    },
    {
      "item": "Honey",
      "amount": "1",
      "unit": "jar",
      "category": "Pantry"
    }
  ]
}
IMPORTANT: Return ONLY valid JSON. No markdown formatting.
`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0].message.content || '{}';
      const parsed = JSON.parse(responseContent);
      
      const items = (parsed.items || []).map((item: any) => ({
        id: nanoid(8),
        item: item.item,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        checked: false
      }));

      if (items.length === 0) {
        // Fallback to old method if AI fails
        console.log('⚠️ AI returned empty list, falling back to simple extraction');
        const fallbackItems = buildGroceryItemsFromPlanContent(plan.content);
        if (fallbackItems.length > 0) {
          items.push(...fallbackItems);
        } else {
           return res.status(422).json({ error: 'Could not generate grocery list from this plan.' });
        }
      }

      const existingList = await storage.getActiveGroceryList(userId);
      const list = existingList
        ? await storage.updateGroceryList(existingList.id, {
            optimizePlanId: plan.id,
            items,
            generatedAt: new Date(),
            isArchived: false,
          })
        : await storage.createGroceryList({
            userId,
            optimizePlanId: plan.id,
            items,
            generatedAt: new Date(),
            isArchived: false,
          });

      res.json(list);
    } catch (error) {
      console.error('❌ Error generating grocery list:', error);
      res.status(500).json({ error: 'Failed to generate grocery list' });
    }
  });

  app.patch('/api/optimize/grocery-list/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const listId = req.params.id;
      const list = await storage.getGroceryList(listId);

      if (!list || list.userId !== userId) {
        return res.status(404).json({ error: 'Grocery list not found' });
      }

      const updates: any = {};
      if (Array.isArray(req.body.items)) {
        updates.items = req.body.items;
      }
      if (typeof req.body.isArchived === 'boolean') {
        updates.isArchived = req.body.isArchived;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const updated = await storage.updateGroceryList(listId, updates);
      res.json(updated);
    } catch (error) {
      console.error('❌ Error updating grocery list:', error);
      res.status(500).json({ error: 'Failed to update grocery list' });
    }
  });

  // Twilio Webhook for SMS Replies
  app.post('/api/webhooks/twilio/sms', async (req, res) => {
    try {
      const { From: phoneNumber, Body: body } = req.body;
      console.log(`📩 Received SMS from ${phoneNumber}: ${body}`);
      
      const user = await storage.getUserByPhone(phoneNumber);
      if (!user) {
        console.log(`❌ User not found for phone ${phoneNumber}`);
        return res.status(404).send('User not found');
      }
      
      const response = body.trim().toUpperCase();
      const today = new Date();
      
      let nutritionCompleted = false;
      let workoutCompleted = false;
      
      if (response === 'YES' || response === 'DONE') {
        nutritionCompleted = true;
        workoutCompleted = true;
      } else if (response === 'NUTRITION') {
        nutritionCompleted = true;
      } else if (response === 'WORKOUT') {
        workoutCompleted = true;
      } else if (response === 'SKIP') {
        // Log nothing, just acknowledge
      } else {
        // Unknown command
        return res.sendStatus(200);
      }
      
      if (nutritionCompleted || workoutCompleted) {
        const existingLog = await storage.getDailyLog(user.id, today);
        
        if (existingLog) {
          await storage.updateDailyLog(existingLog.id, {
            nutritionCompleted: nutritionCompleted || existingLog.nutritionCompleted,
            workoutCompleted: workoutCompleted || existingLog.workoutCompleted,
            notes: existingLog.notes ? `${existingLog.notes}\nAuto-logged via SMS: ${response}` : `Auto-logged via SMS: ${response}`
          });
        } else {
          await storage.createDailyLog({
            userId: user.id,
            logDate: today,
            nutritionCompleted,
            workoutCompleted,
            supplementsTaken: false, // They'll update via app
            waterIntakeOz: null,
            energyLevel: null,
            moodLevel: null,
            sleepQuality: null,
            notes: `Auto-logged via SMS reply: ${response}`
          });
        }
      }
      
      const confirmMessage = response === 'SKIP' 
        ? `No worries! Tomorrow's a fresh start 💪`
        : `✅ Logged! Keep up the great work 🔥`;
      
      await sendRawSms(phoneNumber, confirmMessage);
      
      res.sendStatus(200);
    } catch (error) {
      console.error('Error handling SMS webhook:', error);
      res.sendStatus(500);
    }
  });

  // YouTube Search API (No API Key required via scraping)
  app.get('/api/integrations/youtube/search', async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      // Search for multiple videos and randomly select one for variety
      // Handle ESM/CommonJS interop issues with youtube-sr
      const searchFn = (YouTube as any).search || (YouTube as any).default?.search;
      
      if (typeof searchFn !== 'function') {
        throw new Error('YouTube.search is not a function');
      }

      const videos = await searchFn(query, { limit: 10 });
      
      if (videos && videos.length > 0) {
        // Randomly select a video from results for variety
        const randomIndex = Math.floor(Math.random() * videos.length);
        const video = videos[randomIndex];
        res.json({
          videoId: video.id,
          title: video.title,
          thumbnail: video.thumbnail?.url,
          duration: video.durationFormatted,
          channel: video.channel?.name
        });
      } else {
        res.status(404).json({ error: 'No videos found' });
      }
    } catch (error) {
      console.error('YouTube search error:', error);
      res.status(500).json({ error: 'Failed to search YouTube' });
    }
  });

  // Workout Analytics
  app.get('/api/optimize/analytics/workout', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const logs = await storage.getAllWorkoutLogs(userId);

      // Helper to identify muscle groups from exercise name
      function identifyMuscleGroup(exerciseName: string): string[] {
        const name = exerciseName.toLowerCase();
        const groups: string[] = [];
        
        // Chest
        if (name.includes('bench') || name.includes('push-up') || name.includes('pushup') || name.includes('push up') || 
            name.includes('chest') || name.includes('fly') || name.includes('pec') || name.includes('dip')) {
          groups.push('Chest');
        }
        // Shoulders
        if (name.includes('shoulder') || name.includes('press') || name.includes('lateral') || name.includes('delt') || 
            name.includes('overhead') || name.includes('raise') || name.includes('military')) {
          groups.push('Shoulders');
        }
        // Back
        if (name.includes('row') || name.includes('pull') || name.includes('lat') || name.includes('back') || 
            name.includes('chin') || name.includes('shrug')) {
          groups.push('Back');
        }
        // Biceps
        if (name.includes('curl') || name.includes('bicep')) {
          groups.push('Biceps');
        }
        // Triceps
        if (name.includes('tricep') || name.includes('extension') || name.includes('pushdown') || name.includes('skull')) {
          groups.push('Triceps');
        }
        // Quads/Legs
        if (name.includes('squat') || name.includes('leg') || name.includes('quad') || name.includes('lunge') || 
            name.includes('jump') || name.includes('step') || name.includes('knee') || name.includes('sled')) {
          groups.push('Legs');
        }
        // Hamstrings
        if (name.includes('deadlift') || name.includes('hamstring') || name.includes('rdl') || name.includes('good morning')) {
          groups.push('Hamstrings');
        }
        // Calves
        if (name.includes('calf') || name.includes('calves')) {
          groups.push('Calves');
        }
        // Glutes
        if (name.includes('glute') || name.includes('hip thrust') || name.includes('bridge')) {
          groups.push('Glutes');
        }
        // Core
        if (name.includes('ab') || name.includes('core') || name.includes('plank') || name.includes('crunch') || 
            name.includes('twist') || name.includes('sit-up') || name.includes('situp') || name.includes('hollow')) {
          groups.push('Core');
        }
        // Olympic/Power lifts - Full Body
        if (name.includes('clean') || name.includes('snatch') || name.includes('jerk') || name.includes('thruster')) {
          groups.push('Full Body');
        }
        
        // Skip warmups/cooldowns - don't count them as "Other"
        if (name.includes('warmup') || name.includes('warm-up') || name.includes('warm up') || 
            name.includes('cooldown') || name.includes('cool-down') || name.includes('cool down') ||
            name.includes('stretch') || name.includes('pose') || name.includes('mobility')) {
          // Return the groups found, or skip entirely if none
          return groups.length > 0 ? groups : [];
        }
        
        return groups.length > 0 ? groups : ['Other'];
      }

      // Process logs for analytics
      const volumeByWeek: Record<string, number> = {};
      const personalRecords: Record<string, { weight: number, date: string }> = {};
      const workoutsByWeek: Record<string, number> = {};
      const exerciseCounts: Record<string, number> = {};
      const muscleGroupCounts: Record<string, number> = {};
      
      // Calculate Duration this week
      const currentWeekStart = startOfWeek(new Date());
      let durationThisWeek = 0;

      logs.forEach(log => {
        const date = new Date(log.completedAt);
        const weekStart = format(startOfWeek(date), 'yyyy-MM-dd');
        
        // Duration this week
        if (date >= currentWeekStart) {
          durationThisWeek += (log.durationActual || 0);
        }

        // Volume & PRs
        let logVolume = 0;
        const exercises = log.exercisesCompleted as any;
        
        if (exercises && Array.isArray(exercises)) {
          exercises.forEach((ex: any) => {
            // Track exercise frequency
            exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;
            
            // Track muscle group counts
            const muscleGroups = identifyMuscleGroup(ex.name);
            muscleGroups.forEach(group => {
              muscleGroupCounts[group] = (muscleGroupCounts[group] || 0) + 1;
            });

            if (ex.sets && Array.isArray(ex.sets)) {
              ex.sets.forEach((set: any) => {
                const weight = Number(set.weight) || 0;
                const reps = Number(set.reps) || 0;
                logVolume += weight * reps;

                // Check PR
                if (weight > 0) {
                  if (!personalRecords[ex.name] || weight > personalRecords[ex.name].weight) {
                    personalRecords[ex.name] = { weight, date: log.completedAt.toISOString() };
                  }
                }
              });
            }
          });
        }

        volumeByWeek[weekStart] = (volumeByWeek[weekStart] || 0) + logVolume;
        workoutsByWeek[weekStart] = (workoutsByWeek[weekStart] || 0) + 1;
      });

      // Format Volume Chart Data
      // Ensure we have data points for recent weeks even if volume is 0
      const today = new Date();
      const weeksToShow = 8;
      const volumeChartData = [];
      
      for (let i = weeksToShow - 1; i >= 0; i--) {
        const d = subWeeks(today, i);
        const weekStart = format(startOfWeek(d), 'yyyy-MM-dd');
        volumeChartData.push({
          date: weekStart,
          volume: volumeByWeek[weekStart] || 0
        });
      }

      // Format Consistency Data
      const consistencyData = [];
      for (let i = weeksToShow - 1; i >= 0; i--) {
        const d = subWeeks(today, i);
        const weekStart = format(startOfWeek(d), 'yyyy-MM-dd');
        consistencyData.push({
          week: weekStart,
          count: workoutsByWeek[weekStart] || 0
        });
      }

      // Calculate Daily Streak
      let currentStreak = 0;
      if (logs.length > 0) {
        // Sort logs by date descending
        const sortedLogs = [...logs].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        
        const today = new Date();
        const lastWorkoutDate = new Date(sortedLogs[0].completedAt);
        
        // Check if streak is active (workout today or yesterday)
        // Using start of day for comparison to be safe
        const todayStart = new Date(today.setHours(0,0,0,0));
        const lastWorkoutStart = new Date(new Date(lastWorkoutDate).setHours(0,0,0,0));
        
        if (differenceInDays(todayStart, lastWorkoutStart) <= 1) {
          currentStreak = 1;
          let currentDate = lastWorkoutStart;
          
          // Iterate through logs to find consecutive days
          for (let i = 1; i < sortedLogs.length; i++) {
            const logDate = new Date(sortedLogs[i].completedAt);
            const logDateStart = new Date(new Date(logDate).setHours(0,0,0,0));
            
            if (isSameDay(currentDate, logDateStart)) {
              continue; // Multiple workouts on same day
            }
            
            if (differenceInDays(currentDate, logDateStart) === 1) {
              currentStreak++;
              currentDate = logDateStart;
            } else {
              break; // Streak broken
            }
          }
        }
      }

      // Top Exercises
      const topExercises = Object.entries(exerciseCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Muscle Group Breakdown
      const muscleGroupBreakdown = Object.entries(muscleGroupCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      res.json({
        volumeChartData,
        personalRecords,
        consistencyData,
        currentStreak,
        totalWorkouts: logs.length,
        topExercises,
        durationThisWeek,
        muscleGroupBreakdown
      });

    } catch (error) {
      console.error('Error fetching workout analytics:', error);
      res.status(500).json({ error: 'Failed to fetch workout analytics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

