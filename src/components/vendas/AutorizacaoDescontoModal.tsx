import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLiderVendas } from '@/hooks/useLiderVendas';
import { useConfiguracoesVendasPublicas } from '@/hooks/useConfiguracoesVendasPublicas';
import { Loader2, AlertCircle, ShieldCheck, Infinity } from 'lucide-react';

interface AutorizacaoDescontoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAutorizado: (autorizadorId: string, senhaDigitada: string) => void;
  onSolicitarAprovacao?: () => void;
  percentualDesconto: number;
  tipoAutorizacao: 'responsavel_setor' | 'master';
  limitePermitido: number;
}

export function AutorizacaoDescontoModal({
  open,
  onOpenChange,
  onAutorizado,
  onSolicitarAprovacao,
  percentualDesconto,
  tipoAutorizacao,
  limitePermitido
}: AutorizacaoDescontoModalProps) {
  const [senha, setSenha] = useState('');
  const [autorizadorId, setAutorizadorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  
  const { data: liderVendas, isLoading: loadingLider } = useLiderVendas();
  const {
    configuracoesPublicas,
    isLoading: loadingConfig,
    limites,
    refetch: refetchConfiguracoes,
  } = useConfiguracoesVendasPublicas();

  // Buscar o responsável master direto (sem filtrar por ativo/visivel_organograma)
  const masterId = configuracoesPublicas?.responsavel_senha_master_id ?? null;
  const { data: responsavelMaster, isLoading: loadingMaster } = useQuery({
    queryKey: ['responsavel-senha-master', masterId],
    enabled: !!masterId && tipoAutorizacao === 'master',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id, nome, role')
        .eq('user_id', masterId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Obter o autorizador configurado (não permite seleção manual)
  const autorizadorConfigurado = useMemo(() => {
    if (tipoAutorizacao === 'responsavel_setor') {
      if (liderVendas) {
        return {
          id: liderVendas.user_id,
          nome: liderVendas.nome,
          role: liderVendas.role
        };
      }
      return null;
    }

    // Para master, usar o responsável buscado direto
    if (responsavelMaster) {
      return {
        id: responsavelMaster.user_id,
        nome: responsavelMaster.nome,
        role: responsavelMaster.role,
      };
    }
    return null;
  }, [tipoAutorizacao, liderVendas, responsavelMaster]);

  useEffect(() => {
    if (open) {
      // Forçar recarregamento das configurações quando modal abre
      refetchConfiguracoes();
      setSenha('');
      setErro('');
      
      // Auto-definir o autorizador configurado
      if (autorizadorConfigurado) {
        setAutorizadorId(autorizadorConfigurado.id);
      } else {
        setAutorizadorId('');
      }
    }
  }, [open, autorizadorConfigurado, refetchConfiguracoes]);

  const handleAutorizar = async () => {
    if (!senha.trim()) {
      setErro(tipoAutorizacao === 'master' ? 'Digite a senha master' : 'Digite a senha do responsável');
      return;
    }

    if (!autorizadorId) {
      setErro('Selecione o usuário autorizador');
      return;
    }

    if (loadingConfig || !configuracoesPublicas) {
      setErro('Carregando configurações...');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      // Validar senha via RPC SECURITY DEFINER (não expõe senhas ao cliente)
      const { data: senhaValida, error: rpcError } = await supabase.rpc(
        'verificar_senha_vendas',
        {
          p_senha: senha,
          p_tipo: tipoAutorizacao === 'master' ? 'master' : 'responsavel',
        }
      );

      if (rpcError) {
        console.error('Erro ao validar senha:', rpcError);
        setErro('Erro ao validar senha. Tente novamente.');
        return;
      }

      if (senhaValida !== true) {
        setErro('Senha incorreta');
        return;
      }

      // Validar usuário para senha do responsável
      if (tipoAutorizacao === 'responsavel_setor') {
        if (!liderVendas) {
          setErro('Nenhum líder de vendas configurado no sistema');
          return;
        }
        if (autorizadorId !== liderVendas.user_id) {
          setErro('Usuário selecionado não é o líder de vendas');
          return;
        }
      }

      // Senha correta, prosseguir devolvendo a senha digitada para auditoria
      onAutorizado(autorizadorId, senha);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao autorizar desconto:', error);
      setErro('Erro ao processar autorização. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && senha && autorizadorId) {
      handleAutorizar();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-6 w-6 text-amber-500" />
            <DialogTitle>
              {tipoAutorizacao === 'master' ? 'Autorização Master Necessária' : 'Autorização do Responsável Necessária'}
            </DialogTitle>
          </div>
          <DialogDescription>
            O desconto de <span className="font-bold text-foreground">{percentualDesconto.toFixed(1)}%</span> excede 
            o limite permitido de <span className="font-bold text-foreground">{limitePermitido.toFixed(0)}%</span> em{' '}
            <span className="font-bold text-foreground">{(percentualDesconto - limitePermitido).toFixed(1)}%</span>.
            {tipoAutorizacao === 'master' 
              ? ` É necessária a senha master (desconto acima de ${limites.totalComResponsavel}%).`
              : ` É necessária a senha do responsável (até ${limites.totalComResponsavel}%).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {tipoAutorizacao === 'responsavel_setor' && !liderVendas && !loadingLider && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum líder de vendas configurado. Configure um líder em Configurações → Setores e Líderes.
              </AlertDescription>
            </Alert>
          )}

          {tipoAutorizacao === 'master' && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <Infinity className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                A senha master desbloqueia qualquer percentual de desconto.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Quem está autorizando?</Label>
            {loadingLider || loadingMaster ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : autorizadorConfigurado ? (
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{autorizadorConfigurado.nome}</p>
                <p className="text-xs text-muted-foreground">{autorizadorConfigurado.role}</p>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {tipoAutorizacao === 'master' 
                    ? 'Nenhum responsável configurado para senha master. Configure em Regras de Vendas.'
                    : 'Nenhum líder de vendas configurado. Configure em Setores e Líderes.'}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">
              {tipoAutorizacao === 'master' ? 'Senha Master *' : 'Senha do Responsável *'}
            </Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro('');
              }}
              onKeyPress={handleKeyPress}
              placeholder={tipoAutorizacao === 'master' ? 'Digite a senha master' : 'Digite a senha do responsável'}
              disabled={loading}
              autoFocus
            />
          </div>

          {erro && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onSolicitarAprovacao && (
            <Button
              variant="outline"
              onClick={() => {
                onSolicitarAprovacao();
                onOpenChange(false);
              }}
              disabled={loading}
              className="w-full sm:w-auto border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
            >
              Solicitar Aprovação
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAutorizar}
              disabled={loading || !senha || !autorizadorId}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Autorizar'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
