import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Check, Circle, Clock3, Factory, Loader2, MapPin, MessageCircle, Package, Phone, ShieldCheck, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import portinhaAsset from "@/assets/portinha-rastreio.png.asset.json";
import williamAsset from "@/assets/william-entregas.png.asset.json";
import magnoAsset from "@/assets/magno-vendas.png.asset.json";

const PORTINHA_FALLBACK_URL = `https://id-preview--9eb1bc32-7d67-4330-b27a-36a057f315d7.lovable.app${portinhaAsset.url}`;
const ASSET_FALLBACK_ORIGIN = "https://id-preview--9eb1bc32-7d67-4330-b27a-36a057f315d7.lovable.app";

interface ProdutoPublico {
  id: string;
  descricao: string | null;
  tipo_produto: string;
  quantidade: number | null;
  largura: number | null;
  altura: number | null;
  tamanho: string | null;
  cor: string | null;
}

interface RastreioPublico {
  venda: { id: string; numero: string; cliente_nome: string | null; data_venda: string; tipo_entrega: string | null };
  produtos: ProdutoPublico[];
  pedido: { numero: string; etapa_atual: string; status: string; data_entrega: string | null; created_at: string; arquivado: boolean } | null;
  etapas: Array<{ etapa: string; data_entrada: string | null; data_saida: string | null }>;
}

const ETAPAS = [
  { id: "compra_confirmada", label: "Compra confirmada", icon: ShieldCheck },
  { id: "aberto", label: "Pedido na fábrica", icon: Factory },
  { id: "em_producao", label: "Em produção", icon: Factory },
  { id: "inspecao_qualidade", label: "Inspeção de qualidade", icon: ShieldCheck },
  { id: "aguardando_pintura", label: "Pintura", icon: Package },
  { id: "embalagem", label: "Embalagem", icon: Package },
  { id: "aguardando_coleta", label: "Pronto para entrega", icon: Truck },
  { id: "instalacoes", label: "Instalação", icon: MapPin },
  { id: "correcoes", label: "Ajustes finais", icon: Clock3 },
  { id: "finalizado", label: "Pedido concluído", icon: Check },
  { id: "pos_vendas", label: "Pós-venda", icon: Check },
];

const ETAPA_EQUIVALENTE: Record<string, string> = {
  aprovacao_diretor: "aberto",
  aberto: "aberto",
  aprovacao_ceo: "aberto",
};

const ETAPAS_AGRUPADAS: Record<string, string[]> = {
  aberto: ["aprovacao_diretor", "aberto", "aprovacao_ceo"],
};

const TITULOS: Record<string, string> = {
  compra_confirmada: "Compra confirmada",
  aberto: "Pedido na fábrica!",
  em_producao: "Pedido em produção",
  inspecao_qualidade: "Pedido em inspeção de qualidade",
  aguardando_pintura: "Pedido em pintura",
  embalagem: "Pedido em embalagem",
  aguardando_coleta: "Pedido pronto para entrega",
  instalacoes: "Instalação em andamento",
  correcoes: "Pedido em ajustes finais",
  finalizado: "Pedido concluído",
  pos_vendas: "Acompanhamento pós-venda",
};

const CONTATOS = [
  {
    nome: "William",
    area: "Entregas",
    telefone: "+55 54 8422-9239",
    whatsapp: "555484229239",
    foto: williamAsset.url,
    fotoFallback: `${ASSET_FALLBACK_ORIGIN}${williamAsset.url}`,
  },
  {
    nome: "Magno",
    area: "Vendas",
    telefone: "+55 54 9272-7818",
    whatsapp: "555492727818",
    foto: magnoAsset.url,
    fotoFallback: `${ASSET_FALLBACK_ORIGIN}${magnoAsset.url}`,
  },
  {
    nome: "Jenifer",
    area: "Ouvidoria e Pós-vendas",
    telefone: "+55 54 9423-9930",
    whatsapp: "555494239930",
    foto: null,
    fotoFallback: null,
  },
];

const formatarData = (value?: string | null) => value
  ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value))
  : "A definir";

