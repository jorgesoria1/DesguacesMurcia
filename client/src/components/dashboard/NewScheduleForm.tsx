import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, Calendar, RefreshCw } from "lucide-react";
import { importApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface NewScheduleFormProps {
  onSuccess?: () => void;
}

const NewScheduleForm: React.FC<NewScheduleFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    type: "all",
    frequency: "12h",
    startTime: "02:00",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await importApi.createSchedule(formData);
      
      toast({
        title: "Programación creada",
        description: "La nueva programación de importación ha sido creada correctamente",
      });
      
      // Resetear formulario
      setFormData({
        type: "all",
        frequency: "12h",
        startTime: "02:00",
        active: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error al crear la programación:", error);
      
      toast({
        title: "Error al crear programación",
        description: "No se pudo crear la programación de importación",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nueva Programación de Importación
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de importación</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vehículos y Piezas</SelectItem>
                  <SelectItem value="vehicles">Solo Vehículos</SelectItem>
                  <SelectItem value="parts">Solo Piezas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frecuencia</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Selecciona la frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Cada hora</SelectItem>
                  <SelectItem value="6h">Cada 6 horas</SelectItem>
                  <SelectItem value="12h">Cada 12 horas</SelectItem>
                  <SelectItem value="24h">Cada 24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hora de inicio
            </Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Hora específica para iniciar las sincronizaciones programadas (formato 24h)
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button
              type="submit"
              disabled={isCreating}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creando programación...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Crear programación
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewScheduleForm;