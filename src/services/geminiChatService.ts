import type { ExtractedPage } from './documentTextExtractor';
import { GeminiKeyService } from './geminiKeyService';
import type { QuizQuestion } from '../types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  citedPages?: number[];
}

const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

export const GeminiChatService = {
  /**
   * Ask a question about the active document with extracted page context (RAG)
   */
  async askQuestion(params: {
    apiKey: string;
    question: string;
    documentTitle: string;
    relevantPages: ExtractedPage[];
    chatHistory?: ChatMessage[];
    contentType?: string;
  }): Promise<{ answer: string; citedPages: number[] }> {
    const { apiKey, question, documentTitle, relevantPages, chatHistory = [], contentType } = params;

    const isPresentation = contentType === 'pptx' || contentType === 'ppt';
    const unitName = isPresentation ? 'slide' : 'page';
    const unitNameCapital = isPresentation ? 'Slide' : 'Page';

    // Build context block from extracted pages
    const contextText =
      relevantPages.length > 0
        ? relevantPages
            .map((p) => `--- [${unitNameCapital} ${p.pageNumber}] ---\n${p.text}`)
            .join('\n\n')
        : 'No specific document text available. Answer based on general academic knowledge.';

    // Construct system instructions
    const systemPrompt = `You are KaiStu AI Academic Tutor, a brilliant, friendly, and patient personal study coach.
You are helping the student study the ${isPresentation ? 'presentation slides' : 'document'} titled "${documentTitle}".

CRITICAL INSTRUCTIONS:
1. Base your answer primarily on the provided ${isPresentation ? 'SLIDE EXCERPTS' : 'DOCUMENT EXCERPTS'} below whenever possible.
2. Whenever you mention or cite facts from a specific ${unitName}, cite it explicitly like "[${unitNameCapital} X]" (e.g. "[${unitNameCapital} 5]").
3. If the user asks in Bengali or Banglish, answer in clear, natural Bengali. If they ask in English, answer in English.
4. Format your answer beautifully with Markdown, bold headers, bullet points, and LaTeX equations ($...$ or $$...$$) where applicable.
5. If the exact answer is not in the excerpts, clearly mention that, but still provide an accurate academic explanation to help the student learn.`;

    // Format recent chat history (last 4 messages for multi-turn conversational context)
    const recentHistory = chatHistory.slice(-4);
    const contents: any[] = [];

    // Prior conversation history
    for (const msg of recentHistory) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      });
    }

    // Add current query with document context
    const currentTurn = `DOCUMENT EXCERPTS FOR "${documentTitle}":
${contextText}

STUDENT QUESTION:
${question}`;

    contents.push({
      role: 'user',
      parts: [{ text: currentTurn }],
    });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    };

    // Determine model list starting with the currently saved/resolved model
    const activeModel = GeminiKeyService.getModel();
    const modelsToTry = [
      activeModel,
      ...FALLBACK_MODELS.filter((m) => m !== activeModel),
    ];

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
            apiKey.trim()
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        if (response.ok) {
          // Save the working model for future calls
          GeminiKeyService.saveModel(model);

          const data = await response.json();
          const answer =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            'I was unable to generate an answer. Please try rephrasing your question.';

          // Extract all cited page or slide numbers using regex like [Page X] or [Slide X]
          const pageMatches = answer.match(/\[(?:page|slide)\s*(\d+)\]/gi) || [];
          const validNums = pageMatches
            .map((m: string) => {
              const numMatch = m.match(/\d+/);
              return numMatch ? parseInt(numMatch[0], 10) : null;
            })
            .filter((n: number | null): n is number => n !== null);

          const citedPages: number[] = Array.from(new Set<number>(validNums));

          return { answer, citedPages };
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          `Google Gemini API Error (${response.status}): ${response.statusText}`;

        // If it's a model not found / unsupported / retired error, continue loop to try next model!
        if (
          errMsg.includes('not found') ||
          errMsg.includes('not supported') ||
          errMsg.includes('no longer available') ||
          errMsg.includes('deprecated') ||
          errMsg.includes('retired') ||
          response.status === 404
        ) {
          console.warn(`Model ${model} not available (${errMsg}), trying next fallback...`);
          lastError = new Error(errMsg);
          continue;
        }

        // If it's another non-quota error, also try next model before giving up
        if (response.status === 400 && !errMsg.includes('API_KEY_INVALID')) {
          console.warn(`Model ${model} returned 400 (${errMsg}), trying next fallback...`);
          lastError = new Error(errMsg);
          continue;
        }

        // Otherwise (quota exhausted, invalid key), fail immediately
        throw new Error(errMsg);
      } catch (err: any) {
        if (
          err.message?.includes('not found') ||
          err.message?.includes('not supported') ||
          err.message?.includes('no longer available') ||
          err.message?.includes('deprecated')
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw (
      lastError ||
      new Error('Failed to generate response across all Gemini model endpoints.')
    );
  },

  /**
   * Generate dynamic, high-yield practice exam questions grounded in the active document text
   */
  async generateExamQuestions(params: {
    apiKey: string;
    documentTitle: string;
    subjectName: string;
    relevantPages: ExtractedPage[];
    contentType?: string;
    questionCount?: number;
  }): Promise<QuizQuestion[]> {
    const { apiKey, documentTitle, subjectName, relevantPages, contentType, questionCount = 5 } = params;

    const isPresentation = contentType === 'pptx' || contentType === 'ppt';
    const unitName = isPresentation ? 'slide' : 'page';
    const unitNameCapital = isPresentation ? 'Slide' : 'Page';

    // Sample from available pages (up to 25 pages or ~35k chars to fit context comfortably)
    const contextText =
      relevantPages.length > 0
        ? relevantPages
            .slice(0, 25)
            .map((p) => `--- [${unitNameCapital} ${p.pageNumber}] ---\n${p.text.slice(0, 2500)}`)
            .join('\n\n')
        : `Subject: ${subjectName}\nTopic: ${documentTitle}`;

    const prompt = `You are an expert university professor creating an exam simulator for the material "${documentTitle}" in the course "${subjectName}".

Based strictly on the provided ${isPresentation ? 'slide' : 'document'} text below, generate exactly ${questionCount} high-yield, challenging, university-level multiple-choice exam questions.

CRITICAL RULES:
1. Ground each question in the real concepts, theorems, definitions, algorithms, or facts from the text.
2. Provide exactly 4 plausible options for each question.
3. correctIndex MUST be the zero-based index (0, 1, 2, or 3) of the correct option.
4. Provide a thorough, educational explanation explaining why the correct answer is right and why the other choices are incorrect.
5. In "pageCitation", specify the integer number of the ${unitName} where this question's answer is located (e.g. 1, 2, 3), or null if not applicable.

EXCERPTS FROM "${documentTitle}":
${contextText}

OUTPUT FORMAT:
Respond ONLY with a valid JSON array containing ${questionCount} objects. Do NOT include markdown commentary or anything outside the JSON array:
[
  {
    "id": "q1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Detailed explanation.",
    "pageCitation": 1
  }
]`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 3000,
      },
    };

    const activeModel = GeminiKeyService.getModel();
    const modelsToTry = [
      activeModel,
      ...FALLBACK_MODELS.filter((m) => m !== activeModel),
    ];

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
            apiKey.trim()
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        if (response.ok) {
          GeminiKeyService.saveModel(model);
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

          // Clean markdown code blocks if returned
          const jsonText = rawText
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any, idx: number) => ({
              id: item.id || `ai-q-${idx + 1}-${Date.now()}`,
              question: item.question || `Question ${idx + 1}`,
              options: Array.isArray(item.options) && item.options.length >= 2 ? item.options : ['True', 'False'],
              correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
              explanation: item.explanation || 'No explanation provided.',
              pageCitation: typeof item.pageCitation === 'number' ? item.pageCitation : undefined,
            }));
          }
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Gemini Error (${response.status})`;

        if (
          errMsg.includes('not found') ||
          errMsg.includes('not supported') ||
          errMsg.includes('deprecated') ||
          response.status === 404
        ) {
          lastError = new Error(errMsg);
          continue;
        }

        if (response.status === 400 && !errMsg.includes('API_KEY_INVALID')) {
          lastError = new Error(errMsg);
          continue;
        }

        throw new Error(errMsg);
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate exam questions with Gemini.');
  },
};
