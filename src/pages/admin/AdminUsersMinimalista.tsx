import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/AvatarUpload";
import { AddUserDialog } from "@/components/AddUserDialog";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { UserDetailsModal } from "@/components/admin/UserDetailsModal";
import { Search, Edit, Save, X, Loader2, KeyRound, FileDown, UserX, UserCheck, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { baixarUsuariosPDF } from "@/utils/usuariosPDFGenerator";
import { MinimalistLayout } from "@/components/MinimalistLayout";

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  nome: string;
  role: string;
  setor: "vendas" | "marketing" | "instalacoes" | "fabrica" | "administrativo" | null;
  cpf: string | null;
  data_nascimento: string | null;
  ativo: boolean;
  foto_perfil_url: string | null;
  eh_colaborador: boolean;
  salario: number | null;
  created_at: string;
  updated_at: string;
  tipo_usuario: string;
}

export default function AdminUsersMinimalista() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [representantes, setRepresentantes] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterSetor, setFilterSetor] = useState<string>("todos");
  const [filterRole, setFilterRole] = useState<string>("todos");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("colaborador");
  const [togglingUser, setTogglingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const { data: systemRoles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["system-roles-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_roles")
        .select("key, label")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as { key: string; label: string }[];
    },
  });

  const roleLabelsMap = systemRoles.reduce((acc, role) => {
    acc[role.key] = role.label;
    return acc;
  }, {} as Record<string, string>);

  useEffect(() => {
    fetchUsers();
    fetchRepresentantes();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data || []) as AdminUser[]);
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

  const fetchRepresentantes = async () => {
    try {
      const { data, error } = await supabase
        .from("representantes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: AdminUser[] = (data || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        email: r.email,
        nome: r.nome,
        role: "representante",
        setor: null,
        cpf: null,
        data_nascimento: null,
        ativo: r.ativo,
        foto_perfil_url: r.foto_perfil_url ?? null,
        eh_colaborador: false,
        salario: null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        tipo_usuario: "representante",
      }));
      setRepresentantes(mapped);
    } catch (error) {
      console.error("Erro ao buscar representantes:", error);
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
      tipo_usuario: user.tipo_usuario,
    });
  };

  const handleSave = async (userId: string) => {
    try {
      const cpfNumerico = editForm.cpf ? editForm.cpf.replace(/\D/g, "") : null;

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
          tipo_usuario: editForm.tipo_usuario,
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

  const handleToggleAtivo = async (user: AdminUser) => {
    const novoStatus = !user.ativo;
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ ativo: novoStatus })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Usuário ${novoStatus ? "ativado" : "desativado"} com sucesso`,
      });
      fetchUsers();
      // Update selectedUser if it's the same
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, ativo: novoStatus });
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao alterar status do usuário",
      });
    } finally {
      setTogglingUser(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke<{
        success: boolean;
        deleted_user_id: string;
        mode?: "deleted" | "archived";
        message?: string;
        error?: string;
      }>("delete-user", {
        body: { user_id: user.user_id },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      const wasArchived = response.data?.mode === "archived";

      toast({
        title: wasArchived ? "Usuário arquivado" : "Sucesso",
        description:
          response.data?.message ||
          (wasArchived
            ? `Usuário "${user.nome}" tinha histórico vinculado e foi arquivado com acesso removido`
            : `Usuário "${user.nome}" excluído com sucesso`),
      });
      fetchUsers();
      if (selectedUser?.id === user.id) setSelectedUser(null);
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Erro ao excluir usuário",
      });
    } finally {
      setIsDeleting(false);
      setDeletingUser(null);
    }
  };

  const handleAvatarUpdate = (userId: string, newAvatarUrl: string | null) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.user_id === userId ? { ...user, foto_perfil_url: newAvatarUrl } : user
      )
    );
  };

  const sourceUsers = activeTab === "representante" ? representantes : users;
  const filteredUsers = sourceUsers
    .filter((user) => activeTab === "representante" ? true : user.tipo_usuario === activeTab)
    .filter((user) => {
      const matchesSearch =
        user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "todos" ||
        (filterStatus === "ativo" && user.ativo) ||
        (filterStatus === "inativo" && !user.ativo);

      const matchesSetor = filterSetor === "todos" || user.setor === filterSetor;
      const matchesRole = filterRole === "todos" || user.role === filterRole;

      return matchesSearch && matchesStatus && matchesSetor && matchesRole;
    });

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
    setFilterSetor("todos");
    setFilterRole("todos");
  };

  const hasActiveFilters =
    searchTerm || filterStatus !== "todos" || filterSetor !== "todos" || filterRole !== "todos";

  const colaboradoresCount = users.filter((u) => u.tipo_usuario === "colaborador").length;
  const representantesCount = representantes.length;
  const metamorfosCount = users.filter((u) => u.tipo_usuario === "metamorfo").length;

  const handleDownloadPDF = () => {
    baixarUsuariosPDF({
      usuarios: filteredUsers.map((u) => ({
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

  if (loading) {
    return (
      <MinimalistLayout title="Usuários" subtitle="Carregando..." backPath="/admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </MinimalistLayout>
    );
  }

  const renderUserList = () => (
    <div className="bg-primary/5 border border-primary/10 backdrop-blur-xl rounded-lg overflow-hidden">
      <div className="divide-y divide-primary/10">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-white/40">
            Nenhum {activeTab === "colaborador" ? "colaborador" : activeTab === "representante" ? "representante" : "metamorfo"} encontrado
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => setSelectedUser(user)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex-shrink-0">
                  <AvatarUpload
                    userId={user.user_id}
                    currentAvatarUrl={user.foto_perfil_url}
                    userName={user.nome}
                    onAvatarUpdate={(url) => handleAvatarUpdate(user.user_id, url)}
                    compact
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {editingUser === user.id ? (
                      <Input
                        value={editForm.nome || ""}
                        onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                        className="h-8 bg-white/5 border-white/10 text-white max-w-[200px]"
                      />
                    ) : (
                      <span className="font-medium text-white truncate">{user.nome}</span>
                    )}
                    <Badge
                      variant={user.ativo ? "default" : "secondary"}
                      className={
                        user.ativo
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-white/40"
                      }
                    >
                      {user.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/60 truncate">{user.email}</p>
                </div>

                <div className="hidden md:flex items-center gap-4 text-sm">
                  <div className="text-white/60">
                    {editingUser === user.id ? (
                      <Select
                        value={editForm.role}
                        onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                      >
                        <SelectTrigger className="h-8 w-[150px] bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {systemRoles.map((role) => (
                            <SelectItem key={role.key} value={role.key}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-white/60 border-white/20">
                        {roleLabelsMap[user.role] || user.role}
                      </Badge>
                    )}
                  </div>

                  {editingUser === user.id ? (
                    <Select
                      value={editForm.tipo_usuario}
                      onValueChange={(value) => setEditForm({ ...editForm, tipo_usuario: value })}
                    >
                      <SelectTrigger className="h-8 w-[150px] bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
                        <SelectItem value="representante">Representante</SelectItem>
                        <SelectItem value="metamorfo">Metamorfo</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : user.setor ? (
                    <Badge variant="secondary" className="capitalize bg-white/10 text-white/60">
                      {user.setor}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {editingUser === user.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleSave(user.id); }}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(user);
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResetPasswordUser(user);
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTogglingUser(user);
                        }}
                        className={user.ativo
                          ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        }
                        title={user.ativo ? "Desativar usuário" : "Ativar usuário"}
                      >
                        {user.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingUser(user);
                        }}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <MinimalistLayout
      title="Usuários"
      subtitle="Gerencie usuários e permissões do sistema"
      backPath="/admin"
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <FileDown className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <AddUserDialog onUserAdded={fetchUsers} />
        </div>
      }
    >
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); clearFilters(); }}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="colaborador" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
              Colaboradores ({colaboradoresCount})
            </TabsTrigger>
            <TabsTrigger value="representante" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
              Representantes ({representantesCount})
            </TabsTrigger>
            <TabsTrigger value="metamorfo" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
              Metamorfos ({metamorfosCount})
            </TabsTrigger>
          </TabsList>

          {/* Filtros */}
          <div className="bg-primary/5 border border-primary/10 backdrop-blur-xl rounded-lg p-4 mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Buscar por nome, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSetor} onValueChange={setFilterSetor}>
                <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos setores</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="instalacoes">Instalações</SelectItem>
                  <SelectItem value="fabrica">Fábrica</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[170px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas funções</SelectItem>
                  {systemRoles.map((role) => (
                    <SelectItem key={role.key} value={role.key}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            <div className="mt-3 text-sm text-white/60">
              {filteredUsers.length} {activeTab === "colaborador" ? "colaborador(es)" : activeTab === "representante" ? "representante(s)" : "metamorfo(s)"}
            </div>
          </div>

          <TabsContent value="colaborador" className="mt-4">
            {renderUserList()}
          </TabsContent>
          <TabsContent value="representante" className="mt-4">
            {renderUserList()}
          </TabsContent>
          <TabsContent value="metamorfo" className="mt-4">
            {renderUserList()}
          </TabsContent>
        </Tabs>
      </div>

      <UserDetailsModal
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        user={selectedUser}
        roleLabel={selectedUser ? (roleLabelsMap[selectedUser.role] || selectedUser.role) : ""}
        onAvatarUpdate={(userId, url) => {
          handleAvatarUpdate(userId, url);
          if (selectedUser && selectedUser.user_id === userId) {
            setSelectedUser({ ...selectedUser, foto_perfil_url: url });
          }
        }}
        onToggleAtivo={(userId, novoStatus) => {
          const user = users.find(u => u.id === userId || u.user_id === userId);
          if (user) {
            setTogglingUser(user);
          }
        }}
      />

      {resetPasswordUser && (
        <ResetPasswordModal
          open={!!resetPasswordUser}
          onOpenChange={() => setResetPasswordUser(null)}
          userId={resetPasswordUser.user_id}
          userEmail={resetPasswordUser.email}
          userName={resetPasswordUser.nome}
        />
      )}

      <AlertDialog open={!!togglingUser} onOpenChange={(open) => !open && setTogglingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {togglingUser?.ativo ? "Desativar usuário" : "Ativar usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {togglingUser?.ativo
                ? `Tem certeza que deseja desativar "${togglingUser?.nome}"? O usuário não conseguirá mais fazer login no sistema.`
                : `Tem certeza que deseja ativar "${togglingUser?.nome}"? O usuário poderá fazer login novamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => togglingUser && handleToggleAtivo(togglingUser)}
              className={togglingUser?.ativo ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {togglingUser?.ativo ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingUser?.nome}"? Esta ação é irreversível e removerá todos os dados do usuário do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && handleDeleteUser(deletingUser)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir permanentemente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
