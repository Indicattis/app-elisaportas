import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CartAvulso } from '@/utils/meuOrcamentoPDFGenerator';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (a: CartAvulso) => void;
}

export function AdicionarItemAvulsoDialog({ open, onOpenChange, onAdd }: Props) {
  const [itemId, setItemId] = useState<string>('');
  const [qtd, setQtd] = useState(1);
  const [preco, setPreco] = useState<string>('');
  const [popOpen, setPopOpen] = useState(false);

  const { data: itens = [], isFetching } = useQuery({
    queryKey: ['custos-itens-avulsos'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custos_itens')
        .select('id,descricao,categoria,unidade,preco_venda')
        .eq('vendavel_avulso', true)
        .order('categoria', { ascending: true })
        .order('descricao', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!open) { setItemId(''); setQtd(1); setPreco(''); }
  }, [open]);

  const selecionado = useMemo(() => itens.find(i => i.id === itemId), [itens, itemId]);

  useEffect(() => {
    if (selecionado) setPreco(String(selecionado.preco_venda ?? 0));
  }, [selecionado]);

  const handleAdd = () => {
    if (!selecionado) return;
    const precoNum = Number((preco || '').replace(',', '.')) || 0;
    onAdd({
      uid: crypto.randomUUID(),
      tipo: 'avulso',
      custo_item_id: selecionado.id,
      descricao: selecionado.descricao,
      unidade: selecionado.unidade,
      quantidade: qtd,
      preco_unitario: precoNum,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-black/80 backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Adicionar item avulso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">Item do catálogo</label>
            <Popover open={popOpen} onOpenChange={setPopOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className={cn(
                  "mt-1 w-full justify-between font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white",
                  !selecionado && "text-white/40"
                )}>
                  {selecionado ? selecionado.descricao : (isFetching ? 'Carregando...' : 'Selecione um item')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-900 border-white/10" align="start">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Buscar item..." className="text-white" />
                  <CommandList>
                    <CommandEmpty className="text-white/50 text-sm p-3">
                      {isFetching ? <span className="inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Carregando</span> : 'Nenhum item encontrado.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {itens.map(i => (
                        <CommandItem key={i.id} value={`${i.descricao} ${i.categoria || ''}`} onSelect={() => { setItemId(i.id); setPopOpen(false); }} className="text-white aria-selected:bg-white/10">
                          <Check className={cn("mr-2 h-3 w-3", itemId === i.id ? "opacity-100" : "opacity-0")} />
                          <div className="flex-1">
                            <div className="text-sm">{i.descricao}</div>
                            <div className="text-[10px] text-white/40">{i.categoria || '—'} · {i.unidade || 'Un'} · R$ {Number(i.preco_venda || 0).toFixed(2)}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50">Quantidade</label>
              <Input type="number" min={1} className="mt-1 bg-white/5 border-white/10" value={qtd} onChange={e => setQtd(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50">Preço unitário (R$)</label>
              <Input className="mt-1 bg-white/5 border-white/10" value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00" inputMode="decimal" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white hover:bg-white/10">Cancelar</Button>
          <Button onClick={handleAdd} disabled={!selecionado} className="bg-blue-600 hover:bg-blue-500">Adicionar ao orçamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
