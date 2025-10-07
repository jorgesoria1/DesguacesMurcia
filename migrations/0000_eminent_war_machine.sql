CREATE TABLE "api_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key" text NOT NULL,
	"company_id" integer NOT NULL,
	"channel" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"cart_id" integer NOT NULL,
	"part_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"checked_out" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"processing_item" text DEFAULT '' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"new_items" integer DEFAULT 0 NOT NULL,
	"updated_items" integer DEFAULT 0 NOT NULL,
	"items_deactivated" integer DEFAULT 0 NOT NULL,
	"errors" text DEFAULT '' NOT NULL,
	"details" json DEFAULT '{}'::json NOT NULL,
	"options" json DEFAULT '{}'::json NOT NULL,
	"is_full_import" boolean DEFAULT false NOT NULL,
	"can_resume" boolean DEFAULT true NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"frequency" text NOT NULL,
	"last_run" timestamp,
	"next_run" timestamp,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"cart_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"total" real NOT NULL,
	"payment_intent_id" text,
	"shipping_address" text NOT NULL,
	"shipping_city" text NOT NULL,
	"shipping_postal_code" text NOT NULL,
	"shipping_country" text DEFAULT 'España' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref_local" integer NOT NULL,
	"id_empresa" integer NOT NULL,
	"id_vehiculo" integer NOT NULL,
	"cod_familia" text DEFAULT '' NOT NULL,
	"descripcion_familia" text DEFAULT '' NOT NULL,
	"cod_articulo" text DEFAULT '' NOT NULL,
	"descripcion_articulo" text DEFAULT '' NOT NULL,
	"cod_version" text DEFAULT '' NOT NULL,
	"ref_principal" text DEFAULT '' NOT NULL,
	"precio" text DEFAULT '0' NOT NULL,
	"anyo_stock" integer DEFAULT 0 NOT NULL,
	"peso" text DEFAULT '0' NOT NULL,
	"ubicacion" integer DEFAULT 0 NOT NULL,
	"observaciones" text DEFAULT '' NOT NULL,
	"reserva" integer DEFAULT 0 NOT NULL,
	"tipo_material" integer DEFAULT 0 NOT NULL,
	"imagenes" text[] NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"sincronizado" boolean DEFAULT true NOT NULL,
	"ultima_sincronizacion" timestamp DEFAULT now() NOT NULL,
	"fecha_creacion" timestamp DEFAULT now() NOT NULL,
	"fecha_actualizacion" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"postal_code" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_local" integer NOT NULL,
	"id_empresa" integer NOT NULL,
	"descripcion" text NOT NULL,
	"marca" text NOT NULL,
	"modelo" text NOT NULL,
	"version" text DEFAULT '' NOT NULL,
	"anyo" integer NOT NULL,
	"combustible" text DEFAULT '' NOT NULL,
	"bastidor" text DEFAULT '' NOT NULL,
	"matricula" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"kilometraje" integer DEFAULT 0 NOT NULL,
	"potencia" integer DEFAULT 0 NOT NULL,
	"imagenes" text[] NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"sincronizado" boolean DEFAULT true NOT NULL,
	"ultima_sincronizacion" timestamp DEFAULT now() NOT NULL,
	"fecha_creacion" timestamp DEFAULT now() NOT NULL,
	"fecha_actualizacion" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE no action ON UPDATE no action;