import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/route_mapper";
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

console.log("Ejecutando migraciones...");

await migrate(db, { migrationsFolder: "drizzle" });

console.log("¡Migraciones completadas!");
process.exit(0);
