import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Percent,
  PlusCircle,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Banknote,
  Receipt,
  Clock,
  User,
  MapPin,
  Package,
  Lock,
  Loader2,
  Infinity as InfinityIcon,
  Key,
} from 'lucide-react';
import { useRegrasVendas } from '@/hooks/useRegrasVendas';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
      <span className="text-white/80 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}

export default function RegrasVendasView() {
  const { regras, isLoading, limites } = useRegrasVendas();

  return (
    <MinimalistLayout
      title="Regras de Vendas"
      subtitle="Visualização das regras vigentes (somente leitura)"
      backPath="/direcao/vendas"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Vendas', path: '/direcao/vendas' },
        { label: 'Regras de Vendas' },
      ]}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : !regras ? (
        <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-white/60 text-sm">
          Nenhuma regra configurada.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Descontos */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-900/20 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Percent className="h-5 w-5 text-blue-400" />
                Regras de Desconto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Pagamento à vista (não cartão)" value={`+${limites.avista}%`} />
              <Row label="Venda fria" value={`+${limites.fria}%`} />
              <Row label="Adicional com senha do responsável" value={`+${limites.adicionalResponsavel}%`} />
              <div className="grid gap-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-white/80 text-sm">Limite sem autorização</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {limites.totalSemSenha.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span className="text-white text-sm font-medium">Máximo com responsável</span>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {limites.totalComResponsavel.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-red-400" />
                    <span className="text-white text-sm font-medium">Com senha master</span>
                  </div>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
                    <InfinityIcon className="h-3 w-3" />
                    Sem limite
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acréscimo */}
          <Card className="bg-gradient-to-br from-green-500/10 to-green-900/20 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <PlusCircle className="h-5 w-5 text-green-400" />
                Regras de Acréscimo (Crédito)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5" />
                <p className="text-white/80 text-sm">
                  Adiciona valor ao total da venda, aumentando a margem.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <XCircle className="h-4 w-4 text-red-400 mt-0.5" />
                <p className="text-white/80 text-sm">
                  <strong className="text-red-400">Não pode</strong> ser aplicado se houver qualquer desconto na venda.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <Receipt className="h-4 w-4 text-blue-400 mt-0.5" />
                <p className="text-white/80 text-sm">
                  Usado para adicionar margem extra ou cobrar por serviços adicionais.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Formas de Pagamento */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-900/20 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5 text-purple-400" />
                Formas de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="boleto" className="border-white/10">
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span>Boleto</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    <div className="space-y-3 pl-6">
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5" />
                        <p className="text-sm text-white/80">
                          Boleto adiciona <strong className="text-green-300">+{limites.avista}% de desconto</strong> por pagamento à vista (via entrada obrigatória).
                        </p>
                      </div>
                      <Row label="Entrada mínima à vista" value={`${limites.boleto.entradaMinPct}%`} />
                      <Row label="Máximo de parcelas" value={limites.boleto.parcelasMax} />
                      <Row
                        label="Valor limite p/ intervalos flexíveis"
                        value={limites.boleto.valorLimiteFlex.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      />
                      <Row label="Intervalo padrão" value={`${limites.boleto.intervaloPadrao} dias`} />
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                        <span className="text-xs text-white/70">Intervalos flexíveis permitidos</span>
                        <div className="flex flex-wrap gap-2">
                          {limites.boleto.intervalosFlex.map((d) => (
                            <Badge key={d} variant="outline" className="text-white/80 border-white/30 bg-white/5">
                              {d} dias
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <p className="text-xs text-blue-100/90 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-300" />
                          <span>
                            Vendas <strong>acima</strong> de {limites.boleto.valorLimiteFlex.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} liberam os intervalos flexíveis. Até esse valor, trava no intervalo padrão de {limites.boleto.intervaloPadrao} dias.
                          </span>
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <p className="text-xs text-blue-100/90 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-300" />
                          <span>
                            Sempre que qualquer método de pagamento for boleto, a venda força <strong>2 formas de pagamento</strong>: Método 1 = À Vista com no mínimo {limites.boleto.entradaMinPct}%; Método 2 = Boleto com o restante.
                          </span>
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="avista" className="border-white/10">
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-green-400" />
                      <span>À Vista</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    <div className="space-y-2 pl-6">
                      <p className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <span>Requer upload de comprovante de pagamento.</span>
                      </p>
                      <p className="text-sm">Habilita desconto de até {limites.avista}% por pagamento à vista.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cartao" className="border-white/10">
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-400" />
                      <span>Cartão de Crédito</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    <div className="space-y-2 pl-6">
                      <p className="text-sm">Parcelamento de {regras.cartao_parcelas_min} a {regras.cartao_parcelas_max} vezes.</p>
                      {!regras.cartao_habilita_desconto_avista && (
                        <p className="text-sm text-amber-400 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>Não habilita desconto por pagamento à vista.</span>
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dinheiro" className="border-white/10">
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-emerald-400" />
                      <span>Dinheiro</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    <div className="pl-6">
                      <p className="text-sm">Habilita desconto de até {limites.avista}% por pagamento à vista.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data-pagamento" className="border-white/10">
                  <AccordionTrigger className="text-white hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span>Data de Pagamento</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 pb-4">
                    <div className="space-y-2 pl-6">
                      <Row label="Janela permitida" value={`± ${limites.pagamentoDataJanelaDias} dias`} />
                      <p className="text-xs text-white/50">
                        A data de pagamento de qualquer método deve estar dentro dessa janela em relação a hoje.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Regras gerais */}
          <Card className="bg-gradient-to-br from-slate-500/10 to-slate-900/20 border-slate-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Receipt className="h-5 w-5 text-slate-300" />
                Regras Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Máximo de formas de pagamento por venda" value={regras.max_formas_pagamento} />
              <Row
                label="Pagamento imediato exige comprovante"
                value={regras.pagamento_imediato_exige_comprovante ? 'Sim' : 'Não'}
              />
              <Row
                label="Bloqueia desconto quando há crédito"
                value={regras.bloqueia_desconto_com_credito ? 'Sim' : 'Não'}
              />
              <Row
                label="À vista exige comprovante"
                value={regras.avista_exige_comprovante ? 'Sim' : 'Não'}
              />
              <Row
                label="Acréscimo permitido com desconto"
                value={regras.acrescimo_permite_com_desconto ? 'Sim' : 'Não'}
              />
            </CardContent>
          </Card>

          {/* Campos obrigatórios */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-900/20 border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-amber-400" />
                Campos Obrigatórios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    Dados do Cliente
                  </h4>
                  <div className="space-y-2 pl-6">
                    {regras.obrigatorio_nome && (
                      <div className="flex items-center gap-2 text-white/70 text-sm">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span>Nome do cliente</span>
                      </div>
                    )}
                    {regras.obrigatorio_telefone && (
                      <div className="flex items-center gap-2 text-white/70 text-sm">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span>Telefone</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-400" />
                    Localização
                  </h4>
                  <div className="space-y-2 pl-6">
                    {regras.obrigatorio_estado && (
                      <div className="flex items-center gap-2 text-white/70 text-sm">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span>Estado</span>
                      </div>
                    )}
                    {regras.obrigatorio_cidade && (
                      <div className="flex items-center gap-2 text-white/70 text-sm">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span>Cidade</span>
                      </div>
                    )}
                    {regras.obrigatorio_cep && (
                      <div className="flex items-center gap-2 text-white/70 text-sm">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span>CEP</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <span>Bairro (mínimo {regras.obrigatorio_bairro_min_chars} caracteres)</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <span>Endereço (mínimo {regras.obrigatorio_endereco_min_chars} caracteres)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-400" />
                    Produtos
                  </h4>
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <span>Mínimo {regras.produto_minimo_quantidade} produto(s) na venda</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-400" />
                    Documentos (Opcional)
                  </h4>
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span>CPF: {regras.cpf_digitos} dígitos (se informado)</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span>CNPJ: {regras.cnpj_digitos} dígitos (se informado)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MinimalistLayout>
  );
}