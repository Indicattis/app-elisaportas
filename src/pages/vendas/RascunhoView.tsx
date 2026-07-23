import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useVendas } from '@/hooks/useVendas';
import { ArrowRight, Trash2, User, MapPin, Package, CreditCard, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFormaPagamentoLabel } from '@/utils/formatters';

const sectionWrapperClass =
  'p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10';
const labelClass = 'text-xs font-semibold text-white/60 uppercase tracking-wider';

const currency = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(v || 0)
  );

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className={sectionWrapperClass}>
      <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-white tracking-wide">
            {title}
          </h3>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className={labelClass}>{label}</p>
      <p className="text-sm text-white">{value ?? '—'}</p>
    </div>
  );
}

export default function RascunhoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteVenda, isDeleting } = useVendas();

  const { data: venda, isLoading } = useQuery({
    queryKey: ['rascunho-view', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select(
          '*, produtos_vendas(*, cor:catalogo_cores(nome, codigo_hex)), venda_comprovantes(id, nome, url)'
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const produtos = useMemo(
    () => (venda?.produtos_vendas || []).filter((p: any) => p.tipo_produto !== 'instalacao'),
    [venda]
  );
  const snap = venda?.rascunho_pagamento as any;

  if (isLoading) {
    return (
      <MinimalistLayout title="Rascunho">
        <div className="text-center py-8 text-white/60">Carregando rascunho...</div>
      </MinimalistLayout>
    );
  }

  if (!venda) {
    return (
      <MinimalistLayout title="Rascunho">
        <div className="text-center py-8 text-white/60">Rascunho não encontrado.</div>
      </MinimalistLayout>
    );
  }

  if (venda.is_rascunho === false) {
    // Já foi convertido — redireciona para a venda.
    navigate(`/vendas/minhas-vendas/${venda.id}`, { replace: true });
    return null;
  }

  return (
    <MinimalistLayout
      title="Rascunho de Venda"
      subtitle={`Criado em ${venda.created_at ? format(new Date(venda.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : '—'}`}
      backPath="/vendas/minhas-vendas"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Vendas', path: '/vendas' },
        { label: 'Minhas Vendas', path: '/vendas/minhas-vendas' },
        { label: 'Rascunho' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Rascunho — regras de venda ainda não aplicadas
          </Badge>
          <p className="text-xs text-white/60">
            Para efetivar como venda, clique em "Transformar em Venda" — o sistema irá validar descontos, senhas, regras de pagamento e comprovantes.
          </p>
        </div>

        <Section title="Cliente" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Nome" value={venda.cliente_nome} />
            <Field label="Telefone" value={venda.cliente_telefone} />
            <Field label="E-mail" value={venda.cliente_email} />
            <Field label="CPF/CNPJ" value={venda.cpf_cliente} />
            <Field label="Canal" value={venda.publico_alvo} />
          </div>
        </Section>

        <Section title="Localização" icon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Estado" value={venda.estado} />
            <Field label="Cidade" value={venda.cidade} />
            <Field label="CEP" value={venda.cep} />
            <Field label="Bairro" value={venda.bairro} />
            <Field label="Endereço" value={venda.endereco} />
          </div>
        </Section>

        <Section title="Produtos" icon={Package}>
          {produtos.length === 0 ? (
            <p className="text-sm text-white/60">Nenhum produto neste rascunho.</p>
          ) : (
            <div className="space-y-2">
              {produtos.map((p: any) => (
                <div
                  key={p.id}
                  className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="md:col-span-2">
                    <p className="text-sm text-white font-medium">
                      {p.descricao || p.tipo_produto}
                    </p>
                    <p className="text-xs text-white/50">{p.tipo_produto}</p>
                  </div>
                  <Field label="Dimensões" value={p.tamanho || `${p.largura || 0} x ${p.altura || 0}`} />
                  <Field label="Cor" value={p.cor?.nome} />
                  <Field label="Qtd" value={p.quantidade} />
                  <Field
                    label="Valor"
                    value={currency(
                      (Number(p.valor_produto || 0) +
                        Number(p.valor_pintura || 0) +
                        Number(p.valor_instalacao || 0)) *
                        Number(p.quantidade || 1) -
                        Number(p.desconto_valor || 0)
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Pagamento" icon={CreditCard}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Field label="Método principal" value={getFormaPagamentoLabel(venda.metodo_pagamento || '')} />
            <Field label="Entrada" value={currency(venda.valor_entrada)} />
            <Field label="A receber" value={currency(venda.valor_a_receber)} />
            <Field label="Frete" value={currency(venda.valor_frete)} />
            <Field label="Crédito" value={currency(venda.valor_credito)} />
            <Field label="Total" value={<span className="text-blue-300 font-semibold">{currency(venda.valor_venda)}</span>} />
          </div>
          {snap?.metodos && Array.isArray(snap.metodos) && (
            <div className="space-y-2 mt-2">
              <p className={labelClass}>Métodos capturados no rascunho</p>
              {snap.metodos
                .filter((m: any) => m?.tipo)
                .map((m: any, i: number) => (
                  <div key={i} className="flex flex-wrap gap-4 p-2 rounded-md bg-white/5 border border-white/10 text-xs text-white/80">
                    <span>{getFormaPagamentoLabel(m.tipo)}</span>
                    <span>Valor: {currency(m.valor)}</span>
                    {m.parcelas_boleto > 1 && <span>Parcelas: {m.parcelas_boleto}</span>}
                    {m.parcelas_cartao > 1 && <span>Parcelas cartão: {m.parcelas_cartao}</span>}
                    {m.ja_pago && <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Já pago</Badge>}
                  </div>
                ))}
            </div>
          )}
        </Section>

        {venda.venda_comprovantes && venda.venda_comprovantes.length > 0 && (
          <Section title="Comprovantes anexados" icon={FileText}>
            <ul className="space-y-2 text-sm text-white/80">
              {venda.venda_comprovantes.map((c: any) => (
                <li key={c.id}>
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline">
                    {c.nome}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {venda.justificativa_desconto && (
          <Section title="Justificativa do desconto" icon={FileText}>
            <p className="text-sm text-white/80 whitespace-pre-wrap">
              {venda.justificativa_desconto}
            </p>
          </Section>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/vendas/minhas-vendas')}
          >
            Voltar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir rascunho
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir rascunho?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O rascunho será excluído permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await deleteVenda(venda.id);
                      navigate('/vendas/minhas-vendas');
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white"
            onClick={() => navigate(`/vendas/minhas-vendas/nova?rascunhoId=${venda.id}`)}
          >
            Transformar em Venda
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </MinimalistLayout>
  );
}