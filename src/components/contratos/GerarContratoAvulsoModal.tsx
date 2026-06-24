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

  const Field = ({ id, label, value, onChange, placeholder, type = "text" }: { id: keyof FormState; label: string; value: string; onChange: (e: any) => void; placeholder?: string; type?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} />
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
              <Field id="cliente_nome" label="Nome *" value={form.cliente_nome} onChange={update("cliente_nome")} />
              <Field id="cliente_cpf" label="CPF/CNPJ" value={form.cliente_cpf || ""} onChange={update("cliente_cpf")} />
              <Field id="cliente_telefone" label="Telefone" value={form.cliente_telefone || ""} onChange={update("cliente_telefone")} />
              <Field id="cliente_email" label="E-mail" value={form.cliente_email || ""} onChange={update("cliente_email")} />
              <Field id="cliente_endereco" label="Endereço" value={form.cliente_endereco || ""} onChange={update("cliente_endereco")} />
              <Field id="cliente_bairro" label="Bairro" value={form.cliente_bairro || ""} onChange={update("cliente_bairro")} />
              <Field id="cliente_cidade" label="Cidade" value={form.cliente_cidade || ""} onChange={update("cliente_cidade")} />
              <Field id="cliente_estado" label="Estado" value={form.cliente_estado || ""} onChange={update("cliente_estado")} />
              <Field id="cliente_cep" label="CEP" value={form.cliente_cep || ""} onChange={update("cliente_cep")} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Venda</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field id="venda_numero" label="Número da venda" value={form.venda_numero} onChange={update("venda_numero")} placeholder="Opcional" />
              <Field id="venda_data" label="Data da venda" value={form.venda_data} onChange={update("venda_data")} />
              <Field id="venda_previsao_entrega" label="Previsão de entrega" value={form.venda_previsao_entrega || ""} onChange={update("venda_previsao_entrega")} />
              <Field id="venda_valor_total" label="Valor total" value={form.venda_valor_total} onChange={update("venda_valor_total")} />
              <Field id="venda_valor_produtos" label="Valor dos produtos" value={form.venda_valor_produtos} onChange={update("venda_valor_produtos")} />
              <Field id="venda_valor_instalacao" label="Valor instalação" value={form.venda_valor_instalacao} onChange={update("venda_valor_instalacao")} />
              <Field id="venda_valor_frete" label="Valor frete" value={form.venda_valor_frete} onChange={update("venda_valor_frete")} />
              <Field id="venda_valor_entrada" label="Valor de entrada" value={form.venda_valor_entrada} onChange={update("venda_valor_entrada")} />
              <Field id="venda_forma_pagamento" label="Forma de pagamento" value={form.venda_forma_pagamento || ""} onChange={update("venda_forma_pagamento")} />
              <Field id="venda_numero_parcelas" label="Nº de parcelas" value={form.venda_numero_parcelas || ""} onChange={update("venda_numero_parcelas")} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Produtos</h3>
            <div className="space-y-1.5">
              <Label htmlFor="produtos_lista">Lista de produtos</Label>
              <Textarea id="produtos_lista" rows={4} value={form.produtos_lista} onChange={update("produtos_lista")} placeholder="Uma linha por produto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field id="produtos_quantidade_total" label="Quantidade total" value={form.produtos_quantidade_total} onChange={update("produtos_quantidade_total")} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Atendente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field id="atendente_nome" label="Nome do atendente" value={form.atendente_nome} onChange={update("atendente_nome")} />
              <Field id="atendente_telefone" label="Telefone do atendente" value={form.atendente_telefone || ""} onChange={update("atendente_telefone")} />
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