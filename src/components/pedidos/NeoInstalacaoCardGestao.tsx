import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { CronometroEtapaBadge } from "./CronometroEtapaBadge";
import { 
  MapPin, 
  Calendar, 
  CalendarPlus,
  Clock, 
  CheckCircle, 
  Hammer,
  Users,
  FileText,
  DollarSign,
  Undo2,
  GripVertical,
  Archive,
  Pencil
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NeoInstalacao } from "@/types/neoInstalacao";
import { formatCurrency } from "@/lib/utils";

interface NeoInstalacaoCardGestaoProps {
  neoInstalacao: NeoInstalacao;
  viewMode?: 'grid' | 'list';
  onConcluir?: (id: string) => void;
  isConcluindo?: boolean;
  showConcluido?: boolean;
  showAguardandoCliente?: boolean;
  onRetornar?: (id: string) => void;
  onAgendar?: (id: string) => void;
  onArquivar?: (id: string) => void;
  onEditar?: (neo: NeoInstalacao) => void;
  onEnviarAguardandoCliente?: (id: string) => void;
  onRetornarParaFinalizado?: (id: string) => void;
  onUpdateValor?: (id: string, data: { valor_a_receber: number | null; valor_a_receber_texto: string }) => Promise<void>;
  dragHandleProps?: Record<string, any>;
  isDragging?: boolean;
}

