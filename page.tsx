'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// Types - production ready
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Conversation {
  id: string
  title: string
  updatedAt: number
}

const APP_NAME = 'perplexity'
const APP_SUFFIX = 'pro'
const DEFAULT_MODEL = 'Gemini 3.1 Pro Thinking'

const NAV_ITEMS = ['Discover', 'Finance', 'Health', 'Academic', 'Patents']
const SIDEBAR_ITEMS = [
  { id: 'computer', label: 'Computer', icon: 'computer' },
  { id: 'spaces', label: 'Spaces', icon: 'spaces' },
  { id: 'artifacts', label: 'Artifacts', icon: 'artifacts' },
  { id: 'customize', label: 'Customize', icon: 'customize' },
  { id: 'history', label: 'History', icon: 'history' },
]

const SUGGESTIONS = [
  { id: 'debug', label: 'Debug code', prompt: 'Help me debug this code:' },
  { id: 'slides', label: 'Create slides', prompt: 'Create a slide deck about' },
  { id: 'data', label: 'Data visualization', prompt: 'Visualize data for' },
  { id: 'research', label: 'Advanced research', prompt: 'Research deeply:' },
  { id: 'automate', label: 'Automate workflow', prompt: 'Help me automate' },
  { id: 'prototype', label: 'Prototype', prompt: 'Prototype an idea for' },
]

