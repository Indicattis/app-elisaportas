import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { FileDown, Loader2, FileSignature, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateContratoElisaPDF, ContratoElisaData } from '@/utils/contratoElisaPDFGenerator';
import { useContratosOrcamentos } from '@/hooks/useContratosOrcamentos';
import { formatCurrency } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orcamentoId: string | null;
  onGerado?: () => void;
}

export function GerarContratoElisaOrcamentoModal({ open, onOpenChange, orcamentoId, onGerado }: Props) {
  const [loading, setLoading] = useState(false);
  const { data: cores } = useQuery({
    queryKey: ['contrato-elisa-cores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalogo_cores').select('id, nome').order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const [form, setForm] = useState<ContratoElisaData>({
    comprador_nome: '',
    comprador_documento: '',
    comprador_endereco: '',
    quantidade_portas: '',
    material_detalhado: '',
    quantidade_motores: '',
    cor: '',
    dimensoes: '',
    valor_total: '',
    condicao_pagamento: '',
    cidade_assinatura: 'Caxias do Sul/RS',
    data_assinatura: new Date().toLocaleDateString('pt-BR'),
  });

  const { uploadContrato, isUploading } = useContratosOrcamentos({ orcamentoId: orcamentoId || undefined });

  useEffect(() => {
    if (!open || !orcamentoId) return;
    (async () => {
      setLoading(true);
      const { data: orc, error } = await supabase
        .from('orcamentos')
        .select(`*, produtos:orcamento_produtos(*)`)
        .eq('id', orcamentoId)
        .maybeSingle();

      if (error || !orc) {
        toast.error('Erro ao carregar orçamento');
        setLoading(false);
        return;
      }

      const produtos = (orc as any).produtos || [];
      const portas = produtos.filter((p: any) =>
        ['porta_enrolar', 'porta_social', 'porta'].includes(p.tipo_produto)
      );
      const qtdPortas = portas.reduce((a: number, p: any) => a + (p.quantidade || 1), 0);

      const materialDetalhado = produtos
        .map((p: any) => `${p.quantidade || 1}x ${p.descricao || p.tipo_produto}${p.medidas ? ` (${p.medidas})` : ''}`)
        .join('; ');

      const dimensoes = portas
        .map((p: any) => p.medidas || '')
        .filter(Boolean)
        .join('; ');

      const coresStr = Array.from(
        new Set(portas.map((p: any) => p.cor).filter(Boolean))
      ).join(', ');

      const enderecoCompleto = [
        orc.cliente_bairro,
        orc.cliente_cidade && orc.cliente_estado
          ? `${orc.cliente_cidade}/${orc.cliente_estado}`
          : orc.cliente_cidade,
        orc.cliente_cep ? `CEP ${orc.cliente_cep}` : '',
      ].filter(Boolean).join(', ');

      setForm({
        comprador_nome: orc.cliente_nome || '',
        comprador_documento: orc.cliente_cpf || '',
        comprador_endereco: enderecoCompleto,
        quantidade_portas: qtdPortas ? String(qtdPortas) : '',
        material_detalhado: materialDetalhado,
        quantidade_motores: qtdPortas ? `${qtdPortas} de — kg` : '',
        cor: coresStr || 'GALVANIZADA',
        dimensoes,
        valor_total: formatCurrency(orc.valor_total || 0),
        condicao_pagamento: orc.forma_pagamento || '',
        cidade_assinatura: 'Caxias do Sul/RS',
        data_assinatura: new Date().toLocaleDateString('pt-BR'),
      });
      setLoading(false);
    })();
  }, [open, orcamentoId]);

  const update = (k: keyof ContratoElisaData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleGerar = async () => {
    if (!orcamentoId) return;
    try {
      const blob = generateContratoElisaPDF(form);
      const clienteSlug = (form.comprador_nome || 'cliente')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim().replace(/\s+/g, '_');
      const fileName = `contrato-elisa-${clienteSlug}-${orcamentoId.slice(0, 8)}-${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);

      uploadContrato(
        { file, orcamentoId, observacoes: 'Contrato GRUPO ELISA gerado a partir do orçamento' },
        { onSuccess: () => { onGerado?.(); onOpenChange(false); } }
      );
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar contrato');
    }
  };

  const fields = useMemo(() => [
    { key: 'comprador_nome', label: 'Nome do comprador', type: 'input' as const, icon: 'user' },
    { key: 'comprador_documento', label: 'CPF / CNPJ', type: 'input' as const, icon: 'doc' },
    { key: 'comprador_endereco', label: 'Endereço completo', type: 'textarea' as const, icon: 'map' },
    { key: 'quantidade_portas', label: 'Quantidade de portas', type: 'input' as const, icon: 'hash' },
    { key: 'material_detalhado', label: 'Material detalhado', type: 'textarea' as const, icon: 'box' },
    { key: 'quantidade_motores', label: 'Motores (qtd + peso)', type: 'input' as const, icon: 'zap' },
    { key: 'cor', label: 'Cor da pintura (ou GALVANIZADA)', type: 'select' as const, icon: 'palette' },
    { key: 'dimensoes', label: 'Dimensões da(s) porta(s)', type: 'input' as const, icon: 'ruler' },
    { key: 'valor_total', label: 'Valor total', type: 'input' as const, icon: 'dollar' },
    { key: 'condicao_pagamento', label: 'Condição de pagamento', type: 'textarea' as const, icon: 'credit' },
    { key: 'cidade_assinatura', label: 'Cidade da assinatura', type: 'input' as const, icon: 'city' },
    { key: 'data_assinatura', label: 'Data da assinatura', type: 'input' as const, icon: 'calendar' },
  ] as const, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <FileSignature className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span>Gerar Contrato — GRUPO ELISA</span>
                <p className="text-sm font-normal text-muted-foreground">Orçamento</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Info badge */}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-background/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10">
            <FileCheck className="w-3.5 h-3.5 text-primary" />
            <span>Preencha os dados abaixo para gerar o contrato em PDF e salvá-lo automaticamente.</span>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Carregando dados do orçamento...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(f => (
                <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2 space-y-1.5' : 'space-y-1.5'}>
                  <Label htmlFor={f.key} className="text-sm font-medium text-foreground/90 flex items-center gap-2">
                    {f.label}
                  </Label>
                  {f.type === 'textarea' ? (
                    <Textarea
                      id={f.key}
                      rows={3}
                      value={form[f.key]}
                      onChange={e => update(f.key, e.target.value)}
                      className="bg-background/60 border-border/60 focus:border-primary/40 focus:ring-primary/20 resize-none"
                    />
                  ) : f.type === 'select' ? (
                    <Select value={form[f.key] || 'GALVANIZADA'} onValueChange={v => update(f.key, v)}>
                      <SelectTrigger id={f.key} className="bg-background/60 border-border/60 focus:ring-primary/20">
                        <SelectValue placeholder="Selecione a cor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GALVANIZADA">GALVANIZADA</SelectItem>
                        {(cores || []).filter(c => c.nome && c.nome.toUpperCase() !== 'GALVANIZADA').map(c => (
                          <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                        ))}
                        {form[f.key] && form[f.key] !== 'GALVANIZADA' && !(cores || []).some(c => c.nome === form[f.key]) && (
                          <SelectItem value={form[f.key]}>{form[f.key]}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={f.key}
                      value={form[f.key]}
                      onChange={e => update(f.key, e.target.value)}
                      className="bg-background/60 border-border/60 focus:border-primary/40 focus:ring-primary/20"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gradient-to-r from-muted/30 via-muted/10 to-transparent flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="h-11 px-5 bg-background/80 hover:bg-background border-dashed"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGerar}
            disabled={loading || isUploading || !orcamentoId}
            className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Gerar e salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
