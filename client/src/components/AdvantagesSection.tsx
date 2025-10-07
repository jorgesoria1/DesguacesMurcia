import React from "react";
import { Tag, Truck, Shield, BookOpen } from "lucide-react";

const AdvantagesSection: React.FC = () => {
  const advantages = [
    {
      icon: <Tag className="h-6 w-6" />,
      title: "Mejores precios",
      description: "Mantenemos el precio más bajo los 365 días"
    },
    {
      icon: <Truck className="h-6 w-6" />,
      title: "Servicio Express",
      description: "Nuestro servicio de envío express te lo pone fácil y rápido"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Garantía",
      description: "Todos nuestros productos están 100% garantizados"
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Catálogo",
      description: "Amplio catálogo de recambios y accesorios para tu coche"
    }
  ];

  return (
    <div className="mt-6 space-y-4">
      {advantages.map((advantage, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
            {advantage.icon}
          </div>
          <h4 className="font-semibold text-sm mb-2 text-primary">
            {advantage.title}
          </h4>
          <p className="text-xs text-gray-600 leading-tight">
            {advantage.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AdvantagesSection;