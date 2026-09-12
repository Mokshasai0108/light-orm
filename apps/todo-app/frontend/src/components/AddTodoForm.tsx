import { useState } from "react";
import type { FormEvent } from "react";

interface Props {
  onAdd: (title: string) => Promise<void>;
}

export function AddTodoForm({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setTitle("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="entry-row" onSubmit={handleSubmit}>
      <input
        className="entry-input"
        type="text"
        placeholder="Write a new entry…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="New todo title"
        maxLength={280}
      />
      <button className="entry-submit" type="submit" disabled={!title.trim() || submitting}>
        {submitting ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
