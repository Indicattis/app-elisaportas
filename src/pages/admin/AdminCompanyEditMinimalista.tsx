import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEmpresasEmissoras } from "@/hooks/useEmpresasEmissoras";
import { EmpresaEmissoraForm } from "@/components/admin/EmpresaEmissoraForm";
import { EmpresaEmissoraFormData } from "@/types/empresaEmissora";
import { MinimalistLayout } from "@/components/MinimalistLayout";

export default function AdminCompanyEditMinimalista() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewCompany = id === "nova";
  
  const {
    empresas,
    isLoading,
    createEmpresa,
    updateEmpresa,
    isCreating,
    isUpdating,
  } = useEmpresasEmissoras();

  const empresa = !isNewCompany ? empresas?.find((e) => e.id === id) : undefined;

  const handleSubmit = (data: EmpresaEmissoraFormData) => {
    if (isNewCompany) {
      createEmpresa(data, {
        onSuccess: () => navigate("/admin/companies"),
      });
    } else if (empresa) {
      updateEmpresa(
        { id: empresa.id, ...data },
        {
          onSuccess: () => navigate("/admin/companies"),
        }
      );
    }
  };

  const handleCancel = () => {
    navigate("/admin/companies");
  };

  if (isLoading) {
    return (
      <MinimalistLayout 
        title="Carregando..." 
        backPath="/admin/companies"
        breadcrumbItems={[
          { label: "Home", path: "/home" },
          { label: "Admin", path: "/admin" },
          { label: "Empresas", path: "/admin/companies" },
          { label: "..." }
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </MinimalistLayout>
    );
  }

  if (!isNewCompany && !empresa) {
    return (
      <MinimalistLayout 
        title="Empresa não encontrada" 
        backPath="/admin/companies"
        breadcrumbItems={[
          { label: "Home", path: "/home" },
          { label: "Admin", path: "/admin" },
          { label: "Empresas", path: "/admin/companies" },
          { label: "Erro" }
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-white/60">Empresa não encontrada</p>
        </div>
      </MinimalistLayout>
    );
  }

  return (
    <MinimalistLayout
      title={isNewCompany ? "Nova Empresa" : "Editar Empresa"}
      subtitle={isNewCompany ? "Cadastrar nova empresa emissora" : empresa?.nome}
      backPath="/admin/companies"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Admin", path: "/admin" },
        { label: "Empresas", path: "/admin/companies" },
        { label: isNewCompany ? "Nova" : "Editar" }
      ]}
    >
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-lg p-6">
        <div className="[&_label]:text-white/80 [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_select]:bg-white/5 [&_select]:border-white/10 [&_select]:text-white [&_h3]:text-white [&_h4]:text-white [&_.card]:bg-transparent [&_.card]:border-white/10">
          <EmpresaEmissoraForm
            empresa={empresa}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isCreating || isUpdating}
          />
        </div>
      </div>
    </MinimalistLayout>
  );
}
