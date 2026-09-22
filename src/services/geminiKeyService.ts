/**
 * Gemini API Key Management Service (BYOK - Bring Your Own Key)
 * Safely stores and retrieves the user's free Google Gemini API key in local storage.
 * Resolves active high-speed models: Gemini 2.5 Flash, 2.5 Flash Lite, 2.0 Flash.
 */

const GEMINI_STORAGE_KEY = 'kaistu_gemini_api_key';
const GEMINI_MODEL_STORAGE_KEY = 'kaistu_gemini_model';

// Active modern Gemini Flash models (Gemini 1.5 is deprecated)
export const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
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
   * Get the currently active/resolved model (never allows deprecated 1.5 models)
   */
  getModel(): string {
    try {
      const model = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
      if (model && !model.includes('1.5') && !model.includes('undefined')) {
        return model.trim();
      }
      // Purge deprecated model
      this.saveModel('gemini-2.5-flash');
      return 'gemini-2.5-flash';
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

    // Step 1: Probe candidate models directly with generateContent
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
              contents: [{ parts: [{ text: 'Hello' }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          }
        );

        if (response.ok) {
          this.saveModel(model);
          return { valid: true, model };
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || '';

        // If the API key is genuinely invalid (bad key), stop immediately
        if (response.status === 400 && errMsg.includes('API_KEY_INVALID')) {
          return {
            valid: false,
            error: 'API key not valid. Please copy a fresh key from Google AI Studio.',
          };
        }

        // If quota limit or rate limit
        if (
          response.status === 429 ||
          errMsg.includes('quota') ||
          errMsg.includes('RESOURCE_EXHAUSTED')
        ) {
          return {
            valid: false,
            error: 'Google API quota reached for this key. Please wait a moment or create a new key.',
          };
        }

        console.warn(`Model ${model} returned: ${errMsg}`);
      } catch (err: any) {
        console.warn(`Probe failed for model ${model}:`, err);
      }
    }

    // Step 2: Try ModelService.ListModels to detect if any other model is enabled on this project
    try {
      const listResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`
      );

      if (listResp.ok) {
        const listData = await listResp.json();
        const availableModels: string[] = (listData.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name?.replace('models/', '') || '');

        const chosen = availableModels.find((m) => m.includes('flash')) || availableModels[0];
        if (chosen) {
          this.saveModel(chosen);
          return { valid: true, model: chosen };
        }
      }
    } catch (e) {
      console.warn('ListModels failed:', e);
    }

    return {
      valid: false,
      error: 'Unable to connect to Google Gemini with this key. Please check your key from Google AI Studio.',
    };
  },
};
