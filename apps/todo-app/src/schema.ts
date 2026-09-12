import { boolean, defineModel, number, string } from "@YOUR_USERNAME/light-orm";

export const Todo = defineModel("todo", {
  id: number(),
  title: string(),
  completed: boolean(),
});
