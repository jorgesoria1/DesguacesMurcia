import React from 'react';
import { Link } from 'wouter';
import { useMobileView } from '@/hooks/use-mobile-view';

interface MobileLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Componente de enlace que mantiene el parámetro platform=mobile
 * cuando se navega entre páginas en modo móvil
 */
export const MobileLink: React.FC<MobileLinkProps> = ({ 
  href, 
  children, 
  className,
  onClick,
  ...props 
}) => {
  const { getMobileUrl } = useMobileView();
  
  // Modificar el href para incluir platform=mobile si es necesario
  const mobileHref = getMobileUrl(href);
  
  return (
    <Link 
      href={mobileHref} 
      className={className} 
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
};