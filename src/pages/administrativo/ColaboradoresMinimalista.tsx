import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, X, Edit, Loader2, Plus, FileDown } from "lucide-react";

import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/types/permissions";
import { EditColaboradorModal } from "@/components/colaboradores/EditColaboradorModal";
import { gerarColaboradoresPDF } from "@/utils/colaboradoresPDFGenerator";

interface Colaborador {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role: string;
  setor: string | null;
  cpf: string | null;
  salario: number | null;
  foto_perfil_url: string | null;
  ativo: boolean;
  modalidade_pagamento: "mensal" | "diaria" | null;
  em_folha: boolean | null;
}

interface SystemRole {
  key: string;
  label: string;
}

export default function ColaboradoresMinimalista() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");
  const [filtroFuncao, setFiltroFuncao] = useState<string>("todos");
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);


  // Buscar colaboradores ativos
  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ["colaboradores-minimalista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, user_id, nome, email, role, setor, cpf, salario, foto_perfil_url, ativo, modalidade_pagamento, em_folha")
        .eq("ativo", true)
        .eq("eh_colaborador", true)
        .order("nome");
      if (error) throw error;
      return data as Colaborador[];
    },
  });

  // Buscar roles do sistema
  const { data: systemRoles = [] } = useQuery({
    queryKey: ["system-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_roles")
        .select("key, label")
        .eq("ativo", true)
        .order("label");
      if (error) throw error;
      return data as SystemRole[];
    },
  });

  // Filtros
  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter((c) => {
      const matchSearch = 
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSetor = filtroSetor === "todos" || c.setor === filtroSetor;
      const matchFuncao = filtroFuncao === "todos" || c.role === filtroFuncao;
      return matchSearch && matchSetor && matchFuncao;
    });
  }, [colaboradores, searchTerm, filtroSetor, filtroFuncao]);

  // Setores únicos
  const setoresUnicos = useMemo(() => {
    const setores = colaboradores
      .map((c) => c.setor)
      .filter((s): s is string => !!s);
    return [...new Set(setores)];
  }, [colaboradores]);

  // Funções únicas
  const funcoesUnicas = useMemo(() => {
    const funcoes = colaboradores.map((c) => c.role);
    return [...new Set(funcoes)];
  }, [colaboradores]);

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "-";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleEditColaborador = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setIsEditModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFiltroSetor("todos");
    setFiltroFuncao("todos");
  };

  const hasActiveFilters = searchTerm || filtroSetor !== "todos" || filtroFuncao !== "todos";

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate("/administrativo/rh-dp/colaboradores/novo")}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg 
                   bg-white/5 backdrop-blur-xl border border-white/10 text-white/80
                   hover:bg-white/10 hover:text-white hover:border-white/20 
                   transition-all duration-200"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Adicionar</span>
      </button>
      <button
        onClick={() => gerarColaboradoresPDF(filteredColaboradores)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg 
                   bg-white/5 backdrop-blur-xl border border-white/10 text-white/80
                   hover:bg-white/10 hover:text-white hover:border-white/20 
                   transition-all duration-200"
      >
        <FileDown className="h-4 w-4" />
        <span className="hidden sm:inline">PDF</span>
      </button>
    </div>
  );

  const breadcrumbItems = [
    { label: "Home", path: "/home" },
    { label: "Administrativo", path: "/administrativo" },
    { label: "RH/DP", path: "/administrativo/rh-dp" },
    { label: "Colaboradores" },
  ];

  return (
    <MinimalistLayout
      title="Colaboradores"
      subtitle="Gestão de colaboradores ativos"
      backPath="/administrativo/rh-dp"
      headerActions={headerActions}
      breadcrumbItems={breadcrumbItems}
    >
      {/* Filtros */}
      <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
        <div className="p-4 rounded-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            
            <Select value={filtroSetor} onValueChange={setFiltroSetor}>
              <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {setoresUnicos.map((setor) => (
                  <SelectItem key={setor} value={setor}>
                    {setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroFuncao} onValueChange={setFiltroFuncao}>
              <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as funções</SelectItem>
                {funcoesUnicas.map((funcao) => (
                  <SelectItem key={funcao} value={funcao}>
                    {ROLE_LABELS[funcao as keyof typeof ROLE_LABELS] || funcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        <div className="rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredColaboradores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/60">
              <p className="text-lg">Nenhum colaborador encontrado</p>
              <p className="text-sm">Ajuste os filtros ou adicione um novo colaborador</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Colaborador</TableHead>
                  <TableHead className="text-white/60">CPF</TableHead>
                  <TableHead className="text-white/60">Função</TableHead>
                  <TableHead className="text-white/60">Setor</TableHead>
                  <TableHead className="text-white/60">Salário</TableHead>
                  <TableHead className="text-white/60">Modalidade</TableHead>
                  <TableHead className="text-white/60">Em Folha</TableHead>
                  <TableHead className="text-white/60 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColaboradores.map((colaborador) => (
                  <TableRow 
                    key={colaborador.id} 
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/10">
                          <AvatarImage src={colaborador.foto_perfil_url || undefined} />
                          <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                            {getInitials(colaborador.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{colaborador.nome}</p>
                          <p className="text-sm text-white/60">{colaborador.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/80">
                      {formatCPF(colaborador.cpf)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                        {ROLE_LABELS[colaborador.role as keyof typeof ROLE_LABELS] || colaborador.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/80">
                      {colaborador.setor || "-"}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {formatCurrency(colaborador.salario)}
                    </TableCell>
                    <TableCell>
                      {colaborador.modalidade_pagamento ? (
                        <Badge 
                          variant="outline" 
                          className={
                            colaborador.modalidade_pagamento === "mensal"
                              ? "border-green-500/30 text-green-400 bg-green-500/10"
                              : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                          }
                        >
                          {colaborador.modalidade_pagamento === "mensal" ? "Mensal" : "Diária"}
                        </Badge>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {colaborador.em_folha ? (
                        <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-white/20 text-white/40 bg-white/5">
                          Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditColaborador(colaborador)}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      <EditColaboradorModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        colaborador={editingColaborador}
        systemRoles={systemRoles}
      />
    </MinimalistLayout>
  );
}
