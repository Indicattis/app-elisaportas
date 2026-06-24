import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useContratosTemplates } from "@/hooks/useContratosTemplates";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { substituirVariaveis } from "@/hooks/useContratoVariaveis";
import { generateContratoPDF } from "@/utils/contratoPDFGenerator";
import { ContratoVariaveis } from "@/types/contrato";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

interface GerarContratoAvulsoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = Omit<ContratoVariaveis, "empresa_nome" | "empresa_cnpj" | "empresa_endereco" | "empresa_cidade" | "empresa_cep" | "data_geracao">;

const emptyForm: FormState = {
  cliente_nome: "",
  cliente_telefone: "",
  cliente_email: "",
  cliente_cpf: "",
  cliente_endereco: "",
  cliente_cidade: "",
  cliente_estado: "",
  cliente_bairro: "",
  cliente_cep: "",
  venda_numero: "",
  venda_data: new Date().toLocaleDateString("pt-BR"),
  venda_valor_total: "",
  venda_valor_produtos: "",
  venda_valor_instalacao: "",
  venda_valor_frete: "",
  venda_forma_pagamento: "",
  venda_numero_parcelas: "",
  venda_valor_entrada: "",
  venda_previsao_entrega: "",
  produtos_lista: "",
  produtos_quantidade_total: "",
  atendente_nome: "",
  atendente_telefone: "",
};

export function GerarContratoAvulsoModal({ open, onOpenChange }: GerarContratoAvulsoModalProps) {
  const { user } = useAuth();
  const { templates } = useContratosTemplates();
  const { settings: companySettings } = useCompanySettings();

  const [templateId, setTemplateId] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const templatesAtivos = useMemo(() => (templates || []).filter((t) => t.ativo), [templates]);
  const templateSelecionado = templatesAtivos.find((t) => t.id === templateId);

  // Pré-preenche atendente com o usuário logado
  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("admin_users")
        .select("nome, telefone")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();
      if (data) {
        setForm((prev) => ({
          ...prev,
          atendente_nome: prev.atendente_nome || data.nome || "",
          atendente_telefone: prev.atendente_telefone || data.telefone || "",
        }));
      }
    })();
  }, [open, user?.id]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setTemplateId("");
    }
  }, [open]);

  const variaveisFinais: ContratoVariaveis | null = useMemo(() => {
    if (!companySettings) return null;
    return {
      ...form,
      empresa_nome: companySettings.nome || "",
      empresa_cnpj: companySettings.cnpj || "",
      empresa_endereco: companySettings.endereco || "",
      empresa_cidade: companySettings.cidade || "",
      empresa_cep: companySettings.cep || "",
      data_geracao: new Date().toLocaleDateString("pt-BR"),
    };
  }, [form, companySettings]);

  const previewConteudo = templateSelecionado && variaveisFinais
    ? substituirVariaveis(templateSelecionado.conteudo, variaveisFinais)
    : "";

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleGerar = () => {
    if (!templateSelecionado || !variaveisFinais || !companySettings) {
      toast.error("Selecione um template");
      return;
    }
    if (!form.cliente_nome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    try {
      const numero = form.venda_numero?.trim() || `AVULSO-${Date.now()}`;
      generateContratoPDF({
        template: templateSelecionado.conteudo,
        variaveis: { ...variaveisFinais, venda_numero: numero },
        numeroContrato: `CONT-${numero}`,
        companySettings,
      });
      toast.success("Contrato avulso gerado com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao gerar contrato avulso:", error);
      toast.error("Erro ao gerar contrato");
    }
  };

  const field = (id: keyof FormState, label: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={(form[id] as string) || ""} onChange={update(id)} placeholder={placeholder} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar Contrato Avulso</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="template">Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templatesAtivos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {field("cliente_nome", "Nome *")}
              {field("cliente_cpf", "CPF/CNPJ")}
              {field("cliente_telefone", "Telefone")}
              {field("cliente_email", "E-mail")}
              {field("cliente_endereco", "Endereço")}
              {field("cliente_bairro", "Bairro")}
              {field("cliente_cidade", "Cidade")}
              {field("cliente_estado", "Estado")}
              {field("cliente_cep", "CEP")}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Venda</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {field("venda_numero", "Número da venda", "Opcional")}
              {field("venda_data", "Data da venda")}
              {field("venda_previsao_entrega", "Previsão de entrega")}
              {field("venda_valor_total", "Valor total")}
              {field("venda_valor_produtos", "Valor dos produtos")}
              {field("venda_valor_instalacao", "Valor instalação")}
              {field("venda_valor_frete", "Valor frete")}
              {field("venda_valor_entrada", "Valor de entrada")}
              {field("venda_forma_pagamento", "Forma de pagamento")}
              {field("venda_numero_parcelas", "Nº de parcelas")}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Produtos</h3>
            <div className="space-y-1.5">
              <Label htmlFor="produtos_lista">Lista de produtos</Label>
              <Textarea id="produtos_lista" rows={4} value={form.produtos_lista} onChange={update("produtos_lista")} placeholder="Uma linha por produto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {field("produtos_quantidade_total", "Quantidade total")}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Atendente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {field("atendente_nome", "Nome do atendente")}
              {field("atendente_telefone", "Telefone do atendente")}
            </div>
          </section>

          {templateSelecionado && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Preview</h3>
              <div className="max-h-[300px] overflow-y-auto bg-muted/30 p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-sans">{previewConteudo}</pre>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGerar} disabled={!templateId || !companySettings}>
            <FileDown className="h-4 w-4 mr-2" />
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}