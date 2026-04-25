/**
 * Gemini AI API client — dual-mode AI chat
 * 1. Primary: Backend proxy (FastAPI → Gemini) for production use
 * 2. Fallback: Direct Gemini API call from frontend (dev/offline mode)
 * 3. Last resort: Offline tips from local heuristics
 */

import { API_BASE_URL, STRINGS } from '../constants';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

interface ChatContext {
  dataType: string;
  numClasses: number;
  samplesPerClass: string;
  lastAccuracy: string;
  lastLoss: string;
  epochs: number;
}

/** Build system prompt for Gemini (same as backend) */
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

/**
 * Try backend proxy first, then fall back to direct Gemini call.
 */
export async function sendChatMessage(
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  onDone: () => void
): Promise<void> {
  // 1. Try backend proxy if URL is configured
  if (API_BASE_URL) {
    const backendWorked = await tryBackendProxy(message, context, onChunk, onDone);
    if (backendWorked) return;
  }

  // 2. Try direct Gemini API call from frontend
  if (GEMINI_API_KEY) {
    const directWorked = await tryDirectGemini(message, context, onChunk, onDone);
    if (directWorked) return;
  }

  // 3. All failed — show offline tips
  onError(STRINGS.ERROR_AI_OFFLINE);
}

/** Attempt to stream via the backend proxy (FastAPI). Returns true if successful. */
async function tryBackendProxy(
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

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
            // Skip malformed chunks
          }
        }
      }
    }
    onDone();
    return true;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/** Call Gemini API directly from the browser. Returns true if successful. */
async function tryDirectGemini(
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<boolean> {
  // Models in order of preference — only use names confirmed in the v1beta API
  const modelNames = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro'];
  
  for (const modelName of modelNames) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: buildSystemPrompt(context),
      });

      // Use non-streaming first — more quota-friendly than streaming
      const result = await model.generateContent(message);
      const responseText = result.response.text();

      if (responseText) {
        onChunk(responseText);
        onDone();
        return true;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Gemini model ${modelName} failed:`, errMsg);
      
      // If 429 (quota), try next model; if 404, skip this model
      if (errMsg.includes('429') || errMsg.includes('404') || errMsg.includes('not found')) {
        continue;
      }
      // For other errors (network, auth), stop trying
      return false;
    }
  }
  
  return false;
}

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
