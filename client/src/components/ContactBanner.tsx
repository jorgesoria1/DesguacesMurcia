import React from "react";
import { Phone } from "lucide-react";

const ContactBanner: React.FC = () => {
  const handlePhoneClick = () => {
    window.location.href = "tel:+34958790858";
  };

  return (
    <div className="mt-6 bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] rounded-lg shadow-lg p-6 text-white text-center cursor-pointer hover:from-[#1e40af] hover:to-[#1d4ed8] transition-all duration-300 transform hover:scale-105"
         onClick={handlePhoneClick}>
      <div className="flex items-center justify-center mb-3">
        <Phone className="h-6 w-6 mr-2 animate-pulse" />
        <h3 className="text-lg font-bold">
          ¿Hablamos?
        </h3>
      </div>
      <p className="text-2xl font-bold tracking-wider">
        958 790 858
      </p>
      <p className="text-sm mt-2 opacity-90">
        Llámanos ahora
      </p>
    </div>
  );
};

export default ContactBanner;