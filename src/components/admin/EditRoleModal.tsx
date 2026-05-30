import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { SETOR_LABELS } from "@/utils/setorMapping";
import { useSetores } from "@/hooks/useSetores";

const roleSchema = z.object({
  label: z
    .string()
    .trim()
    .min(3, "O nome deve ter no mínimo 3 caracteres")
    .max(100, "O nome deve ter no máximo 100 caracteres"),
  setor: z.string().min(1, "Selecione um setor"),
  descricao: z.string().trim().max(500, "A descrição deve ter no máximo 500 caracteres").optional(),
  ordem: z.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface SystemRole {
  id: string;
  key: string;
  label: string;
  setor: string | null;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
}

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SystemRole | null;
}

export function EditRoleModal({ open, onOpenChange, role }: EditRoleModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setores: setoresDb } = useSetores();
  const setoresList = setoresDb.length > 0
    ? setoresDb.map(s => ({ key: s.key, label: s.label }))
    : Object.entries(SETOR_LABELS).map(([key, label]) => ({ key, label }));

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      label: "",
      setor: "",
      descricao: "",
      ordem: 0,
      ativo: true,
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({
        label: role.label,
        setor: role.setor || "",
        descricao: role.descricao || "",
        ordem: role.ordem,
        ativo: role.ativo,
      });
    }
  }, [role, form]);

  const updateRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      if (!role) throw new Error("Role não encontrado");

      const { data: result, error } = await supabase
        .from("system_roles")
        .update({
          label: data.label,
          setor: data.setor || null,
          descricao: data.descricao || null,
          ordem: data.ordem,
          ativo: data.ativo,
        })
        .eq("id", role.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-roles"] });
      queryClient.invalidateQueries({ queryKey: ["system-roles-active"] });
      queryClient.invalidateQueries({ queryKey: ["role-stats"] });
      toast.success("Cargo atualizado com sucesso!");
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar cargo:", error);
      toast.error("Erro ao atualizar cargo: " + error.message);
    },
  });

  const onSubmit = async (data: RoleFormData) => {
    setIsSubmitting(true);
    try {
      await updateRoleMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-black/90 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Cargo</DialogTitle>
          <DialogDescription className="text-white/50">
            Atualize as informações do cargo. A chave não pode ser alterada.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Mostrar chave como read-only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Chave do Cargo</label>
              <div className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/50">
                <code>{role?.key}</code>
              </div>
              <p className="text-sm text-white/40">
                A chave não pode ser alterada após a criação do cargo.
              </p>
            </div>

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Nome do Cargo *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: Analista de Vendas"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                    />
                  </FormControl>
                  <FormDescription className="text-white/40">
                    Nome amigável que será exibido na interface do usuário.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="setor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Setor *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white/10 border-white/10 text-white">
                        <SelectValue placeholder="Selecione um setor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-black/95 border-white/10">
                      {setoresList.map(({ key, label }) => (
                        <SelectItem key={key} value={key} className="text-white/80 focus:bg-white/10 focus:text-white">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-white/40">
                    Setor ao qual este cargo pertence.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição das responsabilidades deste cargo..."
                      {...field}
                      disabled={isSubmitting}
                      rows={4}
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                    />
                  </FormControl>
                  <FormDescription className="text-white/40">
                    Descrição opcional das responsabilidades e atribuições do cargo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ordem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Ordem de Exibição</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={isSubmitting}
                      className="bg-white/10 border-white/10 text-white"
                    />
                  </FormControl>
                  <FormDescription className="text-white/40">
                    Ordem de exibição do cargo nas listas (menor número aparece primeiro).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-white/80">Cargo Ativo</FormLabel>
                    <FormDescription className="text-white/40">
                      Desative para impedir que novos usuários sejam atribuídos a este cargo.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
