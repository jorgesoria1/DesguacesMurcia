import { db } from "../db";
import { shippingConfig } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

interface WeightRange {
  minWeight: number;
  maxWeight: number;
  price: number;
}

interface ShippingMethodConfig {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  freeShippingThreshold?: number;
  weightBasedPricing: boolean;
  pricePerKg: number;
  maxWeight?: number;
  estimatedDays: number;
  isActive: boolean;
  weightRanges?: WeightRange[];
}

class EnhancedShippingService {
  private rodesWeightRanges: WeightRange[] = [
    { minWeight: 0, maxWeight: 1, price: 3.50 },
    { minWeight: 1.01, maxWeight: 2, price: 4.20 },
    { minWeight: 2.01, maxWeight: 3, price: 4.90 },
    { minWeight: 3.01, maxWeight: 5, price: 5.60 },
    { minWeight: 5.01, maxWeight: 7, price: 6.30 },
    { minWeight: 7.01, maxWeight: 10, price: 7.00 },
    { minWeight: 10.01, maxWeight: 15, price: 8.40 },
    { minWeight: 15.01, maxWeight: 20, price: 9.80 },
    { minWeight: 20.01, maxWeight: 25, price: 11.20 },
    { minWeight: 25.01, maxWeight: 30, price: 12.60 },
    { minWeight: 30.01, maxWeight: 40, price: 15.40 },
    { minWeight: 40.01, maxWeight: 50, price: 18.20 },
    { minWeight: 50.01, maxWeight: 100, price: 28.00 },
    { minWeight: 100.01, maxWeight: 200, price: 45.50 },
    { minWeight: 200.01, maxWeight: 500, price: 91.00 },
  ];

  async getActiveShippingMethods(): Promise<ShippingMethodConfig[]> {
    try {
      const methods = await db.select().from(shippingConfig)
        .where(eq(shippingConfig.isActive, true));
      
      return methods.map(method => ({
        id: method.id,
        name: method.name,
        description: method.description || "",
        basePrice: parseFloat(method.basePrice),
        freeShippingThreshold: method.freeShippingThreshold ? parseFloat(method.freeShippingThreshold) : undefined,
        weightBasedPricing: method.weightBasedPricing || false,
        pricePerKg: parseFloat(method.pricePerKg || "0"),
        maxWeight: method.maxWeight ? parseFloat(method.maxWeight) : undefined,
        estimatedDays: method.estimatedDays || 1,
        isActive: method.isActive || false,
        weightRanges: method.name === "RODES" ? this.rodesWeightRanges : undefined
      }));
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
      return [];
    }
  }

  async calculateShippingCost(methodId: number, subtotal: number, totalWeight?: number): Promise<number> {
    try {
      const [method] = await db.select().from(shippingConfig)
        .where(and(eq(shippingConfig.id, methodId), eq(shippingConfig.isActive, true)));
      
      if (!method) {
        throw new Error("Shipping method not found or inactive");
      }

      // Check for free shipping threshold
      if (method.freeShippingThreshold && subtotal >= parseFloat(method.freeShippingThreshold)) {
        return 0;
      }

      // RODES weight-based calculation
      if (method.name === "RODES" && totalWeight) {
        return this.calculateRodesShipping(totalWeight);
      }

      // Standard weight-based calculation
      if (method.weightBasedPricing && totalWeight) {
        const basePrice = parseFloat(method.basePrice);
        const pricePerKg = parseFloat(method.pricePerKg || "0");
        return basePrice + (totalWeight * pricePerKg);
      }

      // Standard flat rate
      return parseFloat(method.basePrice);
    } catch (error) {
      console.error("Error calculating shipping cost:", error);
      throw error;
    }
  }

  private calculateRodesShipping(weight: number): number {
    // Find the appropriate weight range for RODES
    const range = this.rodesWeightRanges.find(r => 
      weight >= r.minWeight && weight <= r.maxWeight
    );

    if (range) {
      return range.price;
    }

    // If weight exceeds maximum defined range, use highest rate
    if (weight > 500) {
      return 91.00;
    }

    // Fallback to base price for edge cases
    return 3.50;
  }

  async createShippingMethod(data: any): Promise<any> {
    try {
      // Special handling for RODES configuration
      if (data.name === "RODES") {
        const rodesData = {
          name: "RODES",
          description: "Transporte nacional RODES con tarifas por peso",
          basePrice: "3.50",
          freeShippingThreshold: null,
          weightBasedPricing: true,
          pricePerKg: "0",
          maxWeight: "500",
          estimatedDays: 2,
          isActive: true
        };

        const [newMethod] = await db.insert(shippingConfig)
          .values(rodesData)
          .returning();
        return newMethod;
      }

      // Standard method creation
      const [newMethod] = await db.insert(shippingConfig)
        .values({
          name: data.name,
          description: data.description,
          basePrice: data.basePrice.toString(),
          freeShippingThreshold: data.freeShippingThreshold ? data.freeShippingThreshold.toString() : null,
          weightBasedPricing: data.weightBasedPricing || false,
          pricePerKg: data.pricePerKg ? data.pricePerKg.toString() : "0",
          maxWeight: data.maxWeight ? data.maxWeight.toString() : null,
          estimatedDays: data.estimatedDays || 1,
          isActive: data.isActive !== undefined ? data.isActive : true
        })
        .returning();
      
      return newMethod;
    } catch (error) {
      console.error("Error creating shipping method:", error);
      throw error;
    }
  }

  async updateShippingMethod(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db.update(shippingConfig)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(shippingConfig.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error("Error updating shipping method:", error);
      throw error;
    }
  }

  async deleteShippingMethod(id: number): Promise<void> {
    try {
      await db.delete(shippingConfig).where(eq(shippingConfig.id, id));
    } catch (error) {
      console.error("Error deleting shipping method:", error);
      throw error;
    }
  }

  // Calculate total weight from cart items
  async calculateCartWeight(cartItems: any[]): Promise<number> {
    let totalWeight = 0;
    
    for (const item of cartItems) {
      // Weight values are stored with factor 100 (500 = 5kg), convert to kg
      const partWeight = (item.part?.peso || 100) / 100; // Default 1kg if no weight
      totalWeight += partWeight * item.quantity;
    }
    
    return totalWeight;
  }

  // Get shipping quote with all available methods
  async getShippingQuotes(subtotal: number, cartItems: any[]): Promise<any[]> {
    const totalWeight = await this.calculateCartWeight(cartItems);
    const methods = await this.getActiveShippingMethods();
    
    const quotes = [];
    for (const method of methods) {
      try {
        const cost = await this.calculateShippingCost(method.id, subtotal, totalWeight);
        quotes.push({
          id: method.id,
          name: method.name,
          description: method.description,
          cost,
          estimatedDays: method.estimatedDays,
          totalWeight
        });
      } catch (error) {
        console.error(`Error calculating quote for ${method.name}:`, error);
      }
    }
    
    return quotes.sort((a, b) => a.cost - b.cost); // Sort by cost
  }
}

export const enhancedShippingService = new EnhancedShippingService();