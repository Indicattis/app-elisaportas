import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateContratoKitPDF, ContratoKitData } from '@/utils/contratoKitPDFGenerator';
import { useContratosVendas } from '@/hooks/useContratosVendas';
import { formatCurrency } from '@/lib/utils';
import { valorPorExtenso } from '@/lib/valorExtenso';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendaId: string | null;
  onGerado?: () => void;
}

const comExtenso = (v: number) => `${formatCurrency(v)} (${valorPorExtenso(v)})`;
const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtM = (n: any) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VAZIO: ContratoKitData = {
  comprador_nome: '', comprador_documento: '', comprador_endereco: '', quantidade_kits: '',
  material: '', motor: '', cor: '', dimensoes: '', valor_total: '', forma_pagamento: '',
  cidade_assinatura: 'Caxias do Sul/RS',
};

export function GerarContratoKitModal({ open, onOpenChange, vendaId, onGerado }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ContratoKitData>(VAZIO);
  const { uploadContrato, isUploading } = useContratosVendas({});

  useEffect(() => {
    if (!open || !vendaId) return;
    (async () => {
      setLoading(true);
      const { data: venda, error } = await supabase
        .from('vendas')
        .select(`*, produtos:produtos_vendas(*, cor:catalogo_cores(nome)), cliente:clientes(endereco, bairro, cidade, estado, cep)`)
        .eq('id', vendaId)
        .maybeSingle();
      if (error || !venda) {
        toast.error('Erro ao carregar venda');
        setLoading(false);
        return;
      }
      const v: any = venda;
      const produtos: any[] = v.produtos || [];
      const portas = produtos.filter(p => ['porta_enrolar', 'porta_social', 'porta'].includes(p.tipo_produto));
      const qtd = portas.reduce((a, p) => a + (p.quantidade || 1), 0);
      const cores = Array.from(new Set(portas.map(p => p.cor?.nome).filter(Boolean))).join(', ') || 'GALVANIZADA';
      const medida = (p: any) => (p.largura && p.altura ? `${fmtM(p.largura)} m x ${fmtM(p.altura)} m` : p.tamanho || '');

      // Motores via kit de montagem
      const kitIds = Array.from(new Set(portas.map(p => p.tabela_precos_porta_id).filter(Boolean))) as string[];
      const pesoPorKit: Record<string, { qtd: number; peso: string | null }> = {};
      if (kitIds.length) {
        const { data: mont } = await supabase
          .from('tabela_precos_portas_montagem')
          .select('kit_id, quantidade, custo_item:custo_item_id(descricao, categoria)')
          .in('kit_id', kitIds);
        (mont || []).forEach((m: any) => {
          if (m.custo_item?.categoria !== 'Motores') return;
          const match = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(m.custo_item?.descricao || '');
          pesoPorKit[m.kit_id] = { qtd: Number(m.quantidade) || 1, peso: match ? match[1] : null };
        });
      }
      const agg: Record<string, number> = {};
      portas.forEach(p => {
        const info = pesoPorKit[p.tabela_precos_porta_id];
        const label = info?.peso ? `${info.peso} kg` : '___ kg';
        agg[label] = (agg[label] || 0) + (info?.qtd ?? 1) * (p.quantidade || 1);
      });
      const motor = Object.entries(agg)
        .map(([peso, n]) => `${pad2(n)} motor${n > 1 ? 'es' : ''} de ${peso}`)
        .join(' + ');

      const material = [
        ...portas.map(p => `${pad2(p.quantidade || 1)} porta de enrolar (${medida(p)})`),
        `acabamento na cor ${cores}`,
        ...produtos
          .filter(p => !portas.includes(p) && !['instalacao', 'pintura_epoxi', 'pintura'].includes(p.tipo_produto))
          .map(p => `${pad2(p.quantidade || 1)} ${p.descricao || p.tipo_produto}`),
      ].join('; ');

      const cliente = v.cliente || {};
      const endereco = [
        cliente.endereco,
        v.bairro || cliente.bairro,
        v.cidade && v.estado ? `${v.cidade}/${v.estado}` : v.cidade || cliente.cidade,
        v.cep || cliente.cep ? `CEP ${v.cep || cliente.cep}` : '',
      ].filter(Boolean).join(', ');

      const total = Number(v.valor_venda) || 0;
      const entrada = Number(v.valor_entrada) || 0;
      const forma = entrada > 0 && entrada < total
        ? `${comExtenso(entrada)} de entrada e ${comExtenso(total - entrada)} antes da entrega ou liberação do kit ao COMPRADOR`
        : `${comExtenso(total)} antes da entrega ou liberação do kit ao COMPRADOR`;

      setForm({
        comprador_nome: v.cliente_nome || '',
        comprador_documento: v.cpf_cliente || '',
        comprador_endereco: endereco,
        quantidade_kits: qtd ? `${pad2(qtd)} (${valorPorExtenso(qtd).replace(/ reais?$/, '')})` : '01 (um)',
        material,
        motor: motor ? `${motor}, baixo fluxo operacional, monofásico 220 V, 120 RPM` : '',
        cor: cores,
        dimensoes: portas.map(medida).filter(Boolean).join('; '),
        valor_total: comExtenso(total),
        forma_pagamento: forma,
        cidade_assinatura: 'Caxias do Sul/RS',
      });
      setLoading(false);
    })();
  }, [open, vendaId]);

  const update = (k: keyof ContratoKitData, val: string) => setForm(prev => ({ ...prev, [k]: val }));

  const handleGerar = () => {
    if (!vendaId) return;
    try {
      const blob = generateContratoKitPDF(form);
      const slug = (form.comprador_nome || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
      const fileName = `contrato-kit-${slug}-${vendaId.slice(0, 8)}-${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      uploadContrato(
        { file, vendaId, observacoes: 'Contrato de Kit (sem instalação) gerado pelo sistema', tipoContrato: 'kit' },
        { onSuccess: () => { onGerado?.(); onOpenChange(false); } }
      );
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar contrato');
    }
  };

  const fields: { key: keyof ContratoKitData; label: string; area?: boolean }[] = [
    { key: 'comprador_nome', label: 'Nome do comprador' },
    { key: 'comprador_documento', label: 'CPF / CNPJ' },
    { key: 'comprador_endereco', label: 'Endereço completo', area: true },
    { key: 'quantidade_kits', label: 'Quantidade de kits' },
    { key: 'cor', label: 'Cor da pintura' },
    { key: 'material', label: 'Material', area: true },
    { key: 'motor', label: 'Motor', area: true },
    { key: 'dimensoes', label: 'Dimensões da(s) porta(s)' },
    { key: 'valor_total', label: 'Valor total (com extenso)' },
    { key: 'forma_pagamento', label: 'Forma de pagamento', area: true },
    { key: 'cidade_assinatura', label: 'Cidade da assinatura' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar Contrato de Kit (sem instalação)</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(f => (
                <div key={f.key} className={f.area ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
                  <Label htmlFor={`kit-${f.key}`}>{f.label}</Label>
                  {f.area ? (
                    <Textarea id={`kit-${f.key}`} rows={3} value={form[f.key]} onChange={e => update(f.key, e.target.value)} />
                  ) : (
                    <Input id={`kit-${f.key}`} value={form[f.key]} onChange={e => update(f.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Cancelar</Button>
          <Button onClick={handleGerar} disabled={loading || isUploading || !vendaId}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar e salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
