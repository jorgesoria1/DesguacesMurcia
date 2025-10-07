import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

const loginSchema = z.object({
  identifier: z.string().min(3, "Ingresa un email o nombre de usuario válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      if (!data.identifier || !data.password) {
        form.setError("identifier", { message: "Usuario y contraseña son requeridos" });
        form.setError("password", { message: "Usuario y contraseña son requeridos" });
        return;
      }

      // Usar el método de login del contexto de autenticación
      const result = await login(data.identifier, data.password);
      
      if (result.success) {
        // Manejar redirección SPA si es necesario
        if (result.shouldRedirect) {
          console.log('🔄 Redirigiendo admin a dashboard via SPA...');
          navigate('/admin/dashboard');
        } else {
          // Redirigir usuario normal al home
          navigate('/');
        }
      } else {
        form.setError("identifier", { message: result.message || "Usuario o contraseña incorrectos" });
        form.setError("password", { message: result.message || "Usuario o contraseña incorrectos" });
      }
    } catch (error) {
      console.error("Error en el formulario de login:", error);
      form.setError("identifier", { message: "Error de conexión. Intente nuevamente." });
      form.setError("password", { message: "Error de conexión. Intente nuevamente." });
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder a tu cuenta
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
                    <FormLabel>Email o nombre de usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="email@ejemplo.com o usuario" {...field} />
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="text-center text-sm">
            ¿No tienes una cuenta?{" "}
            <Link href="/register" className="text-blue-600 hover:text-blue-800">
              Regístrate aquí
            </Link>
          </div>
          <div className="text-center text-sm">
            <Link href="/checkout" className="text-gray-600 hover:text-gray-800">
              Continuar como invitado
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;