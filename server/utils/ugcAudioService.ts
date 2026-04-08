/**
 * UGC Audio Service
 *
 * TTS providers (in priority order):
 * 1. ElevenLabs — high-quality, natural-sounding voices with emotion control
 * 2. OpenAI TTS-1-HD — decent fallback with 6 built-in voices
 *
 * After TTS, uses fal.ai Sync LipSync to re-render lip movements in the
 * Kling video to match the audio — producing realistic lip sync.
 */

import OpenAI from 'openai';
import { fal } from '@fal-ai/client';
import { logger } from '../infra/logging/logger';
import { uploadBufferToSupabase, uploadToSupabase } from './ugcService';

// ── Voice types ─────────────────────────────────────────────────────────────

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
export type OpenAIVoice = typeof OPENAI_VOICES[number];

// Popular ElevenLabs pre-made voice IDs (curated for UGC content)
const ELEVENLABS_PRESET_VOICES: Record<string, { name: string; description: string }> = {
  '21m00Tcm4TlvDq8ikWAM': { name: 'Rachel', description: 'Calm, young female — great for wellness/health' },
  'EXAVITQu4vr4xnSDxMaL': { name: 'Sarah', description: 'Soft, friendly female — approachable testimonials' },
  'ErXwobaYiN019PkySvjV': { name: 'Antoni', description: 'Young male, warm and conversational' },
  'VR6AewLTigWG4xSOukaG': { name: 'Arnold', description: 'Confident male — authority/expertise tone' },
  'pNInz6obpgDQGcFmaJgB': { name: 'Adam', description: 'Deep male voice — trust and credibility' },
  'yoZ06aMxZJJ28mfd3POQ': { name: 'Sam', description: 'Energetic young male — casual/excited delivery' },
  'jBpfuIE2acCO8z3wKNLl': { name: 'Gigi', description: 'Upbeat female — perfect for TikTok energy' },
  'XB0fDUnXU5powFXDhCwa': { name: 'Charlotte', description: 'Mature female — premium/sophisticated' },
  'onwK4e9ZLuTAKqWW03F9': { name: 'Daniel', description: 'British male — authoritative explainers' },
  'N2lVS1w4EtoT3dr4eOWO': { name: 'Callum', description: 'Casual male — friend-to-friend recommendations' },
};

export type TTSProvider = 'elevenlabs' | 'openai';

export function isValidVoice(voice: string): boolean {
  return OPENAI_VOICES.includes(voice as OpenAIVoice) ||
    voice in ELEVENLABS_PRESET_VOICES ||
    /^[a-zA-Z0-9]{20,}$/.test(voice); // custom ElevenLabs voice ID
}

export function getAvailableVoices(): Array<{ id: string; name: string; provider: TTSProvider; description: string }> {
  const voices: Array<{ id: string; name: string; provider: TTSProvider; description: string }> = [];

  // ElevenLabs voices first (higher quality)
  if (process.env.ELEVENLABS_API_KEY) {
    for (const [id, info] of Object.entries(ELEVENLABS_PRESET_VOICES)) {
      voices.push({ id, name: info.name, provider: 'elevenlabs', description: info.description });
    }
  }

  // OpenAI voices as fallback
  for (const v of OPENAI_VOICES) {
    voices.push({ id: v, name: v.charAt(0).toUpperCase() + v.slice(1), provider: 'openai', description: `OpenAI ${v}` });
  }

  return voices;
}

function detectProvider(voice: string): TTSProvider {
  if (OPENAI_VOICES.includes(voice as OpenAIVoice)) return 'openai';
  return 'elevenlabs';
}

// ── ElevenLabs TTS ──────────────────────────────────────────────────────────

