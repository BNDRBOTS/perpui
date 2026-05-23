```text
project/
├── .env.local.example
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── public/
│   └── bndr-logo.svg
├── lib/
│   ├── types.ts
│   └── ai-providers.ts
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       └── chat/
│           └── route.ts
└── README.md
```

### `.gitignore`
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

### `package.json`
```json
{
  "name": "bndr",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.21",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.454.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.17",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `next.config.js`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
```

### `tailwind.config.ts`
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-from-bottom': 'slideInFromBottom 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromBottom: {
          '0%': { transform: 'translateY(0.5rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

### `postcss.config.js`
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `.env.local.example`
```
# DeepSeek
DEEPSEEK_API_KEY=sk-your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# OpenAI
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1

# Supabase (optional, not used directly in this build)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### `lib/types.ts`
```ts
export interface ModelOption {
  id: string;
  label: string;
  provider: 'deepseek' | 'openai' | 'anthropic';
  badge?: string;
}

export interface ChatRequest {
  message: string;
  model: string;
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ApiError {
  error: string;
  code?: string;
}
```

### `lib/ai-providers.ts`
```ts
import { ChatResponse, ApiError } from './types';

const MODEL_API_MAP: Record<string, { apiModel: string; provider: string }> = {
  'deepseek-v4-flash': { apiModel: 'deepseek-chat', provider: 'deepseek' },
  'deepseek-v4-pro': { apiModel: 'deepseek-chat', provider: 'deepseek' },
  'deepseek-v4-max': { apiModel: 'deepseek-chat', provider: 'deepseek' },
  'openai-5.5-thinking': { apiModel: 'gpt-4.5-turbo', provider: 'openai' },
  'claude-sonnet-4.6': { apiModel: 'claude-sonnet-4-20250514', provider: 'anthropic' },
  'claude-opus-4.7': { apiModel: 'claude-opus-4-20250514', provider: 'anthropic' },
};

function generateId() {
  return `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function callDeepSeek(message: string, model: string, apiKey: string, baseUrl: string): Promise<ChatResponse> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL_API_MAP[model]?.apiModel || model, messages: [{ role: 'user', content: message }], temperature: 0.7, max_tokens: 4096 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { error: err.error?.message || 'DeepSeek error', code: String(res.status) } as ApiError;
  }
  const data = await res.json();
  return {
    id: data.id || generateId(),
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    usage: { promptTokens: data.usage?.prompt_tokens || 0, completionTokens: data.usage?.completion_tokens || 0, totalTokens: data.usage?.total_tokens || 0 },
  };
}

async function callOpenAI(message: string, model: string, apiKey: string, baseUrl: string): Promise<ChatResponse> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL_API_MAP[model]?.apiModel || model, messages: [{ role: 'user', content: message }], temperature: 0.7, max_tokens: 4096 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { error: err.error?.message || 'OpenAI error', code: String(res.status) } as ApiError;
  }
  const data = await res.json();
  return {
    id: data.id || generateId(),
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    usage: { promptTokens: data.usage?.prompt_tokens || 0, completionTokens: data.usage?.completion_tokens || 0, totalTokens: data.usage?.total_tokens || 0 },
  };
}

async function callAnthropic(message: string, model: string, apiKey: string, baseUrl: string): Promise<ChatResponse> {
  const res = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL_API_MAP[model]?.apiModel || model, max_tokens: 4096, messages: [{ role: 'user', content: message }] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { error: err.error?.message || 'Anthropic error', code: String(res.status) } as ApiError;
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  return {
    id: data.id || generateId(),
    content: text,
    model: data.model || model,
    usage: { promptTokens: data.usage?.input_tokens || 0, completionTokens: data.usage?.output_tokens || 0, totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) },
  };
}

export async function generateChatCompletion(message: string, modelId: string): Promise<ChatResponse> {
  const provider = MODEL_API_MAP[modelId]?.provider || 'openai';
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  switch (provider) {
    case 'deepseek':
      if (!deepseekKey) throw new Error('DeepSeek API key missing');
      return callDeepSeek(message, modelId, deepseekKey, process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1');
    case 'openai':
      if (!openaiKey) throw new Error('OpenAI API key missing');
      return callOpenAI(message, modelId, openaiKey, process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
    case 'anthropic':
      if (!anthropicKey) throw new Error('Anthropic API key missing');
      return callAnthropic(message, modelId, anthropicKey, process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1');
    default:
      throw new Error(`Unsupported model: ${modelId}`);
  }
}
```

### `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.12);
  }
}
```

### `app/layout.tsx`
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BNDR — Intelligent Workspace',
  description: 'Research, code, draft, and collaborate with frontier AI models.',
  keywords: ['AI', 'workspace', 'collaboration', 'coding', 'writing'],
  openGraph: {
    title: 'BNDR — Intelligent Workspace',
    description: 'Premium AI workspace for teams.',
    type: 'website',
    siteName: 'BNDR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BNDR — Intelligent Workspace',
    description: 'Premium AI workspace for teams.',
  },
  robots: { index: true, follow: true },
  themeColor: '#0B0B0D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-[#0B0B0D] text-[#EDEDEF] font-sans">
        {children}
      </body>
    </html>
  );
}
```

### `app/page.tsx`
```tsx
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
```

### `app/api/chat/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';
import { generateChatCompletion } from '@/lib/ai-providers';
import type { ChatRequest, ApiError } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;

    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      const err: ApiError = { error: 'Message is required', code: 'INVALID_INPUT' };
      return NextResponse.json(err, { status: 400 });
    }

    if (!body.model || typeof body.model !== 'string') {
      const err: ApiError = { error: 'Model identifier is required', code: 'INVALID_MODEL' };
      return NextResponse.json(err, { status: 400 });
    }

    const chatResponse = await generateChatCompletion(body.message.trim(), body.model);
    return NextResponse.json(chatResponse, { status: 200 });
  } catch (error: unknown) {
    console.error('[API Chat]', error);

    let apiError: ApiError;
    if (typeof error === 'object' && error !== null && 'error' in error) {
      apiError = error as ApiError;
    } else if (error instanceof Error) {
      apiError = { error: error.message, code: 'INTERNAL_ERROR' };
    } else {
      apiError = { error: 'Unexpected server error', code: 'INTERNAL_ERROR' };
    }

    return NextResponse.json(apiError, { status: 500 });
  }
}
```

### `public/bndr-logo.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 28" fill="none">
  <rect x="2" y="4" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/>
  <rect x="10" y="4" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
  <rect x="6" y="12" width="6" height="6" rx="1.5" fill="white" opacity="0.75"/>
  <text x="22" y="21" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="white" letter-spacing="-0.5">BNDR</text>
</svg>
```

### `README.md`
```markdown
# BNDR — Intelligent Workspace

A premium AI workspace supporting DeepSeek, OpenAI, and Claude models.

## Quick start

1. Clone the repo and install dependencies:
```bash
npm install
```

2. Copy `.env.local.example` to `.env.local` and add at least one API key (e.g., `OPENAI_API_KEY`).
3. Run the development server:
```bash
npm run dev
```
4. Open [http://localhost:3000](http://localhost:3000).

## Deploy

### Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/bndr)

Add your environment variables in the Vercel dashboard.

### Railway
Link your GitHub repository to Railway, set the build command `npm run build` and start command `npm start`, then add the required environment variables.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | No | DeepSeek API key |
| `OPENAI_API_KEY` | Recommended | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | Anthropic API key |
| `*_BASE_URL` | No | Base URL override (defaults to official endpoints) |

## Tech stack

- Next.js 14 (App Router)
- Tailwind CSS
- Lucide Icons
- Server‑side API routes
- TypeScript
```
