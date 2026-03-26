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
    'Pete is the founder of Ones. People either buy 10 different supplement bottles hoping they get it right, overdosing, underdosing, lower quality ingredients, or they go the AG1/multivitamin route which is completely generic. Ones uses AI to analyze your blood work, health data, and wearable metrics to design one custom supplement from over 150 ingredients at research-backed doses, and it adapts as your health changes.',

  bioMedium:
    'Pete is the founder and CEO of Ones. Right now people are stuck between two bad options: buying a stack of 10+ supplement bottles, guessing at what they need, often getting lower quality ingredients, overdosing on some things and underdosing on others. Or going the AG1/daily multivitamin route, which is convenient but completely generic with zero customization. Ones solves both problems. Our AI analyzes your blood work, health data, and wearable metrics to design one custom supplement from over 150 ingredients at research-backed doses, built for your body and adapting as your health data changes.',

  bioLong:
    `Pete is the founder and CEO of Ones. Like a lot of people, he was stuck between two bad options. He was buying 10 different supplement bottles, guessing at what he needed, overdosing on some things, underdosing on others, spending a fortune without knowing if any of it was actually right for his body. The ingredients were often lower quality, the doses were arbitrary, and the whole thing felt like an expensive guessing game.

The alternative wasn't much better. Products like AG1 or daily multivitamins offer a single generic blend. Convenient, sure, but completely one-size-fits-all. Zero customization, nothing personalized to his individual health. It's designed for an "average person" that doesn't exist.

So he built Ones to solve both. The platform uses AI to analyze your individual blood work, health data, and wearable metrics from devices like Oura, Whoop, and Fitbit. The AI selects from over 150 ingredients at research-backed doses and designs one custom supplement built specifically for your body. No more guessing with a stack of bottles, no more settling for a generic blend.

And it's not static. As new health data comes in, updated labs, changing biometrics, the AI adapts your supplement so it evolves with you.`,

  headshotUrl: '', // TODO: add when available
  pressKitUrl: '', // TODO: add when available

  topicExpertise: [
    'AI-powered personalized nutrition',
    'The future of personalized supplements',
    'Wearable data integration for health optimization',
    'Building health tech startups',
    'Preventive health vs. reactive medicine',
    'Lab-based supplement customization',
    'The supplement industry\'s transparency problem',
    'Biohacking and self-optimization',
  ],

  talkingPoints: [
    'There are two sides of the supplement problem: people either buy 10+ bottles hoping they get it right, overdosing, underdosing, lower quality ingredients, or they go the AG1/multivitamin route which is completely generic with zero customization',
    'The DIY stacker is guessing. They don\'t know if the ingredients are right, the doses are right, or if any of it is actually designed for their body',
    'The one-size-fits-all products like AG1 or daily multivitamins are convenient but designed for an "average person" that doesn\'t exist. Nothing personalized to the individual',
    'Ones solves both: our AI analyzes your blood work, health data, and wearable metrics to design one custom supplement from over 150 ingredients at research-backed doses',
    'Your supplement isn\'t static. The AI adapts it as your health data changes, so it actually evolves with you',
    'Why ingredient doses matter and what "proprietary blend" labels are really hiding',
    'Making the kind of personalization you\'d get from a $500/hr functional medicine practitioner accessible to everyone',
    'Moving from reactive healthcare toward proactive, data-driven health habits',
  ],

  uniqueAngles: [
    'Founder story: I was buying 10 different bottles AND looked at AG1. Neither was actually built for my body, so I built something that is',
    'The two-sided problem: people are either guessing with a stack of bottles (overdosing, underdosing, low quality) OR settling for a generic one-size-fits-all blend with zero customization',
    'Data angle: your supplement isn\'t a one-time thing. The AI adapts it as your blood work, wearable data, and health goals change',
    'Why AG1 and multivitamins are designed for an "average person" that doesn\'t exist, and why that matters',
    'Transparency angle: honest dosing with 150+ individually-dosed ingredients vs. hidden "proprietary blends" full of fillers',
    'The end of guessing: AI turns your actual health data into the right ingredients at the right doses for YOUR body',
  ],

  credentials: [
    'Founder & CEO of Ones (ones.health)',
    'Built AI that analyzes health data to design custom supplements from 150+ ingredients',
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
