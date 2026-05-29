import { useState, useEffect } from 'react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
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
  Key,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Shield,
  Infinity
} from 'lucide-react';
import { useConfiguracoesVendas } from '@/hooks/useConfiguracoesVendas';
import { useAllUsers } from '@/hooks/useAllUsers';

export default function RegrasVendasDirecao() {
  const { configuracoes, isLoading, limites, updateConfiguracoes, isUpdating } = useConfiguracoesVendas();
  const { data: usuarios = [] } = useAllUsers();
  
  const [senhaResponsavel, setSenhaResponsavel] = useState('');
  const [senhaMaster, setSenhaMaster] = useState('');
  const [responsavelSenhaResponsavel, setResponsavelSenhaResponsavel] = useState('');
  const [responsavelSenhaMaster, setResponsavelSenhaMaster] = useState('');
  const [showSenhaResponsavel, setShowSenhaResponsavel] = useState(false);
  const [showSenhaMaster, setShowSenhaMaster] = useState(false);
  const [senhasIguais, setSenhasIguais] = useState(false);

  // Estados editáveis dos limites de desconto
  const [limiteAvista, setLimiteAvista] = useState<number>(3);
  const [limitePresencial, setLimitePresencial] = useState<number>(5);
  const [limiteAdicionalResponsavel, setLimiteAdicionalResponsavel] = useState<number>(5);

  useEffect(() => {
    if (configuracoes) {
      setSenhaResponsavel(configuracoes.senha_responsavel || '');
      setSenhaMaster(configuracoes.senha_master || '');
      setResponsavelSenhaResponsavel(configuracoes.responsavel_senha_responsavel_id || '');
      setResponsavelSenhaMaster(configuracoes.responsavel_senha_master_id || '');
      setLimiteAvista(configuracoes.limite_desconto_avista ?? 3);
      setLimitePresencial(configuracoes.limite_desconto_presencial ?? 5);
      setLimiteAdicionalResponsavel(configuracoes.limite_adicional_responsavel ?? 5);
    }
  }, [configuracoes]);

  useEffect(() => {
    setSenhasIguais(senhaResponsavel === senhaMaster && senhaResponsavel.length > 0);
  }, [senhaResponsavel, senhaMaster]);

  const handleSalvarSenhas = () => {
    if (senhasIguais) return;
    
    updateConfiguracoes({
      senha_responsavel: senhaResponsavel,
      senha_master: senhaMaster,
      responsavel_senha_responsavel_id: responsavelSenhaResponsavel || null,
      responsavel_senha_master_id: responsavelSenhaMaster || null,
    });
  };

  const handleSalvarLimites = () => {
    updateConfiguracoes({
      limite_desconto_avista: limiteAvista,
      limite_desconto_presencial: limitePresencial,
      limite_adicional_responsavel: limiteAdicionalResponsavel,
    });
  };

  const hasLimitesChanges = configuracoes && (
    limiteAvista !== (configuracoes.limite_desconto_avista ?? 3) ||
    limitePresencial !== (configuracoes.limite_desconto_presencial ?? 5) ||
    limiteAdicionalResponsavel !== (configuracoes.limite_adicional_responsavel ?? 5)
  );

  const hasChanges = configuracoes && (
    senhaResponsavel !== configuracoes.senha_responsavel ||
    senhaMaster !== configuracoes.senha_master ||
    responsavelSenhaResponsavel !== (configuracoes.responsavel_senha_responsavel_id || '') ||
    responsavelSenhaMaster !== (configuracoes.responsavel_senha_master_id || '')
  );

  return (
    <MinimalistLayout
      title="Regras de Vendas"
      subtitle="Manual do sistema de vendas"
      backPath="/direcao/estrategia/precos"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Tabela de Preços', path: '/direcao/estrategia/precos' },
        { label: 'Regras de Vendas' }
      ]}
    >
      <div className="space-y-6">
        {/* Seção de Gerenciamento de Senhas */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-900/20 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <Key className="h-5 w-5 text-amber-400" />
              Gerenciamento de Senhas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Senha do Responsável */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      <h4 className="text-sm font-medium text-white">Senha do Responsável</h4>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                        +{limites.adicionalResponsavel}%
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50">
                      Libera até {limites.totalComResponsavel}% de desconto
                    </p>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-white/70">Senha</Label>
                      <div className="relative">
                        <Input
                          type={showSenhaResponsavel ? 'text' : 'password'}
                          value={senhaResponsavel}
                          onChange={(e) => setSenhaResponsavel(e.target.value)}
                          className="pr-10 bg-white/5 border-white/20 text-white"
                          placeholder="Digite a senha"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSenhaResponsavel(!showSenhaResponsavel)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        >
                          {showSenhaResponsavel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-white/70">Responsável (opcional)</Label>
                      <Select
                        value={responsavelSenhaResponsavel || '__none__'}
                        onValueChange={(value) => setResponsavelSenhaResponsavel(value === '__none__' ? '' : value)}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Selecionar responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {usuarios.filter(user => user.user_id).map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Senha Master */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-red-400" />
                      <h4 className="text-sm font-medium text-white">Senha Master</h4>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] flex items-center gap-1">
                        <Infinity className="h-3 w-3" />
                        Sem limite
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50">
                      Desbloqueia qualquer percentual de desconto
                    </p>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-white/70">Senha</Label>
                      <div className="relative">
                        <Input
                          type={showSenhaMaster ? 'text' : 'password'}
                          value={senhaMaster}
                          onChange={(e) => setSenhaMaster(e.target.value)}
                          className="pr-10 bg-white/5 border-white/20 text-white"
                          placeholder="Digite a senha master"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSenhaMaster(!showSenhaMaster)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        >
                          {showSenhaMaster ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-white/70">Responsável (opcional)</Label>
                      <Select
                        value={responsavelSenhaMaster || '__none__'}
                        onValueChange={(value) => setResponsavelSenhaMaster(value === '__none__' ? '' : value)}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Selecionar responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {usuarios.filter(user => user.user_id).map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {senhasIguais && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-300">
                      As senhas do responsável e master devem ser diferentes!
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSalvarSenhas}
                    disabled={isUpdating || senhasIguais || !hasChanges}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Seção de Descontos */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-900/20 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <Percent className="h-5 w-5 text-blue-400" />
              Regras de Desconto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Limites editáveis */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Banknote className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-white/80 text-sm truncate">Pagamento à vista (não cartão)</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-white/60 text-sm">+</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={limiteAvista}
                    onChange={(e) => setLimiteAvista(Number(e.target.value) || 0)}
                    className="w-20 h-8 bg-white/5 border-white/20 text-white text-right"
                  />
                  <span className="text-white/60 text-sm">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <User className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="text-white/80 text-sm truncate">Venda presencial</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-white/60 text-sm">+</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={limitePresencial}
                    onChange={(e) => setLimitePresencial(Number(e.target.value) || 0)}
                    className="w-20 h-8 bg-white/5 border-white/20 text-white text-right"
                  />
                  <span className="text-white/60 text-sm">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-white/80 text-sm truncate">Adicional com senha do responsável</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-white/60 text-sm">+</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={limiteAdicionalResponsavel}
                    onChange={(e) => setLimiteAdicionalResponsavel(Number(e.target.value) || 0)}
                    className="w-20 h-8 bg-white/5 border-white/20 text-white text-right"
                  />
                  <span className="text-white/60 text-sm">%</span>
                </div>
              </div>
            </div>

            {/* Totais calculados (read-only) */}
            <div className="grid gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-white/80 text-sm">Limite sem autorização</span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {(limiteAvista + limitePresencial).toFixed(1)}%
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <span className="text-white font-medium text-sm">Limite máximo com responsável</span>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {(limiteAvista + limitePresencial + limiteAdicionalResponsavel).toFixed(1)}%
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-red-400" />
                  <span className="text-white font-medium text-sm">Com senha master</span>
                </div>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
                  <Infinity className="h-3 w-3" />
                  Sem limite
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Descontos acima de {(limiteAvista + limitePresencial + limiteAdicionalResponsavel).toFixed(1)}% requerem senha master. Apenas a senha master desbloqueia qualquer percentual.
                </span>
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSalvarLimites}
                disabled={isUpdating || !hasLimitesChanges}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Limites
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Acréscimos */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-900/20 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <PlusCircle className="h-5 w-5 text-green-400" />
              Regras de Acréscimo (Crédito)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5" />
                <p className="text-white/80 text-sm">
                  O acréscimo (crédito) adiciona valor ao total da venda, aumentando a margem.
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
            </div>
          </CardContent>
        </Card>

        {/* Seção de Formas de Pagamento */}
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
                  <div className="space-y-2 pl-6">
                    <p className="text-sm">Permite parcelamento com intervalos customizáveis entre parcelas:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[7, 15, 21, 28, 30, 45, 60].map(dias => (
                        <Badge key={dias} variant="outline" className="text-white/60 border-white/20">
                          {dias} dias
                        </Badge>
                      ))}
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
                      <span>Requer upload de comprovante de pagamento</span>
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
                    <p className="text-sm">Permite parcelamento de 1 a 12 vezes.</p>
                    <p className="text-sm text-amber-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Não habilita desconto por pagamento à vista.</span>
                    </p>
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
                    <p className="text-sm">Sem parâmetros adicionais necessários.</p>
                    <p className="text-sm">Habilita desconto de até {limites.avista}% por pagamento à vista.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Seção de Campos Obrigatórios */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-900/20 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-amber-400" />
              Campos Obrigatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Dados do Cliente */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-400" />
                  Dados do Cliente
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span>Nome do cliente</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span>Telefone</span>
                  </div>
                </div>
              </div>
              
              {/* Localização */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-400" />
                  Localização
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span>Estado</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span>Cidade</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span>CEP</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span>Bairro (mínimo 2 caracteres)</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span>Endereço (mínimo 2 caracteres)</span>
                  </div>
                </div>
              </div>
              
              {/* Produtos */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-400" />
                  Produtos
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    <span>Mínimo 1 produto na venda</span>
                  </div>
                </div>
              </div>
              
              {/* Documentos */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-400" />
                  Documentos (Opcional)
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span>CPF: 11 dígitos (se informado)</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span>CNPJ: 14 dígitos (se informado)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MinimalistLayout>
  );
}
