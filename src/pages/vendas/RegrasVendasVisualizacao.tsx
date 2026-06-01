import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Percent,
  Banknote,
  User,
  Shield,
  CreditCard,
  Receipt,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Package,
  MapPin,
} from 'lucide-react';
import { useRegrasVendas } from '@/hooks/useRegrasVendas';
import { BOLETO_ENTRADA_PERCENTUAL, BOLETO_INTERVALO_DIAS } from '@/utils/boletoRegra';

function BoolBadge({ value }: { value: boolean }) {
  return value ? (
    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1">
      <CheckCircle2 className="h-3 w-3" /> Sim
    </Badge>
  ) : (
    <Badge className="bg-white/5 text-white/60 border-white/10 gap-1">
      <XCircle className="h-3 w-3" /> Não
    </Badge>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-4 w-4 text-blue-300 shrink-0" />
        <span className="text-white/80 text-sm truncate">{label}</span>
      </div>
      <div className="shrink-0 text-sm text-white">{value}</div>
    </div>
  );
}

export default function RegrasVendasVisualizacao() {
  const { regras, limites, isLoading } = useRegrasVendas();

  return (
    <MinimalistLayout
      title="Regras de Vendas"
      subtitle="Consulta às regras vigentes"
      backPath="/vendas"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Vendas', path: '/vendas' },
        { label: 'Regras de Vendas' },
      ]}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
        </div>
      ) : !regras ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-10 flex items-center justify-center gap-2 text-white/70">
            <AlertCircle className="h-4 w-4" />
            Nenhuma regra cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Descontos */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-900/20 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Percent className="h-5 w-5 text-blue-400" />
                Descontos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row icon={Banknote} label="Pagamento à vista (não cartão)" value={`+${limites.avista}%`} />
              <Row icon={User} label="Venda fria" value={`+${limites.fria}%`} />
              <Row
                icon={Shield}
                label="Adicional com senha do responsável"
                value={`+${limites.adicionalResponsavel}%`}
              />
              <div className="grid gap-3 pt-2 border-t border-white/10">
                <Row
                  icon={CheckCircle2}
                  label="Limite sem autorização"
                  value={
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {limites.totalSemSenha.toFixed(1)}%
                    </Badge>
                  }
                />
                <Row
                  icon={Shield}
                  label="Limite com senha do responsável"
                  value={
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                      {limites.totalComResponsavel.toFixed(1)}%
                    </Badge>
                  }
                />
              </div>
              <Row
                icon={AlertCircle}
                label="Bloqueia desconto quando há crédito"
                value={<BoolBadge value={regras.bloqueia_desconto_com_credito} />}
              />
            </CardContent>
          </Card>

          {/* Desconto Master — débito no lucro */}
          <Card className="bg-gradient-to-br from-red-500/10 to-red-900/20 border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5 text-red-400" />
                Desconto Master — débito no lucro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row
                icon={Percent}
                label="Limite máximo sem débito no lucro"
                value={
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                    {limites.masterLucro.toFixed(1)}%
                  </Badge>
                }
              />
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm leading-relaxed">
                Quando o desconto autorizado por senha master ultrapassa{' '}
                <span className="text-white font-medium">
                  {limites.masterLucro.toFixed(1)}%
                </span>
                , o valor excedente (em R$) é{' '}
                <span className="text-red-300 font-medium">
                  debitado do lucro da venda
                </span>{' '}
                no faturamento.
                <br />
                <span className="text-white/50 text-xs">
                  Exemplo: venda de R$ 10.000 com desconto de 20% → excedente
                  de 5% = R$ 500 debitados do lucro.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Formas de pagamento */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/20 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5 text-emerald-400" />
                Formas de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row
                icon={Receipt}
                label="Boleto — intervalos (dias)"
                value={
                  <div className="flex flex-wrap gap-1 justify-end max-w-[260px]">
                    {(regras.boleto_intervalos_dias ?? []).map((d) => (
                      <Badge key={d} className="bg-white/10 text-white border-white/20">
                        {d}
                      </Badge>
                    ))}
                  </div>
                }
              />
              <Row
                icon={CreditCard}
                label="Cartão — parcelas"
                value={`${regras.cartao_parcelas_min}x a ${regras.cartao_parcelas_max}x`}
              />
              <Row
                icon={CreditCard}
                label="Cartão habilita desconto à vista"
                value={<BoolBadge value={regras.cartao_habilita_desconto_avista} />}
              />
              <Row
                icon={Banknote}
                label="À vista exige comprovante"
                value={<BoolBadge value={regras.avista_exige_comprovante} />}
              />
              <Row
                icon={Receipt}
                label="Pagamento imediato exige comprovante"
                value={<BoolBadge value={regras.pagamento_imediato_exige_comprovante} />}
              />
              <Row
                icon={FileText}
                label="Máximo de formas de pagamento"
                value={regras.max_formas_pagamento}
              />
            </CardContent>
          </Card>

          {/* Acréscimo */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-900/20 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Percent className="h-5 w-5 text-purple-400" />
                Acréscimos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row
                icon={CheckCircle2}
                label="Permite acréscimo junto com desconto"
                value={<BoolBadge value={regras.acrescimo_permite_com_desconto} />}
              />
              {regras.acrescimo_descricao && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm whitespace-pre-line">
                  {regras.acrescimo_descricao}
                </div>
              )}
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
            <CardContent className="space-y-3">
              <Row icon={User} label="Nome" value={<BoolBadge value={regras.obrigatorio_nome} />} />
              <Row icon={User} label="Telefone" value={<BoolBadge value={regras.obrigatorio_telefone} />} />
              <Row icon={MapPin} label="Estado" value={<BoolBadge value={regras.obrigatorio_estado} />} />
              <Row icon={MapPin} label="Cidade" value={<BoolBadge value={regras.obrigatorio_cidade} />} />
              <Row icon={MapPin} label="CEP" value={<BoolBadge value={regras.obrigatorio_cep} />} />
              <Row
                icon={MapPin}
                label="Bairro — mínimo de caracteres"
                value={regras.obrigatorio_bairro_min_chars}
              />
              <Row
                icon={MapPin}
                label="Endereço — mínimo de caracteres"
                value={regras.obrigatorio_endereco_min_chars}
              />
              <Row
                icon={Package}
                label="Quantidade mínima de produtos"
                value={regras.produto_minimo_quantidade}
              />
              <Row icon={FileText} label="Dígitos do CPF" value={regras.cpf_digitos} />
              <Row icon={FileText} label="Dígitos do CNPJ" value={regras.cnpj_digitos} />
            </CardContent>
          </Card>

          {/* Regra do Boleto */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-900/20 border-blue-500/20 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Receipt className="h-5 w-5 text-blue-300" />
                Regra do Boleto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 space-y-2">
                <p>
                  Sempre que qualquer método de pagamento for <strong className="text-blue-200">Boleto</strong>,
                  o sistema aplica automaticamente:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-white/70">
                  <li>
                    <strong className="text-white">Método 1:</strong> À Vista, com{' '}
                    <strong className="text-blue-200">{BOLETO_ENTRADA_PERCENTUAL}%</strong> do valor total
                    (entrada).
                  </li>
                  <li>
                    <strong className="text-white">Método 2:</strong> Boleto, com{' '}
                    <strong className="text-blue-200">{100 - BOLETO_ENTRADA_PERCENTUAL}%</strong> restante e
                    intervalo fixo de{' '}
                    <strong className="text-blue-200">{BOLETO_INTERVALO_DIAS} dias</strong> entre parcelas.
                  </li>
                </ul>
                <p className="text-xs text-white/50">
                  Os campos de tipo e intervalo ficam travados no formulário; a divisão dos valores é
                  recalculada automaticamente quando o total da venda muda.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MinimalistLayout>
  );
}