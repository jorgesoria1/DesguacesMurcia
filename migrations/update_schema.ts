import { db } from "../server/db";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool } from "@neondatabase/serverless";

const main = async () => {
  console.log("Iniciando migración del esquema...");
  
  try {
    // Usamos migrate de Drizzle para actualizar automáticamente el esquema
    console.log("Empujando cambios al esquema...");
    await db.execute(/* sql */ `
      -- Crear tabla de sesiones si no existe
      CREATE TABLE IF NOT EXISTS sessions (
        sid varchar PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
      
      -- Asegurar que la tabla carts tenga la columna session_id
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'carts' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE carts ADD COLUMN session_id text;
        END IF;
      END$$;

      -- Asegurar que la tabla orders tenga la columna session_id
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE orders ADD COLUMN session_id text;
        END IF;
      END$$;
    `);

    console.log("Esquema actualizado correctamente.");
  } catch (error) {
    console.error("Error actualizando el esquema:", error);
    process.exit(1);
  }
};

main();