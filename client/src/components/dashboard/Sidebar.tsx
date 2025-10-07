import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdmin, isManager } from "@/utils/roleUtils";
import {
  LayoutDashboard,
  Database,
  Settings,
  Home,
  Car,
  Package,
  ShoppingCart,
  Users,
  HelpCircle,
  CreditCard,
  Download,
  Truck,
  Building2,
  FileText,
  Mail,
  UserCheck,
  Cookie,
  Menu,
  X,
  MousePointer,
  Wrench

} from "lucide-react";
import { LucideIcon } from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

interface SidebarMenuLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  external?: boolean;
}

interface SidebarMenuItemProps {
  children: React.ReactNode;
}

interface SidebarMenuButtonProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({ children }) => {
  return (
    <li className="w-full">
      {children}
    </li>
  );
};

const SidebarMenuButton: React.FC<SidebarMenuButtonProps> = ({ onClick, className, children }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full px-4 py-3 rounded-lg text-left transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
};

const SidebarMenuLink = ({ href, icon: Icon, label, isActive, external = false }: SidebarMenuLinkProps) => {
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (external) {
      window.open(href, '_blank');
    } else {
      navigate(href);
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className={cn(
          "w-full justify-start",
          isActive && "bg-primary-foreground text-primary font-medium"
        )}
      >
        <Icon className="h-5 w-5 mr-3" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const dashboardLinks = [
    {
      id: "dashboard",
      label: "Panel principal",
      icon: LayoutDashboard,
      href: "/admin/dashboard",
    },
  ];

  const inventoryLinks = [
    {
      id: "admin_vehicles",
      label: "Gestión Vehículos",
      icon: Car,
      href: "/admin/vehicles",
    },
    {
      id: "admin_parts",
      label: "Gestión Piezas",
      icon: Package,
      href: "/admin/parts",
    },
    {
      id: "imports",
      label: "Importación",
      icon: Database,
      href: "/admin/import-optimized",
    },
  ];

  const usersLinks = [
    {
      id: "admin_users",
      label: "Usuarios",
      icon: Users,
      href: "/admin/users",
    },
    {
      id: "admin_clients",
      label: "Clientes",
      icon: UserCheck,
      href: "/admin/clients",
    },
  ];

  const salesLinks = [
    {
      id: "admin_orders",
      label: "Pedidos",
      icon: ShoppingCart,
      href: "/admin/orders",
    },
  ];

  const adminSalesLinks = [
    {
      id: "admin_payment_methods",
      label: "Métodos de Pago",
      icon: CreditCard,
      href: "/admin/payment-methods",
    },
    {
      id: "admin_shipping",
      label: "Transportes",
      icon: Truck,
      href: "/admin/shipping",
    },
  ];

  const messagesLinks = [
    {
      id: "admin_messages",
      label: "Mensajes Recibidos",
      icon: Mail,
      href: "/admin/messages",
    },
  ];

  const configLinks = [
    {
      id: "admin_cms",
      label: "Gestión de Contenido",
      icon: FileText,
      href: "/admin/cms",
    },
    {
      id: "admin_popups",
      label: "Pop-ups",
      icon: MousePointer,
      href: "/admin/popups",
    },

    {
      id: "admin_email_config",
      label: "Configuración de Correos",
      icon: Settings,
      href: "/admin/email-config",
    },
    {
      id: "admin_cookie_settings",
      label: "Configuración de Cookies",
      icon: Cookie,
      href: "/admin/cookie-settings",
    },
    {
      id: "settings",
      label: "Configuración General",
      icon: Settings,
      href: "/admin/settings",
    },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLinkClick = (isMobile: boolean) => {
    if (isMobile) {
      closeMobileMenu();
    }
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SidebarContent = ({ isMobile = false }) => {
    // Determinar qué mostrar según el rol del usuario
    const userIsAdmin = user && isAdmin(user);
    const userIsManager = user && isManager(user);

    // Helper function to determine active link class
    const linkClass = (href: string) => {
      return location === href || location.startsWith(href + '/')
        ? "bg-primary-foreground text-primary font-medium"
        : "text-gray-200 hover:bg-primary-foreground/10";
    };

    return (
      <>
        <div className="p-4">
          {!isMobile && (
            <div className="flex items-center justify-center py-6">
              <div className="text-2xl font-montserrat font-bold text-center">
                {userIsAdmin ? "Administración" : "Panel de Gestión"}
              </div>
            </div>
          )}

          {isMobile && (
            <div className="flex items-center justify-center py-2">
              <div className="text-xl font-montserrat font-bold text-center">
                {userIsAdmin ? "Administración" : "Panel de Gestión"}
              </div>
            </div>
          )}

        {/* Dashboard Principal - Solo para usuarios autenticados */}
        {user && (
          <div className={`space-y-1 ${isMobile ? 'mt-4' : 'mt-8'}`}>
            <p className="px-4 py-2 text-xs uppercase text-gray-300 font-semibold">
              Principal
            </p>
            {dashboardLinks.map((link) => (
              <Link key={link.id} href={link.href}>
                <a
                  className={cn(
                    "flex items-center w-full px-4 py-3 rounded-lg text-left transition-colors",
                    linkClass(link.href)
                  )}
                  onClick={() => handleLinkClick(isMobile)}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        )}

        {/* Inventario - Solo para administradores */}
        {userIsAdmin && (
          <div className="space-y-1 mt-6">
            <p className="px-4 py-2 text-xs uppercase text-gray-300 font-semibold">
              Inventario
            </p>
            {inventoryLinks.map((link) => (
              <Link key={link.id} href={link.href}>
                <a
                  className={cn(
                    "flex items-center w-full px-4 py-3 rounded-lg transition-colors",
                    linkClass(link.href)
                  )}
                  onClick={() => handleLinkClick(isMobile)}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        )}

        {/* Usuarios - Para administradores y clientes para gestores */}
        {userIsManager && (
          <div className="space-y-1 mt-6">
            <p className="px-4 py-2 text-xs uppercase text-gray-300 font-semibold">
              Usuarios
            </p>
            {/* Solo clientes para gestores, todos los enlaces para administradores */}
            {(userIsAdmin ? usersLinks : usersLinks.filter(link => link.id === 'admin_clients')).map((link) => (
              <Link key={link.id} href={link.href}>
                <a
                  className={cn(
                    "flex items-center w-full px-4 py-3 rounded-lg transition-colors",
                    linkClass(link.href)
                  )}
                  onClick={() => handleLinkClick(isMobile)}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        )}

        {/* Ventas - Para gestores y administradores */}
        {userIsManager && (
          <div className="space-y-1 mt-6">
            <p className="px-4 py-2 text-xs uppercase text-gray-300 font-semibold">
              Ventas
            </p>
            {/* Solo pedidos para gestores */}
            {salesLinks.map((link) => (
              <Link key={link.id} href={link.href}>
                <a
                  className={cn(
                    "flex items-center w-full px-4 py-3 rounded-lg transition-colors",
                    linkClass(link.href)
                  )}
                  onClick={() => handleLinkClick(isMobile)}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  {link.label}
                </a>
              </Link>
            ))}
            {/* Pagos y transportes solo para administradores */}
            {userIsAdmin && adminSalesLinks.map((link) => (
              <Link key={link.id} href={link.href}>
                <a
                  className={cn(
                    "flex items-center w-full px-4 py-3 rounded-lg transition-colors",
                    linkClass(link.href)
                  )}
                  onClick={() => handleLinkClick(isMobile)}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        )}

        {/* Mensajes - Para gestores y administradores */}
        {userIsManager && (
          <div className="space-y-1 mt-6">
            <p className="px-4 py-2 text-xs uppercase text-gray-300 font-semibold">
              Comunicación
            </p>
            {messagesLinks.map((link) => (
              <Link key={link.id} href={link.href}>
                <a
                  className={cn(
                    "flex items-center w-full px-4 py-3 rounded-lg transition-colors",
                    linkClass(link.href)
                  )}
                  onClick={() => handleLinkClick(isMobile)}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        )}

        {/* Configuración - Solo para administradores */}
        {userIsAdmin && (
          <div className="space-y-1 mt-6">
            <p className="px-4 py-2 text-xs uppercase text-gray-300 font-semibold">
              Configuración
            </p>
            {configLinks.map((link) => (
              <Link key={link.id} href={link.href}>
                <a
                  className={cn(
                    "flex items-center w-full px-4 py-3 rounded-lg transition-colors",
                    linkClass(link.href)
                  )}
                  onClick={() => handleLinkClick(isMobile)}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        )}

        </div>
      </>
    );
  };

  return (
    <>
      {/* Botón hamburguesa móvil */}
      {!isMobileMenuOpen && (
        <div className="md:hidden fixed top-24 left-4 z-50">
          <button
            onClick={toggleMobileMenu}
            className="bg-primary text-white p-3 rounded-md shadow-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Sidebar móvil */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeMobileMenu} />
          <div className="relative flex flex-col w-64 bg-primary text-white min-h-screen">
            {/* Botón de cerrar dentro del sidebar */}
            <div className="flex justify-end p-4">
              <button
                onClick={closeMobileMenu}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <SidebarContent isMobile={true} />
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <div className="hidden md:flex flex-col w-64 bg-primary text-white min-h-screen">
        <SidebarContent isMobile={false} />
      </div>
    </>
  );
};

export default Sidebar;