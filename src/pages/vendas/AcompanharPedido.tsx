import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Loader2, MapPin, Search, ShoppingBag } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const STATUS_FINALIZADOS = new Set(["finalizado", "pos_vendas"]);
const STATUS_PRODUCAO = new Set(["em_producao", "inspecao_qualidade", "aguardando_pintura", "embalagem"]);

const obterIniciais = (nome: string | null | undefined) => {
  const partes = nome?.trim().split(/\s+/).filter(Boolean) || [];
  if (partes.length === 0) return "?";
  return `${partes[0]?.[0] || ""}${partes.length > 1 ? partes[partes.length - 1]?.[0] || "" : ""}`.toUpperCase();
};

const formatarValor = (valor: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

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
            const statusFinalizado = pedido ? STATUS_FINALIZADOS.has(pedido.etapa_atual) : false;
            const statusProducao = pedido ? STATUS_PRODUCAO.has(pedido.etapa_atual) : false;
            const statusClasses = statusFinalizado
              ? "border-success/25 bg-success/10 text-success"
              : statusProducao
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-warning/25 bg-warning/10 text-warning";
            const barraStatus = statusFinalizado ? "bg-success" : statusProducao ? "bg-primary" : "bg-warning";
            const localizacao = venda.cidade
              ? `${venda.cidade}${venda.estado ? `/${venda.estado}` : ""}`
              : "Local não informado";
            return (
              <Card key={venda.id} className="group overflow-hidden border-border bg-card/80 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                <CardContent className="flex p-0">
                  <div className={`w-1.5 shrink-0 ${barraStatus}`} aria-hidden="true" />
                  <div className="grid min-w-0 flex-1 gap-5 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(170px,0.85fr)_minmax(240px,1.35fr)_minmax(170px,0.9fr)_minmax(140px,0.7fr)_auto] lg:items-center lg:gap-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11 ring-2 ring-muted">
                          <AvatarImage src={venda.atendente?.foto_perfil_url || undefined} alt={venda.atendente?.nome || "Vendedor"} />
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {obterIniciais(venda.atendente?.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" title="Vendedor ativo" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{venda.atendente?.nome || "Vendedor não informado"}</p>
                        <p className="mt-0.5 text-[11px] font-medium uppercase text-muted-foreground">Responsável pela venda</p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-primary">VENDA #{venda.numero_pedido || venda.id.slice(0, 8)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(venda.data_venda))}</span>
                      </div>
                      <h3 className="mt-1 truncate text-[15px] font-bold text-foreground">{venda.cliente_nome || "Cliente não informado"}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pedido?.numero_pedido ? `Pedido #${pedido.numero_pedido}` : "Sem pedido de produção"} · {venda.produtos_vendas.length} {venda.produtos_vendas.length === 1 ? "item" : "itens"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 border-border lg:border-x lg:px-5">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{localizacao}</p>
                      <div><Badge variant="outline" className={statusClasses}>{status}</Badge></div>
                      <p className="text-[11px] text-muted-foreground">{venda.tipo_entrega ? `Entrega: ${venda.tipo_entrega.replace(/_/g, " ")}` : "Entrega não informada"}</p>
                    </div>

                    <div className="lg:text-right">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Valor total</p>
                      <p className="mt-0.5 text-xl font-bold text-foreground">{formatarValor(venda.valor_venda)}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
                      <Button variant="outline" size="icon" title={copiado === venda.rastreio_token ? "Link copiado" : "Copiar link"} onClick={() => copiarLink(venda.rastreio_token)}>
                        {copiado === venda.rastreio_token ? <Check /> : <Copy />}
                      </Button>
                      <Button className="flex-1 shadow-sm sm:flex-none" asChild>
                        <a href={criarLink(venda.rastreio_token)} target="_blank" rel="noreferrer">Rastrear <ArrowRight /></a>
                      </Button>
                    </div>
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