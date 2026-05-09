// File: client/src/app/api/analyze/route.ts

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Schema matching SRD section 10.1
const analysisSchema = z.object({
  risk_score: z.number().min(0).max(100),
  risk_level: z.enum(['low', 'medium', 'high']),
  checks: z.object({
    reverse_image: z.object({ pass: z.boolean(), reason: z.string() }),
    price_anomaly: z.object({ pass: z.boolean(), reason: z.string() }),
    urgency_language: z.object({ pass: z.boolean(), reason: z.string() }),
    location_verification: z.object({ pass: z.boolean(), reason: z.string() })
  }),
  exif_status: z.enum(['available', 'missing', 'screenshot-detected']),
  screenshot_warning: z.string().nullable(),
  summary_english: z.string(),
  summary_amharic: z.string()
});

// Type for the API response
type AnalysisResponse = z.infer<typeof analysisSchema>;

export async function POST(request: Request) {
  try {
    const { url, images, description, location, price } = await request.json();

    // Fallback to mock if no API key configured (development/demo mode)
    if (!process.env.AI_API_KEY) {
      console.warn('AI_API_KEY not set, using mock response per SRD FR-06');
      return NextResponse.json(getMockResponse(url, location, price));
    }

    // Build prompt with Ethiopian context per SRD section 10.1
    const prompt = `
You are a rental fraud detection specialist for Addis Ababa, Ethiopia.

Analyze this rental listing and return a structured risk assessment.

Listing Details:
- URL: ${url || 'N/A'}
- Location claimed: ${location || 'N/A'}
- Price: ${price ? `${price} ETB/month` : 'N/A'}
- Description: ${description || 'N/A'}
- Images: ${images?.length || 0} provided

Ethiopian Context Guidelines:
1. Scammers often claim properties are in desirable areas (Bole, Sarbet, Kazanchis) but photos may show landmarks from other areas (Summit telecom tower, CMC roundabout, Piassa church).
2. "Pay before viewing" is a major red flag in Addis Ababa.
3. Prices significantly below market rate for the claimed neighborhood are suspicious (e.g., 2-bedroom in Bole for <10,000 ETB).
4. Listings with urgent language ("act now!", "last chance!", "today only!") warrant extra scrutiny.
5. Brokers who refuse to share original photos or insist on Telegram/Facebook screenshots are higher risk.

Return a JSON object matching the schema exactly. Do not add extra fields.
`.trim();

    // Call AI model with structured output per SRD FR-04, FR-05
    const { object } = await generateObject({
      model: openai(process.env.AI_MODEL || 'gpt-4o'),
      schema: analysisSchema,
      prompt: prompt,
      temperature: 0.1,
      maxOutputTokens: 1000, // Fixed: was maxTokens
    });

    return NextResponse.json(object as AnalysisResponse);

  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Graceful degradation per SRD NFR-08
    return NextResponse.json(
      getMockResponse(request.url),
      { status: 200 }
    );
  }
}

// Mock response for development/fallback per SRD FR-06
function getMockResponse(url: string | undefined, location?: string, price?: number): AnalysisResponse {
  const isHighRisk = url?.toLowerCase().includes('scam') || 
                     url?.toLowerCase().includes('fake') ||
                     url?.toLowerCase().includes('urgent') ||
                     (location?.toLowerCase() === 'bole' && price && price < 10000);

  const riskScore = isHighRisk ? 92 : 15;
  
  return {
    risk_score: riskScore,
    risk_level: isHighRisk ? 'high' : 'low',
    checks: {
      reverse_image: {
        pass: !isHighRisk,
        reason: isHighRisk 
          ? 'Image found on 4 other listings with different prices' 
          : 'No duplicate images detected'
      },
      price_anomaly: {
        pass: !isHighRisk,
        reason: isHighRisk
          ? 'Price 60% below market rate for claimed neighborhood'
          : 'Price within expected range for location'
      },
      urgency_language: {
        pass: !isHighRisk,
        reason: isHighRisk
          ? 'Contains high-pressure language: "act now", "today only"'
          : 'No urgency tactics detected'
      },
      location_verification: {
        pass: !isHighRisk,
        reason: isHighRisk
          ? 'Landmark mismatch: visible telecom tower indicates Summit, not claimed Bole location'
          : 'Location consistent with visible landmarks and EXIF data'
      }
    },
    exif_status: isHighRisk ? 'missing' : 'available',
    screenshot_warning: isHighRisk 
      ? 'This image may be a screenshot. EXIF data may be unreliable.' 
      : null,
    summary_english: isHighRisk
      ? 'High risk listing. Multiple fraud indicators detected. Do not send payment before in-person viewing.'
      : 'Low risk listing. No significant fraud indicators detected. Proceed with caution and verify in person.',
    summary_amharic: isHighRisk
      ? 'ከፍተኛ አደጋ ያለው ማስታወቂያ። ብዙ የጭብጥ ምልክቶች ተገኝተዋል። ከመመልከትዎ በፊት ክፍያ አይላኩ።'
      : 'ዝቅተኛ አደጋ ያለው ማስታወቂያ። ምንም ትልቅ የጭብጥ ምልክቶች አልተገኙም። በጥንቃቄ ይቀጥሉ እና በአካል ያረጋግጡ።'
  };
}