import React from "react";
import Sidebar from "@/components/dashboard/Sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 p-8">
        <div className="mb-6">
          {/* Espacio para el título que viene del children */}
        </div>
        
        {/* Renderizar el contenido hijo */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;