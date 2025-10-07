import { pgTable, text, serial, integer, boolean, timestamp, json, primaryKey, real, uniqueIndex, varchar, uuid, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Usuarios del sistema con roles diferenciados
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").default("").notNull(),
  firstName: text("first_name").default("").notNull(),
  lastName: text("last_name").default("").notNull(),
  address: text("address").default("").notNull(),
  city: text("city").default("").notNull(),
  postalCode: text("postal_code").default("").notNull(),
  phone: text("phone").default("").notNull(),
  nifCif: text("nif_cif").default("").notNull(),
  province: text("province").default("").notNull(),
  // Dirección de envío
  shippingAddress: text("shipping_address").default("").notNull(),
  shippingCity: text("shipping_city").default("").notNull(),
  shippingPostalCode: text("shipping_postal_code").default("").notNull(),
  shippingProvince: text("shipping_province").default("").notNull(),
  // Dirección de facturación
  billingAddress: text("billing_address").default("").notNull(),
  billingCity: text("billing_city").default("").notNull(),
  billingPostalCode: text("billing_postal_code").default("").notNull(),
  billingProvince: text("billing_province").default("").notNull(),
  role: text("role").default("customer").notNull(), // customer, manager, admin
  isAdmin: boolean("is_admin").default(false).notNull(), // Mantenemos por compatibilidad
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Enum para roles de usuario
export const UserRole = {
  CUSTOMER: 'customer',
  MANAGER: 'manager',
  ADMIN: 'admin'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Configuración de la API
export const apiConfig = pgTable("api_config", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key").notNull(),
  companyId: integer("company_id").notNull(),
  channel: text("channel").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ApiConfig = typeof apiConfig.$inferSelect;
export type InsertApiConfig = typeof apiConfig.$inferInsert;

export const insertApiConfigSchema = createInsertSchema(apiConfig);

// Configuración del sitio
export const siteConfig = pgTable("site_config", {
  id: serial("id").primaryKey(),
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  maintenanceMessage: text("maintenance_message").default("Estamos realizando mejoras en nuestra plataforma.").notNull(),
  estimatedTime: text("estimated_time").default("Volveremos pronto").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export type SiteConfig = typeof siteConfig.$inferSelect;
export type InsertSiteConfig = typeof siteConfig.$inferInsert;

export const insertSiteConfigSchema = createInsertSchema(siteConfig);

// Configuración del chatbot
export const chatbotConfig = pgTable("chatbot_config", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ChatbotConfig = typeof chatbotConfig.$inferSelect;
export type InsertChatbotConfig = typeof chatbotConfig.$inferInsert;

export const insertChatbotConfigSchema = createInsertSchema(chatbotConfig);

// Vehículos
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  idLocal: integer("id_local").notNull().unique(),
  idEmpresa: integer("id_empresa").notNull(),
  descripcion: text("descripcion").notNull(),
  marca: text("marca").notNull(),
  modelo: text("modelo").notNull(),
  version: text("version").default("").notNull(),
  anyo: integer("anyo").notNull(),
  combustible: text("combustible").default("").notNull(),
  bastidor: text("bastidor").default("").notNull(),
  matricula: text("matricula").default("").notNull(),
  color: text("color").default("").notNull(),
  kilometraje: integer("kilometraje").default(0).notNull(),
  potencia: integer("potencia").default(0).notNull(),
  puertas: integer("puertas"),
  imagenes: text("imagenes").array().notNull(),
  activo: boolean("activo").default(true).notNull(),
  sincronizado: boolean("sincronizado").default(true).notNull(),
  active_parts_count: integer("active_parts_count").default(0).notNull(),
  total_parts_count: integer("total_parts_count").default(0).notNull(),
  ultimaSincronizacion: timestamp("ultima_sincronizacion").defaultNow().notNull(),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
  fechaActualizacion: timestamp("fecha_actualizacion").defaultNow().notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehicles, {
  imagenes: z.array(z.string()).optional(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

// Piezas
export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  refLocal: integer("ref_local").notNull().unique(),
  idEmpresa: integer("id_empresa").notNull(),
  idVehiculo: integer("id_vehiculo").notNull(),
  vehicleMarca: text("vehicle_marca").default("").notNull(),
  vehicleModelo: text("vehicle_modelo").default("").notNull(),
  vehicleVersion: text("vehicle_version").default("").notNull(),
  vehicleAnyo: integer("vehicle_anyo").default(0).notNull(),
  combustible: text("combustible").default("").notNull(),
  relatedVehiclesCount: integer("related_vehicles_count").default(0).notNull(),
  codFamilia: text("cod_familia").default("").notNull(),
  descripcionFamilia: text("descripcion_familia").default("").notNull(),
  codArticulo: text("cod_articulo").default("").notNull(),
  descripcionArticulo: text("descripcion_articulo").default("").notNull(),
  codVersionVehiculo: text("cod_version_vehiculo").default("").notNull(),
  refPrincipal: text("ref_principal").default("").notNull(),
  anyoInicio: integer("anyo_inicio").notNull().default(2000),
  anyoFin: integer("anyo_fin").notNull().default(2050),
  puertas: integer("puertas").default(0).notNull(),
  rvCode: text("rv_code").default("").notNull(),
  precio: text("precio").default("0").notNull(),
  anyoStock: integer("anyo_stock").default(0).notNull(),
  peso: text("peso").default("0").notNull(),
  ubicacion: integer("ubicacion").default(0).notNull(),
  observaciones: text("observaciones").default("").notNull(),
  reserva: integer("reserva").default(0).notNull(),
  tipoMaterial: integer("tipo_material").default(0).notNull(),
  situacion: text("situacion").default("almacenada").notNull(),
  imagenes: text("imagenes").array().notNull(),
  activo: boolean("activo").default(false).notNull(),
  disponibleApi: boolean("disponible_api").default(true).notNull(),
  lastApiConfirmation: timestamp("last_api_confirmation").defaultNow().notNull(),
  sincronizado: boolean("sincronizado").default(true).notNull(),
  isPendingRelation: boolean("is_pending_relation").default(false).notNull(),
  ultimaSincronizacion: timestamp("ultima_sincronizacion").defaultNow().notNull(),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
  fechaActualizacion: timestamp("fecha_actualizacion").defaultNow().notNull(),
});

// Relaciones entre entidades
export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  parts: many(parts),
}));

// Tabla de relaciones entre vehículos y piezas
export const vehicleParts = pgTable("vehicle_parts", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  partId: integer("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
  idVehiculoOriginal: integer("id_vehiculo_original").notNull(),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
});

export const insertVehiclePartSchema = createInsertSchema(vehicleParts);

export type VehiclePart = typeof vehicleParts.$inferSelect;
export type InsertVehiclePart = z.infer<typeof insertVehiclePartSchema>;

export const partsRelations = relations(parts, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [parts.idVehiculo],
    references: [vehicles.idLocal], 
  }),
  vehicleParts: many(vehicleParts)
}));

