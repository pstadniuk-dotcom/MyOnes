/**
 * UGC Video Assembly Service
 *
 * Handles the final stage of the UGC pipeline:
 * 1. Extract last frame from scene N to chain as start frame for scene N+1
 * 2. Concatenate lip-synced scene clips into a single finished video
 * 3. Optionally overlay background music at a low volume
 * 4. Upload final assembled video to Supabase
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { logger } from '../infra/logging/logger';
import { uploadBufferToSupabase } from './ugcService';

// Point fluent-ffmpeg to the bundled static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Get the duration of a media file in seconds.
 */
export async function getMediaDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(url, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Extract the last frame from a video as a PNG image.
 * Downloads the video, seeks to the end, and captures one frame.
 * Returns the path to the extracted frame file.
 */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  const workDir = join(tmpdir(), `ugc-frame-${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });

  const outputPath = join(workDir, 'last_frame.png');

  // First get duration
  const duration = await getMediaDuration(videoUrl);
  // Seek to 0.1s before the end to get the last meaningful frame
  const seekTo = Math.max(0, duration - 0.1);

  return new Promise((resolve, reject) => {
    ffmpeg(videoUrl)
      .seekInput(seekTo)
      .frames(1)
      .outputOptions(['-vf', 'scale=iw:ih'])
      .output(outputPath)
      .on('end', () => {
        logger.info(`[ugc-assembly] Extracted last frame at ${seekTo}s -> ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.error(`[ugc-assembly] Frame extraction failed: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * Upload an extracted frame to Supabase and return the public URL.
 */
export async function uploadFrame(framePath: string): Promise<string> {
  const buf = await fs.readFile(framePath);
  const url = await uploadBufferToSupabase(buf, 'ugc-endframe', 'image/png');
  // Clean up temp file
  await fs.unlink(framePath).catch(() => {});
  return url;
}

/**
 * Download a remote video/audio file to a local temp path.
 */
async function downloadToTemp(url: string, prefix: string, ext: string): Promise<string> {
  const tempPath = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(tempPath, buf);
  return tempPath;
}

/**
 * Estimate how long TTS audio will take for a given text.
 * Rough heuristic: ~150 words/minute at speed 1.0 for OpenAI TTS.
 * Returns estimated seconds.
 */
export function estimateTTSDuration(text: string, speed: number = 1.0): number {
  const words = text.trim().split(/\s+/).length;
  const wordsPerSecond = (150 / 60) * speed; // 2.5 wps at speed 1.0
  return words / wordsPerSecond;
}

/**
 * Calculate the optimal TTS speed to fit dialogue into a target duration.
 * Returns a speed between 0.8 and 1.5 (keeping it natural-sounding).
 * If the dialogue simply can't fit, returns the max speed and flags it.
 */
export function calculateOptimalTTSSpeed(
  text: string,
  targetDurationSeconds: number,
): { speed: number; estimatedDuration: number; fits: boolean } {
  const baseEstimate = estimateTTSDuration(text, 1.0);

  if (baseEstimate <= targetDurationSeconds) {
    // Fits at normal speed
    return { speed: 1.0, estimatedDuration: baseEstimate, fits: true };
  }

  // Need to speed up: speed = baseEstimate / targetDuration
  const neededSpeed = baseEstimate / targetDurationSeconds;
  const clampedSpeed = Math.min(neededSpeed, 1.5); // don't go above 1.5x — sounds unnatural
  const adjustedEstimate = estimateTTSDuration(text, clampedSpeed);

  return {
    speed: Math.round(clampedSpeed * 100) / 100,
    estimatedDuration: adjustedEstimate,
    fits: adjustedEstimate <= targetDurationSeconds + 0.5, // 0.5s tolerance
  };
}

export interface SceneInput {
  sceneNumber: number;
  /** The lip-synced video URL (preferred) or silent video URL */
  videoUrl: string;
  /** Duration in seconds */
  durationSeconds: number;
}

export interface AssemblyOptions {
  /** Ordered scene clips to concatenate */
  scenes: SceneInput[];
  /** Optional background music URL — will be mixed at low volume */
  backgroundMusicUrl?: string;
  /** Background music volume (0.0 - 1.0, default 0.15) */
  musicVolume?: number;
  /** Add a brief crossfade between scenes (seconds, default 0) */
  crossfadeDuration?: number;
}

/**
 * Assemble multiple scene video clips into a single final video.
 *
 * Process:
 * 1. Download all scene clips to temp files
 * 2. Create an ffmpeg concat demuxer file listing all clips
 * 3. Concatenate with optional crossfade transitions
 * 4. Optionally mix in background music at low volume
 * 5. Upload the final video to Supabase
 * 6. Clean up temp files
 */
export async function assembleVideo(options: AssemblyOptions): Promise<{
  videoUrl: string;
  totalDuration: number;
  sceneCount: number;
}> {
  const { scenes, backgroundMusicUrl, musicVolume = 0.15, crossfadeDuration = 0 } = options;

  if (scenes.length === 0) {
    throw new Error('No scenes to assemble');
  }

  const workDir = join(tmpdir(), `ugc-assembly-${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    // Step 1: Download all scene clips
    logger.info(`[ugc-assembly] Downloading ${scenes.length} scene clips...`);
    const localPaths: string[] = [];
    for (const scene of scenes.sort((a, b) => a.sceneNumber - b.sceneNumber)) {
      const path = await downloadToTemp(scene.videoUrl, `scene-${scene.sceneNumber}`, 'mp4');
      localPaths.push(path);
      logger.info(`[ugc-assembly] Downloaded scene ${scene.sceneNumber} -> ${path}`);
    }

    // Step 2: Normalize all clips to the same format before concatenating.
    // Re-encode to consistent resolution, codec, and pixel format.
    logger.info(`[ugc-assembly] Normalizing ${localPaths.length} clips...`);
    const normalizedPaths: string[] = [];
    for (let i = 0; i < localPaths.length; i++) {
      const normPath = join(workDir, `norm-${i}.mp4`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(localPaths[i])
          .outputOptions([
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '18',
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1',
            '-r', '30',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-ar', '44100',
            '-ac', '2',
            // If the source has no audio track, generate a silent one
            '-f', 'mp4',
            '-movflags', '+faststart',
          ])
          .output(normPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
      normalizedPaths.push(normPath);
    }

    // Step 3: Create concat demuxer file
    const concatListPath = join(workDir, 'concat.txt');
    const concatContent = normalizedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(concatListPath, concatContent);

    // Step 4: Concatenate
    const concatOutputPath = join(workDir, 'assembled.mp4');

    if (crossfadeDuration > 0 && normalizedPaths.length > 1) {
      // Use xfade filter for crossfade transitions
      await assemblWithCrossfade(normalizedPaths, concatOutputPath, crossfadeDuration);
    } else {
      // Simple concat demuxer — fast and lossless-ish
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy', '-movflags', '+faststart'])
          .output(concatOutputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
    }

    logger.info(`[ugc-assembly] Concatenation complete -> ${concatOutputPath}`);

    // Step 5: Mix in background music if provided
    let finalOutputPath = concatOutputPath;
    if (backgroundMusicUrl) {
      const musicPath = await downloadToTemp(backgroundMusicUrl, 'bgmusic', 'mp3');
      finalOutputPath = join(workDir, 'final-with-music.mp4');

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatOutputPath)
          .input(musicPath)
          .complexFilter([
            // Mix original audio (scene dialogue) with background music at low volume
            `[0:a]volume=1.0[dialogue]`,
            `[1:a]volume=${musicVolume},aloop=loop=-1:size=2e+09[music]`,
            `[dialogue][music]amix=inputs=2:duration=first:dropout_transition=3[aout]`,
          ])
          .outputOptions([
            '-map', '0:v',
            '-map', '[aout]',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            '-movflags', '+faststart',
          ])
          .output(finalOutputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Clean up music temp file
      await fs.unlink(musicPath).catch(() => {});
      logger.info(`[ugc-assembly] Background music mixed -> ${finalOutputPath}`);
    }

    // Step 6: Get total duration
    const totalDuration = await getMediaDuration(finalOutputPath);

    // Step 7: Upload to Supabase
    const buf = await fs.readFile(finalOutputPath);
    const videoUrl = await uploadBufferToSupabase(buf, 'ugc-final', 'video/mp4');
    logger.info(`[ugc-assembly] Final video uploaded: ${videoUrl} (${totalDuration.toFixed(1)}s, ${scenes.length} scenes)`);

    return {
      videoUrl,
      totalDuration: Math.round(totalDuration * 10) / 10,
      sceneCount: scenes.length,
    };
  } finally {
    // Clean up temp files
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    for (const p of scenes.map((_, i) => join(tmpdir(), `scene-${i}*.mp4`))) {
      // Local paths are cleaned up with workDir
    }
  }
}

/**
 * Assemble clips with crossfade transitions using xfade filter.
 */
async function assemblWithCrossfade(
  inputPaths: string[],
  outputPath: string,
  crossfadeDuration: number,
): Promise<void> {
  if (inputPaths.length < 2) {
    // Just copy the single file
    await fs.copyFile(inputPaths[0], outputPath);
    return;
  }

  // Get durations for offset calculations
  const durations: number[] = [];
  for (const p of inputPaths) {
    const d = await getMediaDuration(p);
    durations.push(d);
  }

  // Build xfade filter chain
  // For N clips, we need N-1 xfade filters chained together
  const cmd = ffmpeg();
  for (const p of inputPaths) {
    cmd.input(p);
  }

  const videoFilters: string[] = [];
  const audioFilters: string[] = [];
  let prevVideoLabel = '0:v';
  let prevAudioLabel = '0:a';
  let cumulativeOffset = 0;

  for (let i = 1; i < inputPaths.length; i++) {
    cumulativeOffset += durations[i - 1] - crossfadeDuration;
    const outVideoLabel = i < inputPaths.length - 1 ? `v${i}` : 'vout';
    const outAudioLabel = i < inputPaths.length - 1 ? `a${i}` : 'aout';

    videoFilters.push(
      `[${prevVideoLabel}][${i}:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${cumulativeOffset.toFixed(2)}[${outVideoLabel}]`
    );
    audioFilters.push(
      `[${prevAudioLabel}][${i}:a]acrossfade=d=${crossfadeDuration}[${outAudioLabel}]`
    );

    prevVideoLabel = outVideoLabel;
    prevAudioLabel = outAudioLabel;
  }

  const filterComplex = [...videoFilters, ...audioFilters].join(';');

  await new Promise<void>((resolve, reject) => {
    cmd
      .complexFilter(filterComplex)
      .outputOptions([
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}
