import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  obrigatorio?: boolean;
  label?: string;
}

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ComprovantesUploadBlock({
  files,
  onChange,
  obrigatorio = false,
  label = "Comprovantes de Pagamento",
}: Props) {
  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;

    const validos: File[] = [];
    for (const f of picked) {
      if (!ALLOWED.includes(f.type)) {
        toast.error(`Formato não suportado: ${f.name}. Use PNG, JPG ou PDF.`);
        continue;
      }
      if (f.size > MAX) {
        toast.error(`${f.name} excede 10 MB.`);
        continue;
      }
      // Evitar duplicados por nome+size
      if (files.some((x) => x.name === f.name && x.size === f.size)) continue;
      validos.push(f);
    }
    if (validos.length) onChange([...files, ...validos]);
  };

  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <Label className="text-sm font-medium text-white/80">
        {label} {obrigatorio ? "*" : ""}
      </Label>

      <div>
        <Input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          onChange={handleAdd}
          className="hidden"
          id="comprovantes-venda-input"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById("comprovantes-venda-input")?.click()}
          className="w-full border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          Anexar comprovante(s) (PNG, JPG ou PDF)
        </Button>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5"
            >
              <FileText className="h-4 w-4 text-white/50 shrink-0" />
              <span className="text-sm text-white/80 truncate flex-1">{f.name}</span>
              <span className="text-xs text-white/40 shrink-0">{formatSize(f.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(i)}
                className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {obrigatorio && files.length === 0 && (
        <p className="text-xs text-amber-300/80">
          Anexe ao menos um comprovante — pagamento à vista ou marcado como já pago.
        </p>
      )}
    </div>
  );
}