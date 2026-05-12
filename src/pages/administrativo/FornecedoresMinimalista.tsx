import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useFornecedores, Fornecedor } from "@/hooks/useFornecedores";
import { FornecedorForm } from "@/components/compras/FornecedorForm";
import { MinimalistLayout } from "@/components/MinimalistLayout";

export default function FornecedoresMinimalista() {
  const { fornecedores, isLoading, createFornecedor, updateFornecedor, deleteFornecedor, isCreating, isUpdating, isDeleting } = useFornecedores();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<string | null>(null);

  const handleEdit = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedFornecedor(undefined);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setFornecedorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (fornecedorToDelete) {
      await deleteFornecedor(fornecedorToDelete);
      setDeleteDialogOpen(false);
      setFornecedorToDelete(null);
    }
  };

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Administrativo', path: '/administrativo' },
    { label: 'Compras', path: '/administrativo/compras' },
    { label: 'Fornecedores' }
  ];

  const headerActions = (
    <Button 
      onClick={handleNew}
      className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0"
      size="sm"
    >
      <Plus className="h-4 w-4 mr-2" />
      Novo Fornecedor
    </Button>
  );

  return (
    <MinimalistLayout
      title="Fornecedores"
      subtitle="Gestão de fornecedores"
      backPath="/administrativo/compras"
      headerActions={headerActions}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        <div className="p-4 rounded-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Lista de Fornecedores</h3>
            <p className="text-sm text-white/60">
              {fornecedores.length} fornecedor(es) cadastrado(s)
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-white/40">
              Carregando fornecedores...
            </div>
          ) : fornecedores.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              Nenhum fornecedor cadastrado. Clique em "Novo Fornecedor" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-20 text-white/60">Código</TableHead>
                  <TableHead className="text-white/60">Tipo</TableHead>
                  <TableHead className="text-white/60">Nome</TableHead>
                  <TableHead className="text-white/60">Responsável</TableHead>
                  <TableHead className="text-white/60">CNPJ/CPF</TableHead>
                  <TableHead className="text-white/60">Cidade/Estado</TableHead>
                  <TableHead className="text-right text-white/60">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-mono text-white/70">
                      #{String(fornecedor.codigo).padStart(4, "0")}
                    </TableCell>
                    <TableCell>
                      <Badge className={fornecedor.tipo === "juridica" 
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                        : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                      }>
                        {fornecedor.tipo === "juridica" ? "PJ" : "PF"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-white">{fornecedor.nome}</TableCell>
                    <TableCell className="text-white/80">{fornecedor.responsavel || "-"}</TableCell>
                    <TableCell className="text-white/80">{fornecedor.cnpj || "-"}</TableCell>
                    <TableCell className="text-white/80">
                      {fornecedor.cidade && fornecedor.estado 
                        ? `${fornecedor.cidade} - ${fornecedor.estado}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(fornecedor)}
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fornecedor.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <FornecedorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (data) => {
          if (selectedFornecedor) {
            await updateFornecedor({ ...data, id: selectedFornecedor.id });
          } else {
            await createFornecedor(data);
          }
        }}
        fornecedor={selectedFornecedor}
        isSubmitting={isCreating || isUpdating}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600">
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
