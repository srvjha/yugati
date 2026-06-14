'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Bot, Loader2, Mail, Calendar, Zap } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  { icon: Mail,     text: 'Show me my unread emails'               },
  { icon: Calendar, text: 'What meetings do I have this week?'     },
  { icon: Zap,      text: 'Summarise the last 5 emails I received' },
  { icon: Mail,     text: 'Draft a reply to my most recent email'  },
];

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [isLoading, setLoading] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function submit(text: string) {
    if (!text.trim() || isLoading) return;

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch('/api/agent/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      });
      const data = await res.json() as { output?: string; error?: string };
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.output ?? data.error ?? 'Something went wrong.' },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Network error — please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(input); }
  };

  return (
    <div className="h-full flex flex-col bg-black text-white">

      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 px-6 h-14 flex items-center gap-2">
        <Bot size={16} className="text-zinc-400" />
        <span className="font-medium text-sm">Chat</span>
        <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-wider">
          AI mode
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 px-6 pb-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4">
                <span className="text-black text-xl font-bold">Y</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">What can I help you with?</h2>
              <p className="text-zinc-500 text-sm">
                I can read your emails, check your calendar, draft replies, and more.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => void submit(text)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-all text-left"
                >
                  <Icon size={14} className="shrink-0 text-zinc-500" />
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-zinc-800 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-white flex items-center justify-center mt-0.5">
                      <span className="text-black text-xs font-bold">Y</span>
                    </div>
                    <p className="flex-1 text-sm leading-relaxed whitespace-pre-wrap text-zinc-100 pt-0.5">
                      {msg.content}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 items-start">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-black text-xs font-bold">Y</span>
                </div>
                <div className="flex gap-1 items-center h-7">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-zinc-500 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your email or calendar…"
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm resize-none outline-none placeholder-zinc-600 min-h-5 max-h-40 leading-5 disabled:opacity-50"
            />
            <button
              onClick={() => void submit(input)}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} />}
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-700 mt-2">
            Yugati can make mistakes. Verify important actions before confirming.
          </p>
        </div>
      </div>

    </div>
  );
}
