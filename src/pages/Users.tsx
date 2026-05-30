import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/AvatarUpload";
import { AddUserDialog } from "@/components/AddUserDialog";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { Search, Edit, Save, X, Eye, EyeOff, Loader2, KeyRound, Lock, FileDown, ImageIcon } from "lucide-react";
import { baixarUsuariosPDF } from "@/utils/usuariosPDFGenerator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  nome: string;
  role: string; // TEXT in database, validated via FK against system_roles.key
  setor: "vendas" | "marketing" | "instalacoes" | "fabrica" | "administrativo" | "lideranca" | "afastados" | null;
  cpf: string | null;
  data_nascimento: string | null;
  ativo: boolean;
  foto_perfil_url: string | null;
  eh_colaborador: boolean;
  salario: number | null;
  created_at: string;
  updated_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterSetor, setFilterSetor] = useState<string>("todos");
  const [filterRole, setFilterRole] = useState<string>("todos");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [showPasswordInfoUser, setShowPasswordInfoUser] = useState<AdminUser | null>(null);
  const [avatarEditUser, setAvatarEditUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  // Buscar cargos ativos do sistema
  const { data: systemRoles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['system-roles-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_roles')
        .select('key, label')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as { key: string; label: string }[];
    },
  });

  // Criar mapa de key -> label para exibição
  const roleLabelsMap = systemRoles.reduce((acc, role) => {
    acc[role.key] = role.label;
    return acc;
  }, {} as Record<string, string>);


  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Buscando usuários...');
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log('Usuários carregados:', data);
      console.log('URLs de foto dos usuários:', data?.map(u => ({ nome: u.nome, foto_url: u.foto_perfil_url })));
      setUsers(data || []);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar usuários",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user.id);
    setEditForm({
      nome: user.nome,
      role: user.role,
      setor: user.setor,
      cpf: user.cpf,
      data_nascimento: user.data_nascimento,
      ativo: user.ativo,
      eh_colaborador: user.eh_colaborador,
    });
  };

  const handleSave = async (userId: string) => {
    try {
      // Remove formatação do CPF antes de salvar (apenas números)
      const cpfNumerico = editForm.cpf ? editForm.cpf.replace(/\D/g, '') : null;
      
      const { error } = await supabase
        .from("admin_users")
        .update({
          nome: editForm.nome,
          role: editForm.role,
          setor: editForm.setor,
          cpf: cpfNumerico,
          data_nascimento: editForm.data_nascimento,
          ativo: editForm.ativo,
          eh_colaborador: editForm.eh_colaborador,
        })
        .eq("id", userId);

      if (error) throw error;

      setEditingUser(null);
      setEditForm({});
      fetchUsers();
      
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar usuário",
      });
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const handleAvatarUpdate = (userId: string, newAvatarUrl: string | null) => {
    console.log('Atualizando avatar no estado local:', { userId, newAvatarUrl });
    setUsers(prevUsers => {
      const updatedUsers = prevUsers.map(user => 
        user.user_id === userId 
          ? { ...user, foto_perfil_url: newAvatarUrl }
          : user
      );
      console.log('Estado atualizado:', updatedUsers.find(u => u.user_id === userId));
      return updatedUsers;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = users.filter((user) => {
    // Filtro de busca
    const matchesSearch = 
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de status
    const matchesStatus = filterStatus === "todos" || 
      (filterStatus === "ativo" && user.ativo) ||
      (filterStatus === "inativo" && !user.ativo);
    
    // Filtro de setor
    const matchesSetor = filterSetor === "todos" || user.setor === filterSetor;
    
    // Filtro de função
    const matchesRole = filterRole === "todos" || user.role === filterRole;
    
    return matchesSearch && matchesStatus && matchesSetor && matchesRole;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
    setFilterSetor("todos");
    setFilterRole("todos");
  };

  const hasActiveFilters = searchTerm || filterStatus !== "todos" || filterSetor !== "todos" || filterRole !== "todos";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleDownloadPDF = () => {
    baixarUsuariosPDF({
      usuarios: filteredUsers.map(u => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        cpf: u.cpf,
        data_nascimento: u.data_nascimento,
        role: u.role,
        setor: u.setor,
        ativo: u.ativo,
        created_at: u.created_at,
      })),
      roleLabelsMap,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <AddUserDialog onUserAdded={fetchUsers} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Lista de Usuários</CardTitle>
              <CardDescription className="text-xs">
                {filteredUsers.length} de {users.length} usuários
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
          
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                <SelectItem value="ativo" className="text-xs">Ativos</SelectItem>
                <SelectItem value="inativo" className="text-xs">Inativos</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterSetor} onValueChange={setFilterSetor}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos setores</SelectItem>
                <SelectItem value="vendas" className="text-xs">Vendas</SelectItem>
                <SelectItem value="marketing" className="text-xs">Marketing</SelectItem>
                <SelectItem value="instalacoes" className="text-xs">Instalações</SelectItem>
                <SelectItem value="fabrica" className="text-xs">Fábrica</SelectItem>
                <SelectItem value="administrativo" className="text-xs">Administrativo</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todas funções</SelectItem>
                {systemRoles.map((role) => (
                  <SelectItem key={role.key} value={role.key} className="text-xs">
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="h-7">
                              <TableHead className="text-[10px] py-1 px-2">Foto</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">Nome</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">Email</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">CPF</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">Aniversário</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">Função</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">Setor</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">Colaborador</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">Status</TableHead>
                  <TableHead className="text-[10px] py-1 px-2">Data</TableHead>
                  <TableHead className="text-right text-[10px] py-1 px-2">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="h-[30px] max-h-[30px]">
                    <TableCell className="py-0 px-2">
                      <div className="w-6 h-6">
                        <AvatarUpload
                          userId={user.user_id}
                          currentAvatarUrl={user.foto_perfil_url}
                          userName={user.nome}
                          onAvatarUpdate={(url) => handleAvatarUpdate(user.user_id, url)}
                          compact
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-0 px-2 text-[11px] font-medium">
                      {editingUser === user.id ? (
                        <Input
                          value={editForm.nome || ""}
                          onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                          className="h-6 text-[10px] px-1"
                        />
                      ) : (
                        <span className="truncate block max-w-[120px]">{user.nome}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-0 px-2 text-[10px]">
                      <span className="truncate block max-w-[140px]">{user.email}</span>
                    </TableCell>
                    <TableCell className="py-0 px-2 text-[10px]">
                      {editingUser === user.id ? (
                        <Input
                          value={editForm.cpf || ""}
                          onChange={(e) => {
                            // Remove tudo que não é número
                            const numericValue = e.target.value.replace(/\D/g, '');
                            // Limita a 11 dígitos
                            const limitedValue = numericValue.slice(0, 11);
                            // Formata para exibição XXX.XXX.XXX-XX
                            let formatted = limitedValue;
                            if (limitedValue.length > 3) {
                              formatted = limitedValue.slice(0, 3) + '.' + limitedValue.slice(3);
                            }
                            if (limitedValue.length > 6) {
                              formatted = limitedValue.slice(0, 3) + '.' + limitedValue.slice(3, 6) + '.' + limitedValue.slice(6);
                            }
                            if (limitedValue.length > 9) {
                              formatted = limitedValue.slice(0, 3) + '.' + limitedValue.slice(3, 6) + '.' + limitedValue.slice(6, 9) + '-' + limitedValue.slice(9);
                            }
                            setEditForm({ ...editForm, cpf: formatted });
                          }}
                          className="h-6 text-[10px] px-1"
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      ) : (
                        <span className="truncate block max-w-[100px]">
                          {user.cpf ? 
                            // Formatar CPF para exibição se for apenas números
                            user.cpf.length === 11 && /^\d+$/.test(user.cpf) ?
                              `${user.cpf.slice(0, 3)}.${user.cpf.slice(3, 6)}.${user.cpf.slice(6, 9)}-${user.cpf.slice(9, 11)}` :
                              user.cpf
                            : "—"
                          }
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-0 px-2 text-[10px]">
                      {editingUser === user.id ? (
                        <Input
                          type="date"
                          value={editForm.data_nascimento || ""}
                          onChange={(e) => setEditForm({ ...editForm, data_nascimento: e.target.value })}
                          className="h-6 text-[10px] px-1"
                        />
                      ) : (
                        <span className="truncate block max-w-[90px]">
                          {user.data_nascimento ? 
                            format(new Date(user.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })
                            : "—"
                          }
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-0 px-2">
                      {editingUser === user.id ? (
                        <Select
                          value={editForm.role}
                          onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                          disabled={loadingRoles}
                        >
                          <SelectTrigger className="h-6 text-[10px] px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {loadingRoles ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                              </div>
                            ) : systemRoles.length === 0 ? (
                              <div className="text-[10px] text-muted-foreground text-center py-2">
                                Nenhum cargo ativo disponível
                              </div>
                            ) : (
                              systemRoles.map((role) => (
                                <SelectItem key={role.key} value={role.key} className="text-[10px]">
                                  {role.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.role === "administrador" ? "default" : "secondary"} className="text-[9px] px-1 py-0 h-4">
                          <span className="truncate block max-w-[80px]">{roleLabelsMap[user.role] || user.role}</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-0 px-2">
                      {editingUser === user.id ? (
                        <Select
                          value={editForm.setor || ""}
                          onValueChange={(value) => setEditForm({ ...editForm, setor: value as AdminUser['setor'] })}
                        >
                          <SelectTrigger className="h-6 text-[10px] px-1">
                            <SelectValue placeholder="Setor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vendas" className="text-[10px]">Vendas</SelectItem>
                            <SelectItem value="marketing" className="text-[10px]">Marketing</SelectItem>
                            <SelectItem value="instalacoes" className="text-[10px]">Instalações</SelectItem>
                            <SelectItem value="fabrica" className="text-[10px]">Fábrica</SelectItem>
                            <SelectItem value="administrativo" className="text-[10px]">Administrativo</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                          {user.setor === "vendas" ? "Vendas" :
                           user.setor === "marketing" ? "Marketing" :
                           user.setor === "instalacoes" ? "Instalações" :
                           user.setor === "fabrica" ? "Fábrica" :
                           user.setor === "administrativo" ? "Admin" : "—"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-0 px-2">
                      {editingUser === user.id ? (
                        <Select
                          value={editForm.eh_colaborador ? "true" : "false"}
                          onValueChange={(value) => setEditForm({ ...editForm, eh_colaborador: value === "true" })}
                        >
                          <SelectTrigger className="h-6 text-[10px] px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true" className="text-[10px]">Sim</SelectItem>
                            <SelectItem value="false" className="text-[10px]">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.eh_colaborador ? "default" : "outline"} className="text-[9px] px-1 py-0 h-4">
                          {user.eh_colaborador ? "Sim" : "Não"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-0 px-2">
                      {editingUser === user.id ? (
                        <Select
                          value={editForm.ativo ? "true" : "false"}
                          onValueChange={(value) => setEditForm({ ...editForm, ativo: value === "true" })}
                        >
                          <SelectTrigger className="h-6 text-[10px] px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true" className="text-[10px]">Ativo</SelectItem>
                            <SelectItem value="false" className="text-[10px]">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.ativo ? "default" : "destructive"} className="text-[9px] px-1 py-0 h-4">
                          {user.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-0 px-2 text-[10px]">
                      {format(new Date(user.created_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right py-0 px-2">
                      <div className="flex justify-end gap-0.5">
                        {editingUser === user.id ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSave(user.id)}
                              className="h-5 w-5 p-0"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancel}
                              className="h-5 w-5 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                         ) : (
                           <>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleEdit(user)}
                               className="h-5 w-5 p-0"
                             >
                               <Edit className="w-3 h-3" />
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => setAvatarEditUser(user)}
                               title="Editar foto de perfil"
                               className="h-5 w-5 p-0"
                             >
                               <ImageIcon className="w-3 h-3" />
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => setShowPasswordInfoUser(user)}
                               title="Ver informações de senha"
                               className="h-5 w-5 p-0"
                             >
                               <Lock className="w-3 h-3" />
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => setResetPasswordUser(user)}
                               title="Redefinir senha"
                               className="h-5 w-5 p-0"
                             >
                               <KeyRound className="w-3 h-3" />
                             </Button>
                           </>
                         )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ResetPasswordModal
        open={!!resetPasswordUser}
        onOpenChange={(open) => !open && setResetPasswordUser(null)}
        userId={resetPasswordUser?.user_id || ""}
        userName={resetPasswordUser?.nome || ""}
        userEmail={resetPasswordUser?.email || ""}
      />

      <Dialog open={!!avatarEditUser} onOpenChange={(open) => !open && setAvatarEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Editar Foto de Perfil
            </DialogTitle>
            <DialogDescription>
              Usuário: <strong>{avatarEditUser?.nome}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {avatarEditUser && (
              <AvatarUpload
                userId={avatarEditUser.user_id}
                currentAvatarUrl={avatarEditUser.foto_perfil_url}
                userName={avatarEditUser.nome}
                onAvatarUpdate={(url) => {
                  handleAvatarUpdate(avatarEditUser.user_id, url);
                  setAvatarEditUser(null);
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAvatarEditUser(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showPasswordInfoUser} onOpenChange={(open) => !open && setShowPasswordInfoUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Informações de Senha
            </DialogTitle>
            <DialogDescription>
              Usuário: <strong>{showPasswordInfoUser?.nome}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <Eye className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-900">
                    Senhas não podem ser visualizadas
                  </p>
                  <p className="text-sm text-amber-800">
                    Por questões de segurança, as senhas dos usuários são criptografadas (hash) no banco de dados e não podem ser recuperadas ou visualizadas em texto plano.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Email de login:</strong> {showPasswordInfoUser?.email}
              </p>
              <p className="text-sm text-muted-foreground">
                Para permitir que o usuário acesse o sistema novamente, você pode gerar uma nova senha temporária usando o botão "Redefinir Senha".
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordInfoUser(null)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setResetPasswordUser(showPasswordInfoUser);
                setShowPasswordInfoUser(null);
              }}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}