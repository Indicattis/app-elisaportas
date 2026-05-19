import { useState, useRef, useEffect } from 'react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { useAllUsers } from '@/hooks/useAllUsers';
import { useVagas, type Vaga } from '@/hooks/useVagas';
import { SETOR_LABELS } from '@/utils/setorMapping';
import { ROLE_LABELS } from '@/types/permissions';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, Plus, Trash2, ArrowRightLeft, Pencil, X, GripVertical, DollarSign, UserX, Check, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateRoleModal } from '@/components/admin/CreateRoleModal';
import { EditRoleModal } from '@/components/admin/EditRoleModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { User } from '@/hooks/useAllUsers';
import { PreencherVagaDialog } from '@/components/vagas/PreencherVagaDialog';
import { SelecionarUsuarioVagaDialog } from '@/components/vagas/SelecionarUsuarioVagaDialog';
import { TransferirParaVagaDialog } from '@/components/vagas/TransferirParaVagaDialog';

const SETOR_KEYS = Object.keys(SETOR_LABELS);

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

interface RoleGroup {
  role: string;
  label: string;
  users: User[];
  openVagas: number;
  openVagasList: Vaga[];
}

interface SortableRoleGroupProps {
  group: RoleGroup;
  allUsers: User[];
  systemRoles: { id: string; key: string; label: string; setor: string | null; descricao: string | null; ativo: boolean; ordem: number }[];
  onEditRole: (role: any) => void;
  onDeleteRole: (roleKey: string) => void;
  onChangeUserRole: (user: User) => void;
  onCancelVaga: (vagaId: string) => void;
  onFillVaga: (vaga: Vaga) => void;
  onUpdateCusto: (userId: string, value: number | null) => void;
  onUserReorder: (roleKey: string, updates: { id: string; ordem: number }[]) => void;
  onDeactivateUser: (user: User) => void;
}

function SortableUserCard({ user, children }: { user: User; children: (dragHandleProps: Record<string, any>, isDragging: boolean) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: user.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners }, isDragging)}
    </div>
  );
}

