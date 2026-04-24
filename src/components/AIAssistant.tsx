/** AI Assistant panel — Gemini-powered chat sidebar with quick prompts */

import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { STRINGS, QUICK_PROMPTS } from '../constants';
import { sendChatMessage, getOfflineTips } from '../lib/gemini';
import type { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FiSend, FiZap, FiWifi, FiWifiOff, FiCpu } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

export default function AIAssistant() {
  const { currentProject, metrics, showAIPanel } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!showAIPanel) return null;

  const lastMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  const context = {
    dataType: currentProject?.dataType || 'image',
    numClasses: currentProject?.classes.length || 0,
    samplesPerClass: currentProject?.classes.map((c) => `${c.name}:${c.samples.length}`).join(', ') || 'none',
    lastAccuracy: lastMetric ? lastMetric.accuracy.toFixed(1) : 'N/A',
    lastLoss: lastMetric ? lastMetric.loss.toFixed(4) : 'N/A',
    epochs: lastMetric ? lastMetric.epoch + 1 : 0,
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    try {
      await sendChatMessage(
        text,
        context,
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content += chunk;
            }
            return [...updated];
          });
        },
        (error) => {
          setIsOnline(false);
          // Show offline tips instead
          const tips = getOfflineTips(
            lastMetric?.accuracy || 0,
            lastMetric?.loss || 0,
            lastMetric?.epoch || 0
          );
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content = `${STRINGS.AI_OFFLINE_TIP}\n\n${tips.map(t => `- ${t}`).join('\n\n')}`;
            }
            return [...updated];
          });
          console.warn('AI error:', error);
        },
        () => {
          setIsLoading(false);
        }
      );
    } catch (error) {
      setIsLoading(false);
      // CRITICAL FIX: Do not swallow the error. Notify the user.
      console.error("AI Communication Error:", error);
      toast.error("Failed to connect to the AI Assistant."); 
    }
  };

  return (
    <aside className="ai-panel" aria-label="AI Assistant">
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiZap size={16} style={{ color: 'var(--primary)' }} />
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-heading)' }}>{STRINGS.AI_TITLE}</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {STRINGS.AI_POWERED_BY}
            </span>
          </div>
        </div>
        {isOnline ? (
          <FiWifi size={14} style={{ color: 'var(--secondary)' }} />
        ) : (
          <FiWifiOff size={14} style={{ color: 'var(--error)' }} />
        )}
      </div>

      {/* Quick Prompts */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
      }}>
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            className="btn btn-ghost btn-sm"
            onClick={() => handleSend(qp.prompt)}
            style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
            }}
            aria-label={qp.label}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            flex: 1,
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--the-mint), var(--bottle-green))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '12px', color: '#fff',
            }}>
              <FiCpu size={24} />
            </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
                {STRINGS.AI_TUTOR_WELCOME}
              </p>
              <p style={{ fontSize: '13px' }}>
                {STRINGS.AI_TUTOR_SUB}
              </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`chat-bubble ${msg.role}`}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>{children}</ul>,
                    li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                  }}
                >
                  {msg.content || '...'}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div style={{ display: 'flex', gap: '4px', padding: '8px 0', alignSelf: 'flex-start' }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                }}
              />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '8px',
      }}>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={STRINGS.AI_PLACEHOLDER}
          aria-label="Chat message input"
          style={{ fontSize: '13px' }}
        />
        <button
          className="btn btn-primary btn-icon"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          <FiSend size={16} />
        </button>
      </div>
    </aside>
  );
}
