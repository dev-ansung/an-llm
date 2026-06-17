export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tokens?: number;
  speed?: number;
  duration?: number;
  stopReason?: string;
  images?: string[]; // base64 Data URLs
  files?: { name: string; content: string }[]; // attached text files
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  content: string;
  isImage: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

export interface Params {
  systemPrompt: string;
  temperature: number;
  limitLength: boolean;
  enableThinking: boolean;
  downsizeEnabled: boolean;
  downsizeMaxPx: number;
}

export interface ApiConfig {
  apiKey: string;
  apiBase: string;
  modelName: string;
}

export interface ApiLog {
  id: string;
  timestamp: string;
  url: string;
  request: {
    model: string;
    messages: any[];
    temperature: number;
    max_tokens?: number;
    stream: boolean;
  };
  response?: {
    status: number;
    statusText: string;
    content: string;
    tokens?: number;
    speed?: number;
    duration?: number;
    error?: string;
  };
}
