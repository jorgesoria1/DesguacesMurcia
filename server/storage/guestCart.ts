
import { db } from '../db';
import { carts, cartItems, type Cart, type CartItem, type InsertCart, type InsertCartItem } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

export const guestCartStorage = {
  async getCartBySessionId(sessionId: string): Promise<Cart | undefined> {
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);
    
    return cart || undefined;
  },

  async getCartWithItemsBySessionId(sessionId: string): Promise<{cart: Cart, items: CartItem[]} | undefined> {
    const cart = await this.getCartBySessionId(sessionId);
    if (!cart) return undefined;

    const items = await this.getCartItems(cart.id);
    return { cart, items };
  },

  async createGuestCart(sessionId: string): Promise<Cart> {
    const [newCart] = await db
      .insert(carts)
      .values({
        sessionId,
        userId: null,
        checkedOut: false
      })
      .returning();
    
    return newCart;
  },

  async getCartItems(cartId: number): Promise<CartItem[]> {
    return await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));
  },

  async addItemToGuestCart(sessionId: string, item: Omit<InsertCartItem, 'cartId'>): Promise<CartItem> {
    // Get or create cart for session
    let cart = await this.getCartBySessionId(sessionId);
    if (!cart) {
      cart = await this.createGuestCart(sessionId);
    }

    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.partId, item.partId)
        )
      );

    if (existingItem) {
      // Update quantity
      const [updatedItem] = await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + item.quantity,
          updatedAt: sql`NOW()`
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      
      return updatedItem;
    } else {
      // Add new item
      const [newItem] = await db
        .insert(cartItems)
        .values({
          ...item,
          cartId: cart.id
        })
        .returning();
      
      return newItem;
    }
  },

  async updateGuestCartItem(id: number, item: Partial<CartItem>): Promise<CartItem | undefined> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({
        ...item,
        updatedAt: sql`NOW()`
      })
      .where(eq(cartItems.id, id))
      .returning();
    
    return updatedItem;
  },

  async removeGuestCartItem(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(cartItems)
      .where(eq(cartItems.id, id))
      .returning({ id: cartItems.id });
    
    return !!deleted;
  },

  async clearGuestCart(sessionId: string): Promise<boolean> {
    const cart = await this.getCartBySessionId(sessionId);
    if (!cart) return false;

    const result = await db
      .delete(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    
    return result.rowCount > 0;
  }
};
