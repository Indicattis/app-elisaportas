import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustosItens } from "@/hooks/useCustosItens";

const fmt = (v: number | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function EstrategiaItens() {
  const { items, isLoading } = useCustosItens();
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.descricao?.toLowerCase().includes(q) ||
        i.categoria?.toLowerCase().includes(q) ||
        i.fornecedor?.toLowerCase().includes(q),
    );
  }, [items, busca]);

  const grupos = useMemo(() => {
    const map = new Map<string, typeof filtrados>();
    for (const it of filtrados) {
      const cat = it.categoria || "Sem categoria";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(it);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtrados]);

  return (
    <MinimalistLayout
      title="Itens do Catálogo"
      subtitle="Visualização consolidada dos itens cadastrados em custos"
      backPath="/direcao/estrategia"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Estratégia", path: "/direcao/estrategia" },
        { label: "Itens" },
      ]}
      fullWidth
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Package className="h-5 w-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-medium truncate">
              {isLoading ? "Carregando..." : `${items.length} itens cadastrados`}
            </div>
            <div className="text-xs text-white/60">
              Dados de <code className="text-white/80">custos_itens</code>. Edite em Matérias-Primas ou Tabela de Custos.
            </div>
          </div>
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por descrição, categoria, fornecedor..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/70">Descrição</TableHead>
                <TableHead className="text-white/70">Unidade</TableHead>
                <TableHead className="text-white/70 text-right">Custo</TableHead>
                <TableHead className="text-white/70 text-right">Preço de venda</TableHead>
                <TableHead className="text-white/70">Fornecedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.length === 0 && !isLoading && (
                <TableRow className="border-white/10">
                  <TableCell colSpan={5} className="text-center text-white/50 py-8">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              )}
              {grupos.map(([categoria, itens]) => (
                <>
                  <TableRow key={`cat-${categoria}`} className="border-white/10 bg-white/[0.03] hover:bg-white/[0.03]">
                    <TableCell colSpan={5} className="text-xs uppercase tracking-wider text-blue-300/80 font-semibold py-2">
                      {categoria} · {itens.length}
                    </TableCell>
                  </TableRow>
                  {itens.map((it) => (
                    <TableRow key={it.id} className="border-white/10 hover:bg-white/[0.03]">
                      <TableCell className="text-white">{it.descricao}</TableCell>
                      <TableCell className="text-white/70">{it.unidade || "—"}</TableCell>
                      <TableCell className="text-right text-white/90 tabular-nums">{fmt(it.custo_unitario)}</TableCell>
                      <TableCell className="text-right text-white/90 tabular-nums">{fmt(it.preco_venda)}</TableCell>
                      <TableCell className="text-white/70">{it.fornecedor || "—"}</TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MinimalistLayout>
  );
}