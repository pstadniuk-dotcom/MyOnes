import { aiService } from './domains/ai';
import { ObjectStorageService } from './objectStorage';

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
  }>;
  rawText?: string;
}

/**
 * Detects file type based on MIME type
 */
export function getFileType(mimeType: string): 'pdf' | 'image' | 'text' | 'unknown' {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'text/plain') {
    return 'text';
  }
  return 'unknown';
}

/**
 * Extracts text from plain text files
 */
export async function extractTextFromTextFile(buffer: Buffer): Promise<string> {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Text file reading error:', error);
    throw new Error('Failed to read text file');
  }
}

/**
 * Extracts text from PDF files using OpenAI Vision API
 * Converts PDF pages to images and processes them with GPT-4o Vision
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('📄 Converting PDF to images...');
    // Dynamic import to avoid loading browser-dependent pdfjs-dist at startup
    const { pdf } = await import('pdf-to-img');
    const document = await pdf(buffer, { scale: 2.0 });
    const extractedTexts: string[] = [];

    let pageNum = 1;
    for await (const page of document) {
      console.log(`📄 Processing PDF page ${pageNum}...`);

      // Convert page to base64
      const base64Image = page.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;

      // Extract text using AI Service Vision
      const pageText = await aiService.getVisionCompletion(
        'Extract all text from this lab report page. Include test names, values, units, reference ranges, and any other relevant information. Preserve the structure and formatting as much as possible.',
        dataUrl,
        { model: 'gpt-4o', maxTokens: 2000 }
      );

      if (pageText) {
        extractedTexts.push(`--- Page ${pageNum} ---\n${pageText}`);
      }

      pageNum++;
    }

    console.log(`✅ Successfully extracted text from ${pageNum - 1} PDF page(s)`);
    return extractedTexts.join('\n\n');
  } catch (error) {
    console.error('PDF parsing error:', error);
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

    return aiService.getVisionCompletion(
      'Extract all text from this lab report image. Include test names, values, units, reference ranges, and any other relevant information. Preserve the structure and formatting as much as possible.',
      dataUrl,
      { model: 'gpt-4o', maxTokens: 2000 }
    );
  } catch (error) {
    console.error('Image OCR error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Analyzes extracted text and structures lab data using AI
 */
export async function structureLabData(rawText: string): Promise<LabDataExtraction> {
  try {
    const content = await aiService.getChatCompletion([
      {
        role: 'system',
        content: `You are a medical lab report analyzer. Extract structured data from lab reports and return it as JSON.

Extract the following information:
- testDate: Date of the test (ISO format if possible)
- testType: Type of test (e.g., "Complete Blood Count", "Lipid Panel", "Vitamin D Test")
- labName: Name of the laboratory
- physicianName: Ordering physician's name
- extractedData: Array of test results, where each item has:
  - testName: Name of the test
  - value: The numeric or text value
  - unit: The unit of measurement (if present)
  - referenceRange: The normal reference range (if present)
  - status: "high", "low", or "normal" based on the reference range

Return ONLY valid JSON without any markdown formatting.`
      },
      {
        role: 'user',
        content: `Extract structured data from this lab report:\n\n${rawText}`
      }
    ], { model: 'gpt-4o', temperature: 0.1 });

    if (!content) {
      throw new Error('No response from AI');
    }

    const structured = JSON.parse(content);

    // Ensure extractedData is always an array
    if (!Array.isArray(structured.extractedData)) {
      console.warn('AI returned non-array extractedData, normalizing to empty array');
      structured.extractedData = [];
    }

    return {
      ...structured,
      rawText
    };
  } catch (error) {
    console.error('Lab data structuring error:', error);
    // Return raw text if structuring fails
    return { rawText };
  }
}

/**
 * Main function to analyze a file and extract lab data
 */
export async function analyzeLabReport(
  objectPath: string,
  mimeType: string,
  userId: string
): Promise<LabDataExtraction> {
  try {
    // Get file buffer directly from ObjectStorageService
    const objectStorageService = new ObjectStorageService();
    const fileBuffer = await objectStorageService.getLabReportFile(objectPath, userId);

    if (!fileBuffer) {
      throw new Error(`Failed to download file from storage`);
    }

    // Detect file type
    const fileType = getFileType(mimeType);

    let extractedText = '';

    // Extract text based on file type
    if (fileType === 'pdf') {
      extractedText = await extractTextFromPDF(fileBuffer);
    } else if (fileType === 'image') {
      extractedText = await extractTextFromImage(fileBuffer, mimeType);
    } else if (fileType === 'text') {
      extractedText = await extractTextFromTextFile(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Structure the extracted text into lab data
    const labData = await structureLabData(extractedText);

    return labData;
  } catch (error) {
    console.error('Lab report analysis error:', error);
    throw error;
  }
}
