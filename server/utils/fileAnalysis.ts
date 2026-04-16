import OpenAI from 'openai';
import { ObjectStorageService } from './objectStorage';
import { logger } from '../infra/logging/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Wraps a promise with a timeout. Rejects if the promise doesn't resolve in time. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms / 1000}s`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export interface LabDataExtraction {
  testDate?: string;
  testType?: string;
  labName?: string;
  physicianName?: string;
  extractedData?: Array<{
    testName: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    status?: string;
    category?: string;
    clinicalNote?: string;
  }>;
  riskPatterns?: Array<{
    pattern: string;
    markers: string[];
    severity: 'info' | 'moderate' | 'urgent';
    recommendation: string;
  }>;
  overallAssessment?: string;
  rawText?: string;
}

/**
 * Validates file type using both MIME type and magic bytes.
 * Magic bytes provide a second layer of defense against spoofed Content-Type headers.
 */
export function getFileType(mimeType: string, buffer?: Buffer): 'pdf' | 'image' | 'text' | 'unknown' {
  // If we have a buffer, verify magic bytes match the claimed MIME type
  if (buffer && buffer.length >= 4) {
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47; // .PNG
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // GIF
    const isWebp = buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // RIFF...WEBP

    if (mimeType === 'application/pdf' && isPdf) return 'pdf';
    if (mimeType === 'application/pdf' && !isPdf) return 'unknown'; // MIME says PDF but bytes disagree
    if (mimeType.startsWith('image/') && (isPng || isJpeg || isGif || isWebp)) return 'image';
    if (mimeType.startsWith('image/') && !(isPng || isJpeg || isGif || isWebp)) return 'unknown'; // MIME says image but bytes disagree
    if (mimeType === 'text/plain') return 'text'; // text files don't have reliable magic bytes
  }

  // Fallback to MIME-only check (backward compatible for callers without buffer)
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'text/plain') return 'text';
  return 'unknown';
}

/**
 * Extracts text from plain text files
 */
export async function extractTextFromTextFile(buffer: Buffer): Promise<string> {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    logger.error('Text file reading error', { error });
    throw new Error('Failed to read text file');
  }
}

/** OCR a single page image via GPT-4.1 Vision */
async function ocrPage(dataUrl: string, pageNum: number): Promise<string> {
  const response = await withTimeout(
    openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this lab report page. Include test names, values, units, reference ranges, and any other relevant information. Preserve the structure and formatting as much as possible.'
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl, detail: 'high' }
            }
          ]
        }
      ],
      max_tokens: 8000
    }),
    60_000,
    `PDF page ${pageNum} OCR`
  );
  return response.choices[0]?.message?.content || '';
}

export type AnalysisProgressCallback = (step: string, detail?: string) => void;

const PDF_CONCURRENCY = 6; // process pages in parallel

/**
 * Extracts text from PDF files using OpenAI Vision API
 * Converts PDF pages to images then OCRs them in parallel batches
 */
export async function extractTextFromPDF(buffer: Buffer, onProgress?: AnalysisProgressCallback): Promise<string> {
  try {
    logger.info('Converting PDF to images');
    const { pdf } = await import('pdf-to-img');
    const document = await pdf(buffer, { scale: 1.3 });

    // Collect all page images first
    const pageImages: { pageNum: number; dataUrl: string }[] = [];
    let pageNum = 1;
    for await (const page of document) {
      const base64Image = page.toString('base64');
      pageImages.push({ pageNum, dataUrl: `data:image/png;base64,${base64Image}` });
      pageNum++;
    }

    const totalPages = pageImages.length;
    logger.info(`Collected ${totalPages} page(s), OCRing in batches of ${PDF_CONCURRENCY}`);
    onProgress?.('ocr', `Scanning ${totalPages} pages — this may take a few minutes.`);

    // Process pages in parallel batches, freeing image data as we go
    const extractedTexts: string[] = new Array(totalPages).fill('');
    for (let i = 0; i < totalPages; i += PDF_CONCURRENCY) {
      const batch = pageImages.slice(i, i + PDF_CONCURRENCY);
      const batchNum = Math.floor(i / PDF_CONCURRENCY) + 1;
      const totalBatches = Math.ceil(totalPages / PDF_CONCURRENCY);
      const batchNums = batch.map(p => p.pageNum).join(', ');
      logger.debug(`Processing pages ${batchNums}`);
      onProgress?.('ocr', `Scanning pages ${i + 1}–${Math.min(i + PDF_CONCURRENCY, totalPages)} of ${totalPages} (batch ${batchNum}/${totalBatches})...`);

      const results = await Promise.allSettled(
        batch.map(p => ocrPage(p.dataUrl, p.pageNum))
      );

      // Free image data for this batch to reduce memory pressure
      for (const p of batch) {
        (p as any).dataUrl = '';
      }

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const pg = batch[j].pageNum;
        if (result.status === 'fulfilled' && result.value) {
          extractedTexts[pg - 1] = `--- Page ${pg} ---\n${result.value}`;
        } else if (result.status === 'rejected') {
          logger.warn(`Page ${pg} OCR failed`, { error: result.reason?.message || result.reason });
          extractedTexts[pg - 1] = `--- Page ${pg} ---\n[OCR failed]`;
        }
      }
    }

    // Free all image references
    pageImages.length = 0;

    const successCount = extractedTexts.filter(t => !t.includes('[OCR failed]') && t).length;
    logger.info(`Extracted text from ${successCount}/${totalPages} PDF pages`);
    return extractedTexts.filter(Boolean).join('\n\n');
  } catch (error) {
    logger.error('PDF parsing error', { error });
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extracts text from images using OpenAI Vision API
 */
export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // Convert buffer to base64
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this lab report image. Include test names, values, units, reference ranges, and any other relevant information. Preserve the structure and formatting as much as possible.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      }),
      30_000,
      'Image OCR'
    );

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    logger.error('Image OCR error', { error });
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Analyzes extracted text and structures lab data using AI.
 * Uses gpt-4.1 with high token limit (32K output).
 */
export async function structureLabData(rawText: string): Promise<LabDataExtraction> {
  const systemPrompt = `You are an expert medical lab report analyzer. Extract structured data from lab reports and return it as JSON.

