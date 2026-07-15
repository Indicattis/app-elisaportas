import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
  titulo?: string;
  descricao?: ReactNode;
}

export function AutorizacaoDescontoModal({
  open,
  onOpenChange,
  onAutorizado,
  onSolicitarAprovacao,
  percentualDesconto,
  tipoAutorizacao,
  limitePermitido,
  titulo,
  descricao,
}: AutorizacaoDescontoModalProps) {
  const [senha, setSenha] = useState('');
  const [autorizadorId, setAutorizadorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const {
    configuracoesPublicas,
    isLoading: loadingConfig,
    limites,
    refetch: refetchConfiguracoes,
  } = useConfiguracoesVendasPublicas();

  // Resolve qual usuário autoriza a partir das Regras de Vendas:
  // - responsavel_setor (8%–15%) → Gerente (responsavel_senha_responsavel_id)
  // - master (>15%)             → Diretor (responsavel_senha_master_id)
  const autorizadorUserId =
    tipoAutorizacao === 'master'
      ? configuracoesPublicas?.responsavel_senha_master_id ?? null
      : configuracoesPublicas?.responsavel_senha_responsavel_id ?? null;

  const cargoLabel = tipoAutorizacao === 'master' ? 'Diretor' : 'Gerente';

  const { data: autorizadorConfigurado, isLoading: loadingAutorizador } = useQuery({
    queryKey: ['autorizador-desconto', tipoAutorizacao, autorizadorUserId],
    enabled: !!autorizadorUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_autorizador_vendas', {
        p_tipo: tipoAutorizacao === 'master' ? 'master' : 'responsavel',
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
  });

  const autorizadorIndisponivel =
    !loadingConfig && !loadingAutorizador &&
    (!autorizadorConfigurado || autorizadorConfigurado.ativo === false);

  useEffect(() => {
    if (open) {
      // Forçar recarregamento das configurações quando modal abre
      refetchConfiguracoes();
      setSenha('');
      setErro('');

      if (autorizadorConfigurado && autorizadorConfigurado.ativo !== false) {
        setAutorizadorId(autorizadorConfigurado.user_id);
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

      // Garantir que o autorizador resolvido bate com o configurado
      if (!autorizadorConfigurado || autorizadorConfigurado.ativo === false) {
        setErro(`Nenhum ${cargoLabel} ativo configurado em Regras de Vendas.`);
        return;
      }
      if (autorizadorId !== autorizadorConfigurado.user_id) {
        setErro(`Usuário autorizador não corresponde ao ${cargoLabel} configurado.`);
        return;
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
              {titulo ?? (tipoAutorizacao === 'master'
                ? 'Autorização do Diretor Necessária'
                : 'Autorização do Gerente Necessária')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {descricao ?? (
              <>
                O desconto de <span className="font-bold text-foreground">{percentualDesconto.toFixed(1)}%</span> excede
                o limite permitido de <span className="font-bold text-foreground">{limitePermitido.toFixed(0)}%</span> em{' '}
                <span className="font-bold text-foreground">{(percentualDesconto - limitePermitido).toFixed(1)}%</span>.
                {tipoAutorizacao === 'master'
                  ? ` É necessária a senha do Diretor (desconto acima de ${limites.totalComResponsavel}%).`
                  : ` É necessária a senha do Gerente (até ${limites.totalComResponsavel}%).`}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {tipoAutorizacao === 'master' && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <Infinity className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                A senha do Diretor desbloqueia qualquer percentual de desconto.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Quem está autorizando?</Label>
            {loadingConfig || loadingAutorizador ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : autorizadorConfigurado && autorizadorConfigurado.ativo !== false ? (
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{autorizadorConfigurado.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {cargoLabel}
                  {autorizadorConfigurado.role ? ` · ${autorizadorConfigurado.role}` : ''}
                </p>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p>
                    {autorizadorConfigurado && autorizadorConfigurado.ativo === false
                      ? `O ${cargoLabel} configurado (${autorizadorConfigurado.nome}) está desativado.`
                      : `Nenhum ${cargoLabel} configurado em Regras de Vendas.`}
                  </p>
                  <Link
                    to="/direcao/regras-vendas"
                    className="inline-block underline font-medium"
                    onClick={() => onOpenChange(false)}
                  >
                    Configurar agora →
                  </Link>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {!autorizadorIndisponivel && (
            <div className="space-y-2">
              <Label htmlFor="senha">Senha do {cargoLabel} *</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro('');
                }}
                onKeyPress={handleKeyPress}
                placeholder={`Digite a senha do ${cargoLabel}`}
                disabled={loading}
                autoFocus
              />
            </div>
          )}

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
              disabled={loading || !senha || !autorizadorId || autorizadorIndisponivel}
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
