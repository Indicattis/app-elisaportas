import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users, Phone, Mail, Target, Star, Triangle, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { NovoClienteMinimalistaModal } from '@/components/clientes/NovoClienteMinimalistaModal';
import { DelegarClienteModal } from '@/components/clientes/DelegarClienteModal';

const META_CR = 500;

export default function MeusClientes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [delegarCliente, setDelegarCliente] = useState<{ id: string; nome: string } | null>(null);

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['meus-clientes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nome,
          telefone,
          email,
          cidade,
          estado,
          created_at,
          cpf_cnpj,
          tipo_cliente,
          fidelizado,
          parceiro
        `)
        .eq('created_by', user.id)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Calcular estatísticas de CR
  const estatisticasCR = useMemo(() => {
    const total = clientes?.length || 0;
    const totalCR = clientes?.filter(c => c.tipo_cliente === 'CR').length || 0;
    const percentual = META_CR > 0 ? (totalCR / META_CR) * 100 : 0;
    return { total, totalCR, percentual };
  }, [clientes]);

  const clientesFiltrados = clientes?.filter(cliente => 
    cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
    cliente.cpf_cnpj?.includes(busca) ||
    cliente.telefone?.includes(busca)
  ) || [];

  return (
    <MinimalistLayout 
      title="Meus Clientes" 
      subtitle={`${clientesFiltrados.length} cliente${clientesFiltrados.length !== 1 ? 's' : ''}`}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Vendas", path: "/vendas" },
        { label: "Meus Clientes" }
      ]}
      headerActions={
        <Button 
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      }
    >
      {/* Card de Meta CR */}
      <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
        <div className="p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Meta de Clientes CR</h3>
                <p className="text-xs text-white/50">Clientes Recorrentes</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">{estatisticasCR.totalCR}</span>
              <span className="text-white/40 text-lg">/{META_CR}</span>
            </div>
          </div>
          <Progress 
            value={Math.min(estatisticasCR.percentual, 100)} 
            className="h-2.5" 
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-white/60">
              {estatisticasCR.percentual.toFixed(1)}% da meta
            </p>
            <p className="text-sm text-white/40">
              {estatisticasCR.total} clientes no total
            </p>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input 
          placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 bg-primary/5 border-primary/10 text-white placeholder:text-white/40"
        />
      </div>

      {/* Lista de clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 bg-white/5" />
          ))
        ) : clientesFiltrados.length > 0 ? (
          clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => navigate(`/vendas/meus-clientes/${cliente.id}`)}
              className="bg-primary/5 border border-primary/10 rounded-xl p-4 backdrop-blur-xl
                         hover:bg-primary/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-white font-medium truncate">{cliente.nome}</h3>
                    {cliente.fidelizado && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                    {cliente.parceiro && <Triangle className="h-3.5 w-3.5 text-purple-500 fill-purple-500 shrink-0" />}
                  </div>
                  {cliente.cpf_cnpj && (
                    <p className="text-xs text-white/50 font-mono">{cliente.cpf_cnpj}</p>
                  )}
                  
                  <div className="mt-2 space-y-1">
                    {cliente.telefone && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{cliente.telefone}</span>
                      </div>
                    )}
                    {cliente.email && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{cliente.email}</span>
                      </div>
                    )}
                  </div>
                  
                  {(cliente.cidade || cliente.estado) && (
                    <p className="text-xs text-white/40 mt-2">
                      {[cliente.cidade, cliente.estado].filter(Boolean).join(' - ')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDelegarCliente({ id: cliente.id, nome: cliente.nome });
                  }}
                  className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                  title="Delegar cliente"
                >
                  <UserCheck className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {busca ? 'Nenhum cliente encontrado' : 'Você ainda não tem clientes'}
            </p>
            <Button 
              onClick={() => setModalOpen(true)}
              variant="outline"
              className="mt-4 border-white/20 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar cliente
            </Button>
          </div>
        )}
      </div>

      {/* Modal de novo cliente */}
      <NovoClienteMinimalistaModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
      />

      {delegarCliente && (
        <DelegarClienteModal
          open={!!delegarCliente}
          onOpenChange={(open) => !open && setDelegarCliente(null)}
          clienteId={delegarCliente.id}
          clienteNome={delegarCliente.nome}
        />
      )}
    </MinimalistLayout>
  );
}
