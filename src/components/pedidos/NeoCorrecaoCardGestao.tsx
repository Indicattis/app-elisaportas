import { useState } from "react";
import { NeoCorrecao } from "@/types/neoCorrecao";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { CronometroEtapaBadge } from "./CronometroEtapaBadge";
import { MapPin, Calendar, CalendarPlus, Clock, AlertTriangle, Check, DollarSign, Undo2, GripVertical, Archive, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NeoCorrecaoCardGestaoProps {
  neoCorrecao: NeoCorrecao;
  viewMode?: 'grid' | 'list';
  onConcluir?: (id: string) => void;
  isConcluindo?: boolean;
  showConcluido?: boolean;
  showAguardandoCliente?: boolean;
  onRetornar?: (id: string) => void;
  onAgendar?: (id: string) => void;
  onArquivar?: (id: string) => void;
  onEditar?: (neo: NeoCorrecao) => void;
  onEnviarAguardandoCliente?: (id: string) => void;
  onRetornarParaFinalizado?: (id: string) => void;
  onUpdateValor?: (id: string, data: { valor_a_receber: number | null; valor_a_receber_texto: string }) => Promise<void>;
  dragHandleProps?: Record<string, any>;
  isDragging?: boolean;
}

export function NeoCorrecaoCardGestao({
  neoCorrecao,
  viewMode = 'grid',
  onConcluir,
  isConcluindo,
  showConcluido = false,
  showAguardandoCliente = false,
  onRetornar,
  onAgendar,
  onArquivar,
  onEditar,
  onEnviarAguardandoCliente,
  onRetornarParaFinalizado,
  onUpdateValor,
  dragHandleProps,
  isDragging,
}: NeoCorrecaoCardGestaoProps) {
  const [popoverValorOpen, setPopoverValorOpen] = useState(false);
  const [valorTexto, setValorTexto] = useState('');
  const corEquipe = neoCorrecao.equipe?.cor || "#9333ea";

  // Dados do criador
  const criadorNome = neoCorrecao.criador?.nome || 'Desconhecido';
  const criadorFoto = neoCorrecao.criador?.foto_perfil_url;
  const criadorIniciais = criadorNome
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const atrasado = (() => {
    const dataStr = neoCorrecao.data_correcao;
    if (!dataStr) return false;
    const data = new Date(dataStr + 'T12:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    data.setHours(0, 0, 0, 0);
    return data < hoje;
  })();

  if (viewMode === 'list') {
    return (
      <TooltipProvider>
        <Card className="hover:shadow-sm transition-all h-10 overflow-hidden">
          <CardContent className="p-0 h-full">
            {/* Grid layout IDÊNTICO ao PedidoCard */}
            <div 
              className="grid items-center gap-1.5 h-full px-2 w-full" 
              style={{ gridTemplateColumns: '20px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px 65px 24px 24px 24px 24px 24px 24px 1fr 55px' }}
            >
              {/* Col 1: Drag handle */}
              <div className="flex items-center justify-center">
                {dragHandleProps ? (
                  <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground" />
                  </div>
                ) : null}
              </div>
              
              {/* Col 2: Avatar do criador */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={criadorFoto || undefined} alt={criadorNome} />
                    <AvatarFallback className="text-[8px] bg-purple-500/20 text-purple-400 border border-purple-500/50">
                      {criadorIniciais}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Criado por: {criadorNome}</p>
                  <p className="text-[10px] text-muted-foreground">Correção Avulsa</p>
                </TooltipContent>
              </Tooltip>

              {/* Col 3: Símbolos placeholder */}
              <div />
              
              {/* Col 4: Nome do cliente */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {neoCorrecao.nome_cliente && neoCorrecao.nome_cliente.length > 20 
                        ? `${neoCorrecao.nome_cliente.substring(0, 20)}...` 
                        : neoCorrecao.nome_cliente}
                    </h3>
                    {neoCorrecao.descricao && (
                      <p className="text-[9px] text-muted-foreground truncate leading-tight -mt-0.5">
                        {neoCorrecao.descricao}
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{neoCorrecao.nome_cliente}</p>
                  {neoCorrecao.descricao && (
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[250px]">{neoCorrecao.descricao}</p>
                  )}
                </TooltipContent>
              </Tooltip>

              {/* Col 5: Cidade/Estado */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center text-center">
                    <span className="text-[10px] text-muted-foreground truncate">
                      {neoCorrecao.cidade && neoCorrecao.estado 
                        ? `${neoCorrecao.cidade}/${neoCorrecao.estado}`
                        : neoCorrecao.cidade || neoCorrecao.estado || '—'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {neoCorrecao.cidade}, {neoCorrecao.estado}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Col 6: Terceirização placeholder */}
              <div />

              {/* Col 7: Metragem linear placeholder */}
              <div />

              {/* Col 8: Metragem quadrada placeholder */}
              <div />

              {/* Col 9: Data de Agendamento */}
              <div className="text-center">
                {neoCorrecao.data_correcao ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center leading-tight cursor-help">
                        <span className={`text-[9px] font-medium ${atrasado ? 'text-red-500' : 'text-purple-400'}`}>
                          {atrasado ? 'Atrasado' : 'Agendado'}
                        </span>
                        <span className={`text-xs font-bold ${atrasado ? 'text-red-500' : 'text-purple-400'}`}>
                          {format(parseISO(neoCorrecao.data_correcao), "dd/MM/yy")}
                        </span>
                      </div>
                    </TooltipTrigger>
                    {neoCorrecao.vezes_agendado >= 2 && (
                      <TooltipContent>
                        <p className="text-xs">Reagendado {neoCorrecao.vezes_agendado} vezes</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ) : (
                  <span className="text-[10px] font-bold text-destructive">
                    Não agendado
                  </span>
                )}
              </div>

              {/* Col 10: Responsável/Equipe */}
              <div className="text-center overflow-hidden">
                {neoCorrecao.equipe_nome ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className="text-[10px] font-medium truncate block cursor-help"
                        style={{ color: corEquipe }}
                      >
                        {neoCorrecao.equipe_nome.length > 10 
                          ? `${neoCorrecao.equipe_nome.substring(0, 10)}...` 
                          : neoCorrecao.equipe_nome}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{neoCorrecao.equipe_nome}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-[9px] text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Col 11: Portas P/G - Badge Avulso */}
              <div className="flex items-center gap-0.5 overflow-hidden">
                <Badge 
                  variant="outline" 
                  className="text-[9px] px-1 py-0 h-4 text-purple-400 bg-purple-500/20 border-purple-500/50"
                >
                  AVULSO
                </Badge>
              </div>

              {/* Col 12: Tags/Badges (Correção) */}
              <div className="flex items-center justify-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-purple-500/10 text-purple-400 border-purple-500/50">
                  <AlertTriangle className="h-2.5 w-2.5" />
                </Badge>
              </div>

              {/* Col 13: Cores placeholder */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground/50">—</span>
              </div>

              {/* Col 14: Valor Total */}
              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground font-medium cursor-help">
                      {neoCorrecao.valor_total ? formatCurrency(neoCorrecao.valor_total).replace('R$\u00a0', '') : '—'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Valor Total: {formatCurrency(neoCorrecao.valor_total || 0)}</p></TooltipContent>
                </Tooltip>
              </div>

              {/* Col 15: Valor a Receber */}
              <div className="text-center">
                {onUpdateValor ? (
                  <Popover open={popoverValorOpen} onOpenChange={(open) => {
                    setPopoverValorOpen(open);
                    if (open) {
                      setValorTexto(neoCorrecao.valor_a_receber_texto || (neoCorrecao.valor_a_receber ? formatCurrency(neoCorrecao.valor_a_receber).replace('R$\u00a0', '') : ''));
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <button
                        className={`text-[10px] font-medium cursor-pointer hover:underline ${
                          (neoCorrecao.valor_a_receber_texto || neoCorrecao.valor_a_receber) ? 'text-emerald-400' : 'text-muted-foreground/50'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {neoCorrecao.valor_a_receber_texto || (neoCorrecao.valor_a_receber ? formatCurrency(neoCorrecao.valor_a_receber).replace('R$\u00a0', '') : '—')}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Valor a Receber</p>
                        <Input
                          value={valorTexto}
                          onChange={(e) => setValorTexto(e.target.value)}
                          placeholder="Ex: 1.500,00 ou texto"
                          className="h-8 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const textoOriginal = valorTexto.trim();
                              if (!textoOriginal) return;
                              const textoNormalizado = textoOriginal.replace(/\./g, '').replace(',', '.');
                              const valorNumerico = parseFloat(textoNormalizado);
                              const ehNumero = !isNaN(valorNumerico) && valorNumerico >= 0 && /^[0-9.,\s]+$/.test(textoOriginal);
                              onUpdateValor(neoCorrecao.id, {
                                valor_a_receber: ehNumero ? valorNumerico : null,
                                valor_a_receber_texto: textoOriginal,
                              });
                              setPopoverValorOpen(false);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => {
                            const textoOriginal = valorTexto.trim();
                            if (!textoOriginal) return;
                            const textoNormalizado = textoOriginal.replace(/\./g, '').replace(',', '.');
                            const valorNumerico = parseFloat(textoNormalizado);
                            const ehNumero = !isNaN(valorNumerico) && valorNumerico >= 0 && /^[0-9.,\s]+$/.test(textoOriginal);
                            onUpdateValor(neoCorrecao.id, {
                              valor_a_receber: ehNumero ? valorNumerico : null,
                              valor_a_receber_texto: textoOriginal,
                            });
                            setPopoverValorOpen(false);
                          }}
                        >
                          Salvar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`text-[10px] font-medium cursor-help ${(neoCorrecao.valor_a_receber_texto || neoCorrecao.valor_a_receber) ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
                        {neoCorrecao.valor_a_receber_texto || (neoCorrecao.valor_a_receber ? formatCurrency(neoCorrecao.valor_a_receber).replace('R$\u00a0', '') : '—')}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">A Receber: {neoCorrecao.valor_a_receber_texto || formatCurrency(neoCorrecao.valor_a_receber || 0)}</p></TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Col 16-22: Data criação + Cronômetro (span across ordens + tempo cols) */}
              <div style={{ gridColumn: '16 / 23' }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-1 cursor-help">
                      <span className="text-[9px] text-muted-foreground leading-none">
                        {format(new Date(neoCorrecao.created_at), "dd/MM/yy")}
                      </span>
                      <CronometroEtapaBadge dataEntrada={neoCorrecao.created_at} compact />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Criado em: {format(new Date(neoCorrecao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    {neoCorrecao.hora && (
                      <p className="text-[10px] text-muted-foreground">Hora agendada: {neoCorrecao.hora.slice(0, 5)}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Col 23: Botões de ação ou status concluído */}
              <div className="flex items-center justify-end gap-1">
                {onEditar && !showConcluido && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="flex h-[22px] w-[22px] rounded-[3px] bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditar(neoCorrecao);
                    }}
                    title="Editar Neo Correção"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {onAgendar && !showConcluido && !neoCorrecao.data_correcao && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="flex h-[22px] w-[22px] rounded-[3px] bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAgendar(neoCorrecao.id);
                    }}
                    title="Agendar no calendário"
                  >
                    <CalendarPlus className="h-3 w-3" />
                  </Button>
                )}
                {showConcluido ? (
                  <>
                    {onRetornar && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="flex h-[22px] w-[22px] rounded-[3px] bg-amber-600 text-white hover:bg-amber-700 border-amber-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetornar(neoCorrecao.id);
                        }}
                        title="Retornar para correções"
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    )}
                    {onEnviarAguardandoCliente && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="flex h-[22px] w-[22px] rounded-[3px] bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEnviarAguardandoCliente(neoCorrecao.id);
                        }}
                        title="Aguardando Cliente"
                      >
                        <Clock className="h-3 w-3" />
                      </Button>
                    )}
                    {onArquivar && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="flex h-[22px] w-[22px] rounded-[3px] bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArquivar(neoCorrecao.id);
                        }}
                        title="Arquivar"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                ) : showAguardandoCliente ? (
                  <>
                    {onRetornarParaFinalizado && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="flex h-[22px] w-[22px] rounded-[3px] bg-green-600 text-white hover:bg-green-700 border-green-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetornarParaFinalizado(neoCorrecao.id);
                        }}
                        title="Retornar para Finalizado"
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    )}
                    {onArquivar && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="flex h-[22px] w-[22px] rounded-[3px] bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArquivar(neoCorrecao.id);
                        }}
                        title="Arquivar"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                ) : onConcluir && neoCorrecao.data_correcao && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="flex h-[22px] w-[22px] rounded-[3px] bg-green-600 text-white hover:bg-green-700 border-green-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConcluir(neoCorrecao.id);
                    }}
                    disabled={isConcluindo}
                    title="Concluir correção"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  // Grid mode
  return (
    <Card className="h-full border-l-4 p-4" style={{ borderLeftColor: "#9333ea" }}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-purple-600" />
        <Badge className="bg-purple-50 text-purple-700 border-purple-200">
          Correção Avulsa
        </Badge>
      </div>

      <h4 className="font-medium text-sm mb-2">
        {neoCorrecao.nome_cliente}
      </h4>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {neoCorrecao.cidade}/{neoCorrecao.estado}
        </div>

        {neoCorrecao.data_correcao && (
          <div className={`flex items-center gap-1 ${atrasado ? 'text-red-500' : ''}`}>
            <Calendar className="h-3 w-3" />
            {format(parseISO(neoCorrecao.data_correcao), "dd/MM/yyyy", { locale: ptBR })}
            {neoCorrecao.hora && ` às ${neoCorrecao.hora.slice(0, 5)}`}
          </div>
        )}

        {neoCorrecao.equipe_nome && (
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{
              backgroundColor: `${corEquipe}15`,
              borderColor: `${corEquipe}40`,
              color: corEquipe
            }}
          >
            {neoCorrecao.equipe_nome}
          </Badge>
        )}

        {neoCorrecao.descricao && (
          <p className="text-muted-foreground italic line-clamp-2">
            {neoCorrecao.descricao}
          </p>
        )}

        {(neoCorrecao.valor_total > 0 || neoCorrecao.valor_a_receber > 0 || neoCorrecao.valor_a_receber_texto) && (
          <div className="flex items-center gap-3 text-sm">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            {neoCorrecao.valor_total > 0 && (
              <span className="text-muted-foreground">Total: {formatCurrency(neoCorrecao.valor_total)}</span>
            )}
            {(neoCorrecao.valor_a_receber_texto || neoCorrecao.valor_a_receber > 0) && (
              <span className="text-emerald-500">A receber: {neoCorrecao.valor_a_receber_texto || formatCurrency(neoCorrecao.valor_a_receber)}</span>
            )}
          </div>
        )}
      </div>

      {onConcluir && neoCorrecao.data_correcao && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={() => onConcluir(neoCorrecao.id)}
          disabled={isConcluindo}
        >
          <Check className="h-4 w-4 mr-1" />
          Concluir Correção
        </Button>
      )}
    </Card>
  );
}
