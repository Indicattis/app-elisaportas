import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Package, Search, ShoppingBag } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useVendasRastreio } from "@/hooks/useVendasRastreio";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 15;
const LABEL_ETAPA: Record<string, string> = {
  aprovacao_diretor: "Pedido na fábrica!",
  aberto: "Pedido na fábrica!",
  aprovacao_ceo: "Pedido na fábrica!",
  em_producao: "Pedido em produção",
  inspecao_qualidade: "Inspeção de qualidade",
  aguardando_pintura: "Em pintura",
  embalagem: "Em embalagem",
  aguardando_coleta: "Pronto para entrega",
  instalacoes: "Em instalação",
  correcoes: "Ajustes finais",
  finalizado: "Pedido concluído",
  pos_vendas: "Pós-venda",
};

export default function AcompanharPedido() {
  const [pesquisa, setPesquisa] = useState("");
  const [pagina, setPagina] = useState(1);
  const [copiado, setCopiado] = useState<string | null>(null);
  const { data: vendas = [], isLoading } = useVendasRastreio();

  const filtradas = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return vendas;
    const digitos = termo.replace(/\D/g, "");
    return vendas.filter((venda) => {
      const pedido = venda.pedidos_producao.find((item) => !item.arquivado) || venda.pedidos_producao[0];
      return [venda.numero_pedido, pedido?.numero_pedido, venda.cliente_nome, venda.cpf_cliente, venda.cliente_telefone]
        .some((valor) => valor?.toLocaleLowerCase("pt-BR").includes(termo) || (digitos && valor?.replace(/\D/g, "").includes(digitos)));
    });
  }, [pesquisa, vendas]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITEMS_PER_PAGE));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const exibidas = filtradas.slice((paginaAtual - 1) * ITEMS_PER_PAGE, paginaAtual * ITEMS_PER_PAGE);
  const criarLink = (token: string) => `${window.location.origin}/rastreio/${token}`;

  const copiarLink = async (token: string) => {
    await navigator.clipboard.writeText(criarLink(token));
    setCopiado(token);
    toast.success("Link de rastreio copiado");
    window.setTimeout(() => setCopiado(null), 1800);
  };

  return (
    <MinimalistLayout
      title="Acompanhar Vendas"
      subtitle="Consulte vendas e compartilhe o acompanhamento com o cliente"
      backPath="/vendas"
      breadcrumbItems={[{ label: "Home", path: "/home" }, { label: "Vendas", path: "/vendas" }, { label: "Acompanhar Vendas" }]}
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={pesquisa}
            onChange={(event) => { setPesquisa(event.target.value); setPagina(1); }}
            placeholder="Buscar por venda, pedido, cliente, CPF/CNPJ ou telefone..."
            className="h-12 bg-card/50 pl-12 pr-12 text-base backdrop-blur-xl"
          />
          {isLoading && <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary" />}
        </div>

        <p className="text-sm text-muted-foreground">{isLoading ? "Carregando vendas..." : `${filtradas.length} venda${filtradas.length === 1 ? "" : "s"} encontrada${filtradas.length === 1 ? "" : "s"}`}</p>

        {!isLoading && exibidas.length === 0 && (
          <Card className="border-border bg-card/50"><CardContent className="py-12 text-center"><ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Nenhuma venda encontrada.</p></CardContent></Card>
        )}

        <div className="space-y-3">
          {exibidas.map((venda) => {
            const pedido = venda.pedidos_producao.find((item) => !item.arquivado) || venda.pedidos_producao[0];
            const status = pedido ? (LABEL_ETAPA[pedido.etapa_atual] || "Pedido em andamento") : "Compra confirmada";
            return (
              <Card key={venda.id} className="border-border bg-card/60 backdrop-blur-xl">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{venda.cliente_nome || "Cliente não informado"}</h3>
                        <Badge variant="outline" className="border-primary/30 text-primary">{status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Venda #{venda.numero_pedido || venda.id.slice(0, 8)}
                        {pedido?.numero_pedido ? ` · Pedido #${pedido.numero_pedido}` : " · Sem pedido de produção"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(venda.data_venda))} · {venda.produtos_vendas.length} item(ns)
                        {venda.cidade ? ` · ${venda.cidade}${venda.estado ? `/${venda.estado}` : ""}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" onClick={() => copiarLink(venda.rastreio_token)}>
                      {copiado === venda.rastreio_token ? <Check /> : <Copy />}
                      {copiado === venda.rastreio_token ? "Copiado" : "Copiar link"}
                    </Button>
                    <Button variant="secondary" size="icon" title="Abrir rastreio" asChild>
                      <a href={criarLink(venda.rastreio_token)} target="_blank" rel="noreferrer"><ExternalLink /></a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3 pt-3">
            <Button variant="outline" disabled={paginaAtual === 1} onClick={() => setPagina((valor) => Math.max(1, valor - 1))}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {paginaAtual} de {totalPaginas}</span>
            <Button variant="outline" disabled={paginaAtual === totalPaginas} onClick={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}>Próxima</Button>
          </div>
        )}
      </div>
    </MinimalistLayout>
  );
}