import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MetodoPagamentoCard, MetodoPagamento, createEmptyMetodo } from "./MetodoPagamentoCard";
import { useEffect, useRef, useState, useMemo } from "react";
import { Info, ShieldCheck, Unlock, CheckCircle2, AlertTriangle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  aplicarRegraBoleto,
  pagamentoTemBoleto,
  getIntervalosBoletoPermitidos,
} from "@/utils/boletoRegra";
import { getJanelaDataPagamento } from "@/utils/dataPagamentoRegra";
import { useRegrasVendas } from "@/hooks/useRegrasVendas";
import { AutorizacaoDescontoModal } from "./AutorizacaoDescontoModal";

export interface PagamentoData {
  usar_dois_metodos: boolean;
  metodos: [MetodoPagamento, MetodoPagamento];
  pagamento_na_entrega: boolean;
}

export const createEmptyPagamentoData = (): PagamentoData => ({
  usar_dois_metodos: false,
  metodos: [createEmptyMetodo(), createEmptyMetodo()],
  pagamento_na_entrega: false
});

interface PagamentoSectionProps {
  paymentData: PagamentoData;
  onChange: (data: PagamentoData) => void;
  valorTotal: number;
  vendaPresencial?: boolean | null;
  onVendaPresencialChange?: (value: boolean) => void;
  descontoInfo?: {
    percentualAplicado: number;
    limitePermitido: number;
    limiteMaximo: number;
  };
  hideEmpresaReceptora?: boolean;
  /**
   * Callback disparado quando o Gerente libera (ou reverte) as regras de
   * pagamento (entrada de boleto, intervalo e janela de data). O consumidor
   * deve persistir esse registro ao criar a venda.
   */
  onOverrideChange?: (payload: { autorizadorId: string; senha: string } | null) => void;
  /**
   * Callback disparado sempre que o estado de "pagamento confirmado" mudar.
   * O consumidor deve bloquear o envio do formulário enquanto for `false`.
   */
  onConfirmadoChange?: (confirmed: boolean) => void;
}

