
export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  priority: Priority;
  created_at: string;
  due_date?: string;
}

export interface AIRenderedStep {
  step: string;
  description: string;
}

export interface GeminiResponse {
  steps: AIRenderedStep[];
}
