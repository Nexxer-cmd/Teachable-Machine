/**
 * Multi-Provider AI Client — robust AI chat with automatic failover
 *
 * Priority chain:
 * 1. Backend proxy (FastAPI → Gemini) — if backend is running
 * 2. Gemini direct (browser → Google AI) — primary free option
 * 3. Groq direct (browser → Groq) — free fallback, Llama 3.3 70B
 * 4. Offline tips — local heuristic fallback (always works)
 *
 * Each provider is tried in order. If one fails, the next is attempted.
 * This ensures the AI assistant is ALWAYS available.
 */

import { API_BASE_URL, STRINGS } from '../constants';

// ── API Keys from environment ────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

interface ChatContext {
  dataType: string;
  numClasses: number;
  samplesPerClass: string;
  lastAccuracy: string;
  lastLoss: string;
  epochs: number;
}

/** Build the system prompt shared across all providers */
function buildSystemPrompt(ctx: ChatContext): string {
  return `You are an expert ML educator embedded inside Teachable Machine Pro,
a free browser-based machine learning tool for students.

Current project context:
- Data type: ${ctx.dataType} classification
- Classes: ${ctx.numClasses} classes
- Samples: ${ctx.samplesPerClass}
- Latest accuracy: ${ctx.lastAccuracy}%
- Latest loss: ${ctx.lastLoss} after ${ctx.epochs} epochs

Your responsibilities:
1. Explain ML concepts clearly for beginners — no jargon without explanation.
2. Diagnose problems from the metrics above — be specific, not generic.
3. If accuracy < 70%: suggest exactly what to fix (data, epochs, balance).
4. If accuracy > 90%: warn about possible overfitting, suggest validation.
5. Keep responses concise — bullet points preferred.
6. Always end with ONE follow-up question to deepen understanding.
7. Never mention cost or paid tools — this user is a student using free tools.`;
}

// ── Main Entry Point ─────────────────────────────────────────

/**
 * Send a chat message. Tries multiple providers in order until one succeeds.
 */
export async function sendChatMessage(
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  onDone: () => void
): Promise<void> {
  const providers: Array<() => Promise<boolean>> = [];

  // 1. Backend proxy (only if URL is configured and likely running)
  if (API_BASE_URL) {
    providers.push(() => tryBackendProxy(message, context, onChunk, onDone));
  }

  // 2. Gemini direct from browser
  if (GEMINI_API_KEY) {
    providers.push(() => tryGeminiDirect(message, context, onChunk, onDone));
  }

  // 3. Groq direct from browser (free fallback)
  if (GROQ_API_KEY) {
    providers.push(() => tryGroqDirect(message, context, onChunk, onDone));
  }

  // Try each provider in order
  for (const provider of providers) {
    try {
      const success = await provider();
      if (success) return; // Provider worked — done
    } catch (err) {
      console.warn('Provider failed:', err);
    }
  }

  // All providers failed — show offline tips
  onError(STRINGS.ERROR_AI_OFFLINE);
}

// ── Provider 1: Backend Proxy (FastAPI) ──────────────────────

async function tryBackendProxy(
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return false;

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return false;

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            onDone();
            return true;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) onChunk(parsed.text);
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }
    }
    onDone();
    return true;
  } catch {
    clearTimeout(timeoutId);
    console.warn('Backend proxy unreachable');
    return false;
  }
}

// ── Provider 2: Gemini Direct (Google AI REST API) ──────────

async function tryGeminiDirect(
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<boolean> {
  // Use the REST API directly — avoids the SDK import and bundle bloat
  const systemPrompt = buildSystemPrompt(context);
  const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: message }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        console.warn(`Gemini ${model} returned ${status}`);
        // 429 = quota exceeded, 404 = model not found — try next model
        if (status === 429 || status === 404) continue;
        // 403 = API key issue — stop trying Gemini
        if (status === 403) return false;
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        onChunk(text);
        onDone();
        return true;
      }

      // Safety filter blocked — try next model
      if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
        onChunk('I cannot respond to that request due to safety filters. Please rephrase your question.');
        onDone();
        return true;
      }
    } catch (err) {
      console.warn(`Gemini ${model} error:`, err);
      continue;
    }
  }

  return false;
}

// ── Provider 3: Groq Direct (Free Llama 3.3 70B) ────────────

async function tryGroqDirect(
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<boolean> {
  const systemPrompt = buildSystemPrompt(context);
  // Groq free tier: 30 req/min, 6000 tokens/min
  // Models in order: Llama 3.3 70B (best), Llama 3.1 8B (faster)
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        console.warn(`Groq ${model} returned ${status}`);
        if (status === 429) continue; // Rate limited — try next model
        if (status === 401) return false; // Bad key — stop
        continue;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;

      if (text) {
        onChunk(text);
        onDone();
        return true;
      }
    } catch (err) {
      console.warn(`Groq ${model} error:`, err);
      continue;
    }
  }

  return false;
}

// ── Offline Tips (Always Available) ──────────────────────────

/**
 * Generate offline tips based on training metrics (no API call needed)
 */
export function getOfflineTips(accuracy: number, loss: number, epochs: number): string[] {
  const tips: string[] = [];

  if (accuracy < 50) {
    tips.push('**Warning** — Accuracy is very low. Try adding more diverse samples to each class.');
    tips.push('**Tip** — Make sure your classes are visually distinct from each other.');
    tips.push('**Fix** — Try increasing the number of training epochs.');
  } else if (accuracy < 70) {
    tips.push('**Stats** — Accuracy is moderate. Consider adding more training samples.');
    tips.push('**Config** — Try adjusting the learning rate — lower values train slower but more accurately.');
    tips.push('**Balance** — Check if your classes have similar numbers of samples.');
  } else if (accuracy < 90) {
    tips.push('**Good** — Good accuracy! Try fine-tuning with more epochs.');
    tips.push('**Improve** — Consider adding harder-to-classify samples to improve robustness.');
  } else {
    tips.push('**Excellent** — Your model is performing well.');
    tips.push('**Caution** — Watch out for overfitting. Test with new, unseen data.');
    tips.push('**Tip** — If validation loss is increasing while training loss decreases, reduce epochs.');
  }

  if (loss > 1) {
    tips.push('**Loss** — High loss suggests the model is struggling. Add more data or reduce complexity.');
  }

  if (epochs < 10) {
    tips.push('**Epochs** — You might benefit from training for more epochs.');
  } else if (epochs > 100) {
    tips.push('**Duration** — Many epochs. Check if the model has converged (stable loss curve).');
  }

  return tips;
}
