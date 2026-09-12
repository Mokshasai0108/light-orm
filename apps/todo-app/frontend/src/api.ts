export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export type TodoFilter = "all" | "active" | "completed";

async function parseJsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body?.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export async function fetchTodos(filter: TodoFilter): Promise<Todo[]> {
  const query = filter === "all" ? "" : `?completed=${filter === "completed"}`;
  const res = await fetch(`/api/todos${query}`);
  return parseJsonOrThrow(res);
}

export async function createTodo(title: string): Promise<Todo> {
  const res = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return parseJsonOrThrow(res);
}

export async function updateTodo(id: number, patch: Partial<Pick<Todo, "title" | "completed">>): Promise<Todo> {
  const res = await fetch(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseJsonOrThrow(res);
}

export async function deleteTodo(id: number): Promise<void> {
  const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    await parseJsonOrThrow(res);
  }
}
