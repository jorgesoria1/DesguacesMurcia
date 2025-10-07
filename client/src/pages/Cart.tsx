
import React from "react";
import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, ArrowLeft, CreditCard, Trash, Plus, Minus } from "lucide-react";
import { useLocation } from "wouter";
import { formatPrice, formatPriceBreakdown, IVA_RATE } from "@/lib/utils";

const Cart: React.FC = () => {
  const { 
    items, 
    totalItems, 
    totalPrice, 
    updateQuantity, 
    removeItem, 
    clearCart 
  } = useCart();
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la tienda
        </Button>
        <div>
          <h1 className="text-3xl font-montserrat font-semibold text-primary mb-2">Tu Carrito</h1>
          
          {/* Divisor decorativo */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-0.5 bg-gradient-to-r from-primary to-blue-800 rounded-full"></div>
            <div className="mx-4 text-primary text-lg">•</div>
            <div className="w-20 h-0.5 bg-gradient-to-l from-primary to-blue-800 rounded-full"></div>
          </div>
          
          <p className="text-gray-600">
            {totalItems === 0 ? "Tu carrito está vacío" : `${totalItems} ${totalItems === 1 ? "artículo" : "artículos"} en tu carrito`}
          </p>
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingCart className="h-24 w-24 text-gray-300 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Tu carrito está vacío</h2>
          <p className="text-gray-500 mb-8 text-center max-w-md">
            Parece que no has añadido ninguna pieza a tu carrito. ¡Explora nuestro catálogo y encuentra las piezas que necesitas!
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => setLocation("/parts")} className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Buscar piezas
            </Button>
            <Button variant="outline" onClick={() => setLocation("/vehicles")}>
              Ver vehículos
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Productos en tu carrito</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Vaciar carrito
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                      <div className="h-20 w-20 sm:h-20 sm:w-20 mx-auto sm:mx-0 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.partImage ? (
                          <img
                            src={item.partImage}
                            alt={item.partName}
                            className="object-cover h-full w-full"
                          />
                        ) : (
                          <div className="text-gray-400 text-2xl">🔧</div>
                        )}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="text-center sm:text-left">
                          <h3 className="font-semibold text-base sm:text-lg mb-1">{item.partName}</h3>
                          <p className="text-gray-600 text-sm mb-2">{item.partFamily}</p>
                        </div>
                        
                        {/* REFERENCIAS FINALES */}
                        {(item.partReference || item.partCode) && (
                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            {item.partReference && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                                Ref: {item.partReference}
                              </span>
                            )}
                            {item.partCode && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                                Código: {item.partCode}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            {/* Todos los artículos son únicos - mostrar solo cantidad fija */}
                            <div className="flex items-center justify-center">
                              <span className="text-lg font-medium text-center px-4 py-2 bg-gray-100 rounded-lg">
                                1 unidad
                              </span>
                            </div>
                          </div>

                          <div className="text-center sm:text-right">
                            <div className="text-lg sm:text-xl font-semibold text-red-800">
                              {formatPrice(item.price * item.quantity, false)}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">
                              <span className="text-red-800">{formatPrice(item.price, false)}</span> cada uno
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-center sm:justify-start">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 text-xs sm:text-sm"
                            onClick={() => removeItem(item.partId)}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Resumen del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  // Calculate IVA breakdown from the total price (which already includes IVA)
                  const totalWithIVA = totalPrice;
                  const totalWithoutIVA = totalWithIVA / (1 + IVA_RATE);
                  const ivaAmount = totalWithIVA - totalWithoutIVA;
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal ({totalItems} {totalItems === 1 ? "artículo" : "artículos"})</span>
                        <span className="font-medium text-red-800">
                          {formatPrice(totalWithoutIVA, false)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA (21%)</span>
                        <span className="font-medium text-red-800">
                          {formatPrice(ivaAmount, false)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Envío</span>
                        <span className="text-gray-600 font-medium">*Coste de envío calculado en el checkout</span>
                      </div>
                    </div>
                  );
                })()}

                <Separator />

                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-red-800 font-semibold">{formatPrice(totalPrice, false)}</span>
                </div>

                <div className="space-y-3 pt-4">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setLocation("/checkout")}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Finalizar compra
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation("/parts")}
                  >
                    Continuar comprando
                  </Button>
                </div>

                <div className="text-xs text-gray-500 pt-4 space-y-1">
                  <p>• Coste de envío calculado en el checkout</p>
                  <p>• Garantía de calidad en todas las piezas</p>
                  <p>• Soporte técnico especializado</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
