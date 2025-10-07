
import React from "react";
import { ShoppingCart, CreditCard, Plus, Minus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCart } from "./CartContext";
import { useLocation } from "wouter";
import { formatPrice, IVA_RATE } from "@/lib/utils";

export const CartWidget: React.FC = () => {
  const { 
    items, 
    totalItems, 
    totalPrice, 
    isCartOpen, 
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    isLoading
  } = useCart();
  const [, setLocation] = useLocation();


  const handleCheckout = () => {
    setIsCartOpen(false);
    setLocation("/checkout");
  };

  const handleViewCart = () => {
    setIsCartOpen(false);
    setLocation("/cart");
  };

  const handleContinueShopping = () => {
    setIsCartOpen(false);
    setLocation("/");
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {totalItems > 99 ? '99+' : totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="mb-4">
          <SheetTitle>
            Tu Carrito ({totalItems} {totalItems === 1 ? "artículo" : "artículos"})
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Tu carrito está vacío</h3>
              <p className="text-gray-500 mb-4">Añade piezas para continuar</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Productos ({totalItems})</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearCart} 
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Vaciar
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                    <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                      {item.partImage ? (
                        <img
                          src={item.partImage}
                          alt={item.partName}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <div className="text-gray-400 text-xl">🔧</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm leading-tight mb-1">
                        {item.partName}
                      </h4>
                      <p className="text-xs text-gray-500 mb-1">
                        {item.partFamily}
                      </p>
                      {/* REFERENCIAS FINALES MOSTRAR SIEMPRE */}
                      {(item.partReference || item.partCode) && (
                        <div className="flex gap-2 text-xs text-gray-600 mb-2">
                          {item.partReference && (
                            <span className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                              Ref: {item.partReference}
                            </span>
                          )}
                          {item.partCode && (
                            <span className="bg-green-100 px-2 py-1 rounded text-green-800">
                              Código: {item.partCode}
                            </span>
                          )}
                        </div>
                      )}
                      


                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          {/* Todos los artículos son únicos - mostrar solo cantidad fija */}
                          <span className="text-sm font-medium text-center px-4 py-1 bg-gray-100 rounded">
                            1 unidad
                          </span>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatPrice(item.price * item.quantity, false)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            onClick={() => removeItem(item.partId)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {totalItems > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              {(() => {
                // Calculate IVA breakdown from the total price (which already includes IVA)
                const totalWithIVA = totalPrice;
                const totalWithoutIVA = totalWithIVA / (1 + IVA_RATE);
                const ivaAmount = totalWithIVA - totalWithoutIVA;
                
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Subtotal:</span>
                      <span className="text-gray-900 font-semibold">{formatPrice(totalWithoutIVA, false)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>IVA (21%):</span>
                      <span className="text-gray-900 font-semibold">{formatPrice(ivaAmount, false)}</span>
                    </div>
                    <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span className="text-gray-900 font-bold">{formatPrice(totalWithIVA, false)}</span>
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-1">
                      * Coste de envío calculado en el checkout
                    </div>
                  </div>
                );
              })()}
              <div className="space-y-3">
                <Button className="w-full" onClick={handleCheckout}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Finalizar compra
                </Button>
                
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleViewCart}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Ver carrito
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleContinueShopping}>
                    Continuar comprando
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
