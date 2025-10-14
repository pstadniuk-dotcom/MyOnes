import OpenAI from 'openai';
import * as pdfParseModule from 'pdf-parse';
import { Storage } from '@google-cloud/storage';

// Handle both CommonJS and ESM exports
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const storage = new Storage();

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
export function getFileType(mimeType: string): 'pdf' | 'image' | 'unknown' {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  return 'unknown';
}

/**
 * Extracts text from PDF files
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
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
    // Parse object path to get bucket and file name
    // Format: /<bucket_name>/<object_name>
    const pathParts = objectPath.split('/').filter(part => part.length > 0);
    if (pathParts.length < 2) {
      throw new Error('Invalid object path');
    }
    
    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join('/');
    
    // Download file from object storage
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    const [fileBuffer] = await file.download();
    
    // Detect file type
    const fileType = getFileType(mimeType);
    
    let extractedText = '';
    
    // Extract text based on file type
    if (fileType === 'pdf') {
      extractedText = await extractTextFromPDF(fileBuffer);
    } else if (fileType === 'image') {
      extractedText = await extractTextFromImage(fileBuffer, mimeType);
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
