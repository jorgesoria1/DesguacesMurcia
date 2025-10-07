import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const loginSchema = z.object({
  identifier: z.string().min(1, "El nombre de usuario es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const AdminLoginForm = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login, user, isAuthenticated } = useAuth();

  // Redireccionar al dashboard si ya está autenticado como admin
  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      navigate("/admin/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.identifier, data.password);
      
      // Mostrar toast de éxito
      toast({
        title: "Iniciando sesión",
        description: "Verificando credenciales..."
      });
      
      // La redirección se maneja en el useEffect
    } catch (error) {
      console.error("Error de autenticación:", error);
      toast({
        title: "Error de autenticación",
        description: "Usuario o contraseña incorrectos",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-montserrat">Iniciar sesión</CardTitle>
        <CardDescription>
          Accede al panel de administración para gestionar la tienda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de usuario</FormLabel>
                  <FormControl>
                    <Input placeholder="admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Iniciando sesión..." : "Acceder"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-sm text-center text-muted-foreground">
        <p className="w-full">Acceso sólo para administradores autorizados</p>
      </CardFooter>
    </Card>
  );
};

export default AdminLoginForm;
