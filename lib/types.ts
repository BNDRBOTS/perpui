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
