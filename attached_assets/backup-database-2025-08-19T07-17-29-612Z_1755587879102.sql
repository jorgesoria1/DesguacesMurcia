-- Database backup created at 2025-08-19T07:17:29.782Z
-- Backup method: Neon database export (36 tables)
-- For complete data backup, use external tools like pg_dump with full database access

-- Table: api_config (3 records)
DROP TABLE IF EXISTS "api_config" CASCADE;
CREATE TABLE "api_config" (
  "id" integer NOT NULL DEFAULT nextval('api_config_id_seq'::regclass),
  "api_key" text NOT NULL,
  "company_id" integer NOT NULL,
  "channel" text NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sample data for table: api_config
INSERT INTO "api_config" ("id", "api_key", "company_id", "channel", "active", "created_at", "updated_at") VALUES (2, 'MS-uif4cewpdUUo7JAJWhVy07GUSUSVwJnaZ', 1236, 'webcliente MRC', true, '2025-06-06T14:20:20.667Z', '2025-07-11T18:06:07.510Z');
INSERT INTO "api_config" ("id", "api_key", "company_id", "channel", "active", "created_at", "updated_at") VALUES (3, 'b9b8e2c3-6f2e-4d9a-8c7b-1a2b3c4d5e6f', 1236, 'canal_principal', false, '2025-07-17T08:56:46.284Z', '2025-07-17T08:56:46.284Z');
INSERT INTO "api_config" ("id", "api_key", "company_id", "channel", "active", "created_at", "updated_at") VALUES (4, 'MS-uif4cewpdUUo7JAJWhVy07GUSUSVwJnaZ', 1236, 'webcliente MRC', false, '2025-07-29T19:44:27.101Z', '2025-07-29T19:47:01.639Z');

-- Table: api_stats_cache (13 records)
DROP TABLE IF EXISTS "api_stats_cache" CASCADE;
CREATE TABLE "api_stats_cache" (
  "id" integer NOT NULL DEFAULT nextval('api_stats_cache_id_seq'::regclass),
  "vehicles_count" integer NOT NULL DEFAULT 0,
  "parts_count" integer NOT NULL DEFAULT 0,
  "timestamp" timestamp without time zone NOT NULL DEFAULT now(),
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: api_stats_cache
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (50, 4324, 152394, '2025-08-08T06:30:11.428Z', '2025-08-08T06:30:11.460Z', '2025-08-08T06:30:11.460Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (51, 4324, 152441, '2025-08-08T08:29:36.524Z', '2025-08-08T08:29:36.558Z', '2025-08-08T08:29:36.558Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (52, 4367, 152941, '2025-08-18T08:40:38.446Z', '2025-08-18T08:40:38.465Z', '2025-08-18T08:40:38.465Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (53, 4367, 152941, '2025-08-18T09:08:05.948Z', '2025-08-18T09:08:05.968Z', '2025-08-18T09:08:05.968Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (54, 4367, 152941, '2025-08-18T10:15:07.198Z', '2025-08-18T10:15:07.217Z', '2025-08-18T10:15:07.217Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (55, 4367, 152941, '2025-08-18T10:19:20.848Z', '2025-08-18T10:19:20.866Z', '2025-08-18T10:19:20.866Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (56, 4369, 153131, '2025-08-18T21:31:55.512Z', '2025-08-18T21:31:55.725Z', '2025-08-18T21:31:55.725Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (57, 4369, 153131, '2025-08-18T22:05:03.804Z', '2025-08-18T22:05:03.822Z', '2025-08-18T22:05:03.822Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (58, 4369, 153131, '2025-08-18T22:06:43.584Z', '2025-08-18T22:06:43.602Z', '2025-08-18T22:06:43.602Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (59, 4369, 153131, '2025-08-18T22:11:55.934Z', '2025-08-18T22:11:55.952Z', '2025-08-18T22:11:55.952Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (60, 4369, 153131, '2025-08-18T22:26:16.654Z', '2025-08-18T22:26:16.672Z', '2025-08-18T22:26:16.672Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (61, 4369, 153131, '2025-08-18T22:29:00.584Z', '2025-08-18T22:29:00.603Z', '2025-08-18T22:29:00.603Z');
INSERT INTO "api_stats_cache" ("id", "vehicles_count", "parts_count", "timestamp", "created_at", "updated_at") VALUES (49, 4324, 152331, '2025-08-02T09:19:47.934Z', '2025-08-02T09:19:47.968Z', '2025-08-02T09:19:47.968Z');

-- Table: banners (0 records)
DROP TABLE IF EXISTS "banners" CASCADE;
CREATE TABLE "banners" (
  "id" integer NOT NULL DEFAULT nextval('banners_id_seq'::regclass),
  "title" character varying(255) NOT NULL,
  "subtitle" text,
  "description" text,
  "image_url" text,
  "link_url" text,
  "link_text" character varying(100),
  "position" character varying(50) NOT NULL DEFAULT 'hero'::character varying,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "start_date" timestamp without time zone,
  "end_date" timestamp without time zone,
  "background_color" character varying(7) DEFAULT '#ffffff'::character varying,
  "text_color" character varying(7) DEFAULT '#000000'::character varying,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: cart_items (0 records)
DROP TABLE IF EXISTS "cart_items" CASCADE;
CREATE TABLE "cart_items" (
  "id" integer NOT NULL DEFAULT nextval('cart_items_id_seq'::regclass),
  "cart_id" integer NOT NULL,
  "part_id" integer,
  "quantity" integer NOT NULL DEFAULT 1,
  "price" real NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: carts (3 records)
DROP TABLE IF EXISTS "carts" CASCADE;
CREATE TABLE "carts" (
  "id" integer NOT NULL DEFAULT nextval('carts_id_seq'::regclass),
  "user_id" integer,
  "session_id" text,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  "checked_out" boolean NOT NULL DEFAULT false
);

-- Sample data for table: carts
INSERT INTO "carts" ("id", "user_id", "session_id", "created_at", "updated_at", "checked_out") VALUES (1, NULL, 'test_payment_session_123', '2025-08-04T07:34:20.524Z', '2025-08-04T07:34:20.524Z', false);
INSERT INTO "carts" ("id", "user_id", "session_id", "created_at", "updated_at", "checked_out") VALUES (2, NULL, 'test_cart_session_123', '2025-08-05T10:13:58.108Z', '2025-08-05T10:17:08.547Z', true);
INSERT INTO "carts" ("id", "user_id", "session_id", "created_at", "updated_at", "checked_out") VALUES (3, NULL, 'test_final_session', '2025-08-05T10:17:51.398Z', '2025-08-05T10:18:01.475Z', true);

-- Table: chatbot_config (1 records)
DROP TABLE IF EXISTS "chatbot_config" CASCADE;
CREATE TABLE "chatbot_config" (
  "id" integer NOT NULL DEFAULT nextval('chatbot_config_id_seq'::regclass),
  "code" text NOT NULL DEFAULT ''::text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

-- Sample data for table: chatbot_config
INSERT INTO "chatbot_config" ("id", "code", "created_at", "updated_at") VALUES (1, '', '2025-08-04T05:46:33.717Z', '2025-08-09T10:21:05.298Z');

-- Table: contact_messages (7 records)
DROP TABLE IF EXISTS "contact_messages" CASCADE;
CREATE TABLE "contact_messages" (
  "id" integer NOT NULL DEFAULT nextval('contact_messages_id_seq'::regclass),
  "name" character varying(255) NOT NULL,
  "email" character varying(255) NOT NULL,
  "phone" character varying(50),
  "subject" character varying(255),
  "message" text NOT NULL,
  "form_type" character varying(50) DEFAULT 'contact'::character varying,
  "status" character varying(20) DEFAULT 'unread'::character varying,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "images" ARRAY NOT NULL DEFAULT ARRAY[]::text[]
);

-- Sample data for table: contact_messages
INSERT INTO "contact_messages" ("id", "name", "email", "phone", "subject", "message", "form_type", "status", "created_at", "updated_at", "images") VALUES (24, 'Nombre Cliente', 'correo@cliente.com', '678763323', 'Correo pruebalo contacto', 'Aquí el mensaje de contacto', 'contact', 'unread', '2025-08-04T07:02:00.950Z', '2025-08-04T07:02:00.950Z', '[]');
INSERT INTO "contact_messages" ("id", "name", "email", "phone", "subject", "message", "form_type", "status", "created_at", "updated_at", "images") VALUES (26, 'Nombrense completo', 'correo@correo.com', '678343123', 'Tasación Nissan León 2012', 'Datos del vehículo:
Marca: Nissan, Modelo: León, Año: 2012, Kilómetros: 123432, Combustible: Diesel

Estado y observaciones:
Bueno

Información adicional: Informacion adicional

Imágenes adjuntas: 1', 'valuation', 'read', '2025-08-04T07:13:12.300Z', '2025-08-04T07:14:03.159Z', '["/uploads/vehicle-images/vehicle_1754291583834_293081171.png"]');
INSERT INTO "contact_messages" ("id", "name", "email", "phone", "subject", "message", "form_type", "status", "created_at", "updated_at", "images") VALUES (27, 'Merkeauto Etxebarri SL', 'merkeauto@gmail.com', '625308901', 'Pieza mal enviada', 'Hola buenas, el pasado 6 de agosto mediante la pagina de recambio verde compramos un depresor de freno con on la referencia 1705184, referente a un renault scenic ii con referencia de pieza 8200376925. Nos habeis mandado otra con referencia 1705194 para un skoda octavia.
Hemos recibido una pieza incorrecta Y necesitamos la pieza pedida para poder hacer la reparación con la mayor rapidez posible ya que este retraso nos supone un trastoque en el taller.
Espero vuestra respuesta, muchas gracias, un saludo.', 'contact', 'unread', '2025-08-12T09:25:31.557Z', '2025-08-12T09:25:31.557Z', '[]');
INSERT INTO "contact_messages" ("id", "name", "email", "phone", "subject", "message", "form_type", "status", "created_at", "updated_at", "images") VALUES (28, 'Rodrigo J ', 'rodrigo@dieman.net', '627442851', 'Tasación Opel Astra 2019', 'Datos del vehículo:
Marca: Opel, Modelo: Astra, Año: 2019, Kilómetros: 250000, Combustible: Diesel

Estado y observaciones:
Averiado/Siniestro

Información adicional: Bien conservado interior y exterior  ,avería en motor

Imágenes adjuntas: 6', 'valuation', 'unread', '2025-08-13T09:31:03.053Z', '2025-08-13T09:31:03.053Z', '["/uploads/vehicle-images/vehicle_1755077407261_349996807.jpeg","/uploads/vehicle-images/vehicle_1755077410059_872944993.jpeg","/uploads/vehicle-images/vehicle_1755077412884_831649580.jpeg","/uploads/vehicle-images/vehicle_1755077416530_989297743.jpeg","/uploads/vehicle-images/vehicle_1755077420081_71051625.jpeg","/uploads/vehicle-images/vehicle_1755077423264_981215367.jpeg"]');
INSERT INTO "contact_messages" ("id", "name", "email", "phone", "subject", "message", "form_type", "status", "created_at", "updated_at", "images") VALUES (29, 'Maarten Gabriëls', 'maarten.gabriels@dravima.com', '0031464570514', 'Question', 'Dear,

Is this part still available:

https://ecooparts.com/en/used-auto-part/bmw/serie-3-berlina-e46/53107259_-0986444004-bmw-serie-3-berlina-e46.html

Best regards,

Maarten Gabriëls', 'contact', 'unread', '2025-08-15T11:00:54.990Z', '2025-08-15T11:00:54.990Z', '[]');
INSERT INTO "contact_messages" ("id", "name", "email", "phone", "subject", "message", "form_type", "status", "created_at", "updated_at", "images") VALUES (30, 'Alejandro arellano', 'alex22bunay@gmail.com', '666241225', 'Nissan almera tino v10', 'Buenas , queria saber si tenian el cuadro de instrumentos para un Nissan almera tino del 2004 diesel, su referencia e BU714.
Gracias', 'contact', 'unread', '2025-08-18T05:58:13.674Z', '2025-08-18T05:58:13.674Z', '[]');
INSERT INTO "contact_messages" ("id", "name", "email", "phone", "subject", "message", "form_type", "status", "created_at", "updated_at", "images") VALUES (31, 'AUTORECAMBIOS BASTIDA', 'ventas@autorecambiosbastida.com', '647914533', 'Código: 0110032', 'necesito asiente completo  conductor fiat tipo 2017', 'contact', 'unread', '2025-08-18T09:44:14.725Z', '2025-08-18T09:44:14.725Z', '[]');

-- Table: email_config (13 records)
DROP TABLE IF EXISTS "email_config" CASCADE;
CREATE TABLE "email_config" (
  "id" integer NOT NULL DEFAULT nextval('email_config_id_seq'::regclass),
  "key" character varying(255) NOT NULL,
  "value" text NOT NULL DEFAULT ''::text,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: email_config
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (4, 'orders_notifications_enabled', 'true', 'Activar notificaciones de pedidos', true, '2025-07-11T15:50:30.432Z', '2025-07-11T15:50:30.432Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (8, 'contact_notifications_enabled', 'true', 'Activar notificaciones de formularios de contacto', true, '2025-07-11T15:50:30.618Z', '2025-07-11T15:50:30.618Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (3, 'orders_subject', 'Nuevo pedido #{orderNumber}', NULL, true, '2025-07-11T15:50:30.386Z', '2025-08-04T07:55:17.000Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (13, 'smtp_enabled', 'true', NULL, true, '2025-07-11T15:50:30.848Z', '2025-08-08T15:20:19.232Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (1, 'orders_admin_email', 'pedidos@desguacemurcia.com', NULL, true, '2025-07-11T15:50:30.287Z', '2025-08-18T08:52:34.573Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (5, 'contact_admin_email', 'pedidos@desguacemurcia.com', NULL, true, '2025-07-11T15:50:30.478Z', '2025-08-18T08:52:39.336Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (2, 'orders_copy_email', 'jorge@hispanaweb.com', NULL, true, '2025-07-11T15:50:30.340Z', '2025-08-18T08:52:57.798Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (7, 'contact_subject', 'Nuevo mensaje de contacto', NULL, true, '2025-07-11T15:50:30.572Z', '2025-07-16T12:46:03.843Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (9, 'smtp_host', 'vps.hispanaweb.com', 'Servidor SMTP', true, '2025-07-11T15:50:30.664Z', '2025-07-11T16:28:50.683Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (10, 'smtp_port', '587', 'Puerto SMTP', true, '2025-07-11T15:50:30.710Z', '2025-07-11T16:21:22.089Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (11, 'smtp_user', 'info@jorgesoria.es', 'Usuario SMTP', true, '2025-07-11T15:50:30.756Z', '2025-07-11T16:28:52.885Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (12, 'smtp_pass', 'jsn7953dzp', 'Contraseña SMTP', true, '2025-07-11T15:50:30.801Z', '2025-07-11T16:21:29.402Z');
INSERT INTO "email_config" ("id", "key", "value", "description", "is_active", "created_at", "updated_at") VALUES (6, 'contact_copy_email', 'info@hispanaweb.com', NULL, true, '2025-07-11T15:50:30.525Z', '2025-07-31T11:29:11.492Z');

-- Table: email_logs (111 records)
DROP TABLE IF EXISTS "email_logs" CASCADE;
CREATE TABLE "email_logs" (
  "id" integer NOT NULL DEFAULT nextval('email_logs_id_seq'::regclass),
  "recipient_email" character varying(255) NOT NULL,
  "subject" character varying(500) NOT NULL,
  "email_type" character varying(50) NOT NULL,
  "transport_method" character varying(50) NOT NULL,
  "status" character varying(20) NOT NULL DEFAULT 'pending'::character varying,
  "error_message" text,
  "email_content" text,
  "text_content" text,
  "metadata" text,
  "sent_at" timestamp without time zone,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Note: Table email_logs has 111 records - schema only (too large for full backup)

-- Table: footer_blocks (4 records)
DROP TABLE IF EXISTS "footer_blocks" CASCADE;
CREATE TABLE "footer_blocks" (
  "id" integer NOT NULL DEFAULT nextval('footer_blocks_id_seq'::regclass),
  "title" character varying(255) NOT NULL,
  "content" text NOT NULL,
  "block_type" character varying(50) NOT NULL DEFAULT 'text'::character varying,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: footer_blocks
INSERT INTO "footer_blocks" ("id", "title", "content", "block_type", "sort_order", "is_active", "created_at", "updated_at") VALUES (13, 'Información de Contacto', '<div class="space-y-2">
<p><strong>Desguaces Murcia</strong></p>
<p>Carretera Almuñecar, Km 1.5<br>18640, Granada</p>
<p><strong>Teléfono:</strong> 958 790 858</p>
<p><strong>Email:</strong> info@desguacemurcia.com</p>
</div>', 'contact', 1, true, '2025-07-10T10:43:36.836Z', '2025-07-10T10:43:36.836Z');
INSERT INTO "footer_blocks" ("id", "title", "content", "block_type", "sort_order", "is_active", "created_at", "updated_at") VALUES (16, 'Servicios', '{"links": [
  {"text": "Nosotros", "url": "/nosotros"},
  {"text": "Contacto", "url": "/contacto"},
  {"text": "Tasamos tu Vehículo", "url": "/tasamos-tu-vehiculo"},
  {"text": "Vehículos", "url": "/vehiculos"}
]}', 'links', 4, true, '2025-07-10T10:43:36.836Z', '2025-07-10T10:43:36.836Z');
INSERT INTO "footer_blocks" ("id", "title", "content", "block_type", "sort_order", "is_active", "created_at", "updated_at") VALUES (14, 'Horario de Verano', 'De lunes a viernes de 7:00 a 14:30', 'hours', 2, true, '2025-07-10T10:43:36.836Z', '2025-07-21T11:27:09.326Z');
INSERT INTO "footer_blocks" ("id", "title", "content", "block_type", "sort_order", "is_active", "created_at", "updated_at") VALUES (15, 'Comprar Online', '{"links": [
  {"text": "Catálogo de Piezas", "url": "/piezas"},
  {"text": "Formas de Pago", "url": "/formas-pago"},
  {"text": "Política de Envíos", "url": "/politica-envios"},
  {"text": "Condiciones de Compra", "url": "/condiciones-compra"}
]}', 'links', 3, true, '2025-07-10T10:43:36.836Z', '2025-07-10T10:43:36.836Z');

-- Table: google_reviews (0 records)
DROP TABLE IF EXISTS "google_reviews" CASCADE;
CREATE TABLE "google_reviews" (
  "id" integer NOT NULL DEFAULT nextval('google_reviews_id_seq'::regclass),
  "google_id" character varying(255),
  "business_name" character varying(255) NOT NULL,
  "author" character varying(255) NOT NULL,
  "rating" integer NOT NULL,
  "text" text NOT NULL,
  "date" character varying(50) NOT NULL,
  "avatar" character varying(10) NOT NULL,
  "source" character varying(50) NOT NULL DEFAULT 'google'::character varying,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Table: google_reviews_config (1 records)
DROP TABLE IF EXISTS "google_reviews_config" CASCADE;
CREATE TABLE "google_reviews_config" (
  "id" integer NOT NULL DEFAULT nextval('google_reviews_config_id_seq'::regclass),
  "business_name" character varying(255) NOT NULL DEFAULT 'Desguace Murcia'::character varying,
  "location" character varying(255) NOT NULL DEFAULT 'Murcia, España'::character varying,
  "api_provider" character varying(50) NOT NULL DEFAULT 'serpapi'::character varying,
  "api_key" character varying(500),
  "enabled" boolean NOT NULL DEFAULT false,
  "min_rating" integer NOT NULL DEFAULT 4,
  "max_reviews" integer NOT NULL DEFAULT 6,
  "cache_hours" integer NOT NULL DEFAULT 24,
  "last_update" timestamp without time zone,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  "place_id" character varying(255)
);

-- Sample data for table: google_reviews_config
INSERT INTO "google_reviews_config" ("id", "business_name", "location", "api_provider", "api_key", "enabled", "min_rating", "max_reviews", "cache_hours", "last_update", "created_at", "updated_at", "place_id") VALUES (1, 'Desguace Murcia S.L.', 'Murcia, España', 'google_places', 'AIzaSyDt9EWGrcgDeQs4NGVQ6yaDmC8J9-zuiuA', true, 2, 10, 24, '2025-08-03T21:04:42.442Z', '2025-08-01T18:28:42.189Z', '2025-08-01T18:28:42.189Z', 'ChIJ5fde6ODtcQ0Rq7JrtQ-mLQU');

-- Table: homepage_blocks (10 records)
DROP TABLE IF EXISTS "homepage_blocks" CASCADE;
CREATE TABLE "homepage_blocks" (
  "id" integer NOT NULL DEFAULT nextval('homepage_blocks_id_seq'::regclass),
  "block_type" character varying(50) NOT NULL,
  "title" character varying(255) NOT NULL,
  "subtitle" text,
  "description" text,
  "icon" character varying(100),
  "image" character varying(500),
  "button_text" character varying(100),
  "button_url" character varying(500),
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: homepage_blocks
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (1, 'feature', 'Mejores precios', NULL, 'Mantenemos el precio más bajo los 365 días', 'tag', NULL, NULL, NULL, 1, true, '2025-06-08T07:59:56.184Z', '2025-06-08T07:59:56.184Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (2, 'feature', 'Servicio Express', NULL, 'Nuestro servicio de envío express te lo pone fácil y rápido', 'truck', NULL, NULL, NULL, 2, true, '2025-06-08T07:59:56.184Z', '2025-06-08T07:59:56.184Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (3, 'feature', 'Garantía', NULL, 'Todos nuestros productos están 100% garantizados', 'shield', NULL, NULL, NULL, 3, true, '2025-06-08T07:59:56.184Z', '2025-06-08T07:59:56.184Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (4, 'feature', 'Catálogo', NULL, 'Amplio catálogo de recambios y accesorios para tu coche', 'book', NULL, NULL, NULL, 4, true, '2025-06-08T07:59:56.184Z', '2025-06-08T07:59:56.184Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (31, 'why_choose_us_title', '¿Por qué elegirnos?', NULL, NULL, NULL, NULL, NULL, NULL, 100, true, '2025-06-08T08:54:58.092Z', '2025-06-08T08:54:58.092Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (32, 'why_choose_us', 'Experiencia y calidad', NULL, 'Más de 20 años en el sector del desguace nos avalan como empresa líder en recambios de segunda mano.', 'CheckCircle', NULL, NULL, NULL, 101, true, '2025-06-08T08:54:58.092Z', '2025-06-08T08:54:58.092Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (33, 'why_choose_us', 'Precios competitivos', NULL, 'Ofrecemos los mejores precios del mercado en piezas originales de segunda mano.', 'EuroIcon', NULL, NULL, NULL, 102, true, '2025-06-08T08:54:58.092Z', '2025-06-08T08:54:58.092Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (34, 'why_choose_us', 'Atención personalizada', NULL, 'Nuestro equipo está a su disposición para asesorarle en la elección de las piezas que necesita.', 'Headphones', NULL, NULL, NULL, 103, true, '2025-06-08T08:54:58.092Z', '2025-06-08T08:54:58.092Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (35, 'why_choose_us_image', 'Imagen del desguace', NULL, NULL, NULL, '/api/placeholder/600/400', NULL, NULL, 104, true, '2025-06-08T08:54:58.092Z', '2025-06-08T08:54:58.092Z');
INSERT INTO "homepage_blocks" ("id", "block_type", "title", "subtitle", "description", "icon", "image", "button_text", "button_url", "sort_order", "is_active", "created_at", "updated_at") VALUES (36, 'hero', 'Desguace Murcia', 'Piezas y Vehículos de Desguace', 'Encuentra las mejores piezas de segunda mano con garantía y al mejor precio', NULL, '/src/assets/desguace-hero.png', NULL, NULL, 0, true, '2025-07-10T15:49:11.681Z', '2025-07-10T15:49:11.681Z');

-- Table: import_history (3 records)
DROP TABLE IF EXISTS "import_history" CASCADE;
CREATE TABLE "import_history" (
  "id" integer NOT NULL DEFAULT nextval('import_history_id_seq'::regclass),
  "type" text NOT NULL,
  "status" text NOT NULL,
  "progress" integer NOT NULL DEFAULT 0,
  "processing_item" text NOT NULL DEFAULT ''::text,
  "total_items" integer NOT NULL DEFAULT 0,
  "processed_items" integer NOT NULL DEFAULT 0,
  "new_items" integer NOT NULL DEFAULT 0,
  "updated_items" integer NOT NULL DEFAULT 0,
  "items_deactivated" integer NOT NULL DEFAULT 0,
  "errors" ARRAY NOT NULL DEFAULT '{}'::text[],
  "error_count" integer NOT NULL DEFAULT 0,
  "details" json NOT NULL DEFAULT '{}'::json,
  "options" json NOT NULL DEFAULT '{}'::json,
  "is_full_import" boolean NOT NULL DEFAULT false,
  "can_resume" boolean NOT NULL DEFAULT true,
  "start_time" timestamp without time zone NOT NULL DEFAULT now(),
  "end_time" timestamp without time zone,
  "last_updated" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: import_history
INSERT INTO "import_history" ("id", "type", "status", "progress", "processing_item", "total_items", "processed_items", "new_items", "updated_items", "items_deactivated", "errors", "error_count", "details", "options", "is_full_import", "can_resume", "start_time", "end_time", "last_updated") VALUES (1928, 'all', 'completed', 100, '', 0, 0, 0, 0, 0, '[]', 0, '{"phase":"completed","sequential":true}', '{}', false, true, '2025-08-18T22:18:21.294Z', NULL, '2025-08-18T22:18:21.294Z');
INSERT INTO "import_history" ("id", "type", "status", "progress", "processing_item", "total_items", "processed_items", "new_items", "updated_items", "items_deactivated", "errors", "error_count", "details", "options", "is_full_import", "can_resume", "start_time", "end_time", "last_updated") VALUES (1930, 'parts', 'completed', 100, 'Importación completada', 0, 153131, 0, 0, 0, '[]', 0, '{"syncControlId":12,"lastSyncDate":"1900-01-01T00:00:00.000Z","lastId":0}', '{"fullImport":false}', false, true, '2025-08-18T22:18:42.838Z', NULL, '2025-08-18T22:24:08.282Z');
INSERT INTO "import_history" ("id", "type", "status", "progress", "processing_item", "total_items", "processed_items", "new_items", "updated_items", "items_deactivated", "errors", "error_count", "details", "options", "is_full_import", "can_resume", "start_time", "end_time", "last_updated") VALUES (1929, 'vehicles', 'completed', 100, 'Importación completada', 0, 4369, 0, 4369, 0, '[]', 0, '{"syncControlId":11,"lastSyncDate":"1900-01-01T00:00:00.000Z","lastId":0}', '{"fullImport":false}', false, true, '2025-08-18T22:18:22.467Z', '2025-08-18T22:18:39.782Z', '2025-08-18T22:18:39.122Z');

-- Table: import_schedule (1 records)
DROP TABLE IF EXISTS "import_schedule" CASCADE;
CREATE TABLE "import_schedule" (
  "id" integer NOT NULL DEFAULT nextval('import_schedule_id_seq'::regclass),
  "type" text NOT NULL,
  "frequency" text NOT NULL,
  "last_run" timestamp without time zone,
  "next_run" timestamp without time zone,
  "active" boolean NOT NULL DEFAULT true,
  "is_full_import" boolean NOT NULL DEFAULT false,
  "days" ARRAY,
  "options" jsonb DEFAULT '{}'::jsonb,
  "start_time" text NOT NULL DEFAULT '02:00'::text
);

-- Sample data for table: import_schedule
INSERT INTO "import_schedule" ("id", "type", "frequency", "last_run", "next_run", "active", "is_full_import", "days", "options", "start_time") VALUES (63, 'all', 'daily', NULL, '2025-08-19T03:00:00.000Z', true, false, NULL, '{"skipExisting":true}', '03:00');

-- Table: order_items (32 records)
DROP TABLE IF EXISTS "order_items" CASCADE;
CREATE TABLE "order_items" (
  "id" integer NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
  "order_id" integer NOT NULL,
  "part_id" integer,
  "quantity" integer NOT NULL DEFAULT 1,
  "price" numeric NOT NULL,
  "part_name" character varying(500) NOT NULL,
  "part_family" character varying(200),
  "created_at" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "part_reference" character varying(255),
  "vehicle_brand" character varying(100),
  "vehicle_model" character varying(100),
  "vehicle_year" integer,
  "vehicle_version" character varying(200)
);

-- Sample data for table: order_items
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (35, 99, 2156291, 1, '48.40', 'ALETA DELANTERA DERECHA', 'CARROCERÍA FRONTAL', '2025-08-08T10:51:16.551Z', '2025-08-08T10:51:16.551Z', '0040002', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (36, 100, 2156807, 1, '48.40', 'PILOTO TRASERO IZQUIERDO', 'ALUMBRADO', '2025-08-11T10:38:10.348Z', '2025-08-11T10:38:10.348Z', '0020021', 'VOLKSWAGEN', 'GOLF VII VARIANT (BA5)', 2008, 'BlueMotion');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (37, 101, 2173206, 1, '50.82', 'MOTOR ARRANQUE', 'ELECTRICIDAD', '2025-08-11T10:46:23.427Z', '2025-08-11T10:46:23.427Z', '0090113', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (38, 102, 2124294, 1, '30.25', 'MANDO CLIMATIZADOR', 'CLIMATIZACIÓN', '2025-08-12T14:04:19.239Z', '2025-08-12T14:04:19.239Z', '0070010', 'FORD', 'MONDEO BERLINA (CA2)', 2009, 'Ghia');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (39, 103, 2164139, 1, '39.93', 'INTERCOOLER', 'MOTOR / ADMISIÓN / ESCAPE', '2025-08-14T10:44:13.730Z', '2025-08-14T10:44:13.730Z', '0120045', 'VOLKSWAGEN', 'SCIROCCO (138)', 2014, 'R-Line BMT');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (40, 104, 2171911, 1, '72.60', 'MANDO MULTIFUNCION', 'ELECTRICIDAD', '2025-08-15T17:05:20.016Z', '2025-08-15T17:05:20.016Z', '0090088', 'PEUGEOT', '508 SW', 2019, 'RXH');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (41, 105, 2164396, 1, '60.50', 'PARAGOLPES DELANTERO', 'CARROCERÍA FRONTAL', '2025-08-16T07:40:15.455Z', '2025-08-16T07:40:15.455Z', '0040042', 'RENAULT', 'SCENIC II (JM)', 2003, 'Authentique');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (42, 106, 2114504, 1, '84.70', 'EJE DELANTERO / CUNA MOTOR', 'MOTOR / ADMISIÓN / ESCAPE', '2025-08-17T17:19:00.284Z', '2025-08-17T17:19:00.284Z', '0120034', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (43, 107, 2114504, 1, '84.70', 'EJE DELANTERO / CUNA MOTOR', 'MOTOR / ADMISIÓN / ESCAPE', '2025-08-17T17:22:00.360Z', '2025-08-17T17:22:00.360Z', '0120034', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (44, 108, 2114504, 1, '84.70', 'EJE DELANTERO / CUNA MOTOR', 'MOTOR / ADMISIÓN / ESCAPE', '2025-08-18T08:59:59.848Z', '2025-08-18T08:59:59.848Z', '0120034', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (45, 109, 2114504, 1, '84.70', 'EJE DELANTERO / CUNA MOTOR', 'MOTOR / ADMISIÓN / ESCAPE', '2025-08-18T09:12:57.769Z', '2025-08-18T09:12:57.769Z', '0120034', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (46, 110, 2118137, 1, '30.25', 'FARO DERECHO', 'ALUMBRADO', '2025-08-18T09:44:03.602Z', '2025-08-18T09:44:03.602Z', '0020005', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (47, 110, 2034935, 1, '24.20', 'FARO IZQUIERDO', 'ALUMBRADO', '2025-08-18T09:44:03.738Z', '2025-08-18T09:44:03.738Z', '0020006', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (48, 110, 2031294, 1, '20.57', 'FARO DERECHO', 'ALUMBRADO', '2025-08-18T09:44:03.874Z', '2025-08-18T09:44:03.874Z', '0020005', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (49, 110, 2031295, 1, '20.57', 'FARO IZQUIERDO', 'ALUMBRADO', '2025-08-18T09:44:04.008Z', '2025-08-18T09:44:04.008Z', '0020006', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (50, 110, 2031349, 1, '20.57', 'FARO IZQUIERDO', 'ALUMBRADO', '2025-08-18T09:44:04.143Z', '2025-08-18T09:44:04.143Z', '0020006', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (51, 110, 2022289, 1, '10.89', 'PILOTO DELANTERO DERECHO', 'ALUMBRADO', '2025-08-18T09:44:04.277Z', '2025-08-18T09:44:04.277Z', '0020009', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (52, 110, 2118134, 1, '24.20', 'PILOTO TRASERO DERECHO', 'ALUMBRADO', '2025-08-18T09:44:04.411Z', '2025-08-18T09:44:04.411Z', '0020018', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (53, 110, 2117725, 1, '20.57', 'PILOTO TRASERO DERECHO', 'ALUMBRADO', '2025-08-18T09:44:04.547Z', '2025-08-18T09:44:04.547Z', '0020018', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (54, 110, 2043583, 1, '30.25', 'FARO DERECHO', 'ALUMBRADO', '2025-08-18T09:44:04.681Z', '2025-08-18T09:44:04.681Z', '0020005', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (55, 111, 2114504, 1, '84.70', 'EJE DELANTERO / CUNA MOTOR', 'MOTOR / ADMISIÓN / ESCAPE', '2025-08-18T11:05:34.319Z', '2025-08-18T11:05:34.319Z', '0120034', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (56, 112, 2139177, 1, '84.70', 'BOMBA DIRECCION', 'DIRECCIÓN / TRANSMISIÓN', '2025-08-18T15:20:29.353Z', '2025-08-18T15:20:29.353Z', '0080003', 'PEUGEOT', '5008', 2011, 'Access');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (57, 113, 2118137, 1, '30.25', 'FARO DERECHO', 'ALUMBRADO', '2025-08-18T17:35:09.169Z', '2025-08-18T17:35:09.169Z', '0020005', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (58, 113, 2034935, 1, '24.20', 'FARO IZQUIERDO', 'ALUMBRADO', '2025-08-18T17:35:09.307Z', '2025-08-18T17:35:09.307Z', '0020006', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (59, 113, 2031295, 1, '20.57', 'FARO IZQUIERDO', 'ALUMBRADO', '2025-08-18T17:35:09.441Z', '2025-08-18T17:35:09.441Z', '0020006', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (60, 113, 2031349, 1, '20.57', 'FARO IZQUIERDO', 'ALUMBRADO', '2025-08-18T17:35:09.575Z', '2025-08-18T17:35:09.575Z', '0020006', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (61, 113, 2022289, 1, '10.89', 'PILOTO DELANTERO DERECHO', 'ALUMBRADO', '2025-08-18T17:35:09.710Z', '2025-08-18T17:35:09.710Z', '0020009', NULL, NULL, NULL, NULL);
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (62, 114, 2092422, 1, '84.70', 'RETROVISOR DERECHO', 'CARROCERÍA LATERALES', '2025-08-18T20:54:21.957Z', '2025-08-18T20:54:21.957Z', '0050057', 'OPEL', 'ASTRA K SPORTS TOURER', 2015, 'Edition Start/Stop');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (63, 115, 2092422, 1, '84.70', 'RETROVISOR DERECHO', 'CARROCERÍA LATERALES', '2025-08-18T20:57:46.466Z', '2025-08-18T20:57:46.466Z', '0050057', 'OPEL', 'ASTRA K SPORTS TOURER', 2015, 'Edition Start/Stop');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (64, 116, 2173721, 1, '121.00', 'PARAGOLPES DELANTERO', 'CARROCERÍA FRONTAL', '2025-08-18T22:21:25.814Z', '2025-08-18T22:21:25.814Z', '0040042', 'FORD', 'FOCUS BERLINA (CAP)', 2004, 'S');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (65, 116, 2173730, 1, '39.93', 'ALETA DELANTERA DERECHA', 'CARROCERÍA FRONTAL', '2025-08-18T22:21:25.945Z', '2025-08-18T22:21:25.945Z', '0040002', 'FORD', 'FOCUS BERLINA (CAP)', 2004, 'S');
INSERT INTO "order_items" ("id", "order_id", "part_id", "quantity", "price", "part_name", "part_family", "created_at", "updated_at", "part_reference", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_version") VALUES (66, 117, 2173976, 1, '84.70', 'PORTON TRASERO', 'CARROCERÍA TRASERA', '2025-08-19T05:21:20.143Z', '2025-08-19T05:21:20.143Z', '0060024', 'NISSAN', 'QASHQAI (J10)', 2007, 'Acenta');

-- Table: order_payments (7 records)
DROP TABLE IF EXISTS "order_payments" CASCADE;
CREATE TABLE "order_payments" (
  "id" integer NOT NULL DEFAULT nextval('order_payments_id_seq'::regclass),
  "order_id" integer NOT NULL,
  "payment_method" character varying(100) NOT NULL,
  "payment_provider" character varying(100) NOT NULL,
  "transaction_id" character varying(255),
  "amount" numeric NOT NULL,
  "status" character varying(50) NOT NULL DEFAULT 'pending'::character varying,
  "gateway_response" json,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: order_payments
INSERT INTO "order_payments" ("id", "order_id", "payment_method", "payment_provider", "transaction_id", "amount", "status", "gateway_response", "created_at", "updated_at") VALUES (1, 89, 'card', 'redsys', '158136', '4250.00', 'pagado', '{"Ds_Date":"04%2F08%2F2025","Ds_Hour":"09%3A43","Ds_SecurePayment":"1","Ds_Card_Country":"724","Ds_Amount":"425000","Ds_Currency":"978","Ds_Order":"202508041054","Ds_MerchantCode":"141249086","Ds_Terminal":"100","Ds_Response":"0000","Ds_MerchantData":"","Ds_TransactionType":"0","Ds_ConsumerLanguage":"1","Ds_AuthorisationCode":"158136","Ds_Card_Brand":"1","Ds_Card_Typology":"CONSUMO","Ds_ProcessedPayMethod":"78","Ds_Control_1754293416038":"1754293416038"}', '2025-08-04T07:49:52.915Z', '2025-08-04T07:49:52.915Z');
INSERT INTO "order_payments" ("id", "order_id", "payment_method", "payment_provider", "transaction_id", "amount", "status", "gateway_response", "created_at", "updated_at") VALUES (2, 90, 'card', 'redsys', '567590', '4250.00', 'pagado', '{"Ds_Date":"04%2F08%2F2025","Ds_Hour":"09%3A52","Ds_SecurePayment":"1","Ds_Card_Country":"724","Ds_Amount":"425000","Ds_Currency":"978","Ds_Order":"202508045829","Ds_MerchantCode":"141249086","Ds_Terminal":"100","Ds_Response":"0000","Ds_MerchantData":"","Ds_TransactionType":"0","Ds_ConsumerLanguage":"1","Ds_AuthorisationCode":"567590","Ds_Card_Brand":"1","Ds_Card_Typology":"CONSUMO","Ds_ProcessedPayMethod":"78","Ds_Control_1754293972596":"1754293972596"}', '2025-08-04T07:52:53.253Z', '2025-08-04T07:52:53.253Z');
INSERT INTO "order_payments" ("id", "order_id", "payment_method", "payment_provider", "transaction_id", "amount", "status", "gateway_response", "created_at", "updated_at") VALUES (3, 102, 'card', 'redsys', '868820', '34.35', 'pagado', '{"Ds_Date":"12%2F08%2F2025","Ds_Hour":"16%3A05","Ds_SecurePayment":"1","Ds_Card_Type":"D","Ds_Card_Country":"724","Ds_Amount":"3435","Ds_Currency":"978","Ds_Order":"202508129264","Ds_MerchantCode":"141249086","Ds_Terminal":"100","Ds_Response":"0000","Ds_MerchantData":"","Ds_TransactionType":"0","Ds_ConsumerLanguage":"1","Ds_AuthorisationCode":"868820","Ds_Card_Brand":"2","Ds_Card_Typology":"CONSUMO","Ds_ProcessedPayMethod":"79"}', '2025-08-12T14:05:36.957Z', '2025-08-12T14:05:36.957Z');
INSERT INTO "order_payments" ("id", "order_id", "payment_method", "payment_provider", "transaction_id", "amount", "status", "gateway_response", "created_at", "updated_at") VALUES (4, 104, 'card', 'redsys', '583278', '77.40', 'pagado', '{"Ds_Date":"15%2F08%2F2025","Ds_Hour":"19%3A06","Ds_SecurePayment":"1","Ds_Card_Type":"D","Ds_Card_Country":"724","Ds_Amount":"7740","Ds_Currency":"978","Ds_Order":"202508157917","Ds_MerchantCode":"141249086","Ds_Terminal":"100","Ds_Response":"0000","Ds_MerchantData":"","Ds_TransactionType":"0","Ds_ConsumerLanguage":"1","Ds_AuthorisationCode":"583278","Ds_Card_Brand":"2","Ds_Card_Typology":"CONSUMO","Ds_ProcessedPayMethod":"79"}', '2025-08-15T17:06:24.047Z', '2025-08-15T17:06:24.047Z');
INSERT INTO "order_payments" ("id", "order_id", "payment_method", "payment_provider", "transaction_id", "amount", "status", "gateway_response", "created_at", "updated_at") VALUES (5, 114, 'card', 'redsys', '273449', '88.90', 'pagado', '{"Ds_Date":"18%2F08%2F2025","Ds_Hour":"22%3A56","Ds_SecurePayment":"1","Ds_Card_Type":"C","Ds_Card_Country":"724","Ds_Amount":"8890","Ds_Currency":"978","Ds_Order":"202508184232","Ds_MerchantCode":"141249086","Ds_Terminal":"100","Ds_Response":"0000","Ds_MerchantData":"","Ds_TransactionType":"0","Ds_ConsumerLanguage":"1","Ds_AuthorisationCode":"273449","Ds_Card_Brand":"1","Ds_Card_Typology":"CONSUMO","Ds_ProcessedPayMethod":"78"}', '2025-08-18T20:56:33.569Z', '2025-08-18T20:56:33.569Z');
INSERT INTO "order_payments" ("id", "order_id", "payment_method", "payment_provider", "transaction_id", "amount", "status", "gateway_response", "created_at", "updated_at") VALUES (6, 116, 'card', 'redsys', '847593', '177.13', 'pagado', '{"Ds_Date":"19%2F08%2F2025","Ds_Hour":"00%3A23","Ds_SecurePayment":"1","Ds_Card_Type":"D","Ds_Card_Country":"724","Ds_Amount":"17713","Ds_Currency":"978","Ds_Order":"202508183923","Ds_MerchantCode":"141249086","Ds_Terminal":"100","Ds_Response":"0000","Ds_MerchantData":"","Ds_TransactionType":"0","Ds_ConsumerLanguage":"1","Ds_AuthorisationCode":"847593","Ds_Card_Brand":"2","Ds_Card_Typology":"CONSUMO","Ds_ProcessedPayMethod":"79"}', '2025-08-18T22:23:04.098Z', '2025-08-18T22:23:04.098Z');
INSERT INTO "order_payments" ("id", "order_id", "payment_method", "payment_provider", "transaction_id", "amount", "status", "gateway_response", "created_at", "updated_at") VALUES (7, 117, 'card', 'redsys', '295136', '99.20', 'pagado', '{"Ds_Date":"19%2F08%2F2025","Ds_Hour":"07%3A22","Ds_SecurePayment":"1","Ds_Card_Type":"D","Ds_Card_Country":"724","Ds_Amount":"9920","Ds_Currency":"978","Ds_Order":"202508190591","Ds_MerchantCode":"141249086","Ds_Terminal":"100","Ds_Response":"0000","Ds_MerchantData":"","Ds_TransactionType":"0","Ds_ConsumerLanguage":"1","Ds_AuthorisationCode":"295136","Ds_Card_Brand":"2","Ds_Card_Typology":"EMPRESA","Ds_ProcessedPayMethod":"79"}', '2025-08-19T05:22:37.880Z', '2025-08-19T05:22:37.880Z');

-- Table: orders (92 records)
DROP TABLE IF EXISTS "orders" CASCADE;
CREATE TABLE "orders" (
  "id" integer NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
  "user_id" integer,
  "session_id" character varying(255),
  "cart_id" integer,
  "status" character varying(50) NOT NULL DEFAULT 'pending'::character varying,
  "subtotal" numeric NOT NULL,
  "shipping_cost" numeric NOT NULL DEFAULT '0'::numeric,
  "total" numeric NOT NULL,
  "shipping_method_id" integer,
  "shipping_address" text NOT NULL,
  "shipping_city" character varying(100) NOT NULL,
  "shipping_postal_code" character varying(20) NOT NULL,
  "shipping_country" character varying(100) NOT NULL DEFAULT 'España'::character varying,
  "customer_name" character varying(255) NOT NULL,
  "customer_email" character varying(255) NOT NULL,
  "customer_phone" character varying(50) NOT NULL,
  "payment_method" character varying(100),
  "payment_status" character varying(50) DEFAULT 'pending'::character varying,
  "notes" text,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  "order_number" character varying(20),
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamp without time zone,
  "deleted_by" integer,
  "order_status" character varying(50) NOT NULL DEFAULT 'pendiente_verificar'::character varying,
  "transport_agency" text DEFAULT ''::text,
  "expedition_number" text DEFAULT ''::text,
  "admin_observations" text DEFAULT ''::text,
  "documents" ARRAY DEFAULT ARRAY[]::text[],
  "invoice_pdf" text DEFAULT ''::text,
  "billing_address" text,
  "billing_city" character varying(255),
  "billing_postal_code" character varying(20),
  "billing_country" character varying(100) DEFAULT 'España'::character varying,
  "shipping_province" character varying(100) NOT NULL DEFAULT ''::character varying,
  "billing_province" character varying(100)
);

-- Sample data for table: orders
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (116, NULL, 'guest_mehoj02p_p1annp1f1fe', NULL, 'pending', '160.93', '16.20', '177.13', 1, 'Plaza de las Infantas, 4', 'Albolote', '18220', 'España', 'José David Gutiérrez Sánchez', 'davidsanchez3103@gmail.com', '671298795', 'redsys', 'pagado', '', '2025-08-18T22:21:25.650Z', '2025-08-18T22:43:56.253Z', 'RNM55556855863923', false, NULL, NULL, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'Granada', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (117, NULL, 'guest_mei3j001_yof1q9b2nia', NULL, 'pending', '84.70', '14.50', '99.20', 1, 'PTDA CAP blanc 77', 'Altea', '03590', 'España', 'Joviauto.jose vte  Ivars lopez', 'joviautoaltea@hotmail.com', '636128688', 'redsys', 'pagado', '', '2025-08-19T05:21:19.983Z', '2025-08-19T06:33:57.248Z', 'RNM55808799030591', false, NULL, NULL, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'Alicante', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (115, NULL, 'guest_mehfc3i8_c2vkfhd52tg', NULL, 'pending', '84.70', '4.20', '88.90', 1, 'c/ virgen del milagro n.33', 'Rafelbunyol', '46138', 'España', 'Juan antonio Bellver morte', 'juanantoniobellvermorte@gmail.com', '674695343', 'redsys', 'pendiente', '', '2025-08-18T20:57:46.327Z', '2025-08-19T07:08:35.341Z', 'RNM55506662658500', false, NULL, NULL, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'Valencia', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (114, NULL, 'guest_mehfc3i8_c2vkfhd52tg', NULL, 'pending', '84.70', '4.20', '88.90', 1, 'c/ virgen del milagro n.33', 'Rafelbunyol', '46138', 'España', 'Juan antonio Bellver morte', 'juanantoniobellvermorte@gmail.com', '674695343', 'redsys', 'pagado', '', '2025-08-18T20:54:21.821Z', '2025-08-19T07:08:55.399Z', 'RNM55504617524232', false, NULL, NULL, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'Valencia', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (113, NULL, 'guest_mehc8lrj_86qsaqv1j7g', NULL, 'pending', '106.48', '65.00', '171.48', 1, 'C/ la mulata 1', 'La victoria ', '38380', 'España', 'José María  Luis Devora', 'vlmotorsport4@gmail.com', '645904510', 'bank_transfer', 'pendiente', '', '2025-08-18T17:35:09.030Z', '2025-08-19T07:09:13.903Z', 'RNM55385089647889', false, NULL, NULL, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'Santa Cruz de Tenerife', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (112, NULL, 'guest_meh9ho4v_22kshf73ssy', NULL, 'pending', '84.70', '3.50', '88.20', 1, 'CTRA. N-IV, KM 54', 'ONTIGOLA', '45340', 'España', 'desguaces Ferri', 'desguacesferri@desguacesferri.com', '925127012', 'bank_transfer', 'pendiente', '', '2025-08-18T15:20:29.212Z', '2025-08-19T07:09:46.734Z', 'RNM55304291419679', false, NULL, NULL, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'Toledo', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (102, NULL, 'guest_me8m49j7_4j4b76jrfo', NULL, 'pending', '30.25', '4.10', '34.35', 1, 'CAMINO DEL CEMENTERIO 10', 'VALLADOLID', '47011', 'España', 'AUTOMOVILES GABILONDO SL', 'admin@automovilesgabilondo.com', '983257833', 'redsys', 'pagado', '', '2025-08-12T14:04:19.078Z', '2025-08-19T07:12:11.798Z', 'RNM50074589879264', false, NULL, NULL, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'VALLADOLID', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (49, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T16:45:14.622Z', '2025-07-31T16:57:13.750Z', 'RNM39803145136175', true, '2025-07-31T16:57:13.750Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (86, 1, NULL, NULL, 'pending', '39.93', '4.20', '44.13', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pagado', '', '2025-08-04T07:14:33.574Z', '2025-08-04T07:24:57.368Z', 'RNM42916734654281', true, '2025-08-04T07:24:57.368Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (28, 14, NULL, NULL, 'pending', '605.00', '15.00', '620.00', 1, 'MOREDAS 50', 'OVIEDO', '33001', 'España', 'Antonio Tapia', 'a.tapia@desguacemurcia.com', '675900025', 'bank_transfer', 'pendiente', '', '2025-07-23T08:54:59.157Z', '2025-07-30T18:07:50.868Z', 'RNM32608990833011', true, '2025-07-30T18:07:50.868Z', 1, 'pendiente_verificar', 'SEUR', 'SEU123456789433', 'Entrega en horario de mañana', '[]', '', 'MOREDAS 50', 'OVIEDO', '33001', 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (25, NULL, 'guest_mcw5s0eu_f5a213nloze', NULL, 'pending', '30.25', '15.80', '46.05', 1, 'asdfasdf', 'asdfdsaf', '32423', 'España', 'asdfasdf asdfasdf', 'asdfadsf@e.es', '23423423', 'stripe', 'pendiente', '', '2025-07-09T17:26:46.761Z', '2025-07-11T10:06:48.183Z', 'RNM20820066998283', true, '2025-07-11T10:06:48.183Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (24, NULL, 'guest_mcw5s0eu_f5a213nloze', NULL, 'pending', '30.25', '3.50', '33.75', 1, 'asdfasdf', 'asdfasdf', '2312312', 'España', 'asdfasd asdfasdf', 'asdfasdf@e.es', '23424234', 'paypal', 'pendiente', '', '2025-07-09T17:26:04.510Z', '2025-07-11T10:06:51.258Z', 'RNM20819644495829', true, '2025-07-11T10:06:51.258Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (35, 1, NULL, NULL, 'pending', '30.25', '7.50', '37.75', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T14:00:41.015Z', '2025-07-31T14:08:48.183Z', 'RNM39704409067941', true, '2025-07-31T14:08:48.183Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (34, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'bank_transfer', 'pendiente', '', '2025-07-31T14:00:16.687Z', '2025-07-31T14:08:53.118Z', 'RNM39704165779319', true, '2025-07-31T14:08:53.118Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (29, 1, NULL, NULL, 'embalado', '121.00', '12.50', '133.50', 1, 'Mi direcciondireccion', 'localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', 'notas', '2025-07-31T12:31:19.630Z', '2025-07-31T14:08:56.547Z', 'RNM39650794525534', true, '2025-07-31T14:08:56.547Z', 1, 'incidencia', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (30, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pagado', '', '2025-07-31T13:49:05.940Z', '2025-07-31T14:08:59.080Z', 'RNM39697458350848', true, '2025-07-31T14:08:59.080Z', 1, 'enviado', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (31, NULL, 'KN6dw0drhz6AH6AtHM6fb05VUiVKeS-6', NULL, 'pending', '121.00', '4.20', '125.20', 1, 'Calle Test 123', 'Granada', '18001', 'España', 'Usuario Prueba', 'test@example.com', '123456789', 'bank_transfer', 'pendiente', 'Pedido de prueba para verificar el sistema', '2025-07-31T13:53:17.123Z', '2025-07-31T14:09:01.436Z', 'RNM39699970163623', true, '2025-07-31T14:09:01.436Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (32, NULL, 'ro0SZEqC56ZnGQ9larn2WLRyZ0PZjsym', NULL, 'pending', '121.00', '4.20', '125.20', 1, 'Calle Prueba Final 456', 'Granada', '18001', 'España', 'Test Final', 'testfinal@example.com', '987654321', 'bank_transfer', 'pendiente', 'Prueba final del sistema reparado', '2025-07-31T13:55:16.541Z', '2025-07-31T14:09:03.918Z', 'RNM39701163817624', true, '2025-07-31T14:09:03.918Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (33, 1, NULL, NULL, 'pending', '30.25', '7.50', '37.75', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-31T13:59:26.010Z', '2025-07-31T14:09:06.833Z', 'RNM39703659013500', true, '2025-07-31T14:09:06.833Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (26, 1, NULL, NULL, 'shipped', '121.00', '4.10', '0.00', 1, 'sdfasfd', 'asdfsdaf', '12341234', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '12342134', 'cash', 'paid', '', '2025-07-10T17:53:29.830Z', '2025-07-17T16:18:52.305Z', 'RNM21700097599902', true, '2025-07-17T16:18:52.305Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (27, 1, NULL, NULL, 'pending', '30.25', '4.80', '0.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-11T16:56:10.819Z', '2025-07-17T16:18:49.355Z', 'RNM22529707560658', true, '2025-07-17T16:18:49.355Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (36, 1, NULL, NULL, 'pending', '121.00', '15.00', '136.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T14:08:06.069Z', '2025-07-31T14:09:09.274Z', 'RNM39708859540315', true, '2025-07-31T14:09:09.274Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (51, 1, NULL, NULL, 'pending', '121.00', '15.00', '136.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T16:55:43.157Z', '2025-07-31T16:57:05.027Z', 'RNM39809430483881', true, '2025-07-31T16:57:05.027Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (50, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T16:48:54.369Z', '2025-07-31T16:57:10.464Z', 'RNM39805342593847', true, '2025-07-31T16:57:10.464Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (48, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T16:43:36.824Z', '2025-07-31T16:57:17.707Z', 'RNM39802167157702', true, '2025-07-31T16:57:17.707Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (47, 1, NULL, NULL, 'pending', '30.25', '7.50', '37.75', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-31T16:43:07.703Z', '2025-07-31T16:57:20.275Z', 'RNM39801875881915', true, '2025-07-31T16:57:20.275Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (46, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T16:23:01.321Z', '2025-07-31T16:57:22.830Z', 'RNM39789812139068', true, '2025-07-31T16:57:22.830Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (45, NULL, 'tl75v587YcIyCUkBLsFzoc9-RcpLPBvc', NULL, 'pending', '100.00', '10.00', '110.00', 1, 'Calle Test 123', 'Madrid', '28001', 'España', 'Test Usuario', 'test@test.com', '666777888', 'redsys', 'pendiente', '', '2025-07-31T16:20:13.631Z', '2025-07-31T16:57:27.265Z', 'RNM39788134977230', true, '2025-07-31T16:57:27.265Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (37, 1, NULL, NULL, 'pending', '151.25', '15.00', '166.25', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T14:15:23.842Z', '2025-07-31T16:58:32.990Z', 'RNM39713237329128', true, '2025-07-31T16:58:32.990Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (38, 1, NULL, NULL, 'pending', '30.25', '7.50', '37.75', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T14:19:39.388Z', '2025-07-31T16:58:36.060Z', 'RNM39715792807269', true, '2025-07-31T16:58:36.060Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (39, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T14:29:44.353Z', '2025-07-31T16:58:39.520Z', 'RNM39721842368048', true, '2025-07-31T16:58:39.520Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (40, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-31T14:30:15.045Z', '2025-07-31T16:58:42.290Z', 'RNM39722149357436', true, '2025-07-31T16:58:42.290Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (44, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T16:14:54.434Z', '2025-07-31T16:59:14.688Z', 'RNM39784943181131', true, '2025-07-31T16:59:14.688Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (42, 1, NULL, NULL, 'pending', '447.70', '15.00', '462.70', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T14:31:22.772Z', '2025-07-31T16:59:52.905Z', 'RNM39722826649845', true, '2025-07-31T16:59:52.905Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (41, 1, NULL, NULL, 'pending', '121.00', '15.00', '136.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-31T14:30:31.798Z', '2025-07-31T16:59:56.271Z', 'RNM39722316873997', true, '2025-07-31T16:59:56.271Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (43, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T15:18:13.767Z', '2025-07-31T16:59:21.058Z', 'RNM39750936501757', true, '2025-07-31T16:59:21.058Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (54, NULL, 'L4cnC4k029eYl-BuV5u70iy-jKVNByTl', NULL, 'pending', '121.00', '6.00', '127.00', 1, 'Calle Final 123', 'Murcia', '30001', 'España', 'Test Final Verificación', 'test-final@example.com', '123456789', 'unknown', 'pendiente', '', '2025-07-31T17:16:31.270Z', '2025-07-31T17:19:25.370Z', 'RNM39821911096901', true, '2025-07-31T17:19:25.370Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (53, 1, NULL, NULL, 'pending', '272.25', '15.00', '287.25', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T17:14:39.424Z', '2025-07-31T17:19:35.194Z', 'RNM39820792999332', true, '2025-07-31T17:19:35.194Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (52, NULL, 'XYVa80s2sFlfFhQsm5726DBkj6BE8iLC', NULL, 'pending', '125.00', '4.20', '129.20', 1, 'Calle Test 123', 'Murcia', '30001', 'España', 'Prueba Test', 'test@example.com', '123456789', 'unknown', 'pendiente', '', '2025-07-31T17:01:37.347Z', '2025-07-31T17:19:41.754Z', 'RNM39812972391670', true, '2025-07-31T17:19:41.754Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (55, 1, NULL, NULL, 'pending', '121.00', '15.00', '136.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T17:20:10.688Z', '2025-07-31T22:34:24.358Z', 'RNM39824105784059', true, '2025-07-31T22:34:24.358Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (56, NULL, 'nc_D1-AL-R-gY9umxg0e9myGdD_MDi7Q', NULL, 'pending', '136.00', '6.00', '142.00', 1, 'Calle Test 123', 'Murcia', '30001', 'España', 'Test Redsys Corregido', 'test-redsys@example.com', '123456789', 'unknown', 'pendiente', '', '2025-07-31T17:23:43.169Z', '2025-07-31T22:34:26.960Z', 'RNM39826230299254', true, '2025-07-31T22:34:26.960Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (57, 1, NULL, NULL, 'pending', '121.00', '15.00', '136.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T18:26:35.622Z', '2025-07-31T22:34:29.902Z', 'RNM39863954997078', true, '2025-07-31T22:34:29.902Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (58, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pendiente', '', '2025-07-31T22:01:25.413Z', '2025-07-31T22:34:32.791Z', 'RNM39992852939426', true, '2025-07-31T22:34:32.791Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (59, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'redsys', 'pagado', '', '2025-07-31T22:09:56.882Z', '2025-07-31T23:06:04.962Z', 'RNM39997967652788', true, '2025-07-31T23:06:04.962Z', 1, 'embalado', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (60, 1, NULL, NULL, 'pending', '121.00', '15.00', '136.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'bank_transfer', 'pendiente', '', '2025-07-31T22:36:21.892Z', '2025-07-31T23:06:08.738Z', 'RNM40013817837252', true, '2025-07-31T23:06:08.738Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (61, 1, NULL, NULL, 'pending', '121.00', '15.00', '136.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-31T22:38:00.859Z', '2025-07-31T23:06:11.806Z', 'RNM40014807429372', true, '2025-07-31T23:06:11.806Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (62, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-31T22:41:55.331Z', '2025-07-31T23:06:16.631Z', 'RNM40017152215496', true, '2025-07-31T23:06:16.631Z', 1, 'verificado', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (63, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pagado', '', '2025-07-31T22:52:30.805Z', '2025-07-31T23:06:19.182Z', 'RNM40023506973899', true, '2025-07-31T23:06:19.182Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (64, 1, NULL, NULL, 'pending', '121.00', '15.00', '136.00', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-31T22:59:28.739Z', '2025-07-31T23:06:23.604Z', 'RNM40027686225914', true, '2025-07-31T23:06:23.604Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);
INSERT INTO "orders" ("id", "user_id", "session_id", "cart_id", "status", "subtotal", "shipping_cost", "total", "shipping_method_id", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_country", "customer_name", "customer_email", "customer_phone", "payment_method", "payment_status", "notes", "created_at", "updated_at", "order_number", "is_deleted", "deleted_at", "deleted_by", "order_status", "transport_agency", "expedition_number", "admin_observations", "documents", "invoice_pdf", "billing_address", "billing_city", "billing_postal_code", "billing_country", "shipping_province", "billing_province") VALUES (65, 1, NULL, NULL, 'pending', '121.00', '12.50', '133.50', 1, 'Mi direccion', 'Localidad', '18200', 'España', 'Jorge Soria', 'jorge@hispanaweb.com', '432343234', 'cash', 'pendiente', '', '2025-07-31T23:02:09.796Z', '2025-07-31T23:06:26.561Z', 'RNM40029296841430', true, '2025-07-31T23:06:26.561Z', 1, 'pendiente_verificar', '', '', '', '[]', '', NULL, NULL, NULL, 'España', 'N/A', NULL);

-- Table: pages (9 records)
DROP TABLE IF EXISTS "pages" CASCADE;
CREATE TABLE "pages" (
  "id" integer NOT NULL DEFAULT nextval('pages_id_seq'::regclass),
  "slug" character varying(255) NOT NULL,
  "title" character varying(255) NOT NULL,
  "meta_description" text,
  "content" text NOT NULL,
  "is_published" boolean NOT NULL DEFAULT true,
  "is_editable" boolean NOT NULL DEFAULT true,
  "page_type" character varying(50) NOT NULL DEFAULT 'static'::character varying,
  "form_config" json,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: pages
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (3, 'nosotros', 'Nosotros', 'Conoce más sobre Desguaces Murcia, especialistas en repuestos de automóvil', '<div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6">Nosotros</h1>
        <div class="prose prose-lg max-w-none">
          <p class="text-xl text-gray-600 mb-8">Somos especialistas en repuestos de automóvil con más de 20 años de experiencia en el sector.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 class="text-2xl font-semibold mb-4">Nuestra Historia</h2>
              <p>En Desguaces Murcia llevamos más de dos décadas dedicándonos al sector del automóvil, especializándonos en la venta de repuestos y piezas de segunda mano de alta calidad.</p>
              <p>Comenzamos como un pequeño negocio familiar y hemos crecido hasta convertirnos en una referencia en la región de Murcia.</p>
            </div>
            <div>
              <h2 class="text-2xl font-semibold mb-4">Nuestro Compromiso</h2>
              <p>Nos comprometemos a ofrecer piezas de automóvil de la más alta calidad al mejor precio del mercado, con garantía y un servicio personalizado.</p>
              <p>Cada pieza es cuidadosamente seleccionada y verificada por nuestro equipo de expertos.</p>
            </div>
          </div>
          
          <div class="bg-blue-50 p-6 rounded-lg mb-8">
            <h2 class="text-2xl font-semibold mb-4">¿Por qué elegirnos?</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul class="space-y-2">
                <li>✅ Más de 20 años de experiencia</li>
                <li>✅ Catálogo con miles de piezas</li>
                <li>✅ Garantía en todos nuestros productos</li>
                <li>✅ Precios competitivos</li>
              </ul>
              <ul class="space-y-2">
                <li>✅ Atención personalizada</li>
                <li>✅ Envíos a toda España</li>
                <li>✅ Sistema de búsqueda avanzado</li>
                <li>✅ Tasación gratuita de vehículos</li>
              </ul>
            </div>
          </div>
          
          <h2 class="text-2xl font-semibold mb-4">Nuestros Servicios</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 border rounded-lg">
              <h3 class="font-semibold mb-2">Venta de Repuestos</h3>
              <p class="text-sm text-gray-600">Amplio catálogo de piezas para todas las marcas</p>
            </div>
            <div class="text-center p-4 border rounded-lg">
              <h3 class="font-semibold mb-2">Tasación de Vehículos</h3>
              <p class="text-sm text-gray-600">Valuación gratuita y profesional</p>
            </div>
            <div class="text-center p-4 border rounded-lg">
              <h3 class="font-semibold mb-2">Envíos</h3>
              <p class="text-sm text-gray-600">Entrega rápida y segura</p>
            </div>
          </div>
        </div>
      </div>', true, true, 'static', NULL, '2025-06-07T19:21:27.376Z', '2025-06-08T08:05:12.300Z');
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (5, 'politica-privacidad', 'Política de Privacidad', 'Política de privacidad de Desguaces Murcia. Información sobre el tratamiento de datos personales y derechos del usuario.', '<div class="max-w-4xl mx-auto p-6 space-y-8">
<h1 class="text-3xl font-bold text-center mb-8">Política de Privacidad</h1>

<div class="space-y-6">
<section>
<h2 class="text-2xl font-semibold mb-4">1. Responsable del Tratamiento</h2>
<p>Los datos personales recogidos a través de este sitio web serán tratados por:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Denominación:</strong> Desguaces Murcia</li>
<li><strong>Domicilio:</strong> Carretera Almuñecar, Km 1.5, 18640, Granada</li>
<li><strong>Teléfono:</strong> 958 790 858</li>
<li><strong>Email:</strong> info@desguacemurcia.com</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">2. Finalidades del Tratamiento</h2>
<p>Sus datos personales serán tratados para las siguientes finalidades:</p>
<ul class="list-disc pl-6 space-y-2">
<li>Gestionar su registro como usuario del sitio web</li>
<li>Procesar y gestionar sus pedidos</li>
<li>Responder a sus consultas y solicitudes</li>
<li>Enviar comunicaciones comerciales (con su consentimiento)</li>
<li>Cumplir con las obligaciones legales</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">3. Legitimación</h2>
<p>El tratamiento de sus datos se basa en:</p>
<ul class="list-disc pl-6 space-y-2">
<li>Su consentimiento para el registro y comunicaciones comerciales</li>
<li>La ejecución del contrato de compraventa</li>
<li>El cumplimiento de obligaciones legales</li>
<li>El interés legítimo para la gestión de consultas</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">4. Conservación de Datos</h2>
<p>Sus datos personales se conservarán durante el tiempo necesario para cumplir con las finalidades para las que fueron recogidos y durante los plazos legalmente establecidos.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">5. Destinatarios</h2>
<p>Sus datos podrán ser comunicados a:</p>
<ul class="list-disc pl-6 space-y-2">
<li>Proveedores de servicios de pago</li>
<li>Empresas de transporte para el envío de pedidos</li>
<li>Administraciones públicas cuando sea legalmente exigible</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">6. Derechos del Interesado</h2>
<p>Tiene derecho a:</p>
<ul class="list-disc pl-6 space-y-2">
<li>Acceder a sus datos personales</li>
<li>Rectificar datos inexactos</li>
<li>Suprimir sus datos</li>
<li>Limitar el tratamiento</li>
<li>Oponerse al tratamiento</li>
<li>Portabilidad de datos</li>
<li>Presentar una reclamación ante la Agencia Española de Protección de Datos</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">7. Cookies</h2>
<p>Este sitio web utiliza cookies para mejorar la experiencia del usuario. Para más información, consulte nuestra <a href="/politica-cookies" class="text-blue-600 hover:underline">Política de Cookies</a>.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">8. Contacto</h2>
<p>Para ejercer sus derechos o realizar consultas sobre esta política de privacidad, puede contactar con nosotros:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Email:</strong> info@desguacemurcia.com</li>
<li><strong>Teléfono:</strong> 958 790 858</li>
<li><strong>Dirección:</strong> Carretera Almuñecar, Km 1.5, 18640, Granada</li>
</ul>
</section>
</div>
</div>', true, true, 'static', NULL, '2025-06-07T19:21:27.376Z', '2025-07-10T10:11:52.059Z');
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (1, 'contacto', 'Contacto', 'Contacta con nosotros para cualquier consulta sobre repuestos y vehículos', '<div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6">Contacto</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 class="text-2xl font-semibold mb-4">¿Tienes alguna pregunta?</h2>
            <p class="text-lg mb-6">Estamos aquí para ayudarte. Ponte en contacto con nosotros y te responderemos lo antes posible.</p>
            
            <div class="space-y-4">
              <div class="flex items-center">
                <span class="font-semibold mr-2">📍 Dirección:</span>
                <span>Calle Principal 123, 30001 Murcia</span>
              </div>
              <div class="flex items-center">
                <span class="font-semibold mr-2">📞 Teléfono:</span>
                <span>+34 968 123 456</span>
              </div>
              <div class="flex items-center">
                <span class="font-semibold mr-2">✉️ Email:</span>
                <span>info@desguacesmurcia.com</span>
              </div>
              <div class="flex items-center">
                <span class="font-semibold mr-2">🕒 Horario Verano:</span>
                <span>De lunes a viernes de 7:00 a 14:30</span>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 p-6 rounded-lg">
            <h3 class="text-xl font-semibold mb-4">Formulario de Contacto</h3>
            <p class="text-gray-600">Utiliza nuestro formulario de contacto para enviarnos tu consulta directamente.</p>
          </div>
        </div>
      </div>', true, true, 'contact', '{"emailTo":"info@desguacesmurcia.com","fields":[{"name":"name","label":"Nombre","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true},{"name":"phone","label":"Teléfono","type":"tel","required":false},{"name":"message","label":"Mensaje","type":"textarea","required":true}]}', '2025-06-07T19:21:27.376Z', '2025-07-21T11:44:49.317Z');
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (2, 'tasamos-tu-vehiculo', 'Tasamos tu Vehículo', 'Obtén una tasación gratuita de tu vehículo al instante', '<div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-6">Tasamos tu Vehículo</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 class="text-2xl font-semibold mb-4">Valoración Profesional Gratuita</h2>
            <p class="text-lg mb-6">Obtén una tasación profesional de tu vehículo de forma rápida y gratuita. Nuestros expertos evaluarán tu automóvil y te darán el mejor precio del mercado.</p>
            
            <div class="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 class="font-semibold mb-2">¿Por qué elegirnos?</h3>
              <ul class="space-y-1 text-sm">
                <li>✅ Tasación gratuita e inmediata</li>
                <li>✅ Más de 20 años de experiencia</li>
                <li>✅ Precios competitivos del mercado</li>
                <li>✅ Proceso transparente y confiable</li>
                <li>✅ Pago inmediato al entregar</li>
              </ul>
            </div>
          </div>
          
          <div class="bg-gray-50 p-6 rounded-lg">
            <h3 class="text-xl font-semibold mb-4">Formulario de Tasación</h3>
            <p class="text-gray-600">Completa el formulario con los datos de tu vehículo para recibir una tasación personalizada.</p>
          </div>
        </div>
      </div>', true, true, 'value-vehicle', '{"emailTo":"tasaciones@desguacesmurcia.com","fields":[{"name":"marca","label":"Marca","type":"text","required":true},{"name":"modelo","label":"Modelo","type":"text","required":true},{"name":"año","label":"Año","type":"number","required":true},{"name":"kilometros","label":"Kilómetros","type":"number","required":true},{"name":"combustible","label":"Combustible","type":"select","options":["Gasolina","Diésel","Híbrido","Eléctrico"],"required":true},{"name":"estado","label":"Estado del vehículo","type":"select","options":["Excelente","Bueno","Regular","Malo"],"required":true},{"name":"contactName","label":"Nombre","type":"text","required":true},{"name":"contactEmail","label":"Email","type":"email","required":true},{"name":"contactPhone","label":"Teléfono","type":"tel","required":true}]}', '2025-06-07T19:21:27.376Z', '2025-06-08T08:05:12.221Z');
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (4, 'aviso-legal', 'Aviso Legal', 'Aviso legal de Desguaces Murcia. Información sobre términos de uso, responsabilidades y condiciones legales.', '<div class="max-w-4xl mx-auto p-6 space-y-8">
<h1 class="text-3xl font-bold text-center mb-8">Aviso Legal</h1>

<div class="space-y-6">
<section>
<h2 class="text-2xl font-semibold mb-4">1. Identificación del Titular</h2>
<p>En cumplimiento de lo dispuesto en el artículo 10 de la Ley 34/2002, de 11 de julio, de servicios de la sociedad de la información y de comercio electrónico, se informa a los usuarios de la web que:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Denominación:</strong> Desguaces Murcia</li>
<li><strong>Domicilio:</strong> Carretera Almuñecar, Km 1.5, 18640, Granada</li>
<li><strong>Teléfono:</strong> 958 790 858</li>
<li><strong>Email:</strong> info@desguacemurcia.com</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">2. Objeto</h2>
<p>El presente aviso legal regula el uso del sitio web www.desguacesmurcia.com, del que es titular Desguaces Murcia.</p>
<p>La navegación por el sitio web de Desguaces Murcia atribuye la condición de usuario del mismo e implica la aceptación plena y sin reservas de todas y cada una de las disposiciones incluidas en este Aviso Legal.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">3. Condiciones de Uso</h2>
<p>El acceso y utilización del sitio web se rige por la legislación española vigente y se somete a los tribunales españoles.</p>
<p>El usuario se compromete a:</p>
<ul class="list-disc pl-6 space-y-2">
<li>Hacer un uso adecuado y lícito del sitio web</li>
<li>No utilizar el sitio web para fines ilícitos o prohibidos</li>
<li>No dañar, inutilizar o sobrecargar el sitio web</li>
<li>Respetar los derechos de propiedad intelectual e industrial</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">4. Propiedad Intelectual</h2>
<p>Todos los contenidos del sitio web, incluyendo a título enunciativo pero no limitativo, textos, fotografías, gráficos, imágenes, iconos, tecnología, software, así como su diseño gráfico y códigos fuente, constituyen una obra cuya propiedad pertenece a Desguaces Murcia.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">5. Limitación de Responsabilidad</h2>
<p>Desguaces Murcia no se hace responsable de los daños y perjuicios que pudieran derivarse del uso incorrecto del sitio web.</p>
<p>El acceso y uso del sitio web se realiza bajo la exclusiva responsabilidad del usuario.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">6. Modificaciones</h2>
<p>Desguaces Murcia se reserva el derecho de efectuar sin previo aviso las modificaciones que considere oportunas en su portal, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios que se presten a través de la misma como la forma en la que éstos aparezcan presentados o localizados en su portal.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">7. Contacto</h2>
<p>Para cualquier consulta relacionada con este aviso legal, puede contactar con nosotros a través de:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Email:</strong> info@desguacemurcia.com</li>
<li><strong>Teléfono:</strong> 958 790 858</li>
<li><strong>Dirección:</strong> Carretera Almuñecar, Km 1.5, 18640, Granada</li>
</ul>
</section>
</div>
</div>', true, true, 'static', NULL, '2025-06-07T19:21:27.376Z', '2025-07-10T10:11:30.670Z');
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (17, 'politica-cookies', 'Política de Cookies', 'Política de cookies de Desguaces Murcia. Información sobre el uso de cookies, tipos y gestión.', '<div class="max-w-4xl mx-auto p-6 space-y-8">
<h1 class="text-3xl font-bold text-center mb-8">Política de Cookies</h1>

<div class="space-y-6">
<section>
<h2 class="text-2xl font-semibold mb-4">1. ¿Qué son las cookies?</h2>
<p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Nos permiten reconocer su dispositivo y almacenar información sobre sus preferencias.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">2. Tipos de cookies que utilizamos</h2>

<h3 class="text-xl font-semibold mb-3">Cookies Necesarias</h3>
<p>Estas cookies son esenciales para el funcionamiento del sitio web y no pueden desactivarse:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>session:</strong> Mantiene su sesión activa</li>
<li><strong>csrf_token:</strong> Protege contra ataques CSRF</li>
<li><strong>cart_data:</strong> Guarda los productos en su carrito</li>
</ul>

<h3 class="text-xl font-semibold mb-3 mt-6">Cookies de Análisis</h3>
<p>Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>_ga, _gid, _gat:</strong> Google Analytics para estadísticas de uso</li>
</ul>

<h3 class="text-xl font-semibold mb-3 mt-6">Cookies de Marketing</h3>
<p>Se utilizan para mostrar anuncios relevantes:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>_fb:</strong> Facebook Pixel</li>
<li><strong>advertising_id:</strong> Identificación publicitaria</li>
</ul>

<h3 class="text-xl font-semibold mb-3 mt-6">Cookies de Preferencias</h3>
<p>Recuerdan sus configuraciones y preferencias:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>theme:</strong> Su tema preferido (claro/oscuro)</li>
<li><strong>language:</strong> Su idioma seleccionado</li>
<li><strong>layout_preferences:</strong> Sus preferencias de diseño</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">3. ¿Cómo gestionar las cookies?</h2>
<p>Puede gestionar sus preferencias de cookies a través de nuestro banner de cookies que aparece en su primera visita, o desde la configuración de su navegador.</p>

<h3 class="text-xl font-semibold mb-3 mt-4">Configuración por navegador:</h3>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Chrome:</strong> Configuración > Privacidad y seguridad > Cookies</li>
<li><strong>Firefox:</strong> Opciones > Privacidad y seguridad > Cookies</li>
<li><strong>Safari:</strong> Preferencias > Privacidad > Cookies</li>
<li><strong>Edge:</strong> Configuración > Privacidad > Cookies</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">4. Duración de las cookies</h2>
<p>Las cookies tienen diferentes duraciones:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Cookies de sesión:</strong> Se eliminan al cerrar el navegador</li>
<li><strong>Cookies persistentes:</strong> Permanecen hasta 365 días</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">5. Cookies de terceros</h2>
<p>Algunos servicios externos pueden instalar sus propias cookies:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Google Analytics:</strong> Para análisis de tráfico web</li>
<li><strong>Redes sociales:</strong> Para compartir contenido</li>
<li><strong>Servicios de pago:</strong> Para procesar transacciones</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">6. Actualización de esta política</h2>
<p>Esta política de cookies puede actualizarse periódicamente. La fecha de última actualización aparece al final de este documento.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">7. Contacto</h2>
<p>Para cualquier consulta sobre esta política de cookies, puede contactar con nosotros:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Email:</strong> info@desguacemurcia.com</li>
<li><strong>Teléfono:</strong> 958 790 858</li>
<li><strong>Dirección:</strong> Carretera Almuñecar, Km 1.5, 18640, Granada</li>
</ul>
</section>

<div class="mt-8 pt-4 border-t text-sm text-gray-600">
<p><strong>Última actualización:</strong> Julio 2025</p>
</div>
</div>
</div>', true, true, 'legal', NULL, '2025-07-10T10:12:23.449Z', '2025-07-10T10:12:23.449Z');
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (18, 'formas-pago', 'Formas de Pago', 'Información sobre las formas de pago disponibles en Desguaces Murcia: tarjeta, transferencia y efectivo.', '<div class="max-w-4xl mx-auto p-6 space-y-8">
<h1 class="text-3xl font-bold text-center mb-8">Formas de Pago</h1>

<div class="space-y-6">
<section>
<h2 class="text-2xl font-semibold mb-4">Métodos de Pago Disponibles</h2>
<p>En Desguaces Murcia ofrecemos múltiples formas de pago seguras y convenientes para que puedas completar tu compra de la manera que prefieras.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">💳 Tarjeta de Crédito/Débito</h2>
<ul class="list-disc pl-6 space-y-2">
<li>Visa, Mastercard, American Express</li>
<li>Pago seguro con tecnología SSL</li>
<li>Procesamiento inmediato</li>
<li>Sin comisiones adicionales</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">🏦 Transferencia Bancaria</h2>
<ul class="list-disc pl-6 space-y-2">
<li>Pago mediante transferencia a nuestra cuenta bancaria</li>
<li>Datos bancarios proporcionados al finalizar el pedido</li>
<li>Envío tras confirmación del pago</li>
<li>Incluir número de pedido como concepto</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">💰 Pago en Efectivo</h2>
<ul class="list-disc pl-6 space-y-2">
<li>Disponible para recogida en nuestras instalaciones</li>
<li>Confirmar disponibilidad antes de desplazarse</li>
<li>Horario: Lunes a Viernes 9:00-18:00</li>
<li>Dirección: Carretera Almuñecar, Km 1.5, 18640, Granada</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">🔒 Seguridad</h2>
<p>Todos nuestros métodos de pago están protegidos con:</p>
<ul class="list-disc pl-6 space-y-2">
<li>Cifrado SSL de 256 bits</li>
<li>Cumplimiento PCI DSS</li>
<li>Verificación 3D Secure</li>
<li>Protección antifraude</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">❓ Preguntas Frecuentes</h2>
<div class="space-y-4">
<div>
<h3 class="font-semibold">¿Cuándo se cobra el pedido?</h3>
<p>El cobro se realiza al confirmar el pedido, excepto en transferencias bancarias.</p>
</div>
<div>
<h3 class="font-semibold">¿Puedo cambiar la forma de pago?</h3>
<p>Contacte con nosotros antes del envío para modificar la forma de pago.</p>
</div>
<div>
<h3 class="font-semibold">¿Hay comisiones por pago?</h3>
<p>No aplicamos comisiones adicionales por ningún método de pago.</p>
</div>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">📞 Contacto</h2>
<p>Para consultas sobre pagos, contacte con nosotros:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Teléfono:</strong> 958 790 858</li>
<li><strong>Email:</strong> info@desguacemurcia.com</li>
<li><strong>Horario:</strong> Lunes a Viernes 9:00-18:00</li>
</ul>
</section>
</div>
</div>', true, true, 'info', NULL, '2025-07-10T10:13:38.421Z', '2025-07-10T10:13:38.421Z');
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (20, 'condiciones-compra', 'Condiciones de Compra', 'Condiciones de compra de Desguaces Murcia: garantías, devoluciones, envíos y términos de venta.', '<div class="max-w-4xl mx-auto p-6 space-y-8">
<h1 class="text-3xl font-bold text-center mb-8">Condiciones de Compra</h1>

<div class="space-y-6">
<section>
<h2 class="text-2xl font-semibold mb-4">1. Información General</h2>
<p>Las presentes condiciones regulan la compraventa de productos entre Desguaces Murcia y el cliente a través del sitio web www.desguacesmurcia.com.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">2. Productos y Precios</h2>
<ul class="list-disc pl-6 space-y-2">
<li>Todos los precios incluyen IVA (21%)</li>
<li>Los precios pueden variar sin previo aviso</li>
<li>Las piezas están sujetas a disponibilidad</li>
<li>Se garantiza el precio mostrado al realizar el pedido</li>
<li>Productos de segunda mano con posibles signos de uso</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">3. Proceso de Compra</h2>
<ol class="list-decimal pl-6 space-y-2">
<li>Seleccionar productos y añadir al carrito</li>
<li>Verificar datos de envío y facturación</li>
<li>Elegir método de pago</li>
<li>Confirmar pedido</li>
<li>Recibir confirmación por email</li>
</ol>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">4. Confirmación y Disponibilidad</h2>
<ul class="list-disc pl-6 space-y-2">
<li>Confirmamos disponibilidad en 24-48 horas</li>
<li>Si no hay stock, ofrecemos pieza equivalente o reembolso</li>
<li>El cliente puede cancelar si no acepta la alternativa</li>
<li>Productos únicos sujetos a venta por orden de pedido</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">5. Garantía</h2>
<div class="bg-yellow-50 p-4 rounded-lg">
<h3 class="font-semibold mb-2">🛡️ Garantía de 3 meses</h3>
<ul class="list-disc pl-6 space-y-2">
<li>Cubre defectos de fabricación</li>
<li>No cubre desgaste normal o mal uso</li>
<li>Requiere factura de compra</li>
<li>Instalación por profesional recomendada</li>
</ul>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">6. Derecho de Desistimiento</h2>
<p>Conforme a la legislación vigente, tiene derecho a desistir del contrato en un plazo de 14 días naturales desde la recepción del producto.</p>
<ul class="list-disc pl-6 space-y-2">
<li>Productos en estado original y sin usar</li>
<li>Embalaje original conservado</li>
<li>Gastos de devolución a cargo del cliente</li>
<li>Reembolso en 14 días tras recepción</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">7. Devoluciones</h2>
<p>Para procesar una devolución:</p>
<ol class="list-decimal pl-6 space-y-2">
<li>Contactar en 48 horas desde la recepción</li>
<li>Explicar motivo de la devolución</li>
<li>Recibir autorización de devolución</li>
<li>Enviar producto en embalaje original</li>
<li>Reembolso tras verificación del estado</li>
</ol>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">8. Instalación y Compatibilidad</h2>
<div class="bg-red-50 p-4 rounded-lg">
<h3 class="font-semibold mb-2">⚠️ Importante</h3>
<ul class="list-disc pl-6 space-y-2">
<li>Verificar compatibilidad antes de instalar</li>
<li>Recomendamos instalación profesional</li>
<li>No nos responsabilizamos de instalaciones incorrectas</li>
<li>Consultar con mecánico si tiene dudas</li>
</ul>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">9. Limitación de Responsabilidad</h2>
<ul class="list-disc pl-6 space-y-2">
<li>Productos vendidos en estado de segunda mano</li>
<li>Inspección recomendada antes de instalar</li>
<li>No garantizamos rendimiento específico</li>
<li>Responsabilidad limitada al valor del producto</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">10. Protección de Datos</h2>
<p>Sus datos personales serán tratados conforme a nuestra <a href="/politica-privacidad" class="text-blue-600 hover:underline">Política de Privacidad</a> y la normativa vigente de protección de datos.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">11. Resolución de Conflictos</h2>
<ul class="list-disc pl-6 space-y-2">
<li>Intentamos resolver amigablemente cualquier incidencia</li>
<li>Puede acudir a arbitraje de consumo</li>
<li>Tribunales competentes: Granada capital</li>
<li>Legislación aplicable: española</li>
</ul>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">12. Contacto</h2>
<p>Para consultas sobre estas condiciones:</p>
<ul class="list-disc pl-6 space-y-2">
<li><strong>Teléfono:</strong> 958 790 858</li>
<li><strong>Email:</strong> info@desguacemurcia.com</li>
<li><strong>Dirección:</strong> Carretera Almuñecar, Km 1.5, 18640, Granada</li>
<li><strong>Horario:</strong> Lunes a Viernes 9:00-18:00</li>
</ul>
</section>

<div class="mt-8 pt-4 border-t text-sm text-gray-600">
<p><strong>Última actualización:</strong> Julio 2025</p>
</div>
</div>
</div>', true, true, 'info', NULL, '2025-07-10T10:13:38.421Z', '2025-07-10T10:13:38.421Z');
INSERT INTO "pages" ("id", "slug", "title", "meta_description", "content", "is_published", "is_editable", "page_type", "form_config", "created_at", "updated_at") VALUES (19, 'politica-envios', 'Política de Envíos', 'Información sobre envíos de Desguaces Murcia: zonas, tarifas, plazos y condiciones de entrega.', '<div class="max-w-4xl mx-auto p-6 space-y-8">
<h1 class="text-3xl font-bold text-center mb-8">Política de Envíos</h1>

<div class="space-y-6">
<section>
<h2 class="text-2xl font-semibold mb-4">🚚 Información General</h2>
<p>Realizamos envíos a toda España peninsular e islas desde nuestras instalaciones en Granada. Los envíos se calculan según el peso del pedido aplicando las tarifas oficiales configuradas en nuestro sistema.</p>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">📍 Zonas de Envío</h2>
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-blue-600">Zona 1 - Madrid y Centro</h3>
<p class="text-sm text-gray-600">Madrid y provincias centrales con mejor conectividad</p>
</div>
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-blue-600">Zona 2 - Cataluña y Valencia</h3>
<p class="text-sm text-gray-600">Cataluña, Valencia y provincias del mediterráneo</p>
</div>
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-blue-600">Zona 3 - Andalucía</h3>
<p class="text-sm text-gray-600">Andalucía y provincias del sur</p>
</div>
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-blue-600">Zona 4 - Norte y País Vasco</h3>
<p class="text-sm text-gray-600">País Vasco, Cantabria, Asturias y norte peninsular</p>
</div>
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-blue-600">Zona 5 - Noroeste</h3>
<p class="text-sm text-gray-600">Galicia, León, Zamora y noroeste peninsular</p>
</div>
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-blue-600">Zona 6 - Aragón y Castilla-León</h3>
<p class="text-sm text-gray-600">Aragón, Castilla-León interior y provincias centrales</p>
</div>
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-orange-600">Zona 7 - Islas Baleares</h3>
<p class="text-sm text-gray-600">Islas Baleares - Transporte marítimo</p>
</div>
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-orange-600">Zona 8 - Islas Canarias</h3>
<p class="text-sm text-gray-600">Islas Canarias - Transporte marítimo</p>
</div>
<div class="border rounded-lg p-4">
<h3 class="font-semibold mb-2 text-red-600">Zona 9 - Ceuta y Melilla</h3>
<p class="text-sm text-gray-600">Ciudades autónomas - Transporte especial</p>
</div>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">💰 Tarifas de Envío por Peso</h2>
<div class="bg-gray-50 p-4 rounded-lg">
<p class="text-sm text-gray-700 mb-4">Tarifas únicas aplicables a todas las zonas de España peninsular e islas:</p>
<div class="overflow-x-auto">
<table class="w-full border-collapse border border-gray-300 bg-white">
<thead>
<tr class="bg-blue-100">
<th class="border border-gray-300 p-3 text-left">Rango de Peso</th>
<th class="border border-gray-300 p-3 text-left">Tarifa</th>
</tr>
</thead>
<tbody>
<tr>
<td class="border border-gray-300 p-3">Hasta 1kg</td>
<td class="border border-gray-300 p-3 font-semibold text-green-600">3,50€</td>
</tr>
<tr class="bg-gray-50">
<td class="border border-gray-300 p-3">1,01kg - 5kg</td>
<td class="border border-gray-300 p-3 font-semibold text-green-600">4,20€</td>
</tr>
<tr>
<td class="border border-gray-300 p-3">5,01kg - 10kg</td>
<td class="border border-gray-300 p-3 font-semibold text-blue-600">5,80€</td>
</tr>
<tr class="bg-gray-50">
<td class="border border-gray-300 p-3">10,01kg - 20kg</td>
<td class="border border-gray-300 p-3 font-semibold text-blue-600">7,50€</td>
</tr>
<tr>
<td class="border border-gray-300 p-3">20,01kg - 30kg</td>
<td class="border border-gray-300 p-3 font-semibold text-orange-600">9,80€</td>
</tr>
<tr class="bg-gray-50">
<td class="border border-gray-300 p-3">30,01kg - 50kg</td>
<td class="border border-gray-300 p-3 font-semibold text-orange-600">12,50€</td>
</tr>
<tr>
<td class="border border-gray-300 p-3">Más de 50kg</td>
<td class="border border-gray-300 p-3 font-semibold text-red-600">15,00€</td>
</tr>
</tbody>
</table>
</div>
<p class="text-sm text-gray-600 mt-3">✅ <strong>Precios con IVA incluido</strong> - Tarifas calculadas automáticamente según el peso total del pedido</p>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">⏱️ Plazos de Entrega</h2>
<div class="grid md:grid-cols-2 gap-4">
<div class="border-l-4 border-green-500 pl-4">
<h3 class="font-semibold text-green-700">España Peninsular</h3>
<ul class="list-disc pl-6 space-y-1 text-sm">
<li>Zonas 1-6: 24-72 horas laborables</li>
<li>Entrega estándar con empresas de transporte</li>
</ul>
</div>
<div class="border-l-4 border-orange-500 pl-4">
<h3 class="font-semibold text-orange-700">Islas y Territorios</h3>
<ul class="list-disc pl-6 space-y-1 text-sm">
<li>Baleares: 3-5 días laborables</li>
<li>Canarias: 5-7 días laborables</li>
<li>Ceuta y Melilla: 4-6 días laborables</li>
</ul>
</div>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">📦 Preparación del Envío</h2>
<div class="grid md:grid-cols-2 gap-4">
<div>
<h3 class="font-semibold mb-2">🔧 Embalaje Profesional</h3>
<ul class="list-disc pl-6 space-y-1 text-sm">
<li>Protección específica para piezas de automoción</li>
<li>Materiales resistentes a golpes y humedad</li>
<li>Etiquetado claro con datos del destinatario</li>
</ul>
</div>
<div>
<h3 class="font-semibold mb-2">📋 Documentación</h3>
<ul class="list-disc pl-6 space-y-1 text-sm">
<li>Número de seguimiento proporcionado</li>
<li>Factura incluida en todos los envíos</li>
<li>Seguro de transporte incluido</li>
</ul>
</div>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">🏪 Recogida en Tienda</h2>
<div class="bg-green-50 border border-green-200 rounded-lg p-4">
<h3 class="font-semibold text-green-800 mb-2">¡Sin coste de envío!</h3>
<p class="mb-3">Puede recoger su pedido en nuestras instalaciones:</p>
<div class="grid md:grid-cols-2 gap-4">
<div>
<h4 class="font-semibold mb-2">📍 Ubicación</h4>
<ul class="list-disc pl-6 space-y-1 text-sm">
<li><strong>Dirección:</strong> Carretera Almuñecar, Km 1.5</li>
<li><strong>Código Postal:</strong> 18640, Granada</li>
<li><strong>Teléfono:</strong> 958 790 858</li>
</ul>
</div>
<div>
<h4 class="font-semibold mb-2">🕒 Horarios</h4>
<ul class="list-disc pl-6 space-y-1 text-sm">
<li><strong>Lunes a Viernes:</strong> 7:00 - 14:30</li>
<li><strong>Cita previa recomendada</strong></li>
<li><strong>Inspección previa disponible</strong></li>
</ul>
</div>
</div>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">⚠️ Condiciones Importantes</h2>
<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
<ul class="list-disc pl-6 space-y-2 text-sm">
<li><strong>Inicio de plazos:</strong> Los plazos empiezan a contar desde la confirmación del pago</li>
<li><strong>Piezas voluminosas:</strong> Pueden requerir transporte especial con coste adicional</li>
<li><strong>Verificación:</strong> Confirmar disponibilidad antes del envío</li>
<li><strong>Recepción:</strong> Inspeccionar el pedido al recibirlo e informar de cualquier incidencia</li>
<li><strong>Días laborables:</strong> De lunes a viernes, excluyendo festivos nacionales</li>
</ul>
</div>
</section>

<section>
<h2 class="text-2xl font-semibold mb-4">📞 Seguimiento y Atención al Cliente</h2>
<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
<p class="mb-3">Para consultas sobre su envío o cualquier incidencia:</p>
<div class="grid md:grid-cols-3 gap-4">
<div>
<h4 class="font-semibold mb-2">📞 Teléfono</h4>
<p class="text-lg font-bold text-blue-600">958 790 858</p>
</div>
<div>
<h4 class="font-semibold mb-2">✉️ Email</h4>
<p class="text-blue-600">info@desguacemurcia.com</p>
</div>
<div>
<h4 class="font-semibold mb-2">🕒 Horario</h4>
<p>Lunes a Viernes<br>7:00 - 14:30</p>
</div>
</div>
</div>
</section>
</div>
</div>', true, true, 'info', NULL, '2025-07-10T10:13:38.421Z', '2025-07-10T10:13:38.421Z');

-- Table: parts (153131 records)
DROP TABLE IF EXISTS "parts" CASCADE;
CREATE TABLE "parts" (
  "id" integer NOT NULL DEFAULT nextval('parts_id_seq'::regclass),
  "ref_local" integer NOT NULL,
  "id_empresa" integer NOT NULL,
  "id_vehiculo" integer NOT NULL,
  "vehicle_marca" text NOT NULL DEFAULT ''::text,
  "vehicle_modelo" text NOT NULL DEFAULT ''::text,
  "vehicle_version" text NOT NULL DEFAULT ''::text,
  "vehicle_anyo" integer NOT NULL DEFAULT 0,
  "combustible" text NOT NULL DEFAULT ''::text,
  "related_vehicles_count" integer NOT NULL DEFAULT 0,
  "cod_familia" text NOT NULL DEFAULT ''::text,
  "descripcion_familia" text NOT NULL DEFAULT ''::text,
  "cod_articulo" text NOT NULL DEFAULT ''::text,
  "descripcion_articulo" text NOT NULL DEFAULT ''::text,
  "cod_version_vehiculo" text NOT NULL DEFAULT ''::text,
  "ref_principal" text NOT NULL DEFAULT ''::text,
  "anyo_inicio" integer NOT NULL DEFAULT 2000,
  "anyo_fin" integer NOT NULL DEFAULT 2050,
  "puertas" integer NOT NULL DEFAULT 0,
  "rv_code" text NOT NULL DEFAULT ''::text,
  "precio" text NOT NULL DEFAULT '0'::text,
  "anyo_stock" integer NOT NULL DEFAULT 0,
  "peso" text NOT NULL DEFAULT '0'::text,
  "ubicacion" integer NOT NULL DEFAULT 0,
  "observaciones" text NOT NULL DEFAULT ''::text,
  "reserva" integer NOT NULL DEFAULT 0,
  "tipo_material" integer NOT NULL DEFAULT 0,
  "imagenes" ARRAY NOT NULL,
  "activo" boolean NOT NULL DEFAULT false,
  "sincronizado" boolean NOT NULL DEFAULT true,
  "is_pending_relation" boolean NOT NULL DEFAULT false,
  "ultima_sincronizacion" timestamp without time zone NOT NULL DEFAULT now(),
  "fecha_creacion" timestamp without time zone NOT NULL DEFAULT now(),
  "fecha_actualizacion" timestamp without time zone NOT NULL DEFAULT now(),
  "disponible_api" boolean DEFAULT true
);

-- Note: Table parts has 153131 records - schema only (too large for full backup)

-- Table: payment_config (5 records)
DROP TABLE IF EXISTS "payment_config" CASCADE;
CREATE TABLE "payment_config" (
  "id" integer NOT NULL DEFAULT nextval('payment_config_id_seq'::regclass),
  "provider" character varying(100) NOT NULL,
  "name" character varying(255) NOT NULL,
  "is_active" boolean DEFAULT true,
  "config" json NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: payment_config
INSERT INTO "payment_config" ("id", "provider", "name", "is_active", "config", "created_at", "updated_at") VALUES (8, 'paypal', 'PayPal', false, '{"clientId":"","clientSecret":"","environment":"sandbox"}', '2025-07-09T09:10:37.783Z', '2025-08-11T06:34:47.515Z');
INSERT INTO "payment_config" ("id", "provider", "name", "is_active", "config", "created_at", "updated_at") VALUES (10, 'cash', 'Pago en Efectivo', true, '{"pickup_location":"Desguaces Murcia - Calle Ejemplo 123, 30100 Murcia","pickup_hours":"Lunes a Viernes: 9:00 - 18:00, Sábados: 9:00 - 13:00","contact_phone":"968 123 456","preparation_time":"24-48 horas","instructions":"Llame antes de venir para confirmar que su pedido está listo. Traiga su número de pedido.","require_identification":true}', '2025-07-09T15:54:21.220Z', '2025-08-11T06:34:49.609Z');
INSERT INTO "payment_config" ("id", "provider", "name", "is_active", "config", "created_at", "updated_at") VALUES (7, 'bank_transfer', 'Transferencia Bancaria', true, '{"account_number":"ES1234567890123456789012","bank_name":"Banco Ejemplo"}', '2025-07-09T09:10:37.783Z', '2025-08-11T06:34:51.739Z');
INSERT INTO "payment_config" ("id", "provider", "name", "is_active", "config", "created_at", "updated_at") VALUES (6, 'stripe', 'Tarjeta de Crédito/Débito', false, '{"publicKey":"","secretKey":"","environment":"test","webhookSecret":""}', '2025-07-09T09:10:37.783Z', '2025-08-11T06:34:53.511Z');
INSERT INTO "payment_config" ("id", "provider", "name", "is_active", "config", "created_at", "updated_at") VALUES (9, 'redsys', 'Redsys (Tarjeta)', true, '{"urlKo":"https://desguacemurcia.com/payment/failure","urlOk":"https://desguacemurcia.com/payment/success","terminal":"100","secretKey":"8AO7g6kn/b6DH7PjseXiYJTNbmuo0WUp","environment":"production","merchantCode":"141249086"}', '2025-07-09T12:14:48.396Z', '2025-08-11T10:45:34.149Z');

-- Table: popup_stats (2244 records)
DROP TABLE IF EXISTS "popup_stats" CASCADE;
CREATE TABLE "popup_stats" (
  "id" integer NOT NULL DEFAULT nextval('popup_stats_id_seq'::regclass),
  "popup_id" integer NOT NULL,
  "user_id" integer,
  "session_id" character varying(255),
  "action" character varying(50) NOT NULL,
  "page" character varying(255) NOT NULL,
  "user_agent" text,
  "ip_address" character varying(45),
  "created_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Note: Table popup_stats has 2244 records - schema only (too large for full backup)

-- Table: popups (1 records)
DROP TABLE IF EXISTS "popups" CASCADE;
CREATE TABLE "popups" (
  "id" integer NOT NULL DEFAULT nextval('popups_id_seq'::regclass),
  "title" character varying(255) NOT NULL,
  "content" text NOT NULL,
  "type" character varying(50) NOT NULL DEFAULT 'info'::character varying,
  "position" character varying(50) NOT NULL DEFAULT 'center'::character varying,
  "trigger" character varying(50) NOT NULL DEFAULT 'immediate'::character varying,
  "trigger_value" integer DEFAULT 0,
  "display_frequency" character varying(50) NOT NULL DEFAULT 'always'::character varying,
  "start_date" timestamp without time zone,
  "end_date" timestamp without time zone,
  "is_active" boolean DEFAULT true,
  "priority" integer DEFAULT 1,
  "target_pages" ARRAY,
  "exclude_pages" ARRAY,
  "button_text" character varying(100) DEFAULT 'Cerrar'::character varying,
  "button_action" character varying(50) DEFAULT 'close'::character varying,
  "button_url" text,
  "styles" jsonb,
  "show_close_button" boolean DEFAULT true,
  "backdrop_close" boolean DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  "image" text
);

-- Sample data for table: popups
INSERT INTO "popups" ("id", "title", "content", "type", "position", "trigger", "trigger_value", "display_frequency", "start_date", "end_date", "is_active", "priority", "target_pages", "exclude_pages", "button_text", "button_action", "button_url", "styles", "show_close_button", "backdrop_close", "created_at", "updated_at", "image") VALUES (1, 'Cerrado por vacaciones', 'Desguace Murcia permanecerá cerrado del 11 al 17 de Agosto por vacaciones.', 'info', 'center', 'scroll', 10, 'always', NULL, '2025-08-31T00:00:00.000Z', false, 1, '["/"]', '["/admin","/piezas","/vehiculos"]', 'Cerrar', 'close', '', NULL, true, true, '2025-07-31T07:33:50.549Z', '2025-08-18T09:04:40.585Z', '');

-- Table: provinces (52 records)
DROP TABLE IF EXISTS "provinces" CASCADE;
CREATE TABLE "provinces" (
  "id" integer NOT NULL DEFAULT nextval('provinces_id_seq'::regclass),
  "name" character varying(100) NOT NULL,
  "code" character varying(10),
  "shipping_zone_id" integer,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

-- Sample data for table: provinces
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (15, 'Ciudad Real', '13', 1, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (17, 'Cuenca', '16', 1, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (20, 'Guadalajara', '19', 1, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (31, 'Madrid', '28', 1, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (45, 'Toledo', '45', 1, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (4, 'Alicante', '03', 2, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (9, 'Barcelona', '08', 2, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (14, 'Castellón', '12', 2, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (18, 'Girona', '17', 2, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (29, 'Lérida', '25', 2, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (43, 'Tarragona', '43', 2, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (46, 'Valencia', '46', 2, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (5, 'Almería', '04', 3, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (12, 'Cádiz', '11', 3, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (16, 'Córdoba', '14', 3, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (22, 'Huelva', '21', 3, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (25, 'Jaén', '23', 3, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (32, 'Málaga', '29', 3, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (41, 'Sevilla', '41', 3, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (2, 'Álava', '01', 4, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (6, 'Asturias', '33', 4, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (13, 'Cantabria', '39', 4, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (21, 'Guipúzcoa', '20', 4, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (26, 'La Rioja', '26', 4, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (34, 'Navarra', '31', 4, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (48, 'Vizcaya', '48', 4, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (1, 'A Coruña', '15', 5, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (28, 'León', '24', 5, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (30, 'Lugo', '27', 5, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (35, 'Orense', '32', 5, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (37, 'Pontevedra', '36', 5, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (49, 'Zamora', '49', 5, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (3, 'Albacete', '02', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (7, 'Ávila', '05', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (8, 'Badajoz', '06', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (10, 'Burgos', '09', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (11, 'Cáceres', '10', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (23, 'Huesca', '22', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (33, 'Murcia', '30', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (36, 'Palencia', '34', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (38, 'Salamanca', '37', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (40, 'Segovia', '40', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (42, 'Soria', '42', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (44, 'Teruel', '44', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (47, 'Valladolid', '47', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (50, 'Zaragoza', '50', 6, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (24, 'Islas Baleares', '07', 7, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (27, 'Las Palmas', '35', 8, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (39, 'Santa Cruz de Tenerife', '38', 8, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');
INSERT INTO "provinces" ("id", "name", "code", "shipping_zone_id", "created_at", "updated_at") VALUES (51, 'Ceuta', '51', 9, '2025-06-07T18:41:29.370Z', '2025-06-07T18:41:29.370Z');

-- Table: session (128 records)
DROP TABLE IF EXISTS "session" CASCADE;
CREATE TABLE "session" (
  "sid" character varying NOT NULL,
  "sess" json NOT NULL,
  "expire" timestamp without time zone NOT NULL
);

-- Note: Table session has 128 records - schema only (too large for full backup)

-- Table: shipping_config (1 records)
DROP TABLE IF EXISTS "shipping_config" CASCADE;
CREATE TABLE "shipping_config" (
  "id" integer NOT NULL DEFAULT nextval('shipping_config_id_seq'::regclass),
  "name" character varying(255) NOT NULL,
  "description" text,
  "base_price" numeric NOT NULL DEFAULT '0'::numeric,
  "free_shipping_threshold" numeric,
  "weight_based_pricing" boolean DEFAULT false,
  "price_per_kg" numeric DEFAULT '0'::numeric,
  "max_weight" numeric,
  "estimated_days" integer DEFAULT 1,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: shipping_config
INSERT INTO "shipping_config" ("id", "name", "description", "base_price", "free_shipping_threshold", "weight_based_pricing", "price_per_kg", "max_weight", "estimated_days", "is_active", "created_at", "updated_at") VALUES (1, 'Desguace Murcia', 'Transporte nacional DM', '3.50', NULL, true, '0.00', '500.00', 2, true, '2025-06-07T17:42:11.730Z', '2025-07-18T08:52:16.618Z');

-- Table: shipping_rates (7 records)
DROP TABLE IF EXISTS "shipping_rates" CASCADE;
CREATE TABLE "shipping_rates" (
  "id" integer NOT NULL DEFAULT nextval('shipping_rates_id_seq'::regclass),
  "shipping_config_id" integer NOT NULL,
  "min_weight" numeric NOT NULL,
  "max_weight" numeric,
  "price" numeric NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: shipping_rates
INSERT INTO "shipping_rates" ("id", "shipping_config_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (1, 1, '0.00', '1.00', '3.50', '2025-06-07T18:34:54.945Z', '2025-06-07T18:34:54.945Z');
INSERT INTO "shipping_rates" ("id", "shipping_config_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (2, 1, '1.01', '5.00', '4.20', '2025-06-07T18:34:54.945Z', '2025-06-07T18:34:54.945Z');
INSERT INTO "shipping_rates" ("id", "shipping_config_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (3, 1, '5.01', '10.00', '5.80', '2025-06-07T18:34:54.945Z', '2025-06-07T18:34:54.945Z');
INSERT INTO "shipping_rates" ("id", "shipping_config_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (4, 1, '10.01', '20.00', '7.50', '2025-06-07T18:34:54.945Z', '2025-06-07T18:34:54.945Z');
INSERT INTO "shipping_rates" ("id", "shipping_config_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (5, 1, '20.01', '30.00', '9.80', '2025-06-07T18:34:54.945Z', '2025-06-07T18:34:54.945Z');
INSERT INTO "shipping_rates" ("id", "shipping_config_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (6, 1, '30.01', '50.00', '12.50', '2025-06-07T18:34:54.945Z', '2025-06-07T18:34:54.945Z');
INSERT INTO "shipping_rates" ("id", "shipping_config_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (7, 1, '50.01', NULL, '15.00', '2025-06-07T18:34:54.945Z', '2025-06-07T18:34:54.945Z');

-- Table: shipping_zone_rates (63 records)
DROP TABLE IF EXISTS "shipping_zone_rates" CASCADE;
CREATE TABLE "shipping_zone_rates" (
  "id" integer NOT NULL DEFAULT nextval('shipping_zone_rates_id_seq'::regclass),
  "shipping_config_id" integer,
  "shipping_zone_id" integer,
  "min_weight" numeric NOT NULL DEFAULT 0,
  "max_weight" numeric,
  "price" numeric NOT NULL,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

-- Sample data for table: shipping_zone_rates
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (1, 1, 1, '0.00', '1.00', '3.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (2, 1, 1, '1.01', '5.00', '4.20', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (3, 1, 1, '5.01', '10.00', '5.80', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (4, 1, 1, '10.01', '20.00', '7.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (5, 1, 1, '20.01', '30.00', '9.80', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (6, 1, 1, '30.01', '50.00', '12.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (7, 1, 1, '50.01', NULL, '15.00', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (8, 1, 2, '0.00', '1.00', '3.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (9, 1, 2, '1.01', '5.00', '4.20', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (10, 1, 2, '5.01', '10.00', '5.80', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (11, 1, 2, '10.01', '20.00', '7.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (12, 1, 2, '20.01', '30.00', '9.80', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (13, 1, 2, '30.01', '50.00', '12.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (14, 1, 2, '50.01', NULL, '15.00', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (15, 1, 3, '0.00', '1.00', '3.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (16, 1, 3, '1.01', '5.00', '4.20', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (17, 1, 3, '5.01', '10.00', '5.80', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (18, 1, 3, '10.01', '20.00', '7.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (19, 1, 3, '20.01', '30.00', '9.80', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (20, 1, 3, '30.01', '50.00', '12.50', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (21, 1, 3, '50.01', NULL, '15.00', '2025-08-05T10:08:14.954Z', '2025-08-05T10:08:14.954Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (22, 1, 4, '0.00', '1.00', '3.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (23, 1, 4, '1.01', '5.00', '4.20', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (24, 1, 4, '5.01', '10.00', '5.80', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (25, 1, 4, '10.01', '20.00', '7.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (26, 1, 4, '20.01', '30.00', '9.80', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (27, 1, 4, '30.01', '50.00', '12.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (28, 1, 4, '50.01', NULL, '15.00', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (29, 1, 5, '0.00', '1.00', '3.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (30, 1, 5, '1.01', '5.00', '4.20', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (31, 1, 5, '5.01', '10.00', '5.80', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (32, 1, 5, '10.01', '20.00', '7.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (33, 1, 5, '20.01', '30.00', '9.80', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (34, 1, 5, '30.01', '50.00', '12.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (35, 1, 5, '50.01', NULL, '15.00', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (36, 1, 6, '0.00', '1.00', '3.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (37, 1, 6, '1.01', '5.00', '4.20', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (38, 1, 6, '5.01', '10.00', '5.80', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (39, 1, 6, '10.01', '20.00', '7.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (40, 1, 6, '20.01', '30.00', '9.80', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (41, 1, 6, '30.01', '50.00', '12.50', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (42, 1, 6, '50.01', NULL, '15.00', '2025-08-05T10:08:19.987Z', '2025-08-05T10:08:19.987Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (43, 1, 7, '0.00', '1.00', '5.25', '2025-08-05T10:08:26.485Z', '2025-08-05T10:08:26.485Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (44, 1, 7, '1.01', '5.00', '6.30', '2025-08-05T10:08:26.485Z', '2025-08-05T10:08:26.485Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (45, 1, 7, '5.01', '10.00', '8.70', '2025-08-05T10:08:26.485Z', '2025-08-05T10:08:26.485Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (46, 1, 7, '10.01', '20.00', '11.25', '2025-08-05T10:08:26.485Z', '2025-08-05T10:08:26.485Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (47, 1, 7, '20.01', '30.00', '14.70', '2025-08-05T10:08:26.485Z', '2025-08-05T10:08:26.485Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (48, 1, 7, '30.01', '50.00', '18.75', '2025-08-05T10:08:26.485Z', '2025-08-05T10:08:26.485Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (49, 1, 7, '50.01', NULL, '22.50', '2025-08-05T10:08:26.485Z', '2025-08-05T10:08:26.485Z');
INSERT INTO "shipping_zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (50, 1, 8, '0.00', '1.00', '7.00', '2025-08-05T10:08:26.485Z', '2025-08-05T10:08:26.485Z');

-- Table: shipping_zones (9 records)
DROP TABLE IF EXISTS "shipping_zones" CASCADE;
CREATE TABLE "shipping_zones" (
  "id" integer NOT NULL DEFAULT nextval('shipping_zones_id_seq'::regclass),
  "name" character varying(100) NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

-- Sample data for table: shipping_zones
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (1, 'Zona 1 - Madrid y Centro', 'Madrid y provincias centrales con mejor conectividad', true, 1, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (2, 'Zona 2 - Cataluña y Valencia', 'Cataluña, Valencia y provincias del mediterráneo', true, 2, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (3, 'Zona 3 - Andalucía', 'Andalucía y provincias del sur', true, 3, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (4, 'Zona 4 - Norte y País Vasco', 'País Vasco, Cantabria, Asturias y norte peninsular', true, 4, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (5, 'Zona 5 - Noroeste', 'Galicia, León, Zamora y noroeste peninsular', true, 5, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (6, 'Zona 6 - Aragón y Castilla-León', 'Aragón, Castilla-León interior y provincias centrales', true, 6, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (7, 'Zona 7 - Islas Baleares', 'Islas Baleares - Transporte marítimo', true, 7, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (8, 'Zona 8 - Islas Canarias', 'Islas Canarias - Transporte marítimo', true, 8, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');
INSERT INTO "shipping_zones" ("id", "name", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES (9, 'Zona 9 - Ceuta y Melilla', 'Ciudades autónomas - Transporte especial', true, 9, '2025-06-07T18:41:38.650Z', '2025-06-07T18:41:38.650Z');

-- Table: site_config (1 records)
DROP TABLE IF EXISTS "site_config" CASCADE;
CREATE TABLE "site_config" (
  "id" integer NOT NULL DEFAULT nextval('site_config_id_seq'::regclass),
  "maintenance_mode" boolean NOT NULL DEFAULT false,
  "maintenance_message" text NOT NULL DEFAULT 'Estamos realizando mejoras en nuestra plataforma.'::text,
  "estimated_time" text NOT NULL DEFAULT 'Volveremos pronto'::text,
  "last_updated" timestamp without time zone NOT NULL DEFAULT now(),
  "custom_scripts" text DEFAULT ''::text
);

-- Sample data for table: site_config
INSERT INTO "site_config" ("id", "maintenance_mode", "maintenance_message", "estimated_time", "last_updated", "custom_scripts") VALUES (1, false, 'Sitio operativo', '30 minutos', '2025-08-11T06:33:45.259Z', '<script type="text/javascript">
  (function(d, t) {
      var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
      v.onload = function() {
        window.voiceflow.chat.load({
          verify: { projectID: ''67e8ead20683bc32991970f2'' },
          url: ''https://general-runtime.voiceflow.com'',
          versionID: ''production'',
          voice: {
            url: "https://runtime-api.voiceflow.com"
          }
        });
      }
      v.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs"; v.type = "text/javascript"; s.parentNode.insertBefore(v, s);
  })(document, ''script'');
</script>');

-- Table: site_settings (20 records)
DROP TABLE IF EXISTS "site_settings" CASCADE;
CREATE TABLE "site_settings" (
  "id" integer NOT NULL DEFAULT nextval('site_settings_id_seq'::regclass),
  "key" character varying(255) NOT NULL,
  "value" text NOT NULL,
  "description" text,
  "type" character varying(50) NOT NULL DEFAULT 'text'::character varying,
  "category" character varying(100) NOT NULL DEFAULT 'general'::character varying,
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: site_settings
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (2, 'site_description', 'Especialistas en repuestos de automóvil con más de 20 años de experiencia', 'Descripción del sitio', 'text', 'general', '2025-06-08T08:05:12.893Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (6, 'form_contact_email', 'info@desguacesmurcia.com', 'Email donde llegan los formularios de contacto', 'email', 'forms', '2025-06-08T08:05:13.185Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (7, 'form_valuation_email', 'tasaciones@desguacesmurcia.com', 'Email donde llegan las tasaciones', 'email', 'forms', '2025-06-08T08:05:13.258Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (3, 'contact_email', 'info@desguacemurcia.com', 'Email principal de contacto', 'email', 'contact', '2025-06-08T08:05:12.966Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (4, 'contact_phone', '958 790 858', 'Teléfono de contacto', 'text', 'contact', '2025-06-08T08:05:13.039Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (5, 'contact_address', 'Carretera Almuñecar, Km 1.5, 18640, Granada', 'Dirección física', 'text', 'contact', '2025-06-08T08:05:13.112Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (28, 'header_show_phone', 'true', 'Mostrar teléfono en el header', 'boolean', 'header', '2025-07-21T10:01:53.467Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (29, 'header_show_email', 'true', 'Mostrar email en el header', 'boolean', 'header', '2025-07-21T10:01:53.467Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (30, 'header_show_hours', 'true', 'Mostrar horarios en el header', 'boolean', 'header', '2025-07-21T10:01:53.467Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (31, 'header_menu_style', 'horizontal', 'Estilo del menú principal', 'text', 'header', '2025-07-21T10:01:53.467Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (26, 'footer_links', '{"enlaces": [{"text": "Política de Privacidad", "url": "/politica-privacidad"}, {"text": "Aviso Legal", "url": "/aviso-legal"}, {"text": "Contacto", "url": "/contacto"}, {"text": "TEST", "url": "/test"}]}', 'Enlaces del footer en formato JSON', 'json', 'footer', '2025-07-21T11:06:39.915Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (25, 'copyright_text', '', 'Texto del copyright en el footer', 'text', 'footer', '2025-07-21T11:15:48.472Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (8, 'business_hours', '{"monday":"7:00-14:30","tuesday":"7:00-14:30","wednesday":"7:00-14:30","thursday":"7:00-14:30","friday":"7:00-14:30","saturday":"closed","sunday":"closed"}', 'Horarios de atención', 'json', 'general', '2025-07-21T11:18:50.054Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (33, 'header_phone_secondary', '', 'Teléfono secundario del header', 'text', 'header', '2025-07-21T11:24:20.515Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (34, 'header_emergency_phone', '', 'Teléfono de emergencias', 'text', 'header', '2025-07-21T11:24:20.515Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (35, 'header_whatsapp', '', 'Número de WhatsApp', 'text', 'header', '2025-07-21T11:24:20.515Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (36, 'header_background_color', '#ffffff', 'Color de fondo del header', 'text', 'header', '2025-07-21T11:24:20.515Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (37, 'header_text_color', '#000000', 'Color del texto del header', 'text', 'header', '2025-07-21T11:24:20.515Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (1, 'site_name', 'Desguace Murcia', 'Nombre del sitio web', 'text', 'general', '2025-06-08T08:05:12.819Z');
INSERT INTO "site_settings" ("id", "key", "value", "description", "type", "category", "updated_at") VALUES (27, 'header_logo_text', 'Desguace Murcia', 'Texto del logo en el header', 'text', 'header', '2025-07-21T10:01:53.467Z');

-- Table: sync_control (2 records)
DROP TABLE IF EXISTS "sync_control" CASCADE;
CREATE TABLE "sync_control" (
  "id" integer NOT NULL DEFAULT nextval('sync_control_id_seq'::regclass),
  "type" text NOT NULL,
  "last_sync_date" timestamp without time zone NOT NULL,
  "last_id" integer NOT NULL DEFAULT 0,
  "records_processed" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: sync_control
INSERT INTO "sync_control" ("id", "type", "last_sync_date", "last_id", "records_processed", "active", "updated_at") VALUES (11, 'vehicles', '2025-08-18T13:49:02.000Z', 8318663, 196524, true, '2025-08-02T10:41:33.507Z');
INSERT INTO "sync_control" ("id", "type", "last_sync_date", "last_id", "records_processed", "active", "updated_at") VALUES (12, 'parts', '2025-08-18T23:03:26.000Z', 404351803, 2879806, true, '2025-08-02T10:44:34.660Z');

-- Table: users (6 records)
DROP TABLE IF EXISTS "users" CASCADE;
CREATE TABLE "users" (
  "id" integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  "username" text NOT NULL,
  "password" text NOT NULL,
  "email" text NOT NULL DEFAULT ''::text,
  "first_name" text NOT NULL DEFAULT ''::text,
  "last_name" text NOT NULL DEFAULT ''::text,
  "address" text NOT NULL DEFAULT ''::text,
  "city" text NOT NULL DEFAULT ''::text,
  "postal_code" text NOT NULL DEFAULT ''::text,
  "phone" text NOT NULL DEFAULT ''::text,
  "is_admin" boolean NOT NULL DEFAULT false,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  "province" text NOT NULL DEFAULT ''::text,
  "role" text NOT NULL DEFAULT 'customer'::text,
  "shipping_address" text,
  "shipping_city" text,
  "shipping_postal_code" text,
  "shipping_province" text,
  "billing_address" text,
  "billing_city" text,
  "billing_postal_code" text,
  "billing_province" text
);

-- Sample data for table: users
INSERT INTO "users" ("id", "username", "password", "email", "first_name", "last_name", "address", "city", "postal_code", "phone", "is_admin", "stripe_customer_id", "stripe_subscription_id", "created_at", "updated_at", "province", "role", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_province", "billing_address", "billing_city", "billing_postal_code", "billing_province") VALUES (17, 'gestor', '33e3bde4cc8662b595a7736dede2b0edcd8c9d03dc0cdde4361fe160801f96ddf3fd6d7f966f53219a6744e5e5f0bc9a34689aa88aa36c3e182a9e664cdab64a.8b0840a523f9cd6bc83200f23b02c8a2', 'gestor@desguacesmurcia.com', '', '', '', '', '', '', false, NULL, NULL, '2025-07-24T08:25:15.008Z', '2025-08-04T12:59:33.487Z', '', 'manager', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "users" ("id", "username", "password", "email", "first_name", "last_name", "address", "city", "postal_code", "phone", "is_admin", "stripe_customer_id", "stripe_subscription_id", "created_at", "updated_at", "province", "role", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_province", "billing_address", "billing_city", "billing_postal_code", "billing_province") VALUES (19, 'bartogra24@gmail.com', '7283354a2c4f9c1d566f2ce67b6be8f10fd14e7823fd1c45e9f9f3304b45271bca93004a734c0669a71d156486f34830826a75540906e9ef0962f3db7ab8453e.d6cf19a35963a7ac6e50a743a9636eee', '', '', '', '', '', '', '', false, NULL, NULL, '2025-08-14T09:42:09.512Z', '2025-08-14T09:42:09.512Z', '', 'customer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "users" ("id", "username", "password", "email", "first_name", "last_name", "address", "city", "postal_code", "phone", "is_admin", "stripe_customer_id", "stripe_subscription_id", "created_at", "updated_at", "province", "role", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_province", "billing_address", "billing_city", "billing_postal_code", "billing_province") VALUES (20, 'Transep sl', '403fcd87e071de087ebaccaa2a78ecea8b3ce1a8ae9b3afe7c2ebdbd52cae3344f2aaf20172a5a69e335e950cd47de1cedafd116a6d9b5716de754c7a3303cde.9ebc88e45b082e7325d866343a179448', 'kinoejido72@gmail.com', 'Transep.sl', 'Transep.sl', 'Avenida Séneca 205', 'EJIDO, EL', '04700', '609675657', false, NULL, NULL, '2025-08-18T09:05:41.420Z', '2025-08-18T09:12:39.364Z', 'Almería', 'customer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "users" ("id", "username", "password", "email", "first_name", "last_name", "address", "city", "postal_code", "phone", "is_admin", "stripe_customer_id", "stripe_subscription_id", "created_at", "updated_at", "province", "role", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_province", "billing_address", "billing_city", "billing_postal_code", "billing_province") VALUES (8, 'desguacemurcia', '0dc9c144442981e87e7aefa3ecd20b736440a533c9ef51a27ff4bcf4578262b0b62972480246876035bf3d23b40bb37c14a09124b9ed40e4168ed1f176279f9a.4e12944c75190a06512f4ae0329856a4', 'info@desguacemurcia.com', '', '', '', '', '', '', true, NULL, NULL, '2025-07-11T17:35:59.956Z', '2025-07-11T18:52:30.891Z', '', 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "users" ("id", "username", "password", "email", "first_name", "last_name", "address", "city", "postal_code", "phone", "is_admin", "stripe_customer_id", "stripe_subscription_id", "created_at", "updated_at", "province", "role", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_province", "billing_address", "billing_city", "billing_postal_code", "billing_province") VALUES (1, 'jorgesoria', 'bf473b97e2a18a27bcd6062a83794185899f06892e32ef3bf1fefc3d5551a2be56526cf5f229eb45fe9366f2c55d2f07f86ddc6f0484d3c4b2e6955066408119.c11bddeb0aba1a6c3cbaf7013907cf9e', 'jorge@hispanaweb.com', 'Jorge', 'Soria', 'Mi direccion', 'Localidad', '18200', '432343234', true, NULL, NULL, '2025-06-05T17:10:06.559Z', '2025-07-24T22:14:58.686Z', 'Granada', 'admin', 'Mi direccion', 'Localidad', '18200', NULL, NULL, NULL, NULL, NULL);
INSERT INTO "users" ("id", "username", "password", "email", "first_name", "last_name", "address", "city", "postal_code", "phone", "is_admin", "stripe_customer_id", "stripe_subscription_id", "created_at", "updated_at", "province", "role", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_province", "billing_address", "billing_city", "billing_postal_code", "billing_province") VALUES (14, 'Antonio', '545606803ce27880f93874f7d7f8f4483dd621195ac792f0b8994db2822b666dff0d9971dac4728d2cf6e24eccb3137008acd7abafec10e1d14048a1de890a01.b378c7808c0909faf484550b85acaa0c', 'a.tapia@desguacemurcia.com', 'Antonio M', 'Tapia', '', '', '', '675900025', false, NULL, NULL, '2025-07-23T08:15:19.802Z', '2025-07-26T08:12:33.107Z', '', 'customer', 'MOREDAS 50', 'OVIEDO', '33001', 'Asturias', '', '', '', '');

-- Table: vehicle_parts (2 records)
DROP TABLE IF EXISTS "vehicle_parts" CASCADE;
CREATE TABLE "vehicle_parts" (
  "id" integer NOT NULL DEFAULT nextval('vehicle_parts_id_seq'::regclass),
  "vehicle_id" integer NOT NULL,
  "part_id" integer NOT NULL,
  "id_vehiculo_original" integer NOT NULL,
  "fecha_creacion" timestamp without time zone NOT NULL DEFAULT now()
);

-- Sample data for table: vehicle_parts
INSERT INTO "vehicle_parts" ("id", "vehicle_id", "part_id", "id_vehiculo_original", "fecha_creacion") VALUES (4, 142740, 2174146, 55898, '2025-08-18T22:26:17.144Z');
INSERT INTO "vehicle_parts" ("id", "vehicle_id", "part_id", "id_vehiculo_original", "fecha_creacion") VALUES (5, 142739, 2174147, 55901, '2025-08-18T22:26:17.144Z');

-- Table: vehicles (4369 records)
DROP TABLE IF EXISTS "vehicles" CASCADE;
CREATE TABLE "vehicles" (
  "id" integer NOT NULL DEFAULT nextval('vehicles_id_seq'::regclass),
  "id_local" integer NOT NULL,
  "id_empresa" integer NOT NULL,
  "descripcion" text NOT NULL,
  "marca" text NOT NULL,
  "modelo" text NOT NULL,
  "version" text NOT NULL DEFAULT ''::text,
  "anyo" integer NOT NULL,
  "combustible" text NOT NULL DEFAULT ''::text,
  "bastidor" text NOT NULL DEFAULT ''::text,
  "matricula" text NOT NULL DEFAULT ''::text,
  "color" text NOT NULL DEFAULT ''::text,
  "kilometraje" integer NOT NULL DEFAULT 0,
  "potencia" integer NOT NULL DEFAULT 0,
  "puertas" integer,
  "imagenes" ARRAY NOT NULL,
  "activo" boolean NOT NULL DEFAULT true,
  "sincronizado" boolean NOT NULL DEFAULT true,
  "active_parts_count" integer NOT NULL DEFAULT 0,
  "total_parts_count" integer NOT NULL DEFAULT 0,
  "ultima_sincronizacion" timestamp without time zone NOT NULL DEFAULT now(),
  "fecha_creacion" timestamp without time zone NOT NULL DEFAULT now(),
  "fecha_actualizacion" timestamp without time zone NOT NULL DEFAULT now()
);

-- Note: Table vehicles has 4369 records - schema only (too large for full backup)

-- Table: zone_rates (45 records)
DROP TABLE IF EXISTS "zone_rates" CASCADE;
CREATE TABLE "zone_rates" (
  "id" integer NOT NULL DEFAULT nextval('zone_rates_id_seq'::regclass),
  "shipping_config_id" integer NOT NULL,
  "shipping_zone_id" integer NOT NULL,
  "min_weight" numeric NOT NULL DEFAULT 0,
  "max_weight" numeric,
  "price" numeric NOT NULL,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

-- Sample data for table: zone_rates
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (1, 1, 1, '0.00', '5000.00', '3.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (2, 1, 1, '5001.00', '10000.00', '4.20', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (3, 1, 1, '10001.00', '20000.00', '5.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (4, 1, 1, '20001.00', '50000.00', '8.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (5, 1, 1, '50001.00', NULL, '12.00', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (6, 1, 2, '0.00', '5000.00', '4.20', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (7, 1, 2, '5001.00', '10000.00', '5.10', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (8, 1, 2, '10001.00', '20000.00', '6.90', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (9, 1, 2, '20001.00', '50000.00', '10.20', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (10, 1, 2, '50001.00', NULL, '14.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (11, 1, 3, '0.00', '5000.00', '4.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (12, 1, 3, '5001.00', '10000.00', '5.70', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (13, 1, 3, '10001.00', '20000.00', '7.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (14, 1, 3, '20001.00', '50000.00', '11.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (15, 1, 3, '50001.00', NULL, '16.20', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (16, 1, 4, '0.00', '5000.00', '4.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (17, 1, 4, '5001.00', '10000.00', '5.40', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (18, 1, 4, '10001.00', '20000.00', '7.20', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (19, 1, 4, '20001.00', '50000.00', '10.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (20, 1, 4, '50001.00', NULL, '15.00', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (21, 1, 5, '0.00', '5000.00', '5.20', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (22, 1, 5, '5001.00', '10000.00', '6.30', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (23, 1, 5, '10001.00', '20000.00', '8.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (24, 1, 5, '20001.00', '50000.00', '12.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (25, 1, 5, '50001.00', NULL, '18.00', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (26, 1, 6, '0.00', '5000.00', '4.10', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (27, 1, 6, '5001.00', '10000.00', '4.90', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (28, 1, 6, '10001.00', '20000.00', '6.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (29, 1, 6, '20001.00', '50000.00', '9.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (30, 1, 6, '50001.00', NULL, '13.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (31, 1, 7, '0.00', '5000.00', '8.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (32, 1, 7, '5001.00', '10000.00', '12.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (33, 1, 7, '10001.00', '20000.00', '18.90', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (34, 1, 7, '20001.00', '50000.00', '28.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (35, 1, 7, '50001.00', NULL, '42.00', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (36, 1, 8, '0.00', '5000.00', '12.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (37, 1, 8, '5001.00', '10000.00', '18.90', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (38, 1, 8, '10001.00', '20000.00', '27.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (39, 1, 8, '20001.00', '50000.00', '42.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (40, 1, 8, '50001.00', NULL, '65.00', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (41, 1, 9, '0.00', '5000.00', '15.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (42, 1, 9, '5001.00', '10000.00', '22.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (43, 1, 9, '10001.00', '20000.00', '32.80', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (44, 1, 9, '20001.00', '50000.00', '48.50', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');
INSERT INTO "zone_rates" ("id", "shipping_config_id", "shipping_zone_id", "min_weight", "max_weight", "price", "created_at", "updated_at") VALUES (45, 1, 9, '50001.00', NULL, '75.00', '2025-06-07T19:03:19.687Z', '2025-06-07T19:03:19.687Z');


-- Backup completed at 2025-08-19T07:17:34.660Z
-- Summary: 36 tables processed successfully
-- Note: This backup contains table schemas and sample data for small tables only
-- For complete data backup of large tables, use external database tools
