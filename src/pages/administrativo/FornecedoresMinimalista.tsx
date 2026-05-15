import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useFornecedores, Fornecedor } from "@/hooks/useFornecedores";
import { FornecedorForm } from "@/components/compras/FornecedorForm";
import { MinimalistLayout } from "@/components/MinimalistLayout";

// EditableCell: clique único para editar in-place
type EditableCellProps = {
  value: string | number | null | undefined;
  type?: "text" | "number";
  display?: (v: string | number | null | undefined) => React.ReactNode;
  placeholder?: string;
  className?: string;
  onSave: (value: string | number | null) => void | Promise<unknown>;
};
function EditableCell({ value, type = "text", display, placeholder = "—", className = "", onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value == null ? "" : String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    const original = value == null ? "" : String(value);
    if (draft === original) { setEditing(false); return; }
    if (type === "number") {
      const n = Number(draft);
      if (!Number.isFinite(n)) { setEditing(false); setDraft(original); return; }
      await onSave(n);
    } else {
      await onSave(draft.trim() === "" ? null : draft.trim());
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(value == null ? "" : String(value)); }
        }}
        className={`w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-400 ${className}`}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => { if (e.key === "Enter") setEditing(true); }}
      className={`cursor-text rounded px-1 py-0.5 hover:bg-white/5 min-h-[1.5rem] ${className}`}
    >
      {display ? display(value) : (value === null || value === undefined || value === "" ? <span className="text-white/30">{placeholder}</span> : String(value))}
    </div>
  );
}

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
                      <EditableCell
                        value={fornecedor.codigo}
                        type="number"
                        display={(v) => `#${String(v ?? 0).padStart(4, "0")}`}
                        onSave={(v) => updateFornecedor({ id: fornecedor.id, codigo: Number(v) })}
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={fornecedor.tipo}
                        onChange={(e) => updateFornecedor({ id: fornecedor.id, tipo: e.target.value as "fisica" | "juridica" })}
                        className={`text-xs rounded px-2 py-0.5 border cursor-pointer ${fornecedor.tipo === "juridica"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}
                      >
                        <option value="juridica" className="bg-zinc-900">PJ</option>
                        <option value="fisica" className="bg-zinc-900">PF</option>
                      </select>
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      <EditableCell
                        value={fornecedor.nome}
                        onSave={(v) => updateFornecedor({ id: fornecedor.id, nome: String(v ?? "") })}
                      />
                    </TableCell>
                    <TableCell className="text-white/80">
                      <EditableCell
                        value={fornecedor.responsavel ?? ""}
                        onSave={(v) => updateFornecedor({ id: fornecedor.id, responsavel: (v as string) ?? undefined })}
                      />
                    </TableCell>
                    <TableCell className="text-white/80">
                      <EditableCell
                        value={fornecedor.cnpj ?? ""}
                        onSave={(v) => updateFornecedor({ id: fornecedor.id, cnpj: (v as string) ?? undefined })}
                      />
                    </TableCell>
                    <TableCell className="text-white/80">
                      <div className="flex items-center gap-1">
                        <EditableCell
                          value={fornecedor.cidade ?? ""}
                          placeholder="cidade"
                          onSave={(v) => updateFornecedor({ id: fornecedor.id, cidade: (v as string) ?? undefined })}
                        />
                        <span className="text-white/40">-</span>
                        <EditableCell
                          value={fornecedor.estado ?? ""}
                          placeholder="UF"
                          className="w-12"
                          onSave={(v) => updateFornecedor({ id: fornecedor.id, estado: (v as string) ?? undefined })}
                        />
                      </div>
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
