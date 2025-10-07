
import { db } from "../db";
import { shippingConfig, type ShippingConfig, type InsertShippingConfig } from "../../shared/schema";
import { eq } from "drizzle-orm";

export const shippingService = {
  async getActiveShippingMethods(): Promise<ShippingConfig[]> {
    return await db
      .select()
      .from(shippingConfig)
      .where(eq(shippingConfig.isActive, true));
  },

  async calculateShippingCost(
    methodId: number,
    subtotal: number,
    totalWeight?: number
  ): Promise<number> {
    const [method] = await db
      .select()
      .from(shippingConfig)
      .where(eq(shippingConfig.id, methodId));

    if (!method) {
      throw new Error("Método de envío no encontrado");
    }

    // Verificar si aplica envío gratuito
    if (method.freeShippingThreshold && subtotal >= Number(method.freeShippingThreshold)) {
      return 0;
    }

    let cost = Number(method.basePrice);

    // Añadir costo por peso si está configurado
    if (method.weightBasedPricing && totalWeight && method.pricePerKg) {
      cost += totalWeight * Number(method.pricePerKg);
    }

    return cost;
  },

  async createShippingMethod(method: InsertShippingConfig): Promise<ShippingConfig> {
    const [newMethod] = await db
      .insert(shippingConfig)
      .values(method)
      .returning();
    return newMethod;
  },

  async updateShippingMethod(id: number, updates: Partial<ShippingConfig>): Promise<ShippingConfig | undefined> {
    const [updated] = await db
      .update(shippingConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shippingConfig.id, id))
      .returning();
    return updated;
  },

  async deleteShippingMethod(id: number): Promise<boolean> {
    const result = await db
      .delete(shippingConfig)
      .where(eq(shippingConfig.id, id));
    return result.rowCount > 0;
  }
};
