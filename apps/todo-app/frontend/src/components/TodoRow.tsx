import type { Todo } from "../api.js";

interface Props {
  todo: Todo;
  index: number;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export function TodoRow({ todo, index, onToggle, onDelete }: Props) {
  return (
    <li className={todo.completed ? "entry entry--done" : "entry"}>
      <span className="entry-number">{String(index + 1).padStart(2, "0")}</span>
      <button
        className="entry-check"
        role="checkbox"
        aria-checked={todo.completed}
        aria-label={todo.completed ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`}
        onClick={() => onToggle(todo)}
        type="button"
      >
        {todo.completed ? "✓" : ""}
      </button>
      <span className="entry-title">{todo.title}</span>
      <button
        className="entry-delete"
        aria-label={`Delete "${todo.title}"`}
        onClick={() => onDelete(todo)}
        type="button"
      >
        ✕
      </button>
    </li>
  );
}
