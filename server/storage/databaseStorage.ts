import { db } from "../db";
import { eq, desc, asc, sql } from "drizzle-orm";
import {
  users,
  vehicles,
  parts,
  carts,
  cartItems,
  orders,
  orderPayments,
  siteConfig,
  shippingConfig,
  paymentConfig,
  pages,
  footerBlocks,
  siteSettings,
  banners,
  homepageBlocks,
  type User,
  type InsertUser,
  type Vehicle,
  type InsertVehicle,
  type Part,
  type InsertPart,
  type Cart,
  type InsertCart,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
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
  type Banner,
  type InsertBanner,
  type HomepageBlock,
  type InsertHomepageBlock,
  type ApiConfig,
  type InsertApiConfig,
} from "../shared/schema";
import { IStorage } from "../storage";

export class DatabaseStorage implements IStorage {
  // CMS - Páginas
  async getPages(): Promise<Page[]> {
    return await db.select().from(pages).orderBy(asc(pages.title));
  }

  async getPageBySlug(slug: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
    return page || undefined;
  }

  async getPageById(id: number): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page || undefined;
  }

  async createPage(page: InsertPage): Promise<Page> {
    const [newPage] = await db.insert(pages).values({
      ...page,
      updatedAt: sql`NOW()`
    }).returning();
    return newPage;
  }

  async updatePage(id: number, page: Partial<InsertPage>): Promise<Page | undefined> {
    const [updatedPage] = await db.update(pages)
      .set({ ...page, updatedAt: sql`NOW()` })
      .where(eq(pages.id, id))
      .returning();
    return updatedPage || undefined;
  }

  async deletePage(id: number): Promise<boolean> {
    const result = await db.delete(pages).where(eq(pages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // CMS - Footer Blocks
  async getFooterBlocks(): Promise<FooterBlock[]> {
    return await db.select().from(footerBlocks)
      .where(eq(footerBlocks.isActive, true))
      .orderBy(asc(footerBlocks.sortOrder));
  }

  async getFooterBlockById(id: number): Promise<FooterBlock | undefined> {
    const [block] = await db.select().from(footerBlocks).where(eq(footerBlocks.id, id));
    return block || undefined;
  }

  async createFooterBlock(block: InsertFooterBlock): Promise<FooterBlock> {
    const [newBlock] = await db.insert(footerBlocks).values({
      ...block,
      updatedAt: sql`NOW()`
    }).returning();
    return newBlock;
  }

  async updateFooterBlock(id: number, block: Partial<InsertFooterBlock>): Promise<FooterBlock | undefined> {
    const [updatedBlock] = await db.update(footerBlocks)
      .set({ ...block, updatedAt: sql`NOW()` })
      .where(eq(footerBlocks.id, id))
      .returning();
    return updatedBlock || undefined;
  }

  async deleteFooterBlock(id: number): Promise<boolean> {
    const result = await db.delete(footerBlocks).where(eq(footerBlocks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // CMS - Site Settings
  async getSiteSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings).orderBy(asc(siteSettings.category), asc(siteSettings.key));
  }

  async getSiteSettingByKey(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting || undefined;
  }

  async setSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
    const [newSetting] = await db.insert(siteSettings).values({
      ...setting,
      updatedAt: sql`NOW()`
    }).onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: setting.value,
        description: setting.description,
        type: setting.type,
        category: setting.category,
        updatedAt: sql`NOW()`
      }
    }).returning();
    return newSetting;
  }

  async updateSiteSetting(key: string, value: string): Promise<SiteSetting | undefined> {
    const [updatedSetting] = await db.update(siteSettings)
      .set({ value, updatedAt: sql`NOW()` })
      .where(eq(siteSettings.key, key))
      .returning();
    return updatedSetting || undefined;
  }

  async deleteSiteSetting(key: string): Promise<boolean> {
    const result = await db.delete(siteSettings).where(eq(siteSettings.key, key));
    return result.rowCount > 0;
  }

  // CMS - Banners
  async getBanners(): Promise<Banner[]> {
    return await db.select().from(banners).orderBy(asc(banners.position), asc(banners.sortOrder));
  }

  async getActiveBanners(): Promise<Banner[]> {
    return await db.select().from(banners)
      .where(sql`${banners.isActive} = true AND (${banners.startDate} IS NULL OR ${banners.startDate} <= NOW()) AND (${banners.endDate} IS NULL OR ${banners.endDate} >= NOW())`)
      .orderBy(asc(banners.position), asc(banners.sortOrder));
  }

  async getBannersByPosition(position: string): Promise<Banner[]> {
    return await db.select().from(banners)
      .where(sql`${banners.position} = ${position} AND ${banners.isActive} = true AND (${banners.startDate} IS NULL OR ${banners.startDate} <= NOW()) AND (${banners.endDate} IS NULL OR ${banners.endDate} >= NOW())`)
      .orderBy(asc(banners.sortOrder));
  }

  async getBanner(id: number): Promise<Banner | undefined> {
    const [banner] = await db.select().from(banners).where(eq(banners.id, id));
    return banner || undefined;
  }

  async createBanner(banner: InsertBanner): Promise<Banner> {
    const [newBanner] = await db.insert(banners).values({
      ...banner,
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    }).returning();
    return newBanner;
  }

  async updateBanner(id: number, banner: Partial<InsertBanner>): Promise<Banner | undefined> {
    const [updatedBanner] = await db.update(banners)
      .set({ ...banner, updatedAt: sql`NOW()` })
      .where(eq(banners.id, id))
      .returning();
    return updatedBanner || undefined;
  }

  async deleteBanner(id: number): Promise<boolean> {
    const result = await db.delete(banners).where(eq(banners.id, id));
    return result.rowCount > 0;
  }

  // Métodos requeridos por la interfaz (implementación básica)
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ ...user, updatedAt: sql`NOW()` })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Configuración de API (implementación básica)
  async getApiConfig(): Promise<ApiConfig | undefined> {
    // Implementación básica - devolver undefined por ahora
    return undefined;
  }

  async updateApiConfig(config: InsertApiConfig): Promise<ApiConfig> {
    // Implementación básica
    throw new Error("Method not implemented yet");
  }

  // Configuración del sitio
  async getSiteConfig(): Promise<SiteConfig | undefined> {
    const [config] = await db.select().from(siteConfig).limit(1);
    return config || undefined;
  }

  async updateSiteConfig(config: Partial<InsertSiteConfig>): Promise<SiteConfig | undefined> {
    const [updatedConfig] = await db.update(siteConfig)
      .set({ ...config, lastUpdated: new Date() })
      .returning();
    return updatedConfig || undefined;
  }

  // Métodos básicos del carrito
  async getCartBySessionId(sessionId: string): Promise<Cart | undefined> {
    const [cart] = await db.select().from(carts).where(eq(carts.sessionId, sessionId));
    return cart || undefined;
  }

  async getCartWithItemsBySessionId(sessionId: string): Promise<{cart: Cart, items: CartItem[]} | undefined> {
    const cart = await this.getCartBySessionId(sessionId);
    if (!cart) return undefined;
    
    const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
    return { cart, items };
  }

  async getOrdersBySessionId(sessionId: string, limit?: number): Promise<Order[]> {
    let query = db.select().from(orders).where(eq(orders.sessionId, sessionId));
    if (limit) {
      query = query.limit(limit);
    }
    return await query;
  }

  // Implementaciones básicas para cumplir con la interfaz
  async getVehicles(): Promise<Vehicle[]> { return []; }
  async getVehicleById(): Promise<Vehicle | undefined> { return undefined; }
  async getVehicleByLocalId(): Promise<Vehicle | undefined> { return undefined; }
  async getVehiclesByIdOrLocal(): Promise<Vehicle | undefined> { return undefined; }
  async getVehiclesByQuery(): Promise<Vehicle[]> { return []; }
  async getVehicleCount(): Promise<number> { return 0; }
  async createVehicle(): Promise<Vehicle> { throw new Error("Not implemented"); }
  async updateVehicle(): Promise<Vehicle | undefined> { return undefined; }
  async deleteVehicle(): Promise<boolean> { return false; }
  async deleteAllVehicles(): Promise<number> { return 0; }

  async getParts(): Promise<Part[]> { return []; }
  async getPartById(): Promise<Part | undefined> { return undefined; }
  async getPartsByVehicleId(): Promise<Part[]> { return []; }
  async getPartsByQuery(): Promise<Part[]> { return []; }
  async getPartCount(): Promise<number> { return 0; }
  async getPartFamilies(): Promise<{id: string, name: string, count: number}[]> { return []; }
  async createPart(): Promise<Part> { throw new Error("Not implemented"); }
  async updatePart(): Promise<Part | undefined> { return undefined; }
  async deletePart(): Promise<boolean> { return false; }
  async deleteAllParts(): Promise<number> { return 0; }
  async getPartsByVehicleLocalId(): Promise<Part[]> { return []; }

  // Métodos del carrito
  async getCarts(): Promise<Cart[]> { return []; }
  async getCartById(): Promise<Cart | undefined> { return undefined; }
  async createCart(): Promise<Cart> { throw new Error("Not implemented"); }
  async updateCart(): Promise<Cart | undefined> { return undefined; }
  async deleteCart(): Promise<boolean> { return false; }
  async getCartItems(): Promise<CartItem[]> { return []; }
  async getCartItemById(): Promise<CartItem | undefined> { return undefined; }
  async addItemToCart(): Promise<CartItem> { throw new Error("Not implemented"); }
  async updateCartItem(): Promise<CartItem | undefined> { return undefined; }
  async removeCartItem(): Promise<boolean> { return false; }
  async clearCart(): Promise<boolean> { return false; }

  // Métodos de pedidos
  async getOrders(): Promise<Order[]> { return []; }
  async getOrderById(): Promise<Order | undefined> { return undefined; }
  async createOrder(): Promise<Order> { throw new Error("Not implemented"); }
  async createOrderItem(): Promise<void> { }
  async updateOrder(): Promise<Order | undefined> { return undefined; }

  // Stripe
  async updateUserStripeInfo(): Promise<User | undefined> { return undefined; }

  // Métodos de pago
  async getPaymentMethods(): Promise<PaymentConfig[]> { return []; }
  async createPaymentMethod(): Promise<PaymentConfig> { throw new Error("Not implemented"); }
  async updatePaymentMethod(): Promise<PaymentConfig | undefined> { return undefined; }
  async deletePaymentMethod(): Promise<boolean> { return false; }

  // Configuración del sitio mejorada
  async getSiteConfig(key: string): Promise<{ value: string } | undefined> {
    const setting = await this.getSiteSettingByKey(key);
    return setting ? { value: setting.value } : undefined;
  }

  async setSiteConfig(key: string, value: string, description?: string): Promise<void> {
    await this.setSiteSetting({
      key,
      value,
      description: description || "",
      type: "text",
      category: "general"
    });
  }

  // CMS - Homepage Blocks
  async getHomepageBlocks(): Promise<HomepageBlock[]> {
    return await db.select().from(homepageBlocks).orderBy(asc(homepageBlocks.sortOrder));
  }

  async getActiveHomepageBlocks(): Promise<HomepageBlock[]> {
    return await db.select().from(homepageBlocks)
      .where(eq(homepageBlocks.isActive, true))
      .orderBy(asc(homepageBlocks.sortOrder));
  }

  async getHomepageBlocksByType(blockType: string): Promise<HomepageBlock[]> {
    return await db.select().from(homepageBlocks)
      .where(sql`${homepageBlocks.blockType} = ${blockType} AND ${homepageBlocks.isActive} = true`)
      .orderBy(asc(homepageBlocks.sortOrder));
  }

  async createHomepageBlock(block: InsertHomepageBlock): Promise<HomepageBlock> {
    const [newBlock] = await db.insert(homepageBlocks).values(block).returning();
    return newBlock;
  }

  async updateHomepageBlock(id: number, block: Partial<InsertHomepageBlock>): Promise<HomepageBlock | undefined> {
    const [updatedBlock] = await db.update(homepageBlocks)
      .set({ ...block, updatedAt: new Date() })
      .where(eq(homepageBlocks.id, id))
      .returning();
    return updatedBlock || undefined;
  }

  async deleteHomepageBlock(id: number): Promise<boolean> {
    const result = await db.delete(homepageBlocks).where(eq(homepageBlocks.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Métodos obsoletos
  async getVehicleParts(): Promise<any[]> { return []; }
  async createVehiclePart(): Promise<any> { return {}; }
  async deleteVehiclePart(): Promise<boolean> { return false; }
  async deleteVehiclePartsByVehicleId(): Promise<number> { return 0; }
  async deleteVehiclePartsByPartId(): Promise<number> { return 0; }
}