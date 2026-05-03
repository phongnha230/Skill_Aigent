import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // --- LLM ---
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is missing"),
  OPENAI_MODEL: z.string().optional(),

  // --- MCP: PostgreSQL ---
  POSTGRES_CONNECTION_STRING: z.string().optional(),

  // --- MCP: MySQL ---
  MYSQL_HOST: z.string().optional(),
  MYSQL_PORT: z.string().optional(),
  MYSQL_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_DATABASE: z.string().optional(),

  // --- MCP: MongoDB Atlas ---
  MONGODB_URI: z.string().optional(),

  // --- MCP: GitHub ---
  GITHUB_PERSONAL_ACCESS_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
