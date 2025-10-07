import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User } from "lucide-react";
import DOMPurify from "dompurify";
import CentralBanner from "@/components/CentralBanner";
import nosotrosBanner from "../assets/banner/nosotros-banner.png";
import formasPagoBanner from "../assets/banner/formas-pago-banner.png";
import avisoLegalBanner from "../assets/banner/aviso-legal-banner.png";
import politicaEnviosBanner from "../assets/banner/politica-envios-banner.png";
import condicionesCompraBanner from "../assets/banner/condiciones-compra-banner.png";

interface Page {
  id: number;
  slug: string;
  title: string;
  metaDescription: string | null;
  content: string;
  isPublished: boolean;
  pageType: string;
  formConfig: any;
  createdAt: string;
  updatedAt: string;
}

export default function DynamicPage() {
  const params = useParams<{ slug: string }>();
  const [location] = useLocation();
  
  // Obtener slug desde params o desde la URL directamente
  const slug = params.slug || location.replace('/', '');

  // Función para obtener la imagen del banner según el slug
  const getBannerImage = (pageSlug: string) => {
    switch (pageSlug) {
      case 'formas-pago':
        return formasPagoBanner;
      case 'aviso-legal':
        return avisoLegalBanner;
      case 'politica-envios':
        return politicaEnviosBanner;
      case 'condiciones-compra':
        return condicionesCompraBanner;
      case 'nosotros':
      default:
        return nosotrosBanner;
    }
  };

  const { data: page, isLoading, error } = useQuery({
    queryKey: [`/api/cms/pages/${slug}`],
    queryFn: async () => {
      const response = await fetch(`/api/cms/pages/${slug}`);
      if (!response.ok) {
        throw new Error('Página no encontrada');
      }
      return response.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Página no encontrada</h1>
            <p className="text-muted-foreground">
              La página que buscas no existe o no está disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Configurar meta tags dinámicamente
  if (typeof document !== 'undefined') {
    document.title = page.title;
    
    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && page.metaDescription) {
      metaDescription.setAttribute('content', page.metaDescription);
    } else if (page.metaDescription) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = page.metaDescription;
      document.head.appendChild(meta);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contenido principal */}
        <div className="lg:col-span-2">
          <CentralBanner 
            imageSrc={getBannerImage(slug)} 
            alt={`${page.title} - Desguace Murcia`}
            overlayIntensity="light"
          />
          <Card>
            <CardContent className="p-6">
              {/* Título dentro de la columna principal */}
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-montserrat font-semibold text-primary mb-2">
                  {page.title}
                </h1>
                
                {page.metaDescription && (
                  <p className="text-sm text-gray-600 mb-4">
                    {page.metaDescription}
                  </p>
                )}
                
                {/* Divisor decorativo */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-0.5 bg-gradient-to-r from-primary to-blue-800 rounded-full"></div>
                  <div className="mx-4 text-primary text-lg">•</div>
                  <div className="w-20 h-0.5 bg-gradient-to-l from-primary to-blue-800 rounded-full"></div>
                </div>
              </div>
              
              <div 
                className="prose prose-sm max-w-none [&>p]:text-xs [&>p]:leading-relaxed [&>h1]:text-xl [&>h1]:font-montserrat [&>h1]:font-semibold [&>h1]:text-gray-800 [&>h2]:text-base [&>h2]:font-montserrat [&>h2]:font-semibold [&>h2]:text-gray-800 [&>h3]:text-base [&>h3]:font-montserrat [&>h3]:font-semibold [&>h3]:text-gray-800"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'img', 'blockquote'],
                  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'width', 'height'],
                  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
                }) }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Información de contacto */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-montserrat font-semibold mb-6">
                Información de contacto
              </h2>
              
              <div className="space-y-6">
                <div className="flex">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
                    📍
                  </div>
                  <div className="ml-4">
                    <h3 className="font-montserrat font-semibold mb-1">Dirección</h3>
                    <p className="text-gray-600">
                      Carretera Almuñecar, Km 1.5<br />
                      18640 Granada
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
                    📞
                  </div>
                  <div className="ml-4">
                    <h3 className="font-montserrat font-semibold mb-1">Teléfono</h3>
                    <p className="text-gray-600">
                      <a href="tel:958790858" className="hover:text-primary">
                        958 790 858
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
                    ✉️
                  </div>
                  <div className="ml-4">
                    <h3 className="font-montserrat font-semibold mb-1">Email</h3>
                    <p className="text-gray-600">
                      <a href="mailto:info@desguacemurcia.com" className="hover:text-primary">
                        info@desguacemurcia.com
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
                    🕒
                  </div>
                  <div className="ml-4">
                    <h3 className="font-montserrat font-semibold mb-1">Horario</h3>
                    <p className="text-gray-600">
                      Lun-Vie: de 8:00h. a 13:30h. y de 16:00h. a 17:30h
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mapa */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-montserrat font-semibold mb-4">Ubicación</h3>
              <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                <iframe 
                  src="https://maps.google.com/maps?q=Carretera%20Almu%C3%B1ecar%20Km%201.5%2018640%20Granada%20Spain&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  title="Mapa de ubicación - Granada"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </CardContent>
          </Card>

          {/* Características del servicio */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                    🏷️
                  </div>
                  <h3 className="text-lg font-montserrat font-semibold mb-2 text-primary">Mejores precios</h3>
                  <p className="text-sm text-gray-600">
                    Mantenemos el precio más bajo los 365 días
                  </p>
                </div>

                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                    🚚
                  </div>
                  <h3 className="text-lg font-montserrat font-semibold mb-2 text-primary">Servicio Express</h3>
                  <p className="text-sm text-gray-600">
                    Nuestro servicio de envío express te lo pone fácil y rápido
                  </p>
                </div>

                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                    🛡️
                  </div>
                  <h3 className="text-lg font-montserrat font-semibold mb-2 text-primary">Garantía</h3>
                  <p className="text-sm text-gray-600">
                    Todos nuestros productos están 100% garantizados
                  </p>
                </div>

                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                    📚
                  </div>
                  <h3 className="text-lg font-montserrat font-semibold mb-2 text-primary">Catálogo</h3>
                  <p className="text-sm text-gray-600">
                    Amplio catálogo de recambios y accesorios para tu coche
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}