export const vehiclesRelationsWithParts = relations(vehicles, ({ many }) => ({
  vehicleParts: many(vehicleParts)
}));

export const insertPartSchema = createInsertSchema(parts, {
  imagenes: z.array(z.string()).optional(),
});

export type Part = typeof parts.$inferSelect;
export type InsertPart = z.infer<typeof insertPartSchema>;

// Historial de importaciones
export const importHistory = pgTable("import_history", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").default(0).notNull(),
  processingItem: text("processing_item").default("").notNull(),
  totalItems: integer("total_items").default(0).notNull(),
  processedItems: integer("processed_items").default(0).notNull(),
  newItems: integer("new_items").default(0).notNull(),
  updatedItems: integer("updated_items").default(0).notNull(),
  itemsDeactivated: integer("items_deactivated").default(0).notNull(),
  errors: text("errors").array().default([]).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  details: json("details").default({}).notNull(),
  options: json("options").default({}).notNull(),
  isFullImport: boolean("is_full_import").default(false).notNull(),
  canResume: boolean("can_resume").default(true).notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertImportHistorySchema = createInsertSchema(importHistory);

export type ImportHistory = typeof importHistory.$inferSelect;
export type InsertImportHistory = z.infer<typeof insertImportHistorySchema>;

// Programación de importaciones
export const importSchedule = pgTable("import_schedule", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  frequency: text("frequency").notNull(),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  active: boolean("active").default(true).notNull(),
  isFullImport: boolean("is_full_import").default(false).notNull(),
  days: text("days").array(), // Array de días de la semana
  startTime: text("start_time").default("02:00").notNull(), // Hora de inicio en formato HH:MM
  options: json("options").default({}).notNull(),
});

