import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown, Edit, Save, X, User, Building2, Check, ChevronsUpDown, Search } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { PedidoPortaObservacoesInsert } from "@/types/pedidoObservacoes";
import {
  OPCOES_TUBO,
  OPCOES_INTERNA_EXTERNA,
  OPCOES_RETIRADA_PORTA,
  OPCOES_POSICAO_GUIA,
  OPCOES_GUIA,
  OPCOES_ROLO,
  OPCOES_TUBO_TIRAS_FRONTAIS,
  OPCOES_LADO_MOTOR,
  OPCOES_APARENCIA_TESTEIRA,
} from "@/types/pedidoObservacoes";

interface ObservacoesPortaFormProps {
  porta: any;
  portaIndex: number;
  usuarios: Array<{ id: string; nome: string }>;
  autorizados: Array<{ id: string; nome: string }>;
  valoresIniciais?: Partial<PedidoPortaObservacoesInsert>;
  onSalvar: (dados: PedidoPortaObservacoesInsert) => Promise<any>;
  pedidoId: string;
  defaultOpen?: boolean;
  isReadOnly?: boolean;
}

export function ObservacoesPortaForm({
  porta,
  portaIndex,
  usuarios,
  autorizados,
  valoresIniciais,
  onSalvar,
  pedidoId,
  defaultOpen = false,
  isReadOnly = false,
}: ObservacoesPortaFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const form = useForm<PedidoPortaObservacoesInsert>({
    defaultValues: {
      pedido_id: pedidoId,
      produto_venda_id: porta._originalId || porta.id,
      indice_porta: porta._indicePorta ?? 0,
      responsavel_medidas_id: valoresIniciais?.responsavel_medidas_id || null,
      tipo_responsavel: valoresIniciais?.tipo_responsavel || 'admin',
      cliente_medeu: valoresIniciais?.cliente_medeu ?? false,
      opcao_tubo: valoresIniciais?.opcao_tubo || 'sem_tubo',
      interna_externa: valoresIniciais?.interna_externa || 'porta_interna',
      retirada_porta: valoresIniciais?.retirada_porta || false,
      posicao_guia: valoresIniciais?.posicao_guia || 'guia_dentro_vao',
      opcao_guia: valoresIniciais?.opcao_guia || 'guia_aparente',
      opcao_rolo: valoresIniciais?.opcao_rolo || 'nao_erguer',
      tubo_tiras_frontais: valoresIniciais?.tubo_tiras_frontais || 'sem_tubo_tiras_frontais',
      lado_motor: valoresIniciais?.lado_motor || 'esquerdo',
      aparencia_testeira: valoresIniciais?.aparencia_testeira || 'fora_do_vao',
    },
  });

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(form.getValues() as PedidoPortaObservacoesInsert);
      setModoEdicao(false);
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelar = () => {
    form.reset({
      pedido_id: pedidoId,
      produto_venda_id: porta._originalId || porta.id,
      indice_porta: porta._indicePorta ?? 0,
      responsavel_medidas_id: valoresIniciais?.responsavel_medidas_id || null,
      tipo_responsavel: valoresIniciais?.tipo_responsavel || 'admin',
      cliente_medeu: valoresIniciais?.cliente_medeu ?? false,
      opcao_tubo: valoresIniciais?.opcao_tubo || 'sem_tubo',
      interna_externa: valoresIniciais?.interna_externa || 'porta_interna',
      retirada_porta: valoresIniciais?.retirada_porta || false,
      posicao_guia: valoresIniciais?.posicao_guia || 'guia_dentro_vao',
      opcao_guia: valoresIniciais?.opcao_guia || 'guia_aparente',
      opcao_rolo: valoresIniciais?.opcao_rolo || 'nao_erguer',
      tubo_tiras_frontais: valoresIniciais?.tubo_tiras_frontais || 'sem_tubo_tiras_frontais',
      lado_motor: valoresIniciais?.lado_motor || 'esquerdo',
      aparencia_testeira: valoresIniciais?.aparencia_testeira || 'fora_do_vao',
    });
    setModoEdicao(false);
  };

  // Resumo das configurações atuais
  const resumo = [
    OPCOES_LADO_MOTOR[form.watch('lado_motor') || 'esquerdo'],
    OPCOES_INTERNA_EXTERNA[form.watch('interna_externa') || 'porta_interna'],
  ].filter(Boolean).join(' • ');

  // Extrair medidas do campo tamanho se largura/altura estiverem vazios
  const getMedidas = () => {
    if (porta.largura && porta.altura) {
      return `${Number(porta.largura).toFixed(2)}m × ${Number(porta.altura).toFixed(2)}m`;
    }
    if (porta.tamanho && porta.tamanho.includes('x')) {
      const [largura, altura] = porta.tamanho.split('x');
      return `${Number(largura).toFixed(2)}m × ${Number(altura).toFixed(2)}m`;
    }
    return porta.tamanho || 'Medidas não informadas';
  };

  const clienteMedeu = !!form.watch('cliente_medeu');
  const responsavelPreenchido = !!form.watch('responsavel_medidas_id') || clienteMedeu;

  // Label da porta considerando se é expandida
  const portaLabel = porta._totalNoGrupo && porta._totalNoGrupo > 1
    ? `Porta #${portaIndex + 1} (${porta._indicePorta + 1}/${porta._totalNoGrupo})`
    : `Porta #${portaIndex + 1}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={`border rounded-lg ${!responsavelPreenchido ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      <CollapsibleTrigger className="w-full">
        <div className="flex flex-wrap items-center gap-2 p-3 hover:bg-muted/50 transition-colors">
          <Badge variant={responsavelPreenchido ? "outline" : "destructive"} className="shrink-0">
            <FileText className="h-3 w-3 mr-1" />
            {portaLabel}
          </Badge>
          <span className="text-sm font-medium shrink-0">
            {getMedidas()}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {resumo}
          </span>
          {!responsavelPreenchido && (
            <Badge variant="outline" className="text-[10px] border-destructive text-destructive shrink-0">
              Pendente
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 ml-auto shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4 pt-0 border-t">
          {/* Header com botões */}
          <div className="flex justify-end gap-2 mt-4 mb-4">
            {isReadOnly ? (
              <Badge variant="secondary" className="text-xs">
                Somente leitura
              </Badge>
            ) : !modoEdicao ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setModoEdicao(true);
                }}
              >
                <Edit className="w-3 h-3 mr-2" />
                Editar
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelar();
                  }}
                >
                  <X className="w-3 h-3 mr-2" />
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSalvar();
                  }}
                  disabled={salvando}
                >
                  <Save className="w-3 h-3 mr-2" />
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            )}
          </div>

          <Form {...form}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="responsavel_medidas_id"
                render={({ field }) => {
                  const [open, setOpen] = useState(false);
                  
                  // Encontrar o nome do selecionado
                  const selectedUser = usuarios.find(u => u.id === field.value);
                  const selectedAutorizado = autorizados.find(a => a.id === field.value);
                  const selectedName = selectedUser?.nome || selectedAutorizado?.nome;
                  const selectedType = selectedUser ? 'admin' : selectedAutorizado ? 'autorizado' : null;
                  
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs">
                        Responsável pelas medidas
                        <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <div className="flex items-center gap-2 mb-1">
                        <Checkbox
                          id={`cliente-medeu-${porta._virtualKey || porta.id}-${portaIndex}`}
                          checked={clienteMedeu}
                          disabled={!modoEdicao}
                          onCheckedChange={(v) => {
                            const checked = v === true;
                            form.setValue('cliente_medeu', checked);
                            if (checked) {
                              form.setValue('responsavel_medidas_id', null);
                            }
                          }}
                        />
                        <label
                          htmlFor={`cliente-medeu-${porta._virtualKey || porta.id}-${portaIndex}`}
                          className="text-[11px] text-muted-foreground cursor-pointer select-none"
                        >
                          Cliente mediu (dispensa responsável)
                        </label>
                      </div>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              disabled={!modoEdicao || clienteMedeu}
                              className={cn(
                                "h-9 w-full justify-between text-xs font-normal",
                                !field.value && modoEdicao && !clienteMedeu && "border-destructive",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {clienteMedeu ? (
                                <span className="text-muted-foreground">Cliente mediu</span>
                              ) : selectedName ? (
                                <span className="flex items-center gap-1.5 truncate">
                                  {selectedType === 'admin' ? (
                                    <User className="h-3 w-3 text-primary shrink-0" />
                                  ) : (
                                    <Building2 className="h-3 w-3 text-amber-600 shrink-0" />
                                  )}
                                  {selectedName}
                                </span>
                              ) : (
                                "Selecione..."
                              )}
                              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar responsável..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                              <CommandGroup heading={
                                <span className="flex items-center gap-1 text-primary">
                                  <User className="h-3 w-3" />
                                  Equipe Interna
                                </span>
                              }>
                                {usuarios.map(user => (
                                  <CommandItem
                                    key={user.id}
                                    value={user.nome}
                                    onSelect={() => {
                                      field.onChange(user.id);
                                      form.setValue('tipo_responsavel', 'admin');
                                      setOpen(false);
                                    }}
                                    className="text-xs"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3 w-3",
                                        field.value === user.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {user.nome}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {autorizados.length > 0 && (
                                <>
                                  <CommandSeparator />
                                  <CommandGroup heading={
                                    <span className="flex items-center gap-1 text-amber-600">
                                      <Building2 className="h-3 w-3" />
                                      Autorizados
                                    </span>
                                  }>
                                    {autorizados.map(aut => (
                                      <CommandItem
                                        key={aut.id}
                                        value={aut.nome}
                                        onSelect={() => {
                                          field.onChange(aut.id);
                                          form.setValue('tipo_responsavel', 'autorizado');
                                          setOpen(false);
                                        }}
                                        className="text-xs"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-3 w-3",
                                            field.value === aut.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {aut.nome}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {!field.value && !clienteMedeu && <p className="text-[10px] text-destructive">Obrigatório para avançar o pedido</p>}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="lado_motor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Lado do Motor</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_LADO_MOTOR).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="opcao_tubo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Opção de tubo</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_TUBO).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interna_externa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Interna ou externa</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_INTERNA_EXTERNA).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="retirada_porta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Retirada de porta</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === 'true')} 
                      value={String(field.value)}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_RETIRADA_PORTA).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="posicao_guia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Posição do guia</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_POSICAO_GUIA).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="opcao_guia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Opção do guia</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_GUIA).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="opcao_rolo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Opção do rolo</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_ROLO).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tubo_tiras_frontais"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Tubo para tiras frontais</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_TUBO_TIRAS_FRONTAIS).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aparencia_testeira"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Aparência da Testeira</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!modoEdicao}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OPCOES_APARENCIA_TESTEIRA).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}