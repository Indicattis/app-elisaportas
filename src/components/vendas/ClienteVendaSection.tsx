import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, X, AlertTriangle, Check, User } from 'lucide-react';
import { useSearchClientes, useCheckClienteDuplicado, Cliente } from '@/hooks/useClientes';
import { useCanaisAquisicao } from '@/hooks/useCanaisAquisicao';
import { ESTADOS_BRASIL, getCidadesPorEstado } from '@/utils/estadosCidades';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface DadosCliente {
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string;
  cpf_cliente: string;
  estado: string;
  cidade: string;
  cep: string;
  endereco: string;
  numero?: string;
  bairro: string;
  canal_aquisicao_id: string;
  publico_alvo: string;
}

interface ClienteVendaSectionProps {
  dados: DadosCliente;
  onChange: (dados: Partial<DadosCliente>) => void;
  onClienteSelecionado?: (cliente: Cliente | null) => void;
  disabled?: boolean;
  initialClienteId?: string;
}

export function ClienteVendaSection({ dados, onChange, onClienteSelecionado, disabled = false, initialClienteId }: ClienteVendaSectionProps) {
  const [modo, setModo] = useState<'buscar' | 'cadastrar'>('buscar');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [cpfParaVerificar, setCpfParaVerificar] = useState('');
  const [hydratedInitial, setHydratedInitial] = useState(false);

  const { data: clientesBusca = [], isLoading: buscando } = useSearchClientes(searchTerm);
  const { data: clienteDuplicado } = useCheckClienteDuplicado(cpfParaVerificar);
  const { canais } = useCanaisAquisicao();

  const cidades = dados.estado ? getCidadesPorEstado(dados.estado) : [];

  // Hidratação inicial: quando o pai fornece um cliente_id (ex: conversão de rascunho),
  // busca o cliente e marca como selecionado, sem sobrescrever os dados já preenchidos.
  useEffect(() => {
    if (hydratedInitial) return;
    if (clienteSelecionado) return;
    if (initialClienteId) {
      (async () => {
        const { data } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', initialClienteId)
          .maybeSingle();
        if (data) {
          setClienteSelecionado(data as Cliente);
          setModo('buscar');
        } else if (dados.cliente_nome) {
          setModo('cadastrar');
        }
        setHydratedInitial(true);
      })();
    } else if (dados.cliente_nome) {
      // Cliente foi cadastrado inline no rascunho (sem cliente_id): abrir em modo cadastrar
      setModo('cadastrar');
      setHydratedInitial(true);
    }
  }, [initialClienteId, dados.cliente_nome, hydratedInitial, clienteSelecionado]);

  // Classes minimalistas
  const cardClass = "bg-white/5 border-white/10 backdrop-blur-xl";
  const labelClass = "text-xs font-medium text-white/70";
  const inputClass = "h-9 bg-white/5 border-white/10 text-white placeholder:text-white/40";

  // Quando seleciona um cliente existente, preenche os dados
  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setSearchOpen(false);
    setSearchTerm('');

    // Extrai número: usa a coluna dedicada se existir; senão parseia "Rua X, 123"
    const clienteAny = cliente as any;
    let numero = clienteAny.numero || '';
    let enderecoRua = cliente.endereco || '';
    if (!numero && enderecoRua) {
      const match = enderecoRua.match(/^(.*?),\s*(\d+[a-zA-Z]?)\s*$/);
      if (match) {
        enderecoRua = match[1].trim();
        numero = match[2].trim();
      }
    }
    
    onChange({
      cliente_nome: cliente.nome,
      cliente_telefone: cliente.telefone || '',
      cliente_email: cliente.email || '',
      cpf_cliente: cliente.cpf_cnpj || '',
      estado: cliente.estado || '',
      cidade: cliente.cidade || '',
      cep: cliente.cep || '',
      endereco: enderecoRua,
      numero,
      bairro: cliente.bairro || '',
      canal_aquisicao_id: cliente.canal_aquisicao_id || '',
      publico_alvo: (clienteAny.publico_alvo as string) || '',
    });
    
    onClienteSelecionado?.(cliente);
  };

  // Limpa seleção de cliente
  const handleLimparCliente = () => {
    setClienteSelecionado(null);
    onChange({
      cliente_nome: '',
      cliente_telefone: '',
      cliente_email: '',
      cpf_cliente: '',
      estado: '',
      cidade: '',
      cep: '',
      endereco: '',
      numero: '',
      bairro: '',
      canal_aquisicao_id: '',
    });
    onClienteSelecionado?.(null);
  };

  // Usa cliente duplicado encontrado
  const handleUsarClienteExistente = () => {
    if (clienteDuplicado) {
      handleSelectCliente(clienteDuplicado as Cliente);
      setModo('buscar');
    }
  };

  // Verificar CPF duplicado quando digita
  useEffect(() => {
    if (modo === 'cadastrar' && dados.cpf_cliente) {
      const timeout = setTimeout(() => {
        setCpfParaVerificar(dados.cpf_cliente);
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setCpfParaVerificar('');
    }
  }, [dados.cpf_cliente, modo]);

  // Formatar CPF/CNPJ
  const formatarCpfCnpj = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      v = v.replace(/(\d{2})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1/$2');
      v = v.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    return v;
  };

  // Formatar telefone
  const formatarTelefone = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) {
      v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    return v;
  };

  // Formatar CEP
  const formatarCep = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 5) {
      v = v.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }
    return v;
  };

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-white">Cliente</CardTitle>
          {!disabled && (
            <RadioGroup
              value={modo}
              onValueChange={(v) => {
                setModo(v as 'buscar' | 'cadastrar');
                if (v === 'buscar') {
                  handleLimparCliente();
                }
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="buscar" id="buscar" className="border-white/30 text-white" />
                <Label htmlFor="buscar" className="text-sm cursor-pointer text-white/70">Buscar existente</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cadastrar" id="cadastrar" className="border-white/30 text-white" />
                <Label htmlFor="cadastrar" className="text-sm cursor-pointer text-white/70">Cadastrar novo</Label>
              </div>
            </RadioGroup>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {/* Modo disabled - conversão de orçamento: nome e telefone bloqueados, resto editável */}
        {disabled && (
          <>
            {/* Dados bloqueados do orçamento */}
            <div className="border rounded-lg p-4 border-white/10 bg-white/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-white/50">Nome do Cliente</Label>
                  <p className="font-medium text-white">{dados.cliente_nome || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/50">Telefone</Label>
                  <p className="font-medium text-white">{dados.cliente_telefone || '-'}</p>
                </div>
              </div>
            </div>

            {/* Campos editáveis para complementar dados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cpf_cliente_disabled" className={labelClass}>CPF/CNPJ</Label>
                <Input
                  id="cpf_cliente_disabled"
                  value={dados.cpf_cliente}
                  onChange={(e) => onChange({ cpf_cliente: formatarCpfCnpj(e.target.value) })}
                  placeholder="CPF ou CNPJ"
                  className={inputClass}
                  maxLength={18}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cliente_email_disabled" className={labelClass}>E-mail</Label>
                <Input
                  id="cliente_email_disabled"
                  type="email"
                  value={dados.cliente_email}
                  onChange={(e) => onChange({ cliente_email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cep_disabled" className={labelClass}>CEP</Label>
                <Input
                  id="cep_disabled"
                  value={dados.cep}
                  onChange={(e) => onChange({ cep: formatarCep(e.target.value) })}
                  placeholder="00000-000"
                  className={inputClass}
                  maxLength={9}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="estado_disabled" className={labelClass}>Estado</Label>
                <Select
                  value={dados.estado}
                  onValueChange={(value) => onChange({ estado: value, cidade: '' })}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map(estado => (
                      <SelectItem key={estado.sigla} value={estado.sigla}>
                        {estado.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cidade_disabled" className={labelClass}>Cidade</Label>
                <Select
                  value={dados.cidade}
                  onValueChange={(value) => onChange({ cidade: value })}
                  disabled={!dados.estado}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {cidades.map(cidade => (
                      <SelectItem key={cidade} value={cidade}>
                        {cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="bairro_disabled" className={labelClass}>Bairro</Label>
                <Input
                  id="bairro_disabled"
                  value={dados.bairro}
                  onChange={(e) => onChange({ bairro: e.target.value })}
                  placeholder="Bairro"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endereco_disabled" className={labelClass}>Endereço</Label>
                <Input
                  id="endereco_disabled"
                  value={dados.endereco}
                  onChange={(e) => onChange({ endereco: e.target.value })}
                  placeholder="Rua, número"
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}

        {/* Modo Buscar */}
        {!disabled && modo === 'buscar' && !clienteSelecionado && (
          <div className="space-y-2">
            <Label className={labelClass}>Buscar por nome ou CPF/CNPJ</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start h-9 border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <Search className="mr-2 h-4 w-4" />
                  <span>Digite para buscar...</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Nome ou CPF/CNPJ..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    {buscando && (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Buscando...
                      </div>
                    )}
                    {!buscando && searchTerm.length >= 2 && clientesBusca.length === 0 && (
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    )}
                    {!buscando && clientesBusca.length > 0 && (
                      <CommandGroup heading="Clientes encontrados">
                        {clientesBusca.map((cliente) => (
                          <CommandItem
                            key={cliente.id}
                            onSelect={() => handleSelectCliente(cliente)}
                            className="cursor-pointer"
                          >
                            <User className="mr-2 h-4 w-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">{cliente.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                {cliente.cpf_cnpj && `${cliente.cpf_cnpj} • `}
                                {cliente.cidade && `${cliente.cidade}/${cliente.estado}`}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-white/40">
              Ou selecione "Cadastrar novo" para adicionar um cliente
            </p>
          </div>
        )}

        {/* Cliente Selecionado */}
        {!disabled && modo === 'buscar' && clienteSelecionado && (
          <>
            <div className="border rounded-lg p-4 border-white/10 bg-white/5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium text-white">{clienteSelecionado.nome}</span>
                  </div>
                  <div className="text-sm text-white/50 space-y-0.5">
                    {clienteSelecionado.cpf_cnpj && <p>CPF/CNPJ: {clienteSelecionado.cpf_cnpj}</p>}
                    {clienteSelecionado.telefone && <p>Tel: {clienteSelecionado.telefone}</p>}
                    {clienteSelecionado.email && <p>Email: {clienteSelecionado.email}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLimparCliente} className="text-white/50 hover:text-white hover:bg-white/10">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Editable location fields for selected client */}
            <div className="pt-2 border-t border-white/10">
              <Label className={cn(
                "text-xs font-medium mb-2 block",
                (!dados.estado || !dados.cidade || !dados.cep || !dados.bairro || !dados.endereco) 
                  ? "text-amber-400/80" 
                  : "text-white/40"
              )}>
                {(!dados.estado || !dados.cidade || !dados.cep || !dados.bairro || !dados.endereco) 
                  ? "⚠️ Complete os dados de localização obrigatórios" 
                  : "Localização (editar se necessário)"}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="estado_buscar" className={labelClass}>Estado *</Label>
                  <Select
                    value={dados.estado}
                    onValueChange={(value) => onChange({ estado: value, cidade: '' })}
                  >
                    <SelectTrigger className={cn(inputClass, !dados.estado && "border-amber-500/50")}>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASIL.map(estado => (
                        <SelectItem key={estado.sigla} value={estado.sigla}>
                          {estado.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cidade_buscar" className={labelClass}>Cidade *</Label>
                  <Select
                    value={dados.cidade}
                    onValueChange={(value) => onChange({ cidade: value })}
                    disabled={!dados.estado}
                  >
                    <SelectTrigger className={cn(inputClass, !dados.cidade && "border-amber-500/50")}>
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {cidades.map(cidade => (
                        <SelectItem key={cidade} value={cidade}>
                          {cidade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cep_buscar" className={labelClass}>CEP *</Label>
                  <Input
                    id="cep_buscar"
                    value={dados.cep}
                    onChange={(e) => onChange({ cep: formatarCep(e.target.value) })}
                    placeholder="00000-000"
                    className={cn(inputClass, !dados.cep && "border-amber-500/50")}
                    maxLength={9}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="endereco_buscar" className={labelClass}>Endereço *</Label>
                  <Input
                    id="endereco_buscar"
                    value={dados.endereco}
                    onChange={(e) => onChange({ endereco: e.target.value })}
                    placeholder="Ex: Rua das Flores"
                    className={cn(inputClass, !dados.endereco && "border-amber-500/50")}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="numero_buscar" className={labelClass}>Número *</Label>
                  <Input
                    id="numero_buscar"
                    value={dados.numero || ''}
                    onChange={(e) => onChange({ numero: e.target.value })}
                    placeholder="Ex: 123"
                    className={cn(inputClass, !dados.numero && "border-amber-500/50")}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bairro_buscar" className={labelClass}>Bairro *</Label>
                  <Input
                    id="bairro_buscar"
                    value={dados.bairro}
                    onChange={(e) => onChange({ bairro: e.target.value })}
                    placeholder="Nome do bairro"
                    className={cn(inputClass, !dados.bairro && "border-amber-500/50")}
                  />
                </div>
              </div>
            </div>

            {/* Canal de Aquisição e Público Alvo for search mode */}
            <div className="pt-2 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md">
                <div className="space-y-1">
                  <Label htmlFor="canal_aquisicao_id_buscar" className={labelClass}>Canal de Aquisição</Label>
                  <Select
                    value={dados.canal_aquisicao_id}
                    onValueChange={(value) => onChange({ canal_aquisicao_id: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Como conheceu?" />
                    </SelectTrigger>
                    <SelectContent>
                      {canais.map((canal) => (
                        <SelectItem key={canal.id} value={canal.id}>
                          {canal.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="publico_alvo_buscar" className={labelClass}>Público Alvo *</Label>
                  <Select
                    value={dados.publico_alvo}
                    onValueChange={(value) => onChange({ publico_alvo: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente_final">Cliente Final</SelectItem>
                      <SelectItem value="serralheiro">Serralheiro</SelectItem>
                      <SelectItem value="empresa">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modo Cadastrar */}
        {!disabled && modo === 'cadastrar' && (
          <>
            {/* Alerta de CPF/CNPJ duplicado - BLOQUEIA CADASTRO */}
            {clienteDuplicado && (
              <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-red-400">CPF/CNPJ já cadastrado!</AlertTitle>
                <AlertDescription className="text-red-300/80">
                  <p className="mb-2">
                    Já existe um cliente com este documento: <strong>{clienteDuplicado.nome}</strong>
                    {clienteDuplicado.telefone && ` - Tel: ${clienteDuplicado.telefone}`}
                  </p>
                  <p className="text-sm mb-3">
                    Não é possível cadastrar clientes com CPF/CNPJ duplicado. Use o cliente existente.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleUsarClienteExistente}
                    className="bg-white/20 text-white hover:bg-white/30"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Usar cliente existente
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Dados do Cliente - desabilitados se houver duplicado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cliente_nome" className={labelClass}>Nome *</Label>
                <Input
                  id="cliente_nome"
                  value={dados.cliente_nome}
                  onChange={(e) => onChange({ cliente_nome: e.target.value })}
                  placeholder="Nome completo"
                  className={inputClass}
                  required
                  disabled={!!clienteDuplicado}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cliente_telefone" className={labelClass}>Telefone *</Label>
                <Input
                  id="cliente_telefone"
                  value={dados.cliente_telefone}
                  onChange={(e) => onChange({ cliente_telefone: formatarTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className={inputClass}
                  maxLength={15}
                  required
                  disabled={!!clienteDuplicado}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cliente_email" className={labelClass}>E-mail</Label>
                <Input
                  id="cliente_email"
                  type="email"
                  value={dados.cliente_email}
                  onChange={(e) => onChange({ cliente_email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className={inputClass}
                  disabled={!!clienteDuplicado}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cpf_cliente" className={labelClass}>CPF/CNPJ *</Label>
                <Input
                  id="cpf_cliente"
                  value={dados.cpf_cliente}
                  onChange={(e) => onChange({ cpf_cliente: formatarCpfCnpj(e.target.value) })}
                  placeholder="CPF ou CNPJ"
                  className={cn(inputClass, clienteDuplicado && "border-red-500/50 focus-visible:ring-red-500/50")}
                  maxLength={18}
                  required
                />
              </div>
            </div>

            {/* Localização - desabilitados se houver duplicado */}
            <div className="pt-2 border-t border-white/10">
              <Label className="text-xs font-medium text-white/40 mb-2 block">Localização (obrigatório para NF-e)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="estado" className={labelClass}>Estado *</Label>
                  <Select
                    value={dados.estado}
                    onValueChange={(value) => onChange({ estado: value, cidade: '' })}
                    disabled={!!clienteDuplicado}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASIL.map(estado => (
                        <SelectItem key={estado.sigla} value={estado.sigla}>
                          {estado.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cidade" className={labelClass}>Cidade *</Label>
                  <Select
                    value={dados.cidade}
                    onValueChange={(value) => onChange({ cidade: value })}
                    disabled={!dados.estado || !!clienteDuplicado}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {cidades.map(cidade => (
                        <SelectItem key={cidade} value={cidade}>
                          {cidade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cep" className={labelClass}>CEP *</Label>
                  <Input
                    id="cep"
                    value={dados.cep}
                    onChange={(e) => onChange({ cep: formatarCep(e.target.value) })}
                    placeholder="00000-000"
                    className={inputClass}
                    maxLength={9}
                    required
                    disabled={!!clienteDuplicado}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="endereco" className={labelClass}>Endereço *</Label>
                  <Input
                    id="endereco"
                    value={dados.endereco}
                    onChange={(e) => onChange({ endereco: e.target.value })}
                    placeholder="Ex: Rua das Flores"
                    className={inputClass}
                    required
                    disabled={!!clienteDuplicado}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="numero" className={labelClass}>Número *</Label>
                  <Input
                    id="numero"
                    value={dados.numero || ''}
                    onChange={(e) => onChange({ numero: e.target.value })}
                    placeholder="Ex: 123"
                    className={inputClass}
                    required
                    disabled={!!clienteDuplicado}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bairro" className={labelClass}>Bairro *</Label>
                  <Input
                    id="bairro"
                    value={dados.bairro}
                    onChange={(e) => onChange({ bairro: e.target.value })}
                    placeholder="Nome do bairro"
                    className={inputClass}
                    required
                    disabled={!!clienteDuplicado}
                  />
                </div>
              </div>
            </div>

            {/* Canal de Aquisição e Público Alvo */}
            <div className="pt-2 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md">
                <div className="space-y-1">
                  <Label htmlFor="canal_aquisicao_id" className={labelClass}>Canal de Aquisição</Label>
                  <Select
                    value={dados.canal_aquisicao_id}
                    onValueChange={(value) => onChange({ canal_aquisicao_id: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Como conheceu?" />
                    </SelectTrigger>
                    <SelectContent>
                      {canais.map((canal) => (
                        <SelectItem key={canal.id} value={canal.id}>
                          {canal.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="publico_alvo" className={labelClass}>Público Alvo *</Label>
                  <Select
                    value={dados.publico_alvo}
                    onValueChange={(value) => onChange({ publico_alvo: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente_final">Cliente Final</SelectItem>
                      <SelectItem value="serralheiro">Serralheiro</SelectItem>
                      <SelectItem value="empresa">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
