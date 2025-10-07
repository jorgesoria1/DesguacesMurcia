import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DOMPurify from "dompurify";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FooterBlock {
  id: number;
  title: string;
  content: string;
  blockType: string;
  sortOrder: number;
  isActive: boolean;
}

interface SiteSetting {
  key: string;
  value: string;
}

const Footer: React.FC = () => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});
  
  const { data: footerBlocks } = useQuery({
    queryKey: ['/api/cms/footer-blocks'],
    queryFn: () => fetch('/api/cms/footer-blocks').then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: settings } = useQuery({
    queryKey: ['/api/cms/settings'],
    queryFn: () => fetch('/api/cms/settings').then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const getSetting = (key: string) => {
    if (!settings) return '';
    const setting = settings.find((s: SiteSetting) => s.key === key);
    return setting ? setting.value : '';
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleInternalLinkClick = (href: string) => {
    // Si es un enlace interno, hacer scroll al inicio
    if (href.startsWith('/')) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const renderBlock = (block: FooterBlock, isMobile: boolean = false) => {
    const isOpen = openSections[`block-${block.id}`] || false;
    const sectionId = `block-${block.id}`;
    
    const renderContent = () => {
      switch (block.blockType) {
        case 'contact':
          return <div className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'div', 'span'],
            ALLOWED_ATTR: ['href', 'target', 'rel']
          }) }} />;

        case 'hours':
          return <div className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'div', 'span'],
            ALLOWED_ATTR: ['href', 'target', 'rel']
          }) }} />;

        case 'links':
          try {
            const linksData = JSON.parse(block.content);
            return (
              <ul className="space-y-2 text-sm">
                {linksData.links?.map((link: any, index: number) => (
                  <li key={index}>
                    <Link 
                      href={link.url} 
                      className="hover:text-secondary transition-colors"
                      onClick={() => handleInternalLinkClick(link.url)}
                    >
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            );
          } catch {
            return null;
          }

        case 'text':
          return <div className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'div', 'span'],
            ALLOWED_ATTR: ['href', 'target', 'rel']
          }) }} />;

        case 'social':
          return (
            <>
              <p className="mb-4 text-sm">
                Suscríbase a nuestro boletín para recibir actualizaciones y
                ofertas especiales.
              </p>
              <form className="mb-4" onSubmit={(e) => e.preventDefault()}>
                <div className="flex gap-2 sm:gap-0">
                  <Input
                    type="email"
                    placeholder="Su correo electrónico"
                    className="sm:rounded-r-none bg-white text-black text-sm"
                  />
                  <Button
                    type="submit"
                    className="bg-secondary hover:bg-blue-900 hover:text-white sm:rounded-l-none px-3"
                    size="sm"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </form>
              <p className="text-sm">
                Al suscribirse, acepta nuestra política de privacidad.
              </p>
              <div className="flex space-x-4 mt-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-secondary transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook size={20} />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-secondary transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter size={20} />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-secondary transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-secondary transition-colors"
                  aria-label="Youtube"
                >
                  <Youtube size={20} />
                </a>
              </div>
            </>
          );

        default:
          return null;
      }
    };

    if (isMobile) {
      return (
        <div key={block.id} className="border-b border-gray-700 pb-4">
          <button
            onClick={() => toggleSection(sectionId)}
            className="w-full flex justify-between items-center py-2 text-left"
          >
            <h3 className="text-lg font-montserrat font-semibold">
              {block.title}
            </h3>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {isOpen && (
            <div className="mt-4 pb-2 text-sm">
              {renderContent()}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div key={block.id}>
          <h3 className="text-xl font-montserrat font-semibold mb-4">
            {block.title}
          </h3>
          {renderContent()}
        </div>
      );
    }
  };

  const renderCompanyInfo = (isMobile: boolean = false) => {
    const isOpen = openSections['company-info'] || false;
    const sectionId = 'company-info';
    
    if (isMobile) {
      return (
        <div className="border-b border-gray-700 pb-4">
          <button
            onClick={() => toggleSection(sectionId)}
            className="w-full flex justify-between items-center py-2 text-left"
          >
            <h3 className="text-lg font-montserrat font-semibold">
              {getSetting('site_name') || 'Desguace Murcia'}
            </h3>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {isOpen && (
            <div className="mt-4 pb-2">
              <p className="text-sm">
                {getSetting('site_description') || 'Su proveedor de confianza para piezas de automóviles de calidad y garantía.'}
              </p>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div>
          <h3 className="text-xl font-montserrat font-semibold mb-4">
            {getSetting('site_name') || 'Desguace Murcia'}
          </h3>
          <p className="mb-4 text-sm">
            {getSetting('site_description') || 'Su proveedor de confianza para piezas de automóviles de calidad y garantía.'}
          </p>
        </div>
      );
    }
  };

  return (
    <footer className="bg-primary text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        {/* Mobile: Collapsible sections */}
        <div className="block sm:hidden space-y-4 mb-8">
          {renderCompanyInfo(true)}
          {footerBlocks?.map((block: FooterBlock) => renderBlock(block, true))}
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-10">
          {renderCompanyInfo(false)}
          {footerBlocks?.map((block: FooterBlock) => renderBlock(block, false))}
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-700 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs sm:text-sm mb-2 sm:mb-0 text-center sm:text-left">
              &copy; {new Date().getFullYear()} {getSetting('site_name') || 'Desguace Murcia'}. Todos los
              derechos reservados.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-end gap-3 sm:gap-4">
              <Link 
                href="/aviso-legal" 
                className="text-xs sm:text-sm hover:text-secondary"
                onClick={() => handleInternalLinkClick('/aviso-legal')}
              >
                Aviso Legal
              </Link>
              <Link 
                href="/politica-privacidad" 
                className="text-xs sm:text-sm hover:text-secondary"
                onClick={() => handleInternalLinkClick('/politica-privacidad')}
              >
                Política de Privacidad
              </Link>
              <Link 
                href="/politica-cookies" 
                className="text-xs sm:text-sm hover:text-secondary"
                onClick={() => handleInternalLinkClick('/politica-cookies')}
              >
                Política de Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