export default function Page() {
  // Core state - ready for backend
  const [conversations, setConversations] = useState<Conversation[]>([]) // BLANK - no mocks
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [searchMode, setSearchMode] = useState('Search')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Keyboard: "/" to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handleNewChat()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort()
    setActiveId(null)
    setMessages([])
    setInput('')
    setIsLoading(false)
    inputRef.current?.focus()
  }, [])

  const createConversation = useCallback((firstMessage: string): string => {
    const id = crypto.randomUUID()
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
    const convo: Conversation = { id, title, updatedAt: Date.now() }
    setConversations(prev => [convo, ...prev])
    setActiveId(id)
    return id
  }, [])

  // PRODUCTION BACKEND HOOK - wire this to your API
  const streamResponse = useCallback(async (query: string, messageId: string) => {
    abortRef.current = new AbortController()
    
    try {
      // TODO: Replace with your actual endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          model,
          mode: searchMode,
          conversationId: activeId,
          messages: messages.slice(-10), // last 10 for context
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        
        // Update message in real-time
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: accumulated } : m
        ))
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Stream error:', error)
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, content: 'Error: Unable to get response. Please try again.' } 
            : m
        ))
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [activeId, messages, model, searchMode])

  const handleSubmit = useCallback(async (e?: React.FormEvent, overrideQuery?: string) => {
    e?.preventDefault()
    const query = (overrideQuery ?? input).trim()
    if (!query || isLoading) return

    // Create conversation if first message
    if (messages.length === 0) {
      createConversation(query)
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
    }

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInput('')
    setIsLoading(true)

    // Update conversation timestamp
    if (activeId) {
      setConversations(prev => prev.map(c => 
        c.id === activeId ? { ...c, updatedAt: Date.now() } : c
      ))
    }

    // DEVELOPMENT FALLBACK - remove when backend ready
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
      // Simulate streaming for UI testing
      const demoResponse = `I'll help you with "${query}". This is a production-ready UI. Wire the streamResponse function to your backend at /api/chat to get real responses.`
      let i = 0
      const interval = setInterval(() => {
        i += 3
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: demoResponse.slice(0, i) }
            : m
        ))
        if (i >= demoResponse.length) {
          clearInterval(interval)
          setIsLoading(false)
        }
      }, 20)
      return
    }

    await streamResponse(query, assistantMessage.id)
  }, [input, isLoading, messages.length, activeId, createConversation, streamResponse])

  const handleSuggestion = (prompt: string) => {
    setInput(prompt + ' ')
    inputRef.current?.focus()
  }

  const isHome = messages.length === 0

  return (
    <div className="h-screen w-screen bg-black text-zinc-200 flex overflow-hidden select-none">
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-[220px]' : 'w-0'} bg-[#050505] border-r border-zinc-900/80 flex flex-col transition-all duration-200 shrink-0 overflow-hidden`}>
        <div className="h-14 flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white"><path d="M12 2L14.5 8.5L21 9L16 13.5L17.5 20L12 16.5L6.5 20L8 13.5L3 9L9.5 8.5L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-zinc-900 rounded-md text-zinc-500 transition-colors" aria-label="Close sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </button>
        </div>

        <div className="px-2 pb-2">
          <button onClick={handleNewChat} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-zinc-900/70 hover:bg-zinc-800 text-[13px] text-zinc-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            <span>New</span>
          </button>
        </div>

        <nav className="px-2 space-y-0.5">
          {SIDEBAR_ITEMS.map(item => (
            <button key={item.id} className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg hover:bg-zinc-900 text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors text-left">
              <SidebarIcon type={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-2 mt-3 min-h-0">
          <div className="text-[11px] text-zinc-600 px-2.5 pb-1.5 font-medium">History</div>
          <div className="space-y-0.5">
            {conversations.length === 0 ? (
              <div className="px-2.5 py-8 text-[12px] text-zinc-700 text-center">
                {/* Intentionally blank for first use */}
              </div>
            ) : (
              conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] truncate transition-colors ${activeId === c.id ? 'bg-zinc-900 text-zinc-200' : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'}`}
                >
                  {c.title}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-zinc-900/80 p-2.5 mt-auto shrink-0">
          <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer transition-colors">
            <div className="relative">
              <img src="https://api.dicebear.com/7.x/thumbs/svg?seed=user" alt="" className="w-6 h-6 rounded-full bg-zinc-800" />
              <span className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-zinc-900 border border-zinc-800 px-1 rounded text-zinc-400 leading-none py-0.5">Pro</span>
            </div>
            <span className="text-[13px] text-zinc-300 flex-1 truncate">leaverlist28520</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-zinc-600"><path d="M12 5a5 5 0 0 0-5 5v3l-2 3v1h14v-1l-2-3v-3a5 5 0 0 0-5-5z"/><path d="M9 19a3 3 0 0 0 6 0"/></svg>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {/* Top Nav */}
        <header className="h-14 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2 min-w-[40px]">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-zinc-900 rounded-md text-zinc-500 transition-colors" aria-label="Open sidebar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
              </button>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-5">
            {NAV_ITEMS.map(item => (
              <button key={item} className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors">
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Scheduled
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-h-0 relative">
          {isHome ? (
            /* HOME STATE - exact replica */
            <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
              <div className="w-full max-w-[720px] -mt-[10vh]">
                <div className="text-center mb-10">
                  <h1 className="text-[42px] leading-none tracking-tight font-medium">
                    <span className="text-white font-[550]">{APP_NAME}</span>
                    <span className="text-zinc-500 font-light ml-1.5">{APP_SUFFIX}</span>
                  </h1>
                </div>

                <SearchBox
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                  inputRef={inputRef}
                  isLoading={isLoading}
                  model={model}
                  searchMode={searchMode}
                  setSearchMode={setSearchMode}
                />

                <div className="mt-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] text-zinc-600">Not sure where to start?</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSuggestion(s.prompt)}
                        className="group flex items-center gap-2.5 px-3.5 py-2.5 bg-[#0c0c0c] hover:bg-[#141414] border border-zinc-900 hover:border-zinc-800 rounded-xl text-left transition-all"
                      >
                        <span className="text-zinc-600 group-hover:text-zinc-400"><SuggestionIcon type={s.id} /></span>
                        <span className="text-[13px] text-zinc-400 group-hover:text-zinc-200">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CHAT STATE */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-[780px] mx-auto px-4 py-8">
                  {messages.map((message) => (
                    <div key={message.id} className="mb-8">
                      {message.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-[14px] leading-[1.6] text-zinc-100">
                            {message.content}
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-zinc-500"><path d="M12 2L14.5 8.5L21 9L16 13.5L17.5 20L12 16.5L6.5 20L8 13.5L3 9L9.5 8.5L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] leading-[1.7] text-zinc-200 whitespace-pre-wrap">
                              {message.content || (isLoading && <span className="inline-block w-2 h-4 bg-zinc-600 animate-pulse" />)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Sticky input */}
              <div className="shrink-0 border-t border-zinc-900/50 bg-gradient-to-t from-black via-black to-transparent">
                <div className="max-w-[780px] mx-auto px-4 py-4">
                  <SearchBox
                    input={input}
                    setInput={setInput}
                    onSubmit={handleSubmit}
                    inputRef={inputRef}
                    isLoading={isLoading}
                    model={model}
                    searchMode={searchMode}
                    setSearchMode={setSearchMode}
                    compact
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// Search Box Component - extracted for reuse
function SearchBox({ input, setInput, onSubmit, inputRef, isLoading, model, searchMode, setSearchMode, compact = false }: any) {
  return (
    <form onSubmit={onSubmit} className="relative">
      <div className="bg-[#0e0e0e] border border-zinc-800 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.3)] hover:border-zinc-700 focus-within:border-zinc-700 transition-colors">
        <div className={`px-4 ${compact ? 'pt-2.5 pb-1.5' : 'pt-3 pb-2'}`}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type / for search modes"
            disabled={isLoading}
            className="w-full bg-transparent outline-none text-[15px] placeholder-zinc-600 text-white disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit()
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
          <div className="flex items-center gap-1.5">
            <button type="button" className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v8M8 12h8"/></svg>
            </button>
            <div className="flex items-center">
              <button type="button" onClick={() => setSearchMode(searchMode === 'Search' ? 'Research' : 'Search')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-xl bg-zinc-900 hover:bg-zinc-800 border-r border-zinc-800 text-[13px] text-zinc-300 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                {searchMode}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <button type="button" className="px-2 py-1.5 rounded-r-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/></svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="hidden sm:flex items-center gap-1.5 text-[13px] text-zinc-600 hover:text-zinc-400 px-2 py-1 transition-colors">
              {model}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${input.trim() && !isLoading ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l14-7-7 14-2-5-5-2z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="absolute -top-3 left-3">
          <div className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16l-4.9 2.2.9-5.5-4-3.9 5.5-.8L12 3z"/></svg>
          </div>
        </div>
      )}
    </form>
  )
}

function SidebarIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    computer: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10"/></svg>,
    spaces: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>,
    artifacts: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>,
    customize: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 1-2 0 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 1 0-2 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.2a1.7 1.7 0 0 1 1.6 0h.2a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 1 0 2z"/></svg>,
    history: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><path d="M12 7v5l3 3"/></svg>,
  }
  return icons[type] || null
}

function SuggestionIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    debug: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="m16 18-4-4-4 4M8 6l4 4 4-4"/></svg>,
    slides: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>,
    data: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
    research: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
    automate: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>,
    prototype: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 2a10 10 0 0 0-9.95 9h11.64L9.74 7.05A3 3 0 1 1 12 2z"/><path d="M21.95 11a10 10 0 0 1-9.95 11 3 3 0 0 1-2.26-5.05L13.69 13H2.05A10 10 0 0 0 21.95 11z"/></svg>,
  }
  return icons[type] || null
}
