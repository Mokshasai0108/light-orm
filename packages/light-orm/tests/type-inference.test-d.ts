/**
 * type-inference.test-d.ts
 * ------------------------
 * These are *type-level* tests: `vitest typecheck` (see package.json's
 * `test:types` script) runs the TypeScript compiler over this file and
 * fails the run if:
 *   - any `expectTypeOf` assertion fails, OR
 *   - a line marked `@ts-expect-error` does NOT produce a compile error, OR
 *   - any other line produces an *unexpected* compile error.
 *
 * This directly verifies the assignment's requirement that certain misuses
 * "must produce TypeScript errors".
 */
import { describe, expectTypeOf, it } from "vitest";
import { boolean, defineModel, number, string } from "../src/schema.js";
import type { CreateInput, InferModel } from "../src/types.js";

const Todo = defineModel("todo", {
  id: number(),
  title: string(),
  completed: boolean(),
});

type TodoRow = InferModel<typeof Todo>;
type TodoCreate = CreateInput<typeof Todo>;

describe("InferModel", () => {
  it("infers the correct plain object shape from a model definition", () => {
    expectTypeOf<TodoRow>().toEqualTypeOf<{
      id: number;
      title: string;
      completed: boolean;
    }>();
  });

  it("CreateInput excludes the auto-generated id column", () => {
    expectTypeOf<TodoCreate>().toEqualTypeOf<{
      title: string;
      completed: boolean;
    }>();
  });
});

describe("valid usage compiles", () => {
  it("accepts a well-formed create payload", () => {
    const valid: TodoCreate = {
      title: "Test",
      completed: false,
    };
    expectTypeOf(valid).toMatchTypeOf<TodoCreate>();
  });
});

describe("invalid usage must fail to compile", () => {
  it("rejects a boolean field assigned a string", () => {
    const payload: TodoCreate = {
      title: "Test",
      // @ts-expect-error -- `completed` must be boolean, not the string "false"
      completed: "false",
    };
    void payload;
  });

  it("rejects an unknown field not declared on the model", () => {
    const payload: TodoCreate = {
      title: "Test",
      completed: false,
      // @ts-expect-error -- `unknownField` was never declared with defineModel
      unknownField: true,
    };
    void payload;
  });

  it("rejects a string field assigned a number", () => {
    const payload: TodoCreate = {
      // @ts-expect-error -- `title` must be string, not number
      title: 123,
      completed: false,
    };
    void payload;
  });

  it("rejects passing `id` on create — the database assigns it", () => {
    const payload: TodoCreate = {
      title: "Test",
      completed: false,
      // @ts-expect-error -- `id` is not part of CreateInput
      id: 1,
    };
    void payload;
  });
});
