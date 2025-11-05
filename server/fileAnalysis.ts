import OpenAI from 'openai';
import { ObjectStorageService } from './objectStorage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load pdf-parse dynamically to handle CommonJS module
let pdfParse: any;
async function loadPdfParse() {
  if (!pdfParse) {
    const module = await import('pdf-parse');
    // Try multiple levels of default export
    pdfParse = (module as any).default?.default || (module as any).default || module;
  }
  return pdfParse;
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
 * Extracts text from PDF files
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const parser = await loadPdfParse();
    const data = await parser(buffer);
    return data.text;
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 Vision model
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
      max_tokens: 2000
    });

    return response.choices[0]?.message?.content || '';
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
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
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
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
    // Get signed download URL from ObjectStorageService
    const objectStorageService = new ObjectStorageService();
    const downloadUrl = await objectStorageService.getLabReportDownloadURL(
      objectPath,
      userId,
      { ipAddress: 'internal-analysis', userAgent: 'lab-analysis-service' }
    );
    
    // Download file using HTTP fetch
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
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