async function generateElevenLabsTTS(input: {
  text: string;
  voiceId: string;
  speed?: number;
}): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

  const voiceId = input.voiceId;

  logger.info(`[ugc-audio] ElevenLabs TTS: voice=${voiceId}, text="${input.text.substring(0, 50)}..."`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: input.text,
      model_id: 'eleven_turbo_v2_5', // fastest high-quality model
      voice_settings: {
        stability: 0.5,        // 0 = more expressive, 1 = more stable
        similarity_boost: 0.75, // how close to original voice
        style: 0.4,            // style exaggeration (0-1)
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText}`);
  }

  const buf = Buffer.from(await response.arrayBuffer());
  logger.info(`[ugc-audio] ElevenLabs TTS generated: ${buf.length} bytes`);
  return buf;
}

/**
 * Fetch available voices from your ElevenLabs account (includes cloned voices).
 */
export async function fetchElevenLabsVoices(): Promise<Array<{
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string | null;
  labels: Record<string, string>;
}>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!response.ok) throw new Error(`${response.status}`);
    const data = await response.json();

    return (data.voices || []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category || 'premade',
      description: v.labels?.description || v.labels?.accent || '',
      preview_url: v.preview_url || null,
      labels: v.labels || {},
    }));
  } catch (err: any) {
    logger.warn(`[ugc-audio] Failed to fetch ElevenLabs voices: ${err.message}`);
    return [];
  }
}

// ── OpenAI TTS ──────────────────────────────────────────────────────────────

async function generateOpenAITTS(input: {
  text: string;
  voice: OpenAIVoice;
  speed: number;
}): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });

  logger.info(`[ugc-audio] OpenAI TTS: voice=${input.voice}, speed=${input.speed}`);

  const response = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: input.voice,
    input: input.text,
    speed: input.speed,
    response_format: 'mp3',
  });

  const buf = Buffer.from(await response.arrayBuffer());
  logger.info(`[ugc-audio] OpenAI TTS generated: ${buf.length} bytes`);
  return buf;
}

// ── Unified TTS ─────────────────────────────────────────────────────────────

/**
 * Generate TTS audio using the best available provider.
 * - If voice is an ElevenLabs ID and key is configured → ElevenLabs
 * - If voice is an OpenAI voice name → OpenAI
 * - If voice is an ElevenLabs ID but no key → falls back to OpenAI 'nova'
 *
 * When targetDurationSeconds is provided, auto-adjusts speed for OpenAI
 * (ElevenLabs handles pacing more naturally).
 */
export async function generateTTSAudio(input: {
  text: string;
  voice?: string;
  speed?: number;
  targetDurationSeconds?: number;
}): Promise<{ audioBuffer: Buffer; voice: string; speed: number; estimatedDuration: number; provider: TTSProvider }> {
  const { calculateOptimalTTSSpeed } = await import('./ugcVideoAssemblyService');

  const voice = input.voice || (process.env.ELEVENLABS_API_KEY ? '21m00Tcm4TlvDq8ikWAM' : 'nova'); // Rachel or nova
  const provider = detectProvider(voice);
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;

  // Calculate speed for duration fitting
  let speed = input.speed || 1.0;
  let estimatedDuration: number;

  if (input.targetDurationSeconds && !input.speed) {
    const optimal = calculateOptimalTTSSpeed(input.text, input.targetDurationSeconds);
    speed = optimal.speed;
    estimatedDuration = optimal.estimatedDuration;

    if (!optimal.fits) {
      logger.warn(`[ugc-audio] Dialogue may not fit in ${input.targetDurationSeconds}s even at ${speed}x: "${input.text.substring(0, 60)}..."`);
    }
  } else {
    estimatedDuration = (input.text.trim().split(/\s+/).length / 2.5) / speed;
  }

  speed = Math.max(0.25, Math.min(4.0, speed));

  let audioBuffer: Buffer;
  let usedProvider: TTSProvider;

  // Try ElevenLabs first if available and voice matches
  if (provider === 'elevenlabs' && hasElevenLabs) {
    try {
      audioBuffer = await generateElevenLabsTTS({
        text: input.text,
        voiceId: voice,
        speed,
      });
      usedProvider = 'elevenlabs';
    } catch (err: any) {
      logger.warn(`[ugc-audio] ElevenLabs failed, falling back to OpenAI: ${err.message}`);
      audioBuffer = await generateOpenAITTS({
        text: input.text,
        voice: 'nova',
        speed,
      });
      usedProvider = 'openai';
    }
  } else {
    // OpenAI path
    const openaiVoice = OPENAI_VOICES.includes(voice as OpenAIVoice) ? (voice as OpenAIVoice) : 'nova';
    audioBuffer = await generateOpenAITTS({
      text: input.text,
      voice: openaiVoice,
      speed,
    });
    usedProvider = 'openai';
  }

  return { audioBuffer, voice, speed, estimatedDuration, provider: usedProvider };
}

// ── Upload ──────────────────────────────────────────────────────────────────

export async function uploadTTSAudio(audioBuffer: Buffer): Promise<string> {
  return uploadBufferToSupabase(audioBuffer, 'ugc-voiceover', 'audio/mpeg');
}

// ── Lip Sync ────────────────────────────────────────────────────────────────

export async function applyLipSync(input: {
  videoUrl: string;
  audioUrl: string;
}): Promise<string> {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY environment variable is required for lip sync');
  fal.config({ credentials: process.env.FAL_KEY });

  logger.info(`[ugc-audio] Running lip-sync model on fal.ai...`);

  const result = await fal.subscribe('fal-ai/sync-lipsync', {
    input: {
      video_url: input.videoUrl,
      audio_url: input.audioUrl,
      model: 'lipsync-1.9.0-beta',
      sync_mode: 'cut_off',
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        update.logs?.map((log) => log.message).forEach((m) => logger.info(`[ugc-lipsync] ${m}`));
      }
    },
  });

  const syncedVideoUrl = (result.data as any)?.video?.url;
  if (!syncedVideoUrl) throw new Error('Lip-sync model returned no video URL');

  const permanentUrl = await uploadToSupabase(syncedVideoUrl, 'ugc-lipsync');
  logger.info(`[ugc-audio] Lip-synced video stored: ${permanentUrl}`);

  return permanentUrl;
}

// ── Full Pipeline ───────────────────────────────────────────────────────────

/**
 * Full pipeline: generate TTS → upload audio → lip-sync video to audio.
 * Automatically uses ElevenLabs when available for highest quality.
 */
export async function generateVoiceoverAndMerge(input: {
  dialogue: string;
  videoUrl: string;
  voice?: string;
  speed?: number;
  targetDurationSeconds?: number;
}): Promise<{
  audioUrl: string;
  mergedVideoUrl: string;
  voice: string;
}> {
  // Step 1: Generate TTS audio (auto-selects best provider)
  const { audioBuffer, voice } = await generateTTSAudio({
    text: input.dialogue,
    voice: input.voice,
    speed: input.speed,
    targetDurationSeconds: input.targetDurationSeconds,
  });

  // Step 2: Upload audio to Supabase (public URL needed for fal.ai)
  const audioUrl = await uploadTTSAudio(audioBuffer);

  // Step 3: Apply AI lip-sync (re-renders mouth to match speech)
  const mergedVideoUrl = await applyLipSync({
    videoUrl: input.videoUrl,
    audioUrl,
  });

  logger.info(`[ugc-audio] Full pipeline complete: audio=${audioUrl}, lipsync=${mergedVideoUrl}`);
  return { audioUrl, mergedVideoUrl, voice };
}
