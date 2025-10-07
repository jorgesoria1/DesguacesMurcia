
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { configApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const chatbotConfigSchema = z.object({
  chatbotCode: z.string(),
});

type ChatbotConfigFormValues = z.infer<typeof chatbotConfigSchema>;

interface ChatbotConfigFormProps {
  initialCode?: string;
  onSuccess?: () => void;
}

const ChatbotConfigForm: React.FC<ChatbotConfigFormProps> = ({ initialCode, onSuccess }) => {
  const { toast } = useToast();
  
  const form = useForm<ChatbotConfigFormValues>({
    resolver: zodResolver(chatbotConfigSchema),
    defaultValues: {
      chatbotCode: initialCode || "",
    },
  });

  const onSubmit = async (values: ChatbotConfigFormValues) => {
    try {
      await configApi.updateChatbotCode(values.chatbotCode);
      
      // Actualizar el script del chatbot inmediatamente
      let scriptElement = document.getElementById("chatbot-code");
      if (!scriptElement) {
        scriptElement = document.createElement("script");
        scriptElement.id = "chatbot-code";
        document.body.appendChild(scriptElement);
      }
      scriptElement.textContent = values.chatbotCode;
      
      toast({
        title: "Configuración actualizada",
        description: "El código del chatbot ha sido actualizado correctamente",
        variant: "success",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error al actualizar el código del chatbot:", error);
      
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el código del chatbot",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="chatbotCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código del Chatbot</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Inserte el código del chatbot aquí"
                  className="min-h-[100px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Este código se insertará antes del cierre del body en la página web
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Guardar configuración
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ChatbotConfigForm;
