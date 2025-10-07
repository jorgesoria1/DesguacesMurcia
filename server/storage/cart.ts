
import { db } from '../db';
import { carts, cartItems, type Cart, type CartItem, type InsertCart, type InsertCartItem } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

export const cartStorage = {
  async getCart(userId: number): Promise<Cart | undefined> {
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
    
    return cart || undefined;
  },

  async getCartWithItems(userId: number): Promise<{cart: Cart, items: CartItem[]} | undefined> {
    const cart = await this.getCart(userId);
    if (!cart) return undefined;

    const items = await this.getCartItems(cart.id);
    return { cart, items };
  },

  async createCart(cart: InsertCart): Promise<Cart> {
    const [newCart] = await db
      .insert(carts)
      .values(cart)
      .returning();
    
    return newCart;
  },

  async updateCart(id: number, cart: Partial<Cart>): Promise<Cart | undefined> {
    const [updatedCart] = await db
      .update(carts)
      .set({
        ...cart,
        updatedAt: new Date()
      })
      .where(eq(carts.id, id))
      .returning();
    
    return updatedCart;
  },

  async getCartItems(cartId: number): Promise<CartItem[]> {
    return await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));
  },

  async getCartItemById(id: number): Promise<CartItem | undefined> {
    const [item] = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.id, id));
    
    return item || undefined;
  },

  async addItemToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, item.cartId),
          eq(cartItems.partId, item.partId)
        )
      );

    if (existingItem) {
      // Update quantity
      const [updatedItem] = await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + item.quantity,
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      
      return updatedItem;
    } else {
      // Add new item
      const [newItem] = await db
        .insert(cartItems)
        .values(item)
        .returning();
      
      return newItem;
    }
  },

  async updateCartItem(id: number, item: Partial<CartItem>): Promise<CartItem | undefined> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({
        ...item,
        updatedAt: new Date()
      })
      .where(eq(cartItems.id, id))
      .returning();
    
    return updatedItem;
  },

  async removeCartItem(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(cartItems)
      .where(eq(cartItems.id, id))
      .returning({ id: cartItems.id });
    
    return !!deleted;
  },

  async clearCart(cartId: number): Promise<boolean> {
    const result = await db
      .delete(cartItems)
      .where(eq(cartItems.cartId, cartId));
    
    return result.rowCount > 0;
  }
};
