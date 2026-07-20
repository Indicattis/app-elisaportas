import { useState, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useConfiguracoesVendasPublicas } from '@/hooks/useConfiguracoesVendasPublicas';
import { Loader2, AlertCircle, ShieldCheck, Infinity, ChevronDown, Lock } from 'lucide-react';

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

      if (!autorizadorConfigurado || autorizadorConfigurado.ativo === false) {
        setErro(`Nenhum ${cargoLabel} ativo configurado em Regras de Vendas.`);
        return;
      }
      if (autorizadorId !== autorizadorConfigurado.user_id) {
        setErro(`Usuário autorizador não corresponde ao ${cargoLabel} configurado.`);
        return;
      }

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

  const tituloTexto = titulo ?? (tipoAutorizacao === 'master'
    ? 'Autorização do Diretor Necessária'
    : 'Autorização do Gerente Necessária');

  const excedente = percentualDesconto - limitePermitido;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden border-white/10 bg-white/5 backdrop-blur-2xl p-0 shadow-2xl rounded-3xl">
        {/* Background glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-600/10 blur-3xl" />

        <div className="relative p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 shadow-inner">
              <ShieldCheck className="h-8 w-8 text-blue-400" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {tituloTexto}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {descricao ?? (
                <span>
                  O desconto solicitado excede o limite padrão. É necessária a senha do {cargoLabel} para prosseguir.
                </span>
              )}
            </DialogDescription>
          </div>

          {/* Discount details grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Desconto Atual
              </span>
              <span className="text-xl font-semibold text-foreground">
                {percentualDesconto.toFixed(1)}%
              </span>
            </div>
            <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-4">
              <span className="block text-[10px] uppercase tracking-wider text-red-400/60 font-bold mb-1">
                Limite Permitido
              </span>
              <span className="text-xl font-semibold text-red-400">
                {limitePermitido.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Description / excess */}
          {!descricao && (
            <div className="mb-6 text-center text-sm text-muted-foreground">
              <p>
                O desconto excede o limite em{' '}
                <span className="font-bold text-foreground">{excedente.toFixed(1)}%</span>.
                {tipoAutorizacao === 'master'
                  ? ` A senha do Diretor desbloqueia qualquer percentual acima de ${limites.totalComResponsavel}%.`
                  : ` A senha do Gerente autoriza descontos de até ${limites.totalComResponsavel}%.`}
              </p>
            </div>
          )}

          {/* Master alert */}
          {tipoAutorizacao === 'master' && (
            <Alert className="mb-6 bg-red-500/10 border-red-500/30">
              <Infinity className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                A senha do Diretor desbloqueia qualquer percentual de desconto.
              </AlertDescription>
            </Alert>
          )}

          {/* Authorizer */}
          <div className="space-y-2 mb-6">
            <Label className="text-xs font-medium text-muted-foreground px-1">Quem está autorizando?</Label>
            {loadingConfig || loadingAutorizador ? (
              <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : autorizadorConfigurado && autorizadorConfigurado.ativo !== false ? (
              <div className="relative rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{autorizadorConfigurado.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {cargoLabel}
                      {autorizadorConfigurado.role ? ` · ${autorizadorConfigurado.role}` : ''}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <Alert variant="destructive" className="rounded-xl">
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

          {/* Password */}
          {!autorizadorIndisponivel && (
            <div className="space-y-2 mb-6">
              <Label htmlFor="senha" className="text-xs font-medium text-muted-foreground px-1">
                Senha do {cargoLabel} *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  className="pl-10 rounded-xl bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {erro && (
            <Alert variant="destructive" className="mb-6 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-2">
            <Button
              onClick={handleAutorizar}
              disabled={loading || !senha || !autorizadorId || autorizadorIndisponivel}
              className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
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

            <div className="flex flex-col sm:flex-row gap-3">
              {onSolicitarAprovacao && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onSolicitarAprovacao();
                    onOpenChange(false);
                  }}
                  disabled={loading}
                  className="flex-1 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                >
                  Solicitar Aprovação
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 rounded-xl border-white/10 bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
