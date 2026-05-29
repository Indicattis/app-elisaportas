import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Filter, Search, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDocumentos } from '@/hooks/useDocumentos';
import { useQueryClient } from '@tanstack/react-query';

const CATEGORY_LABELS: Record<string, string> = {
  manual: 'Manual',
  procedimento: 'Procedimento',
  formulario: 'Formulário',
  contrato: 'Contrato',
  politica: 'Política',
  outros: 'Outros',
};

const CATEGORY_COLORS: Record<string, string> = {
  manual: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  procedimento: 'bg-green-500/20 text-green-400 border-green-500/30',
  formulario: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  contrato: 'bg-red-500/20 text-red-400 border-red-500/30',
  politica: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  outros: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

function formatFileSize(bytes: number) {
  const sizes = ['Bytes', 'KB', 'MB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

export function useDocumentosHeaderActions() {
  const queryClient = useQueryClient();
  const { isFetching } = useDocumentos();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['documentos'] });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={isFetching}
        className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
      >
        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
      </Button>
      <Button
        asChild
        size="sm"
        className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
      >
        <Link to="/administrativo/documentos/novo">
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Link>
      </Button>
    </div>
  );
}

export default function DocumentosPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { data: documentos, isLoading } = useDocumentos();

  const filteredDocuments = documentos?.filter((doc) => {
    const matchesSearch =
      doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      {/* Filtros */}
      <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 p-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
              <Filter className="h-4 w-4 mr-2 text-white/60" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all" className="text-white focus:bg-white/10 focus:text-white">
                Todas as categorias
              </SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem
                  key={key}
                  value={key}
                  className="text-white focus:bg-white/10 focus:text-white"
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {!isLoading && !filteredDocuments?.length && (
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-8 rounded-lg text-center">
            <FileText className="h-12 w-12 mx-auto text-white/30 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum documento encontrado</h3>
            <p className="text-white/60 mb-6">
              {searchTerm || categoryFilter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece adicionando seu primeiro documento.'}
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
            >
              <Link to="/administrativo/documentos/novo">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Documento
              </Link>
            </Button>
          </div>
        </div>
      )}

      {!isLoading && filteredDocuments && filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((documento) => (
            <div
              key={documento.id}
              className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
            >
              <div className="p-4 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <FileText className="h-5 w-5 text-red-400" />
                  </div>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium border ${CATEGORY_COLORS[documento.categoria]}`}
                  >
                    {CATEGORY_LABELS[documento.categoria]}
                  </span>
                </div>

                <h3 className="text-white font-medium line-clamp-2 mb-2">{documento.titulo}</h3>
                {documento.descricao && (
                  <p className="text-white/60 text-sm line-clamp-2 mb-4">{documento.descricao}</p>
                )}

                <div className="flex items-center justify-between text-xs text-white/40 mb-4">
                  <span className="truncate max-w-[60%]">{documento.nome_arquivo}</span>
                  <span>{formatFileSize(documento.tamanho_arquivo)}</span>
                </div>

                <Button
                  onClick={() => window.open(documento.arquivo_url, '_blank')}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}