import React from 'react';
import { Link } from 'wouter';
import { useMobileView } from '@/hooks/use-mobile-view';

interface AppLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: any;
}

/**
 * Componente de enlace inteligente que preserva el modo móvil entre navegaciones
 * Si la aplicación está en modo móvil, mantiene el parámetro platform=mobile al navegar
 */
export const AppLink: React.FC<AppLinkProps> = ({ 
  href, 
  children, 
  className,
  onClick,
  ...props 
}) => {
  const { isMobileView, getMobileUrl } = useMobileView();
  
  // Modificar el href para incluir platform=mobile si estamos en modo móvil
  const finalHref = isMobileView ? getMobileUrl(href) : href;
  
  return (
    <Link 
      href={finalHref} 
      className={className} 
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
};