Extract the following top-level fields:
- testDate: Date of the test (ISO format YYYY-MM-DD if possible)
- testType: Type of test (e.g., "Complete Blood Count", "Comprehensive Metabolic Panel", "Lipid Panel")
- labName: Name of the laboratory
- physicianName: Ordering physician's name
- overallAssessment: A 2-3 sentence clinical summary of the report: how many markers are out of range, which are most concerning, and what the results suggest overall. Write for an informed consumer, not a doctor.
- extractedData: Array of EVERY test result found, where each item has:
  - testName: Standardized name of the test (e.g., "LDL Cholesterol" not "LDL-C Direct")
  - value: The numeric or text value exactly as shown
  - unit: The unit of measurement (if present)
  - referenceRange: The normal reference range exactly as shown (e.g., "< 100 mg/dL", "30-100 ng/mL")
  - status: "high", "low", "critical", or "normal" based on the reference range. Use "critical" only for values far outside the range that need urgent attention.
  - category: The panel category this marker belongs to. Use one of: "Lipid Panel", "Complete Blood Count", "Metabolic Panel", "Liver Function", "Thyroid", "Vitamins & Minerals", "Hormones", "Inflammation", "Diabetes & Blood Sugar", "Kidney Function", "Cardiac", "Omega & Fatty Acids", "Urinalysis", "Autoimmune & Immune", "Prostate", "Toxicology & Metals", "Blood Type", "Other"
  - clinicalNote: For any marker that is NOT normal, provide a brief 1-sentence explanation of what this value means for the patient's health. Leave empty string for normal markers.
- riskPatterns: Array of multi-marker patterns you identify. Each has:
  - pattern: A short name for the pattern (e.g., "Metabolic Syndrome Risk", "Methylation Concern", "Iron Deficiency")
  - markers: Array of marker names involved in this pattern
  - severity: "info", "moderate", or "urgent"
  - recommendation: One actionable sentence about what to do

Extract EVERY individual line item — do not skip, merge, or omit ANY test results. Common items that get missed:
- Calculated ratios (A/G Ratio, BUN/Creatinine Ratio, Globulin, etc.)
- BOTH percentage AND absolute counts for WBC differentials (e.g., Neutrophils % AND Neutrophils Absolute are TWO separate entries)
- Qualitative results like "Non-Reactive", "Negative", blood type, Rh factor
- Urinalysis entries (pH, Specific Gravity, Protein, Glucose, etc.)
- eGFR variants (e.g., eGFR Non-African American AND eGFR African American are separate entries if both appear)
- Sub-tests that appear indented or grouped under a panel header
- If a reference range is not provided, still include the marker with an empty referenceRange
- If a value is text (e.g., "Negative", "A+"), include it exactly as shown

