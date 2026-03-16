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
    'Pete is the founder and CEO of Ones, a health technology company rethinking how people approach supplements. Ones uses AI to help people create a personalized daily supplement formula based on their individual health data — including blood work and wearable metrics — instead of relying on generic multivitamins. The platform offers over 200 ingredients at researched doses, tailored to each person.',

  bioLong:
    `Pete is the founder and CEO of Ones, a health technology company working to make personalized nutrition more accessible. After spending years navigating the supplement aisle — sorting through conflicting advice and generic products — he started building something that could do better.

Ones uses a conversational AI to understand each person's health goals, history, and biology. By looking at lab results, health background, and biometric data from wearables like Oura, Whoop, and Fitbit, the platform creates a single custom supplement formula tailored to the individual.

The ingredient catalog includes over 200 individually-dosed compounds and 18 system blends covering areas like adrenal support, cardiovascular health, and more. Each formula can be updated as new health data comes in.

Pete's goal is simple: your supplement should work for you specifically, not be a guess. Ones brings the kind of personalization you'd get from a functional medicine practitioner, but makes it more accessible and affordable.`,

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
    'Why one-size-fits-all supplements often miss the mark for individuals',
    'How health data (blood work, wearables) can inform better supplement choices',
    'The idea of a supplement that adapts as your health data changes',
    'Making personalized nutrition more accessible and affordable',
    'Why ingredient doses matter and what "proprietary blend" labels actually mean',
    'The role AI can play in analyzing health data for personalization',
    'Privacy-first approach to handling health data',
    'Moving from reactive healthcare toward proactive health habits',
  ],

  uniqueAngles: [
    'Founder story: frustrated with generic supplements, started building something more personalized',
    'Tech angle: using AI to help people understand what supplements actually make sense for their body',
    'Data angle: integrating wearable data so your supplement routine can adapt as you change',
    'Personalization: making individual-level supplement formulation more accessible',
    'Health equity: bringing personalized nutrition beyond expensive functional medicine offices',
    'Transparency angle: honest dosing vs. hidden "proprietary blends"',
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
