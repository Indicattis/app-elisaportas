import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package } from "lucide-react";

interface PortasDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendas: any[];
  limAvista: number;
  limPresencial: number;
  limResponsavel: number;
  calcularExcedidoDesconto: (
    venda: any,
    limAvista: number,
    limPresencial: number,
    limResponsavel: number
  ) => { excedidoPct: number; excedidoValor: number };
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function baseTabelaProduto(p: any): number {
  const qty = Number(p.quantidade) || 1;
  return (
    ((Number(p.valor_produto) || 0) +
      (Number(p.valor_pintura) || 0) +
      (Number(p.valor_instalacao) || 0)) *
    qty
  );
}

function descontoProduto(p: any): number {
  const qty = Number(p.quantidade) || 1;
  if (p.tipo_desconto === "valor") {
    return Number(p.desconto_valor) || 0;
  }
  if (p.tipo_desconto === "percentual" && Number(p.desconto_percentual) > 0) {
    const base =
      ((Number(p.valor_produto) || 0) +
        (Number(p.valor_pintura) || 0) +
        (Number(p.valor_instalacao) || 0)) *
      qty;
    return base * (Number(p.desconto_percentual) / 100);
  }
  return 0;
}

function dimensoes(p: any): string {
  let l = Number(p.largura) || 0;
  let a = Number(p.altura) || 0;
  if ((!l || !a) && typeof p.tamanho === "string") {
    const m = p.tamanho.match(/(\d+[.,]?\d*)\s*[xX×]\s*(\d+[.,]?\d*)/);
    if (m) {
      l = parseFloat(m[1].replace(",", "."));
      a = parseFloat(m[2].replace(",", "."));
    }
  }
  if (!l || !a) return "-";
  return `${l.toFixed(2)}m × ${a.toFixed(2)}m`;
}

