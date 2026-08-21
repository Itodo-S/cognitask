"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useTodoStore } from "@/stores/todoStore";
import { useToast } from "@/components/ui/Toast";
import type { Todo } from "@/types";

interface TodoCardEditFormProps {
  todo: Todo;
  onClose: () => void;
}

export function TodoCardEditForm({ todo, onClose }: TodoCardEditFormProps) {
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description ?? "");
  
  const { updateTodo } = useTodoStore();
  const { toast } = useToast();

  const handleSave = async () => {
    await updateTodo(todo.id, { title: editTitle, description: editDesc });
    onClose();
    toast("Task updated");
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2"
    >
      <Input
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        autoFocus
      />
      <Textarea
        value={editDesc}
        onChange={(e) => setEditDesc(e.target.value)}
        placeholder="Add a description..."
        rows={2}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </motion.div>
  );
}
