import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pencil, Trash2, Upload, Boxes, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabelaPrecos, ItemTabelaPreco, ItemTabelaPrecoInput } from "@/hooks/useTabelaPrecos";
import { ItemModal } from "@/components/tabela-precos/ItemModal";
import { BulkUploadTabelaPrecos } from "@/components/tabela-precos/BulkUploadTabelaPrecos";
import { CatalogoPrecosTab } from "@/components/tabela-precos/CatalogoPrecosTab";
import { useKitsMontagemResumo } from "@/hooks/useKitMontagem";
import { useCustosItensPadroes } from "@/hooks/useCustosItens";
import { useQueryClient } from "@tanstack/react-query";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

interface TabelaPrecosProps {
  hideLucroColumn?: boolean;
  hideAcoesColumn?: boolean;
  hideCatalogoTab?: boolean;
  hideTotalColumn?: boolean;
  embedded?: boolean;
  enableReorder?: boolean;
  titleOverride?: string;
  subtitleOverride?: string;
  backPathOverride?: string;
  breadcrumbItemsOverride?: { label: string; path?: string }[];
}

export default function TabelaPrecos({
  hideLucroColumn = false,
  hideAcoesColumn = false,
  hideCatalogoTab = false,
  hideTotalColumn = false,
  embedded = false,
  enableReorder = false,
  titleOverride,
  subtitleOverride,
  backPathOverride,
  breadcrumbItemsOverride,
}: TabelaPrecosProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemTabelaPreco | null>(null);
  const [itemParaInativar, setItemParaInativar] = useState<ItemTabelaPreco | null>(null);
  const [activeTab, setActiveTab] = useState<'portas' | 'catalogo'>('portas');
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { itens, isLoading, adicionarItem, editarItem, inativarItem, reordenarItens } = useTabelaPrecos(searchTerm);
  const { data: resumoMontagem = {} } = useKitsMontagemResumo();
  const { padroes } = useCustosItensPadroes();

  // Estado local para reordenação otimista
  const [orderedItens, setOrderedItens] = useState<ItemTabelaPreco[]>([]);
  useEffect(() => {
    setOrderedItens(itens);
  }, [itens]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const canReorder = enableReorder && !searchTerm;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItens.findIndex((i) => i.id === active.id);
    const newIndex = orderedItens.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(orderedItens, oldIndex, newIndex);
    setOrderedItens(next);
    await reordenarItens(next.map((i) => i.id));
  };

  const sortableIds = useMemo(() => orderedItens.map((i) => i.id), [orderedItens]);

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['tabela-precos'] });
    setBulkUploadModalOpen(false);
  };

  const handleNovoItem = () => {
    setItemEditando(null);
    setModalOpen(true);
  };

  const handleEditarItem = (item: ItemTabelaPreco) => {
    setItemEditando(item);
    setModalOpen(true);
  };

  const handleSubmit = async (dados: ItemTabelaPrecoInput) => {
    if (itemEditando) {
      await editarItem({ id: itemEditando.id, dados });
    } else {
      await adicionarItem(dados);
    }
  };

  const handleConfirmarInativacao = async () => {
    if (itemParaInativar) {
      await inativarItem(itemParaInativar.id);
      setItemParaInativar(null);
    }
  };

  const calcularTotal = (item: ItemTabelaPreco) => {
    return item.valor_porta + item.valor_instalacao + item.valor_pintura;
  };

  const getLucroEfetivo = (item: ItemTabelaPreco): { value: number | null; fromMontagem: boolean; count: number } => {
    const r = resumoMontagem[item.id];
    if (r && r.count > 0) {
      const precoPorta = Number(item.valor_porta || 0);
      const taxas =
        (Number(padroes?.taxa_impostos ?? 0) +
          Number(padroes?.taxa_descontos ?? 0) +
          Number(padroes?.taxa_cartao ?? 0)) / 100;
      const lucroAdicional = precoPorta - r.custoTotal - precoPorta * taxas;
      return { value: lucroAdicional, fromMontagem: true, count: r.count };
    }
    return { value: null, fromMontagem: false, count: 0 };
  };


  const headerActions = activeTab === 'portas' ? (
    <div className="flex gap-2">
      <Button onClick={() => setBulkUploadModalOpen(true)} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
        <Upload className="h-4 w-4 mr-2" />
        Upload em Massa
      </Button>
      <Button onClick={handleNovoItem} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
        <Plus className="h-4 w-4 mr-2" />
        Novo Item
      </Button>
    </div>
  ) : null;

  if (embedded) {
    return (
      <>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-medium text-foreground">Itens Cadastrados</h2>
              <p className="text-xs text-muted-foreground">
                {itens.length} {itens.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou medidas..."
                className="pl-8 bg-card/60 border-border text-foreground placeholder:text-muted-foreground"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8"><p className="text-muted-foreground">Carregando...</p></div>
          ) : itens.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{searchTerm ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden bg-card/60 backdrop-blur-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-center text-xs font-medium text-muted-foreground w-12">#</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Descrição</TableHead>
                    <TableHead className="text-center text-xs font-medium text-blue-400">L</TableHead>
                    <TableHead className="text-center text-xs font-medium text-blue-400">A</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Valor Porta</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Valor Instalação</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Valor Pintura</TableHead>
                    {!hideTotalColumn && <TableHead className="text-right text-xs font-medium text-emerald-400">Total</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item, index) => {
                    const total = calcularTotal(item);
                    return (
                    <TableRow key={item.id} className={cn("border-border hover:bg-muted/40", index % 2 === 1 && "bg-muted/20")}>
                        <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">{item.descricao}</TableCell>
                        <TableCell className="text-center text-foreground/80">{item.largura}m</TableCell>
                        <TableCell className="text-center text-foreground/80">{item.altura}m</TableCell>
                        <TableCell className="text-right text-foreground/80">
                          {item.valor_porta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right text-foreground/80">
                          {item.valor_instalacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right text-foreground/80">
                          {item.valor_pintura.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        {!hideTotalColumn && (
                          <TableCell className="text-right font-semibold text-foreground">
                            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <MinimalistLayout
      title={titleOverride ?? "Tabela de Preços"}
      subtitle={subtitleOverride ?? "Gestão de preços das portas por tamanho"}
      backPath={backPathOverride ?? "/direcao/vendas"}
      breadcrumbItems={breadcrumbItemsOverride ?? [
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Vendas', path: '/direcao/vendas' },
        { label: 'Tabela de Preços' }
      ]}
      headerActions={headerActions}
      fullWidth
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'portas' | 'catalogo')} className="space-y-6">
        {!hideCatalogoTab && (
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="portas" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70">Portas</TabsTrigger>
            <TabsTrigger value="catalogo" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70">Catálogo</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="portas" className="space-y-6 mt-0">
        {/* Card Principal */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-white">Itens Cadastrados</CardTitle>
                <CardDescription className="text-white/50">
                  {itens.length} {itens.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar por descrição ou medidas..."
                  className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-white/50">Carregando...</p>
              </div>
            ) : itens.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/50">
                  {searchTerm ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      {enableReorder && <TableHead className="w-10 text-white/60"></TableHead>}
                      <TableHead className="text-center text-white/60 w-12">#</TableHead>
                      <TableHead className="text-white/60">Descrição</TableHead>
                      <TableHead className="text-center text-white/60">Largura</TableHead>
                      <TableHead className="text-center text-white/60">Altura</TableHead>
                      <TableHead className="text-right text-white/60">Valor Porta</TableHead>
                      {!hideLucroColumn && <TableHead className="text-right hidden md:table-cell text-white/60">Lucro</TableHead>}
                      {!hideLucroColumn && <TableHead className="text-right hidden md:table-cell text-white/60">% Lucro</TableHead>}
                      <TableHead className="text-right hidden md:table-cell text-white/60">Valor Instalação</TableHead>
                      <TableHead className="text-right hidden md:table-cell text-white/60">Lucro Instalação</TableHead>
                      <TableHead className="text-right hidden md:table-cell text-white/60">% Lucro Inst.</TableHead>
                      <TableHead className="text-right hidden md:table-cell text-white/60">Valor Pintura</TableHead>
                      <TableHead className="text-right hidden md:table-cell text-white/60">Lucro Pintura</TableHead>
                      <TableHead className="text-right hidden md:table-cell text-white/60">% Lucro Pint.</TableHead>
                      {!hideTotalColumn && <TableHead className="text-right text-white/60">Total</TableHead>}
                      {!hideAcoesColumn && <TableHead className="text-center text-white/60">Montagem</TableHead>}
                      {!hideAcoesColumn && <TableHead className="text-center w-24 text-white/60">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                    onDragEnd={canReorder ? handleDragEnd : undefined}
                  >
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {orderedItens.map((item, index) => {
                      const total = calcularTotal(item);
                      const lucroInfo = getLucroEfetivo(item);
                      return (
                        <SortableKitRow key={item.id} id={item.id} enabled={canReorder} showHandle={enableReorder} index={index}>
                          <TableCell className="text-center text-white/60">{index + 1}</TableCell>
                          <TableCell className="font-medium text-white">{item.descricao}</TableCell>
                          <TableCell className="text-center text-blue-400">{item.largura}m</TableCell>
                          <TableCell className="text-center text-blue-400">{item.altura}m</TableCell>
                          <TableCell className="text-right text-white/70">
                            {item.valor_porta.toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </TableCell>
                          {!hideLucroColumn && (() => {
                            if (lucroInfo.value === null) {
                              return (
                                <TableCell className="text-right hidden md:table-cell text-white/30">—</TableCell>
                              );
                            }
                            const lucro = lucroInfo.value;
                            const totalLocal = calcularTotal(item);
                            const pct = totalLocal > 0 ? (lucro / totalLocal) * 100 : 0;
                            const cor = pct > 0 ? "text-emerald-400" : pct < 0 ? "text-red-400" : "text-white/60";
                            return (
                              <TableCell className={`text-right hidden md:table-cell ${cor}`}>
                                <span title="Calculado pela montagem do kit">
                                  {lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </TableCell>
                            );
                          })()}
                          {!hideLucroColumn && (() => {
                            if (lucroInfo.value === null) {
                              return (
                                <TableCell className="text-right hidden md:table-cell text-white/30">—</TableCell>
                              );
                            }
                            const lucro = lucroInfo.value;
                            const precoPorta = Number(item.valor_porta || 0);
                            const pct = precoPorta > 0 ? (lucro / precoPorta) * 100 : 0;
                            return (
                              <TableCell className="text-right hidden md:table-cell font-medium text-orange-400">
                                {pct.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                              </TableCell>
                            );
                          })()}
                          <TableCell className="text-right hidden md:table-cell text-white/70">
                            {item.valor_instalacao.toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell text-emerald-400">
                            {(item.valor_instalacao * 0.8).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell font-medium text-orange-400">
                            80,00%
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell text-white/70">
                            {item.valor_pintura.toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell text-emerald-400">
                            {(item.valor_pintura * 0.3).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell font-medium text-orange-400">
                            30,00%
                          </TableCell>
                          {!hideTotalColumn && <TableCell className="text-right">
                            <Badge className="font-semibold bg-white/10 text-white">
                              {total.toLocaleString('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              })}
                            </Badge>
                          </TableCell>}
                          {!hideAcoesColumn && (
                            <TableCell className="text-center">
                              {lucroInfo.fromMontagem ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/direcao/estrategia/kits/${item.id}/montagem`)}
                                  className="h-7 gap-1.5 text-white/80 hover:text-white hover:bg-white/10"
                                  title="Editar montagem"
                                >
                                  <Boxes className="h-3.5 w-3.5" />
                                  <span className="text-xs">{lucroInfo.count} {lucroInfo.count === 1 ? 'item' : 'itens'}</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/direcao/estrategia/kits/${item.id}/montagem`)}
                                  className="h-7 gap-1.5 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/30"
                                  title="Configurar montagem"
                                >
                                  <Boxes className="h-3.5 w-3.5" />
                                  <span className="text-xs">Sem montagem</span>
                                </Button>
                              )}
                            </TableCell>
                          )}
                          {!hideAcoesColumn && <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditarItem(item)}
                                title="Editar"
                                className="text-white/60 hover:text-white hover:bg-white/10"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setItemParaInativar(item)}
                                title="Inativar"
                                className="text-red-400 hover:text-red-300 hover:bg-white/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>}
                        </SortableKitRow>
                      );
                    })}
                  </TableBody>
                    </SortableContext>
                  </DndContext>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="catalogo" className="mt-0">
          <CatalogoPrecosTab />
        </TabsContent>
      </Tabs>

      {/* Modal de Adicionar/Editar */}
      <ItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleSubmit}
        itemEditando={itemEditando}
      />

      {/* Modal de Upload em Massa */}
      <Dialog open={bulkUploadModalOpen} onOpenChange={setBulkUploadModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload em Massa</DialogTitle>
          </DialogHeader>
          <BulkUploadTabelaPrecos onUploadComplete={handleUploadComplete} />
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Inativação */}
      <AlertDialog open={!!itemParaInativar} onOpenChange={() => setItemParaInativar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar o item "{itemParaInativar?.descricao}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarInativacao}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}

function SortableKitRow({
  id,
  enabled,
  showHandle,
  index,
  children,
}: {
  id: string;
  enabled: boolean;
  showHandle: boolean;
  index?: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("border-white/10 hover:bg-white/5", typeof index === "number" && index % 2 === 1 && "bg-white/[0.03]")}
    >
      {showHandle && (
        <TableCell className="w-10">
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={!enabled}
            className={`flex items-center justify-center text-white/40 hover:text-white/80 ${enabled ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-40"}`}
            title={enabled ? "Arraste para reordenar" : "Limpe a busca para reordenar"}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </TableCell>
      )}
      {children}
    </TableRow>
  );
}
