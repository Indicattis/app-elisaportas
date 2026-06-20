import { useState } from 'react';
import { Building2, ChevronDown, Edit, Star, Trash2, Pencil, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Cidade, AutorizadoResumo } from '@/hooks/useEstadosCidades';

interface CidadeCollapsibleProps {
  cidade: Cidade;
  onEditAutorizado: (id: string) => void;
  onDeleteAutorizado: (id: string) => void;
  onTogglePremium: (id: string, isPremium: boolean) => void;
  onEditCidade?: (cidade: Cidade) => void;
  onDeleteCidade?: (id: string) => void;
  dragHandleProps?: Record<string, any>;
}

export function CidadeCollapsible({
  cidade,
  onEditAutorizado,
  onDeleteAutorizado,
  onTogglePremium,
  onEditCidade,
  onDeleteCidade,
  dragHandleProps,
}: CidadeCollapsibleProps) {
  const [open, setOpen] = useState(false);

  const totalAutorizados = cidade.autorizados.length;
  const totalPremium = cidade.autorizados.filter(a => a.etapa === 'premium').length;
  const isGreen = totalPremium >= 2;
  const isRed = totalAutorizados === 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg transition-colors border",
          isGreen
            ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20"
            : isRed
              ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20"
              : "bg-white/5 hover:bg-white/10 border-transparent"
        )}>
          <div className="flex items-center gap-2">
            {dragHandleProps && (
              <button
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 touch-none"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-white/40" />
              </button>
            )}
            <Building2 className={cn("h-4 w-4", isGreen ? "text-emerald-400" : isRed ? "text-red-400" : "text-white/60")} />
            <span className="font-medium text-white">{cidade.nome}</span>
            <Badge variant="secondary" className={cn(
              "text-xs",
              isGreen
                ? "bg-emerald-500/20 text-emerald-400"
                : isRed
                  ? "bg-red-500/20 text-red-400"
                  : "bg-primary/20 text-primary"
            )}>
              {totalAutorizados} autorizados
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onEditCidade && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCidade(cidade);
                }}
              >
                <Pencil className="h-3.5 w-3.5 text-white/60" />
              </Button>
            )}
            {onDeleteCidade && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir cidade?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Os autorizados não serão excluídos, apenas ficarão sem cidade cadastrada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteCidade(cidade.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180", isGreen ? "text-emerald-400" : isRed ? "text-red-400" : "text-white/60")} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {cidade.autorizados.length === 0 ? (
          <div className="p-4 text-center text-white/50 text-sm">
            Nenhum autorizado nesta cidade
          </div>
        ) : (
          <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs text-white/70 w-10"></TableHead>
                  <TableHead className="text-xs text-white/70">Autorizado</TableHead>
                  <TableHead className="text-xs text-white/70">Etapa</TableHead>
                  <TableHead className="text-xs text-white/70">Vendedor Resp.</TableHead>
                  <TableHead className="text-xs text-white/70">Cidades Sec.</TableHead>
                  <TableHead className="text-xs text-white/70">Chave Pix</TableHead>
                  <TableHead className="text-xs text-white/70 text-center">P</TableHead>
                  <TableHead className="text-xs text-white/70 text-center">G</TableHead>
                  <TableHead className="text-xs text-white/70 text-center">GG</TableHead>
                  <TableHead className="text-right text-xs text-white/70">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...cidade.autorizados]
                  .sort((a, b) => (a.etapa === 'premium' ? -1 : 1) - (b.etapa === 'premium' ? -1 : 1))
                  .map(aut => (
                  <AutorizadoRow
                    key={aut.id}
                    autorizado={aut}
                    onEdit={onEditAutorizado}
                    onDelete={onDeleteAutorizado}
                    onTogglePremium={onTogglePremium}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SortableCidadeCollapsible(props: Omit<CidadeCollapsibleProps, 'dragHandleProps'>) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.cidade.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CidadeCollapsible {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

interface AutorizadoRowProps {
  autorizado: AutorizadoResumo;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePremium: (id: string, isPremium: boolean) => void;
}

function AutorizadoRow({ autorizado, onEdit, onDelete, onTogglePremium }: AutorizadoRowProps) {
  const isPremium = autorizado.etapa === 'premium';
  const formatCurrency = (val?: number) => val != null ? `R$ ${val.toFixed(2)}` : '-';
  
  return (
    <TableRow className="border-white/10 hover:bg-white/5">
      <TableCell className="w-10 pr-0">
        <Avatar className="h-7 w-7">
          {autorizado.logo_url && <AvatarImage src={autorizado.logo_url} alt={autorizado.nome} />}
          <AvatarFallback className="text-[10px] bg-white/10 text-white/70">
            {autorizado.nome.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="font-medium text-white">
        {autorizado.nome}
        {isPremium && (
          <Star className="inline h-3.5 w-3.5 ml-1 text-yellow-500 fill-yellow-500" />
        )}
      </TableCell>
      <TableCell>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            isPremium 
              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          )}
        >
          {autorizado.etapa || 'ativo'}
        </Badge>
      </TableCell>
      <TableCell className="text-white/70 text-xs">
        {autorizado.vendedorResponsavelNome || '-'}
      </TableCell>
      <TableCell className="text-white/60 text-xs max-w-[150px]">
        {autorizado.cidadesSecundarias && autorizado.cidadesSecundarias.length > 0
          ? autorizado.cidadesSecundarias.join(', ')
          : '-'}
      </TableCell>
      <TableCell className="text-white/70 text-xs max-w-[180px] truncate" title={autorizado.chave_pix || ''}>
        {autorizado.chave_pix || '-'}
      </TableCell>
      <TableCell className="text-center text-white/80">{formatCurrency(autorizado.precos?.P)}</TableCell>
      <TableCell className="text-center text-white/80">{formatCurrency(autorizado.precos?.G)}</TableCell>
      <TableCell className="text-center text-white/80">{formatCurrency(autorizado.precos?.GG)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7 hover:bg-white/10"
            onClick={() => onEdit(autorizado.id)}
          >
            <Edit className="h-3.5 w-3.5 text-white/60" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7 hover:bg-white/10"
            onClick={() => onTogglePremium(autorizado.id, isPremium)}
          >
            <Star className={cn(
              "h-3.5 w-3.5",
              isPremium ? "fill-yellow-500 text-yellow-500" : "text-white/60"
            )} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir autorizado?</AlertDialogTitle>
                <AlertDialogDescription>
                  O autorizado "{autorizado.nome}" será desativado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(autorizado.id)}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Componente para lista de órfãos
interface OrfaosCollapsibleProps {
  autorizados: AutorizadoResumo[];
  onEditAutorizado: (id: string) => void;
  onDeleteAutorizado: (id: string) => void;
  onTogglePremium: (id: string, isPremium: boolean) => void;
}

export function OrfaosCollapsible({
  autorizados,
  onEditAutorizado,
  onDeleteAutorizado,
  onTogglePremium
}: OrfaosCollapsibleProps) {
  const [open, setOpen] = useState(false);

  if (autorizados.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/20">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" />
            <span className="font-medium text-amber-300">Sem cidade cadastrada</span>
            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">
              {autorizados.length} autorizados
            </Badge>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-amber-400 transition-transform", open && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm">
          <Table className="text-xs">
              <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-xs text-white/70 w-10"></TableHead>
                <TableHead className="text-xs text-white/70">Autorizado</TableHead>
                <TableHead className="text-xs text-white/70">Cidade (texto)</TableHead>
                <TableHead className="text-xs text-white/70">Etapa</TableHead>
                <TableHead className="text-xs text-white/70">Vendedor Resp.</TableHead>
                <TableHead className="text-xs text-white/70">Cidades Sec.</TableHead>
                <TableHead className="text-xs text-white/70">Chave Pix</TableHead>
                <TableHead className="text-xs text-white/70 text-center">P</TableHead>
                <TableHead className="text-xs text-white/70 text-center">G</TableHead>
                <TableHead className="text-xs text-white/70 text-center">GG</TableHead>
                <TableHead className="text-right text-xs text-white/70">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...autorizados]
                .sort((a, b) => (a.etapa === 'premium' ? -1 : 1) - (b.etapa === 'premium' ? -1 : 1))
                .map(aut => (
                <TableRow key={aut.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="w-10 pr-0">
                    <Avatar className="h-7 w-7">
                      {aut.logo_url && <AvatarImage src={aut.logo_url} alt={aut.nome} />}
                      <AvatarFallback className="text-[10px] bg-white/10 text-white/70">
                        {aut.nome.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {aut.nome}
                    {aut.etapa === 'premium' && (
                      <Star className="inline h-3.5 w-3.5 ml-1 text-yellow-500 fill-yellow-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-white/60">
                    {aut.cidade || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        aut.etapa === 'premium' 
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      )}
                    >
                      {aut.etapa || 'ativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/70 text-xs">
                    {aut.vendedorResponsavelNome || '-'}
                  </TableCell>
                  <TableCell className="text-white/60 text-xs max-w-[150px]">
                    {aut.cidadesSecundarias && aut.cidadesSecundarias.length > 0
                      ? aut.cidadesSecundarias.join(', ')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-white/70 text-xs max-w-[180px] truncate" title={aut.chave_pix || ''}>
                    {aut.chave_pix || '-'}
                  </TableCell>
                  <TableCell className="text-center text-white/80">{aut.precos?.P != null ? `R$ ${aut.precos.P.toFixed(2)}` : '-'}</TableCell>
                  <TableCell className="text-center text-white/80">{aut.precos?.G != null ? `R$ ${aut.precos.G.toFixed(2)}` : '-'}</TableCell>
                  <TableCell className="text-center text-white/80">{aut.precos?.GG != null ? `R$ ${aut.precos.GG.toFixed(2)}` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 hover:bg-white/10"
                        onClick={() => onEditAutorizado(aut.id)}
                      >
                        <Edit className="h-3.5 w-3.5 text-white/60" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 hover:bg-white/10"
                        onClick={() => onTogglePremium(aut.id, aut.etapa === 'premium')}
                      >
                        <Star className={cn(
                          "h-3.5 w-3.5",
                          aut.etapa === 'premium' ? "fill-yellow-500 text-yellow-500" : "text-white/60"
                        )} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir autorizado?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O autorizado "{aut.nome}" será desativado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteAutorizado(aut.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
