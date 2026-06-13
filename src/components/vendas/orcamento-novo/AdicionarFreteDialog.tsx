import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CartFrete } from '@/utils/meuOrcamentoPDFGenerator';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (f: CartFrete) => void;
}

export function AdicionarFreteDialog({ open, onOpenChange, onAdd }: Props) {
  const [estado, setEstado] = useState('');
  const [cidadeId, setCidadeId] = useState('');
  const [valor, setValor] = useState('');
  const [estadoPop, setEstadoPop] = useState(false);
  const [cidadePop, setCidadePop] = useState(false);

  const { data: fretes = [] } = useQuery({
    queryKey: ['fretes-cidades-ativos'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frete_cidades')
        .select('id,estado,cidade,valor_frete')
        .eq('ativo', true)
        .order('estado').order('cidade');
      if (error) throw error;
      return data || [];
    },
  });

  const estados = useMemo(() => Array.from(new Set(fretes.map(f => f.estado))).sort(), [fretes]);
  const cidades = useMemo(() => fretes.filter(f => f.estado === estado), [fretes, estado]);
  const cidadeSel = useMemo(() => cidades.find(c => c.id === cidadeId), [cidades, cidadeId]);

  useEffect(() => {
    if (!open) { setEstado(''); setCidadeId(''); setValor(''); }
  }, [open]);
  useEffect(() => { if (cidadeSel) setValor(String(cidadeSel.valor_frete)); }, [cidadeSel]);
  useEffect(() => { setCidadeId(''); }, [estado]);

  const handleAdd = () => {
    if (!cidadeSel) return;
    const v = Number((valor || '').replace(',', '.')) || 0;
    onAdd({ uid: crypto.randomUUID(), tipo: 'frete', estado: cidadeSel.estado, cidade: cidadeSel.cidade, valor: v });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-black/80 backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader><DialogTitle>Adicionar frete</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">Estado</label>
            <Popover open={estadoPop} onOpenChange={setEstadoPop}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("mt-1 w-full justify-between font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white", !estado && "text-white/40")}>
                  {estado || 'Selecione o estado'}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-900 border-white/10" align="start">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Buscar estado..." className="text-white" />
                  <CommandList>
                    <CommandEmpty className="text-white/50 text-sm p-3">Nenhum.</CommandEmpty>
                    <CommandGroup>
                      {estados.map(uf => (
                        <CommandItem key={uf} value={uf} onSelect={() => { setEstado(uf); setEstadoPop(false); }} className="text-white aria-selected:bg-white/10">
                          <Check className={cn("mr-2 h-3 w-3", estado === uf ? "opacity-100" : "opacity-0")} />{uf}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">Cidade</label>
            <Popover open={cidadePop} onOpenChange={setCidadePop}>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={!estado} className={cn("mt-1 w-full justify-between font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white disabled:opacity-50", !cidadeSel && "text-white/40")}>
                  {cidadeSel ? cidadeSel.cidade : (estado ? 'Selecione a cidade' : 'Selecione o estado primeiro')}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-900 border-white/10" align="start">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Buscar cidade..." className="text-white" />
                  <CommandList>
                    <CommandEmpty className="text-white/50 text-sm p-3">Nenhuma.</CommandEmpty>
                    <CommandGroup>
                      {cidades.map(c => (
                        <CommandItem key={c.id} value={c.cidade} onSelect={() => { setCidadeId(c.id); setCidadePop(false); }} className="text-white aria-selected:bg-white/10">
                          <Check className={cn("mr-2 h-3 w-3", cidadeId === c.id ? "opacity-100" : "opacity-0")} />
                          <div className="flex-1 flex items-center justify-between"><span>{c.cidade}</span><span className="text-[10px] text-white/40">R$ {Number(c.valor_frete).toFixed(2)}</span></div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">Valor do frete (R$)</label>
            <Input className="mt-1 bg-white/5 border-white/10" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white hover:bg-white/10">Cancelar</Button>
          <Button onClick={handleAdd} disabled={!cidadeSel} className="bg-blue-600 hover:bg-blue-500">Adicionar ao orçamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
