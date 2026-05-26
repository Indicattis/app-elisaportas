import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Mail, 
  Phone, 
  Calendar, 
  Building2, 
  CreditCard, 
  User,
  Users,
  Clock,
  DollarSign
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
  tipo_usuario?: string;
  visivel_organograma?: boolean;
}

interface UserDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  roleLabel: string;
  onAvatarUpdate?: (userId: string, newAvatarUrl: string | null) => void;
  onToggleAtivo?: (userId: string, novoStatus: boolean) => void;
  onToggleVisivelOrganograma?: (userId: string, novoStatus: boolean) => void;
}

export function UserDetailsModal({ open, onOpenChange, user, roleLabel, onAvatarUpdate, onToggleAtivo, onToggleVisivelOrganograma }: UserDetailsModalProps) {
  if (!user) return null;

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "Não informado";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não informado";
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "Não informado";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const setorLabels: Record<string, string> = {
    vendas: "Vendas",
    marketing: "Marketing",
    instalacoes: "Instalações",
    fabrica: "Fábrica",
    administrativo: "Administrativo",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Detalhes do Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com Avatar e Info Principal */}
          <div className="flex flex-col gap-4 pb-4 border-b border-border">
            <AvatarUpload
              userId={user.user_id}
              currentAvatarUrl={user.foto_perfil_url}
              userName={user.nome}
              onAvatarUpdate={(url) => onAvatarUpdate?.(user.user_id, url)}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-foreground truncate">{user.nome}</h3>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={user.ativo}
                    onCheckedChange={(checked) => onToggleAtivo?.(user.id, checked)}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <span className={`text-xs font-medium ${user.ativo ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {user.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {user.tipo_usuario === "representante" ? "Representante" : user.tipo_usuario === "metamorfo" ? "Geral" : "Colaborador"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Informações em Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Função */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Função</p>
                <p className="text-sm font-medium text-foreground">{roleLabel}</p>
              </div>
            </div>

            {/* Setor */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Setor</p>
                <p className="text-sm font-medium text-foreground">
                  {user.setor ? setorLabels[user.setor] || user.setor : "Não definido"}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              </div>
            </div>

            {/* CPF */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPF</p>
                <p className="text-sm font-medium text-foreground">{formatCPF(user.cpf)}</p>
              </div>
            </div>

            {/* Data de Nascimento */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nascimento</p>
                <p className="text-sm font-medium text-foreground">{formatDate(user.data_nascimento)}</p>
              </div>
            </div>

            {/* Salário */}
            {user.eh_colaborador && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Salário</p>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(user.salario)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Visível no Organograma */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Visível no Organograma</span>
            </div>
            <Switch
              checked={user.visivel_organograma ?? true}
              onCheckedChange={(checked) => onToggleVisivelOrganograma?.(user.id, checked)}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Datas de Sistema */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Criado em {formatDateTime(user.created_at)}</span>
              <span className="mx-2">•</span>
              <span>Atualizado em {formatDateTime(user.updated_at)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