export const insertImportScheduleSchema = createInsertSchema(importSchedule);

export type ImportSchedule = typeof importSchedule.$inferSelect;
export type InsertImportSchedule = z.infer<typeof insertImportScheduleSchema>;

// Control de sincronización
export const syncControl = pgTable('sync_control', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'vehicles' o 'parts'
  lastSyncDate: timestamp('last_sync_date'),
  lastId: integer('last_id').default(0),
  recordsProcessed: integer('records_processed').default(0),
  active: boolean('active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Carrito de compras
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  checkedOut: boolean("checked_out").default(false).notNull(),
});

export const insertCartSchema = createInsertSchema(carts);

// Items del carrito
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull().references(() => carts.id),
  partId: integer("part_id").notNull().references(() => parts.id),
  quantity: integer("quantity").default(1).notNull(),
  price: real("price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems);

// Configuración de envío
export const shippingConfig = pgTable("shipping_config", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull().default("0"),
  freeShippingThreshold: decimal("free_shipping_threshold", { precision: 10, scale: 2 }),
  weightBasedPricing: boolean("weight_based_pricing").default(false).notNull(),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }).default("0"),
  maxWeight: decimal("max_weight", { precision: 10, scale: 2 }),
  estimatedDays: integer("estimated_days").default(1),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Configuración de pago
