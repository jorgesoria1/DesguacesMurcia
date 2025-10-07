import {
  users,
  vehicles,
  parts,
  vehicleParts,
  carts,
  cartItems,
  orders,
  orderItems,
  orderPayments,
  apiConfig,
  importHistory,
  importSchedule,
  siteConfig,
  shippingConfig,
  paymentConfig,
  pages,
  footerBlocks,
  siteSettings,
  homepageBlocks,
  banners,
  chatbotConfig,
  emailConfig,
  popups,
  popupStats,
  type User,
  type InsertUser,
  type Vehicle,
  type InsertVehicle,
  type Part,
  type InsertPart,
  type VehiclePart,
  type InsertVehiclePart,
  type Cart,
  type InsertCart,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderPayment,
  type InsertOrderPayment,
  type SiteConfig,
  type InsertSiteConfig,
  type ShippingConfig,
  type InsertShippingConfig,
  type PaymentConfig,
  type InsertPaymentConfig,
  type Page,
  type InsertPage,
  type FooterBlock,
  type InsertFooterBlock,
  type SiteSetting,
  type InsertSiteSetting,
  type ApiConfig,
  type InsertApiConfig,
  type ImportHistory,
  type InsertImportHistory,
  type ImportSchedule,
  type InsertImportSchedule,
  type HomepageBlock,
  type InsertHomepageBlock,
  type Banner,
  type InsertBanner,
  type ChatbotConfig,
  type InsertChatbotConfig,
  type EmailConfig,
  type InsertEmailConfig,
  type Popup,
  type InsertPopup,
  type PopupStats,
  type InsertPopupStats,
} from "../shared/schema";
import { db } from "./db";
import { eq, ilike, like, desc, and, or, asc, inArray, ne } from "drizzle-orm";
import { sql, type SQL } from "drizzle-orm";
import { cartStorage } from "./storage/cart";
import { guestCartStorage } from "./storage/guestCart";

// Interfaz de almacenamiento
export interface IStorage {
  // Usuarios
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Configuración de API
  getApiConfig(): Promise<ApiConfig | undefined>;
  updateApiConfig(config: InsertApiConfig): Promise<ApiConfig>;

  // Configuración del sitio
  getSiteConfig(): Promise<SiteConfig | undefined>;
  updateSiteConfig(config: Partial<InsertSiteConfig>): Promise<SiteConfig | undefined>;

  // Carrito y Pedidos para usuarios invitados
  getCartBySessionId(sessionId: string): Promise<Cart | undefined>;
  getCartWithItemsBySessionId(sessionId: string): Promise<{cart: Cart, items: CartItem[]} | undefined>;
  getOrdersBySessionId(sessionId: string, limit?: number): Promise<Order[]>;

