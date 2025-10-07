import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { setValueTitle } from '@/utils/seo';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Car, CheckCircle, Camera } from "lucide-react";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import CentralBanner from "@/components/CentralBanner";
import bannerImage from "../assets/banner/tasacion-banner-vehiculo.png";

const vehicleFormSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres",
  }),
  email: z.string().email({
    message: "Ingrese un correo electrónico válido",
  }),
  phone: z.string().min(9, {
    message: "Ingrese un número de teléfono válido",
  }),
  make: z.string().min(1, {
    message: "Selecciona la marca de tu vehículo",
  }),
  model: z.string().min(1, {
    message: "Introduce el modelo de tu vehículo",
  }),
  year: z.string().min(4, {
    message: "Introduce el año de tu vehículo",
  }),
  kilometer: z.string().min(1, {
    message: "Introduce los kilómetros de tu vehículo",
  }),
  fuel: z.string().min(1, {
    message: "Selecciona el tipo de combustible",
  }),
  condition: z.string().min(1, {
    message: "Describa el estado del vehículo",
  }),
  additional: z.string().optional(),
  images: z.array(z.string()).default([]).optional(),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

const ValueYourVehicle: React.FC = () => {
  // SEO simple - solo título
  useEffect(() => {
    setValueTitle();
  }, []);
  
  const { toast } = useToast();
  
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      make: "",
      model: "",
      year: "",
      kilometer: "",
      fuel: "",
      condition: "",
      additional: "",
      images: [],
    },
  });

  const onSubmit = async (data: VehicleFormValues) => {
    try {
      console.log("🚗 [Vehicle Form] Enviando datos del formulario:", data);

      // Preparar los datos para envío
      const formDataToSend = {
        ...data,
        images: data.images || [],
        timestamp: new Date().toISOString(),
      };

      console.log("🚗 [Vehicle Form] Datos preparados para envío:", formDataToSend);

      // Enviar los datos al endpoint backend
      const response = await fetch('/api/vehicle-valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataToSend),
      });

      console.log('🚗 [Vehicle Form] Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [Vehicle Form] Error del servidor:', errorData);
        throw new Error(errorData.error || 'Error al enviar la solicitud');
      }

      const result = await response.json();
      console.log('✅ [Vehicle Form] Respuesta exitosa:', result);

      // Mostrar mensaje de éxito
      toast({
        title: "Solicitud enviada",
        description: `Hemos recibido tu solicitud de tasación para ${data.make} ${data.model} ${data.year}${data.images && data.images.length > 0 ? ` con ${data.images.length} imágenes` : ''}. Nos pondremos en contacto contigo lo antes posible.`,
      });
      
      // Restablecer el formulario
      form.reset();
    } catch (error) {
      console.error('❌ [Vehicle Form] Error completo:', error);
      toast({
        title: "Error al enviar",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al enviar su solicitud. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CentralBanner 
            imageSrc={bannerImage} 
            alt="Tasación de vehículos - Desguace Murcia" 
          />
          <Card>
            <CardContent className="p-6">
              {/* Título dentro de la columna del formulario */}
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-montserrat font-semibold text-primary mb-2">
                  Tasamos tu Vehículo
                </h1>
                <p className="text-sm text-gray-600 mb-4">
                  Obtén una valoración gratuita de tu vehículo
                </p>
                
                {/* Divisor decorativo */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-0.5 bg-gradient-to-r from-primary to-blue-800 rounded-full"></div>
                  <div className="mx-4 text-primary text-lg">•</div>
                  <div className="w-20 h-0.5 bg-gradient-to-l from-primary to-blue-800 rounded-full"></div>
                </div>
              </div>
              
              <h2 className="text-xl font-montserrat font-semibold mb-6">
                Formulario de tasación
              </h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Datos de contacto */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Datos de contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Su nombre" {...field} />
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
                    </div>
                  </div>
                  
                  {/* Datos del vehículo */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Datos del vehículo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="make"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marca</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona una marca" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Audi">Audi</SelectItem>
                                <SelectItem value="BMW">BMW</SelectItem>
                                <SelectItem value="Citroën">Citroën</SelectItem>
                                <SelectItem value="Fiat">Fiat</SelectItem>
                                <SelectItem value="Ford">Ford</SelectItem>
                                <SelectItem value="Honda">Honda</SelectItem>
                                <SelectItem value="Hyundai">Hyundai</SelectItem>
                                <SelectItem value="Kia">Kia</SelectItem>
                                <SelectItem value="Mercedes">Mercedes</SelectItem>
                                <SelectItem value="Nissan">Nissan</SelectItem>
                                <SelectItem value="Opel">Opel</SelectItem>
                                <SelectItem value="Peugeot">Peugeot</SelectItem>
                                <SelectItem value="Renault">Renault</SelectItem>
                                <SelectItem value="Seat">Seat</SelectItem>
                                <SelectItem value="Toyota">Toyota</SelectItem>
                                <SelectItem value="Volkswagen">Volkswagen</SelectItem>
                                <SelectItem value="Volvo">Volvo</SelectItem>
                                <SelectItem value="otros">Otros</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modelo</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. Golf, León, Megane..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Año de matriculación</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. 2015" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="kilometer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kilómetros</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. 120000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fuel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Combustible</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona tipo de combustible" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Gasolina">Gasolina</SelectItem>
                                <SelectItem value="Diesel">Diesel</SelectItem>
                                <SelectItem value="Híbrido">Híbrido</SelectItem>
                                <SelectItem value="Eléctrico">Eléctrico</SelectItem>
                                <SelectItem value="GLP/GNC">GLP/GNC</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado general</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Excelente">Excelente</SelectItem>
                                <SelectItem value="Bueno">Bueno</SelectItem>
                                <SelectItem value="Normal">Normal</SelectItem>
                                <SelectItem value="Necesita reparaciones">Necesita reparaciones</SelectItem>
                                <SelectItem value="Averiado/Siniestro">Averiado/Siniestro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="additional"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Información adicional</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describa cualquier característica adicional, extras, reparaciones necesarias, etc." 
                            className="min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sección de imágenes */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Camera className="mr-2 text-primary" />
                      Imágenes del vehículo
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sube fotos de tu vehículo para obtener una tasación más precisa. Se recomiendan imágenes del exterior, interior y cualquier daño visible.
                    </p>
                    <FormField
                      control={form.control}
                      name="images"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <MultiImageUpload
                              value={field.value || []}
                              onChange={field.onChange}
                              maxImages={8}
                              disabled={form.formState.isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-secondary"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Enviando..." : "Solicitar tasación"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-montserrat font-semibold mb-6 flex items-center">
                <Car className="mr-2 text-primary" />
                ¿Por qué elegirnos?
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                  <p>Tasación gratuita y sin compromiso</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                  <p>Respuesta rápida (24-48h)</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                  <p>Mejor precio garantizado</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                  <p>Gestionamos toda la documentación</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                  <p>Recogida gratuita del vehículo</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                  <p>Pago inmediato</p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t">
                <h3 className="font-montserrat font-semibold mb-4">¿Cómo funciona?</h3>
                <ol className="space-y-4">
                  <li className="flex">
                    <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">1</span>
                    <p>Completa y envía el formulario con los datos de tu vehículo</p>
                  </li>
                  <li className="flex">
                    <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">2</span>
                    <p>Nuestros especialistas evaluarán tu vehículo y se pondrán en contacto contigo</p>
                  </li>
                  <li className="flex">
                    <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">3</span>
                    <p>Si acepta nuestra oferta, acordaremos la recogida del vehículo</p>
                  </li>
                  <li className="flex">
                    <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">4</span>
                    <p>Realizamos el pago en el momento de la recogida</p>
                  </li>
                </ol>
              </div>
              
              <div className="mt-8 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">¿Necesita más información?</h3>
                <p className="text-sm mb-4">Contáctenos directamente y resolveremos todas sus dudas.</p>
                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <a href="tel:958790858">Llamar</a>
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <a href="mailto:info@desguacemurcia.com">Email</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ValueYourVehicle;