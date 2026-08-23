"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import type { Todo } from "@/types";

interface TodoCardEditFormProps {
  todo: Todo;
  onClose: () => void;
}

export function TodoCardEditForm({ todo, onClose }: TodoCardEditFormProps) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");
  const [saving, setSaving] = useState(false);

  const { updateTodo } = useTodoStore();
  const { toast } = useToast();

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await updateTodo(todo.id, { title: title.trim(), description: description.trim() });
      onClose();
      toast("Rewritten");
    } catch {
      toast("Couldn't save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="space-y-2 overflow-hidden"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onClose();
        }}
        autoFocus
        className="write-line font-hand text-[22px] leading-tight"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        placeholder="a note underneath…"
        rows={2}
        className="write-line resize-none text-[15px]"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || !title.trim()}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Never mind
        </Button>
      </div>
    </motion.div>
  );
}
