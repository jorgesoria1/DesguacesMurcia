import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Save, RefreshCw, Zap } from "lucide-react";
import { ImportSchedule, importApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";

interface ScheduleControlsProps {
  schedules: ImportSchedule[];
  onSuccess?: () => void;
}

// Componente optimizado para gestionar la sincronización automática
const ScheduleControls: React.FC<ScheduleControlsProps> = ({ schedules, onSuccess }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Filtrar solo programación "all" para simplificar la interfaz
  const allSchedule = schedules.find(s => s.type === "all");
  
  // Si no hay programación "all", usar la de vehículos o la primera disponible
  const defaultSchedule = allSchedule || 
                         schedules.find(s => s.type === "vehicles") || 
                         schedules[0];
  
  const [frequency, setFrequency] = useState(defaultSchedule?.frequency || "12h");
  const [isActive, setIsActive] = useState<boolean>(defaultSchedule?.active || true);
  const [startTime, setStartTime] = useState(defaultSchedule?.startTime || "02:00");

  const handleSave = async () => {
    if (!defaultSchedule) return;
    
    setIsSaving(true);
    
    try {
      await importApi.updateSchedule(defaultSchedule.id, {
        frequency,
        active: isActive,
        startTime,
      });
      
      toast({
        title: "Sincronización automática actualizada",
        description: "La configuración de sincronización ha sido actualizada correctamente",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error al actualizar la sincronización:", error);
      
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar la configuración de sincronización",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!defaultSchedule || schedules.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">
          No hay programación de sincronización configurada
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-md space-y-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-primary">Sincronización automática</h3>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Optimizada</span>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Estado actual</Label>
              <Badge variant={defaultSchedule.active ? "success" : "secondary"}>
                {defaultSchedule.active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            
            {defaultSchedule.lastRun && (
              <div className="text-sm text-muted-foreground mb-1">
                Última sincronización: {formatDateTime(defaultSchedule.lastRun)}
              </div>
            )}
            
            {defaultSchedule.nextRun && (
              <div className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Próxima sincronización: {formatDateTime(defaultSchedule.nextRun)}
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="frequency-select">Frecuencia de sincronización</Label>
            <Select
              value={frequency}
              onValueChange={setFrequency}
            >
              <SelectTrigger id="frequency-select">
                <SelectValue placeholder="Selecciona una frecuencia" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="1h">Cada hora</SelectItem>
                <SelectItem value="6h">Cada 6 horas</SelectItem>
                <SelectItem value="12h">Cada 12 horas</SelectItem>
                <SelectItem value="24h">Cada 24 horas</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              La sincronización automática importará vehículos y piezas utilizando el sistema optimizado.
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="start-time-input">Hora de inicio</Label>
            <Input
              id="start-time-input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Hora específica para iniciar las sincronizaciones programadas (formato 24h).
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="schedule-active"
              checked={isActive}
              onCheckedChange={(checked: boolean) => setIsActive(checked)}
            />
            <Label htmlFor="schedule-active">
              {isActive ? "Sincronización automática activada" : "Sincronización automática desactivada"}
            </Label>
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Guardando configuración...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar configuración
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleControls;
