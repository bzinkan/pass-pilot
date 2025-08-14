import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { ENV } from "./env";

neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: ENV.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