export function PagamentoSection({ paymentData, onChange, valorTotal, vendaPresencial, onVendaPresencialChange, descontoInfo, hideEmpresaReceptora = false, onOverrideChange, onConfirmadoChange }: PagamentoSectionProps) {
  const { limites: regrasLimites } = useRegrasVendas();
  const boletoConfig = regrasLimites.boleto;
  const janelaDias = regrasLimites.pagamentoDataJanelaDias;
  const entradaPct = boletoConfig.entradaMinPct;
  const restantePct = Math.max(0, 100 - entradaPct);

  // Autorização do Gerente para relaxar as regras de pagamento
  // (entrada mínima, intervalo de boleto e janela de data).
  const [autorizadoRegras, setAutorizadoRegras] = useState(false);
  // Estado de confirmação do bloco de pagamento. Quando `false`, o formulário
  // pai deve bloquear o envio.
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const entradaMinima = valorTotal * (entradaPct / 100);

  const isEntradaViolada = (data: PagamentoData) => {
    if (!pagamentoTemBoleto(data) || valorTotal <= 0) return false;
    const m1 = data.metodos[0];
    if (m1?.tipo !== 'a_vista') return false;
    return (m1.valor ?? 0) + 0.02 < entradaMinima;
  };
  const isIntervaloViolado = (m: MetodoPagamento) => {
    if (m?.tipo !== 'boleto') return false;
    const permitidos = getIntervalosBoletoPermitidos(valorTotal, boletoConfig);
    return !permitidos.includes(m.intervalo_boletos);
  };
  const isDataViolada = (m: MetodoPagamento) => {
    if (!m?.data_pagamento) return false;
    const { min, max } = getJanelaDataPagamento(janelaDias);
    const d = new Date(m.data_pagamento);
    d.setHours(0, 0, 0, 0);
    return d < min || d > max;
  };

  // Formata em BRL curto
  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Lista todas as violações do estado atual de pagamento.
  const calcularViolacoes = (): string[] => {
    const violacoes: string[] = [];
    const [m1, m2] = paymentData.metodos;
    if (isEntradaViolada(paymentData)) {
      const atual = m1.valor ?? 0;
      violacoes.push(
        `Entrada de ${fmtBRL(atual)} abaixo do mínimo de ${fmtBRL(entradaMinima)} (${entradaPct}% do total).`,
      );
    }
    const permitidos = getIntervalosBoletoPermitidos(valorTotal, boletoConfig);
    if (isIntervaloViolado(m1)) {
      violacoes.push(
        `Método 1: intervalo de ${m1.intervalo_boletos} dias fora do permitido (${permitidos.join(', ')} dias).`,
      );
    }
    if (isIntervaloViolado(m2)) {
      violacoes.push(
        `Método 2: intervalo de ${m2.intervalo_boletos} dias fora do permitido (${permitidos.join(', ')} dias).`,
      );
    }
    const { min, max } = getJanelaDataPagamento(janelaDias);
    const fmtDate = (d: Date) => format(d, "dd/MM/yyyy", { locale: ptBR });
    if (isDataViolada(m1)) {
      violacoes.push(
        `Método 1: data ${fmtDate(m1.data_pagamento!)} fora da janela permitida (${fmtDate(min)} a ${fmtDate(max)}).`,
      );
    }
    if (isDataViolada(m2)) {
      violacoes.push(
        `Método 2: data ${fmtDate(m2.data_pagamento!)} fora da janela permitida (${fmtDate(min)} a ${fmtDate(max)}).`,
      );
    }
    return violacoes;
  };

  const [violacoesModal, setViolacoesModal] = useState<string[]>([]);

  const handleConfirmar = () => {
    const violacoes = calcularViolacoes();
    if (violacoes.length === 0) {
      setPagamentoConfirmado(true);
      // Sem violações: nenhuma autorização necessária.
      if (autorizadoRegras) {
        setAutorizadoRegras(false);
        onOverrideChange?.(null);
      }
      return;
    }
    setViolacoesModal(violacoes);
    setConfirmModalOpen(true);
  };

  const handleEditarPagamento = () => {
    setPagamentoConfirmado(false);
  };

  // Notifica o pai sobre mudanças de confirmação.
  useEffect(() => {
    onConfirmadoChange?.(pagamentoConfirmado);
  }, [pagamentoConfirmado, onConfirmadoChange]);

  // Sempre que o pagamento for editado após confirmar, invalida a confirmação.
  const pagamentoHash = useMemo(() => JSON.stringify({
    u: paymentData.usar_dois_metodos,
    e: paymentData.pagamento_na_entrega,
    m: paymentData.metodos.map((m) => ({
      t: m.tipo,
      v: m.valor,
      d: m.data_pagamento?.toISOString?.() ?? null,
      i: m.intervalo_boletos,
      p: m.parcelas_boleto,
      pc: m.parcelas_cartao,
      e: m.empresa_receptora_id,
      jp: m.ja_pago,
    })),
  }), [paymentData]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPagamentoConfirmado(false);
  }, [pagamentoHash]);

  const { data: empresas = [], isLoading: isLoadingEmpresas } = useQuery({
    queryKey: ['empresas-emissoras-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas_emissoras')
        .select('id, nome')
        .eq('ativo', true)
        .order('padrao', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Auto-set empresa padrão quando empresas carregam
  useEffect(() => {
    if (empresas.length > 0) {
      const empresaPadrao = empresas[0];
      let needsUpdate = false;
      const newMetodos = [...paymentData.metodos] as [MetodoPagamento, MetodoPagamento];
      
      if (!paymentData.metodos[0].empresa_receptora_id && paymentData.metodos[0].tipo) {
        newMetodos[0] = { ...newMetodos[0], empresa_receptora_id: empresaPadrao.id };
        needsUpdate = true;
      }
      if (!paymentData.metodos[1].empresa_receptora_id && paymentData.metodos[1].tipo) {
        newMetodos[1] = { ...newMetodos[1], empresa_receptora_id: empresaPadrao.id };
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        onChange({ ...paymentData, metodos: newMetodos });
      }
    }
  }, [empresas, paymentData.metodos[0].tipo, paymentData.metodos[1].tipo]);

  // Aplica a regra do boleto (70% à vista + 30% boleto com intervalo de 21 dias)
  // sempre que houver boleto em qualquer método.
  useEffect(() => {
    if (autorizadoRegras) return; // regras liberadas pelo Gerente
    // Split estrutural M1 À Vista + M2 Boleto quando houver boleto em qualquer método.
    // Só normaliza quando a estrutura ainda não está no formato esperado — evita
    // sobrescrever valores/intervalos/datas que o usuário editou manualmente.
    if (!pagamentoTemBoleto(paymentData) || valorTotal <= 0) return;
    const [m1, m2] = paymentData.metodos;
    const estruturaOk =
      paymentData.usar_dois_metodos && m1?.tipo === 'a_vista' && m2?.tipo === 'boleto';
    if (estruturaOk) return;
    const normalizado = aplicarRegraBoleto(paymentData, valorTotal, boletoConfig);
    if (normalizado !== paymentData) {
      onChange(normalizado);
    }
  }, [
    paymentData.metodos[0].tipo,
    paymentData.metodos[1].tipo,
    paymentData.usar_dois_metodos,
    valorTotal,
    boletoConfig.entradaMinPct,
    boletoConfig.valorLimiteFlex,
    boletoConfig.intervaloPadrao,
    boletoConfig.parcelasMax,
    autorizadoRegras,
  ]);

  const regraBoletoAtiva = pagamentoTemBoleto(paymentData) && !autorizadoRegras;
  // Sempre exibe a lista completa; o card mostra a permissão como dica sem bloquear.
  const intervalosBoletoPermitidos = getIntervalosBoletoPermitidos(valorTotal, boletoConfig);

  const handleAutorizadoRegras = (autorizadorId: string, senha: string) => {
    setAutorizadoRegras(true);
    setPagamentoConfirmado(true);
    onOverrideChange?.({ autorizadorId, senha });
    setConfirmModalOpen(false);
  };

  const handleConfirmModalOpenChange = (open: boolean) => {
    setConfirmModalOpen(open);
    // Se fechou sem autorizar, mantém pagamentoConfirmado=false.
  };

  const handleReverterAutorizacao = () => {
    setAutorizadoRegras(false);
    onOverrideChange?.(null);
    setPagamentoConfirmado(false);
  };

  const handleMetodo1Change = (metodo: MetodoPagamento) => {
    const newMetodos: [MetodoPagamento, MetodoPagamento] = [metodo, paymentData.metodos[1]];
    // Se estiver usando 2 métodos, recalcular o valor restante
    if (paymentData.usar_dois_metodos) {
      const valorRestante = Math.max(0, valorTotal - metodo.valor);
      newMetodos[1] = { ...newMetodos[1], valor: valorRestante };
    } else {
      // Se for método único, o valor é o total
      newMetodos[0] = { ...metodo, valor: valorTotal };
    }
    onChange({ ...paymentData, metodos: newMetodos });
  };

  const handleMetodo2Change = (metodo: MetodoPagamento) => {
    const newMetodos: [MetodoPagamento, MetodoPagamento] = [paymentData.metodos[0], metodo];
    onChange({ ...paymentData, metodos: newMetodos });
  };

  const handleToggleDoisMetodos = (checked: boolean) => {
    if (checked) {
      // Ativando 2 métodos - zerar valores para usuário definir
      onChange({
        usar_dois_metodos: true,
        metodos: [
          { ...paymentData.metodos[0], valor: 0 },
          createEmptyMetodo()
        ],
        pagamento_na_entrega: paymentData.pagamento_na_entrega
      });
    } else {
      // Desativando 2 métodos - método 1 recebe valor total
      onChange({
        usar_dois_metodos: false,
        metodos: [
          { ...paymentData.metodos[0], valor: valorTotal },
          createEmptyMetodo()
        ],
        pagamento_na_entrega: paymentData.pagamento_na_entrega
      });
    }
  };

  // Calcular preview de parcelas para boleto e cartão
  const calcularPreviewParcelas = (metodo: MetodoPagamento) => {
    if (!metodo.data_pagamento || metodo.valor <= 0) return [];
    
    const parcelas: { numero: number; data: Date; valor: number }[] = [];
    
    if (metodo.tipo === 'boleto') {
      const valorParcela = metodo.valor / metodo.parcelas_boleto;
      for (let i = 0; i < metodo.parcelas_boleto; i++) {
        parcelas.push({
          numero: i + 1,
          data: addDays(metodo.data_pagamento, metodo.intervalo_boletos * i),
          valor: valorParcela
        });
      }
    } else if (metodo.tipo === 'cartao_credito') {
      const valorParcela = metodo.valor / metodo.parcelas_cartao;
      for (let i = 0; i < metodo.parcelas_cartao; i++) {
        parcelas.push({
          numero: i + 1,
          data: addDays(metodo.data_pagamento, 30 * i),
          valor: valorParcela
        });
      }
    }
    
    return parcelas;
  };

  const metodo1 = paymentData.metodos[0];
  const metodo2 = paymentData.metodos[1];
  const valorMetodo1 = paymentData.usar_dois_metodos ? metodo1.valor : valorTotal;
  const valorMetodo2 = paymentData.usar_dois_metodos ? Math.max(0, valorTotal - metodo1.valor) : 0;
  const valoresConferem = !paymentData.usar_dois_metodos || (metodo1.valor + valorMetodo2 === valorTotal);

  const cardClass = "bg-white/5 border-white/10 backdrop-blur-xl";

  return (
    <>
    <Card className={cardClass}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-white">Forma de Pagamento</CardTitle>
          <div className="flex items-center gap-2">
            {autorizadoRegras && (
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="border text-xs bg-amber-500/15 border-amber-400/40 text-amber-100"
                  title="Entrada, data e intervalo de boletos liberados pelo Gerente."
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Regras liberadas
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReverterAutorizacao}
                  className="h-7 gap-1.5 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Reverter
                </Button>
              </div>
            )}
            {descontoInfo && (() => {
              const { percentualAplicado, limitePermitido } = descontoInfo;
              const disponivel = Math.max(0, limitePermitido - percentualAplicado);
              const acumuladoExcede = percentualAplicado > limitePermitido;
              return (
                <Badge
                  variant="outline"
                  className={cn(
                    "border text-xs",
                    acumuladoExcede
                      ? "bg-amber-500/15 border-amber-400/40 text-amber-100"
                      : "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                  )}
                  title={`Aplicado ${percentualAplicado.toFixed(1)}% • Limite ${limitePermitido}%`}
                >
                  Desconto: {disponivel.toFixed(1)}%
                </Badge>
              );
            })()}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(createEmptyPagamentoData())}
              className="h-7 gap-1.5 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Recomeçar
            </Button>
            <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {/* Temperatura da venda */}
        {onVendaPresencialChange && (
          <div className="space-y-2">
            <Label className="text-xs text-white/70">Temperatura da venda *</Label>
            <RadioGroup
              value={vendaPresencial === null || vendaPresencial === undefined ? '' : vendaPresencial ? 'quente' : 'frio'}
              onValueChange={(v) => onVendaPresencialChange(v === 'quente')}
              className="grid grid-cols-2 gap-3"
            >
              <label
                htmlFor="temp-frio"
                className={cn(
                  "flex items-center justify-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border-2",
                  vendaPresencial === false
                    ? "bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border-cyan-400/50 shadow-lg shadow-cyan-500/20"
                    : "bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-400/40 hover:bg-cyan-500/10"
                )}
              >
                <RadioGroupItem value="frio" id="temp-frio" className="sr-only" />
                <span className="text-lg">❄️</span>
                <span className={cn(
                  "text-sm font-medium",
                  vendaPresencial === false ? "text-cyan-100" : "text-cyan-200/70"
                )}>Frio</span>
              </label>
              <label
                htmlFor="temp-quente"
                className={cn(
                  "flex items-center justify-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border-2",
                  vendaPresencial === true
                    ? "bg-gradient-to-r from-orange-500/20 to-orange-600/10 border-orange-400/50 shadow-lg shadow-orange-500/20"
                    : "bg-orange-500/5 border-orange-500/20 hover:border-orange-400/40 hover:bg-orange-500/10"
                )}
              >
                <RadioGroupItem value="quente" id="temp-quente" className="sr-only" />
                <span className="text-lg">🔥</span>
                <span className={cn(
                  "text-sm font-medium",
                  vendaPresencial === true ? "text-orange-100" : "text-orange-200/70"
                )}>Quente</span>
              </label>
            </RadioGroup>
          </div>
        )}

        {/* Aviso da regra do boleto */}
        {regraBoletoAtiva && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-300 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-100/90">
              <strong className="text-blue-200">Regra do boleto:</strong> a venda foi
              ajustada automaticamente para no mínimo {entradaPct}% de entrada
              à vista no Método 1 e o restante em boleto no Método 2 (até {boletoConfig.parcelasMax} parcelas)
              {intervalosBoletoPermitidos && intervalosBoletoPermitidos.length === 1
                ? ` com intervalo fixo de ${boletoConfig.intervaloPadrao} dias`
                : ` com intervalo entre ${(intervalosBoletoPermitidos ?? []).join(', ')} dias (vendas acima de R$ ${boletoConfig.valorLimiteFlex.toLocaleString('pt-BR')})`}.
            </div>
          </div>
        )}

        {autorizadoRegras && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <ShieldCheck className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-100/90">
              <strong className="text-amber-200">Regras liberadas por autorização do Gerente.</strong>{' '}
              Entrada de boleto, data de pagamento e intervalo de boletos podem ser
              definidos manualmente. Reverter volta às regras padrão.
            </div>
          </div>
        )}

        {/* Toggle para 2 métodos */}
        <div className={cn(
          "flex items-center space-x-2 p-2.5 border rounded-md border-white/10 bg-white/5",
          regraBoletoAtiva && "opacity-60"
        )}>
          <Checkbox
            id="usar-dois-metodos"
            checked={paymentData.usar_dois_metodos}
            onCheckedChange={handleToggleDoisMetodos}
            disabled={regraBoletoAtiva}
          />
          <Label htmlFor="usar-dois-metodos" className="cursor-pointer text-xs text-white/70">
            Usar 2 formas de pagamento (ex: entrada + restante)
          </Label>
        </div>

        {/* Métodos de Pagamento */}
        <div className={cn(
          "grid gap-4",
          paymentData.usar_dois_metodos ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        )}>
          <div className="space-y-3">
            <MetodoPagamentoCard
              metodo={{ ...metodo1, valor: valorMetodo1 }}
              onChange={handleMetodo1Change}
              empresas={empresas}
              isLoadingEmpresas={isLoadingEmpresas}
              hideEmpresaReceptora={hideEmpresaReceptora}
              titulo={
                regraBoletoAtiva
                  ? `Método 1 (Entrada ≥ ${entradaPct}% — À Vista)`
                  : paymentData.usar_dois_metodos ? "Método 1 (Entrada)" : "Método de Pagamento"
              }
              valorFixo={!paymentData.usar_dois_metodos}
              valorLabel={
                regraBoletoAtiva
                  ? `Entrada (mín ${entradaPct}%)`
                  : paymentData.usar_dois_metodos ? "Valor da Entrada *" : "Valor Total"
              }
              tipoTravado={regraBoletoAtiva ? "a_vista" : undefined}
              intervalosBoletoPermitidos={intervalosBoletoPermitidos}
              parcelasBoletoMax={boletoConfig.parcelasMax}
              dataPagamentoJanelaDias={janelaDias}
              dataPagamentoLiberada={autorizadoRegras}
            />

            {(metodo1.tipo === 'boleto' || metodo1.tipo === 'cartao_credito') && metodo1.data_pagamento && valorMetodo1 > 0 && (
              <div className="border rounded-lg p-3 border-white/10 bg-white/5">
                <p className="text-xs font-medium mb-2 text-white/70">
                  Parcelas {metodo1.tipo === 'boleto' ? 'do Boleto' : 'do Cartão'} (Método 1):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {calcularPreviewParcelas({ ...metodo1, valor: valorMetodo1 }).map((p) => (
                    <div key={p.numero} className="text-xs p-2 bg-white/5 rounded border border-white/10 text-white/60">
                      <span className="font-medium text-white">{p.numero}ª:</span>{' '}
                      {format(p.data, "dd/MM/yy", { locale: ptBR })} -{' '}
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {paymentData.usar_dois_metodos && (
            <div className="space-y-3">
              <MetodoPagamentoCard
                metodo={{ ...metodo2, valor: valorMetodo2 }}
                onChange={handleMetodo2Change}
                empresas={empresas}
                isLoadingEmpresas={isLoadingEmpresas}
                hideEmpresaReceptora={hideEmpresaReceptora}
                titulo={regraBoletoAtiva ? `Método 2 (Boleto — restante)` : "Método 2 (Restante)"}
                valorFixo={true}
                valorLabel="Valor Restante"
                tipoTravado={regraBoletoAtiva ? "boleto" : undefined}
                intervalosBoletoPermitidos={intervalosBoletoPermitidos}
                parcelasBoletoMax={boletoConfig.parcelasMax}
                dataPagamentoJanelaDias={janelaDias}
              dataPagamentoLiberada={autorizadoRegras}
              />

              {(metodo2.tipo === 'boleto' || metodo2.tipo === 'cartao_credito') && metodo2.data_pagamento && valorMetodo2 > 0 && (
                <div className="border rounded-lg p-3 border-white/10 bg-white/5">
                  <p className="text-xs font-medium mb-2 text-white/70">
                    Parcelas {metodo2.tipo === 'boleto' ? 'do Boleto' : 'do Cartão'} (Método 2):
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {calcularPreviewParcelas({ ...metodo2, valor: valorMetodo2 }).map((p) => (
                      <div key={p.numero} className="text-xs p-2 bg-white/5 rounded border border-white/10 text-white/60">
                        <span className="font-medium text-white">{p.numero}ª:</span>{' '}
                        {format(p.data, "dd/MM/yy", { locale: ptBR })} -{' '}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Checkbox Pagamento na Entrega */}
        <div 
          className={`flex items-start space-x-3 p-3 border rounded-lg transition-all ${
            paymentData.pagamento_na_entrega 
              ? 'border-amber-500/50 bg-amber-500/10' 
              : 'border-white/10 bg-white/5'
          }`}
        >
          <Checkbox
            id="pagamento-na-entrega"
            checked={paymentData.pagamento_na_entrega}
            onCheckedChange={(checked) => onChange({ ...paymentData, pagamento_na_entrega: !!checked })}
            className="mt-0.5"
          />
          <div className="flex-1">
            <Label htmlFor="pagamento-na-entrega" className="cursor-pointer text-sm font-medium text-white">
              Pagamento será feito na entrega/instalação
            </Label>
            <p className="text-xs text-white/50 mt-1">
              O valor total será cobrado no momento da entrega ou instalação
            </p>
          </div>
        </div>


        {/* Resumo do pagamento */}
        {(metodo1.tipo || (paymentData.usar_dois_metodos && metodo2.tipo)) && (
          <div className="border rounded-lg p-4 space-y-3 border-white/10 bg-white/5">
            <h4 className="font-medium text-sm text-white">Resumo do Pagamento</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Total da Venda:</span>
                <span className="font-medium text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                </span>
              </div>
              
              <div className="border-t border-white/10 pt-2 space-y-1">
                {metodo1.tipo && (
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      {paymentData.usar_dois_metodos ? 'Método 1' : 'Pagamento'} ({
                        metodo1.tipo === 'boleto' ? `Boleto ${metodo1.parcelas_boleto}x` :
                        metodo1.tipo === 'cartao_credito' ? `Cartão ${metodo1.parcelas_cartao}x` :
                        'À Vista'
                      }):
                    </span>
                    <span className="text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorMetodo1)}
                      {metodo1.data_pagamento && (
                        <span className="text-white/40 ml-2">
                          em {format(metodo1.data_pagamento, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                
                {paymentData.usar_dois_metodos && metodo2.tipo && (
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      Método 2 ({
                        metodo2.tipo === 'boleto' ? `Boleto ${metodo2.parcelas_boleto}x` :
                        metodo2.tipo === 'cartao_credito' ? `Cartão ${metodo2.parcelas_cartao}x` :
                        'À Vista'
                      }):
                    </span>
                    <span className="text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorMetodo2)}
                      {metodo2.data_pagamento && (
                        <span className="text-white/40 ml-2">
                          em {format(metodo2.data_pagamento, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-2">
                {valoresConferem ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✓ Valores conferem</Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">⚠ Valores não conferem com o total</Badge>
                )}
              </div>

              {(() => {
                const violacoes = calcularViolacoes();
                if (violacoes.length === 0) return null;
                return (
                  <div className="border-t border-white/10 pt-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-200 text-xs font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {autorizadoRegras
                        ? `Regras liberadas pelo Gerente (${violacoes.length}):`
                        : `Regras infringidas (${violacoes.length}):`}
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-100/90">
                      {violacoes.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        {/* Confirmação do bloco de pagamento */}
        {paymentData.metodos[0].tipo && (
          <div className="border rounded-lg p-4 flex items-center justify-between gap-3 border-white/10 bg-white/5">
            {pagamentoConfirmado ? (
              <>
                <div className="flex items-center gap-2 text-emerald-300 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Forma de pagamento confirmada</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEditarPagamento}
                  className="h-8 gap-1.5 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-amber-200 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Revise os métodos acima e confirme para prosseguir com a venda.</span>
                </div>
                <Button
                  type="button"
                  onClick={handleConfirmar}
                  className="h-9 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Confirmar forma de pagamento
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    <AutorizacaoDescontoModal
      open={confirmModalOpen}
      onOpenChange={handleConfirmModalOpenChange}
      onAutorizado={handleAutorizadoRegras}
      percentualDesconto={0}
      tipoAutorizacao="responsavel_setor"
      limitePermitido={0}
      titulo="Confirmar pagamento fora das regras"
      descricao={
        <div className="space-y-2">
          <p>
            A forma de pagamento configurada infringe {violacoesModal.length === 1 ? 'a seguinte regra' : `${violacoesModal.length} regras`}:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-foreground">
            {violacoesModal.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
          <p>
            Digite a senha do <span className="font-bold text-foreground">Gerente</span> para autorizar e prosseguir com a venda.
          </p>
        </div>
      }
    />
    </>
  );
}
