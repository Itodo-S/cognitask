"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import type { TodoPriority, TodoCategory } from "@/types";

const priorities: { value: TodoPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const categories: { value: TodoCategory; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
  { value: "learning", label: "Learning" },
  { value: "creative", label: "Creative" },
  { value: "errands", label: "Errands" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
];

interface TodoFormProps {
  open: boolean;
  onClose: () => void;
  parentId?: string;
}

export function TodoForm({ open, onClose, parentId }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [category, setCategory] = useState<TodoCategory | "">("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const { createTodo } = useTodoStore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await createTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category: category || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        parentId,
      });
      toast("Task created");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setCategory("");
      setDueDate("");
      onClose();
    } catch {
      toast("Failed to create task", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={parentId ? "Add Subtask" : "New Task"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Task title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />

        <Textarea
          label="Description (optional)"
          placeholder="Add more details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-sm font-medium text-ink-700">Priority</label>
            <div className="flex gap-1">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-sans font-medium border transition-all ${
                    priority === p.value
                      ? "bg-ink-900 text-paper-50 border-ink-900"
                      : "bg-paper-50 text-ink-600 border-ink-200 hover:border-ink-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-sm font-medium text-ink-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TodoCategory | "")}
              className="w-full px-3 py-1.5 bg-paper-50 border border-ink-200 rounded-md font-sans text-sm text-ink-700 focus:outline-none focus:ring-1 focus:ring-ink-900/20"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Due date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
