
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Plus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const errorTranslations: Record<string, string> = {
  "A user with this email address has already been registered":
    "Este email já está cadastrado no sistema. Edite o usuário existente para alterar suas informações.",
  "Missing required fields":
    "Preencha todos os campos obrigatórios (nome, email, senha e função).",
  "Insufficient permissions - admin role required":
    "Você não tem permissão para criar usuários.",
  "Invalid or expired token":
    "Sua sessão expirou. Faça login novamente.",
  "User account is inactive":
    "Sua conta está inativa.",
  "User not found":
    "Usuário não encontrado.",
  "No authorization header":
    "Você precisa estar autenticado.",
  "Failed to verify user permissions":
    "Erro ao verificar permissões.",
};

function translateError(message: string): string {
  return errorTranslations[message] || message;
}

interface AddUserDialogProps {
  onUserAdded: () => void;
}

export function AddUserDialog({ onUserAdded }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    password: "",
    role: "",
    data_nascimento: "",
    tipo_usuario: "colaborador",
    visivel_organograma: true,
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Você precisa estar autenticado para criar usuários");
      }

      // Call edge function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          role: formData.role,
          data_nascimento: formData.data_nascimento || null,
          tipo_usuario: formData.tipo_usuario,
          visivel_organograma: formData.visivel_organograma,
        },
      });

      if (error) {
        let errorMessage = "Erro ao criar usuário";
        if (error instanceof FunctionsHttpError) {
          try {
            const errorData = await error.context.json();
            errorMessage = translateError(errorData?.error || errorMessage);
          } catch {
            errorMessage = translateError(error.message);
          }
        } else {
          errorMessage = translateError(error.message);
        }
        throw new Error(errorMessage);
      }
      
      if (!data?.success) {
        throw new Error(translateError(data?.error || "Erro ao criar usuário"));
      }

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso",
      });

      setFormData({
        nome: "",
        email: "",
        password: "",
        role: "",
        data_nascimento: "",
        tipo_usuario: "colaborador",
        visivel_organograma: true,
      });
      setOpen(false);
      onUserAdded();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao criar usuário",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie uma nova conta de usuário para o sistema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">
                Nome
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="col-span-3"
                required
                minLength={6}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="data_nascimento" className="text-right">
                Aniversário
              </Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Função
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={loadingRoles}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {loadingRoles ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : systemRoles.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Nenhum cargo ativo disponível
                    </div>
                  ) : (
                    systemRoles.map((role) => (
                      <SelectItem key={role.key} value={role.key}>
                        {role.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tipo_usuario" className="text-right">
                Tipo
              </Label>
              <Select
                value={formData.tipo_usuario}
                onValueChange={(value) => setFormData({ ...formData, tipo_usuario: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="representante">Representante</SelectItem>
                  <SelectItem value="metamorfo">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="visivel_organograma" className="text-right">
                Organograma
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  id="visivel_organograma"
                  checked={formData.visivel_organograma}
                  onCheckedChange={(checked) => setFormData({ ...formData, visivel_organograma: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  Visível no organograma
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
