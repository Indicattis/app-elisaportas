import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContratosTemplates } from "@/hooks/useContratosTemplates";
import { useVendas } from "@/hooks/useVendas";
import { useContratoVariaveis, substituirVariaveis } from "@/hooks/useContratoVariaveis";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { generateContratoPDF } from "@/utils/contratoPDFGenerator";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GerarContratoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaIdInicial?: string;
}

export function GerarContratoModal({ open, onOpenChange, vendaIdInicial }: GerarContratoModalProps) {
  const [vendaId, setVendaId] = useState(vendaIdInicial || '');
  const [templateId, setTemplateId] = useState('');
  const [clienteId, setClienteId] = useState<string>('');
  
  const { templates } = useContratosTemplates();
  const { vendas } = useVendas();
  const { data: variaveis, isLoading: isLoadingVariaveis } = useContratoVariaveis(vendaId);
  const { settings: companySettings } = useCompanySettings();

  const { data: clientes } = useQuery({
    queryKey: ['contratos-clientes-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email, cpf_cnpj, endereco, bairro, cidade, estado, cep')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const templatesAtivos = templates?.filter(t => t.ativo) || [];
  const templateSelecionado = templatesAtivos.find(t => t.id === templateId);
  const clienteSelecionado = clientes?.find(c => c.id === clienteId);

  // Sincronizar vendaId quando vendaIdInicial mudar ou modal abrir
  useEffect(() => {
    if (open && vendaIdInicial) {
      setVendaId(vendaIdInicial);
    }
  }, [open, vendaIdInicial]);

  const variaveisFinais = useMemo(() => {
    if (!variaveis) return variaveis;
    if (!clienteSelecionado) return variaveis;
    return {
      ...variaveis,
      cliente_nome: clienteSelecionado.nome ?? variaveis.cliente_nome,
      cliente_telefone: clienteSelecionado.telefone ?? variaveis.cliente_telefone,
      cliente_email: clienteSelecionado.email ?? variaveis.cliente_email,
      cliente_cpf: clienteSelecionado.cpf_cnpj ?? variaveis.cliente_cpf,
      cliente_endereco: clienteSelecionado.endereco ?? variaveis.cliente_endereco,
      cliente_bairro: clienteSelecionado.bairro ?? variaveis.cliente_bairro,
      cliente_cidade: clienteSelecionado.cidade ?? variaveis.cliente_cidade,
      cliente_estado: clienteSelecionado.estado ?? variaveis.cliente_estado,
      cliente_cep: clienteSelecionado.cep ?? variaveis.cliente_cep,
    };
  }, [variaveis, clienteSelecionado]);

  const handleGerar = () => {
    if (!vendaId || !templateId || !templateSelecionado || !variaveisFinais || !companySettings) {
      toast.error('Selecione uma venda e um template');
      return;
    }

    try {
      generateContratoPDF({
        template: templateSelecionado.conteudo,
        variaveis: variaveisFinais,
        numeroContrato: `CONT-${variaveisFinais.venda_numero}-${Date.now()}`,
        companySettings
      });
      
      toast.success('Contrato gerado com sucesso!');
      toast.info('Após assinar, faça o upload do contrato assinado');
    } catch (error) {
      console.error('Erro ao gerar contrato:', error);
      toast.error('Erro ao gerar contrato');
    }
  };

  const previewConteudo = templateSelecionado && variaveisFinais
    ? substituirVariaveis(templateSelecionado.conteudo, variaveisFinais)
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar Contrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venda">Selecione a Venda *</Label>
              <Select value={vendaId} onValueChange={setVendaId} disabled={!!vendaIdInicial}>
                <SelectTrigger id="venda">
                  <SelectValue placeholder="Selecione uma venda" />
                </SelectTrigger>
                <SelectContent>
                  {vendas?.map((venda) => (
                    <SelectItem key={venda.id} value={venda.id}>
                      {venda.id.slice(0, 8)} - {venda.cliente_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Selecione o Template *</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templatesAtivos.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente (sobrescreve)</Label>
              <Select
                value={clienteId || 'none'}
                onValueChange={(v) => setClienteId(v === 'none' ? '' : v)}
              >
                <SelectTrigger id="cliente">
                  <SelectValue placeholder="Usar cliente da venda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Usar cliente da venda</SelectItem>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}{c.cpf_cnpj ? ` · ${c.cpf_cnpj}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {vendaId && templateId && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Preview do Contrato</h3>
              {isLoadingVariaveis ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto bg-muted/30 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {previewConteudo}
                  </pre>
                </div>
              )}
            </Card>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Importante:</strong> Após gerar o PDF, imprima, assine e digitalize o contrato. 
              Depois faça o upload do documento assinado para vincular à venda.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGerar} 
            disabled={!vendaId || !templateId || isLoadingVariaveis || !companySettings}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
