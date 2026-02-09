
export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  image?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  isPinned: boolean;
  lastModified: number;
  category?: 'web-dev' | 'nodejs' | 'python' | 'general';
}

export interface UserStats {
  dailyCount: number;
  lastReset: string;
  isUnlimited: boolean;
}

export enum SoraaTool {
  WEB_DEV = 'web-dev',
  QUESTIONS = 'questions',
  NODEJS = 'nodejs',
  PYTHON = 'python'
}
