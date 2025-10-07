import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { calculatePriceWithIVA } from "@/lib/utils";

export type CartItem = {
  id: number;
  partId: number;
  quantity: number;
  price: number;
  partName: string;
  partFamily: string;
  partImage?: string;
  partReference?: string;
  partCode?: string;
  partWeight?: number; // Weight in grams
  idVehiculo?: number; // Vehicle ID to identify processed parts (negative = processed)
};

export type CartContextType = {
  items: CartItem[];
  isLoading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (partId: number, quantity: number, partData: any, openCart?: boolean) => Promise<void>;
  updateQuantity: (partId: number, quantity: number) => void;
  removeItem: (partId: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  // Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem('cart-items');
    
    try {
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          setItems(parsedCart);
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      localStorage.removeItem('cart-items');
      setItems([]);
    } finally {
      setIsLoading(false); // Cart loading is complete
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('cart-items', JSON.stringify(items));
  }, [items]);

  const addToCart = async (partId: number, quantity: number = 1, partData: any, openCart: boolean = true) => {
    try {
      setIsLoading(true);

      // Verificar si el item ya existe
      const existingItemIndex = items.findIndex(item => item.partId === partId);

      if (existingItemIndex !== -1) {
        // Todos los artículos son únicos - no permitir duplicados
        toast({
          title: "Producto ya en el carrito",
          description: "Este producto ya está en tu carrito. Todos los artículos son únicos con cantidad 1.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      } else {
        // Añadir nuevo item
        const basePrice = parseFloat(partData.precio?.replace(',', '.') || '0');
        const priceWithIVA = calculatePriceWithIVA(basePrice);
        
        // Parse weight from part data (stored in grams)  
        const partWeight = partData.peso ? parseInt(partData.peso.toString()) || 500 : 500; // Default 500g if no weight
        
        // Todos los artículos son únicos - cantidad siempre 1
        const vehicleId = partData.idVehiculo || null;
        const finalQuantity = 1;
        
        // USAR MISMA LÓGICA QUE PartCard.tsx - solo refLocal como en las fichas
        const reference = partData.refLocal?.toString() || null;
        const code = partData.codArticulo || null;

        const newItem: CartItem = {
          id: Date.now(), // ID temporal único
          partId: partId,
          quantity: finalQuantity,
          price: priceWithIVA,
          partName: partData.descripcionArticulo || `Pieza #${partId}`,
          partFamily: partData.descripcionFamilia || 'Pieza de repuesto',
          partImage: partData.imagenes?.[0] || null,
          partReference: reference,
          partCode: code,
          partWeight: partWeight,
          idVehiculo: vehicleId
        };
        setItems(prev => [...prev, newItem]);
      }

      toast({
        title: "Añadido al carrito",
        description: `${partData.descripcionArticulo || 'Pieza'} añadida al carrito`,
      });

      if (openCart) {
        setIsCartOpen(true);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir al carrito",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = (partId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(partId);
      return;
    }

    // Todos los artículos son únicos - no permitir cambiar cantidad
    toast({
      title: "Cantidad no modificable",
      description: "Todos los artículos son únicos y solo están disponibles en 1 unidad",
      variant: "destructive",
    });
    // No actualizar la cantidad - mantener siempre en 1
  };

  const removeItem = (partId: number) => {
    setItems(prev => prev.filter(item => item.partId !== partId));
    toast({
      title: "Eliminado del carrito",
      description: "Pieza eliminada del carrito",
    });
  };

  const clearCart = () => {
    setItems([]);
    toast({
      title: "Carrito vaciado",
      description: "Se han eliminado todos los productos del carrito",
    });
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        setItems,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart debe ser usado dentro de un CartProvider");
  }
  return context;
};