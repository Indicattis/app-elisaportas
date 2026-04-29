import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package, MapPin, Info, MoreVertical, Edit, XCircle } from "lucide-react";
import { OrdemCarregamento } from "@/types/ordemCarregamento";
import { Button } from "@/components/ui/button";

interface OrdemCarregamentoCardProps {
  ordem: OrdemCarregamento;
  onClick?: (ordem: OrdemCarregamento) => void;
  onEdit?: (ordem: OrdemCarregamento) => void;
  onRemoverDoCalendario?: (id: string) => void;
  dragListeners?: any;
}

export const OrdemCarregamentoCard = ({
  ordem,
  onClick,
  onEdit,
  onRemoverDoCalendario,
  dragListeners,
}: OrdemCarregamentoCardProps) => {
  const tipoEntrega = ordem.venda?.tipo_entrega;
  const tipoCarregamento = ordem.tipo_carregamento;

  // Lógica de cores
  const getCardStyles = () => {
    // Correção - Roxo (tem prioridade sobre tipo_entrega)
    if (ordem.fonte === 'correcoes') {
      return {
        backgroundColor: 'rgb(168 85 247 / 0.15)',
        borderColor: 'rgb(168 85 247 / 0.5)',
      };
    }

    // Entrega - Verde
    if (tipoEntrega === 'entrega') {
      return {
        backgroundColor: 'rgb(34 197 94 / 0.15)',
        borderColor: 'rgb(34 197 94 / 0.5)',
      };
    }

    // Instalação com Elisa - Azul
    if (tipoCarregamento === 'elisa') {
      return {
        backgroundColor: 'rgb(59 130 246 / 0.15)',
        borderColor: 'rgb(59 130 246 / 0.5)',
      };
    }

    // Instalação com Autorizado - Amarelo
    if (tipoCarregamento === 'autorizados') {
      return {
        backgroundColor: 'rgb(234 179 8 / 0.15)',
        borderColor: 'rgb(234 179 8 / 0.5)',
      };
    }

    // Fallback (não deve ocorrer com validação obrigatória)
    return {
      backgroundColor: 'rgb(107 114 128 / 0.15)',
      borderColor: 'rgb(107 114 128 / 0.5)',
    };
  };

  // Obter nome do responsável
  const getResponsavelNome = () => {
    // Se tem nome do responsável definido, usa ele
    if (ordem.responsavel_carregamento_nome) {
      return ordem.responsavel_carregamento_nome;
    }
    
    // Fallback para tipo genérico
    if (!tipoCarregamento) return 'Sem responsável';
    
    if (tipoEntrega === 'entrega') {
      if (tipoCarregamento === 'elisa') return 'Entrega Elisa';
      if (tipoCarregamento === 'terceiro') return 'Terceiro';
      return 'Autorizado';
    }
    
    if (tipoCarregamento === 'elisa') return 'Instalação Elisa';
    return 'Autorizado';
  };

  return (
    <Card 
      className="relative h-[35px] p-2 border transition-all duration-200 cursor-pointer hover:opacity-80"
      style={getCardStyles()}
      onClick={() => onClick?.(ordem)}
    >
      <div className="flex items-center justify-between gap-2 h-[19px]">
        <div className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing" {...dragListeners}>
          <h4 className="font-semibold text-xs truncate">{ordem.nome_cliente}</h4>
          <Badge 
            variant="secondary" 
            className="text-[9px] px-1 py-0 h-4 shrink-0"
          >
            {getResponsavelNome()}
          </Badge>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(onEdit || onRemoverDoCalendario) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                  <MoreVertical className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(ordem)}>
                    <Edit className="h-3.5 w-3.5 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onRemoverDoCalendario && (
                  <DropdownMenuItem 
                    onClick={() => onRemoverDoCalendario(ordem.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-2" />
                    Remover do calendário
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-0.5 hover:bg-accent rounded-md transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(ordem);
                  }}
                >
                  <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Ver detalhes
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
};
