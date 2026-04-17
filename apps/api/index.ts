import { Elysia } from "elysia";
import { db, users } from "@packages/db";
import type { ApiMessage } from "@packages/types";

const app = new Elysia()
  .get("/", () => {
    const response: ApiMessage = { message: "¡Hola desde Elysia!" };
    return response;
  })
  .get("/usuarios", async () => {
    return await db.select().from(users);
  })
  .listen(3000);

console.log(
  `🦊 Elysia se está ejecutando en ${app.server?.hostname}:${app.server?.port}`
);