  // Vehículos
  getVehicles(options?: { limit?: number; offset?: number; marca?: string; modelo?: string; anyo?: number; combustible?: string; idLocal?: number; idEmpresa?: number }): Promise<Vehicle[]>;
  getVehicleById(id: number): Promise<Vehicle | undefined>;
  getVehicleByLocalId(id: number): Promise<Vehicle | undefined>; // Método para buscar vehículo por idLocal
  getVehiclesByIdOrLocal(idToSearch: number): Promise<Vehicle | undefined>; // Nuevo método para búsqueda eficiente
  getVehiclesByQuery(query: string): Promise<Vehicle[]>;
  getVehicleCount(): Promise<number>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: number): Promise<boolean>;
  deleteAllVehicles(): Promise<number>;

  // Piezas
  getParts(options?: { limit?: number; offset?: number; vehicleId?: number; familia?: string; refLocal?: number; idEmpresa?: number; activo?: boolean; noReservadas?: boolean }): Promise<Part[]>;
  getPartById(id: number): Promise<Part | undefined>;
  getPartsByVehicleId(vehicleId: number): Promise<Part[]>;
  getPartsByQuery(query: string): Promise<Part[]>;
  getPartCount(options?: { vehicleId?: number | number[]; familia?: string; marca?: string; modelo?: string; activo?: boolean; noReservadas?: boolean }): Promise<number>;
  getPartFamilies(): Promise<{id: string, name: string, count: number}[]>;
  createPart(part: InsertPart): Promise<Part>;
  updatePart(id: number, part: Partial<InsertPart>): Promise<Part | undefined>;
  deletePart(id: number): Promise<boolean>;
  deleteAllParts(): Promise<number>;

  // Métodos adicionales para piezas y vehículos
  getPartsByVehicleLocalId(idVehiculoLocal: number): Promise<Part[]>;
  getPendingParts(): Promise<Part[]>;
  updatePartStatus(partId: number, active: boolean, isPending: boolean): Promise<Part | undefined>;

  // Payment and Shipping Configuration
  getPaymentConfig(): Promise<PaymentConfig[]>;
  getShippingConfig(): Promise<ShippingConfig[]>;

  // Historial de importaciones
  getImportHistory(limit?: number, filters?: { status?: string }): Promise<ImportHistory[]>;
  getImportHistoryById(id: number): Promise<ImportHistory | undefined>;
  createImportHistory(history: InsertImportHistory): Promise<ImportHistory>;
  updateImportHistory(id: number, history: Partial<ImportHistory>): Promise<ImportHistory | undefined>;
  deleteImportHistory(id: number): Promise<boolean>;

  // Programación de importaciones
  getImportSchedules(): Promise<ImportSchedule[]>;
  getImportScheduleByType(type: string): Promise<ImportSchedule | undefined>;
  createImportSchedule(schedule: InsertImportSchedule): Promise<ImportSchedule>;
  updateImportSchedule(id: number, schedule: Partial<InsertImportSchedule>): Promise<ImportSchedule | undefined>;
  deleteImportSchedule(id: number): Promise<boolean>;

  // E-Commerce: Carrito
  getCart(userId: number): Promise<Cart | undefined>;
  getCartWithItems(userId: number): Promise<{cart: Cart, items: CartItem[]} | undefined>;
  createCart(cart: InsertCart): Promise<Cart>;
  updateCart(id: number, cart: Partial<Cart>): Promise<Cart | undefined>;

  // E-Commerce: Items del carrito
  getCartItems(cartId: number): Promise<CartItem[]>;
  getCartItemById(id: number): Promise<CartItem | undefined>;
  addItemToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, item: Partial<CartItem>): Promise<CartItem | undefined>;
  removeCartItem(id: number): Promise<boolean>;
  clearCart(cartId: number): Promise<boolean>;

  // E-Commerce: Pedidos
  getOrders(userId?: number, limit?: number, includeDeleted?: boolean): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
    createOrderItem(orderItem: {
    orderId: number;
    partId: number;
    quantity: number;
    price: number;
    partName: string;
    partFamily: string;
  }): Promise<void>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined>;
  updateOrderPaymentStatus(orderId: number, paymentStatus: string): Promise<boolean>;
  updateOrderStatus(orderId: number, orderStatus: string): Promise<boolean>;
  softDeleteOrder(id: number, userId: number): Promise<boolean>;
  restoreOrder(id: number): Promise<boolean>;
  getDeletedOrders(userId?: number, limit?: number): Promise<Order[]>;
  hardDeleteOrder(id: number): Promise<boolean>;

  // Stripe
  updateUserStripeInfo(userId: number, stripeInfo: {stripeCustomerId: string, stripeSubscriptionId?: string}): Promise<User | undefined>;

  // Métodos de pago
  getPaymentMethods(): Promise<PaymentConfig[]>;
  getPaymentMethodById(id: number): Promise<PaymentConfig | undefined>;
  getPaymentMethodByProvider(provider: string): Promise<PaymentConfig | undefined>;
  createPaymentMethod(method: InsertPaymentConfig): Promise<PaymentConfig>;
  updatePaymentMethod(id: number, method: Partial<PaymentConfig>): Promise<PaymentConfig | undefined>;
  deletePaymentMethod(id: number): Promise<boolean>;

  // Configuración del sitio mejorada
  getSiteConfig(key: string): Promise<{ value: string } | undefined>;
  setSiteConfig(key: string, value: string, description?: string): Promise<void>;

  // CMS - Páginas
  getPages(): Promise<Page[]>;
  getPageBySlug(slug: string): Promise<Page | undefined>;
  getPageById(id: number): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: number, page: Partial<InsertPage>): Promise<Page | undefined>;
  deletePage(id: number): Promise<boolean>;

  // CMS - Footer Blocks
  getFooterBlocks(): Promise<FooterBlock[]>;
  getFooterBlockById(id: number): Promise<FooterBlock | undefined>;
  createFooterBlock(block: InsertFooterBlock): Promise<FooterBlock>;
  updateFooterBlock(id: number, block: Partial<InsertFooterBlock>): Promise<FooterBlock | undefined>;
  deleteFooterBlock(id: number): Promise<boolean>;

  // CMS - Site Settings
  getSiteSettings(): Promise<SiteSetting[]>;
  getSiteSettingByKey(key: string): Promise<SiteSetting | undefined>;
  setSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting>;
  updateSiteSetting(key: string, value: string): Promise<SiteSetting | undefined>;

  // Sistema de Pop-ups
  getPopups(options?: { isActive?: boolean; page?: string }): Promise<Popup[]>;
  getPopupById(id: number): Promise<Popup | undefined>;
  createPopup(popup: InsertPopup): Promise<Popup>;
  updatePopup(id: number, popup: Partial<InsertPopup>): Promise<Popup | undefined>;
  deletePopup(id: number): Promise<boolean>;
  
  // Estadísticas de Pop-ups
  createPopupStat(stat: InsertPopupStats): Promise<PopupStats>;
  getPopupStats(popupId?: number): Promise<PopupStats[]>;

  // Métodos obsoletos (mantener firma para compatibilidad)
  getVehicleParts(): Promise<any[]>;
  createVehiclePart(): Promise<any>;
  deleteVehiclePart(): Promise<boolean>;
  deleteVehiclePartsByVehicleId(): Promise<number>;
  deleteVehiclePartsByPartId(): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private vehicles: Map<number, Vehicle>;
  private parts: Map<number, Part>;
  private apiConfigs: Map<number, ApiConfig>;
  private importHistories: Map<number, ImportHistory>;
  private importSchedules: Map<number, ImportSchedule>;
  private carts: Map<number, Cart>;
  private cartItems: Map<number, CartItem>;
  private orders: Map<number, Order>;
  private sessionCartMap: Map<string, number>; // Mapeo de sessionId -> cartId

  private userIdCounter: number;
  private vehicleIdCounter: number;
  private partIdCounter: number;
  private apiConfigIdCounter: number;
  private importHistoryIdCounter: number;
  private importScheduleIdCounter: number;
  private cartIdCounter: number;
  private cartItemIdCounter: number;
  private orderIdCounter: number;

  constructor() {
    this.users = new Map();
    this.vehicles = new Map();
    this.parts = new Map();
    this.apiConfigs = new Map();
    this.importHistories = new Map();
    this.importSchedules = new Map();
    this.carts = new Map();
    this.cartItems = new Map();
    this.orders = new Map();
    this.sessionCartMap = new Map();

    this.userIdCounter = 1;
    this.vehicleIdCounter = 1;
    this.partIdCounter = 1;
    this.apiConfigIdCounter = 1;
    this.importHistoryIdCounter = 1;
    this.importScheduleIdCounter = 1;
    this.cartIdCounter = 1;
    this.cartItemIdCounter = 1;
    this.orderIdCounter = 1;

    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // NOTA: MemStorage es solo para desarrollo/testing
    // En producción se usa DatabaseStorage con credenciales desde variables de entorno
    
    // No inicializar datos hardcodeados por seguridad
    // Los datos de prueba deben cargarse desde variables de entorno si son necesarios

    // Crear programación por defecto
    const defaultSchedule: InsertImportSchedule = {
      type: 'vehicles',
      frequency: 'daily',
      isFullImport: false,
      options: { forceFull: false }
    };
    this.createImportSchedule(defaultSchedule);

    this.createImportSchedule({
      type: 'parts',
      frequency: 'daily',
      isFullImport: false,
      options: { forceFull: false }
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }

    const updatedUser = {
      ...existingUser,
      ...userUpdate,
      id // Asegurar que el ID no cambie
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(userId: number, stripeInfo: {stripeCustomerId: string, stripeSubscriptionId?: string}): Promise<User | undefined> {
    return this.updateUser(userId, stripeInfo);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;

    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || '',
      firstName: insertUser.firstName || '',
      lastName: insertUser.lastName || '',
      address: insertUser.address || '',
      city: insertUser.city || '',
      postalCode: insertUser.postalCode || '',
      phone: insertUser.phone || '',
      province: insertUser.province || '',
      role: insertUser.role || 'customer',
      isAdmin: insertUser.isAdmin || false,
      stripeCustomerId: insertUser.stripeCustomerId || null,
      stripeSubscriptionId: insertUser.stripeSubscriptionId || null,
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    };

    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getApiConfig(): Promise<ApiConfig | undefined> {
    // Devolver la primera configuración activa
    for (const config of this.apiConfigs.values()) {
      if (config.active) {
        return config;
      }
    }
    return undefined;
  }

  async updateApiConfig(config: InsertApiConfig): Promise<ApiConfig> {
    // Desactivar todas las configuraciones existentes si la nueva es activa
    if (config.active) {
      for (const [id, existingConfig] of this.apiConfigs.entries()) {
        if (existingConfig.active) {
          this.apiConfigs.set(id, { ...existingConfig, active: false });
        }
      }
    }

    // Crear una nueva configuración o actualizar la existente
    const id = this.apiConfigIdCounter++;

    const apiConfig: ApiConfig = { 
      id,
      apiKey: config.apiKey,
      companyId: config.companyId,
      channel: config.channel,
      active: config.active !== undefined ? config.active : true,
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    };

    this.apiConfigs.set(id, apiConfig);
    return apiConfig;
  }

  async getVehicles(options: { limit?: number; offset?: number; marca?: string; modelo?: string; anyo?: number; combustible?: string; idLocal?: number; idEmpresa?: number } = {}): Promise<Vehicle[]> {
    let vehicles = Array.from(this.vehicles.values());

    // Aplicar filtros
    if (options.marca) {
      vehicles = vehicles.filter(v => v.marca.toLowerCase().includes(options.marca!.toLowerCase()));
    }
    if (options.modelo) {
      vehicles = vehicles.filter(v => v.modelo.toLowerCase().includes(options.modelo!.toLowerCase()));
    }
    if (options.anyo) {
      vehicles = vehicles.filter(v => v.anyo === options.anyo);
    }
    if (options.idLocal) {
      vehicles = vehicles.filter(v => v.idLocal === options.idLocal);
    }
    if (options.combustible) {
      vehicles = vehicles.filter(v => v.combustible.toLowerCase().includes(options.combustible!.toLowerCase()));
    }
    if (options.idLocal !== undefined) {
      vehicles = vehicles.filter(v => v.idLocal === options.idLocal);
    }
    if (options.idEmpresa !== undefined) {
      vehicles = vehicles.filter(v => v.idEmpresa === options.idEmpresa);
    }

    // Aplicar paginación
    const offset = options.offset || 0;
    const limit = options.limit || vehicles.length;

    return vehicles.slice(offset, offset + limit);
  }

  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getVehicleByLocalId(idLocal: number): Promise<Vehicle | undefined> {
    if (!idLocal) return undefined;

    for (const vehicle of this.vehicles.values()) {
      if (vehicle.idLocal === idLocal) {
        return vehicle;
      }
    }
    return undefined;
  }

  // Método optimizado para obtener múltiples vehículos por sus IDs locales en una sola operación
  async getVehiclesByLocalIds(localIds: number[]): Promise<Vehicle[]> {
    if (!localIds || !localIds.length) return [];

    const localIdsSet = new Set(localIds);
    const result: Vehicle[] = [];

    for (const vehicle of this.vehicles.values()) {
      if (localIdsSet.has(vehicle.idLocal)) {
        result.push(vehicle);
      }
    }

    return result;
  }

  async getVehiclesByIdOrLocal(idToSearch: number): Promise<Vehicle | undefined> {
    // Primero buscar por ID interno
    const vehicleById = this.vehicles.get(idToSearch);
    if (vehicleById) {
      return vehicleById;
    }

    // Si no se encuentra, buscar por idLocal
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.idLocal === idToSearch) {
        return vehicle;
      }
    }

    return undefined;
  }

  async getVehiclesByQuery(query: string): Promise<Vehicle[]> {
    const searchQuery = query.toLowerCase();
    const vehicles = Array.from(this.vehicles.values());

    return vehicles.filter(v => 
      v.marca.toLowerCase().includes(searchQuery) ||
      v.modelo.toLowerCase().includes(searchQuery) ||
      v.bastidor.toLowerCase().includes(searchQuery) ||
      v.matricula.toLowerCase().includes(searchQuery) ||
      v.descripcion.toLowerCase().includes(searchQuery)
    ).slice(0, 20); // Limitar a 20 resultados
  }

  async getVehicleCount(): Promise<number> {
    return this.vehicles.size;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const id = this.vehicleIdCounter++;

    const newVehicle: Vehicle = { 
      id,
      idLocal: vehicle.idLocal,
      idEmpresa: vehicle.idEmpresa,
      descripcion: vehicle.descripcion,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      version: vehicle.version,
      anyo: vehicle.anyo,
      combustible: vehicle.combustible || '',
      bastidor: vehicle.bastidor || '',
      matricula: vehicle.matricula || '',
      color: vehicle.color || '',
      kilometraje: vehicle.kilometraje || 0,
      potencia: vehicle.potencia || 0,
      puertas: vehicle.puertas || null,
      imagenes: vehicle.imagenes,
      activo: vehicle.activo !== undefined ? vehicle.activo : true,
      sincronizado: vehicle.sincronizado || false,
      ultimaSincronizacion: vehicle.ultimaSincronizacion || sql`NOW()`,
      fechaCreacion: sql`NOW()`,
      
    };

    this.vehicles.set(id, newVehicle);
    return newVehicle;
  }

  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const existingVehicle = this.vehicles.get(id);

    if (!existingVehicle) {
      return undefined;
    }

    const updatedVehicle: Vehicle = { 
      ...existingVehicle,
      ...vehicle,
      id, // Asegurar que el ID no cambie
      
    };

    this.vehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }

  async deleteVehicle(id: number): Promise<boolean> {
    return this.vehicles.delete(id);
  }

  async deleteAllVehicles(): Promise<number> {
    const count = this.vehicles.size;
    this.vehicles.clear();
    return count;
  }

  async getParts(options: { limit?: number; offset?: number; vehicleId?: number | number[]; familia?: string; refLocal?: number; idEmpresa?: number; activo?: boolean; noReservadas?: boolean } = {}): Promise<Part[]> {
    let allParts = Array.from(this.parts.values());

    // Aplicar filtros
    if (options.vehicleId !== undefined) {
      if (Array.isArray(options.vehicleId)) {
        // Si es un array de IDs, filtramos por cualquiera de esos vehículos
        if (options.vehicleId.length > 0) {
          console.log(`Filtrando piezas por ${options.vehicleId.length} vehículos`);

          // Buscar piezas para cada vehículo y luego combinar resultados
          const allPartIds = new Set<number>();

          for (const vehicleId of options.vehicleId) {
            const partsForVehicle = await this.getPartsByVehicleId(vehicleId);
            partsForVehicle.forEach(p => allPartIds.add(p.id));
          }

          // Filtrar piezas que están en el conjunto de IDs
          allParts = allParts.filter(p => allPartIds.has(p.id));
        }
      } else {
        // Comportamiento original para un solo ID
        const partsForVehicle = await this.getPartsByVehicleId(options.vehicleId);
        const partIds = new Set(partsForVehicle.map(p => p.id));
        allParts = allParts.filter(p => partIds.has(p.id));
      }
    }

    if (options.familia) {
      allParts = allParts.filter(p => p.descripcionFamilia.toLowerCase().includes(options.familia!.toLowerCase()));
    }

    if (options.refLocal !== undefined) {
      allParts = allParts.filter(p => p.refLocal === options.refLocal);
    }

    if (options.idEmpresa !== undefined) {
      allParts = allParts.filter(p => p.idEmpresa === options.idEmpresa);
    }

    if (options.activo !== undefined) {
      allParts = allParts.filter(p => p.activo === options.activo);
    }

    // No mostrar piezas reservadas (reserva = 1) si así se especifica
    if (options.noReservadas) {
      allParts = allParts.filter(p => p.reserva !== 1);
    }

    // Aplicar paginación
    const offset = options.offset || 0;
    const limit = options.limit || allParts.length;

    return allParts.slice(offset, offset + limit);
  }

  async getPartById(id: number): Promise<Part | undefined> {
    return this.parts.get(id);
  }

  async getPartsByVehicleId(vehicleId: number): Promise<Part[]> {
    const vehicle = await this.getVehicleById(vehicleId);

    if (!vehicle) {
      return [];
    }

    // Para memoria, buscamos piezas que tengan idVehiculo = vehicle.idLocal
    return Array.from(this.parts.values()).filter(p => p.idVehiculo === vehicle.idLocal);
  }

  async getPartsByVehicleLocalId(idVehiculoLocal: number): Promise<Part[]> {
    return Array.from(this.parts.values()).filter(p => p.idVehiculo === idVehiculoLocal);
  }

  async getPendingParts(): Promise<Part[]> {
    return Array.from(this.parts.values()).filter(p => p.isPendingRelation === true);
  }

  async updatePartStatus(partId: number, active: boolean, isPending: boolean): Promise<Part | undefined> {
    const part = this.parts.get(partId);

    if (!part) {
      return undefined;
    }

    const updatedPart = { 
      ...part, 
      activo: active,
      isPendingRelation: isPending,
      
    };

    this.parts.set(partId, updatedPart);
    return updatedPart;
  }

  async getPartsByQuery(query: string): Promise<Part[]> {
    const searchQuery = query.toLowerCase();
    const parts = Array.from(this.parts.values());

    return parts.filter(p => 
      p.descripcionArticulo.toLowerCase().includes(searchQuery) ||
      p.descripcionFamilia.toLowerCase().includes(searchQuery) ||
      p.refPrincipal.toLowerCase().includes(searchQuery) ||
      p.codArticulo.toLowerCase().includes(searchQuery)
    ).slice(0, 20); // Limitar a 20 resultados
  }

  async getPartCount(options: { vehicleId?: number | number[]; familia?: string; activo?: boolean } = {}): Promise<number> {
    let allParts = Array.from(this.parts.values());

    // Aplicar filtros
    if (options.vehicleId !== undefined) {
      if (Array.isArray(options.vehicleId)) {
        // Si es un array de IDs, filtramos por cualquiera de esos vehículos
        if (options.vehicleId.length > 0) {
          // Buscar piezas para cada vehículo y luego combinar resultados
          const allPartIds = new Set<number>();

          for (const vehicleId of options.vehicleId) {
            const partsForVehicle = await this.getPartsByVehicleId(vehicleId);
            partsForVehicle.forEach(p => allPartIds.add(p.id));
          }

          // Filtrar piezas que están en el conjunto de IDs
          allParts = allParts.filter(p => allPartIds.has(p.id));
        }
      } else {
        // Comportamiento original para un solo ID
        const partsForVehicle = await this.getPartsByVehicleId(options.vehicleId);
        const partIds = new Set(partsForVehicle.map(p => p.id));
        allParts = allParts.filter(p => partIds.has(p.id));
      }
    }

    if (options.familia) {
      allParts = allParts.filter(p => p.descripcionFamilia.toLowerCase().includes(options.familia!.toLowerCase()));
    }

    if (options.activo !== undefined) {
      allParts = allParts.filter(p => p.activo === options.activo);
    }

    return allParts.length;
  }

  async createPart(part: InsertPart): Promise<Part> {
    const id = this.partIdCounter++;

    const newPart: Part = { 
      id,
      refLocal: part.refLocal,
      idEmpresa: part.idEmpresa,
      codFamilia: part.codFamilia || '',
      descripcionFamilia: part.descripcionFamilia || '',
      codArticulo: part.codArticulo || '',
      descripcionArticulo: part.descripcionArticulo || '',
      codVersion: part.codVersion || '',
      refPrincipal: part.refPrincipal || '',
      anyoInicio: part.anyoInicio || null,
      anyoFin: part.anyoFin || null,
      puertas: part.puertas || 0,
      rvCode: part.rvCode || '',
      precio: typeof part.precio === 'number' ? String(part.precio) : (part.precio || '0'),
      anyoStock: part.anyoStock || 0,
      peso: typeof part.peso === 'number' ? String(part.peso) : (part.peso || '0'),
      ubicacion: part.ubicacion || 0,
      observaciones: part.observaciones || '',
      reserva: part.reserva || 0,
      tipoMaterial: part.tipoMaterial || 0,
      idVehiculo: part.idVehiculo || 0,
      imagenes: part.imagenes || [],
      activo: part.activo !== undefined ? part.activo : true,
      sincronizado: part.sincronizado || false,
      ultimaSincronizacion: part.ultimaSincronizacion || sql`NOW()`,
      fechaCreacion: sql`NOW()`,
      
      isPendingRelation: part.isPendingRelation || false
    };

    this.parts.set(id, newPart);
    return newPart;
  }

  async updatePart(id: number, part: Partial<InsertPart>): Promise<Part | undefined> {
    const existingPart = this.parts.get(id);

    if (!existingPart) {
      return undefined;
    }

    const updatedPart: Part = { 
      ...existingPart,
      ...part,
      id, // Asegurar que el ID no cambie
      
    };

    this.parts.set(id, updatedPart);
    return updatedPart;
  }

  async deletePart(id: number): Promise<boolean> {
    return this.parts.delete(id);
  }

  async deleteAllParts(): Promise<number> {
    const count = this.parts.size;
    this.parts.clear();
    return count;
  }

  async getImportHistory(limit: number = 10, filters?: { status?: string }): Promise<ImportHistory[]> {
    let history = Array.from(this.importHistories.values());

    // Aplicar filtros
    if (filters?.status) {
      history = history.filter(h => h.status === filters.status);
    }

    // Ordenar por fecha de inicio descendente
    history.sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));

    // Aplicar límite
    return history.slice(0, limit);
  }

  async getImportHistoryById(id: number): Promise<ImportHistory | undefined> {
    return this.importHistories.get(id);
  }

  async createImportHistory(history: InsertImportHistory): Promise<ImportHistory> {
    const id = this.importHistoryIdCounter++;

    const newHistory: ImportHistory = { 
      id,
      type: history.type,
      status: history.status,
      progress: history.progress || 0,
      processingItem: history.processingItem || '',
      startTime: history.startTime || sql`NOW()`,
      endTime: history.endTime || null,
      totalItems: history.totalItems || 0,
      processedItems: history.processedItems || 0,
      newItems: history.newItems || 0,
      updatedItems: history.updatedItems || 0,
      errors: history.errors || [],
      errorCount: history.errorCount || 0,
      details: history.details || {},
      options: history.options || {},
      lastUpdated: sql`NOW()`
    };

    this.importHistories.set(id, newHistory);
    return newHistory;
  }

  async updateImportHistory(id: number, history: Partial<ImportHistory>): Promise<ImportHistory | undefined> {
    const existingHistory = this.importHistories.get(id);

    if (!existingHistory) {
      return undefined;
    }

    const updatedHistory: ImportHistory = { 
      ...existingHistory,
      ...history,
      id, // Asegurar que el ID no cambie
      lastUpdated: sql`NOW()`
    };

    this.importHistories.set(id, updatedHistory);
    return updatedHistory;
  }

  async deleteImportHistory(id: number): Promise<boolean> {
    return this.importHistories.delete(id);
  }

  async getImportSchedules(): Promise<ImportSchedule[]> {
    return Array.from(this.importSchedules.values());
  }

  async getImportScheduleByType(type: string): Promise<ImportSchedule | undefined> {
    for (const schedule of this.importSchedules.values()) {
      if (schedule.type === type) {
        return schedule;
      }
    }
    return undefined;
  }

  async createImportSchedule(schedule: InsertImportSchedule): Promise<ImportSchedule> {
    const id = this.importScheduleIdCounter++;

    const newSchedule: ImportSchedule = {
      id,
      type: schedule.type,
      frequency: schedule.frequency,
      nextRun: schedule.nextRun || this.calculateNextRun(sql`NOW()`, schedule.frequency),
      active: schedule.active !== undefined ? schedule.active : true,
      lastRun: schedule.lastRun || null,
      options: schedule.options || {},
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    };

    this.importSchedules.set(id, newSchedule);
    return newSchedule;
  }

  async updateImportSchedule(id: number, schedule: Partial<ImportSchedule>): Promise<ImportSchedule | undefined> {
    const existingSchedule = this.importSchedules.get(id);

    if (!existingSchedule) {
      return undefined;
    }

    const updatedSchedule: ImportSchedule = {
      ...existingSchedule,
      ...schedule,
      id, // Asegurar que el ID no cambie
      updatedAt: sql`NOW()`
    };

    this.importSchedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  private calculateNextRun(from: Date, frequency: string, hoursOffset = 0): Date {
    const nextRun = new Date(from);

    // Añadir offset en horas si se especifica
    if (hoursOffset > 0) {
      nextRun.setHours(nextRun.getHours() + hoursOffset);
    }

    // Calcular próxima ejecución según frecuencia
    switch (frequency) {
      case 'hourly':
        nextRun.setHours(nextRun.getHours() + 1);
        break;
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        // Reset to specific hour (e.g., 3 AM)
        nextRun.setHours(3, 0, 0, 0);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        // Reset to specific hour on Monday
        nextRun.setHours(3, 0, 0, 0);
        const day = nextRun.getDay();
        nextRun.setDate(nextRun.getDate() + (1 - day)); // 1 = Monday
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        // Reset to 1st day of month at specific hour
        nextRun.setDate(1);
        nextRun.setHours(3, 0, 0, 0);
        break;
      default:
        // Para frecuencias no reconocidas, usar diaria
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(3, 0, 0, 0);
    }

    return nextRun;
  }

  // Métodos de carrito delegados a cartStorage
  async getCart(userId: number): Promise<Cart | undefined> {
    return cartStorage.getCart(userId);
  }

  async getCartWithItems(userId: number): Promise<{cart: Cart, items: CartItem[]} | undefined> {
    return cartStorage.getCartWithItems(userId);
  }

  async createCart(cart: InsertCart): Promise<Cart> {
    return cartStorage.createCart(cart);
  }

  async updateCart(id: number, cart: Partial<Cart>): Promise<Cart | undefined> {
    return cartStorage.updateCart(id, cart);
  }

  async getCartItems(cartId: number): Promise<CartItem[]> {
    return cartStorage.getCartItems(cartId);
  }

  async getCartItemById(id: number): Promise<CartItem | undefined> {
    return cartStorage.getCartItemById(id);
  }

  async addItemToCart(item: InsertCartItem): Promise<CartItem> {
    return cartStorage.addItemToCart(item);
  }

  async updateCartItem(id: number, item: Partial<CartItem>): Promise<CartItem | undefined> {
    return cartStorage.updateCartItem(id, item);
  }

  async removeCartItem(id: number): Promise<boolean> {
    return cartStorage.removeCartItem(id);
  }

  async clearCart(cartId: number): Promise<boolean> {
    return cartStorage.clearCart(cartId);
  }

  async getOrders(userId?: number, limit?: number): Promise<Order[]> {
    let orders = Array.from(this.orders.values());

    if (userId !== undefined) {
      orders = orders.filter(o => o.userId === userId);
    }

    // Ordenar por fecha descendente
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit) {
      orders = orders.slice(0, limit);
    }

    return orders;
  }

  // Implementación para el soporte de órdenes de usuarios invitados
  async getOrdersBySessionId(sessionId: string, limit?: number): Promise<Order[]> {
    let orders = Array.from(this.orders.values());

    // Filtrar por sessionId
    orders = orders.filter(o => o.sessionId === sessionId);

    // Ordenar por fecha descendente
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit) {
      orders = orders.slice(0, limit);
    }

    return orders;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

