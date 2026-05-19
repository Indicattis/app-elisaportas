import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Loader2, Plus, UserPlus, ArrowRightLeft, Trash2, FlaskConical, Pencil, UserX } from "lucide-react";
import { toast } from "sonner";

import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAllUsers, type User } from "@/hooks/useAllUsers";
import { useVagas, type Vaga } from "@/hooks/useVagas";
import { SETOR_LABELS, SETOR_ROLES } from "@/utils/setorMapping";
import { ROLE_LABELS } from "@/types/permissions";
import { PreencherVagaDialog } from "@/components/vagas/PreencherVagaDialog";
import { CreateRoleModal } from "@/components/admin/CreateRoleModal";
import { EditRoleModal } from "@/components/admin/EditRoleModal";


const SETOR_KEYS = Object.keys(SETOR_LABELS);

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function VagasPage() {
  const [selectedSetor, setSelectedSetor] = useState(SETOR_KEYS[0]);
  const [transferUser, setTransferUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  
  const [vagaToDelete, setVagaToDelete] = useState<Vaga | null>(null);
  const [criarVagaOpen, setCriarVagaOpen] = useState(false);
  const [novaVagaCargo, setNovaVagaCargo] = useState("");
  const [novaVagaJustificativa, setNovaVagaJustificativa] = useState("");
  const [criandoVaga, setCriandoVaga] = useState(false);
  const [preencherEmTesteOpen, setPreencherEmTesteOpen] = useState(false);
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const navigate = useNavigate();
  const { data: allUsers, isLoading } = useAllUsers();
  const { vagas, createVaga, deleteVaga } = useVagas();
  const queryClient = useQueryClient();

  const { data: systemRoles } = useQuery({
    queryKey: ["system-roles-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_roles")
        .select("id, key, label, setor, descricao, ativo, ordem")
        .eq("ativo", true)
        .order("label");
      return data || [];
    },
  });

  const activeRoleKeys = (systemRoles || []).map(r => r.key);

  const getRolesForSetor = (setor: string) => {
    const hardcoded = (SETOR_ROLES[setor] || []).filter(r => activeRoleKeys.includes(r));
    const dynamic = (systemRoles || [])
      .filter(r => r.setor === setor && !hardcoded.includes(r.key))
      .map(r => r.key);
    return [...hardcoded, ...dynamic];
  };

  const rolesForSetor = getRolesForSetor(selectedSetor);
  const filteredUsers = (allUsers || []).filter(u => rolesForSetor.includes(u.role as any));
  const emTesteUsers = filteredUsers.filter(u => u.em_teste === true);
  const regularUsers = filteredUsers.filter(u => u.em_teste !== true);

  const getSetorCounts = (setor: string) => {
    const roles = getRolesForSetor(setor);
    const users = (allUsers || []).filter(u => roles.includes(u.role as any));
    const vagasAbertas = (vagas || []).filter(v =>
      roles.includes(v.cargo as any) && (v.status === "aberta" || v.status === "em_analise")
    );
    return { current: users.length, total: users.length + vagasAbertas.length };
  };

  const getSetorEmTesteCount = (setor: string) => {
    const roles = getRolesForSetor(setor);
    return (allUsers || []).filter(u => roles.includes(u.role as any) && u.em_teste === true).length;
  };

  const openVagasForRole = (role: string): Vaga[] =>
    (vagas || []).filter(v => v.cargo === role && (v.status === "aberta" || v.status === "em_analise"));

  const grouped = rolesForSetor.map(role => ({
    role,
    label: (systemRoles || []).find(r => r.key === role)?.label || ROLE_LABELS[role] || role,
    users: regularUsers.filter(u => u.role === role),
    openVagas: openVagasForRole(role).length,
    openVagasList: openVagasForRole(role),
  }));

  const handlePreencherClick = (vaga: Vaga) => {
    navigate(`/administrativo/rh-dp/vagas/preencher/${vaga.id}`);
  };

  const handleOpenTransfer = (user: User) => {
    setTransferUser(user);
    setNewRole(user.role);
  };

  const handleTransferUser = async () => {
    if (!transferUser || !newRole || newRole === transferUser.role) return;
    setTransferring(true);
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ role: newRole })
        .eq("id", transferUser.id);
      if (error) throw error;
      toast.success(`${transferUser.nome} transferido com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setTransferUser(null);
    } catch (err: any) {
      toast.error("Erro ao transferir colaborador");
      console.error(err);
    } finally {
      setTransferring(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!userToDeactivate) return;
    setDeactivating(true);
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ ativo: false })
        .eq("id", userToDeactivate.id);
      if (error) throw error;
      toast.success(`${userToDeactivate.nome} foi desativado`);
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setUserToDeactivate(null);
    } catch (err: any) {
      toast.error("Erro ao desativar usuário");
      console.error(err);
    } finally {
      setDeactivating(false);
    }
  };

  const handleCriarVaga = async () => {
    if (!novaVagaCargo || !novaVagaJustificativa.trim()) return;
    setCriandoVaga(true);
    const success = await createVaga({ cargo: novaVagaCargo, justificativa: novaVagaJustificativa.trim() });
    if (success) {
      setCriarVagaOpen(false);
      setNovaVagaCargo("");
      setNovaVagaJustificativa("");
    }
    setCriandoVaga(false);
  };

  const rolesBySetor = SETOR_KEYS.map(setor => ({
    setor,
    label: SETOR_LABELS[setor],
    roles: getRolesForSetor(setor).map(key => ({
      key,
      label: (systemRoles || []).find(r => r.key === key)?.label || ROLE_LABELS[key] || key,
    })),
  })).filter(g => g.roles.length > 0);

  const rolesForSelectedSetor = getRolesForSetor(selectedSetor).map(key => ({
    key,
    label: (systemRoles || []).find(r => r.key === key)?.label || ROLE_LABELS[key] || key,
  }));

  return (
    <MinimalistLayout
      title="Vagas"
      subtitle="Quadro de vagas por setor"
      backPath="/administrativo/rh-dp"
      fullWidth
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateRoleModalOpen(true)}
            className="h-10 px-5 rounded-lg font-medium text-white text-sm border
                       bg-gradient-to-r from-purple-500 to-purple-700 border-purple-400/30
                       shadow-lg shadow-purple-500/30
                       hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40
                       transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Função
          </button>
          <button
            onClick={() => setCriarVagaOpen(true)}
            className="h-10 px-5 rounded-lg font-medium text-white text-sm border
                       bg-gradient-to-r from-blue-500 to-blue-700 border-blue-400/30
                       shadow-lg shadow-blue-500/30
                       hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40
                       transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Vaga
          </button>
        </div>
      }
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Administrativo", path: "/administrativo" },
        { label: "RH/DP", path: "/administrativo/rh-dp" },
        { label: "Vagas" },
      ]}
    >
      <div className="flex flex-col md:flex-row gap-4">
        {/* Mobile: horizontal chips */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {SETOR_KEYS.map(setor => {
            const counts = getSetorCounts(setor);
            const isFull = counts.total > 0 && counts.current === counts.total;
            const emTesteCount = getSetorEmTesteCount(setor);
            return (
              <button
                key={setor}
                onClick={() => setSelectedSetor(setor)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                  ${selectedSetor === setor
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  }`}
              >
                {SETOR_LABELS[setor]}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isFull ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {counts.current}/{counts.total}
                </span>
                {emTesteCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                    {emTesteCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop: sidebar */}
        <div className="hidden md:flex flex-col w-56 shrink-0">
          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex flex-col gap-1 p-2">
              {SETOR_KEYS.map(setor => {
                const counts = getSetorCounts(setor);
                const isFull = counts.total > 0 && counts.current === counts.total;
                const emTesteCount = getSetorEmTesteCount(setor);
                return (
                  <button
                    key={setor}
                    onClick={() => setSelectedSetor(setor)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${selectedSetor === setor
                        ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    {SETOR_LABELS[setor]}
                    <div className="flex items-center gap-1.5">
                      {emTesteCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          {emTesteCount}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isFull ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                        {counts.current}/{counts.total}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <Users className="w-10 h-10 mb-3" />
              <p className="text-sm">Nenhum colaborador neste setor</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(group => {
                const total = group.users.length + group.openVagas;
                const isFull = group.openVagas === 0 && group.users.length > 0;
                const isEmpty = group.users.length === 0 && group.openVagas === 0;
                return (
                  <div key={group.role}>
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-sm font-semibold text-white/80">{group.label}</h2>
                      <button
                        onClick={() => {
                          const roleData = (systemRoles || []).find(r => r.key === group.role);
                          if (roleData) setEditingRole(roleData);
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                        title="Editar função"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isEmpty
                            ? "border-white/10 text-white/30 bg-white/5"
                            : isFull
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                              : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        }`}
                      >
                        {group.users.length}/{total || 0}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.users.map(user => (
                        <div
                          key={user.id}
                          className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-200 group/card"
                        >
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <Avatar className="h-10 w-10 border border-white/10">
                              {user.foto_perfil_url ? (
                                <AvatarImage src={user.foto_perfil_url} alt={user.nome} />
                              ) : null}
                              <AvatarFallback className="bg-blue-600/20 text-blue-300 text-xs font-medium">
                                {getInitials(user.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">{user.nome}</p>
                              <p className="text-xs text-white/40 truncate">{user.email}</p>
                            </div>
                            <button
                              onClick={() => handleOpenTransfer(user)}
                              className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80"
                              title="Transferir função"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setUserToDeactivate(user)}
                              className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"
                              title="Desativar usuário"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {group.openVagasList.map(vaga => (
                        <div
                          key={vaga.id}
                          className="p-1.5 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all duration-200 group/vaga relative"
                        >
                          <button
                            onClick={() => setVagaToDelete(vaga)}
                            className="absolute top-2 right-2 opacity-0 group-hover/vaga:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 z-10"
                            title="Excluir vaga"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePreencherClick(vaga)}
                            className="w-full text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <div className="h-10 w-10 rounded-full border border-dashed border-amber-500/30 flex items-center justify-center">
                                <UserPlus className="w-4 h-4 text-amber-500/50" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-amber-400/70">Vaga aberta</p>
                                <p className="text-[10px] text-amber-400/40">Clique para preencher</p>
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Em Teste Section */}
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-3">
                  <FlaskConical className="w-4 h-4 text-red-400" />
                  <h2 className="text-sm font-semibold text-red-400">Em Teste</h2>
                  {emTesteUsers.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">
                      {emTesteUsers.length}
                    </Badge>
                  )}
                  <button
                    onClick={() => setPreencherEmTesteOpen(true)}
                    className="ml-auto p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Cadastrar usuário em teste"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {emTesteUsers.length === 0 ? (
                  <p className="text-xs text-white/30 italic">Nenhum usuário em teste neste setor</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {emTesteUsers.map(user => (
                      <div
                        key={user.id}
                        className="p-1.5 rounded-xl bg-red-500/5 backdrop-blur-xl border border-red-500/20 transition-all duration-200 group/card"
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <Avatar className="h-10 w-10 border border-red-500/20">
                            {user.foto_perfil_url ? (
                              <AvatarImage src={user.foto_perfil_url} alt={user.nome} />
                            ) : null}
                            <AvatarFallback className="bg-red-600/20 text-red-300 text-xs font-medium">
                              {getInitials(user.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{user.nome}</p>
                            <p className="text-xs text-white/40 truncate">
                              {(systemRoles || []).find(r => r.key === user.role)?.label || ROLE_LABELS[user.role] || user.role}
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenTransfer(user)}
                            className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80"
                            title="Transferir função"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setUserToDeactivate(user)}
                            className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"
                            title="Desativar usuário"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Criar Vaga Dialog */}
      <Dialog open={criarVagaOpen} onOpenChange={setCriarVagaOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Vaga</DialogTitle>
            <DialogDescription className="text-white/60">Crie uma solicitação de vaga para o setor selecionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Cargo *</label>
              <Select value={novaVagaCargo} onValueChange={setNovaVagaCargo}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {rolesForSelectedSetor.map(role => (
                    <SelectItem key={role.key} value={role.key} className="text-white hover:bg-white/10">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/60">Justificativa *</label>
              <Textarea
                value={novaVagaJustificativa}
                onChange={e => setNovaVagaJustificativa(e.target.value)}
                placeholder="Descreva a justificativa para a abertura desta vaga..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCriarVagaOpen(false)} className="text-white/60">
              Cancelar
            </Button>
            <Button
              onClick={handleCriarVaga}
              disabled={criandoVaga || !novaVagaCargo || !novaVagaJustificativa.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {criandoVaga ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Vaga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preencher Em Teste Dialog */}
      <PreencherVagaDialog
        open={preencherEmTesteOpen}
        onOpenChange={setPreencherEmTesteOpen}
        defaultRole=""
        defaultSetor={selectedSetor}
        emTeste
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["all-users"] });
        }}
      />

      {/* Transfer Dialog */}
      <Dialog open={!!transferUser} onOpenChange={(open) => !open && setTransferUser(null)}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Transferir Colaborador</DialogTitle>
          </DialogHeader>
          {transferUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <Avatar className="h-10 w-10 border border-white/10">
                  {transferUser.foto_perfil_url ? (
                    <AvatarImage src={transferUser.foto_perfil_url} alt={transferUser.nome} />
                  ) : null}
                  <AvatarFallback className="bg-blue-600/20 text-blue-300 text-xs font-medium">
                    {getInitials(transferUser.nome)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{transferUser.nome}</p>
                  <p className="text-xs text-white/40">{transferUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/60">Nova função</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    {rolesBySetor.map(group => (
                      <SelectGroup key={group.setor}>
                        <SelectLabel className="text-white/40 text-xs">{group.label}</SelectLabel>
                        {group.roles.map(role => (
                          <SelectItem key={role.key} value={role.key} className="text-white hover:bg-white/10">
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTransferUser(null)} className="text-white/60">
              Cancelar
            </Button>
            <Button
              onClick={handleTransferUser}
              disabled={transferring || !newRole || newRole === transferUser?.role}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {transferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Delete Vaga Alert */}
      <AlertDialog open={!!vagaToDelete} onOpenChange={(open) => !open && setVagaToDelete(null)}>
        <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir vaga</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Deseja realmente excluir esta vaga de <span className="font-semibold text-white/80">{(systemRoles || []).find(r => r.key === vagaToDelete?.cargo)?.label || vagaToDelete?.cargo}</span>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!vagaToDelete) return;
                await deleteVaga(vagaToDelete.id);
                setVagaToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateRoleModal open={createRoleModalOpen} onOpenChange={setCreateRoleModalOpen} />
      <EditRoleModal open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)} role={editingRole} />

    </MinimalistLayout>
  );
}