The TOTAL number of entries in extractedData should match the total number of individual test result rows in the lab report. Do NOT consolidate or deduplicate — if the report lists it, include it.
- totalResultRowCount: Before building extractedData, count every individual test result row in the report and put that number here. This is used for QA — if extractedData.length !== totalResultRowCount, the extraction will be flagged for review.

Return ONLY valid JSON without any markdown formatting.`;

  const userMessage = `Extract structured data from this lab report:\n\n${rawText}`;

  // gpt-4.1 supports up to 32768 completion tokens — retry with longer timeout if first attempt fails
  const attempts: Array<{ maxTokens: number; timeout: number }> = [
    { maxTokens: 32768, timeout: 240_000 },
    { maxTokens: 32768, timeout: 300_000 },
  ];

  for (let i = 0; i < attempts.length; i++) {
    const { maxTokens, timeout } = attempts[i];
    try {
      logger.info(`Structuring lab data`, { attempt: i + 1, maxTokens });
      const response = await withTimeout(
        openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' }
        }),
        timeout,
        `Lab data structuring (attempt ${i + 1})`
      );

      const finishReason = response.choices[0]?.finish_reason;
      const content = response.choices[0]?.message?.content;
      const usage = response.usage;

      logger.info('Structuring response received', {
        finishReason,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
      });

      if (!content) {
        throw new Error('No response from AI');
      }

      // If truncated, attempt partial parse
      if (finishReason === 'length') {
        logger.warn('Response truncated at token limit, attempting partial parse');
      }

      let structured: any;
      try {
        structured = JSON.parse(content);
      } catch (parseErr) {
        // Try to salvage truncated JSON by closing open structures
        logger.warn('JSON parse failed, attempting to salvage truncated response');
        const salvaged = salvageTruncatedJSON(content);
        if (salvaged) {
          structured = salvaged;
        } else {
          throw parseErr;
        }
      }

      // Ensure extractedData is always an array
      if (!Array.isArray(structured.extractedData)) {
        logger.warn('AI returned non-array extractedData, normalizing to empty array');
        structured.extractedData = [];
      }

      logger.info(`Structured ${structured.extractedData.length} markers from lab data`);

      // ── Self-reported count QA ──
      const selfReportedCount = structured.totalResultRowCount;
      if (selfReportedCount && selfReportedCount !== structured.extractedData.length) {
        logger.warn('Extraction count mismatch — AI self-reported a different total', {
          selfReportedCount,
          actualExtracted: structured.extractedData.length,
          delta: selfReportedCount - structured.extractedData.length,
        });
      }

      // ── Reconciliation pass: check if the model missed any markers ──
      // Use self-reported count or OCR line estimate to detect gaps
      const resultLinePattern = /^[\s]*[A-Za-z][\w\s/()-]+\s+[\d.<>]+/gm;
      const ocrResultLines = (rawText.match(resultLinePattern) || []).length;
      const extractedCount = structured.extractedData.length;
      const selfReportGap = selfReportedCount ? selfReportedCount - extractedCount : 0;

      if (ocrResultLines > extractedCount + 2 || selfReportGap > 0) {
        const reason = selfReportGap > 0
          ? `AI self-reported ${selfReportedCount} but only extracted ${extractedCount}`
          : `OCR has ~${ocrResultLines} result lines but only ${extractedCount} extracted`;
        logger.info(`Reconciliation: ${reason}. Running targeted second pass.`);

        const existingNames = structured.extractedData.map((d: any) => d.testName?.toLowerCase()).filter(Boolean);
        try {
          const reconcileResponse = await withTimeout(
            openai.chat.completions.create({
              model: 'gpt-4.1',
              messages: [
                {
                  role: 'system',
                  content: `You are a lab report QA specialist. A prior extraction found ${extractedCount} markers. Review the raw text below and identify ANY test results that are missing from this list:\n${existingNames.join(', ')}\n\nReturn a JSON object: { "missingMarkers": [ { "testName": "...", "value": "...", "unit": "...", "referenceRange": "...", "status": "...", "category": "...", "clinicalNote": "" } ] }\nIf nothing is missing, return { "missingMarkers": [] }. Return ONLY valid JSON.`
                },
                { role: 'user', content: rawText }
              ],
              temperature: 0.1,
              max_tokens: 8192,
              response_format: { type: 'json_object' }
            }),
            120_000,
            'Reconciliation pass'
          );

          const reconcileContent = reconcileResponse.choices[0]?.message?.content;
          if (reconcileContent) {
            const reconciled = JSON.parse(reconcileContent);
            if (Array.isArray(reconciled.missingMarkers) && reconciled.missingMarkers.length > 0) {
              logger.info(`Reconciliation found ${reconciled.missingMarkers.length} additional markers`);
              structured.extractedData.push(...reconciled.missingMarkers);
              logger.info(`Total markers after reconciliation: ${structured.extractedData.length}`);
            } else {
              logger.info('Reconciliation found no missing markers');
            }
          }
        } catch (reconcileErr) {
          logger.warn('Reconciliation pass failed, using initial extraction', { error: (reconcileErr as Error).message });
        }
      }

      return {
        ...structured,
        rawText
      };
    } catch (error) {
      if (i < attempts.length - 1) {
        logger.warn(`Attempt ${i + 1} failed, retrying`, { error: (error as Error).message });
        continue;
      }
      logger.error('All lab data structuring attempts failed', { error });
      // Return with empty extractedData so callers can detect the failure
      // instead of silently returning { rawText } which gets normalized away
      return { rawText, extractedData: [] };
    }
  }

  return { rawText, extractedData: [] };
}

/**
 * Attempts to fix truncated JSON by closing open arrays/objects.
 * Returns parsed object or null if unsalvageable.
 */
function salvageTruncatedJSON(content: string): any | null {
  try {
    // Try progressively trimming and closing
    let trimmed = content.trimEnd();
    
    // Remove trailing incomplete string (end at last complete value)
    const lastCompleteValue = Math.max(
      trimmed.lastIndexOf('}'),
      trimmed.lastIndexOf(']'),
      trimmed.lastIndexOf('"'),
      trimmed.lastIndexOf('null'),
    );
    
    if (lastCompleteValue > 0) {
      trimmed = trimmed.substring(0, lastCompleteValue + 1);
    }

    // Count open brackets/braces and close them
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (const ch of trimmed) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') openBraces++;
      if (ch === '}') openBraces--;
      if (ch === '[') openBrackets++;
      if (ch === ']') openBrackets--;
    }

    // If we're in a string, close it
    if (inString) trimmed += '"';

    // Close brackets/braces
    for (let i = 0; i < openBrackets; i++) trimmed += ']';
    for (let i = 0; i < openBraces; i++) trimmed += '}';

    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Main function to analyze a file and extract lab data
 */
export async function analyzeLabReport(
  objectPath: string,
  mimeType: string,
  userId: string,
  onProgress?: AnalysisProgressCallback
): Promise<LabDataExtraction> {
  // Overall 3-minute timeout for the entire analysis pipeline
  return withTimeout((async () => {
    try {
      // Get file buffer directly from ObjectStorageService
      const objectStorageService = new ObjectStorageService();
      const fileBuffer = await objectStorageService.getLabReportFile(objectPath, userId);

    if (!fileBuffer) {
      throw new Error(`Failed to download file from storage`);
    }

    // Detect file type with magic byte validation
    const fileType = getFileType(mimeType, fileBuffer);

    let extractedText = '';

    // Extract text based on file type
    if (fileType === 'pdf') {
      onProgress?.('ocr', 'Converting PDF pages — this may take a few minutes.');
      extractedText = await extractTextFromPDF(fileBuffer, onProgress);
    } else if (fileType === 'image') {
      onProgress?.('ocr', 'Reading image — this may take a few minutes.');
      extractedText = await extractTextFromImage(fileBuffer, mimeType);
    } else if (fileType === 'text') {
      extractedText = await extractTextFromTextFile(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Structure the extracted text into lab data
    logger.info('OCR complete', { chars: extractedText.length, estimatedTokens: Math.round(extractedText.length / 4) });
    onProgress?.('structuring', 'Analyzing biomarkers — almost done.');
    const labData = await structureLabData(extractedText);

    onProgress?.('insights', 'Finalizing analysis...');

    return labData;
  } catch (error) {
    logger.error('Lab report analysis error', { error });
    throw error;
  }
  })(), 8 * 60_000, 'Overall lab report analysis');
}
