import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { SETOR_LABELS } from "@/utils/setorMapping";
import { useSetores } from "@/hooks/useSetores";

const roleSchema = z.object({
  key: z
    .string()
    .trim()
    .min(3, "A chave deve ter no mínimo 3 caracteres")
    .max(50, "A chave deve ter no máximo 50 caracteres")
    .regex(/^[a-z][a-z0-9_]*$/, "A chave deve começar com letra minúscula e conter apenas letras minúsculas, números e underscores")
    .refine((val) => val === val.toLowerCase(), "A chave deve estar em minúsculas"),
  label: z
    .string()
    .trim()
    .min(3, "O nome deve ter no mínimo 3 caracteres")
    .max(100, "O nome deve ter no máximo 100 caracteres"),
  setor: z.string().min(1, "Selecione um setor"),
  descricao: z.string().trim().max(500, "A descrição deve ter no máximo 500 caracteres").optional(),
  ordem: z.number().int().min(0).default(0),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoleModal({ open, onOpenChange }: CreateRoleModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setores: setoresDb } = useSetores();
  const setoresList = setoresDb.length > 0
    ? setoresDb.map(s => ({ key: s.key, label: s.label }))
    : Object.entries(SETOR_LABELS).map(([key, label]) => ({ key, label }));

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      key: "",
      label: "",
      setor: "",
      descricao: "",
      ordem: 0,
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const { data: result, error } = await supabase
        .from("system_roles")
        .upsert(
          {
            key: data.key,
            label: data.label,
            setor: data.setor,
            descricao: data.descricao || null,
            ordem: data.ordem,
            ativo: true,
          },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-roles"] });
      queryClient.invalidateQueries({ queryKey: ["system-roles-active"] });
      queryClient.invalidateQueries({ queryKey: ["role-stats"] });
      toast.success("Cargo criado com sucesso!");
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao criar cargo:", error);
      if (error.code === "23505") {
        toast.error("Já existe um cargo com essa chave");
      } else {
        toast.error("Erro ao criar cargo: " + error.message);
      }
    },
  });

  const onSubmit = async (data: RoleFormData) => {
    setIsSubmitting(true);
    try {
      await createRoleMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-black/90 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Criar Novo Cargo</DialogTitle>
          <DialogDescription className="text-white/50">
            Adicione um novo cargo ao sistema. A chave deve ser única e seguir o padrão snake_case.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Chave do Cargo *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: analista_vendas"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                    />
                  </FormControl>
                  <FormDescription className="text-white/40">
                    Identificador único em snake_case (letras minúsculas, números e underscores).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Criar Cargo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
