/**
 * Gemini API Key Management Service (BYOK - Bring Your Own Key)
 * Safely stores and retrieves the user's free Google Gemini API key in local storage.
 * Zero server cost, 100% private to the user's browser.
 */

const GEMINI_STORAGE_KEY = 'kaistu_gemini_api_key';

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
   * Validate the API key against Google's Gemini API with a minimal ping
   */
  async validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
    const cleanKey = key.trim();
    if (!cleanKey) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    try {
      // Minimal test call to gemini-1.5-flash
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
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
        return { valid: true };
      }

      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || `HTTP ${response.status}: Invalid API Key or Quota`;
      return { valid: false, error: msg };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Network error verifying API key' };
    }
  },
};
