import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Copy, Loader2, FileIcon, ImageIcon, Eye, X, Plus, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import DocumentosPanel, { useDocumentosHeaderActions } from '@/components/marketing/DocumentosPanel';

type TabKey = 'midias' | 'documentos';

const TABS: Array<{ key: TabKey; label: string; icon: typeof ImageIcon }> = [
  { key: 'midias', label: 'Mídias', icon: ImageIcon },
  { key: 'documentos', label: 'Documentos', icon: FileText },
];

let lastDisplayedIndex = 0;

function TabsBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.key === active));
  const cols = TABS.length;
  const [displayedIndex, setDisplayedIndex] = useState(lastDisplayedIndex);

  useEffect(() => {
    if (displayedIndex === activeIndex) return;
    const id = requestAnimationFrame(() => {
      setDisplayedIndex(activeIndex);
      lastDisplayedIndex = activeIndex;
    });
    return () => cancelAnimationFrame(id);
  }, [activeIndex, displayedIndex]);

  return (
    <div className="mb-6 flex justify-center">
      <div
        className="relative inline-grid rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(160px, 1fr))` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${cols})`,
            transform: `translateX(${displayedIndex * 100}%)`,
          }}
        />
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={
                'relative z-10 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors duration-200 ' +
                (isActive ? 'text-white' : 'text-white/70 hover:text-white')
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DEFAULT_BUCKETS = [
  'autorizados-logos', 'catalogo-produtos', 'chamados-suporte-anexos',
  'comprovantes-pagamento', 'contas-pagar', 'contratos-autorizados',
  'contratos-vendas', 'documentos-publicos', 'fichas-visita-tecnica',
  'fotos-carregamento', 'lead-anexos', 'user-avatars', 'veiculos-fotos',
];

const ALL_CATEGORIES = '__all__';
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

function isImage(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.includes(ext);
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface StorageFileWithBucket extends StorageFile {
  bucket: string;
}

export default function MidiasMinimalista() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [buckets, setBuckets] = useState(DEFAULT_BUCKETS);
  const [bucket, setBucket] = useState(ALL_CATEGORIES);
  const [files, setFiles] = useState<StorageFileWithBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StorageFileWithBucket | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadBucket, setUploadBucket] = useState(DEFAULT_BUCKETS[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);

  // New category state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Fetch available buckets
  useEffect(() => {
    const fetchBuckets = async () => {
      const { data } = await supabase.storage.listBuckets();
      if (data && data.length > 0) {
        setBuckets(data.map(b => b.name).sort());
      }
    };
    fetchBuckets();
  }, []);

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return;
    setCreatingCategory(true);
    const { data, error } = await supabase.functions.invoke('create-storage-bucket', { body: { name } });
    if (error || (data && data.error)) {
      toast({ title: 'Erro ao criar categoria', description: data?.error || error?.message || 'Erro desconhecido', variant: 'destructive' });
    } else {
      setBuckets(prev => [...prev, name].sort());
      setUploadBucket(name);
      setNewCategoryName('');
      setShowNewCategory(false);
      toast({ title: 'Categoria criada', description: name });
    }
    setCreatingCategory(false);
  };

  const fetchFiles = async () => {
    setLoading(true);
    if (bucket === ALL_CATEGORIES) {
      const results = await Promise.allSettled(
        buckets.map(async (b) => {
          const { data } = await supabase.storage.from(b).list('', {
            limit: 200,
            sortBy: { column: 'created_at', order: 'desc' },
          });
          return (data || [])
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .map(f => ({ ...f, bucket: b })) as StorageFileWithBucket[];
        })
      );
      const all = results
        .filter((r): r is PromiseFulfilledResult<StorageFileWithBucket[]> => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setFiles(all);
    } else {
      const { data, error } = await supabase.storage.from(bucket).list('', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) {
        toast({ title: 'Erro ao listar arquivos', description: error.message, variant: 'destructive' });
        setFiles([]);
      } else {
        setFiles(
          (data || [])
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .map(f => ({ ...f, bucket })) as StorageFileWithBucket[]
        );
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
    setPreviewUrl(null);
  }, [bucket, buckets]);

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadTotal(selectedFiles.length);
    setUploadProgress(0);
    let successCount = 0;
    let failCount = 0;

    for (const file of selectedFiles) {
      let uploaded = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { error } = await supabase.storage.from(uploadBucket).upload(file.name, file, { upsert: true });
          if (error) {
            toast({ title: 'Erro no upload', description: `${file.name}: ${error.message}`, variant: 'destructive' });
          } else {
            uploaded = true;
          }
          break; // Supabase respondeu normalmente, não tentar de novo
        } catch (e) {
          console.warn(`Upload de ${file.name} falhou (tentativa ${attempt}/3):`, e);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 1500));
          } else {
            toast({ title: 'Erro no upload', description: `${file.name}: servidor indisponível após 3 tentativas`, variant: 'destructive' });
          }
        }
      }
      if (uploaded) successCount++;
      else failCount++;
      setUploadProgress(prev => prev + 1);
      // Delay entre arquivos para evitar rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    if (successCount > 0) {
      toast({ title: 'Upload concluído', description: `${successCount} arquivo(s) enviado(s)${failCount > 0 ? `, ${failCount} com erro` : ''}` });
    }
    setUploading(false);
    setSelectedFiles([]);
    setUploadModalOpen(false);
    setUploadProgress(0);
    setUploadTotal(0);
    fetchFiles();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.storage.from(deleteTarget.bucket).remove([deleteTarget.name]);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Arquivo excluído', description: deleteTarget.name });
      fetchFiles();
    }
    setDeleteTarget(null);
  };

  const copyPublicUrl = (file: StorageFileWithBucket) => {
    const { data } = supabase.storage.from(file.bucket).getPublicUrl(file.name);
    navigator.clipboard.writeText(data.publicUrl);
    toast({ title: 'URL copiada!' });
  };

  const openPreview = (file: StorageFileWithBucket) => {
    const { data } = supabase.storage.from(file.bucket).getPublicUrl(file.name);
    setPreviewUrl(data.publicUrl);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = rawTab === 'documentos' ? 'documentos' : 'midias';
  const setTab = (k: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (k === 'midias') next.delete('tab');
    else next.set('tab', k);
    setSearchParams(next, { replace: true });
  };
  const documentosHeaderActions = useDocumentosHeaderActions();

  const midiasHeaderActions = (
    <div className="flex items-center gap-2">
      <Select value={bucket} onValueChange={setBucket}>
        <SelectTrigger className="w-[220px] bg-white/5 border-white/10 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
          {buckets.map(b => (
            <SelectItem key={b} value={b}>{b}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={() => setUploadModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
      >
        <Upload className="w-4 h-4" />
        Upload
      </Button>
    </div>
  );

  return (
    <MinimalistLayout
      title="Mídias"
      subtitle="Gerenciamento de arquivos no Storage"
      backPath="/marketing"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Marketing', path: '/marketing' },
        { label: 'Mídias' },
      ]}
      headerActions={activeTab === 'midias' ? midiasHeaderActions : documentosHeaderActions}
    >
      <TabsBar active={activeTab} onChange={setTab} />

      {activeTab === 'documentos' ? (
        <div key="documentos" className="animate-fade-in">
          <DocumentosPanel />
        </div>
      ) : (
        <div key="midias" className="animate-fade-in">
      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg" />
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir arquivo</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Deseja excluir <strong className="text-white">{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={(open) => { if (!uploading) { setUploadModalOpen(open); if (!open) setSelectedFiles([]); } }}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Upload de imagens</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Categoria de destino</label>
              <div className="flex items-center gap-2">
                <Select value={uploadBucket} onValueChange={setUploadBucket} disabled={uploading}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buckets.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={uploading}
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {showNewCategory && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    placeholder="nome-da-categoria"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                    disabled={creatingCategory}
                    onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                  />
                  <Button
                    size="sm"
                    disabled={creatingCategory || !newCategoryName.trim()}
                    onClick={handleCreateCategory}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 shrink-0"
                  >
                    {creatingCategory ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Criar'}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="border-white/10 text-white/80 hover:bg-white/5 text-xs w-full"
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Selecionar imagens
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{file.name}</p>
                      <p className="text-xs text-white/40">{formatBytes(file.size)}</p>
                    </div>
                    {!uploading && (
                      <button onClick={() => removeSelectedFile(i)} className="text-white/40 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <div className="space-y-1">
                <Progress value={(uploadProgress / uploadTotal) * 100} className="h-2" />
                <p className="text-xs text-white/40 text-center">{uploadProgress} / {uploadTotal}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              size="sm"
              disabled={uploading || selectedFiles.length === 0}
              onClick={handleUploadFiles}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Enviar {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 text-white/40 text-sm">Nenhum arquivo neste bucket</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {files.map((file, idx) => {
            const fileBucket = file.bucket || bucket;
            const imageUrl = isImage(file.name)
              ? supabase.storage.from(fileBucket).getPublicUrl(file.name).data.publicUrl
              : null;

            return (
              <div
                key={`${file.bucket}-${file.id || file.name}-${idx}`}
                className="group relative flex flex-col items-center"
              >
                {/* Thumbnail card */}
                <div className="relative w-[100px] h-[100px] rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <FileIcon className="w-8 h-8 text-white/30" strokeWidth={1.5} />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {isImage(file.name) && (
                      <Button variant="ghost" size="icon" onClick={() => openPreview(file)} className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => copyPublicUrl(file)} className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(file)} className="h-7 w-7 text-red-400/80 hover:text-red-400 hover:bg-white/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Bucket badge */}
                  {bucket === ALL_CATEGORIES && (
                    <span className="absolute top-1 left-1 text-[9px] bg-blue-500/70 text-white px-1 rounded truncate max-w-[90px]">
                      {file.bucket}
                    </span>
                  )}
                </div>

                {/* File name */}
                <p className="text-[10px] text-white/60 mt-1 w-[100px] text-center truncate" title={file.name}>
                  {file.name}
                </p>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </MinimalistLayout>
  );
}