export const paymentConfig = pgTable("payment_config", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  config: json("config").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pedidos
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  cartId: integer("cart_id").references(() => carts.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // Legacy field - mantener por compatibilidad
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("pendiente"), // Pagado | Pendiente
  orderStatus: varchar("order_status", { length: 50 }).notNull().default("pendiente_verificar"), // Pendiente Verificar | Verificado | Embalado | Enviado | Incidencia
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  shippingMethodId: integer("shipping_method_id").references(() => shippingConfig.id),
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: varchar("shipping_city", { length: 100 }).notNull(),
  shippingProvince: varchar("shipping_province", { length: 100 }),
  shippingPostalCode: varchar("shipping_postal_code", { length: 20 }).notNull(),
  shippingCountry: varchar("shipping_country", { length: 100 }).notNull().default("España"),
  billingAddress: text("billing_address"),
  billingCity: varchar("billing_city", { length: 100 }),
  billingProvince: varchar("billing_province", { length: 100 }),
  billingPostalCode: varchar("billing_postal_code", { length: 20 }),
  billingCountry: varchar("billing_country", { length: 100 }).default("España"),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  customerNifCif: varchar("customer_nif_cif", { length: 50 }).notNull().default(""),
  paymentMethod: varchar("payment_method", { length: 100 }),
  notes: text("notes"),
  // Campos adicionales para administradores
  transportAgency: text("transport_agency").default(""),
  expeditionNumber: text("expedition_number").default(""),
  adminObservations: text("admin_observations").default(""),
  documents: text("documents").array().default([]),
  invoicePdf: text("invoice_pdf").default(""),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders);

// Pagos de pedidos
export const orderPayments = pgTable("order_payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  paymentMethod: varchar("payment_method", { length: 100 }).notNull(),
  paymentProvider: varchar("payment_provider", { length: 100 }).notNull(),
  transactionId: varchar("transaction_id", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  gatewayResponse: json("gateway_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types (removed duplicates - already defined earlier)

export type SyncControl = typeof syncControl.$inferSelect;
export const insertSyncControlSchema = createInsertSchema(syncControl);
export type InsertSyncControl = z.infer<typeof insertSyncControlSchema>;

export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

// Items de pedidos
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  partId: integer("part_id").references(() => parts.id),
  quantity: integer("quantity").default(1).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  partName: varchar("part_name", { length: 500 }).notNull(),
  partFamily: varchar("part_family", { length: 200 }),
  partReference: varchar("part_reference", { length: 255 }),
  vehicleBrand: varchar("vehicle_brand", { length: 100 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  vehicleYear: integer("vehicle_year"),
  vehicleVersion: varchar("vehicle_version", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Extended OrderItem with part references for admin views
export type OrderItemWithReferences = OrderItem & {
  refLocal?: number;
  refPrincipal?: string;
};

export type ShippingConfig = typeof shippingConfig.$inferSelect;
export type InsertShippingConfig = typeof shippingConfig.$inferInsert;

export type PaymentConfig = typeof paymentConfig.$inferSelect;
export type InsertPaymentConfig = typeof paymentConfig.$inferInsert;

// Tarifas de envío por tramos de peso
export const shippingRates = pgTable("shipping_rates", {
  id: serial("id").primaryKey(),
  shippingConfigId: integer("shipping_config_id").references(() => shippingConfig.id).notNull(),
  minWeight: decimal("min_weight", { precision: 10, scale: 2 }).notNull(),
  maxWeight: decimal("max_weight", { precision: 10, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShippingRateSchema = createInsertSchema(shippingRates);

export type ShippingRate = typeof shippingRates.$inferSelect;
export type InsertShippingRate = z.infer<typeof insertShippingRateSchema>;

// Zonas de envío - ahora genéricas para cualquier método
export const shippingZones = pgTable("shipping_zones", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShippingZoneSchema = createInsertSchema(shippingZones);

// Provincias españolas
export const provinces = pgTable("provinces", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }),
  shippingZoneId: integer("shipping_zone_id").references(() => shippingZones.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tarifas por zona para cada método de envío
export const zoneRates = pgTable("zone_rates", {
  id: serial("id").primaryKey(),
  shippingConfigId: integer("shipping_config_id").references(() => shippingConfig.id).notNull(),
  shippingZoneId: integer("shipping_zone_id").references(() => shippingZones.id).notNull(),
  minWeight: decimal("min_weight", { precision: 10, scale: 2 }).notNull().default("0"),
  maxWeight: decimal("max_weight", { precision: 10, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueMethodZoneWeight: uniqueIndex("unique_method_zone_weight").on(
    table.shippingConfigId, 
    table.shippingZoneId, 
    table.minWeight
  ),
}));

export const insertZoneRateSchema = createInsertSchema(zoneRates);

export type ShippingZone = typeof shippingZones.$inferSelect;
export type InsertShippingZone = z.infer<typeof insertShippingZoneSchema>;

export type Province = typeof provinces.$inferSelect;
export type InsertProvince = typeof provinces.$inferInsert;

export type ZoneRate = typeof zoneRates.$inferSelect;
export type InsertZoneRate = z.infer<typeof insertZoneRateSchema>;

export type OrderPayment = typeof orderPayments.$inferSelect;
export type InsertOrderPayment = typeof orderPayments.$inferInsert;

// CMS - Páginas del sitio web
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  metaDescription: text("meta_description"),
  content: text("content").notNull(),
  isPublished: boolean("is_published").default(true),
  isEditable: boolean("is_editable").default(true), // Para páginas sistema como contact, value-vehicle
  pageType: varchar("page_type", { length: 50 }).default("static").notNull(), // static, contact, value-vehicle
  formConfig: json("form_config"), // Configuración de formularios para páginas especiales
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPageSchema = createInsertSchema(pages);

export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;

// CMS - Bloques del footer
export const footerBlocks = pgTable("footer_blocks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  blockType: varchar("block_type", { length: 50 }).default("text").notNull(), // text, links, contact, social
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFooterBlockSchema = createInsertSchema(footerBlocks);

export type FooterBlock = typeof footerBlocks.$inferSelect;
export type InsertFooterBlock = z.infer<typeof insertFooterBlockSchema>;

// CMS - Configuración del sitio (ampliado)
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).default("text").notNull(), // text, email, url, number, boolean, json
  category: varchar("category", { length: 100 }).default("general").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettings);

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;

// CMS - Banners para la portada
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkText: varchar("link_text", { length: 100 }),
  position: varchar("position", { length: 50 }).default("hero").notNull(), // hero, top, middle, bottom
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  backgroundColor: varchar("background_color", { length: 7 }).default("#ffffff"),
  textColor: varchar("text_color", { length: 7 }).default("#000000"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBannerSchema = createInsertSchema(banners);

export type Banner = typeof banners.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;

// CMS - Bloques de la página de inicio
export const homepageBlocks = pgTable("homepage_blocks", {
  id: serial("id").primaryKey(),
  blockType: varchar("block_type", { length: 50 }).notNull(), // feature, why_choose_us, section_title
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  icon: varchar("icon", { length: 100 }), // SVG string o nombre del icono
  image: varchar("image", { length: 500 }), // URL de la imagen
  buttonText: varchar("button_text", { length: 100 }),
  buttonUrl: varchar("button_url", { length: 500 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHomepageBlockSchema = createInsertSchema(homepageBlocks);

export type HomepageBlock = typeof homepageBlocks.$inferSelect;
export type InsertHomepageBlock = z.infer<typeof insertHomepageBlockSchema>;

// Cache de estadísticas de API para dashboard
export const apiStatsCache = pgTable("api_stats_cache", {
  id: serial("id").primaryKey(),
  vehiclesCount: integer("vehicles_count").default(0).notNull(),
  partsCount: integer("parts_count").default(0).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApiStatsCacheSchema = createInsertSchema(apiStatsCache);

export type ApiStatsCache = typeof apiStatsCache.$inferSelect;
export type InsertApiStatsCache = z.infer<typeof insertApiStatsCacheSchema>;

// Configuración de correos electrónicos
export const emailConfig = pgTable("email_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull().default(""),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailConfigSchema = createInsertSchema(emailConfig);

export type EmailConfig = typeof emailConfig.$inferSelect;
export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;

// Logs y registro de correos enviados
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  emailType: varchar("email_type", { length: 50 }).notNull(), // contact, order, test, etc.
  transportMethod: varchar("transport_method", { length: 50 }).notNull(), // sendmail, smtp, sendgrid
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sent, failed
  errorMessage: text("error_message"),
  emailContent: text("email_content"), // HTML content
  textContent: text("text_content"), // Plain text content
  metadata: text("metadata"), // JSON string with additional data
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs);

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

// Tabla para mensajes de formularios de contacto y tasaciones
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  formType: varchar("form_type", { length: 50 }).default("contact").notNull(), // contact, valuation
  status: varchar("status", { length: 20 }).default("unread").notNull(), // unread, read, replied
  images: text("images").array().default([]).notNull(), // array de URLs de imágenes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages);

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

// Sistema de Pop-ups administrables
export const popups = pgTable("popups", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // HTML content del popup
  image: text("image"), // URL de la imagen del popup
  type: varchar("type", { length: 50 }).notNull().default("info"), // info, warning, promotion, announcement
  position: varchar("position", { length: 50 }).notNull().default("center"), // center, top, bottom, corner
  trigger: varchar("trigger", { length: 50 }).notNull().default("immediate"), // immediate, delay, scroll, exit
  triggerValue: integer("trigger_value").default(0), // delay en segundos o % scroll
  displayFrequency: varchar("display_frequency", { length: 50 }).notNull().default("always"), // always, once_per_session, once_per_user, daily
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // 1-10, mayor número = mayor prioridad
  targetPages: text("target_pages").array(), // array de rutas donde mostrar
  excludePages: text("exclude_pages").array(), // array de rutas donde NO mostrar
  buttonText: varchar("button_text", { length: 100 }).default("Cerrar"),
  buttonAction: varchar("button_action", { length: 50 }).default("close"), // close, redirect, external
  buttonUrl: text("button_url"), // URL para redirect o external
  styles: json("styles"), // CSS personalizado como JSON
  showCloseButton: boolean("show_close_button").default(true),
  backdropClose: boolean("backdrop_close").default(true), // cerrar al hacer click fuera
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPopupSchema = createInsertSchema(popups);

export type Popup = typeof popups.$inferSelect;
export type InsertPopup = z.infer<typeof insertPopupSchema>;

// Estadísticas de visualización de pop-ups
export const popupStats = pgTable("popup_stats", {
  id: serial("id").primaryKey(),
  popupId: integer("popup_id").notNull().references(() => popups.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id), // null para usuarios anónimos
  sessionId: varchar("session_id", { length: 255 }), // para tracking de usuarios anónimos
  action: varchar("action", { length: 50 }).notNull(), // viewed, closed, clicked, ignored
  page: varchar("page", { length: 255 }).notNull(), // página donde se mostró
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPopupStatsSchema = createInsertSchema(popupStats);

export type PopupStats = typeof popupStats.$inferSelect;
export type InsertPopupStats = z.infer<typeof insertPopupStatsSchema>;

// Google Reviews - Reseñas reales de Google
export const googleReviews = pgTable("google_reviews", {
  id: serial("id").primaryKey(),
  googleId: varchar("google_id", { length: 255 }).unique(), // ID único de Google si disponible
  businessName: varchar("business_name", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  rating: integer("rating").notNull(), // 1-5
  text: text("text").notNull(),
  date: varchar("date", { length: 50 }).notNull(), // Fecha como string desde Google
  avatar: varchar("avatar", { length: 10 }).notNull(), // Iniciales del autor
  source: varchar("source", { length: 50 }).default("google").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGoogleReviewSchema = createInsertSchema(googleReviews);

export type GoogleReview = typeof googleReviews.$inferSelect;
export type InsertGoogleReview = z.infer<typeof insertGoogleReviewSchema>;

// Google Reviews Configuration
export const googleReviewsConfig = pgTable("google_reviews_config", {
  id: serial("id").primaryKey(),
  businessName: varchar("business_name", { length: 255 }).default("Desguace Murcia").notNull(),
  placeId: varchar("place_id", { length: 255 }), // Google Place ID del negocio
  location: varchar("location", { length: 255 }).default("Murcia, España").notNull(),
  apiProvider: varchar("api_provider", { length: 50 }).default("google_places").notNull(), // google_places, my_business
  apiKey: varchar("api_key", { length: 500 }),
  enabled: boolean("enabled").default(false).notNull(),
  minRating: integer("min_rating").default(4).notNull(),
  maxReviews: integer("max_reviews").default(6).notNull(),
  cacheHours: integer("cache_hours").default(24).notNull(),
  lastUpdate: timestamp("last_update"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGoogleReviewsConfigSchema = createInsertSchema(googleReviewsConfig);

export type GoogleReviewsConfig = typeof googleReviewsConfig.$inferSelect;
export type InsertGoogleReviewsConfig = z.infer<typeof insertGoogleReviewsConfigSchema>;