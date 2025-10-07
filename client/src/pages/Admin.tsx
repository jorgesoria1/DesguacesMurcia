import React, { useEffect } from "react";
import { useLocation } from "wouter";
import AdminLoginForm from "@/components/AdminLoginForm";
import { useAuth } from "@/hooks/use-auth";

const Admin = () => {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  
  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (!isLoading && user && user.isAdmin) {
      navigate("/admin/dashboard");
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto mb-8 text-center">
        <h1 className="text-3xl font-montserrat font-bold mb-2">
          Panel de Administración
        </h1>
        <p className="text-muted-foreground">
          Acceda para gestionar la tienda y las importaciones de API
        </p>
      </div>
      
      <AdminLoginForm />
    </div>
  );
};

export default Admin;
