/**
 * Gemini AI API client — routes all AI calls through the backend
 * Rule 09: NEVER call Gemini from frontend directly
 */

import { API_BASE_URL, STRINGS } from '../constants';

interface ChatContext {
  dataType: string;
  numClasses: number;
  samplesPerClass: string;
  lastAccuracy: string;
  lastLoss: string;
  epochs: number;
}

/**
 * Send a chat message to the Gemini-powered AI assistant
 * Streams the response via SSE
 */
export async function sendChatMessage(
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  onDone: () => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    });

    if (response.status === 429) {
      onError(STRINGS.ERROR_AI_RATE_LIMIT);
      // Retry once after 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return sendChatMessage(message, context, onChunk, onError, onDone);
    }

    if (!response.ok) {
      onError(STRINGS.ERROR_AI_OFFLINE);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      onError(STRINGS.ERROR_AI_EMPTY);
      return;
    }

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
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              onChunk(parsed.text);
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    }
    onDone();
  } catch {
    onError(STRINGS.ERROR_AI_OFFLINE);
  }
}

/**
 * Generate offline tips based on training metrics (no API call needed)
 */
export function getOfflineTips(accuracy: number, loss: number, epochs: number): string[] {
  const tips: string[] = [];

  if (accuracy < 50) {
    tips.push('⚠️ Accuracy is very low. Try adding more diverse samples to each class.');
    tips.push('💡 Make sure your classes are visually distinct from each other.');
    tips.push('🔧 Try increasing the number of training epochs.');
  } else if (accuracy < 70) {
    tips.push('📊 Accuracy is moderate. Consider adding more training samples.');
    tips.push('⚙️ Try adjusting the learning rate — lower values train slower but more accurately.');
    tips.push('🎯 Check if your classes have similar numbers of samples (balanced data).');
  } else if (accuracy < 90) {
    tips.push('✅ Good accuracy! Try fine-tuning with more epochs.');
    tips.push('📈 Consider adding harder-to-classify samples to improve robustness.');
  } else {
    tips.push('🎉 Excellent accuracy! Your model is performing well.');
    tips.push('⚠️ Watch out for overfitting — test with new, unseen data.');
    tips.push('💡 If validation loss is increasing while training loss decreases, reduce epochs.');
  }

  if (loss > 1) {
    tips.push('📉 High loss suggests the model is struggling. Add more data or reduce complexity.');
  }

  if (epochs < 10) {
    tips.push('🔄 You might benefit from training for more epochs.');
  } else if (epochs > 100) {
    tips.push('⏰ Many epochs — check if the model has converged (stable loss curve).');
  }

  return tips;
}
