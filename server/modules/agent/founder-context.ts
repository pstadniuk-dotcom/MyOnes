/**
 * Founder Context — Pete's profile, bio, talking points, and pitch angles
 *
 * This is the "personality" that the PR agent uses when drafting pitches.
 * Admin can override these from the UI; this file provides defaults.
 */
import { agentRepository } from './agent.repository';

const FOUNDER_KEY = 'pr_founder_profile';

export interface FounderProfile {
  name: string;
  title: string;
  company: string;
  companyUrl: string;
  email: string;

  // Bios of different lengths
  bioShort: string;      // 1-2 sentences
  bioMedium: string;     // 1 paragraph
  bioLong: string;       // 3-4 paragraphs

  // Headshot / press kit
  headshotUrl: string;
  pressKitUrl: string;

  // What Pete can talk about
  topicExpertise: string[];
  talkingPoints: string[];
  uniqueAngles: string[];

  // Social proof
  credentials: string[];
  mediaAppearances: string[];

  // What to avoid
  doNotMention: string[];
}

const DEFAULT_PROFILE: FounderProfile = {
  name: 'Pete',
  title: 'Founder & CEO',
  company: 'Ones',
  companyUrl: 'https://ones.health',
  email: 'pete@ones.health',

  bioShort:
    'Pete is the founder of Ones, a personalized supplement platform that uses AI to create custom daily formulas based on individual health data, lab results, and wearable metrics.',

  bioMedium:
    'Pete is the founder and CEO of Ones, a health technology company reimagining how people take supplements. Ones uses conversational AI to analyze individual health profiles, blood work, and real-time wearable data to create one truly personalized daily supplement formula — replacing the guesswork of generic multivitamins with science-backed, precision-dosed formulations. With a catalog of over 200 ingredients and proprietary system blends, Ones delivers measurable health outcomes through continuous optimization.',

  bioLong:
    `Pete is the founder and CEO of Ones, a health technology company on a mission to make personalized nutrition accessible to everyone. After years of navigating the overwhelming supplement industry — where conflicting advice and one-size-fits-all products dominate — Pete built Ones to solve the problem at its root.

Ones uses a conversational AI practitioner to deeply understand each user's health goals, challenges, and biology. By analyzing lab results, health history, and real-time biometric data from wearables like Oura, Whoop, and Fitbit, the platform creates a single, custom-formulated daily supplement tailored to the individual.

The platform's ingredient catalog includes over 200 individually-dosed compounds and 18 proprietary system blends covering everything from adrenal support to cardiovascular health. Each formula is continuously optimized as new health data comes in, creating a feedback loop between supplementation and measurable outcomes.

Pete's vision is a world where your supplement adapts to you — not the other way around. Ones represents the intersection of AI, personalized medicine, and preventive health, making clinical-grade formulation available outside of expensive functional medicine practices.`,

  headshotUrl: '', // TODO: add when available
  pressKitUrl: '', // TODO: add when available

  topicExpertise: [
    'AI-powered personalized nutrition',
    'The future of supplement formulation',
    'Wearable data integration for health optimization',
    'Building health tech startups',
    'Preventive health vs. reactive medicine',
    'Lab-based supplement customization',
    'The supplement industry\'s transparency problem',
    'Biohacking and self-optimization',
  ],

  talkingPoints: [
    'Why generic multivitamins don\'t work — the one-size-fits-all problem',
    'How AI can analyze blood work better than most practitioners',
    'The feedback loop: wearable data → formula adjustments → measurable results',
    'Making clinical-grade personalization affordable (not just for the wealthy)',
    'Over 200 ingredients at precise therapeutic doses — not fairy-dusted formulas',
    'Why your supplement should change as you change',
    'Privacy-first AI health conversations — encrypted data handling',
    'The shift from reactive healthcare to proactive health management',
  ],

  uniqueAngles: [
    'Founder story: frustrated with generic supplements → built an AI to fix it',
    'Tech angle: how we use GPT-4o and Claude to be an AI health practitioner',
    'Data angle: real-time wearable integration creating a health feedback loop',
    'Industry disruption: challenging the $50B supplement industry\'s status quo',
    'Health equity: making personalized nutrition accessible beyond elite biohackers',
    'Science angle: therapeutic dosing vs. the "proprietary blend" scam',
  ],

  credentials: [
    'Founder & CEO of Ones (ones.health)',
    'Built AI system analyzing 200+ supplement ingredients',
    'Platform integrates with Oura, Whoop, Fitbit for real-time optimization',
    'Encrypted, privacy-first health data handling',
  ],

  mediaAppearances: [
    // Populate as appearances happen
  ],

  doNotMention: [
    'Specific user health data or case studies without consent',
    'Medical claims or diagnosis language (we are a supplement, not medicine)',
    'Competitor bashing — stay positive and educational',
  ],
};

/**
 * Get the current founder profile for pitch generation.
 */
export async function getFounderProfile(): Promise<FounderProfile> {
  const saved = await agentRepository.getAgentConfig(FOUNDER_KEY);
  if (!saved) return { ...DEFAULT_PROFILE };
  return { ...DEFAULT_PROFILE, ...saved } as FounderProfile;
}

/**
 * Save updated founder profile.
 */
export async function saveFounderProfile(
  profile: Partial<FounderProfile>,
  updatedBy?: string,
): Promise<FounderProfile> {
  const current = await getFounderProfile();
  const merged = { ...current, ...profile };
  await agentRepository.saveAgentConfig(FOUNDER_KEY, merged, updatedBy);
  return merged;
}

/**
 * Get default profile (for reset).
 */
export function getDefaultProfile(): FounderProfile {
  return { ...DEFAULT_PROFILE };
}
