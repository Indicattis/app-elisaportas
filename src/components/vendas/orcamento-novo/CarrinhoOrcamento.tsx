import { DoorOpen, Package, Truck, Trash2 } from 'lucide-react';
import type { CartPorta, CartAvulso, CartFrete } from '@/utils/meuOrcamentoPDFGenerator';

interface Props {
  portas: CartPorta[];
  avulsos: CartAvulso[];
  frete: CartFrete | null;
  onRemovePorta: (uid: string) => void;
  onRemoveAvulso: (uid: string) => void;
  onRemoveFrete: () => void;
}

const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export function CarrinhoOrcamento({ portas, avulsos, frete, onRemovePorta, onRemoveAvulso, onRemoveFrete }: Props) {
  const vazio = !portas.length && !avulsos.length && !frete;
  if (vazio) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center text-white/40 text-sm">
        Nenhum item adicionado ainda. Use os cards acima para começar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {portas.length > 0 && (
        <Section icon={<DoorOpen className="w-4 h-4 text-blue-300" />} title="Portas">
          {portas.map(p => (
            <Row key={p.uid} onRemove={() => onRemovePorta(p.uid)}>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{p.descricao}</div>
                <div className="text-[11px] text-white/40">Qtd {p.quantidade} · {fmt(p.preco_unitario)} cada</div>
              </div>
              <div className="text-sm font-semibold text-white">{fmt(p.preco_unitario * p.quantidade)}</div>
            </Row>
          ))}
        </Section>
      )}

      {avulsos.length > 0 && (
        <Section icon={<Package className="w-4 h-4 text-blue-300" />} title="Itens avulsos">
          {avulsos.map(a => (
            <Row key={a.uid} onRemove={() => onRemoveAvulso(a.uid)}>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{a.descricao}</div>
                <div className="text-[11px] text-white/40">Qtd {a.quantidade} {a.unidade || ''} · {fmt(a.preco_unitario)} cada</div>
              </div>
              <div className="text-sm font-semibold text-white">{fmt(a.preco_unitario * a.quantidade)}</div>
            </Row>
          ))}
        </Section>
      )}

      {frete && (
        <Section icon={<Truck className="w-4 h-4 text-blue-300" />} title="Frete">
          <Row onRemove={onRemoveFrete}>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{frete.cidade}/{frete.estado}</div>
            </div>
            <div className="text-sm font-semibold text-white">{fmt(frete.valor)}</div>
          </Row>
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-3">{icon}<h3 className="text-sm font-semibold text-white">{title}</h3></div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
      {children}
      <button onClick={onRemove} className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-300 transition" aria-label="Remover">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
