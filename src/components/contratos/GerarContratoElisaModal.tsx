import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateContratoElisaPDF, ContratoElisaData } from '@/utils/contratoElisaPDFGenerator';
import { useContratosVendas } from '@/hooks/useContratosVendas';
import { formatCurrency } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendaId: string | null;
  onGerado?: () => void;
}

export function GerarContratoElisaModal({ open, onOpenChange, vendaId, onGerado }: Props) {
  const [loading, setLoading] = useState(false);
  const { data: cores } = useQuery({
    queryKey: ['contrato-elisa-cores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_cores')
        .select('id, nome')
        .order('nome');
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

  const { uploadContrato, isUploading } = useContratosVendas({});

  useEffect(() => {
    if (!open || !vendaId) return;
    (async () => {
      setLoading(true);
      const { data: venda, error } = await supabase
        .from('vendas')
        .select(`
          *,
          produtos:produtos_vendas(*, cor:catalogo_cores(nome)),
          cliente:clientes(endereco, bairro, cidade, estado, cep)
        `)
        .eq('id', vendaId)
        .maybeSingle();

      if (error || !venda) {
        toast.error('Erro ao carregar venda');
        setLoading(false);
        return;
      }

      const portas = (venda.produtos || []).filter((p: any) =>
        ['porta_enrolar', 'porta_social', 'porta'].includes(p.tipo_produto)
      );
      const qtdPortas = portas.reduce((a: number, p: any) => a + (p.quantidade || 1), 0);

      const materialDetalhado = (venda.produtos || [])
        .map((p: any) => `${p.quantidade || 1}x ${p.descricao || p.tipo_produto}${p.tamanho ? ` (${p.tamanho})` : ''}`)
        .join('; ');

      const dimensoes = portas
        .map((p: any) => {
          if (p.largura && p.altura) return `${p.largura}m x ${p.altura}m`;
          return p.tamanho || '';
        })
        .filter(Boolean)
        .join('; ');

      const cores = Array.from(
        new Set(portas.map((p: any) => p.cor?.nome).filter(Boolean))
      ).join(', ');

      const cliente = (venda as any).cliente || {};
      const enderecoCompleto = [
        cliente.endereco,
        venda.bairro || cliente.bairro,
        venda.cidade && venda.estado
          ? `${venda.cidade}/${venda.estado}`
          : venda.cidade || cliente.cidade,
        (venda.cep || cliente.cep) ? `CEP ${venda.cep || cliente.cep}` : '',
      ]
        .filter(Boolean)
        .join(', ');

      const parcelas = (venda as any).quantidade_parcelas || (venda as any).numero_parcelas || 1;
      const formaPag = (venda as any).metodo_pagamento || venda.forma_pagamento || '';
      const condicaoBase = `${formaPag}${parcelas > 1 ? ` em ${parcelas}x` : ''}${
        venda.valor_entrada ? ` — entrada de ${formatCurrency(venda.valor_entrada)}` : ''
      }`;

      setForm({
        comprador_nome: venda.cliente_nome || '',
        comprador_documento: venda.cpf_cliente || '',
        comprador_endereco: enderecoCompleto,
        quantidade_portas: qtdPortas ? String(qtdPortas) : '',
        material_detalhado: materialDetalhado,
        quantidade_motores: qtdPortas ? String(qtdPortas) : '',
        cor: cores || 'GALVANIZADA',
        dimensoes,
        valor_total: formatCurrency(venda.valor_venda || 0),
        condicao_pagamento: condicaoBase,
        cidade_assinatura: 'Caxias do Sul/RS',
        data_assinatura: new Date().toLocaleDateString('pt-BR'),
      });
      setLoading(false);
    })();
  }, [open, vendaId]);

  const update = (k: keyof ContratoElisaData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleGerar = async () => {
    if (!vendaId) return;
    try {
      const blob = generateContratoElisaPDF(form);
      const clienteSlug = (form.comprador_nome || 'cliente')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      const fileName = `contrato-elisa-${clienteSlug}-${vendaId.slice(0, 8)}-${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // Download local
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Upload + registro
      uploadContrato(
        { file, vendaId, observacoes: 'Contrato GRUPO ELISA gerado pelo sistema' },
        {
          onSuccess: () => {
            onGerado?.();
            onOpenChange(false);
          },
        }
      );
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar contrato');
    }
  };

  const fields = useMemo(
    () => [
      { key: 'comprador_nome', label: 'Nome do comprador', type: 'input' },
      { key: 'comprador_documento', label: 'CPF / CNPJ', type: 'input' },
      { key: 'comprador_endereco', label: 'Endereço completo', type: 'textarea' },
      { key: 'quantidade_portas', label: 'Quantidade de portas', type: 'input' },
      { key: 'material_detalhado', label: 'Material detalhado', type: 'textarea' },
      { key: 'quantidade_motores', label: 'Quantidade de motores', type: 'input' },
      { key: 'cor', label: 'Cor da pintura (ou GALVANIZADA)', type: 'select' },
      { key: 'dimensoes', label: 'Dimensões da(s) porta(s)', type: 'input' },
      { key: 'valor_total', label: 'Valor total', type: 'input' },
      { key: 'condicao_pagamento', label: 'Condição de pagamento', type: 'textarea' },
      { key: 'cidade_assinatura', label: 'Cidade da assinatura', type: 'input' },
      { key: 'data_assinatura', label: 'Data da assinatura', type: 'input' },
    ] as const,
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar Contrato — GRUPO ELISA</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(f => (
                <div
                  key={f.key}
                  className={f.type === 'textarea' ? 'md:col-span-2 space-y-1' : 'space-y-1'}
                >
                  <Label htmlFor={f.key}>{f.label}</Label>
                  {f.type === 'textarea' ? (
                    <Textarea
                      id={f.key}
                      rows={3}
                      value={form[f.key]}
                      onChange={e => update(f.key, e.target.value)}
                    />
                  ) : f.type === 'select' ? (
                    <Select
                      value={form[f.key] || 'GALVANIZADA'}
                      onValueChange={v => update(f.key, v)}
                    >
                      <SelectTrigger id={f.key}>
                        <SelectValue placeholder="Selecione a cor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GALVANIZADA">GALVANIZADA</SelectItem>
                        {(cores || [])
                          .filter(c => c.nome && c.nome.toUpperCase() !== 'GALVANIZADA')
                          .map(c => (
                            <SelectItem key={c.id} value={c.nome}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        {form[f.key] &&
                          form[f.key] !== 'GALVANIZADA' &&
                          !(cores || []).some(c => c.nome === form[f.key]) && (
                            <SelectItem value={form[f.key]}>{form[f.key]}</SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={f.key}
                      value={form[f.key]}
                      onChange={e => update(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleGerar} disabled={loading || isUploading || !vendaId}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar e salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}