async createOrderItem(orderItem: {
        orderId: number;
        partId: number;
        quantity: number;
        price: number;
        partName: string;
        partFamily: string;
    }): Promise<void> {
        // Implementación para MemStorage
        const existingOrder = this.orders.get(orderItem.orderId);
        if (existingOrder) {
            let orderDetails = existingOrder.items ? existingOrder.items : [];

            orderDetails.push({
                partId: orderItem.partId,
                quantity: orderItem.quantity,
                price: orderItem.price,
                partName: orderItem.partName,
                partFamily: orderItem.partFamily
            });

            const updatedOrder: Order = {
                ...existingOrder,
                items: orderDetails,
                updatedAt: sql`NOW()`
            };

            this.orders.set(orderItem.orderId, updatedOrder);
        }
    }
  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;

    const newOrder: Order = {
      id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items || [],
      shippingAddress: order.shippingAddress || {},
      paymentDetails: order.paymentDetails || {},
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    };

    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);

    if (!existingOrder) {
      return undefined;
    }

    const updatedOrder: Order = {
      ...existingOrder,
      ...order,
      id, // Asegurar que el ID no cambie
      updatedAt: sql`NOW()`
    };

    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async updateOrderPaymentStatus(orderId: number, paymentStatus: string): Promise<boolean> {
    const existingOrder = this.orders.get(orderId);
    if (!existingOrder) {
      return false;
    }

    const updatedOrder = { ...existingOrder, paymentStatus: paymentStatus as any };
    this.orders.set(orderId, updatedOrder);
    return true;
  }

  async updateOrderStatus(orderId: number, orderStatus: string): Promise<boolean> {
    const existingOrder = this.orders.get(orderId);
    if (!existingOrder) {
      return false;
    }

    const updatedOrder = { ...existingOrder, orderStatus: orderStatus as any };
    this.orders.set(orderId, updatedOrder);
    return true;
  }

  // Métodos obsoletos (mantener firma para compatibilidad)
  async getVehicleParts(): Promise<any[]> {
    console.warn('getVehicleParts está obsoleto, use getPartsByVehicleId o getPartsByVehicleLocalId');
    return [];
  }

  async createVehiclePart(): Promise<any> {
    console.warn('createVehiclePart está obsoleto, use createPart con idVehiculo');
    throw new Error('Método obsoleto');
  }

  async deleteVehiclePart(): Promise<boolean> {
    console.warn('deleteVehiclePart está obsoleto');
    return false;
  }

  async deleteVehiclePartsByVehicleId(): Promise<number> {
    console.warn('deleteVehiclePartsByVehicleId está obsoleto');
    return 0;
  }

  async deleteVehiclePartsByPartId(): Promise<number> {
    console.warn('deleteVehiclePartsByPartId está obsoleto');
    return 0;
  }

  // Implementación para mantener compatibilidad con la interfaz
  async getPartFamilies(): Promise<{id: string, name: string, count: number}[]> {
    return [
      { id: "motor", name: "Motor", count: 10 },
      { id: "transmision", name: "Transmisión", count: 5 },
      { id: "carroceria", name: "Carrocería", count: 8 },
      { id: "suspension", name: "Suspensión", count: 6 },
      { id: "electrico", name: "Eléctrico", count: 7 }
    ];
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getVehicleByLocalId(idLocal: number): Promise<Vehicle | undefined> {
    if (!idLocal) return undefined;

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.idLocal, idLocal));

    return vehicle || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserStripeInfo(userId: number, stripeInfo: {stripeCustomerId: string, stripeSubscriptionId?: string}): Promise<User | undefined> {
    return this.updateUser(userId, stripeInfo);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      return false;
    }
  }

  async getApiConfig(): Promise<ApiConfig | undefined> {
    const [config] = await db
      .select()
      .from(apiConfig)
      .where(eq(apiConfig.active, true))
      .limit(1);
    return config || undefined;
  }

  async getSiteConfig(): Promise<SiteConfig | undefined> {
    try {
      const [config] = await db
        .select()
        .from(siteConfig)
        .limit(1);
      return config || undefined;
    } catch (error) {
      console.error("Error en getSiteConfig:", error);
      return undefined;
    }
  }

  async updateSiteConfig(config: Partial<InsertSiteConfig>): Promise<SiteConfig | undefined> {
    try {
      // Buscar si existe alguna configuración
      const existingConfig = await this.getSiteConfig();

      if (existingConfig) {
        // Actualizar la configuración existente
        const [updatedConfig] = await db
          .update(siteConfig)
          .set({
            ...config,
            lastUpdated: sql`NOW()`
          })
          .where(eq(siteConfig.id, existingConfig.id))
          .returning();

        return updatedConfig;
      } else {
        // Crear nueva configuración
        const [newConfig] = await db
          .insert(siteConfig)
          .values({
            maintenanceMode: config.maintenanceMode ?? false,
            maintenanceMessage: config.maintenanceMessage ?? "Estamos realizando mejoras en nuestra plataforma.",
            estimatedTime: config.estimatedTime ?? "Volveremos pronto",
            lastUpdated: sql`NOW()`
          })
          .returning();

        return newConfig;
      }
    } catch (error) {
      console.error("Error en updateSiteConfig:", error);
      return undefined;
    }
  }

  async updateApiConfig(config: InsertApiConfig): Promise<ApiConfig> {
    // Si la configuración es activa, desactivar todas las demás primero
    if (config.active) {
      await db
        .update(apiConfig)
        .set({ active: false })
        .where(eq(apiConfig.active, true));
    }

    // Buscar si hay una configuración existente
    const [existingConfig] = await db
      .select()
      .from(apiConfig)
      .limit(1);

    if (existingConfig) {
      // Actualizar la configuración existente
      const [updated] = await db
        .update(apiConfig)
        .set({
          ...config,
          updatedAt: sql`NOW()`
        })
        .where(eq(apiConfig.id, existingConfig.id))
        .returning();
      return updated;
    } else {
      // Crear una nueva configuración
      const [created] = await db
        .insert(apiConfig)
        .values({
          ...config,
          createdAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        })
        .returning();
      return created;
    }
  }

  async getVehicles(options: { 
    limit?: number; 
    offset?: number; 
    marca?: string; 
    modelo?: string; 
    anyo?: number; 
    combustible?: string; 
    idLocal?: number;
    idEmpresa?: number;
  } = {}): Promise<Vehicle[]> {
    let query = db.select().from(vehicles);

    // Aplicar filtros
    if (options.marca) {
      query = query.where(ilike(vehicles.marca, `%${options.marca}%`));
    }

    if (options.modelo) {
      query = query.where(ilike(vehicles.modelo, `%${options.modelo}%`));
    }

    if (options.anyo) {
      query = query.where(eq(vehicles.anyo, options.anyo));
    }

    if (options.combustible) {
      query = query.where(ilike(vehicles.combustible, `%${options.combustible}%`));
    }

    if (options.idLocal !== undefined) {
      query = query.where(eq(vehicles.idLocal, options.idLocal));
    }

    if (options.idEmpresa !== undefined) {
      query = query.where(eq(vehicles.idEmpresa, options.idEmpresa));
    }

    // Aplicar paginación
    if (options.offset) {
      query = query.offset(options.offset);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Ordenar resultados
    query = query.orderBy(desc(vehicles.id));

    return await query;
  }

  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id));

    return vehicle || undefined;
  }

  async getVehicleByIdLocal(idLocal: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.idLocal, idLocal));

    return vehicle || undefined;
  }

  async getVehiclesByIdOrLocal(idToSearch: number): Promise<Vehicle | undefined> {
    // Buscar primero por ID
    const [vehicleById] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, idToSearch));

    if (vehicleById) {
      return vehicleById;
    }

    // Si no se encuentra, buscar por idLocal
    const [vehicleByIdLocal] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.idLocal, idToSearch));

    return vehicleByIdLocal || undefined;
  }

  async getVehiclesByQuery(query: string): Promise<Vehicle[]> {
    const searchQuery = `%${query}%`;
    return await db.select()
      .from(vehicles)
      .where(
        or(
          ilike(vehicles.marca, searchQuery),
          ilike(vehicles.modelo, searchQuery),
          ilike(vehicles.bastidor, searchQuery),
          ilike(vehicles.matricula, searchQuery),
          ilike(vehicles.descripcion, searchQuery)
        )
      )
      .limit(20);
  }

  async getVehicleCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vehicles);
    return result?.count || 0;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    // Asegurar que todos los campos requeridos estén presentes
    const vehicleToInsert = {
      ...vehicle,
      combustible: vehicle.combustible ?? "",
      bastidor: vehicle.bastidor ?? "",
      matricula: vehicle.matricula ?? "",
      color: vehicle.color ?? "",
      kilometraje: vehicle.kilometraje ?? 0,
      potencia: vehicle.potencia ?? 0
    };
    const [newVehicle] = await db.insert(vehicles).values(vehicleToInsert).returning();
    return newVehicle;
  }

  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    // Remove auto-generated fields that should not be updated manually
    const { fechaCreacion, fechaActualizacion, ultimaSincronizacion, ...updateData } = vehicle as any;
    
    const [updatedVehicle] = await db
      .update(vehicles)
      .set({
        ...updateData,
        fechaActualizacion: sql`NOW()`, // Update the timestamp
      })
      .where(eq(vehicles.id, id))
      .returning();
    return updatedVehicle;
  }

  async deleteVehicle(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(vehicles)
      .where(eq(vehicles.id, id))
      .returning({ id: vehicles.id });

    return !!deleted;
  }

  async deleteAllVehicles(): Promise<number> {
    const result = await db.delete(vehicles);
    return result.rowCount || 0;
  }

  async getParts(options: { 
    limit?: number; 
    offset?: number; 
    vehicleId?: number | number[]; 
    familia?: string; 
    marca?: string;     // Nuevo campo para filtrado por marca
    modelo?: string;    // Nuevo campo para filtrado por modelo
    refLocal?: number;
    idEmpresa?: number;
    activo?: boolean;
    noReservadas?: boolean;
  } = {}): Promise<Part[]> {
    let query = db.select().from(parts);
    const conditions: SQL<unknown>[] = [];

    // Aplicar filtros
    if (options.vehicleId !== undefined) {
      if (Array.isArray(options.vehicleId)) {
        // Si es un array de IDs de vehículos
        if (options.vehicleId.length > 0) {
          // Obtener los IDs locales de los vehículos para filtrar piezas directamente
          const vehicleLocalIds = await db.select({ idLocal: vehicles.idLocal })
            .from(vehicles)
            .where(inArray(vehicles.id, options.vehicleId))
            .execute();

          if (vehicleLocalIds.length > 0) {
            // Filtrar las piezas por idVehiculo que coincida con alguno de los idLocal obtenidos
            conditions.push(inArray(parts.idVehiculo, vehicleLocalIds.map(v => v.idLocal)));
          }

          // Aplicamos filtros adicionales de marca y modelo si existen
          if (options.marca) {
            conditions.push(ilike(parts.vehicleMarca, `%${options.marca}%`));
          }
          if (options.modelo) {
            conditions.push(ilike(parts.vehicleModelo, `%${options.modelo}%`));
          }
        }
      } else {
        // Si es un único ID de vehículo
        const vehicle = await this.getVehicleById(options.vehicleId);

        if (vehicle) {
          conditions.push(eq(parts.idVehiculo, vehicle.idLocal));
        } else {
          return []; // Si no se encuentra el vehículo, devolvemos array vacío
        }
      }
    } else {
      // Si no se especifica vehicleId, usar filtros por marca/modelo directamente
      // Filtrar por los campos de vehículos en la tabla de piezas
      if (options.marca) {
        conditions.push(ilike(parts.vehicleMarca, `%${options.marca}%`));
      }

      if (options.modelo) {
        conditions.push(ilike(parts.vehicleModelo, `%${options.modelo}%`));
      }
    }

    if (options.familia) {
      conditions.push(ilike(parts.descripcionFamilia, `%${options.familia}%`));
    }

    if (options.refLocal !== undefined) {
      conditions.push(eq(parts.refLocal, options.refLocal));
    }

    if (options.idEmpresa !== undefined) {
      conditions.push(eq(parts.idEmpresa, options.idEmpresa));
    }

    if (options.activo !== undefined) {
      conditions.push(eq(parts.activo, options.activo));
      
      // Si estamos buscando piezas activas, también filtrar por disponibilidad en API
      if (options.activo === true) {
        conditions.push(eq(parts.disponibleApi, true));
      }
    }

    // No mostrar piezas reservadas si así se especifica
    if (options.noReservadas) {
      // Filtrar basándose en el campo reserva que existe en el schema
      conditions.push(sql`${parts.reserva} = 0 OR ${parts.reserva} IS NULL`);
    }

    // Aplicar todas las condiciones
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Aplicar paginación
    if (options.offset) {
      query = query.offset(options.offset);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Ordenar resultados
    query = query.orderBy(desc(parts.id));

    return await query;
  }

  async getPartById(id: number): Promise<Part | undefined> {
    const [part] = await db
      .select()
      .from(parts)
      .where(eq(parts.id, id));

    return part || undefined;
  }

  async getPartsByQuery(query: string): Promise<Part[]> {
    const searchQuery = `%${query}%`;
    return await db.select()
      .from(parts)
      .where(
        and(
          or(
            ilike(parts.descripcionArticulo, searchQuery),
            ilike(parts.descripcionFamilia, searchQuery),
            ilike(parts.refPrincipal, searchQuery),
            ilike(parts.codArticulo, searchQuery)
          ),
          eq(parts.activo, true),
          eq(parts.disponibleApi, true)
        )
      )
      .limit(20);
  }

  async getPartCount(options?: { 
    vehicleId?: number | number[]; 
    familia?: string;
    marca?: string;
    modelo?: string; 
    activo?: boolean;
    noReservadas?: boolean 
  }): Promise<number> {
    // Si no hay filtros, devolver conteo simple
    if (!options || Object.keys(options).length === 0) {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(parts);
      return result?.count || 0;
    }

    // Si hay filtros, crear consulta con las mismas condiciones que getParts
    let query = db.select({ count: sql<number>`count(*)` }).from(parts);
    const conditions: SQL<unknown>[] = [];

    // Aplicar filtros de vehículo
    if (options.vehicleId !== undefined) {
      if (Array.isArray(options.vehicleId)) {
        // Si es un array de IDs de vehículos
        if (options.vehicleId.length > 0) {
          // Obtener los IDs locales de los vehículos para filtrar piezas directamente
          const vehicleLocalIds = await db.select({ idLocal: vehicles.idLocal })
            .from(vehicles)
            .where(inArray(vehicles.id, options.vehicleId))
            .execute();

          if (vehicleLocalIds.length > 0) {
            // Filtrar las piezas por idVehiculo que coincida con alguno de los idLocal obtenidos
            conditions.push(inArray(parts.idVehiculo, vehicleLocalIds.map(v => v.idLocal)));
          }
        }
      } else {
        // Si es un único ID de vehículo
        const vehicle = await this.getVehicleById(options.vehicleId);

        if (vehicle) {
          conditions.push(eq(parts.idVehiculo, vehicle.idLocal));
        } else {
          return 0; // Si no se encuentra el vehículo, no hay piezas
        }
      }
    }

    // Aplicar filtros de marca y modelo directamente
    if (options.marca) {
      conditions.push(ilike(parts.vehicleMarca, `%${options.marca}%`));
    }

    if (options.modelo) {
      conditions.push(ilike(parts.vehicleModelo, `%${options.modelo}%`));
    }

    // Aplicar filtro de familia
    if (options.familia) {
      conditions.push(ilike(parts.descripcionFamilia, `%${options.familia}%`));
    }

    // Aplicar filtro de activo
    if (options.activo !== undefined) {
      conditions.push(eq(parts.activo, options.activo));

      // Si estamos buscando piezas activas, filtrar también por precio > 0 y disponibilidad en API
      if (options.activo === true) {
        conditions.push(sql`CAST(${parts.precio} AS DECIMAL) > 0`);
        conditions.push(eq(parts.disponibleApi, true));
      }
    }

    // No mostrar piezas reservadas si así se especifica
    if (options.noReservadas) {
      conditions.push(sql`${parts.reserva} = 0 OR ${parts.reserva} IS NULL`);
    }

    // Aplicar todas las condiciones
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Ejecutar la consulta
    const [result] = await query;
    return result?.count || 0;
  }

  async createPart(part: InsertPart): Promise<Part> {
    // Asegurar que todos los campos requeridos estén presentes y con tipos correctos
    const partToInsert: typeof parts.$inferInsert = {
      refLocal: part.refLocal,
      idEmpresa: part.idEmpresa,
      idVehiculo: part.idVehiculo,
      vehicleMarca: part.vehicleMarca ?? "",
      vehicleModelo: part.vehicleModelo ?? "",
      vehicleVersion: part.vehicleVersion ?? "",
      vehicleAnyo: part.vehicleAnyo ?? 0,
      combustible: part.combustible ?? "",
      relatedVehiclesCount: part.relatedVehiclesCount ?? 0,
      codFamilia: part.codFamilia ?? "",
      descripcionFamilia: part.descripcionFamilia ?? "",
      codArticulo: part.codArticulo ?? "",
      descripcionArticulo: part.descripcionArticulo ?? "",
      codVersionVehiculo: part.codVersionVehiculo ?? "",
      refPrincipal: part.refPrincipal ?? "",
      anyoInicio: part.anyoInicio ?? 2000,
      anyoFin: part.anyoFin ?? 2050,
      puertas: part.puertas ?? 0,
      rvCode: part.rvCode ?? "",
      precio: typeof part.precio === 'number' ? String(part.precio) : (part.precio ?? "0"),
      anyoStock: part.anyoStock ?? 0,
      peso: typeof part.peso === 'number' ? String(part.peso) : (part.peso ?? "0"),
      ubicacion: part.ubicacion ?? 0,
      observaciones: part.observaciones ?? "",
      reserva: part.reserva ?? 0,
      tipoMaterial: part.tipoMaterial ?? 0,
      imagenes: Array.isArray(part.imagenes) ? part.imagenes : [],
      activo: part.activo !== undefined ? part.activo : false,
      sincronizado: part.sincronizado ?? true,
      isPendingRelation: part.isPendingRelation ?? false
    };

    const [newPart] = await db.insert(parts).values(partToInsert).returning();
    return newPart;
  }

  async updatePart(id: number, part: Partial<InsertPart>): Promise<Part | undefined> {
    // Remove auto-generated fields that should not be updated manually
    const { fechaCreacion, fechaActualizacion, ultimaSincronizacion, ...updateData } = part as any;
    
    const [updatedPart] = await db
      .update(parts)
      .set({
        ...updateData,
        fechaActualizacion: sql`NOW()`, // Update the timestamp
      })
      .where(eq(parts.id, id))
      .returning();

    return updatedPart;
  }

  async deletePart(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(parts)
      .where(eq(parts.id, id))
      .returning({ id: parts.id });

    return !!deleted;
  }

  async deleteAllParts(): Promise<number> {
    const result = await db.delete(parts);
    return result.rowCount || 0;
  }

  async getImportHistory(limit: number = 10, filters?: { status?: string }): Promise<ImportHistory[]> {
    let query = db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.startTime));

    // Aplicar filtros
    if (filters?.status) {
      query = query.where(eq(importHistory.status, filters.status));
    }

    // Aplicar límite
    query = query.limit(limit);

    return await query;
  }

  async getImportHistoryById(id: number): Promise<ImportHistory | undefined> {
    const [history] = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.id, id));

    return history || undefined;
  }

  async createImportHistory(history: InsertImportHistory): Promise<ImportHistory> {
    const [newHistory] = await db
      .insert(importHistory)
      .values({
        ...history,
        lastUpdated: sql`NOW()`
      })
      .returning();

    return newHistory;
  }

  async updateImportHistory(id: number, history: Partial<ImportHistory>): Promise<ImportHistory | undefined> {
    const [updatedHistory] = await db
      .update(importHistory)
      .set({
        ...history,
        lastUpdated: sql`NOW()`
      })
      .where(eq(importHistory.id, id))
      .returning();

    return updatedHistory;
  }

  async deleteImportHistory(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(importHistory)
      .where(eq(importHistory.id, id))
      .returning({ id: importHistory.id });

    return !!deleted;
  }

  async deleteAllImportHistory(): Promise<number> {
    const deleted = await db
      .delete(importHistory)
      .returning({ id: importHistory.id });

    return deleted.length;
  }

  async clearImportStatistics(): Promise<boolean> {
    try {
      await db
        .update(importHistory)
        .set({
          newItems: 0,
          updatedItems: 0,
          processedItems: 0,
          totalItems: 0
        });

      return true;
    } catch (error) {
      console.error('Error al limpiar estadísticas:', error);
      return false;
    }
  }

  async getImportSchedules(): Promise<ImportSchedule[]> {
    return await db.select().from(importSchedule);
  }

  async getImportScheduleByType(type: string): Promise<ImportSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(importSchedule)
      .where(eq(importSchedule.type, type));

    return schedule || undefined;
  }

  async createImportSchedule(schedule: InsertImportSchedule): Promise<ImportSchedule> {
    const [newSchedule] = await db
      .insert(importSchedule)
      .values({
        ...schedule,
        startTime: schedule.startTime || '02:00',
        nextRun: schedule.nextRun || new Date(Date.now() + 60 * 60 * 1000), // 1 hora por defecto
      })
      .returning();

    return newSchedule;
  }

  async updateImportSchedule(id: number, schedule: Partial<ImportSchedule>): Promise<ImportSchedule | undefined> {
    const [updatedSchedule] = await db
      .update(importSchedule)
      .set(schedule)
      .where(eq(importSchedule.id, id))
      .returning();

    return updatedSchedule;
  }

  async deleteImportSchedule(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(importSchedule)
      .where(eq(importSchedule.id, id))
      .returning({ id: importSchedule.id });

    return !!deleted;
  }

  private async getImportScheduleById(id: number): Promise<ImportSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(importSchedule)
      .where(eq(importSchedule.id, id));

    return schedule || undefined;
  }

  private calculateNextRun(from: Date, frequency: string): Date {
    const nextRun = new Date(from);

    // Calcular próxima ejecución según frecuencia
    switch (frequency) {
      case 'hourly':
        nextRun.setHours(nextRun.getHours() + 1);
        break;
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        // Reset to specific hour (e.g., 3 AM)
        nextRun.setHours(3, 0, 0, 0);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        // Reset to specific hour on Monday
        nextRun.setHours(3, 0, 0, 0);
        const day = nextRun.getDay();
        nextRun.setDate(nextRun.getDate() + (1 - day)); // 1 = Monday
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        // Reset to 1st day of month at specific hour
        nextRun.setDate(1);
        nextRun.setHours(3, 0, 0, 0);
        break;
      default:
        // Para frecuencias no reconocidas, usar diaria
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(3, 0, 0, 0);
    }

    return nextRun;
  }

  // Métodos de carrito delegados a cartStorage
  async getCart(userId: number): Promise<Cart | undefined> {
    return cartStorage.getCart(userId);
  }

  async getCartWithItems(userId: number): Promise<{cart: Cart, items: CartItem[]} | undefined> {
    return cartStorage.getCartWithItems(userId);
  }

  async createCart(cart: InsertCart): Promise<Cart> {
    return cartStorage.createCart(cart);
  }

  async updateCart(id: number, cart: Partial<Cart>): Promise<Cart | undefined> {
    return cartStorage.updateCart(id, cart);
  }

  async getCartItems(cartId: number): Promise<CartItem[]> {
    return cartStorage.getCartItems(cartId);
  }

  async getCartItemById(id: number): Promise<CartItem | undefined> {
    return cartStorage.getCartItemById(id);
  }

  async addItemToCart(item: InsertCartItem): Promise<CartItem> {
    return cartStorage.addItemToCart(item);
  }

  async updateCartItem(id: number, item: Partial<CartItem>): Promise<CartItem | undefined> {
    return cartStorage.updateCartItem(id, item);
  }

  async removeCartItem(id: number): Promise<boolean> {
    return cartStorage.removeCartItem(id);
  }

  async clearCart(cartId: number): Promise<boolean> {
    return cartStorage.clearCart(cartId);
  }

  async getOrders(userId?: number, limit?: number, includeDeleted?: boolean): Promise<Order[]> {
    let query = db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    let conditions = [];

    if (userId !== undefined) {
      conditions.push(eq(orders.userId, userId));
    }

    if (!includeDeleted) {
      conditions.push(eq(orders.isDeleted, false));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (limit) {
      query = query.limit(limit);
    }

    return await query;
  }

  async getOrdersWithItems(userId?: number, limit?: number, includeDeleted?: boolean): Promise<any[]> {
    const ordersList = await this.getOrders(userId, limit, includeDeleted);
    
    // Para cada pedido, obtener sus items
    const ordersWithItems = await Promise.all(
      ordersList.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        
        return {
          ...order,
          items: items
        };
      })
    );
    
    return ordersWithItems;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        sessionId: orders.sessionId,
        cartId: orders.cartId,
        status: orders.status,
        subtotal: orders.subtotal,
        shippingCost: orders.shippingCost,
        total: orders.total,
        shippingMethodId: orders.shippingMethodId,
        shippingAddress: orders.shippingAddress,
        shippingCity: orders.shippingCity,
        shippingProvince: orders.shippingProvince,
        shippingPostalCode: orders.shippingPostalCode,
        shippingCountry: orders.shippingCountry,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        customerNifCif: orders.customerNifCif,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        orderStatus: orders.orderStatus,
        notes: orders.notes,
        // Campos adicionales para administradores
        transportAgency: orders.transportAgency,
        expeditionNumber: orders.expeditionNumber,
        adminObservations: orders.adminObservations,
        documents: orders.documents,
        invoicePdf: orders.invoicePdf,
        isDeleted: orders.isDeleted,
        deletedAt: orders.deletedAt,
        deletedBy: orders.deletedBy,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        // Información del método de envío
        shippingMethodName: shippingConfig.name,
        shippingMethodDescription: shippingConfig.description,
        shippingMethodEstimatedDays: shippingConfig.estimatedDays,
      })
      .from(orders)
      .leftJoin(shippingConfig, eq(orders.shippingMethodId, shippingConfig.id))
      .where(eq(orders.id, id));

    if (!order) {
      return undefined;
    }

    // Get order items con lógica mejorada para referencias
    const rawItems = await db
      .select({
        id: orderItems.id,
        partId: orderItems.partId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        partName: orderItems.partName,
        partFamily: orderItems.partFamily,
        partReference: orderItems.partReference,
        vehicleBrand: orderItems.vehicleBrand,
        vehicleModel: orderItems.vehicleModel,
        vehicleYear: orderItems.vehicleYear,
        vehicleVersion: orderItems.vehicleVersion,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    // Obtener referencias adicionales para cada item por separado
    const items = [];
    for (const rawItem of rawItems) {
      // Intentar obtener refLocal, refPrincipal e información del vehículo de la tabla parts
      const partData = await db
        .select({
          refLocal: parts.refLocal,
          refPrincipal: parts.refPrincipal,
          vehicleMarca: parts.vehicleMarca,
          vehicleModelo: parts.vehicleModelo,
          vehicleAnyo: parts.vehicleAnyo,
          vehicleVersion: parts.vehicleVersion
        })
        .from(parts)
        .where(eq(parts.id, rawItem.partId))
        .limit(1);

      const partInfo = partData[0] || {};
      
      // Combinar datos - usar información del vehículo de orderItems si existe, sino de parts
      const finalItem = {
        ...rawItem,
        refLocal: partInfo.refLocal || null,
        refPrincipal: partInfo.refPrincipal || null,
        // Información del vehículo: preferir orderItems, usar parts como fallback
        vehicleBrand: rawItem.vehicleBrand || partInfo.vehicleMarca || null,
        vehicleModel: rawItem.vehicleModel || partInfo.vehicleModelo || null,
        vehicleYear: rawItem.vehicleYear || partInfo.vehicleAnyo || null,
        vehicleVersion: rawItem.vehicleVersion || partInfo.vehicleVersion || null
      };
      
      items.push(finalItem);
    }



    // Get payment method info based on paymentMethod field
    let paymentMethodInfo = null;
    if (order.paymentMethod) {
      const [paymentConfigData] = await db
        .select()
        .from(paymentConfig)
        .where(eq(paymentConfig.provider, order.paymentMethod));
      
      if (paymentConfigData) {
        paymentMethodInfo = {
          id: paymentConfigData.id,
          name: paymentConfigData.name,
          provider: paymentConfigData.provider,
          config: paymentConfigData.config
        };
      }
    }

    const finalOrder = {
      ...order,
      paymentMethod: paymentMethodInfo,
      shippingMethod: order.shippingMethodName ? {
        id: order.shippingMethodId,
        name: order.shippingMethodName,
        description: order.shippingMethodDescription,
        estimatedDays: order.shippingMethodEstimatedDays
      } : null,
      items: items.map((item, index) => {
        const mappedItem = {
          id: item.id,
          partId: item.partId,
          quantity: item.quantity,
          price: item.price,
          partName: item.partName,
          partFamily: item.partFamily,
          partReference: item.partReference,
          vehicleBrand: item.vehicleBrand,
          vehicleModel: item.vehicleModel,
          vehicleYear: item.vehicleYear,
          vehicleVersion: item.vehicleVersion,
          refPrincipal: item.refPrincipal,
          refLocal: item.refLocal
        };

        return mappedItem;
      })
    };
    
    return finalOrder;
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        sessionId: orders.sessionId,
        cartId: orders.cartId,
        status: orders.status,
        subtotal: orders.subtotal,
        shippingCost: orders.shippingCost,
        total: orders.total,
        shippingMethodId: orders.shippingMethodId,
        shippingAddress: orders.shippingAddress,
        shippingCity: orders.shippingCity,
        shippingPostalCode: orders.shippingPostalCode,
        shippingCountry: orders.shippingCountry,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        customerNifCif: orders.customerNifCif,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        notes: orders.notes,
        transportAgency: orders.transportAgency,
        expeditionNumber: orders.expeditionNumber,
        adminObservations: orders.adminObservations,
        documents: orders.documents,
        invoicePdf: orders.invoicePdf,
        isDeleted: orders.isDeleted,
        deletedAt: orders.deletedAt,
        deletedBy: orders.deletedBy,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippingMethodName: shippingConfig.name,
        shippingMethodDescription: shippingConfig.description,
        shippingMethodEstimatedDays: shippingConfig.estimatedDays,
      })
      .from(orders)
      .leftJoin(shippingConfig, eq(orders.shippingMethodId, shippingConfig.id))
      .where(eq(orders.orderNumber, orderNumber));

    if (!order) {
      return undefined;
    }

    // Get order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    // Get payment method info based on paymentMethod field
    let paymentMethodInfo = null;
    if (order.paymentMethod) {
      const [paymentConfigData] = await db
        .select()
        .from(paymentConfig)
        .where(eq(paymentConfig.provider, order.paymentMethod));
      
      if (paymentConfigData) {
        paymentMethodInfo = {
          id: paymentConfigData.id,
          name: paymentConfigData.name,
          provider: paymentConfigData.provider,
          config: paymentConfigData.config
        };
      }
    }

    return {
      ...order,
      paymentMethod: paymentMethodInfo,
      shippingMethod: order.shippingMethodName ? {
        id: order.shippingMethodId,
        name: order.shippingMethodName,
        description: order.shippingMethodDescription,
        estimatedDays: order.shippingMethodEstimatedDays
      } : null,
      items: items.map(item => ({
        id: item.id,
        partId: item.partId,
        quantity: item.quantity,
        price: item.price,
        partName: item.partName,
        partFamily: item.partFamily,
        partReference: item.partReference,
        vehicleBrand: item.vehicleBrand,
        vehicleModel: item.vehicleModel,
        vehicleYear: item.vehicleYear,
        vehicleVersion: item.vehicleVersion
      }))
    };
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return items.map(item => ({
      id: item.id,
      orderId: item.orderId,
      partId: item.partId,
      quantity: item.quantity,
      price: item.price,
      partName: item.partName,
      partFamily: item.partFamily,
      partReference: item.partReference,
      vehicleBrand: item.vehicleBrand,
      vehicleModel: item.vehicleModel,
      vehicleYear: item.vehicleYear,
      vehicleVersion: item.vehicleVersion,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
  }

  async updateOrderAdminInfo(orderId: number, adminInfo: {
    transportAgency: string;
    expeditionNumber: string;
    adminObservations: string;
    documents: string[];
    invoicePdf: string;
    shippingAddress?: string;
    shippingCity?: string;
    shippingProvince?: string;
    shippingPostalCode?: string;
    shippingCountry?: string;
  }): Promise<Order | undefined> {
    try {
      console.log(`🔧 updateOrderAdminInfo llamado para pedido ${orderId}:`);
      console.log(`🔧 Datos a actualizar:`, {
        transportAgency: adminInfo.transportAgency,
        expeditionNumber: adminInfo.expeditionNumber,
        adminObservations: adminInfo.adminObservations?.substring(0, 50) + '...',
        documentsLength: adminInfo.documents?.length,
        invoicePdf: adminInfo.invoicePdf?.substring(0, 50) + '...'
      });

      const updateData: any = {
        transportAgency: adminInfo.transportAgency,
        expeditionNumber: adminInfo.expeditionNumber,
        adminObservations: adminInfo.adminObservations,
        documents: adminInfo.documents,
        invoicePdf: adminInfo.invoicePdf,
        updatedAt: sql`NOW()`
      };

      // Solo actualizar campos de dirección si se proporcionan
      if (adminInfo.shippingAddress !== undefined) {
        updateData.shippingAddress = adminInfo.shippingAddress;
      }
      if (adminInfo.shippingCity !== undefined) {
        updateData.shippingCity = adminInfo.shippingCity;
      }
      if (adminInfo.shippingProvince !== undefined) {
        updateData.shippingProvince = adminInfo.shippingProvince;
      }
      if (adminInfo.shippingPostalCode !== undefined) {
        updateData.shippingPostalCode = adminInfo.shippingPostalCode;
      }
      if (adminInfo.shippingCountry !== undefined) {
        updateData.shippingCountry = adminInfo.shippingCountry;
      }

      const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();

      if (updatedOrder) {
        console.log(`✅ updateOrderAdminInfo exitoso para pedido ${orderId}`);
      } else {
        console.error(`❌ updateOrderAdminInfo no devolvió resultado para pedido ${orderId}`);
      }

      return updatedOrder;
    } catch (error) {
      console.error(`❌ Error en updateOrderAdminInfo para pedido ${orderId}:`, error);
      console.error(`❌ Stack trace:`, (error as Error).stack);
      return undefined;
    }
  }

  // Métodos para carrito de invitados delegados a guestCartStorage
  async getCartBySessionId(sessionId: string): Promise<Cart | undefined> {
    return guestCartStorage.getCartBySessionId(sessionId);
  }

  async getCartWithItemsBySessionId(sessionId: string): Promise<{cart: Cart, items: CartItem[]} | undefined> {
    return guestCartStorage.getCartWithItemsBySessionId(sessionId);
  }

  // Implementación para el soporte de órdenes de usuarios invitados
  async getOrdersBySessionId(sessionId: string, limit?: number): Promise<Order[]> {
    let query = db
      .select()
      .from(orders)
      .where(and(eq(orders.sessionId, sessionId), eq(orders.isDeleted, false)))
      .orderBy(desc(orders.createdAt));

    if (limit) {
      query = query.limit(limit);
    }

    return await query;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    // Generate unique order number
    const { generateOrderNumber } = await import("../shared/utils/orderNumber");
    let orderNumber = generateOrderNumber();
    
    // Ensure uniqueness by checking database
    let attempts = 0;
    while (attempts < 10) {
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);
      
      if (!existingOrder) {
        break;
      }
      
      orderNumber = generateOrderNumber();
      attempts++;
    }
    
    if (attempts >= 10) {
      throw new Error("Unable to generate unique order number after 10 attempts");
    }

    const [newOrder] = await db
      .insert(orders)
      .values({
        ...order,
        orderNumber,
        isDeleted: false
      })
      .returning();

    return newOrder;
  }

  async createOrderPayment(payment: any): Promise<any> {
    const [newPayment] = await db
      .insert(orderPayments)
      .values(payment)
      .returning();

    return newPayment;
  }

  // Payment and Shipping Configuration methods
  async getPaymentConfig(): Promise<any[]> {
    try {
      return await db.select().from(paymentConfig).where(eq(paymentConfig.isActive, true));
    } catch (error) {
      console.error("Error getting payment config:", error);
      return [];
    }
  }

  async getAllPaymentConfig(): Promise<any[]> {
    try {
      return await db.select().from(paymentConfig);
    } catch (error) {
      console.error("Error getting all payment config:", error);
      return [];
    }
  }

  async updatePaymentConfig(provider: string, config: any, isActive: boolean): Promise<boolean> {
    try {
      const [updated] = await db
        .update(paymentConfig)
        .set({
          config,
          isActive,
          updatedAt: sql`NOW()`
        })
        .where(eq(paymentConfig.provider, provider))
        .returning();
      
      return !!updated;
    } catch (error) {
      console.error("Error updating payment config:", error);
      return false;
    }
  }

  async updateOrderPaymentStatus(orderId: number, status: string): Promise<boolean> {
    try {
      const [updated] = await db
        .update(orders)
        .set({
          paymentStatus: status,
          updatedAt: sql`NOW()`
        })
        .where(eq(orders.id, orderId))
        .returning();
      
      return !!updated;
    } catch (error) {
      console.error("Error updating order payment status:", error);
      return false;
    }
  }

  async getShippingConfig(): Promise<any[]> {
    try {
      return await db.select().from(shippingConfig).where(eq(shippingConfig.isActive, true));
    } catch (error) {
      console.error("Error getting shipping config:", error);
      return [];
    }
  }

  async getPaymentMethodById(id: number): Promise<any | undefined> {
    try {
      const [paymentMethod] = await db
        .select()
        .from(paymentConfig)
        .where(eq(paymentConfig.id, id))
        .limit(1);
      return paymentMethod;
    } catch (error) {
      console.error("Error getting payment method by ID:", error);
      return undefined;
    }
  }

  async getPaymentMethodByProvider(provider: string): Promise<any | undefined> {
    try {
      const [paymentMethod] = await db
        .select()
        .from(paymentConfig)
        .where(eq(paymentConfig.provider, provider))
        .limit(1);
      return paymentMethod;
    } catch (error) {
      console.error("Error getting payment method by provider:", error);
      return undefined;
    }
  }

  async createOrderItem(orderItem: {
    orderId: number;
    partId: number;
    quantity: number;
    price: number;
    partName: string;
    partFamily?: string;
    partReference?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehicleVersion?: string;
  }): Promise<void> {
    try {
      await db.insert(orderItems).values({
        orderId: orderItem.orderId,
        partId: orderItem.partId,
        quantity: orderItem.quantity,
        price: orderItem.price.toString(),
        partName: orderItem.partName,
        partFamily: orderItem.partFamily || null,
        partReference: orderItem.partReference || null,
        vehicleBrand: orderItem.vehicleBrand || null,
        vehicleModel: orderItem.vehicleModel || null,
        vehicleYear: orderItem.vehicleYear || null,
        vehicleVersion: orderItem.vehicleVersion || null
      });
    } catch (error) {
      console.error("Error creating order item:", error);
      throw error;
    }
  }

  async updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({
        ...order,
        updatedAt: sql`NOW()`
      })
      .where(eq(orders.id, id))
      .returning();

    return updatedOrder;
  }

  async updateOrderPaymentStatus(orderId: number, paymentStatus: string): Promise<boolean> {
    const [updatedOrder] = await db
      .update(orders)
      .set({
        paymentStatus: paymentStatus,
        updatedAt: sql`NOW()`
      })
      .where(eq(orders.id, orderId))
      .returning();

    return !!updatedOrder;
  }

  async updateOrderStatus(orderId: number, orderStatus: string): Promise<boolean> {
    const [updatedOrder] = await db
      .update(orders)
      .set({
        orderStatus: orderStatus,
        updatedAt: sql`NOW()`
      })
      .where(eq(orders.id, orderId))
      .returning();

    return !!updatedOrder;
  }

  async softDeleteOrder(id: number, userId: number): Promise<boolean> {
    const [deletedOrder] = await db
      .update(orders)
      .set({
        isDeleted: true,
        deletedAt: sql`NOW()`,
        deletedBy: userId,
        updatedAt: sql`NOW()`
      })
      .where(and(eq(orders.id, id), eq(orders.isDeleted, false)))
      .returning();

    return !!deletedOrder;
  }

  async restoreOrder(id: number): Promise<boolean> {
    const [restoredOrder] = await db
      .update(orders)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: sql`NOW()`
      })
      .where(eq(orders.id, id))
      .returning();

    return !!restoredOrder;
  }

  async getDeletedOrders(userId?: number, limit?: number): Promise<Order[]> {
    let query = db
      .select()
      .from(orders)
      .where(eq(orders.isDeleted, true))
      .orderBy(desc(orders.deletedAt));

    if (userId !== undefined) {
      query = query.where(and(eq(orders.isDeleted, true), eq(orders.userId, userId)));
    }

    if (limit) {
      query = query.limit(limit);
    }

    return await query;
  }

  async getDeletedOrdersWithItems(userId?: number, limit?: number): Promise<any[]> {
    const deletedOrders = await this.getDeletedOrders(userId, limit);
    
    // Para cada pedido eliminado, obtener sus items
    const ordersWithItems = await Promise.all(
      deletedOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        
        return {
          ...order,
          items: items
        };
      })
    );
    
    return ordersWithItems;
  }

  async hardDeleteOrder(id: number): Promise<boolean> {
    const [deletedOrder] = await db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning();

    return !!deletedOrder;
  }

  // Implementamos los nuevos métodos para el modelo relacional
  async getPartsByVehicleLocalId(idVehiculoLocal: number): Promise<Part[]> {
    const result = await db
      .select()
      .from(parts)
      .where(
        and(
          eq(parts.idVehiculo, idVehiculoLocal),
          eq(parts.activo, true),
          eq(parts.disponibleApi, true)
        )
      );

    return result;
  }

  async getPendingParts(): Promise<Part[]> {
    const result = await db
      .select()
      .from(parts)
      .where(eq(parts.isPendingRelation, true));

    return result;
  }

  async updatePartStatus(partId: number, active: boolean, isPending: boolean): Promise<Part | undefined> {
    const [updated] = await db
      .update(parts)
      .set({
        activo: active,
        isPendingRelation: isPending,
        
      })
      .where(eq(parts.id, partId))
      .returning();

    return updated;
  }

  // Payment and Shipping Configuration Methods
  async getPaymentConfig(): Promise<any[]> {
    const result = await db.query(`
      SELECT id, provider, name, is_active, config, created_at, updated_at 
      FROM payment_config 
      ORDER BY name
    `);
    return result.rows;
  }

  async getShippingConfig(): Promise<any[]> {
    const result = await db.query(`
      SELECT id, name, description, base_price, free_shipping_threshold, 
             weight_based_pricing, price_per_kg, max_weight, estimated_days,
             is_active, created_at, updated_at 
      FROM shipping_config 
      WHERE is_active = true
      ORDER BY name
    `);
    return result.rows;
  }

  // Modificamos este método para usar la relación directa a través de idVehiculo
  async getPartsByVehicleId(vehicleId: number): Promise<Part[]> {
    // Primero obtenemos el vehículo para conocer su idLocal
    const vehicle = await this.getVehicleById(vehicleId);

    if (!vehicle) {
      return [];
    }

    // Usamos el idLocal del vehículo para buscar piezas asociadas
    return this.getPartsByVehicleLocalId(vehicle.idLocal);
  }

  // Estos métodos ya no son necesarios en el nuevo modelo pero mantenemos la firma vacía
  async getVehicleParts(): Promise<any[]> {
    console.warn('getVehicleParts está obsoleto, use getPartsByVehicleId o getPartsByVehicleLocalId');
    return [];
  }

  async createVehiclePart(): Promise<any> {
    console.warn('createVehiclePart está obsoleto, use createPart con idVehiculo');
    throw new Error('Método obsoleto');
  }

  async deleteVehiclePart(): Promise<boolean> {
    console.warn('deleteVehiclePart está obsoleto');
    return false;
  }

  async deleteVehiclePartsByVehicleId(): Promise<number> {
    console.warn('deleteVehiclePartsByVehicleId está obsoleto');
    return 0;
  }

  async deleteVehiclePartsByPartId(): Promise<number> {
    console.warn('deleteVehiclePartsByPartId está obsoleto');
    return 0;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentConfig[]> {
    return await db.select().from(paymentConfig).orderBy(desc(paymentConfig.createdAt));
  }

  async createPaymentMethod(method: InsertPaymentConfig): Promise<PaymentConfig> {
    const [newMethod] = await db.insert(paymentConfig).values(method).returning();
    return newMethod;
  }

  async updatePaymentMethod(id: number, method: Partial<PaymentConfig>): Promise<PaymentConfig | undefined> {
    const [updated] = await db.update(paymentConfig)
      .set({ ...method, updatedAt: sql`NOW()` })
      .where(eq(paymentConfig.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    const result = await db.delete(paymentConfig).where(eq(paymentConfig.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getPaymentMethodById(id: number): Promise<PaymentConfig | undefined> {
    const [method] = await db.select().from(paymentConfig).where(eq(paymentConfig.id, id));
    return method || undefined;
  }

  // Enhanced site config methods
  async getSiteConfigByKey(key: string): Promise<{ value: string } | undefined> {
    // For now, return a basic structure that matches the expected interface
    // This would typically be stored in a separate config table
    if (key === "redsys_config") {
      return { value: JSON.stringify({
        merchantCode: "",
        terminal: "001", 
        secretKey: "",
        environment: "test"
      })};
    }
    return undefined;
  }

  async setSiteConfig(key: string, value: string, description?: string): Promise<void> {
    // Implementation would depend on having a proper config table
    console.log(`Setting config ${key} = ${value}`);
  }

  // CMS - Site Settings implementation
  async getSiteSettings(): Promise<SiteSetting[]> {
    try {
      const result = await db.select().from(siteSettings).orderBy(siteSettings.category, siteSettings.key);
      return result;
    } catch (error) {
      console.error('Error getting site settings:', error);
      return [];
    }
  }

  async getSiteSettingByKey(key: string): Promise<SiteSetting | undefined> {
    try {
      const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting site setting by key:', error);
      return undefined;
    }
  }

  async setSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
    try {
      const result = await db.insert(siteSettings).values({
        key: setting.key,
        value: setting.value,
        description: setting.description,
        type: setting.type,
        category: setting.category
      }).returning();
      return result[0];
    } catch (error) {
      console.error('Error setting site setting:', error);
      throw error;
    }
  }

  async updateSiteSetting(key: string, value: string): Promise<SiteSetting | undefined> {
    try {
      const result = await db.update(siteSettings)
        .set({ 
          value: value,
          updatedAt: sql`NOW()`
        })
        .where(eq(siteSettings.key, key))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating site setting:', error);
      return undefined;
    }
  }

  // Obtiene las familias de piezas (categorías) con conteo - DatabaseStorage version
  async getPartFamiliesFromDatabase(): Promise<{id: string, name: string, count: number}[]> {
    try {
      // Consulta para obtener las familias de piezas y su conteo
      const result = await db.select({
        id: parts.descripcionFamilia, // Usar descripcionFamilia como id para mostrar nombres reales
        name: parts.descripcionFamilia,
        count: sql<number>`count(*)`
      })
      .from(parts)
      .where(
        and(
          sql`${parts.descripcionFamilia} IS NOT NULL`,
          sql`${parts.descripcionFamilia} != ''`,
          eq(parts.activo, true),
          eq(parts.disponibleApi, true)
        )
      )
      .groupBy(parts.descripcionFamilia)
      .orderBy(parts.descripcionFamilia, "asc"); // Ordenar alfabéticamente

      return result.map(item => ({
        id: item.id || "",
        name: item.name || "",
        count: item.count
      }));
    } catch (error) {
      console.error("Error al obtener familias de piezas:", error);
      return [];
    }
  }

  // Desactivar piezas compradas cuando se completa un pedido
  async deactivatePurchasedParts(orderId: number): Promise<boolean> {
    try {
      console.log(`🛒 Desactivando piezas del pedido ${orderId}...`);
      
      // Obtener los artículos del pedido
      const orderItemsData = await db.select({
        partId: orderItems.partId
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

      if (orderItemsData.length === 0) {
        console.log(`ℹ️ No se encontraron artículos para el pedido ${orderId}`);
        return true;
      }

      // Extraer los IDs de las piezas
      const partIds = orderItemsData.map(item => item.partId);
      console.log(`🔧 Desactivando ${partIds.length} piezas:`, partIds);

      // Desactivar todas las piezas del pedido usando inArray
      const result = await db
        .update(parts)
        .set({
          activo: false,
          fechaActualizacion: sql`NOW()`
        })
        .where(inArray(parts.id, partIds));

      console.log(`✅ Piezas desactivadas exitosamente para pedido ${orderId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error desactivando piezas del pedido ${orderId}:`, error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();