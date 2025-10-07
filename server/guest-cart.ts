
import { Request, Response, NextFunction } from 'express';

// Extend the session interface to include cart
declare module 'express-session' {
  interface SessionData {
    cart?: CartItem[];
    guestId?: string;
  }
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  partNumber?: string;
}

export function initializeGuestCart() {
  console.log('🛒 Guest cart system initialized');
}

export function getGuestCart(req: Request): CartItem[] {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  return req.session.cart;
}

export function addToGuestCart(req: Request, item: CartItem): CartItem[] {
  const cart = getGuestCart(req);
  const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
  
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  
  req.session.cart = cart;
  return cart;
}

export function removeFromGuestCart(req: Request, itemId: number): CartItem[] {
  const cart = getGuestCart(req);
  req.session.cart = cart.filter(item => item.id !== itemId);
  return req.session.cart;
}

export function updateGuestCartItemQuantity(req: Request, itemId: number, quantity: number): CartItem[] {
  const cart = getGuestCart(req);
  const itemIndex = cart.findIndex(item => item.id === itemId);
  
  if (itemIndex > -1) {
    if (quantity <= 0) {
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].quantity = quantity;
    }
  }
  
  req.session.cart = cart;
  return cart;
}

export function clearGuestCart(req: Request): void {
  req.session.cart = [];
}

export function getGuestCartTotal(req: Request): number {
  const cart = getGuestCart(req);
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}
