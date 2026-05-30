import { useNavigate } from "react-router-dom";
import { Building2, Plus, Loader2, Star, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEmpresasEmissoras } from "@/hooks/useEmpresasEmissoras";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { EmpresaEmissora } from "@/types/empresaEmissora";

export default function GestaoEmpresasMinimalista() {
  const navigate = useNavigate();
  const { empresas, isLoading, setPadrao, isSettingPadrao } = useEmpresasEmissoras();

  const handleEdit = (empresa: EmpresaEmissora) => {
    navigate(`/administrativo/empresas/${empresa.id}`);
  };

  const getAmbienteBadge = (ambiente: string | null) => {
    if (!ambiente) {
      return (
        <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
          Não configurado
        </Badge>
      );
    }
    if (ambiente === "producao") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-400/30">
          Produção
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-orange-400 border-orange-400/30 bg-orange-400/10">
        Homologação
      </Badge>
    );
  };

  const breadcrumbItems = [
    { label: "Home", path: "/home" },
    { label: "Administrativo", path: "/administrativo" },
    { label: "Gestão de Empresas" },
  ];

  if (isLoading) {
    return (
      <MinimalistLayout
        title="Gestão de Empresas"
        subtitle="Carregando..."
        backPath="/administrativo"
        breadcrumbItems={breadcrumbItems}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </MinimalistLayout>
    );
  }

  return (
    <MinimalistLayout
      title="Gestão de Empresas"
      subtitle="Gerencie as empresas que podem emitir notas fiscais"
      backPath="/administrativo"
      breadcrumbItems={breadcrumbItems}
      headerActions={
        <Button
          onClick={() => navigate("/administrativo/empresas/nova")}
          className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      }
    >
      {empresas && empresas.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-white/5 border border-dashed border-white/20 rounded-lg backdrop-blur-xl">
          <Building2 className="w-16 h-16 text-white/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">Nenhuma empresa cadastrada</h3>
          <p className="text-white/60 mb-4">
            Cadastre sua primeira empresa emissora para começar
          </p>
          <Button
            onClick={() => navigate("/administrativo/empresas/nova")}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Primeira Empresa
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas?.map((empresa) => (
            <div
              key={empresa.id}
              className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-lg p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{empresa.nome}</h3>
                    {empresa.padrao && (
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-white/60">{empresa.razao_social}</p>
                </div>
                {getAmbienteBadge(empresa.ambiente)}
              </div>

              <div className="space-y-2 text-sm text-white/60 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{empresa.cnpj}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{empresa.cidade}/{empresa.estado}</span>
                </div>
                {empresa.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{empresa.email}</span>
                  </div>
                )}
                {empresa.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{empresa.telefone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <Badge
                  variant={empresa.ativo ? "default" : "secondary"}
                  className={empresa.ativo ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}
                >
                  {empresa.ativo ? "Ativo" : "Inativo"}
                </Badge>

                <div className="flex items-center gap-2">
                  {!empresa.padrao && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPadrao(empresa.id)}
                      disabled={isSettingPadrao}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Padrão
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(empresa)}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    Editar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </MinimalistLayout>
  );
}