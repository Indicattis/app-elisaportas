import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ConversoesMeta() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const now = new Date();
  const [mes, setMes] = useState<number | 'all'>(now.getMonth());
  const [ano, setAno] = useState<number | 'all'>(now.getFullYear());
  const [copiedCol, setCopiedCol] = useState<string | null>(null);
  const todoTempo = mes === 'all' || ano === 'all';

  const dataInicio = !todoTempo ? format(startOfMonth(new Date(ano as number, mes as number)), 'yyyy-MM-dd') : null;
  const dataFim = !todoTempo ? format(endOfMonth(new Date(ano as number, mes as number)), 'yyyy-MM-dd') : null;

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['conversoes-meta', mes, ano],
    queryFn: async () => {
      let query = supabase
        .from('vendas')
        .select('cliente_email, cliente_telefone')
        .eq('is_rascunho', false);
      if (dataInicio && dataFim) {
        query = query.gte('data_venda', dataInicio).lte('data_venda', dataFim);
      }
      const { data, error } = await query.order('data_venda', { ascending: true });
      if (error) throw error;

      const cleanPhone = (t: string | null) => {
        if (!t) return '';
        const cleaned = t.replace(/[\s\-\(\)]/g, '');
        return cleaned.startsWith('+') ? cleaned : `+55${cleaned}`;
      };

      const seen = new Set<string>();
      const unique = (data || []).filter(v => {
        const phone = cleanPhone(v.cliente_telefone);
        if (!phone || phone === '+55' || seen.has(phone)) return false;
        seen.add(phone);
        return true;
      }).map(v => ({ ...v, cliente_telefone: cleanPhone(v.cliente_telefone) }));
      return unique;
    },
  });

  const handleCopyColumn = async (col: 'email' | 'phone') => {
    const values = vendas.map(v =>
      col === 'email' ? (v.cliente_email || '') : (v.cliente_telefone || '')
    );
    await navigator.clipboard.writeText(values.join('\n'));
    setCopiedCol(col);
    const labels = { email: 'E-mails', phone: 'Telefones' };
    toast({ title: 'Copiado!', description: `${values.length} ${labels[col]} copiados.` });
    setTimeout(() => setCopiedCol(null), 2000);
  };

  const handleCopyAll = async () => {
    const lines = vendas.map(v => `${v.cliente_email || ''},${v.cliente_telefone || ''}`);
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedCol('all');
    toast({ title: 'Copiado!', description: `${vendas.length} registros copiados.` });
    setTimeout(() => setCopiedCol(null), 2000);
  };

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Marketing', path: '/marketing' },
          { label: 'Conversões Meta' },
        ]}
        mounted
      />
      <button
        onClick={() => navigate('/marketing')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 min-h-screen flex flex-col items-center pt-20 px-6 pb-10">
        <h1 className="text-2xl font-bold text-white mb-2">Conversões Meta</h1>
        <p className="text-white/60 text-sm mb-6">Dados de vendas para importação no Meta Ads</p>

        {/* Filtros */}
        <div className="flex gap-3 mb-6 items-center">
          <Select value={String(mes)} onValueChange={v => setMes(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o tempo</SelectItem>
              {meses.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {mes !== 'all' && (
            <Select value={String(ano)} onValueChange={v => setAno(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-[100px] bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map(a => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Contador */}
        <p className="text-white/50 text-xs mb-4">
          {isLoading ? 'Carregando...' : `${vendas.length} conversão(ões)${todoTempo ? ' no total' : ` em ${meses[mes as number]} ${ano}`}`}
        </p>

        {/* Botão Copiar Tudo */}
        <button
          onClick={handleCopyAll}
          disabled={vendas.length === 0}
          className="mb-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 text-sm"
        >
          {copiedCol === 'all' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          Copiar tudo
        </button>

        {/* Tabela */}
        <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/70">
                  <button onClick={() => handleCopyColumn('email')} disabled={vendas.length === 0} className="flex items-center gap-1.5 hover:text-white transition-colors disabled:opacity-40">
                    email {copiedCol === 'email' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 opacity-50" />}
                  </button>
                </TableHead>
                <TableHead className="text-white/70">
                  <button onClick={() => handleCopyColumn('phone')} disabled={vendas.length === 0} className="flex items-center gap-1.5 hover:text-white transition-colors disabled:opacity-40">
                    phone {copiedCol === 'phone' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 opacity-50" />}
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={2} className="text-center text-white/40 py-8">Carregando...</TableCell>
                </TableRow>
              ) : vendas.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={2} className="text-center text-white/40 py-8">Nenhuma conversão neste mês</TableCell>
                </TableRow>
              ) : (
                vendas.map((v, i) => (
                  <TableRow key={i} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/90">{v.cliente_email || '-'}</TableCell>
                    <TableCell className="text-white/90">{v.cliente_telefone || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
