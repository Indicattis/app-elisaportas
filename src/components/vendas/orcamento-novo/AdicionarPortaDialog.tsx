import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { CartPorta } from '@/utils/meuOrcamentoPDFGenerator';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (p: CartPorta) => void;
}

function parseDecimal(v: string): number {
  const n = Number((v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function AdicionarPortaDialog({ open, onOpenChange, onAdd }: Props) {
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [guia, setGuia] = useState(false);
  const [rolo, setRolo] = useState(false);
  const [pintura, setPintura] = useState(true);
  const [instalacao, setInstalacao] = useState(true);
  const [qtd, setQtd] = useState(1);

  useEffect(() => {
    if (!open) {
      setLargura(''); setAltura(''); setGuia(false); setRolo(false);
      setPintura(true); setInstalacao(true); setQtd(1);
    }
  }, [open]);

  const larguraBase = parseDecimal(largura);
  const alturaBase = parseDecimal(altura);
  const larguraNum = larguraBase > 0 ? larguraBase + (guia ? 0.30 : 0) : 0;
  const alturaNum = alturaBase > 0 ? alturaBase + (rolo ? 0.50 : 0) : 0;

  const { data: candidatos, isFetching } = useQuery({
    queryKey: ['precos-porta-match', larguraNum, alturaNum],
    enabled: open && larguraNum > 0 && alturaNum > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tabela_precos_portas')
        .select('id,largura,altura,valor_porta,valor_pintura,valor_instalacao')
        .eq('ativo', true)
        .gte('largura', larguraNum)
        .gte('altura', alturaNum)
        .order('largura', { ascending: true })
        .order('altura', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const match = useMemo(() => {
    if (!candidatos || !candidatos.length) return null;
    return [...candidatos].sort((a, b) => {
      const da = (a.largura - larguraNum) + (a.altura - alturaNum);
      const db = (b.largura - larguraNum) + (b.altura - alturaNum);
      return da - db;
    })[0];
  }, [candidatos, larguraNum, alturaNum]);

  const precoUnit = useMemo(() => {
    if (!match) return 0;
    return Number(match.valor_porta || 0)
      + (pintura ? Number(match.valor_pintura || 0) : 0)
      + (instalacao ? Number(match.valor_instalacao || 0) : 0);
  }, [match, pintura, instalacao]);

  const handleAdd = () => {
    if (!match) return;
    const extras: string[] = [];
    if (pintura) extras.push('pintura');
    if (instalacao) extras.push('instalação');
    if (guia) extras.push('guia escondido');
    if (rolo) extras.push('rolo escondido');
    const desc = `Porta de enrolar ${larguraNum.toFixed(2).replace('.', ',')}x${alturaNum.toFixed(2).replace('.', ',')}m${extras.length ? ' (' + extras.join(', ') + ')' : ''}`;
    onAdd({
      uid: crypto.randomUUID(),
      tipo: 'porta',
      largura: larguraNum,
      altura: alturaNum,
      guia_escondido: guia,
      rolo_escondido: rolo,
      pintura, instalacao,
      quantidade: qtd,
      preco_unitario: precoUnit,
      descricao: desc,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-black/80 backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Adicionar porta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50">Largura (m)</label>
              <Input className="mt-1 bg-white/5 border-white/10" value={largura} onChange={e => setLargura(e.target.value)} placeholder="3,00" inputMode="decimal" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50">Altura (m)</label>
              <Input className="mt-1 bg-white/5 border-white/10" value={altura} onChange={e => setAltura(e.target.value)} placeholder="3,00" inputMode="decimal" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Guia escondido (+30 cm largura)" value={guia} onChange={setGuia} />
            <Toggle label="Rolo escondido (+50 cm altura)" value={rolo} onChange={setRolo} />
          </div>

          {(larguraBase > 0 || alturaBase > 0) && (guia || rolo) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-500/10 border border-blue-400/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-blue-200/70">Largura final</div>
                <div className="text-sm font-semibold text-blue-200">
                  {larguraNum > 0 ? `${larguraNum.toFixed(2).replace('.', ',')} m` : '—'}
                  {guia && larguraBase > 0 && (
                    <span className="ml-2 text-[10px] text-blue-200/60">({larguraBase.toFixed(2).replace('.', ',')} + 0,30)</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-blue-500/10 border border-blue-400/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-blue-200/70">Altura final</div>
                <div className="text-sm font-semibold text-blue-200">
                  {alturaNum > 0 ? `${alturaNum.toFixed(2).replace('.', ',')} m` : '—'}
                  {rolo && alturaBase > 0 && (
                    <span className="ml-2 text-[10px] text-blue-200/60">({alturaBase.toFixed(2).replace('.', ',')} + 0,50)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Toggle label="Pintura Epóxi — mais de 10 cores" value={pintura} onChange={setPintura} />
            <Toggle label="Instalação Equipe Elisa Portas" value={instalacao} onChange={setInstalacao} />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">Quantidade</label>
            <Input type="number" min={1} className="mt-1 bg-white/5 border-white/10" value={qtd} onChange={e => setQtd(Math.max(1, Number(e.target.value) || 1))} />
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            {isFetching ? (
              <div className="flex items-center gap-2 text-white/60 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Buscando preço...</div>
            ) : !larguraNum || !alturaNum ? (
              <div className="text-white/40 text-sm">Informe largura e altura.</div>
            ) : match ? (
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/50">Preço unitário</div>
                <div className="text-lg font-semibold text-blue-300">
                  R$ {precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4" /> Nenhum preço cadastrado a partir dessa medida.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white hover:bg-white/10">Cancelar</Button>
          <Button onClick={handleAdd} disabled={!match || precoUnit <= 0} className="bg-blue-600 hover:bg-blue-500">Adicionar ao orçamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
      <span className="text-sm text-white pr-3">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
