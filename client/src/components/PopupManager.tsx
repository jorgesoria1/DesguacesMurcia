import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import DOMPurify from 'dompurify';

interface Popup {
  id: number;
  title: string;
  content: string;
  image?: string;
  type: 'info' | 'warning' | 'promotion' | 'announcement';
  position: 'center' | 'top' | 'bottom' | 'corner';
  trigger: 'immediate' | 'delay' | 'scroll' | 'exit';
  triggerValue: number;
  displayFrequency: 'always' | 'once_per_session' | 'once_per_user' | 'daily';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  priority: number;
  targetPages?: string[];
  excludePages?: string[];
  buttonText: string;
  buttonAction: 'close' | 'redirect' | 'external';
  buttonUrl?: string;
  showCloseButton: boolean;
  backdropClose: boolean;
  styles?: any;
}

interface PopupManagerProps {
  userId?: number;
}

const PopupManager: React.FC<PopupManagerProps> = ({ userId }) => {
  const [location] = useLocation();
  const [sessionId] = useState(() => 
    sessionStorage.getItem('sessionId') || Math.random().toString(36).substr(2, 9)
  );
  const [shownPopups, setShownPopups] = useState<Set<number>>(new Set());
  const [activePopup, setActivePopup] = useState<Popup | null>(null);
  const [displayedToday, setDisplayedToday] = useState<Set<number>>(new Set());

  // Guardar sessionId
  useEffect(() => {
    sessionStorage.setItem('sessionId', sessionId);
  }, [sessionId]);

  // Obtener pop-ups activos
  const { data: popupsData } = useQuery({
    queryKey: ['/api/popups/active', location],
    queryFn: async () => {
      const response = await fetch(`/api/popups/active?page=${encodeURIComponent(location)}`);
      if (!response.ok) throw new Error('Error al obtener pop-ups');
      return response.json();
    },
    refetchInterval: 60000, // Refrescar cada minuto
  });

  // Registrar estadística de pop-up
  const recordStatMutation = useMutation({
    mutationFn: async ({ popupId, action }: { popupId: number; action: string }) => {
      const response = await fetch('/api/popups/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          popupId,
          action,
          page: location,
          sessionId,
          userId
        })
      });
      if (!response.ok) throw new Error('Error al registrar estadística');
      return response.json();
    }
  });

  // Cargar configuración de sesión/usuario
  useEffect(() => {
    // Cargar pop-ups mostrados en la sesión
    const sessionShown = sessionStorage.getItem('shownPopups');
    if (sessionShown) {
      setShownPopups(new Set(JSON.parse(sessionShown)));
    }

    // Cargar pop-ups mostrados hoy (solo si hay userId)
    if (userId) {
      const today = new Date().toDateString();
      const todayKey = `popupsToday_${userId}_${today}`;
      const todayShown = localStorage.getItem(todayKey);
      if (todayShown) {
        setDisplayedToday(new Set(JSON.parse(todayShown)));
      }
    }
  }, [userId]);

  // Procesar y mostrar pop-ups
  useEffect(() => {
    if (!popupsData?.popups?.length) return;
    

    const eligiblePopups = popupsData.popups.filter((popup: Popup) => {
      // Verificar frecuencia de visualización
      switch (popup.displayFrequency) {
        case 'once_per_session':
          if (shownPopups.has(popup.id)) return false;
          break;
        case 'once_per_user':
          if (userId && localStorage.getItem(`popup_shown_${userId}_${popup.id}`)) return false;
          break;
        case 'daily':
          if (displayedToday.has(popup.id)) return false;
          break;
        case 'always':
        default:
          // Siempre mostrar (con un pequeño delay para evitar spam)
          if (shownPopups.has(popup.id)) {
            const lastShown = sessionStorage.getItem(`popup_last_${popup.id}`);
            if (lastShown && Date.now() - parseInt(lastShown) < 30000) return false; // 30 segundos de cooldown
          }
          break;
      }

      return true;
    });

    if (eligiblePopups.length === 0) return;

    // Ordenar por prioridad y seleccionar el primero
    const sortedPopups = eligiblePopups.sort((a: Popup, b: Popup) => b.priority - a.priority);
    const popupToShow = sortedPopups[0];

    // Aplicar trigger
    const showPopup = () => {
      setActivePopup(popupToShow);
      recordStatMutation.mutate({ popupId: popupToShow.id, action: 'viewed' });
      
      // Marcar como mostrado
      const newShownPopups = new Set(shownPopups).add(popupToShow.id);
      setShownPopups(newShownPopups);
      sessionStorage.setItem('shownPopups', JSON.stringify([...newShownPopups]));
      sessionStorage.setItem(`popup_last_${popupToShow.id}`, Date.now().toString());

      // Guardar en localStorage si es necesario
      if (popupToShow.displayFrequency === 'once_per_user' && userId) {
        localStorage.setItem(`popup_shown_${userId}_${popupToShow.id}`, 'true');
      } else if (popupToShow.displayFrequency === 'daily' && userId) {
        const today = new Date().toDateString();
        const todayKey = `popupsToday_${userId}_${today}`;
        const newDisplayedToday = new Set(displayedToday).add(popupToShow.id);
        setDisplayedToday(newDisplayedToday);
        localStorage.setItem(todayKey, JSON.stringify([...newDisplayedToday]));
      }
    };

    // Aplicar trigger
    switch (popupToShow.trigger) {
      case 'immediate':
        setTimeout(showPopup, 100); // Pequeño delay para que la página termine de cargar
        break;
      case 'delay':
        setTimeout(showPopup, (popupToShow.triggerValue || 3) * 1000);
        break;
      case 'scroll':
        const handleScroll = () => {
          const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
          
          if (scrollPercent >= (popupToShow.triggerValue || 50)) {
            showPopup();
            window.removeEventListener('scroll', handleScroll);
          }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      case 'exit':
        const handleMouseLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) {
            showPopup();
            document.removeEventListener('mouseleave', handleMouseLeave);
          }
        };
        document.addEventListener('mouseleave', handleMouseLeave);
        return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, [popupsData, shownPopups, displayedToday, userId, location]);

  const handleClose = () => {
    if (activePopup) {
      recordStatMutation.mutate({ popupId: activePopup.id, action: 'closed' });
    }
    setActivePopup(null);
  };

  const handleButtonClick = () => {
    if (!activePopup) return;

    recordStatMutation.mutate({ popupId: activePopup.id, action: 'clicked' });

    switch (activePopup.buttonAction) {
      case 'close':
        handleClose();
        break;
      case 'redirect':
        if (activePopup.buttonUrl) {
          window.location.href = activePopup.buttonUrl;
        }
        handleClose();
        break;
      case 'external':
        if (activePopup.buttonUrl) {
          window.open(activePopup.buttonUrl, '_blank', 'noopener,noreferrer');
        }
        handleClose();
        break;
    }
  };

  const handleBackdropClick = () => {
    if (activePopup?.backdropClose) {
      recordStatMutation.mutate({ popupId: activePopup.id, action: 'ignored' });
      handleClose();
    }
  };

  if (!activePopup) return null;

  const getPositionClasses = () => {
    switch (activePopup.position) {
      case 'top': return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom': return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'corner': return 'bottom-4 right-4';
      case 'center':
      default: return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }
  };

  const getTypeClasses = () => {
    switch (activePopup.type) {
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'promotion': return 'border-green-500 bg-green-50';
      case 'announcement': return 'border-blue-500 bg-blue-50';
      case 'info':
      default: return 'border-gray-300 bg-white';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          relative max-w-md mx-4 p-6 rounded-lg shadow-xl border-2 
          ${getTypeClasses()} 
          ${activePopup.position !== 'center' ? `fixed ${getPositionClasses()}` : ''}
        `}
        style={activePopup.styles}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cerrar */}
        {activePopup.showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        )}

        {/* Contenido del pop-up */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">
            {activePopup.title}
          </h3>
          
          {/* Imagen del pop-up */}
          {activePopup.image && (
            <div className="mb-3">
              <img
                src={activePopup.image}
                alt={activePopup.title}
                className="w-full max-h-48 object-cover rounded-md"
              />
            </div>
          )}
          
          <div 
            className="text-gray-600 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activePopup.content, {
              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span'],
              ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
              ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
            }) }}
          />
        </div>

        {/* Botón de acción */}
        <div className="flex justify-end">
          <button
            onClick={handleButtonClick}
            className={`
              px-4 py-2 rounded-md font-medium transition-colors
              ${activePopup.type === 'promotion' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : activePopup.type === 'warning'
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {activePopup.buttonAction === 'external' && (
              <ExternalLink size={16} className="inline mr-1" />
            )}
            {activePopup.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupManager;