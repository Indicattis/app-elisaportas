import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import {
  Loader2,
  Save,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  visivel_organograma?: boolean;
}

type Source = "admin_users" | "representantes";

export default function AdminUserEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initialSource: Source =
    searchParams.get("tipo") === "representante" ? "representantes" : "admin_users";

  const [source, setSource] = useState<Source>(initialSource);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<Partial<AdminUser>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: systemRoles = [] } = useQuery({
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

  const roleLabelsMap = systemRoles.reduce((acc, r) => {
    acc[r.key] = r.label;
    return acc;
  }, {} as Record<string, string>);

  useEffect(() => {
    if (id) void fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchUser = async () => {
    if (!id) return;
    setLoading(true);
    try {
      let src: Source = initialSource;
      let data: any = null;

      if (src === "admin_users") {
        const res = await supabase.from("admin_users").select("*").eq("id", id).maybeSingle();
        if (res.error) throw res.error;
        data = res.data;
        if (!data) {
          const res2 = await supabase.from("representantes").select("*").eq("id", id).maybeSingle();
          if (res2.error) throw res2.error;
          data = res2.data;
          src = "representantes";
        }
      } else {
        const res = await supabase.from("representantes").select("*").eq("id", id).maybeSingle();
        if (res.error) throw res.error;
        data = res.data;
        if (!data) {
          const res2 = await supabase.from("admin_users").select("*").eq("id", id).maybeSingle();
          if (res2.error) throw res2.error;
          data = res2.data;
          src = "admin_users";
        }
      }

      if (!data) {
        toast({ variant: "destructive", title: "Não encontrado", description: "Usuário não localizado." });
        navigate("/admin/users");
        return;
      }

      const normalized: AdminUser =
        src === "representantes"
          ? {
              id: data.id,
              user_id: data.user_id,
              email: data.email,
              nome: data.nome,
              role: "representante",
              setor: null,
              cpf: null,
              data_nascimento: null,
              ativo: data.ativo,
              foto_perfil_url: data.foto_perfil_url ?? null,
              eh_colaborador: false,
              salario: null,
              created_at: data.created_at,
              updated_at: data.updated_at,
              tipo_usuario: "representante",
            }
          : (data as AdminUser);

      setSource(src);
      setUser(normalized);
      setForm({
        nome: normalized.nome,
        role: normalized.role,
        setor: normalized.setor,
        cpf: normalized.cpf,
        data_nascimento: normalized.data_nascimento,
        ativo: normalized.ativo,
        eh_colaborador: normalized.eh_colaborador,
        tipo_usuario: normalized.tipo_usuario,
        salario: normalized.salario,
        visivel_organograma: normalized.visivel_organograma ?? true,
      });
    } catch (error: any) {
      console.error("Erro ao buscar usuário:", error);
      toast({ variant: "destructive", title: "Erro", description: error?.message || "Erro ao carregar usuário" });
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (cpf: string | null | undefined) => {
    if (!cpf) return "";
    const cleaned = cpf.replace(/\D/g, "").slice(0, 11);
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (source === "admin_users") {
        const cpfNumerico = form.cpf ? form.cpf.replace(/\D/g, "") : null;
        const { error } = await supabase
          .from("admin_users")
          .update({
            nome: form.nome,
            role: form.role,
            setor: form.setor,
            cpf: cpfNumerico,
            data_nascimento: form.data_nascimento || null,
            ativo: form.ativo,
            eh_colaborador: form.eh_colaborador,
            tipo_usuario: form.tipo_usuario,
            salario: form.salario,
            visivel_organograma: form.visivel_organograma,
          })
          .eq("id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("representantes")
          .update({
            nome: form.nome,
            ativo: form.ativo,
          })
          .eq("id", user.id);
        if (error) throw error;
      }
      toast({ title: "Sucesso", description: "Usuário atualizado com sucesso" });
      await fetchUser();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({ variant: "destructive", title: "Erro", description: error?.message || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async () => {
    if (!user) return;
    const novoStatus = !user.ativo;
    try {
      const { error } = await supabase
        .from(source)
        .update({ ativo: novoStatus })
        .eq("id", user.id);
      if (error) throw error;
      setUser({ ...user, ativo: novoStatus });
      setForm((p) => ({ ...p, ativo: novoStatus }));
      toast({ title: novoStatus ? "Usuário ativado" : "Usuário desativado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error?.message || "Erro ao alterar status" });
    } finally {
      setConfirmToggle(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke<{
        success: boolean;
        mode?: "deleted" | "archived";
        message?: string;
        error?: string;
      }>("delete-user", { body: { user_id: user.user_id } });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      const wasArchived = response.data?.mode === "archived";
      toast({
        title: wasArchived ? "Usuário arquivado" : "Sucesso",
        description:
          response.data?.message ||
          (wasArchived
            ? `"${user.nome}" tinha histórico vinculado e foi arquivado`
            : `"${user.nome}" excluído com sucesso`),
      });
      navigate("/admin/users");
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast({ variant: "destructive", title: "Erro", description: error?.message || "Erro ao excluir usuário" });
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleAvatarUpdate = (url: string | null) => {
    if (!user) return;
    setUser({ ...user, foto_perfil_url: url });
  };

  const formatDateTime = (s: string) => {
    try {
      return format(new Date(s), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <MinimalistLayout title="Editar usuário" subtitle="Carregando..." backPath="/admin/users">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </MinimalistLayout>
    );
  }

  if (!user) return null;

  const isRepresentante = source === "representantes";

  return (
    <MinimalistLayout
      title="Editar usuário"
      subtitle={user.nome}
      backPath="/admin/users"
      headerActions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetPassword(true)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <KeyRound className="w-4 h-4 mr-2" />
            Resetar senha
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmToggle(true)}
            className={
              user.ativo
                ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                : "border-green-500/30 text-green-400 hover:bg-green-500/10"
            }
          >
            {user.ativo ? <UserX className="w-4 h-4 mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
            {user.ativo ? "Desativar" : "Ativar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Cabeçalho */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-20 h-20 flex-shrink-0">
                <AvatarUpload
                  userId={user.user_id}
                  currentAvatarUrl={user.foto_perfil_url}
                  userName={user.nome}
                  onAvatarUpdate={handleAvatarUpdate}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-white truncate">{user.nome}</h2>
                <p className="text-sm text-white/60 truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    className={
                      user.ativo
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/10 text-white/40"
                    }
                  >
                    {user.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline" className="text-white/70 border-white/20 capitalize">
                    {user.tipo_usuario}
                  </Badge>
                  {!isRepresentante && (
                    <Badge variant="outline" className="text-white/70 border-white/20">
                      {roleLabelsMap[user.role] || user.role}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados pessoais */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Dados pessoais</CardTitle>
            <CardDescription className="text-white/50">Informações básicas do usuário</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/70">Nome</Label>
              <Input
                value={form.nome || ""}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Email</Label>
              <Input
                value={user.email}
                disabled
                className="bg-white/5 border-white/10 text-white/60"
              />
            </div>
            {!isRepresentante && (
              <>
                <div className="space-y-2">
                  <Label className="text-white/70">CPF</Label>
                  <Input
                    value={formatCPF(form.cpf)}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Data de nascimento</Label>
                  <Input
                    type="date"
                    value={form.data_nascimento || ""}
                    onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Função e setor */}
        {!isRepresentante && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Função e setor</CardTitle>
              <CardDescription className="text-white/50">Permissões e organização</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Função</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemRoles.map((r) => (
                      <SelectItem key={r.key} value={r.key}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Setor</Label>
                <Select
                  value={form.setor || "none"}
                  onValueChange={(v) => setForm({ ...form, setor: v === "none" ? null : (v as any) })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não definido</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="instalacoes">Instalações</SelectItem>
                    <SelectItem value="fabrica">Fábrica</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Tipo de usuário</Label>
                <Select
                  value={form.tipo_usuario}
                  onValueChange={(v) => setForm({ ...form, tipo_usuario: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="metamorfo">Metamorfo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Salário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.salario ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, salario: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="bg-white/5 border-white/10 text-white"
                  disabled={!form.eh_colaborador}
                  placeholder={form.eh_colaborador ? "0,00" : "Apenas para colaboradores"}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm text-white">É colaborador</p>
                  <p className="text-xs text-white/50">Habilita salário e métricas internas</p>
                </div>
                <Switch
                  checked={!!form.eh_colaborador}
                  onCheckedChange={(v) => setForm({ ...form, eh_colaborador: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm text-white">Visível no organograma</p>
                  <p className="text-xs text-white/50">Exibe o usuário na árvore da equipe</p>
                </div>
                <Switch
                  checked={form.visivel_organograma ?? true}
                  onCheckedChange={(v) => setForm({ ...form, visivel_organograma: v })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sistema */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
              <span className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Criado em {formatDateTime(user.created_at)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Atualizado em {formatDateTime(user.updated_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {resetPassword && (
        <ResetPasswordModal
          open={resetPassword}
          onOpenChange={() => setResetPassword(false)}
          userId={user.user_id}
          userEmail={user.email}
          userName={user.nome}
        />
      )}

      <AlertDialog open={confirmToggle} onOpenChange={setConfirmToggle}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.ativo ? "Desativar usuário" : "Ativar usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.ativo
                ? `Tem certeza que deseja desativar "${user.nome}"? O usuário não conseguirá mais fazer login.`
                : `Tem certeza que deseja ativar "${user.nome}"? O usuário poderá fazer login novamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleAtivo}
              className={user.ativo ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {user.ativo ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{user.nome}"? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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