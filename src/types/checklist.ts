export interface ChecklistItem {
  id: string;
  todoId: string;
  text: string;
  done: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistProgress {
  total: number;
  done: number;
  percent: number;
}

export interface CreateChecklistItemInput {
  text: string;
  done?: boolean;
  position?: number;
}

export interface UpdateChecklistItemInput {
  text?: string;
  done?: boolean;
  position?: number;
}
