import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Menu, Phone, Mail, Clock, ChevronDown, User, ShoppingCart, LogOut, Package } from "lucide-react";
import { CartWidget } from "@/components/cart/CartWidget";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const Header: React.FC = () => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // Hook para detectar móvil/tablet - incluye tablets (< 1024px)
  useEffect(() => {
    const checkMobile = () => {
      const mobileView = window.innerWidth < 1024; // Incluir tablets para menú móvil
      const deviceType = window.innerWidth < 768 ? 'móvil' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
      setIsMobile(mobileView);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar configuraciones del sitio
  const { data: siteSettings } = useQuery({
    queryKey: ['/api/cms/site-settings'],
    queryFn: async () => {
      const response = await fetch('/api/cms/site-settings');
      if (!response.ok) throw new Error('Error al cargar configuraciones');
      return response.json();
    }
  });
  
  const handleLogout = async () => {
    try {
      const response = await apiRequest("POST", "/api/auth/logout");
      if (response.ok) {
        toast({
          title: "Sesión cerrada",
          description: "Has cerrado sesión correctamente"
        });
        // Redirigir a la página principal después de cerrar sesión
        window.location.href = "/";
      } else {
        toast({
          title: "Error",
          description: "Hubo un problema al cerrar sesión",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión",
        variant: "destructive"
      });
    }
  };

  const isLinkActive = (path: string) => location === path;
  
  // Función para obtener las iniciales del usuario
  const getUserInitials = () => {
    if (!user) return "DM";
    if (user.firstName) return user.firstName.substring(0, 2).toUpperCase();
    if (user.email) return user.email.substring(0, 2).toUpperCase();
    return "DM";
  };

  // Función para formatear horarios desde la configuración
  const getFormattedBusinessHours = () => {
    if (!siteSettings) return "Lun-Vie: 9AM-7PM, Sáb: 9AM-2PM";
    
    const businessHours = siteSettings.find((setting: any) => setting.key === 'business_hours');
    if (!businessHours) return "Lun-Vie: 9AM-7PM, Sáb: 9AM-2PM";
    
    try {
      const hours = JSON.parse(businessHours.value);
      const formatTime = (time: string) => {
        if (time === "closed" || time === "Cerrado") return "Cerrado";
        return time;
      };
      
      const monday = formatTime(hours.monday || "");
      const saturday = formatTime(hours.saturday || "");
      
      if (monday && saturday && saturday !== "Cerrado") {
        return `Lun-Vie: ${monday}, Sáb: ${saturday}`;
      } else if (monday) {
        return `Lun-Vie: ${monday}`;
      }
      
      return "Lun-Vie: 9AM-7PM, Sáb: 9AM-2PM";
    } catch (error) {
      return "Lun-Vie: 9AM-7PM, Sáb: 9AM-2PM";
    }
  };

  // Verificar si mostrar horarios
  const shouldShowHours = () => {
    if (!siteSettings) return true;
    const showHours = siteSettings.find((setting: any) => setting.key === 'header_show_hours');
    return showHours ? showHours.value === 'true' : true;
  };

  return (
    <header>
      {/* Top Bar */}
      <div className="bg-primary text-white py-2">
        <div className="container mx-auto px-4">
          {/* Mobile: Solo teléfono y correo en una línea */}
          <div className="flex sm:hidden justify-center items-center space-x-4">
            <a
              href="tel:958790858"
              className="text-xs flex items-center hover:text-secondary"
            >
              <Phone size={14} className="mr-1" />
              958 790 858
            </a>
            <a
              href="mailto:info@desguacemurcia.com"
              className="text-xs flex items-center hover:text-secondary"
            >
              <Mail size={14} className="mr-1" />
              info@desguacemurcia.com
            </a>
          </div>
          
          {/* Desktop: Layout original */}
          <div className="hidden sm:flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <a
                href="tel:958790858"
                className="text-sm flex items-center hover:text-secondary"
              >
                <Phone size={14} className="mr-2" />
                958 790 858
              </a>
              <a
                href="mailto:info@desguacemurcia.com"
                className="text-sm flex items-center hover:text-secondary"
              >
                <Mail size={14} className="mr-2" />
                info@desguacemurcia.com
              </a>
            </div>
            {shouldShowHours() && (
              <div className="text-sm flex items-center">
                <Clock size={14} className="mr-2" />
                <span>{getFormattedBusinessHours()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Main Header */}
      <div className="bg-white py-4 shadow-md pt-[20px] pb-[20px]">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <img 
                src="/desguacesmurcia1.png" 
                alt="Desguace Murcia Logo" 
                className="h-16 md:h-20 w-auto"
                width="140"
                height="65"
                style={{
                  maxWidth: '140px',
                  maxHeight: '65px',
                  minWidth: '140px',
                  minHeight: '65px'
                }}
                decoding="async"
              />
            </Link>

            {/* Mobile Navigation Button - mostrar en móviles y tablets */}
            {isMobile && (
              <div className="flex items-center gap-2">
              <CartWidget />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/panel">
                        <User className="mr-2 h-4 w-4" />
                        Mi Panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/pedidos">
                        <Package className="mr-2 h-4 w-4" />
                        Mis Pedidos
                      </Link>
                    </DropdownMenuItem>
                    {(user.isAdmin || user.role === 'admin' || user.role === 'manager') && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/dashboard">
                          <User className="mr-2 h-4 w-4" />
                          Administración
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="icon">
                    <User />
                  </Button>
                </Link>
              )}
              
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  {/* Logotipo en el menú lateral */}
                  <div className="flex items-center justify-center py-4 mb-4 border-b">
                    <img 
                      src="/desguacesmurcia1.png" 
                      alt="Desguace Murcia Logo" 
                      className="h-12 w-auto"
                    />
                  </div>
                  <nav className="flex flex-col gap-4">
                    <Link 
                      href="/"
                      className={cn(
                        "px-3 py-2 font-montserrat font-medium transition-colors",
                        isLinkActive("/") ? "text-secondary" : ""
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Inicio
                    </Link>
                    <Link 
                      href="/vehiculos"
                      className={cn(
                        "px-3 py-2 font-montserrat font-medium transition-colors",
                        isLinkActive("/vehiculos") ? "text-secondary" : ""
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Vehículos
                    </Link>
                    <Link 
                      href="/piezas"
                      className={cn(
                        "px-3 py-2 font-montserrat font-medium transition-colors",
                        isLinkActive("/piezas") ? "text-secondary" : ""
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Piezas
                    </Link>
                    <Link 
                      href="/tasamos-tu-vehiculo"
                      className={cn(
                        "px-3 py-2 font-montserrat font-medium transition-colors",
                        isLinkActive("/tasamos-tu-vehiculo") ? "text-secondary" : ""
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Tasamos tu vehículo
                    </Link>
                    <Link 
                      href="/contacto"
                      className={cn(
                        "px-3 py-2 font-montserrat font-medium transition-colors",
                        isLinkActive("/contacto") ? "text-secondary" : ""
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Contacto
                    </Link>
                    {user && (user.isAdmin || user.role === 'admin' || user.role === 'manager') && (
                      <Link 
                        href="/admin/dashboard"
                        className={cn(
                          "px-3 py-2 font-montserrat font-medium transition-colors",
                          isLinkActive("/admin/dashboard") ? "text-secondary" : ""
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Administración
                      </Link>
                    )}
                    {!user && (
                      <Link 
                        href="/login" 
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Button className="w-full mb-2" variant="outline">
                          Iniciar Sesión
                        </Button>
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
              </div>
            )}

            {/* Desktop Navigation - ocultar en móviles y tablets */}
            {!isMobile && (
              <nav className="flex items-center justify-center flex-1">
              <ul className="flex flex-wrap items-center justify-center space-x-2 lg:space-x-6">
                <li>
                  <Link 
                    href="/"
                    className={cn(
                      "px-3 py-2 rounded font-montserrat font-medium transition-colors",
                      isLinkActive("/")
                        ? "text-secondary"
                        : "hover:text-secondary"
                    )}
                  >
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/vehiculos"
                    className={cn(
                      "px-3 py-2 rounded font-montserrat font-medium transition-colors",
                      isLinkActive("/vehiculos")
                        ? "text-secondary"
                        : "hover:text-secondary"
                    )}
                  >
                    Vehículos
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/piezas"
                    className={cn(
                      "px-3 py-2 rounded font-montserrat font-medium transition-colors",
                      isLinkActive("/piezas")
                        ? "text-secondary"
                        : "hover:text-secondary"
                    )}
                  >
                    Piezas
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/tasamos-tu-vehiculo"
                    className={cn(
                      "px-3 py-2 rounded font-montserrat font-medium transition-colors",
                      isLinkActive("/tasamos-tu-vehiculo")
                        ? "text-secondary"
                        : "hover:text-secondary"
                    )}
                  >
                    Tasamos tu vehículo
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/contacto"
                    className={cn(
                      "px-3 py-2 rounded font-montserrat font-medium transition-colors",
                      isLinkActive("/contacto")
                        ? "text-secondary"
                        : "hover:text-secondary"
                    )}
                  >
                    Contacto
                  </Link>
                </li>
                
                <li>
                  <CartWidget />
                </li>
                
                <li>
                  {user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getUserInitials()}</AvatarFallback>
                          </Avatar>
                          <span>Mi Cuenta</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/panel">
                            <User className="mr-2 h-4 w-4" />
                            Mi Panel
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/pedidos">
                            <Package className="mr-2 h-4 w-4" />
                            Mis Pedidos
                          </Link>
                        </DropdownMenuItem>
                        {(user.isAdmin || user.role === 'admin' || user.role === 'manager') && (
                          <DropdownMenuItem asChild>
                            <Link href="/admin/dashboard">
                              <User className="mr-2 h-4 w-4" />
                              Administración
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          Cerrar sesión
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Link href="/login">
                      <Button variant="outline" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Iniciar Sesión
                      </Button>
                    </Link>
                  )}
                </li>
              </ul>
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;