import { useState, useRef, useEffect } from "react";
import { Search, Plus, Pencil, Trash2, Upload, Check, X } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { MinimalistLayout } from "@/components/MinimalistLayout";

interface TabelaPrecosProps {
  hideLucroColumn?: boolean;
  hideAcoesColumn?: boolean;
  hideCatalogoTab?: boolean;
  titleOverride?: string;
  subtitleOverride?: string;
  backPathOverride?: string;
  breadcrumbItemsOverride?: { label: string; path?: string }[];
}

export default function TabelaPrecos({
  hideLucroColumn = false,
  hideAcoesColumn = false,
  hideCatalogoTab = false,
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
  const [alturaRapida, setAlturaRapida] = useState('');
  const [larguraRapida, setLarguraRapida] = useState('');
  const [editingLucroId, setEditingLucroId] = useState<string | null>(null);
  const [editingLucroValue, setEditingLucroValue] = useState('');
  const [activeTab, setActiveTab] = useState<'portas' | 'catalogo'>('portas');
  const lucroInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { itens, isLoading, adicionarItem, editarItem, inativarItem } = useTabelaPrecos(searchTerm);

  useEffect(() => {
    if (editingLucroId && lucroInputRef.current) {
      lucroInputRef.current.focus();
      lucroInputRef.current.select();
    }
  }, [editingLucroId]);

  const handleStartEditLucro = (item: ItemTabelaPreco) => {
    setEditingLucroId(item.id);
    setEditingLucroValue(String(item.lucro || 0));
  };

  const handleSaveLucro = async (id: string) => {
    const valor = parseFloat(editingLucroValue);
    if (!isNaN(valor) && valor >= 0) {
      await editarItem({ id, dados: { lucro: valor } });
    }
    setEditingLucroId(null);
  };

  const handleCancelLucro = () => {
    setEditingLucroId(null);
  };

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

  // Busca rápida por dimensões aproximadas
  const itemEncontrado = (() => {
    if (!alturaRapida || !larguraRapida) return null;
    
    const alturaNum = parseFloat(alturaRapida);
    const larguraNum = parseFloat(larguraRapida);
    
    if (isNaN(alturaNum) || isNaN(larguraNum)) return null;
    
    // Encontrar o item com a menor diferença total de dimensões
    let menorDiferenca = Infinity;
    let itemMaisProximo: ItemTabelaPreco | null = null;
    
    itens.forEach((item) => {
      const diferencaAltura = Math.abs(item.altura - alturaNum);
      const diferencaLargura = Math.abs(item.largura - larguraNum);
      const diferencaTotal = diferencaAltura + diferencaLargura;
      
      if (diferencaTotal < menorDiferenca) {
        menorDiferenca = diferencaTotal;
        itemMaisProximo = item;
      }
    });
    
    return itemMaisProximo;
  })();

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

  return (
    <MinimalistLayout
      title="Tabela de Preços"
      subtitle="Gestão de preços das portas por tamanho"
      backPath="/direcao/vendas"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Vendas', path: '/direcao/vendas' },
        { label: 'Tabela de Preços' }
      ]}
      headerActions={headerActions}
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'portas' | 'catalogo')} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="portas" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70">Portas</TabsTrigger>
          <TabsTrigger value="catalogo" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70">Catálogo</TabsTrigger>
        </TabsList>

        <TabsContent value="portas" className="space-y-6 mt-0">
        {/* Card de Pesquisa Rápida */}
        <Card className="border border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <Search className="h-5 w-5" />
              Pesquisa Rápida de Orçamento
            </CardTitle>
            <CardDescription className="text-white/50">
              Informe as dimensões da porta para calcular o orçamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Largura (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 2.10"
                  value={larguraRapida}
                  onChange={(e) => setLarguraRapida(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Altura (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 0.80"
                  value={alturaRapida}
                  onChange={(e) => setAlturaRapida(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Resultado</label>
                {alturaRapida && larguraRapida ? (
                  itemEncontrado ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-blue-500/30">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{itemEncontrado.descricao}</span>
                          <span className="text-xs text-white/50">
                            {itemEncontrado.largura}m × {itemEncontrado.altura}m
                          </span>
                        </div>
                        <Badge className="text-base font-bold bg-blue-600 text-white">
                          {calcularTotal(itemEncontrado).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </Badge>
                      </div>
                      <div className="text-xs text-white/40 px-1">
                        Porta: {itemEncontrado.valor_porta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
                        Instalação: {itemEncontrado.valor_instalacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
                        Pintura: {itemEncontrado.valor_pintura.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
                        Lucro: {(itemEncontrado.lucro || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-10 px-4 bg-white/5 rounded-lg border border-white/10 border-dashed">
                      <span className="text-sm text-white/40">Nenhum item cadastrado</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-10 px-4 bg-white/5 rounded-lg border border-white/10 border-dashed">
                    <span className="text-sm text-white/40">Preencha as dimensões</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                      <TableHead className="text-white/60">Descrição</TableHead>
                      <TableHead className="text-center text-white/60">Largura</TableHead>
                      <TableHead className="text-center text-white/60">Altura</TableHead>
                      <TableHead className="text-right text-white/60">Valor Porta</TableHead>
                      <TableHead className="text-right hidden md:table-cell text-white/60">Valor Instalação</TableHead>
                      <TableHead className="text-right hidden md:table-cell text-white/60">Valor Pintura</TableHead>
                      <TableHead className="text-right text-white/60">Total</TableHead>
                      <TableHead className="text-right hidden md:table-cell text-white/60">Lucro</TableHead>
                      <TableHead className="text-center w-24 text-white/60">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => {
                      const total = calcularTotal(item);
                      return (
                        <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium text-white">{item.descricao}</TableCell>
                          <TableCell className="text-center text-white/70">{item.largura}m</TableCell>
                          <TableCell className="text-center text-white/70">{item.altura}m</TableCell>
                          <TableCell className="text-right text-white/70">
                            {item.valor_porta.toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell text-white/70">
                            {item.valor_instalacao.toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell text-white/70">
                            {item.valor_pintura.toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="font-semibold bg-white/10 text-white">
                              {total.toLocaleString('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell">
                            {editingLucroId === item.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  ref={lucroInputRef}
                                  type="number"
                                  step="0.01"
                                  value={editingLucroValue}
                                  onChange={(e) => setEditingLucroValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveLucro(item.id);
                                    if (e.key === 'Escape') handleCancelLucro();
                                  }}
                                  className="w-28 h-7 text-right text-sm bg-white/10 border-white/20 text-white"
                                />
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={() => handleSaveLucro(item.id)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={handleCancelLucro}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer text-white/70 hover:text-white hover:underline decoration-dashed underline-offset-4 transition-colors"
                                onClick={() => handleStartEditLucro(item)}
                                title="Clique para editar"
                              >
                                {(item.lucro || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
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
