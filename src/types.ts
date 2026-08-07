export interface UserSession {
  id: string;
  email?: string;
  username: string;
  avatar: string;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  userId: string; // 'system' or the userId
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
  matchedSources?: { id: string; title: string; category: string }[];
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