export default function RastreioVendaPublico() {
  const { token } = useParams();
  const tokenValido = Boolean(token && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token));
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rastreio-publico", token],
    enabled: tokenValido,
    retry: false,
    queryFn: async () => {
      if (!token) throw new Error("Código inválido");
      const { data: result, error } = await supabase.rpc("get_rastreio_venda", { p_token: token });
      if (error) throw error;
      return result as unknown as RastreioPublico | null;
    },
  });

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!tokenValido || isError || !data) return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center rounded-lg border border-border bg-card p-8 shadow-xl">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">Rastreio indisponível</h1>
        <p className="mt-2 text-muted-foreground">Confira se o link recebido está completo ou solicite um novo link ao seu vendedor.</p>
      </div>
    </main>
  );

  const etapaBruta = data.pedido?.etapa_atual || "compra_confirmada";
  const etapaAtual = ETAPA_EQUIVALENTE[etapaBruta] || etapaBruta;
  const indiceAtual = Math.max(0, ETAPAS.findIndex((item) => item.id === etapaAtual));
  const obterDataEtapa = (etapaId: string) => {
    if (etapaId === "compra_confirmada") return data.venda.data_venda;

    const idsRelacionados = ETAPAS_AGRUPADAS[etapaId] || [etapaId];
    const registros = data.etapas
      .filter((registro) => idsRelacionados.includes(registro.etapa) && registro.data_entrada)
      .sort((a, b) => new Date(a.data_entrada || 0).getTime() - new Date(b.data_entrada || 0).getTime());

    return registros[0]?.data_entrada || (etapaId === "aberto" ? data.pedido?.created_at : null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-28 max-w-6xl items-center px-5 py-5 md:min-h-32">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Elisa Portas</p>
            <h1 className="mt-1 text-xl font-semibold">Acompanhe sua compra</h1>
            <p className="mt-2 text-sm text-muted-foreground">Cada etapa, cada conquista, mais perto de você.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:py-12">
        <section className="relative overflow-hidden rounded-lg border border-primary/25 bg-card p-6 shadow-xl md:p-9">
          <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Compra #{data.venda.numero}</p>
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{TITULOS[etapaAtual] || "Pedido em andamento"}</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">Olá, {data.venda.cliente_nome || "cliente"}. Aqui você acompanha cada avanço da sua compra.</p>
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <span><strong>Compra:</strong> {formatarData(data.venda.data_venda)}</span>
                <span><strong>Entrega:</strong> {data.venda.tipo_entrega === "instalacao" ? "Com instalação" : "Entrega ou retirada"}</span>
                {data.pedido?.data_entrega && <span><strong>Previsão:</strong> {formatarData(data.pedido.data_entrega)}</span>}
              </div>
            </div>
            <div className="relative mx-auto h-44 w-44 shrink-0 sm:mx-0 md:h-56 md:w-56" aria-hidden="true">
              <div className="absolute bottom-2 left-1/2 h-4 w-28 -translate-x-1/2 rounded-full bg-primary/15 blur-md" />
              <img
                src={portinhaAsset.url}
                alt=""
                onError={(event) => {
                  if (event.currentTarget.src !== PORTINHA_FALLBACK_URL) {
                    event.currentTarget.src = PORTINHA_FALLBACK_URL;
                  }
                }}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-5 text-lg font-semibold">Andamento</h3>
          <div className="grid gap-0 md:flex md:w-full">
            {ETAPAS.map((etapa, index) => {
              const Icon = etapa.icon;
              const concluida = index < indiceAtual;
              const atual = index === indiceAtual;
              const dataEtapa = obterDataEtapa(etapa.id);
              return (
                <div key={etapa.id} className="relative flex gap-4 pb-6 md:block md:min-w-0 md:flex-1 md:pb-0 md:text-center">
                  <div className={cn("absolute left-4 top-8 h-full w-px md:left-1/2 md:top-4 md:h-px md:w-full", index === ETAPAS.length - 1 && "hidden", index < indiceAtual ? "bg-primary" : "bg-border")} />
                  <div className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border", concluida && "border-primary bg-primary text-primary-foreground", atual && "border-primary bg-card text-primary ring-4 ring-primary/15", !concluida && !atual && "border-border bg-muted text-muted-foreground")}>
                    {concluida ? <Check className="h-4 w-4" /> : atual ? <Icon className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 pt-1 md:mt-3 md:px-1 md:pt-0">
                    <p className={cn("text-sm md:text-xs", atual ? "font-semibold text-primary" : concluida ? "text-foreground" : "text-muted-foreground")}>{etapa.label}</p>
                    {(concluida || atual) && dataEtapa && (
                      <p className="mt-1 text-xs text-muted-foreground md:text-[10px]">{formatarData(dataEtapa)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold">Itens da compra</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {data.produtos.map((produto, index) => (
              <article key={produto.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="font-medium">{produto.descricao || `Item ${index + 1}`}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {produto.quantidade || 1} un.
                      {produto.largura && produto.altura ? ` · ${Number(produto.largura).toFixed(2)} m × ${Number(produto.altura).toFixed(2)} m` : produto.tamanho ? ` · ${produto.tamanho}` : ""}
                      {produto.cor ? ` · ${produto.cor}` : ""}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Fale com a Elisa</p>
            <h3 className="mt-1 text-xl font-semibold">Estamos aqui para ajudar</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {CONTATOS.map((contato) => (
              <article key={contato.nome} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center gap-4 p-5">
                  {contato.foto ? (
                    <img
                      src={contato.foto}
                      alt={`Foto de ${contato.nome}`}
                      onError={(event) => {
                        if (contato.fotoFallback && event.currentTarget.src !== contato.fotoFallback) {
                          event.currentTarget.src = contato.fotoFallback;
                        }
                      }}
                      className="h-16 w-16 shrink-0 rounded-full border-2 border-primary/30 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/15 text-xl font-semibold text-primary" aria-label="Foto de Jenifer ainda não disponível">
                      J
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold">{contato.nome}</h4>
                    <p className="text-sm font-medium text-primary">{contato.area}</p>
                    <a href={`tel:+${contato.whatsapp}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {contato.telefone}
                    </a>
                  </div>
                </div>
                <div className="border-t border-border p-3">
                  <Button asChild className="w-full">
                    <a href={`https://wa.me/${contato.whatsapp}`} target="_blank" rel="noreferrer">
                      <MessageCircle />
                      Chamar no WhatsApp
                    </a>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}