import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useConfiguracoesVendas } from '@/hooks/useConfiguracoesVendas';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

interface VerificacaoLiderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSenhaCorreta: () => void;
  percentualDesconto: number;
}

export function VerificacaoLiderModal({
  open,
  onOpenChange,
  onSenhaCorreta,
  percentualDesconto
}: VerificacaoLiderModalProps) {
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [liderNome, setLiderNome] = useState('');
  
  const { configuracoes, isLoading: loadingConfig } = useConfiguracoesVendas();

  useEffect(() => {
    if (open) {
      fetchLiderVendas();
      setSenha('');
      setErro('');
    }
  }, [open]);

  const fetchLiderVendas = async () => {
    try {
      const { data: setorData, error: setorError } = await supabase
        .from('setores_lideres')
        .select('lider_id')
        .eq('setor', 'vendas')
        .maybeSingle();

      if (setorError) {
        console.error('Erro ao buscar setor líder:', setorError);
        return;
      }
      
      if (!setorData) {
        console.log('Nenhum líder de vendas configurado');
        return;
      }
      
      const { data: userData, error: userError } = await supabase
        .from('admin_users')
        .select('nome')
        .eq('user_id', setorData.lider_id)
        .maybeSingle();
      
      if (userError) {
        console.error('Erro ao buscar dados do usuário:', userError);
        return;
      }
      
      if (userData) {
        setLiderNome(userData.nome);
      }
    } catch (error) {
      console.error('Erro ao buscar líder de vendas:', error);
    }
  };

  const handleVerificarSenha = async () => {
    if (!senha.trim()) {
      setErro('Digite a senha');
      return;
    }

    if (loadingConfig || !configuracoes) {
      setErro('Carregando configurações...');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      // Buscar o líder do setor de vendas
      const { data: setorData, error: setorError } = await supabase
        .from('setores_lideres')
        .select('lider_id')
        .eq('setor', 'vendas')
        .maybeSingle();

      if (setorError) {
        console.error('Erro ao buscar setor:', setorError);
        setErro('Erro ao buscar líder do setor');
        return;
      }

      if (!setorData) {
        setErro('Líder do setor de vendas não encontrado. Configure em Configurações → Setores e Líderes.');
        return;
      }

      // Buscar dados do usuário líder
      const { data: userData, error: userError } = await supabase
        .from('admin_users')
        .select('user_id, nome, role')
        .eq('user_id', setorData.lider_id)
        .maybeSingle();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        setErro('Erro ao buscar informações do líder');
        return;
      }

      if (!userData) {
        setErro('Usuário líder não encontrado ou inativo');
        return;
      }

      // Verificar senha usando a configuração do banco
      if (senha === configuracoes.senha_responsavel) {
        onSenhaCorreta();
        onOpenChange(false);
      } else {
        setErro('Senha incorreta');
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      setErro('Erro ao verificar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleVerificarSenha();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-6 w-6 text-amber-500" />
            <DialogTitle>Autorização Necessária</DialogTitle>
          </div>
          <DialogDescription>
            O desconto de <span className="font-bold text-foreground">{percentualDesconto.toFixed(1)}%</span> excede 
            o limite permitido. É necessária a senha do líder de vendas para aprovar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {liderNome && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Líder responsável:</p>
              <p className="font-semibold">{liderNome}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="senha">Senha do Líder *</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="Digite a senha"
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleVerificarSenha}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
