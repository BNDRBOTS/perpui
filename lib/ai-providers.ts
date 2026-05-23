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
