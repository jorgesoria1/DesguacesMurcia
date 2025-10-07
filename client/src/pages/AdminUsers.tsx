import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const AdminUsers = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Formulario para añadir usuario
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [newRole, setNewRole] = useState("manager");

  // Formulario para editar usuario
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [editRole, setEditRole] = useState("manager");

  // Consulta para obtener usuarios
  const usersQuery = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar usuarios');
        }
        const data = await response.json();
        console.log('Usuarios cargados:', data);
        // Filtrar solo usuarios administrativos (manager y admin)
        const adminUsers = data.filter((user: any) => 
          user.role === 'manager' || user.role === 'admin' || user.isAdmin
        );
        return adminUsers || [];
      } catch (error) {
        console.error('Error en la consulta de usuarios:', error);
        throw error;
      }
    }
  });

  // Mutación para añadir usuario
  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear usuario');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado correctamente",
      });
      setIsAddDialogOpen(false);
      usersQuery.refetch();

      // Limpiar el formulario
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");

      setNewRole("manager");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear usuario",
        variant: "destructive"
      });
    }
  });

  // Mutación para editar usuario
  const editUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number, userData: any }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar usuario');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario actualizado",
        description: `El usuario ${selectedUser?.username} ha sido actualizado correctamente`,
      });
      setIsEditDialogOpen(false);
      usersQuery.refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar usuario",
        variant: "destructive"
      });
    }
  });

  // Mutación para eliminar usuario
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar usuario');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario eliminado",
        description: `El usuario ${selectedUser?.username} ha sido eliminado correctamente`,
      });
      setIsDeleteDialogOpen(false);
      usersQuery.refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar usuario",
        variant: "destructive"
      });
    }
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin");
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleAddUser = () => {
    // Validar datos
    if (!newUsername || !newPassword) {
      toast({
        title: "Error",
        description: "Usuario y contraseña son obligatorios",
        variant: "destructive"
      });
      return;
    }

    // Validar longitud de contraseña
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    addUserMutation.mutate({
      username: newUsername,
      password: newPassword,
      email: newEmail || undefined,
      role: newRole
    });
  };

  const handleEditUser = () => {
    if (!editUsername) {
      toast({
        title: "Error",
        description: "El nombre de usuario es obligatorio",
        variant: "destructive"
      });
      return;
    }

    // Validar longitud de contraseña si se proporciona una nueva
    if (editPassword && editPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    const userData: any = {
      username: editUsername,
      email: editEmail || undefined,
      role: editRole
    };

    // Solo incluir contraseña si se proporciona una nueva
    if (editPassword) {
      userData.password = editPassword;
    }

    editUserMutation.mutate({
      id: selectedUser.id,
      userData
    });
  };

  const handleDeleteUser = () => {
    deleteUserMutation.mutate(selectedUser.id);
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    // Inicializar los campos de edición con los valores actuales del usuario
    setEditUsername(user.username || '');
    setEditEmail(user.email || '');
    setEditPassword(''); // Siempre vacío inicialmente

    setEditRole(user.role || 'manager');
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: any) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">Gestión de Usuarios Administrativos</h1>
            <p className="text-muted-foreground">
              Administre los usuarios administrativos del sistema (administradores y gestores)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario Administrativo
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {usersQuery.isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Cargando usuarios...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!usersQuery.data || usersQuery.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-32">
                        No se encontraron usuarios
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersQuery.data?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.id}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email || "—"}</TableCell>
                        <TableCell>
                          {user.isAdmin || user.role === 'admin' ? (
                            <Badge className="bg-primary">Administrador</Badge>
                          ) : user.role === 'manager' ? (
                            <Badge className="bg-blue-500 text-white">Gestor</Badge>
                          ) : (
                            <Badge variant="outline">Cliente</Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(user)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para añadir usuario */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir nuevo usuario administrativo</DialogTitle>
            <DialogDescription>
              Complete el formulario para crear un nuevo usuario administrativo del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Usuario
              </Label>
              <Input 
                id="username" 
                className="col-span-3" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input 
                id="email" 
                type="email" 
                className="col-span-3"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Contraseña
              </Label>
              <Input 
                id="password" 
                type="password" 
                className="col-span-3"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Rol
              </Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddUser}>Crear usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar usuario */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Actualice la información del usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                Usuario
              </Label>
              <Input 
                id="edit-username" 
                className="col-span-3" 
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input 
                id="edit-email" 
                type="email" 
                className="col-span-3"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">
                Contraseña
              </Label>
              <Input 
                id="edit-password" 
                type="password" 
                placeholder="Nueva contraseña (dejar en blanco si no cambia)" 
                className="col-span-3"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Rol
              </Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditUser}>Actualizar usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para eliminar usuario */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar al usuario {selectedUser?.username}?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;