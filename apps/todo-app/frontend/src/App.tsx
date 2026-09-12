import { useEffect, useState } from "react";
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "./api.js";
import type { Todo, TodoFilter } from "./api.js";
import { AddTodoForm } from "./components/AddTodoForm.js";
import { FilterTabs } from "./components/FilterTabs.js";
import { TodoRow } from "./components/TodoRow.js";

export default function App() {
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [todos, setTodos] = useState<Todo[] | null>(null); // null = still loading
  const [error, setError] = useState<string | null>(null);

  async function load(nextFilter: TodoFilter) {
    setError(null);
    try {
      const data = await fetchTodos(nextFilter);
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading your list.");
    }
  }

  useEffect(() => {
    load(filter);
  }, [filter]);

  async function handleAdd(title: string) {
    setError(null);
    try {
      const created = await createTodo(title);
      if (filter === "all" || (filter === "active" && !created.completed)) {
        setTodos((prev) => [...(prev ?? []), created]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that entry.");
    }
  }

  async function handleToggle(todo: Todo) {
    setError(null);
    const previous = todos;
    setTodos((prev) => (prev ? prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)) : prev));
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed });
      setTodos((prev) => {
        if (!prev) return prev;
        const next = prev.map((t) => (t.id === updated.id ? updated : t));
        if (filter === "active" && updated.completed) return next.filter((t) => t.id !== updated.id);
        if (filter === "completed" && !updated.completed) return next.filter((t) => t.id !== updated.id);
        return next;
      });
    } catch (err) {
      setTodos(previous ?? null);
      setError(err instanceof Error ? err.message : "Couldn't update that entry.");
    }
  }

  async function handleDelete(todo: Todo) {
    setError(null);
    const previous = todos;
    setTodos((prev) => (prev ? prev.filter((t) => t.id !== todo.id) : prev));
    try {
      await deleteTodo(todo.id);
    } catch (err) {
      setTodos(previous ?? null);
      setError(err instanceof Error ? err.message : "Couldn't delete that entry.");
    }
  }

  const openCount = todos?.filter((t) => !t.completed).length ?? 0;
  const totalCount = todos?.length ?? 0;

  return (
    <main className="page">
      <div className="sheet">
        <header className="sheet-header">
          <h1 className="brand">Ledger</h1>
        </header>

        <AddTodoForm onAdd={handleAdd} />

        <div className="sheet-toolbar">
          <FilterTabs value={filter} onChange={setFilter} />
          {todos && (
            <span className="tally">
              {openCount} of {totalCount} open
            </span>
          )}
        </div>

        <div className="rule" />

        {error && (
          <p className="banner banner--error" role="alert">
            {error}
          </p>
        )}

        {todos === null && !error && <p className="banner">Loading your list…</p>}

        {todos !== null && todos.length === 0 && (
          <div className="empty-state">
            <p className="empty-state-title">Nothing here yet.</p>
            <p className="empty-state-body">Add your first entry above to start the ledger.</p>
          </div>
        )}

        {todos !== null && todos.length > 0 && (
          <ul className="entries">
            {todos.map((todo, i) => (
              <TodoRow key={todo.id} todo={todo} index={i} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
