import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { configApi } from '@/lib/api';

const ChatbotScript: React.FC = () => {
  const { data: chatbotConfig } = useQuery({
    queryKey: ['/api/config/chatbot'],
    queryFn: () => configApi.getChatbotConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (chatbotConfig?.chatbotCode) {
      try {
        // Remover script anterior si existe
        const existingScript = document.getElementById('voiceflow-chatbot');
        if (existingScript) {
          existingScript.remove();
        }

        // Crear nuevo script usando textContent para prevenir XSS
        const script = document.createElement('script');
        script.id = 'voiceflow-chatbot';
        script.type = 'text/javascript';
        script.textContent = chatbotConfig.chatbotCode.replace(/<script[^>]*>|<\/script>/gi, '');
        
        // Agregar manejador de errores
        script.onerror = (error) => {
          console.error('❌ Error cargando código del chatbot:', error);
        };
        
        // Insertar al final del body
        document.body.appendChild(script);
      } catch (error) {
        console.error('❌ Error procesando chatbot:', error);
      }
    }
  }, [chatbotConfig]);

  return null; // Este componente no renderiza nada visible
};

export default ChatbotScript;