import { readFile } from "node:fs/promises";
import { pool } from "./db.js";

export async function runMigrations() {
  if (process.env.RUN_MIGRATIONS !== "true") {
    return;
  }

  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(schema);
  console.log("Schema PostgreSQL applique.");
}