
-- Crear tabla de configuración de envíos
CREATE TABLE IF NOT EXISTS "shipping_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"base_price" numeric(10,2) DEFAULT '0' NOT NULL,
	"free_shipping_threshold" numeric(10,2),
	"weight_based_pricing" boolean DEFAULT false,
	"price_per_kg" numeric(10,2) DEFAULT '0',
	"max_weight" numeric(10,2),
	"estimated_days" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Crear tabla de configuración de pagos
CREATE TABLE IF NOT EXISTS "payment_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"config" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Crear tabla de pagos de pedidos
CREATE TABLE IF NOT EXISTS "order_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"payment_method" varchar(100) NOT NULL,
	"payment_provider" varchar(100) NOT NULL,
	"transaction_id" varchar(255),
	"amount" numeric(10,2) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"gateway_response" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Actualizar tabla de pedidos
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotal" numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_cost" numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_method_id" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" varchar(100);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" varchar(50) DEFAULT 'pending';

-- Añadir foreign keys
DO $$ BEGIN
 ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_method_id_shipping_config_id_fk" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_config"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Insertar método de envío por defecto
INSERT INTO "shipping_config" ("name", "description", "base_price", "free_shipping_threshold", "estimated_days")
VALUES ('Envío estándar', 'Envío en 24-48 horas laborables', 5.95, 50.00, 2)
ON CONFLICT DO NOTHING;