function InlineCustoEditor({ user, onSave }: { user: User; onSave: (userId: string, value: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleOpen = () => {
    const current = user.custo_colaborador;
    setInputValue(current != null ? current.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    setOpen(true);
  };

  const handleConfirm = () => {
    const cleaned = inputValue.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    onSave(user.id, isNaN(parsed) ? null : parsed);
    setOpen(false);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleInputChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue) {
      const formatted = (parseInt(numericValue) / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setInputValue(formatted);
    } else {
      setInputValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={handleOpen}
          className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          {user.custo_colaborador != null ? formatCurrency(user.custo_colaborador) : 'Definir custo'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-muted-foreground">Custo (R$)</label>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            placeholder="0,00"
            className="h-8 text-sm"
          />
          <Button size="sm" className="h-7 text-xs" onClick={handleConfirm}>Salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SortableRoleGroup({ group, allUsers, systemRoles, onEditRole, onDeleteRole, onChangeUserRole, onCancelVaga, onFillVaga, onUpdateCusto, onUserReorder, onDeactivateUser }: SortableRoleGroupProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.role });

  const userDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleUserDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.users.findIndex(u => u.id === active.id);
    const newIndex = group.users.findIndex(u => u.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = [...group.users];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    const updates = newOrder.map((u, i) => ({ id: u.id, ordem: i + 1 }));
    onUserReorder(group.role, updates);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  };

  const total = group.users.length + group.openVagas;
  const isFull = group.openVagas === 0 && group.users.length > 0;
  const isEmpty = group.users.length === 0 && group.openVagas === 0;

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-white/30 hover:text-white/60 transition-all touch-none"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-semibold text-white/80">{group.label}</h2>
        <Badge
          variant="outline"
          className={`text-[10px] ${
            isEmpty
              ? 'border-white/10 text-white/30 bg-white/5'
              : isFull
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
          }`}
        >
          {group.users.length}/{total || 0}
        </Badge>
        <button
          onClick={() => {
            const role = systemRoles.find(r => r.key === group.role);
            if (role) onEditRole(role);
          }}
          className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-all"
          title="Editar função"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {isEmpty && (
          <button
            onClick={() => onDeleteRole(group.role)}
            className="ml-auto flex items-center gap-1 text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
            title="Excluir função"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <DndContext sensors={userDndSensors} collisionDetection={closestCenter} onDragEnd={handleUserDragEnd}>
        <SortableContext items={group.users.map(u => u.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.users.map(user => (
              <SortableUserCard key={user.id} user={user}>
                {(dragHandleProps, isUserDragging) => (
                  <div
                    className={`group p-1.5 rounded-xl backdrop-blur-xl hover:bg-white/[0.08] transition-all duration-200 ${
                      user.em_teste
                        ? "bg-blue-500/10 border border-blue-500/30"
                        : "bg-white/5 border border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <button
                        {...dragHandleProps}
                        className="cursor-grab active:cursor-grabbing p-0.5 text-white/20 hover:text-white/50 transition-all touch-none opacity-0 group-hover:opacity-100"
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </button>
                      <Avatar className={`h-10 w-10 border ${user.em_teste ? "border-blue-500/30" : "border-white/10"}`}>
                        {user.foto_perfil_url ? (
                          <AvatarImage src={user.foto_perfil_url} alt={user.nome} />
                        ) : null}
                        <AvatarFallback className={`text-xs font-medium ${user.em_teste ? "bg-blue-500/30 text-blue-200" : "bg-blue-600/20 text-blue-300"}`}>
                          {getInitials(user.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">{user.nome}</p>
                          {user.em_teste && (
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] px-1.5 py-0">
                              Em teste
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                        <InlineCustoEditor user={user} onSave={onUpdateCusto} />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                        <button
                          onClick={() => onChangeUserRole(user)}
                          className="p-1.5 rounded-lg hover:bg-blue-500/20 text-white/30 hover:text-blue-400 transition-all"
                          title="Alterar função"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeactivateUser(user)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                          title="Remover do organograma"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </SortableUserCard>
            ))}
            {group.openVagasList.map((vaga) => (
              <div
                key={vaga.id}
                onClick={() => onFillVaga(vaga)}
                className="group/vaga p-1.5 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 relative cursor-pointer hover:bg-amber-500/10 transition-all"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-10 w-10 rounded-full border border-dashed border-amber-500/30 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-amber-500/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-400/70">Vaga aberta</p>
                    <p className="text-[10px] text-amber-400/40">Clique para preencher</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancelVaga(vaga.id); }}
                    className="opacity-0 group-hover/vaga:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                    title="Cancelar vaga"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {group.filledVagasList.map((vaga) => {
              const filledUser = vaga.preenchida_por ? allUsers.find(u => u.id === vaga.preenchida_por) : null;
              return (
                <div
                  key={vaga.id}
                  className="p-1.5 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 relative"
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {filledUser?.foto_perfil_url ? (
                      <Avatar className="h-10 w-10 border border-emerald-500/30">
                        <AvatarImage src={filledUser.foto_perfil_url} />
                        <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-400">
                          {filledUser.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-500/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-emerald-400/70">
                        {filledUser ? filledUser.nome : 'Vaga preenchida'}
                      </p>
                      <p className="text-[10px] text-emerald-400/40">Preenchida</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default function GestaoColaboradoresDirecao() {
  const [selectedSetor, setSelectedSetor] = useState(SETOR_KEYS[0]);
  const { data: allUsers, isLoading } = useAllUsers();
  const { vagas, createVaga, updateVagaStatus } = useVagas();
  const queryClient = useQueryClient();


  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);

  const [vagaDialogOpen, setVagaDialogOpen] = useState(false);
  const [vagaDialogRole, setVagaDialogRole] = useState<string>('');
  const [vagaJustificativa, setVagaJustificativa] = useState('');
  const [creatingVaga, setCreatingVaga] = useState(false);

  const [userToChangeRole, setUserToChangeRole] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');
  const [changingRole, setChangingRole] = useState(false);

  const [preencherVagaOpen, setPreencherVagaOpen] = useState(false);
  const [preencherVagaEmTeste, setPreencherVagaEmTeste] = useState(false);
  const [vagaToFill, setVagaToFill] = useState<Vaga | null>(null);
  const [selecionarUsuarioOpen, setSelecionarUsuarioOpen] = useState(false);

  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [userToTransfer, setUserToTransfer] = useState<User | null>(null);

  const [editingRole, setEditingRole] = useState<{
    id: string; key: string; label: string; setor: string | null;
    descricao: string | null; ativo: boolean; ordem: number;
  } | null>(null);

  const { data: systemRoles } = useQuery({
    queryKey: ['system-roles-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_roles')
        .select('id, key, label, setor, descricao, ativo, ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      return data || [];
    },
  });

  const getRolesForSetor = (setor: string) => {
    return (systemRoles || [])
      .filter(r => r.setor === setor && r.key !== 'administrador')
      .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999))
      .map(r => r.key);
  };

  const rolesForSetor = getRolesForSetor(selectedSetor);
  const filteredUsers = (allUsers || []).filter(u => rolesForSetor.includes(u.role as any));

  const getSetorCounts = (setor: string) => {
    const roles = getRolesForSetor(setor);
    const users = (allUsers || []).filter(u => roles.includes(u.role as any));
    const vagasAbertas = (vagas || []).filter(v => roles.includes(v.cargo as any) && (v.status === 'aberta' || v.status === 'em_analise'));
    const total = users.length + vagasAbertas.length;
    return { current: users.length, total };
  };

  const getSetorCusto = (setor: string) => {
    const roles = getRolesForSetor(setor);
    const users = (allUsers || []).filter(u => roles.includes(u.role as any));
    const total = users.reduce((acc, u) => acc + (Number(u.custo_colaborador) || 0), 0);
    const comCusto = users.filter(u => u.custo_colaborador != null && u.custo_colaborador > 0).length;
    return { total, comCusto, totalUsers: users.length };
  };

  const formatCurrencyValue = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const custoSetorAtual = getSetorCusto(selectedSetor);

  const openVagasForRole = (role: string): Vaga[] =>
    (vagas || []).filter(v => v.cargo === role && (v.status === 'aberta' || v.status === 'em_analise'));

  const openVagasByRole = (role: string) => openVagasForRole(role).length;

  const grouped = rolesForSetor.map(role => {
    const usersInRole = filteredUsers
      .filter(u => u.role === role && u.em_teste !== true)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    return {
      role,
      label: (systemRoles || []).find(r => r.key === role)?.label || ROLE_LABELS[role] || role,
      users: usersInRole,
      openVagas: openVagasByRole(role),
      openVagasList: openVagasForRole(role),
    };
  });

  const emTesteUsers = filteredUsers.filter(u => u.em_teste === true);

  const getSetorEmTesteCount = (setor: string) => {
    const roles = getRolesForSetor(setor);
    return (allUsers || []).filter(u => roles.includes(u.role as any) && u.em_teste === true).length;
  };

  // DnD for role ordering
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleRoleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rolesForSetor.indexOf(active.id as string);
    const newIndex = rolesForSetor.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...rolesForSetor];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    // Optimistic update: update systemRoles cache
    const updates = newOrder.map((roleKey, index) => {
      const sr = (systemRoles || []).find(r => r.key === roleKey);
      return sr ? { id: sr.id, ordem: index + 1 } : null;
    }).filter(Boolean) as { id: string; ordem: number }[];

    // Optimistic cache update
    queryClient.setQueryData(['system-roles-active'], (old: typeof systemRoles) =>
      (old || []).map(r => {
        const upd = updates.find(u => u.id === r.id);
        return upd ? { ...r, ordem: upd.ordem } : r;
      })
    );

    // Persist to DB
    let failed = false;
    for (const u of updates) {
      const { data, error } = await supabase.from('system_roles').update({ ordem: u.ordem }).eq('id', u.id).select();
      if (error || !data || data.length === 0) {
        failed = true;
        break;
      }
    }
    if (failed) {
      toast.error('Sem permissão para reordenar funções.');
    }
    queryClient.invalidateQueries({ queryKey: ['system-roles-active'] });
  };


  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    const { data, error } = await supabase
      .from('system_roles')
      .update({ ativo: false })
      .eq('key', roleToDelete)
      .select();
    setDeletingRole(false);
    setRoleToDelete(null);
    if (error) {
      toast.error('Erro ao excluir função: ' + error.message);
    } else if (!data || data.length === 0) {
      toast.error('Sem permissão para excluir funções. Contate um administrador.');
    } else {
      toast.success('Função excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['system-roles-active'] });
    }
  };

  const handleCreateVaga = async () => {
    if (!vagaDialogRole || !vagaJustificativa.trim()) return;
    setCreatingVaga(true);
    await createVaga({ cargo: vagaDialogRole as any, justificativa: vagaJustificativa.trim() });
    setCreatingVaga(false);
    setVagaDialogOpen(false);
    setVagaDialogRole('');
    setVagaJustificativa('');
  };

  const handleCancelVaga = async (vagaId: string) => {
    await updateVagaStatus(vagaId, 'fechada');
  };

  const handleChangeRole = async () => {
    if (!userToChangeRole || !newRole || newRole === userToChangeRole.role) return;
    setChangingRole(true);
    const { error } = await supabase
      .from('admin_users')
      .update({ role: newRole })
      .eq('id', userToChangeRole.id);
    setChangingRole(false);
    setUserToChangeRole(null);
    if (error) {
      toast.error('Erro ao alterar função');
    } else {
      toast.success('Função alterada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    }
  };

  const handleUpdateCusto = async (userId: string, value: number | null) => {
    const { error } = await (supabase
      .from('admin_users')
      .update({ custo_colaborador: value } as any)
      .eq('id', userId));
    if (error) {
      toast.error('Erro ao atualizar custo');
    } else {
      toast.success('Custo atualizado');
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    }
  };

  const handleUserReorder = async (_roleKey: string, updates: { id: string; ordem: number }[]) => {
    // Optimistic update
    queryClient.setQueryData(['all-users'], (old: User[] | undefined) =>
      (old || []).map(u => {
        const upd = updates.find(x => x.id === u.id);
        return upd ? { ...u, ordem: upd.ordem } : u;
      })
    );

    // Persist
    for (const u of updates) {
      await (supabase.from('admin_users').update({ ordem: u.ordem } as any).eq('id', u.id));
    }
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
  };

  return (
    <MinimalistLayout
      title="Organograma RH"
      subtitle="Colaboradores por setor"
      backPath="/direcao"
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
            onClick={() => { setVagaDialogOpen(true); setVagaDialogRole(''); setVagaJustificativa(''); }}
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
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Organograma RH' },
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
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
              >
                {SETOR_LABELS[setor]}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isFull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
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
        {/* Mobile: custo do setor */}
        <div className="md:hidden flex items-center gap-2 px-1 text-xs">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400/70" />
          <span className="text-white/50">Custo do setor:</span>
          <span className="font-semibold text-emerald-400">{formatCurrencyValue(custoSetorAtual.total)}</span>
          <span className="text-white/30">({custoSetorAtual.comCusto}/{custoSetorAtual.totalUsers})</span>
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
                        ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {SETOR_LABELS[setor]}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isFull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {counts.current}/{counts.total}
                      </span>
                      {emTesteCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          {emTesteCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Sidebar: custo do setor e índices */}
          <div className="mt-3 p-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400/70" />
              <span className="text-xs font-medium text-white/60">Custo do Setor</span>
            </div>
            <p className="text-lg font-bold text-emerald-400">{formatCurrencyValue(custoSetorAtual.total)}</p>
            <p className="text-[10px] text-white/30 mt-1">{custoSetorAtual.comCusto} de {custoSetorAtual.totalUsers} com custo definido</p>
          </div>

          {/* Quantidade de colaboradores no setor */}
          <div className="mt-3 p-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-400/70" />
              <span className="text-xs font-medium text-white/60">Colaboradores no Setor</span>
            </div>
            <p className="text-lg font-bold text-blue-400">{custoSetorAtual.totalUsers}</p>
            <p className="text-[10px] text-white/30 mt-1">ativos visíveis no organograma</p>
          </div>

          {/* Quantidade total de colaboradores da empresa */}
          <div className="mt-3 p-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-violet-400/70" />
              <span className="text-xs font-medium text-white/60">Total Colaboradores</span>
            </div>
            <p className="text-lg font-bold text-violet-400">{(allUsers || []).length}</p>
            <p className="text-[10px] text-white/30 mt-1">todos os colaboradores da empresa</p>
          </div>

          {/* Custo total de colaboradores da empresa */}
          <div className="mt-3 p-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-amber-400/70" />
              <span className="text-xs font-medium text-white/60">Custo Total Empresa</span>
            </div>
            <p className="text-lg font-bold text-amber-400">
              {formatCurrencyValue((allUsers || []).reduce((acc, u) => acc + (Number(u.custo_colaborador) || 0), 0))}
            </p>
            <p className="text-[10px] text-white/30 mt-1">
              {(allUsers || []).filter(u => u.custo_colaborador != null && u.custo_colaborador > 0).length} com custo definido
            </p>
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
            <>
             <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleRoleDragEnd}>
               <SortableContext items={rolesForSetor} strategy={verticalListSortingStrategy}>
                 <div className="space-y-6">
                   {grouped.map(group => (
                     <SortableRoleGroup
                       key={group.role}
                        group={group}
                        allUsers={allUsers || []}
                        systemRoles={systemRoles || []}
                       onEditRole={setEditingRole}
                       onDeleteRole={setRoleToDelete}
                       
                       onChangeUserRole={(user) => { setUserToChangeRole(user); setNewRole(user.role); }}
                       onCancelVaga={handleCancelVaga}
                       onFillVaga={(vaga) => { setVagaToFill(vaga); setPreencherVagaEmTeste(false); setSelecionarUsuarioOpen(true); }}
                         onUpdateCusto={handleUpdateCusto}
                         onUserReorder={handleUserReorder}
                         onDeactivateUser={setUserToDeactivate}
                       />
                   ))}
                 </div>
               </SortableContext>
             </DndContext>

             {/* Seção Em Teste */}
             <div className="mt-8 pt-6 border-t border-red-500/20">
               <div className="flex items-center gap-3 mb-4">
                 <h2 className="text-sm font-semibold text-red-400">Em Teste</h2>
                 <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                   {emTesteUsers.length}
                 </Badge>
                 <button
                   onClick={() => { setVagaToFill(null); setPreencherVagaEmTeste(true); setPreencherVagaOpen(true); }}
                   className="ml-auto p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                   title="Cadastrar usuário em teste"
                 >
                   <Plus className="w-4 h-4" />
                 </button>
               </div>
               {emTesteUsers.length === 0 ? (
                 <p className="text-xs text-white/30">Nenhum colaborador em teste neste setor.</p>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                   {emTesteUsers.map(user => (
                     <div
                       key={user.id}
                       className="group p-1.5 rounded-xl backdrop-blur-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all duration-200"
                     >
                       <div className="flex items-center gap-3 px-3 py-2.5">
                         <Avatar className="h-10 w-10 border border-red-500/30">
                           {user.foto_perfil_url ? (
                             <AvatarImage src={user.foto_perfil_url} alt={user.nome} />
                           ) : null}
                           <AvatarFallback className="text-xs font-medium bg-red-500/20 text-red-300">
                             {getInitials(user.nome)}
                           </AvatarFallback>
                         </Avatar>
                         <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2">
                             <p className="text-sm font-medium text-white truncate">{user.nome}</p>
                             <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px] px-1.5 py-0">
                               Em teste
                             </Badge>
                           </div>
                           <p className="text-xs text-white/40 truncate">{user.email}</p>
                           <p className="text-[10px] text-white/30">{(systemRoles || []).find(r => r.key === user.role)?.label || user.role}</p>
                         </div>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                            <button
                              onClick={() => setUserToTransfer(user)}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-white/30 hover:text-emerald-400 transition-all"
                              title="Transferir para vaga"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setUserToChangeRole(user); setNewRole(user.role); }}
                              className="p-1.5 rounded-lg hover:bg-blue-500/20 text-white/30 hover:text-blue-400 transition-all"
                              title="Alterar função"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setUserToDeactivate(user)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                              title="Remover do organograma"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
            </>
           )}
        </div>
      </div>


      {/* Remove from organograma confirmation */}
      <AlertDialog open={!!userToDeactivate} onOpenChange={open => !open && setUserToDeactivate(null)}>
        <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do organograma</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja remover <strong className="text-white">{userToDeactivate?.nome}</strong> do organograma? O colaborador continuará ativo no sistema, mas deixará de aparecer no organograma. Para exibi-lo novamente, anexe-o a uma vaga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!userToDeactivate) return;
                setDeactivating(true);
                const { error } = await supabase.rpc('remover_colaborador_organograma' as any, {
                  p_admin_user_id: userToDeactivate.id,
                });
                setDeactivating(false);
                if (error) {
                  toast.error(error.message || 'Erro ao remover do organograma');
                  console.error(error);
                } else {
                  toast.success(`${userToDeactivate.nome} foi removido do organograma e uma vaga foi aberta`);
                  queryClient.invalidateQueries({ queryKey: ['all-users'] });
                  queryClient.invalidateQueries({ queryKey: ['all-users-including-hidden'] });
                  queryClient.invalidateQueries({ queryKey: ['vagas'] });
                }
                setUserToDeactivate(null);
              }}
              disabled={deactivating}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deactivating ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete role confirmation */}
      <AlertDialog open={!!roleToDelete} onOpenChange={open => !open && setRoleToDelete(null)}>
        <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir função</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir a função <strong className="text-white">{roleToDelete && (ROLE_LABELS[roleToDelete as keyof typeof ROLE_LABELS] || roleToDelete)}</strong>? Ela será desativada do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={deletingRole}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingRole ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create vaga dialog */}
      <Dialog open={vagaDialogOpen} onOpenChange={setVagaDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Solicitar vaga</DialogTitle>
            <DialogDescription className="text-white/60">
              Selecione a função e justifique a abertura da vaga.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={vagaDialogRole} onValueChange={setVagaDialogRole}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                {(systemRoles || []).map(r => (
                  <SelectItem key={r.key} value={r.key} className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Justificativa da vaga..."
              value={vagaJustificativa}
              onChange={e => setVagaJustificativa(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateVaga}
              disabled={creatingVaga || !vagaDialogRole || !vagaJustificativa.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creatingVaga ? 'Criando...' : 'Criar vaga'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change role dialog */}
      <Dialog open={!!userToChangeRole} onOpenChange={open => !open && setUserToChangeRole(null)}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Alterar função</DialogTitle>
            <DialogDescription className="text-white/60">
              Alterar a função de <strong className="text-white">{userToChangeRole?.nome}</strong>
            </DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10">
              {(systemRoles || []).map(r => (
                <SelectItem key={r.key} value={r.key} className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              onClick={handleChangeRole}
              disabled={changingRole || !newRole || newRole === userToChangeRole?.role}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {changingRole ? 'Alterando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create role modal */}
      <CreateRoleModal
        open={createRoleModalOpen}
        onOpenChange={setCreateRoleModalOpen}
      />

      {/* Edit role modal */}
      <EditRoleModal
        open={!!editingRole}
        onOpenChange={(open) => { if (!open) setEditingRole(null); }}
        role={editingRole}
      />

      {/* Selecionar usuário existente para vaga */}
      <SelecionarUsuarioVagaDialog
        open={selecionarUsuarioOpen}
        onOpenChange={(open) => { setSelecionarUsuarioOpen(open); if (!open) setVagaToFill(null); }}
        vagaCargo={vagaToFill?.cargo || ''}
        vagaId={vagaToFill?.id}
        onSelectExisting={async (user) => {
          if (vagaToFill) {
            await updateVagaStatus(vagaToFill.id, 'preenchida', user.id);
          }
          queryClient.invalidateQueries({ queryKey: ['all-users'] });
          setSelecionarUsuarioOpen(false);
          setVagaToFill(null);
        }}
        onCreateNew={() => {
          setSelecionarUsuarioOpen(false);
          setPreencherVagaEmTeste(false);
          setPreencherVagaOpen(true);
        }}
      />

      {/* Preencher vaga dialog (criar novo) */}
      <PreencherVagaDialog
        open={preencherVagaOpen}
        onOpenChange={(open) => { setPreencherVagaOpen(open); if (!open) { setVagaToFill(null); setPreencherVagaEmTeste(false); } }}
        defaultRole={vagaToFill?.cargo || ''}
        defaultSetor={preencherVagaEmTeste ? selectedSetor : undefined}
        emTeste={preencherVagaEmTeste}
        onSuccess={async (createdAuthUserId) => {
          if (vagaToFill && !preencherVagaEmTeste) {
            let adminUserId: string | undefined;
            if (createdAuthUserId) {
              const { data } = await supabase.from('admin_users').select('id').eq('user_id', createdAuthUserId).single();
              adminUserId = data?.id;
            }
            await updateVagaStatus(vagaToFill.id, 'preenchida', adminUserId);
          }
          queryClient.invalidateQueries({ queryKey: ['all-users'] });
        }}
      />
      {/* Transferir em teste para vaga */}
      <TransferirParaVagaDialog
        open={!!userToTransfer}
        onOpenChange={(o) => { if (!o) setUserToTransfer(null); }}
        user={userToTransfer}
        systemRoles={systemRoles || []}
      />
    </MinimalistLayout>
  );
}