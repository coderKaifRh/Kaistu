/**
 * Gemini API Key Management Service (BYOK - Bring Your Own Key)
 * Safely stores and retrieves the user's free Google Gemini API key in local storage.
 * Dynamically resolves the best supported model (Gemini 2.5 Flash, 2.0 Flash, 1.5 Flash).
 */

const GEMINI_STORAGE_KEY = 'kaistu_gemini_api_key';
const GEMINI_MODEL_STORAGE_KEY = 'kaistu_gemini_model';

// Fallback priority list of high-speed flash models
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
];

export const GeminiKeyService = {
  /**
   * Get the saved API key from localStorage
   */
  getKey(): string | null {
    try {
      const key = localStorage.getItem(GEMINI_STORAGE_KEY);
      return key ? key.trim() : null;
    } catch {
      return null;
    }
  },

  /**
   * Save the API key to localStorage
   */
  saveKey(key: string): void {
    try {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } catch (err) {
      console.error('Failed to save Gemini API key:', err);
    }
  },

  /**
   * Remove the API key
   */
  removeKey(): void {
    try {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
      localStorage.removeItem(GEMINI_MODEL_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to remove Gemini API key:', err);
    }
  },

  /**
   * Check if a valid-looking API key exists
   */
  hasKey(): boolean {
    const key = this.getKey();
    return Boolean(key && key.length > 20 && key.startsWith('AIza'));
  },

  /**
   * Get the currently active/resolved model
   */
  getModel(): string {
    try {
      const model = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
      return model ? model.trim() : 'gemini-2.5-flash';
    } catch {
      return 'gemini-2.5-flash';
    }
  },

  /**
   * Save the resolved model
   */
  saveModel(model: string): void {
    try {
      localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model.trim());
    } catch (err) {
      console.error('Failed to save Gemini model:', err);
    }
  },

  /**
   * Validate the API key against Google's Gemini API and auto-detect supported model
   */
  async validateKey(key: string): Promise<{ valid: boolean; model?: string; error?: string }> {
    const cleanKey = key.trim();
    if (!cleanKey) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    // Step 1: Try ModelService.ListModels to detect exactly which models this key supports
    try {
      const listResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`
      );

      if (listResp.ok) {
        const listData = await listResp.json();
        const availableModels: string[] = (listData.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name?.replace('models/', '') || '');

        // Find the best match according to candidate priority
        for (const candidate of CANDIDATE_MODELS) {
          if (availableModels.includes(candidate)) {
            this.saveModel(candidate);
            return { valid: true, model: candidate };
          }
        }

        // If specific candidate not found, find any flash model
        const anyFlash = availableModels.find((m) => m.includes('flash'));
        if (anyFlash) {
          this.saveModel(anyFlash);
          return { valid: true, model: anyFlash };
        }

        // Otherwise use the first available model that supports generateContent
        if (availableModels.length > 0) {
          this.saveModel(availableModels[0]);
          return { valid: true, model: availableModels[0] };
        }
      }
    } catch (e) {
      console.warn('ListModels failed, falling back to direct probe:', e);
    }

    // Step 2: Fallback probe - try candidate models one by one
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
            cleanKey
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Ping' }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          }
        );

        if (response.ok) {
          this.saveModel(model);
          return { valid: true, model };
        }

        const errData = await response.json().catch(() => ({}));
        // If it's an authentication error, don't bother probing other models
        if (response.status === 400 && errData.error?.message?.includes('API_KEY_INVALID')) {
          return { valid: false, error: 'API key is invalid. Please check your key from Google AI Studio.' };
        }
      } catch (err: any) {
        console.warn(`Probe failed for model ${model}:`, err);
      }
    }

    return {
      valid: false,
      error: 'Unable to connect to Google Gemini with this key. Please check your key or internet connection.',
    };
  },
};
