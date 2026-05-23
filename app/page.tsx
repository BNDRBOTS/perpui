'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowRight, ChevronDown, Loader2, AlertTriangle, X,
} from 'lucide-react';
import type { KeyboardEvent, ChangeEvent, FormEvent } from 'react';
import type { ModelOption, ChatResponse, ApiError } from '@/lib/types';

/* ── Model list ── */
const MODELS: ModelOption[] = [
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', provider: 'deepseek', badge: 'Fast' },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', provider: 'deepseek' },
  { id: 'deepseek-v4-max', label: 'DeepSeek V4 Max', provider: 'deepseek', badge: 'Power' },
  { id: 'openai-5.5-thinking', label: 'OpenAI 5.5‑Thinking', provider: 'openai' },
  { id: 'claude-sonnet-4.6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-opus-4.7', label: 'Claude Opus 4.7', provider: 'anthropic', badge: 'Best' },
];

/* ── auto‑resize textarea ── */
function useAutoResize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value, ref]);
}

/* ── Model selector ── */
function ModelSelect({ selected, onSelect }: { selected: ModelOption; onSelect: (m: ModelOption) => void }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white/85 border border-white/[0.08] hover:border-white/[0.16] bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 active:scale-[0.96]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="max-w-[150px] truncate">{selected.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-64 bg-[#1A1A1E] border border-white/[0.08] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50 py-1.5 origin-top-left animate-fade-in"
          role="listbox"
        >
          {MODELS.map(model => (
            <button
              key={model.id}
              type="button"
              onClick={() => { onSelect(model); setOpen(false); }}
              className={`flex items-center justify-between w-full px-3.5 py-2.5 text-sm text-left transition-all duration-100 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:bg-white/[0.05] ${
                selected.id === model.id ? 'text-white bg-white/[0.04] font-medium' : 'text-white/60'
              }`}
              role="option"
              aria-selected={selected.id === model.id}
            >
              <span>{model.label}</span>
              {model.badge && (
                <span className="text-[10px] font-medium text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded-md border border-white/[0.06]">
                  {model.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page component ── */
export default function HomePage() {
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useAutoResize(textareaRef, message);

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, model: selectedModel.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw err;
      }
      const data: ChatResponse = await res.json();
      setResponse(data);
      setMessage('');
    } catch (err: unknown) {
      let apiError: ApiError;
      if (typeof err === 'object' && err !== null && 'error' in err) {
        apiError = err as ApiError;
      } else if (err instanceof Error) {
        apiError = { error: err.message, code: 'INTERNAL_ERROR' };
      } else {
        apiError = { error: 'Network or server error', code: 'INTERNAL_ERROR' };
      }
      setError(apiError);
    } finally {
      setLoading(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  }, [message, selectedModel, loading]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
  }, [handleSubmit]);

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B0D] px-4 sm:px-6 md:px-8 font-sans antialiased selection:bg-white/20 selection:text-white">
        <div className="w-full max-w-3xl flex flex-col items-center gap-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <img
              src="/bndr-logo.svg"
              alt="BNDR Platform"
              className="h-8 sm:h-9 md:h-10 invert opacity-85 select-none pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Command card */}
          <form
            onSubmit={handleSubmit}
            className={`w-full rounded-2xl border p-4 shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-all duration-300 ${
              isFocused
                ? 'border-white/[0.14] bg-[#18181B] shadow-[0_12px_48px_rgba(0,0,0,0.6)]'
                : 'border-white/[0.05] bg-[#141417]'
            }`}
          >
            <div className="flex items-start px-2 py-3">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you need — research, code, draft, or analyze…"
                className="w-full bg-transparent text-white/90 placeholder:text-white/18 outline-none resize-none text-lg leading-relaxed caret-white/70"
                rows={1}
                aria-label="Command input"
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between mt-2 pt-2">
              <ModelSelect selected={selectedModel} onSelect={setSelectedModel} />
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                  message.trim() && !loading
                    ? 'bg-white text-black hover:bg-white/90 active:scale-90 active:bg-white/80 shadow-[0_2px_12px_rgba(255,255,255,0.15)]'
                    : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                }`}
                aria-label="Submit"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Response card */}
          {response && (
            <div className="w-full rounded-2xl border border-white/[0.06] bg-[#141417] p-6 animate-fade-in animate-slide-in-from-bottom">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white/25 uppercase tracking-widest">Response</span>
                <span className="text-[10px] text-white/20 font-mono">
                  {response.model}{response.usage ? ` · ${response.usage.totalTokens} tokens` : ''}
                </span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-white/80 whitespace-pre-wrap break-words">
                {response.content}
              </div>
            </div>
          )}

          {/* Error card */}
          {error && (
            <div className="w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-300 font-medium">{error.error}</p>
                {error.code && <p className="text-xs text-red-400/60 mt-1 font-mono">{error.code}</p>}
              </div>
              <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-300 transition-colors p-0.5 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <footer className="mt-auto py-4 flex items-center gap-4 text-[11px] text-white/15 select-none">
          <span>BNDR · Secure protocol active</span>
          <span className="text-white/[0.06]">|</span>
          <span>All processing subject to workspace policies</span>
        </footer>
      </div>
    </>
  );
}