export function PortasDetalhesModal({
  open,
  onOpenChange,
  vendas,
  limAvista,
  limPresencial,
  limResponsavel,
  calcularExcedidoDesconto,
}: PortasDetalhesModalProps) {
  const linhas = useMemo(() => {
    const rows: Array<{
      key: string;
      vendaId: string;
      cliente: string;
      dataVenda: string | null;
      descricao: string;
      dimensoes: string;
      cor: string;
      quantidade: number;
      valorTabela: number;
      freteRateado: number;
      desconto: number;
      valorFinal: number;
      excedido: number;
      lucro: number;
      isFirstOfVenda: boolean;
    }> = [];

    (vendas || []).forEach((venda: any) => {
      const produtos = (venda.produtos || []) as any[];
      const portas = produtos.filter(
        (p) =>
          p.tipo_produto === "porta_enrolar" ||
          p.tipo_produto === "porta_social"
      );
      if (portas.length === 0) return;

      const somaTabelaVenda = produtos.reduce(
        (s, p) => s + baseTabelaProduto(p),
        0
      );
      const freteVenda = Number(venda.valor_frete) || 0;
      const { excedidoValor } = calcularExcedidoDesconto(
        venda,
        limAvista,
        limPresencial,
        limResponsavel
      );
      const somaTabelaPortas = portas.reduce(
        (s, p) => s + baseTabelaProduto(p),
        0
      );

      portas.forEach((p, idx) => {
        const valorTabela = baseTabelaProduto(p);
        const freteRateado =
          somaTabelaVenda > 0 ? freteVenda * (valorTabela / somaTabelaVenda) : 0;
        const excedidoItem =
          somaTabelaPortas > 0
            ? excedidoValor * (valorTabela / somaTabelaPortas)
            : 0;
        rows.push({
          key: p.id ?? `${venda.id}-${idx}`,
          vendaId: venda.id,
          cliente: venda.cliente_nome || "—",
          dataVenda: venda.data_venda || null,
          descricao: p.descricao || "Porta",
          dimensoes: dimensoes(p),
          cor: p.cor?.nome || "-",
          quantidade: Number(p.quantidade) || 1,
          valorTabela,
          freteRateado,
          desconto: descontoProduto(p),
          valorFinal: Number(p.valor_total) || 0,
          excedido: excedidoItem,
          lucro: Number(p.lucro_item) || 0,
          isFirstOfVenda: idx === 0,
        });
      });
    });

    return rows;
  }, [vendas, limAvista, limPresencial, limResponsavel, calcularExcedidoDesconto]);

  const totais = useMemo(() => {
    return linhas.reduce(
      (acc, r) => ({
        quantidade: acc.quantidade + r.quantidade,
        valorTabela: acc.valorTabela + r.valorTabela,
        freteRateado: acc.freteRateado + r.freteRateado,
        desconto: acc.desconto + r.desconto,
        valorFinal: acc.valorFinal + r.valorFinal,
        excedido: acc.excedido + r.excedido,
        lucro: acc.lucro + r.lucro,
      }),
      {
        quantidade: 0,
        valorTabela: 0,
        freteRateado: 0,
        desconto: 0,
        valorFinal: 0,
        excedido: 0,
        lucro: 0,
      }
    );
  }, [linhas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] xl:max-w-7xl bg-slate-950/95 border-white/10 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5 text-blue-400" />
            Detalhamento de Portas
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {linhas.length} porta{linhas.length === 1 ? "" : "s"} no filtro atual
            — respeita mês, vendedor e busca selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-auto rounded-md border border-white/10">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-900/95 backdrop-blur-xl z-10">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60 text-xs">Cliente</TableHead>
                <TableHead className="text-white/60 text-xs">Porta</TableHead>
                <TableHead className="text-white/60 text-xs text-center">
                  Qtd
                </TableHead>
                <TableHead className="text-white/60 text-xs text-right">
                  Valor Tabela
                </TableHead>
                <TableHead className="text-white/60 text-xs text-right">
                  Frete
                </TableHead>
                <TableHead className="text-white/60 text-xs text-right">
                  Desconto
                </TableHead>
                <TableHead className="text-white/60 text-xs text-right">
                  Valor Final
                </TableHead>
                <TableHead className="text-white/60 text-xs text-right">
                  Excedido
                </TableHead>
                <TableHead className="text-white/60 text-xs text-right">
                  Lucro
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-white/50 py-8"
                  >
                    Nenhuma porta encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map((r) => (
                  <TableRow
                    key={r.key}
                    className={`border-white/5 hover:bg-white/5 ${
                      r.isFirstOfVenda ? "border-t-white/20" : ""
                    }`}
                  >
                    <TableCell className="text-xs">
                      {r.isFirstOfVenda ? (
                        <span className="text-white/90">{r.cliente}</span>
                      ) : (
                        <span className="text-white/30">↳</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-white/80">
                      <div className="flex flex-col">
                        <span>{r.descricao}</span>
                        <span className="text-[10px] text-white/50">
                          {r.dimensoes}
                          {r.cor !== "-" ? ` • ${r.cor}` : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center text-white/80">
                      {r.quantidade}
                    </TableCell>
                    <TableCell className="text-xs text-right text-white/80">
                      {fmt(r.valorTabela)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-white/70">
                      {r.freteRateado > 0 ? fmt(r.freteRateado) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right text-red-400">
                      {r.desconto > 0 ? `-${fmt(r.desconto)}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right text-white font-medium">
                      {fmt(r.valorFinal)}
                    </TableCell>
                    <TableCell
                      className={`text-xs text-right ${
                        r.excedido > 0 ? "text-amber-400" : "text-white/30"
                      }`}
                    >
                      {r.excedido > 0 ? fmt(r.excedido) : "-"}
                    </TableCell>
                    <TableCell
                      className={`text-xs text-right ${
                        r.lucro >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {r.lucro !== 0 ? fmt(r.lucro) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {linhas.length > 0 && (
              <tfoot className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl">
                <tr className="border-t border-white/20">
                  <td
                    className="text-xs font-medium text-white/80 px-4 py-2"
                    colSpan={2}
                  >
                    Totais ({linhas.length} porta{linhas.length === 1 ? "" : "s"})
                  </td>
                  <td className="text-xs text-center text-white/80 px-4 py-2">
                    {totais.quantidade}
                  </td>
                  <td className="text-xs text-right text-white/80 px-4 py-2">
                    {fmt(totais.valorTabela)}
                  </td>
                  <td className="text-xs text-right text-white/70 px-4 py-2">
                    {fmt(totais.freteRateado)}
                  </td>
                  <td className="text-xs text-right text-red-400 px-4 py-2">
                    {totais.desconto > 0 ? `-${fmt(totais.desconto)}` : "-"}
                  </td>
                  <td className="text-xs text-right text-white font-semibold px-4 py-2">
                    {fmt(totais.valorFinal)}
                  </td>
                  <td className="text-xs text-right text-amber-400 px-4 py-2">
                    {totais.excedido > 0 ? fmt(totais.excedido) : "-"}
                  </td>
                  <td className="text-xs text-right text-emerald-400 font-semibold px-4 py-2">
                    {fmt(totais.lucro)}
                  </td>
                </tr>
              </tfoot>
            )}
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PortasDetalhesModal;