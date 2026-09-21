import { useEffect, useRef, useState } from 'react';
import { Camera, FileVideo2, Image as ImageIcon, Play, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MidiaFinalExistente {
  id: string;
  storage_path: string;
  tipo: string;
  nome_arquivo: string;
  tamanho_bytes: number;
  ordem: number;
  url: string;
}

interface VisitaMidiasFinaisProps {
  existentes: MidiaFinalExistente[];
  novas: File[];
  readOnly: boolean;
  onAdicionar: (files: FileList | null) => void;
  onRemoverNova: (index: number) => void;
  onRemoverExistente: (midia: MidiaFinalExistente) => void;
}

function formatarTamanho(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function PreviewArquivo({ file }: { file: File }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return <div className="h-36 bg-white/5" />;
  return file.type.startsWith('video/') ? (
    <video src={url} className="h-36 w-full object-cover" controls playsInline preload="metadata" />
  ) : (
    <img src={url} alt={file.name} className="h-36 w-full object-cover" />
  );
}

export function VisitaMidiasFinais({
  existentes,
  novas,
  readOnly,
  onAdicionar,
  onRemoverNova,
  onRemoverExistente,
}: VisitaMidiasFinaisProps) {
  const arquivosRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const total = existentes.length + novas.length;

  return (
    <section className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-300" /> Mídias finais da visita {!readOnly && '*'}
          </h2>
          <p className="mt-1 text-xs text-white/45">
            {readOnly ? `${total} mídia${total === 1 ? '' : 's'} registrada${total === 1 ? '' : 's'}` : 'Adicione ao menos uma foto ou vídeo geral da visita.'}
          </p>
        </div>
        <span className="shrink-0 text-xs text-white/45">{total}/10</span>
      </div>

      {total > 0 ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {existentes.map((midia) => (
            <div key={midia.id} className="overflow-hidden rounded-md border border-white/10 bg-black/20">
              {midia.tipo === 'video' ? (
                <video src={midia.url} className="h-36 w-full object-cover" controls playsInline preload="metadata" />
              ) : (
                <a href={midia.url} target="_blank" rel="noopener noreferrer">
                  <img src={midia.url} alt={midia.nome_arquivo} className="h-36 w-full object-cover" />
                </a>
              )}
              <div className="flex items-center gap-2 p-2">
                {midia.tipo === 'video' ? <FileVideo2 className="w-4 h-4 text-blue-300 shrink-0" /> : <ImageIcon className="w-4 h-4 text-blue-300 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white/80">{midia.nome_arquivo}</p>
                  <p className="text-[10px] text-white/40">{formatarTamanho(midia.tamanho_bytes)}</p>
                </div>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:text-red-200 hover:bg-red-500/15" onClick={() => onRemoverExistente(midia)} title="Remover mídia">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {novas.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="overflow-hidden rounded-md border border-blue-400/25 bg-black/20">
              <PreviewArquivo file={file} />
              <div className="flex items-center gap-2 p-2">
                {file.type.startsWith('video/') ? <FileVideo2 className="w-4 h-4 text-blue-300 shrink-0" /> : <ImageIcon className="w-4 h-4 text-blue-300 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white/80">{file.name}</p>
                  <p className="text-[10px] text-white/40">{formatarTamanho(file.size)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:text-red-200 hover:bg-red-500/15" onClick={() => onRemoverNova(index)} title="Remover mídia">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex h-24 items-center justify-center rounded-md border border-dashed border-white/15 bg-black/10 text-sm text-white/35">
          Nenhuma mídia final adicionada
        </div>
      )}

      {!readOnly && total < 10 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input ref={arquivosRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(event) => { onAdicionar(event.target.files); event.target.value = ''; }} />
          <input ref={cameraRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(event) => { onAdicionar(event.target.files); event.target.value = ''; }} />
          <Button type="button" variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => arquivosRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Adicionar fotos ou vídeos
          </Button>
          <Button type="button" variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => cameraRef.current?.click()}>
            <Camera className="w-4 h-4 mr-2" /> <Play className="w-3 h-3 mr-1" /> Gravar vídeo
          </Button>
        </div>
      )}
      {!readOnly && <p className="mt-2 text-[11px] text-white/35">Fotos ou vídeos de até 50 MB cada.</p>}
    </section>
  );
}