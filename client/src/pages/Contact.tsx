import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { setContactTitle } from '@/utils/seo';

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CentralBanner from "@/components/CentralBanner";
import bannerImage from "../assets/banner/contacto-banner.png";

const contactFormSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres",
  }),
  email: z.string().email({
    message: "Ingrese un correo electrónico válido",
  }),
  phone: z.string().min(9, {
    message: "Ingrese un número de teléfono válido",
  }),
  subject: z.string().min(3, {
    message: "El asunto debe tener al menos 3 caracteres",
  }),
  message: z.string().min(10, {
    message: "El mensaje debe tener al menos 10 caracteres",
  }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const Contact: React.FC = () => {
  // SEO simple - solo título
  useEffect(() => {
    setContactTitle();
  }, []);
  
  const { toast } = useToast();
  
  // Cargar contenido de contacto desde el CMS
  const { data: contactPage, isLoading: pageLoading } = useQuery({
    queryKey: ['/api/cms/pages/contacto'],
    queryFn: async () => {
      const response = await fetch('/api/cms/pages/contacto');
      if (!response.ok) {
        throw new Error('Error al cargar página de contacto');
      }
      return response.json();
    },
  });
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    try {
      console.log('📤 [Contact Form] Enviando datos:', data);
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('📤 [Contact Form] Respuesta del servidor:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [Contact Form] Respuesta exitosa:', result);
        toast({
          title: "Mensaje enviado",
          description: "Hemos recibido tu mensaje. Nos pondremos en contacto contigo lo antes posible.",
          variant: "default",
        });
        form.reset();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [Contact Form] Error del servidor:', errorData);
        throw new Error(errorData.error || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('❌ [Contact Form] Error completo:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el mensaje. Inténtelo de nuevo.",
        variant: "destructive",
      });
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
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

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de contacto funcional */}
        <div className="lg:col-span-2">
          <CentralBanner 
            imageSrc={bannerImage} 
            alt="Contacto - Desguace Murcia" 
            overlayIntensity="light"
          />
          <Card>
            <CardContent className="p-6">
              {/* Título dentro de la columna del formulario */}
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-montserrat font-semibold text-primary mb-2">
                  {contactPage?.title || "Contacto"}
                </h1>
                <p className="text-sm text-gray-600 mb-4">
                  {contactPage?.metaDescription || "¿Tienes alguna pregunta? ¡Estamos aquí para ayudarte!"}
                </p>
                
                {/* Divisor decorativo */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-0.5 bg-gradient-to-r from-primary to-blue-800 rounded-full"></div>
                  <div className="mx-4 text-primary text-lg">•</div>
                  <div className="w-20 h-0.5 bg-gradient-to-l from-primary to-blue-800 rounded-full"></div>
                </div>
              </div>
              
              <h2 className="text-xl font-montserrat font-semibold mb-6">
                Envíenos un mensaje
              </h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Tu nombre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <Input placeholder="ejemplo@correo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="600 123 456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asunto</FormLabel>
                          <FormControl>
                            <Input placeholder="Asunto de tu mensaje" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensaje</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Escribe tu mensaje aquí..." 
                            className="min-h-[150px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-secondary"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Enviando..." : "Enviar mensaje"}
                  </Button>
                </form>
              </Form>
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
        </div>
      </div>
    </div>
  );
};

export default Contact;