import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RegistroCadastro {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  created_at: string;
  created_by: string | null;
  admin_users: { nome: string | null } | null;
}

const PAGE_SIZE = 20;

export function HistoricoCadastrosAutorizados() {
  const [registros, setRegistros] = useState<RegistroCadastro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('autorizados')
        .select('id, nome, cidade, estado, created_at, created_by, admin_users:created_by(nome)')
        .order('created_at', { ascending: false });
      if (cancelado) return;
      if (error) {
        console.error('Erro ao buscar histórico de autorizados:', error);
        setRegistros([]);
      } else {
        setRegistros((data as unknown as RegistroCadastro[]) || []);
      }
      setLoading(false);
    })();
    return () => { cancelado = true; };
  }, []);

  const filtrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return registros;
    return registros.filter(r => r.nome?.toLowerCase().includes(termo));
  }, [registros, search]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaAtual = Math.min(page, totalPaginas);
  const inicio = (paginaAtual - 1) * PAGE_SIZE;
  const pageItems = filtrados.slice(inicio, inicio + PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-medium text-white/70">Histórico de Cadastros</h2>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
          <span className="text-xs font-bold text-blue-400">{filtrados.length}</span>
          <span className="text-xs text-white/40">autorizado{filtrados.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do autorizado..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <UserPlus className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-sm">Nenhum cadastro encontrado</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-white/50 border-b border-white/10">
                    <th className="font-medium py-2 px-3">Autorizado</th>
                    <th className="font-medium py-2 px-3">Data de cadastro</th>
                    <th className="font-medium py-2 px-3">Cadastrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-white font-medium">{r.nome}</div>
                        {(r.cidade || r.estado) && (
                          <div className="text-xs text-white/40">
                            {[r.cidade, r.estado].filter(Boolean).join(' / ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-white/70">
                        {r.created_at
                          ? format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-white/70">
                        {r.admin_users?.nome ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10">
                <span className="text-xs text-white/40">
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/60 hover:bg-white/10"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/60 hover:bg-white/10"
                    onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}