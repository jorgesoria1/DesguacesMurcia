import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormDescription,
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Save, RefreshCw } from "lucide-react";
import { configApi, ApiConfig } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ApiConfigFormProps {
  apiConfig?: ApiConfig;
  onSuccess?: () => void;
}

const apiConfigSchema = z.object({
  apiKey: z.string().min(10, {
    message: "La API Key debe tener al menos 10 caracteres",
  }),
  companyId: z.coerce.number().int().positive({
    message: "El ID de empresa debe ser un número positivo",
  }),
  channel: z.string().min(1, {
    message: "El canal es obligatorio",
  }),
  active: z.boolean().default(true),
});

type ApiConfigFormValues = z.infer<typeof apiConfigSchema>;

const ApiConfigForm: React.FC<ApiConfigFormProps> = ({ apiConfig, onSuccess }) => {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);

  const form = useForm<ApiConfigFormValues>({
    resolver: zodResolver(apiConfigSchema),
    defaultValues: {
      apiKey: apiConfig?.apiKey || "",
      companyId: apiConfig?.companyId || 0,
      channel: apiConfig?.channel || "",
      active: apiConfig?.active !== undefined ? apiConfig.active : true,
    },
  });

  const onSubmit = async (data: ApiConfigFormValues) => {
    try {
      // Enviar los datos con los nombres correctos que espera el backend
      const configData = {
        apiKey: data.apiKey,
        apiId: data.companyId, // El backend espera apiId en el endpoint
        channel: data.channel,
        active: data.active // Incluir el campo active
      };

      await configApi.updateConfig(configData);

      toast({
        title: "Configuración actualizada",
        description: "La configuración de la API ha sido actualizada correctamente",
        variant: "success",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error al actualizar la configuración:", error);

      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar la configuración de la API",
        variant: "destructive",
      });
    }
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="API Key de Metasync"
                      className="rounded-r-none"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none border-l-0"
                    onClick={toggleShowApiKey}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID Empresa</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="ID de la empresa"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canal</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Canal de la API"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-end space-x-2 space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="mt-0">
                  API Activa
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar configuración
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ApiConfigForm;