export function NeoInstalacaoCardGestao({
  neoInstalacao,
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
}: NeoInstalacaoCardGestaoProps) {
  const [popoverValorOpen, setPopoverValorOpen] = useState(false);
  const [valorTexto, setValorTexto] = useState('');
  const corEquipe = neoInstalacao.equipe?.cor || "#6366f1";

  // Dados do criador
  const criadorNome = neoInstalacao.criador?.nome || 'Desconhecido';
  const criadorFoto = neoInstalacao.criador?.foto_perfil_url;
  const criadorIniciais = criadorNome
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const atrasado = (() => {
    const dataStr = neoInstalacao.data_instalacao;
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
                    <AvatarFallback className="text-[8px] bg-blue-500/20 text-blue-400 border border-blue-500/50">
                      {criadorIniciais}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Criado por: {criadorNome}</p>
                  <p className="text-[10px] text-muted-foreground">Instalação Avulsa</p>
                </TooltipContent>
              </Tooltip>

              {/* Col 3: Símbolos placeholder */}
              <div />
              
              {/* Col 4: Nome do cliente */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {neoInstalacao.nome_cliente && neoInstalacao.nome_cliente.length > 20 
                        ? `${neoInstalacao.nome_cliente.substring(0, 20)}...` 
                        : neoInstalacao.nome_cliente}
                    </h3>
                    {neoInstalacao.descricao && (
                      <p className="text-[9px] text-muted-foreground truncate leading-tight -mt-0.5">
                        {neoInstalacao.descricao}
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{neoInstalacao.nome_cliente}</p>
                  {neoInstalacao.descricao && (
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[250px]">{neoInstalacao.descricao}</p>
                  )}
                </TooltipContent>
              </Tooltip>

              {/* Col 5: Cidade/Estado */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center text-center">
                    <span className="text-[10px] text-muted-foreground truncate">
                      {neoInstalacao.cidade && neoInstalacao.estado 
                        ? `${neoInstalacao.cidade}/${neoInstalacao.estado}`
                        : neoInstalacao.cidade || neoInstalacao.estado || '—'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {neoInstalacao.cidade}, {neoInstalacao.estado}
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
                {neoInstalacao.data_instalacao ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center leading-tight cursor-help">
                        <span className={`text-[9px] font-medium ${atrasado ? 'text-red-500' : 'text-blue-400'}`}>
                          {atrasado ? 'Atrasado' : 'Agendado'}
                        </span>
                        <span className={`text-xs font-bold ${atrasado ? 'text-red-500' : 'text-blue-400'}`}>
                          {format(parseISO(neoInstalacao.data_instalacao), "dd/MM/yy")}
                        </span>
                      </div>
                    </TooltipTrigger>
                    {neoInstalacao.vezes_agendado >= 2 && (
                      <TooltipContent>
                        <p className="text-xs">Reagendado {neoInstalacao.vezes_agendado} vezes</p>
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
                {neoInstalacao.equipe_nome ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className="text-[10px] font-medium truncate block cursor-help"
                        style={{ color: corEquipe }}
                      >
                        {neoInstalacao.equipe_nome.length > 10 
                          ? `${neoInstalacao.equipe_nome.substring(0, 10)}...` 
                          : neoInstalacao.equipe_nome}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{neoInstalacao.equipe_nome}</p>
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
                  className="text-[9px] px-1 py-0 h-4 text-blue-400 bg-blue-500/20 border-blue-500/50"
                >
                  AVULSO
                </Badge>
              </div>

              {/* Col 12: Tags/Badges (Instalação) */}
              <div className="flex items-center justify-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-blue-500/10 text-blue-400 border-blue-500/50">
                  <Hammer className="h-2.5 w-2.5" />
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
                      {neoInstalacao.valor_total ? formatCurrency(neoInstalacao.valor_total).replace('R$\u00a0', '') : '—'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Valor Total: {formatCurrency(neoInstalacao.valor_total || 0)}</p></TooltipContent>
                </Tooltip>
              </div>

              {/* Col 15: Valor a Receber */}
              <div className="text-center">
                {onUpdateValor ? (
                  <Popover open={popoverValorOpen} onOpenChange={(open) => {
                    setPopoverValorOpen(open);
                    if (open) {
                      setValorTexto(neoInstalacao.valor_a_receber_texto || (neoInstalacao.valor_a_receber ? formatCurrency(neoInstalacao.valor_a_receber).replace('R$\u00a0', '') : ''));
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <button
                        className={`text-[10px] font-medium cursor-pointer hover:underline ${
                          (neoInstalacao.valor_a_receber_texto || neoInstalacao.valor_a_receber) ? 'text-emerald-400' : 'text-muted-foreground/50'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {neoInstalacao.valor_a_receber_texto || (neoInstalacao.valor_a_receber ? formatCurrency(neoInstalacao.valor_a_receber).replace('R$\u00a0', '') : '—')}
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
                              onUpdateValor(neoInstalacao.id, {
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
                            onUpdateValor(neoInstalacao.id, {
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
                      <span className={`text-[10px] font-medium cursor-help ${(neoInstalacao.valor_a_receber_texto || neoInstalacao.valor_a_receber) ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
                        {neoInstalacao.valor_a_receber_texto || (neoInstalacao.valor_a_receber ? formatCurrency(neoInstalacao.valor_a_receber).replace('R$\u00a0', '') : '—')}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">A Receber: {neoInstalacao.valor_a_receber_texto || formatCurrency(neoInstalacao.valor_a_receber || 0)}</p></TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Col 16-22: Data criação + Cronômetro (span across ordens + tempo cols) */}
              <div style={{ gridColumn: '16 / 23' }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-1 cursor-help">
                      <span className="text-[9px] text-muted-foreground leading-none">
                        {format(new Date(neoInstalacao.created_at), "dd/MM/yy")}
                      </span>
                      <CronometroEtapaBadge dataEntrada={neoInstalacao.created_at} compact />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Criado em: {format(new Date(neoInstalacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    {neoInstalacao.hora && (
                      <p className="text-[10px] text-muted-foreground">Hora agendada: {neoInstalacao.hora.substring(0, 5)}</p>
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
                    className="flex h-[20px] w-[20px] rounded-[3px] bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditar(neoInstalacao);
                    }}
                    title="Editar Neo Instalação"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {onAgendar && !showConcluido && !neoInstalacao.data_instalacao && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="flex h-[20px] w-[20px] rounded-[3px] bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAgendar(neoInstalacao.id);
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
                        className="flex h-[20px] w-[20px] rounded-[3px] bg-amber-600 text-white hover:bg-amber-700 border-amber-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetornar(neoInstalacao.id);
                        }}
                        title="Enviar para correções"
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    )}
                    {onEnviarAguardandoCliente && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="flex h-[20px] w-[20px] rounded-[3px] bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEnviarAguardandoCliente(neoInstalacao.id);
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
                        className="flex h-[20px] w-[20px] rounded-[3px] bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArquivar(neoInstalacao.id);
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
                        className="flex h-[20px] w-[20px] rounded-[3px] bg-green-600 text-white hover:bg-green-700 border-green-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetornarParaFinalizado(neoInstalacao.id);
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
                        className="flex h-[20px] w-[20px] rounded-[3px] bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArquivar(neoInstalacao.id);
                        }}
                        title="Arquivar"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                ) : onConcluir && neoInstalacao.data_instalacao && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="flex h-[20px] w-[20px] rounded-[3px] bg-green-600 text-white hover:bg-green-700 border-green-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConcluir(neoInstalacao.id);
                    }}
                    disabled={isConcluindo}
                    title="Concluir instalação"
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  // View mode: grid
  return (
    <Card className="p-4 border-l-4 h-full flex flex-col" style={{ borderLeftColor: corEquipe }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <Badge 
          variant="outline" 
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          <Hammer className="h-3 w-3 mr-1" />
          Avulso
        </Badge>
        <Badge 
          variant="secondary" 
          style={{ 
            backgroundColor: `${corEquipe}20`,
            color: corEquipe,
          }}
        >
          {neoInstalacao.equipe_nome || "Sem equipe"}
        </Badge>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{neoInstalacao.nome_cliente}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{neoInstalacao.cidade}/{neoInstalacao.estado}</span>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {neoInstalacao.data_instalacao && (
            <div className={`flex items-center gap-1 ${atrasado ? 'text-red-500' : ''}`}>
              <Calendar className="h-4 w-4" />
              <span>
                {format(parseISO(neoInstalacao.data_instalacao), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          )}
          {neoInstalacao.hora && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{neoInstalacao.hora.substring(0, 5)}</span>
            </div>
          )}
        </div>

        {(neoInstalacao.valor_total > 0 || neoInstalacao.valor_a_receber > 0 || neoInstalacao.valor_a_receber_texto) && (
          <div className="flex items-center gap-3 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {neoInstalacao.valor_total > 0 && (
              <span className="text-muted-foreground">Total: {formatCurrency(neoInstalacao.valor_total)}</span>
            )}
            {(neoInstalacao.valor_a_receber_texto || neoInstalacao.valor_a_receber > 0) && (
              <span className="text-emerald-500">A receber: {neoInstalacao.valor_a_receber_texto || formatCurrency(neoInstalacao.valor_a_receber)}</span>
            )}
          </div>
        )}

        {neoInstalacao.descricao && (
          <div className="text-sm text-muted-foreground line-clamp-2 pt-2 border-t">
            {neoInstalacao.descricao}
          </div>
        )}
      </div>

      {onConcluir && neoInstalacao.data_instalacao && (
        <div className="mt-3 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => onConcluir(neoInstalacao.id)}
            disabled={isConcluindo}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Concluir Instalação
          </Button>
        </div>
      )}
    </Card>
  );
}
