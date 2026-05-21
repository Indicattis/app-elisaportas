import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Menu, Settings, LogOut, Tv, Map, Network, BookOpen, Calendar as CalendarIcon, Calculator, CheckSquare } from "lucide-react";
import { MinhasTarefasSheet } from "@/components/todo/MinhasTarefasSheet";
import { useTarefasCount } from "@/hooks/useTarefasCount";
import { ProfileDropdownMenu } from "@/components/ProfileDropdownMenu";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Performance from "./pages/Performance";
import Users from "./pages/Users";
import VendaNova from "./pages/VendaNova";
import VendaVinculacao from "./pages/VendaVinculacao";
import VendaEdit from "./pages/VendaEdit";
import Orcamentos from "./pages/Orcamentos";
import Faturamento from "./pages/Faturamento";
import FaturamentoEdit from "./pages/FaturamentoEdit";
import NovoOrcamento from "./pages/NovoOrcamento";
import OrcamentoEdit from "./pages/OrcamentoEdit";
import NotFound from "./pages/NotFound";
import VendaDetails from "./pages/VendaDetails";
import ProducaoSolda from "./pages/ProducaoSolda";
import ProducaoPerfiladeira from "./pages/ProducaoPerfiladeira";
import ProducaoSeparacao from "./pages/ProducaoSeparacao";
import ProducaoQualidade from "./pages/ProducaoQualidade";
import ProducaoPintura from "./pages/ProducaoPintura";
import InstalacoesAdmin from "./pages/InstalacoesAdmin";
import InstalacoesControle from "./pages/InstalacoesControle";
import InstalacoesCronograma from "./pages/InstalacoesCronograma";
import InstalacoesNovas from "./pages/InstalacoesNovas";
import InstalacoesEditar from "./pages/InstalacoesEditar";
import PedidoEdit from "./pages/PedidoEdit";
import NovoPedido from "./pages/NovoPedido";
import Marketing from "./pages/Marketing";
import CanaisAquisicao from "./pages/CanaisAquisicao";
import CronogramaPostagens from "./pages/CronogramaPostagens";
import Postagens from "./pages/Postagens";

// Hub de Marketing Minimalista
import MarketingHub from "./pages/marketing/MarketingHub";
import PerformanceMinimalista from "./pages/marketing/PerformanceMinimalista";
import CanaisAquisicaoMinimalista from "./pages/marketing/CanaisAquisicaoMinimalista";
import InvestimentosMinimalista from "./pages/marketing/InvestimentosMinimalista";
import LtvMinimalista from "./pages/marketing/LtvMinimalista";
import MidiasMinimalista from "./pages/marketing/MidiasMinimalista";
import Conversoes from "./pages/marketing/Conversoes";
import ConversoesMeta from "./pages/marketing/ConversoesMeta";

import FabricaHome from "./pages/FabricaHome";
import InstalacoesHome from "./pages/InstalacoesHome";
import AdministrativoHome from "./pages/AdministrativoHome";
import Investimentos from "./pages/Investimentos";
import Calendario from "./pages/Calendario";
import Autorizados from "./pages/Autorizados";
import AutorizadoNegociacao from "./pages/AutorizadoNegociacao";
import ParceiroNovo from "./pages/ParceiroNovo";
import ParceiroEdit from "./pages/ParceiroEdit";
import MapaAutorizados from "./pages/MapaAutorizados";
import ContadorVendas from "./pages/ContadorVendas";
import Forbidden from "./pages/Forbidden";
import Pedidos from "./pages/Pedidos";
import HubFabrica from "./pages/HubFabrica";
import PedidosStandalone from "./pages/PedidosStandalone";
import PedidoPreparacao from "./pages/PedidoPreparacao";
import TvDashboard from "./pages/TvDashboard";
// Páginas de edição de ordens removidas - tabela ordens_producao excluída
import Documentos from "./pages/Documentos";
import DocumentoNovo from "./pages/DocumentoNovo";
import Vendas from "./pages/Vendas";
import VendasNova from "./pages/VendasNova";
import ContratoVendas from "./pages/ContratoVendas";
import ContratoTemplates from "./pages/ContratoTemplates";
import Suporte from "./pages/Suporte";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import Estoque from "./pages/Estoque";
import EstoqueEdit from "./pages/EstoqueEdit";
import EstoqueGerenciamento from "./pages/EstoqueGerenciamento";
import RegrasEtiquetasPage from "./pages/RegrasEtiquetasPage";
import VendasCatalogo from "./pages/VendasCatalogo";
import VendasCatalogoNovo from "./pages/VendasCatalogoNovo";
import CatalogoEditMinimalista from "./pages/vendas/CatalogoEditMinimalista";
import CatalogoCores from "./pages/CatalogoCores";
import CatalogoCoresMinimalista from "./pages/vendas/CatalogoCores";
import Representantes from "./pages/Representantes";
import Franqueados from "./pages/Franqueados";
import CronogramaInstalacoes from "./pages/CronogramaInstalacoes";
import EquipesInstalacao from "./pages/EquipesInstalacao";

import DiarioBordo from "./pages/DiarioBordo";
import Frota from "./pages/Frota";
import FrotaNovo from "./pages/FrotaNovo";
import FrotaEdit from "./pages/FrotaEdit";
import FrotaConferencia from "./pages/FrotaConferencia";
import FrotaConferenciasHistorico from "./pages/FrotaConferenciasHistorico";
import TabelaPrecos from "./pages/TabelaPrecos";
import Todo from "./pages/Todo";
import LogisticaHome from "./pages/LogisticaHome";
import Entregas from "./pages/Entregas";
import Expedicao from "./pages/Expedicao";
import VendaView from "./pages/VendaView";
import PedidoView from "./pages/PedidoView";
import DRE from "./pages/DRE";
import Custos from "./pages/Custos";
import NotasFiscais from "./pages/NotasFiscais";
import EmitirNfse from "./pages/EmitirNfse";
import EmitirNfe from "./pages/EmitirNfe";
import ConfiguracoesFiscais from "./pages/ConfiguracoesFiscais";
import ColaboradorDetalhes from "./pages/ColaboradorDetalhes";
import Vagas from "./pages/Vagas";
import Colaboradores from "./pages/Colaboradores";
import FolhaPagamentoNova from "./pages/FolhaPagamentoNova";
import SolicitacoesMudancaCadastro from "./pages/SolicitacoesMudancaCadastro";
// Etiquetas removido - funcionalidade movida para página de Ordens
import ProducaoLogin from "./pages/producao/ProducaoLogin";
import ForbiddenProducao from "./pages/producao/ForbiddenProducao";
import ProducaoTerceirizacao from "./pages/ProducaoTerceirizacao";
import { ProducaoAuthProvider } from "@/hooks/useProducaoAuth";
import { ProducaoLayout } from "@/components/ProducaoLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { PaineisLayout } from "@/components/PaineisLayout";
import { ProtectedProducaoRoute } from "@/components/ProtectedProducaoRoute";
import ProducaoCarregamento from "./pages/ProducaoCarregamento";
import ProducaoHome from "./pages/ProducaoHome";
import GestaoPedidosProducao from "./pages/producao/GestaoPedidosProducao";

import ProducaoMeuHistorico from "./pages/ProducaoMeuHistorico";
import ProducaoControle from "./pages/ProducaoControle";
import ConferenciaEstoqueProducao from "./pages/producao/ConferenciaEstoqueProducao";
import ConferenciaExecucaoProducao from "./pages/producao/ConferenciaExecucaoProducao";
import ConferenciaAlmoxProducao from "./pages/producao/ConferenciaAlmoxProducao";
import ConferenciaAlmoxExecucao from "./pages/producao/ConferenciaAlmoxExecucao";
import Ordens from "./pages/Ordens";
import AdminHub from "./pages/admin/AdminHub";
import AdminPermissionsMinimalista from "./pages/admin/AdminPermissionsMinimalista";
import AdminRolesMinimalista from "./pages/admin/AdminRolesMinimalista";
import AdminCompaniesMinimalista from "./pages/admin/AdminCompaniesMinimalista";
import AdminCompanyEditMinimalista from "./pages/admin/AdminCompanyEditMinimalista";
import AdminUsersMinimalista from "./pages/admin/AdminUsersMinimalista";
import AdminLogs from "./pages/admin/AdminLogs";
import ParceiroHome from "./pages/ParceiroHome";
import ComprasHome from "./pages/ComprasHome";
import MetasColaboradores from "./pages/MetasColaboradores";
import MetasColaboradorIndividual from "./pages/MetasColaboradorIndividual";
import FinanceiroHome from "./pages/FinanceiroHome";
import RHHome from "./pages/RHHome";
import PaineisHome from "./pages/PaineisHome";
import PaineisMetasVendas from "./pages/paineis/PaineisMetasVendas";
import DirecaoHome from "./pages/DirecaoHome";
import DirecaoChecklist from "./pages/DirecaoChecklist";
import DirecaoChecklistProgramacao from "./pages/DirecaoChecklistProgramacao";
import ChecklistLideranca from "./pages/ChecklistLideranca";
import ChecklistProgramacao from "./pages/ChecklistProgramacao";
import ChecklistHistorico from "./pages/ChecklistHistorico";
import Caixa from "./pages/Caixa";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import ContasPagarNova from "./pages/ContasPagarNova";

// Hub de Vendas Minimalista
import VendasHub from "./pages/vendas/VendasHub";
import MinhasVendas from "./pages/vendas/MinhasVendas";
import MinhasVendasEditar from "./pages/vendas/MinhasVendasEditar";
import VendaNovaMinimalista from "./pages/vendas/VendaNovaMinimalista";
import PedidoCorrecaoNovo from "./pages/vendas/PedidoCorrecaoNovo";
import MeusClientes from "./pages/vendas/MeusClientes";
import MeuClienteDetalhe from "./pages/vendas/MeuClienteDetalhe";
import CatalogoMinimalista from "./pages/vendas/Catalogo";
import CatalogoNovoMinimalista from "./pages/vendas/CatalogoNovoMinimalista";
import MeusOrcamentos from "./pages/vendas/MeusOrcamentos";
import AcompanharPedido from "./pages/vendas/AcompanharPedido";
import MeusParceiros from "./pages/vendas/MeusParceiros";
import VisitasTecnicas from "./pages/vendas/VisitasTecnicas";
import VendaDetalhesMinimalista from "./pages/vendas/VendaDetalhesMinimalista";

// Hub da Fábrica Minimalista
import FabricaHub from "./pages/fabrica/FabricaHub";
import ProducaoEmbalagem from "./pages/producao/ProducaoEmbalagem";
import ProducaoInstalacoes from "./pages/producao/ProducaoInstalacoes";
import MeuHistoricoMinimalista from "./pages/fabrica/producao/MeuHistoricoMinimalista";
import OrdensPorPedido from "./pages/fabrica/OrdensPorPedido";
import CronogramaProducao from "./pages/fabrica/CronogramaProducao";

import MeuPerfil from "./pages/MeuPerfil";

// Home - Páginas de acesso rápido (read-only)
import PedidosProducaoReadOnly from "./pages/home/PedidosProducaoReadOnly";
import CalendarioExpedicaoReadOnly from "./pages/home/CalendarioExpedicaoReadOnly";

// Hub da Direção Minimalista
import DirecaoHub from "./pages/direcao/DirecaoHub";
import VendasDirecao from "./pages/direcao/VendasDirecao";
import RegrasVendasDirecao from "./pages/direcao/RegrasVendasDirecao";
import VendaDetalhesDirecao from "./pages/direcao/VendaDetalhesDirecao";
import FaturamentoDirecao from "./pages/direcao/FaturamentoDirecao";
import FaturamentoVendaDirecao from "./pages/direcao/FaturamentoVendaDirecao";
import GestaoFabricaDirecao from "./pages/direcao/GestaoFabricaDirecao";
import GestaoColaboradoresDirecao from "./pages/direcao/GestaoColaboradoresDirecao";
import GestaoInstalacaoDirecao from "./pages/direcao/GestaoInstalacaoDirecao";
import OrdensInstalacoesDirecao from "./pages/direcao/OrdensInstalacoesDirecao";
import CalendarioExpedicaoDirecao from "./pages/direcao/CalendarioExpedicaoDirecao";
import MetasHubDirecao from "./pages/direcao/MetasHubDirecao";
import MetasFabricaDirecao from "./pages/direcao/MetasFabricaDirecao";
import MetasInstalacoesDirecao from "./pages/direcao/MetasInstalacoesDirecao";
import MetasVendasDirecao from "./pages/direcao/MetasVendasDirecao";
import VendaEditarDirecao from "./pages/direcao/VendaEditarDirecao";
import ClientesDirecao from "./pages/direcao/ClientesDirecao";
import PedidoViewDirecao from "./pages/direcao/PedidoViewDirecao";

// DRE da Direção
import DREDirecao from "./pages/direcao/DREDirecao";
import DREMesDirecao from "./pages/direcao/DREMesDirecao";
import DREDespesasDirecao from "./pages/direcao/DREDespesasDirecao";
import DRECustosDirecao from "./pages/direcao/DRECustosDirecao";
import CaixaElisaDirecao from "./pages/direcao/CaixaElisaDirecao";
import EstrategiaHub from "./pages/direcao/estrategia/EstrategiaHub";
import EstrategiaItens from "./pages/direcao/estrategia/EstrategiaItens";
import EstrategiaKits from "./pages/direcao/estrategia/EstrategiaKits";
import EstrategiaPrecos from "./pages/direcao/estrategia/EstrategiaPrecos";
import EstrategiaDespesas from "./pages/direcao/estrategia/EstrategiaDespesas";
import EstrategiaResultados from "./pages/direcao/estrategia/EstrategiaResultados";

// Hub de Estoque da Direção
import DirecaoEstoqueHub from "./pages/direcao/estoque/DirecaoEstoqueHub";
import AuditoriaFabrica from "./pages/direcao/estoque/AuditoriaFabrica";
import AuditoriaAlmoxarifado from "./pages/direcao/estoque/AuditoriaAlmoxarifado";
import ConfiguracoesEstoque from "./pages/direcao/estoque/ConfiguracoesEstoque";
import ProdutosHub from "./pages/direcao/estoque/ProdutosHub";
import ProdutosFabrica from "./pages/direcao/estoque/ProdutosFabrica";
import ProdutosAlmoxarifado from "./pages/direcao/estoque/ProdutosAlmoxarifado";
import ProdutosFabricaEdit from "./pages/direcao/estoque/ProdutosFabricaEdit";
import MateriasPrimasPage from "./pages/fabrica/MateriasPrimas";
import FornecedoresDirecao from "./pages/direcao/estoque/FornecedoresDirecao";

// Hub de Aprovações da Direção
import DirecaoAprovacoesHub from "./pages/direcao/aprovacoes/DirecaoAprovacoesHub";
import AprovacoesProducao from "./pages/direcao/aprovacoes/AprovacoesProducao";
import AprovacoesPedidos from "./pages/direcao/aprovacoes/AprovacoesPedidos";
import AprovacoesAutorizados from "./pages/direcao/aprovacoes/AprovacoesAutorizados";
import AprovacoesCompras from "./pages/direcao/aprovacoes/AprovacoesCompras";
import DirecaoFinanceiroHub from "./pages/direcao/financeiro/DirecaoFinanceiroHub";

// Hub de Logística Minimalista
import LogisticaHub from "./pages/logistica/LogisticaHub";

import ExpedicaoMinimalista from "./pages/logistica/ExpedicaoMinimalista";
import NovaNeoForm from "./pages/logistica/NovaNeoForm";

// Hub de Compras Minimalista
import ComprasHub from "./pages/administrativo/ComprasHub";
// Hub RH/DP Minimalista
import RhDpHub from "./pages/administrativo/RhDpHub";
import ColaboradoresMinimalista from "./pages/administrativo/ColaboradoresMinimalista";
import NovoColaborador from "./pages/administrativo/rh-dp/NovoColaborador";
import VagasPage from "./pages/administrativo/VagasPage";
import PreencherVagaPage from "./pages/administrativo/rh-dp/PreencherVagaPage";
import ResponsabilidadesPage from "./pages/administrativo/ResponsabilidadesPage";
import FuncoesPage from "./pages/administrativo/FuncoesPage";
import RequisicoesMinimalista from "./pages/administrativo/RequisicoesMinimalista";
import NovaRequisicaoCompra from "./pages/administrativo/NovaRequisicaoCompra";
import ItensAdministrativo from "./pages/administrativo/ItensAdministrativo";
import FornecedoresMinimalista from "./pages/administrativo/FornecedoresMinimalista";
import FrotaMinimalista from "./pages/logistica/FrotaMinimalista";
import FrotaNovoMinimalista from "./pages/logistica/FrotaNovoMinimalista";
import FrotaEditMinimalista from "./pages/logistica/FrotaEditMinimalista";
import FrotaConferenciasHistoricoMinimalista from "./pages/logistica/FrotaConferenciasHistoricoMinimalista";
import FrotaConferenciaMinimalista from "./pages/logistica/FrotaConferenciaMinimalista";
import FreteMinimalista from "./pages/logistica/FreteMinimalista";
import FreteHub from "./pages/logistica/FreteHub";
import FreteTransportadoras from "./pages/logistica/FreteTransportadoras";
import FreteValoresTransportadoras from "./pages/logistica/FreteValoresTransportadoras";

import PedidosPagosSemEntrega from "./pages/logistica/PedidosPagosSemEntrega";
import AutorizadosLogistica from "./pages/logistica/AutorizadosLogistica";
import AutorizadosPrecosDirecao from "./pages/direcao/AutorizadosPrecosDirecao";
import EstadoAutorizadosDirecao from "./pages/direcao/EstadoAutorizadosDirecao";
import NovoAutorizadoDirecao from "./pages/direcao/NovoAutorizadoDirecao";
import EditarAutorizadoDirecao from "./pages/direcao/EditarAutorizadoDirecao";
import InstalacoesHubDirecao from "./pages/direcao/InstalacoesHubDirecao";
import EquipesMinimalista from "./pages/logistica/EquipesMinimalista";
import EquipesDirecao from "./pages/direcao/EquipesDirecao";
import CronogramaMinimalista from "./pages/logistica/CronogramaMinimalista";
import OrdensInstalacoesLogistica from "./pages/logistica/OrdensInstalacoesLogistica";
import RankingEquipesInstalacao from "./pages/logistica/RankingEquipesInstalacao";
import RankingAutorizadosInstalacao from "./pages/logistica/RankingAutorizadosInstalacao";

// Hub de Estoque
import EstoqueHub from "./pages/estoque/EstoqueHub";
import EstoqueFabrica from "./pages/estoque/EstoqueFabrica";
import EstoqueFabricaEdit from "./pages/estoque/EstoqueFabricaEdit";
import AlmoxarifadoPage from "./pages/estoque/AlmoxarifadoPage";
import EstoqueFornecedores from "./pages/estoque/EstoqueFornecedores";
import ConferenciaHub from "./pages/estoque/ConferenciaHub";
import ConferenciaExecucao from "./pages/estoque/ConferenciaExecucao";
import AuditoriaEstoque from "./pages/estoque/AuditoriaEstoque";

// Hub Administrativo Minimalista
import AdministrativoHub from "./pages/administrativo/AdministrativoHub";
import PedidosAdminMinimalista from "./pages/administrativo/PedidosAdminMinimalista";
import PedidoViewMinimalista from "./pages/administrativo/PedidoViewMinimalista";
import FinanceiroHub from "./pages/administrativo/FinanceiroHub";
import CustoFolhaMensal from "./pages/administrativo/CustoFolhaMensal";
import FaturamentoHub from "./pages/administrativo/FaturamentoHub";
import FaturamentoVendasMinimalista from "./pages/administrativo/FaturamentoVendasMinimalista";
import FaturamentoProdutosMinimalista from "./pages/administrativo/FaturamentoProdutosMinimalista";
import FaturamentoVendaMinimalista from "./pages/administrativo/FaturamentoVendaMinimalista";
import CustosMinimalista from "./pages/administrativo/CustosMinimalista";
import CustosGridMinimalista from "./pages/administrativo/CustosGridMinimalista";
import CustosMesMinimalista from "./pages/administrativo/CustosMesMinimalista";
import GastosPage from "./pages/administrativo/GastosPage";
import BancosPage from "./pages/administrativo/BancosPage";

import CaixaHub from "./pages/administrativo/CaixaHub";
import GestaoCaixaMinimalista from "./pages/administrativo/GestaoCaixaMinimalista";
import ContasReceberMinimalista from "./pages/administrativo/ContasReceberMinimalista";
import ContasPagarMinimalista from "./pages/administrativo/ContasPagarMinimalista";
import DocumentosMinimalista from "./pages/administrativo/DocumentosMinimalista";
import MultasMinimalista from "./pages/administrativo/MultasMinimalista";

// Hub de Frotas da Direção
import FrotaDirecao from "./pages/direcao/FrotaDirecao";


// Hub Fiscal Minimalista
import FiscalHub from "./pages/administrativo/FiscalHub";
import NotasFiscaisMinimalista from "./pages/administrativo/NotasFiscaisMinimalista";
import EmitirNfeMinimalista from "./pages/administrativo/EmitirNfeMinimalista";
import EmitirNfseMinimalista from "./pages/administrativo/EmitirNfseMinimalista";
import ConfiguracoesFiscaisMinimalista from "./pages/administrativo/ConfiguracoesFiscaisMinimalista";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Não retry em erros de autenticação
        if (error?.message?.includes('Invalid Refresh Token')) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

// DashboardLayout foi removido - interface dashboard descontinuada

function HeaderUserInfo() {
  const { user } = useAuth();
  const { data: tarefasCount = 0 } = useTarefasCount();
  const [tarefasOpen, setTarefasOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="relative text-white hover:bg-white/10"
          onClick={() => setTarefasOpen(true)}
        >
          <CheckSquare className="h-4 w-4" />
          {tarefasCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
            >
              {tarefasCount}
            </Badge>
          )}
        </Button>

        <ProfileDropdownMenu variant="glass" avatarSize={32} />
      </div>

      <MinhasTarefasSheet open={tarefasOpen} onOpenChange={setTarefasOpen} />
    </>
  );
}

const RedirectPedidoAdmin = () => {
  const { id } = useParams();
  return <Navigate to={`/fabrica/montagem-pedidos/${id}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><MeuPerfil /></ProtectedRoute>} />
                <Route path="/home/pedidos-producao" element={<ProtectedRoute><GestaoFabricaDirecao /></ProtectedRoute>} />
                <Route path="/home/calendario-expedicao" element={<ProtectedRoute><CalendarioExpedicaoReadOnly /></ProtectedRoute>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forbidden" element={<Forbidden />} />

                {/* Hub de Marketing Minimalista */}
                <Route path="/marketing" element={<ProtectedRoute routeKeyPrefix="marketing_"><MarketingHub /></ProtectedRoute>} />
            <Route path="/marketing/performance" element={<ProtectedRoute routeKey="marketing_performance"><PerformanceMinimalista /></ProtectedRoute>} />
            <Route path="/marketing/canais-aquisicao" element={<ProtectedRoute routeKey="marketing_canais_aquisicao"><CanaisAquisicaoMinimalista /></ProtectedRoute>} />
            <Route path="/marketing/investimentos" element={<ProtectedRoute routeKey="marketing_investimentos"><InvestimentosMinimalista /></ProtectedRoute>} />
            <Route path="/marketing/midias" element={<ProtectedRoute routeKey="marketing_midias"><MidiasMinimalista /></ProtectedRoute>} />
            <Route path="/marketing/ltv" element={<ProtectedRoute routeKey="marketing_ltv"><LtvMinimalista /></ProtectedRoute>} />
            <Route path="/marketing/conversoes" element={<ProtectedRoute routeKey="marketing_conversoes"><Conversoes /></ProtectedRoute>} />
            <Route path="/marketing/conversoes-meta" element={<ProtectedRoute routeKey="marketing_conversoes"><ConversoesMeta /></ProtectedRoute>} />

                {/* Hub de Vendas Minimalista */}
                <Route path="/vendas" element={<ProtectedRoute routeKeyPrefix="vendas_"><VendasHub /></ProtectedRoute>} />
                <Route path="/vendas/minhas-vendas" element={<ProtectedRoute routeKey="vendas_hub"><MinhasVendas /></ProtectedRoute>} />
                <Route path="/vendas/minhas-vendas/nova" element={<ProtectedRoute routeKey="vendas_hub"><VendaNovaMinimalista /></ProtectedRoute>} />
                <Route path="/vendas/minhas-vendas/correcao" element={<ProtectedRoute routeKey="vendas_hub"><PedidoCorrecaoNovo /></ProtectedRoute>} />
                <Route path="/vendas/minhas-vendas/editar/:id" element={<ProtectedRoute routeKey="vendas_hub"><MinhasVendasEditar /></ProtectedRoute>} />
                <Route path="/vendas/meus-clientes" element={<ProtectedRoute routeKey="vendas_hub"><MeusClientes /></ProtectedRoute>} />
                <Route path="/vendas/meus-clientes/:id" element={<ProtectedRoute routeKey="vendas_hub"><MeuClienteDetalhe /></ProtectedRoute>} />
                <Route path="/vendas/catalogo" element={<Navigate to="/marketing/catalogo" replace />} />
                <Route path="/vendas/catalogo/new" element={<Navigate to="/marketing/catalogo/new" replace />} />
                <Route path="/vendas/catalogo/editar/:id" element={<Navigate to="/marketing/catalogo/editar/:id" replace />} />
                <Route path="/vendas/catalogo/cores" element={<Navigate to="/marketing/catalogo/cores" replace />} />
                <Route path="/marketing/catalogo" element={<ProtectedRoute routeKeyPrefix="marketing_"><CatalogoMinimalista /></ProtectedRoute>} />
                <Route path="/marketing/catalogo/new" element={<ProtectedRoute routeKeyPrefix="marketing_"><CatalogoNovoMinimalista /></ProtectedRoute>} />
                <Route path="/marketing/catalogo/editar/:id" element={<ProtectedRoute routeKeyPrefix="marketing_"><CatalogoEditMinimalista /></ProtectedRoute>} />
                <Route path="/marketing/catalogo/cores" element={<ProtectedRoute routeKeyPrefix="marketing_"><CatalogoCoresMinimalista /></ProtectedRoute>} />
                <Route path="/vendas/meus-orcamentos" element={<ProtectedRoute routeKey="vendas_hub"><MeusOrcamentos /></ProtectedRoute>} />
                <Route path="/vendas/meus-parceiros" element={<ProtectedRoute routeKey="vendas_hub"><MeusParceiros /></ProtectedRoute>} />
                <Route path="/vendas/acompanhar-pedido" element={<ProtectedRoute routeKey="vendas_hub"><AcompanharPedido /></ProtectedRoute>} />
                <Route path="/vendas/visitas-tecnicas" element={<ProtectedRoute routeKey="vendas_visitas_tecnicas"><VisitasTecnicas /></ProtectedRoute>} />

                {/* Hub da Fábrica Minimalista */}
                <Route path="/fabrica" element={<ProtectedRoute routeKeyPrefix="fabrica_"><FabricaHub /></ProtectedRoute>} />
                <Route path="/fabrica/ordens-pedidos" element={<ProtectedRoute routeKey="fabrica_ordens_pedidos"><OrdensPorPedido /></ProtectedRoute>} />
                <Route path="/fabrica/cronograma-producao" element={<ProtectedRoute routeKey="fabrica_cronograma_producao"><CronogramaProducao /></ProtectedRoute>} />
                <Route path="/fabrica/produtos" element={<ProtectedRoute routeKey="fabrica_produtos"><ProdutosFabrica /></ProtectedRoute>} />
                <Route path="/fabrica/produtos/editar/:id" element={<ProtectedRoute routeKey="fabrica_produtos"><ProdutosFabricaEdit /></ProtectedRoute>} />
                <Route path="/fabrica/produtos/materias-primas" element={<ProtectedRoute routeKey="fabrica_produtos"><MateriasPrimasPage /></ProtectedRoute>} />

                {/* Hub da Direção Minimalista */}
                <Route path="/direcao" element={<ProtectedRoute routeKeyPrefix="direcao_"><DirecaoHub /></ProtectedRoute>} />
                <Route path="/direcao/vendas" element={<ProtectedRoute routeKey="direcao_hub"><VendasDirecao /></ProtectedRoute>} />
                <Route path="/direcao/vendas/regras-vendas" element={<ProtectedRoute routeKey="direcao_regras_vendas"><RegrasVendasDirecao /></ProtectedRoute>} />
                <Route path="/direcao/vendas/clientes" element={<ProtectedRoute routeKey="direcao_vendas"><ClientesDirecao /></ProtectedRoute>} />
                <Route path="/direcao/vendas/tabela-precos" element={<ProtectedRoute routeKey="direcao_tabela_precos"><TabelaPrecos /></ProtectedRoute>} />
                <Route path="/direcao/vendas/:id" element={<ProtectedRoute routeKey="direcao_hub"><VendaDetalhesDirecao /></ProtectedRoute>} />
                <Route path="/direcao/vendas/:id/editar" element={<ProtectedRoute routeKey="direcao_hub"><VendaEditarDirecao /></ProtectedRoute>} />
                <Route path="/direcao/faturamento" element={<ProtectedRoute routeKey="direcao_hub"><FaturamentoDirecao /></ProtectedRoute>} />
                <Route path="/direcao/financeiro" element={<ProtectedRoute routeKey="direcao_hub"><DirecaoFinanceiroHub /></ProtectedRoute>} />
                <Route path="/direcao/faturamento/venda/:id" element={<ProtectedRoute routeKey="direcao_hub"><FaturamentoVendaDirecao /></ProtectedRoute>} />
                <Route path="/direcao/gestao-fabrica" element={<ProtectedRoute routeKey="direcao_gestao_fabrica"><GestaoFabricaDirecao /></ProtectedRoute>} />
                <Route path="/direcao/gestao-instalacao" element={<ProtectedRoute routeKey="direcao_hub"><GestaoInstalacaoDirecao /></ProtectedRoute>} />
                <Route path="/direcao/gestao-instalacao/ordens-instalacoes" element={<ProtectedRoute routeKey="direcao_hub"><OrdensInstalacoesDirecao /></ProtectedRoute>} />
                <Route path="/direcao/gestao-instalacao/instalacoes" element={<ProtectedRoute routeKey="direcao_hub"><InstalacoesHubDirecao /></ProtectedRoute>} />
                <Route path="/direcao/gestao-instalacao/instalacoes/ordens-instalacoes" element={<ProtectedRoute routeKey="direcao_hub"><OrdensInstalacoesLogistica /></ProtectedRoute>} />
                <Route path="/direcao/gestao-instalacao/instalacoes/equipes" element={<ProtectedRoute routeKey="direcao_hub"><EquipesMinimalista /></ProtectedRoute>} />
                <Route path="/direcao/gestao-instalacao/instalacoes/cronograma" element={<ProtectedRoute routeKey="direcao_hub"><CronogramaMinimalista /></ProtectedRoute>} />
                <Route path="/direcao/gestao-instalacao/instalacoes/ranking" element={<ProtectedRoute routeKey="direcao_hub"><RankingEquipesInstalacao /></ProtectedRoute>} />
                <Route path="/direcao/gestao-instalacao/equipes" element={<ProtectedRoute routeKey="direcao_hub"><EquipesDirecao /></ProtectedRoute>} />
                <Route path="/direcao/calendario-expedicao" element={<ProtectedRoute routeKey="direcao_hub"><CalendarioExpedicaoDirecao /></ProtectedRoute>} />
                <Route path="/direcao/metas" element={<ProtectedRoute routeKey="direcao_hub"><MetasHubDirecao /></ProtectedRoute>} />
                <Route path="/direcao/metas/fabrica" element={<ProtectedRoute routeKey="direcao_hub"><MetasFabricaDirecao /></ProtectedRoute>} />
                <Route path="/direcao/metas/instalacoes" element={<ProtectedRoute routeKey="direcao_metas_instalacoes"><MetasInstalacoesDirecao /></ProtectedRoute>} />
                <Route path="/direcao/metas/instalacoes/:userId" element={<ProtectedRoute routeKey="direcao_metas_instalacoes"><MetasColaboradorIndividual /></ProtectedRoute>} />
                <Route path="/direcao/metas/fabrica/:userId" element={<ProtectedRoute routeKey="direcao_hub"><MetasColaboradorIndividual /></ProtectedRoute>} />
                <Route path="/direcao/metas/vendas" element={<ProtectedRoute routeKey="direcao_hub"><MetasVendasDirecao /></ProtectedRoute>} />
                <Route path="/direcao/pedidos/:id" element={<ProtectedRoute routeKey="direcao_hub"><PedidoViewDirecao /></ProtectedRoute>} />
                <Route path="/direcao/autorizados" element={<ProtectedRoute routeKey="direcao_autorizados"><AutorizadosPrecosDirecao /></ProtectedRoute>} />
                <Route path="/direcao/autorizados/estado/:estadoId" element={<ProtectedRoute routeKey="direcao_autorizados"><EstadoAutorizadosDirecao /></ProtectedRoute>} />
                <Route path="/direcao/autorizados/estado/:estadoId/novo" element={<ProtectedRoute routeKey="direcao_autorizados"><NovoAutorizadoDirecao /></ProtectedRoute>} />
                <Route path="/direcao/autorizados/novo" element={<ProtectedRoute routeKey="direcao_autorizados"><NovoAutorizadoDirecao /></ProtectedRoute>} />
                <Route path="/direcao/autorizados/:id/editar" element={<ProtectedRoute routeKey="direcao_autorizados"><EditarAutorizadoDirecao /></ProtectedRoute>} />
                
{/* Hub de Frotas da Direção */}
                <Route path="/direcao/frota" element={<ProtectedRoute routeKey="direcao_hub"><FrotaDirecao /></ProtectedRoute>} />
                <Route path="/direcao/frota/novo" element={<ProtectedRoute routeKey="direcao_hub"><FrotaNovoMinimalista /></ProtectedRoute>} />
                <Route path="/direcao/frota/:id/editar" element={<ProtectedRoute routeKey="direcao_hub"><FrotaEditMinimalista /></ProtectedRoute>} />
                <Route path="/direcao/frota/:id/conferencias" element={<ProtectedRoute routeKey="direcao_hub"><FrotaConferenciasHistoricoMinimalista /></ProtectedRoute>} />
                <Route path="/direcao/frota/conferencia" element={<ProtectedRoute routeKey="direcao_hub"><FrotaConferenciaMinimalista /></ProtectedRoute>} />

{/* Hub de Estoque da Direção */}
                <Route path="/direcao/estoque" element={<ProtectedRoute routeKey="direcao_hub"><DirecaoEstoqueHub /></ProtectedRoute>} />
                <Route path="/direcao/estoque/auditoria/fabrica" element={<ProtectedRoute routeKey="direcao_hub"><AuditoriaFabrica /></ProtectedRoute>} />
                <Route path="/direcao/estoque/auditoria/almoxarifado" element={<ProtectedRoute routeKey="direcao_hub"><AuditoriaAlmoxarifado /></ProtectedRoute>} />
                <Route path="/direcao/estoque/configuracoes" element={<ProtectedRoute routeKey="direcao_hub"><ConfiguracoesEstoque /></ProtectedRoute>} />
                <Route path="/direcao/estoque/configuracoes/produtos" element={<ProtectedRoute routeKey="direcao_hub"><ProdutosHub /></ProtectedRoute>} />
                <Route path="/direcao/estoque/configuracoes/produtos/fabrica" element={<ProtectedRoute routeKey="direcao_hub"><ProdutosFabrica /></ProtectedRoute>} />
                <Route path="/direcao/estoque/configuracoes/produtos/fabrica/editar/:id" element={<ProtectedRoute routeKey="direcao_hub"><ProdutosFabricaEdit /></ProtectedRoute>} />
                <Route path="/direcao/estoque/configuracoes/produtos/almoxarifado" element={<ProtectedRoute routeKey="direcao_hub"><ProdutosAlmoxarifado /></ProtectedRoute>} />
                <Route path="/direcao/estoque/configuracoes/fornecedores" element={<ProtectedRoute routeKey="direcao_hub"><FornecedoresDirecao /></ProtectedRoute>} />

                {/* DRE da Direção */}
                <Route path="/direcao/dre" element={<ProtectedRoute routeKey="direcao_dre"><DREDirecao /></ProtectedRoute>} />
                <Route path="/direcao/dre/despesas" element={<ProtectedRoute routeKey="direcao_dre"><DREDespesasDirecao /></ProtectedRoute>} />
                <Route path="/direcao/dre/custos" element={<ProtectedRoute routeKey="direcao_dre"><DRECustosDirecao /></ProtectedRoute>} />
                <Route path="/direcao/dre/:mes" element={<ProtectedRoute routeKey="direcao_dre"><DREMesDirecao /></ProtectedRoute>} />

                {/* Caixa Elisa */}
                <Route path="/direcao/caixa-elisa" element={<ProtectedRoute routeKey="direcao_caixa_elisa"><CaixaElisaDirecao /></ProtectedRoute>} />

                {/* Estratégia */}
                <Route path="/direcao/estrategia" element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaHub /></ProtectedRoute>} />
                <Route path="/direcao/estrategia/itens" element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaItens /></ProtectedRoute>} />
                <Route path="/direcao/estrategia/kits" element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaKits /></ProtectedRoute>} />
                <Route path="/direcao/estrategia/precos" element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaPrecos /></ProtectedRoute>} />
                <Route path="/direcao/estrategia/despesas" element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaDespesas /></ProtectedRoute>} />
                <Route path="/direcao/estrategia/resultados" element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaResultados /></ProtectedRoute>} />

                {/* Organograma RH */}
                <Route path="/direcao/gestao-colaboradores" element={<ProtectedRoute routeKey="direcao_gestao_colaboradores"><GestaoColaboradoresDirecao /></ProtectedRoute>} />

                {/* Hub de Aprovações da Direção */}
                <Route path="/direcao/aprovacoes" element={<ProtectedRoute routeKey="direcao_aprovacoes"><DirecaoAprovacoesHub /></ProtectedRoute>} />
                <Route path="/direcao/aprovacoes/pedidos" element={<ProtectedRoute routeKey="direcao_aprovacoes_pedidos"><AprovacoesPedidos /></ProtectedRoute>} />
                <Route path="/direcao/aprovacoes/fabrica" element={<ProtectedRoute routeKey="direcao_aprovacoes"><AprovacoesProducao /></ProtectedRoute>} />
                <Route path="/direcao/aprovacoes/autorizados" element={<ProtectedRoute routeKey="direcao_aprovacoes"><AprovacoesAutorizados /></ProtectedRoute>} />
                <Route path="/direcao/aprovacoes/compras" element={<ProtectedRoute routeKey="direcao_aprovacoes"><AprovacoesCompras /></ProtectedRoute>} />

                {/* Checklist Liderança */}
                <Route path="/direcao/checklist-lideranca" element={<ProtectedRoute routeKey="direcao_checklist"><ChecklistLideranca /></ProtectedRoute>} />
                <Route path="/direcao/checklist-lideranca/programacao" element={<ProtectedRoute routeKey="direcao_checklist"><ChecklistProgramacao /></ProtectedRoute>} />
                <Route path="/direcao/checklist-lideranca/historico" element={<ProtectedRoute routeKey="direcao_checklist"><ChecklistHistorico /></ProtectedRoute>} />

                {/* Hub de Logística Minimalista */}
                <Route path="/logistica" element={<ProtectedRoute routeKeyPrefix="logistica_"><LogisticaHub /></ProtectedRoute>} />
                
                <Route path="/logistica/expedicao" element={<ProtectedRoute routeKey="logistica_hub"><ExpedicaoMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/frota" element={<ProtectedRoute routeKey="logistica_hub"><FrotaMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/frota/novo" element={<ProtectedRoute routeKey="logistica_hub"><FrotaNovoMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/frota/:id/editar" element={<ProtectedRoute routeKey="logistica_hub"><FrotaEditMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/frota/:id/conferencias" element={<ProtectedRoute routeKey="logistica_hub"><FrotaConferenciasHistoricoMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/frota/conferencia" element={<ProtectedRoute routeKey="logistica_hub"><FrotaConferenciaMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/frete" element={<ProtectedRoute routeKey="logistica_hub"><FreteHub /></ProtectedRoute>} />
                <Route path="/logistica/frete/internos" element={<ProtectedRoute routeKey="logistica_hub"><FreteMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/frete/transportadoras" element={<ProtectedRoute routeKey="logistica_hub"><FreteTransportadoras /></ProtectedRoute>} />
                <Route path="/logistica/frete/valores" element={<ProtectedRoute routeKey="logistica_hub"><FreteValoresTransportadoras /></ProtectedRoute>} />
                <Route path="/logistica/autorizados" element={<ProtectedRoute routeKey="logistica_autorizados"><AutorizadosLogistica /></ProtectedRoute>} />
                <Route path="/logistica/autorizados/estado/:estadoId" element={<ProtectedRoute routeKey="logistica_autorizados"><EstadoAutorizadosDirecao /></ProtectedRoute>} />
                <Route path="/logistica/autorizados/estado/:estadoId/novo" element={<ProtectedRoute routeKey="logistica_autorizados"><NovoAutorizadoDirecao /></ProtectedRoute>} />
                <Route path="/logistica/autorizados/novo" element={<ProtectedRoute routeKey="logistica_autorizados"><NovoAutorizadoDirecao /></ProtectedRoute>} />
                <Route path="/logistica/autorizados/:id/editar" element={<ProtectedRoute routeKey="logistica_autorizados"><EditarAutorizadoDirecao /></ProtectedRoute>} />
                <Route path="/logistica/pedidos-sem-entrega" element={<ProtectedRoute routeKey="logistica_pedidos_sem_entrega"><PedidosPagosSemEntrega /></ProtectedRoute>} />
                
                <Route path="/logistica/instalacoes" element={<ProtectedRoute routeKey="logistica_hub"><OrdensInstalacoesLogistica /></ProtectedRoute>} />
                <Route path="/logistica/instalacoes/ordens-instalacoes" element={<ProtectedRoute routeKey="logistica_hub"><OrdensInstalacoesLogistica /></ProtectedRoute>} />
                <Route path="/logistica/instalacoes/equipes" element={<ProtectedRoute routeKey="logistica_hub"><EquipesMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/instalacoes/cronograma" element={<ProtectedRoute routeKey="logistica_hub"><CronogramaMinimalista /></ProtectedRoute>} />
                <Route path="/logistica/instalacoes/ranking" element={<ProtectedRoute routeKey="logistica_ranking"><RankingEquipesInstalacao /></ProtectedRoute>} />
                <Route path="/logistica/instalacoes/ranking-autorizados" element={<ProtectedRoute routeKey="logistica_ranking"><RankingAutorizadosInstalacao /></ProtectedRoute>} />
                <Route path="/logistica/expedicao/nova-neo" element={<ProtectedRoute routeKey="logistica_hub"><NovaNeoForm /></ProtectedRoute>} />
                <Route path="/logistica/expedicao/editar-neo/:id" element={<ProtectedRoute routeKey="logistica_hub"><NovaNeoForm /></ProtectedRoute>} />

                {/* Hub de Estoque */}
                <Route path="/estoque" element={<ProtectedRoute routeKey="estoque_hub"><EstoqueHub /></ProtectedRoute>} />
                <Route path="/estoque/fabrica" element={<ProtectedRoute routeKey="estoque_fabrica"><EstoqueFabrica /></ProtectedRoute>} />
                <Route path="/estoque/fabrica/editar-item/:id" element={<ProtectedRoute routeKey="estoque_fabrica"><EstoqueFabricaEdit /></ProtectedRoute>} />
                <Route path="/estoque/almoxarifado" element={<ProtectedRoute routeKey="estoque_almoxarifado"><AlmoxarifadoPage /></ProtectedRoute>} />
                <Route path="/estoque/fornecedores" element={<ProtectedRoute routeKey="estoque_fornecedores"><EstoqueFornecedores /></ProtectedRoute>} />
                <Route path="/estoque/conferencia" element={<ProtectedRoute routeKey="estoque_conferencia"><ConferenciaHub /></ProtectedRoute>} />
                <Route path="/estoque/conferencia/:id" element={<ProtectedRoute routeKey="estoque_conferencia"><ConferenciaExecucao /></ProtectedRoute>} />
                <Route path="/estoque/auditoria" element={<ProtectedRoute routeKey="estoque_auditoria"><AuditoriaEstoque /></ProtectedRoute>} />

                {/* Hub Administrativo Minimalista */}
                <Route path="/administrativo" element={<ProtectedRoute routeKeyPrefix="administrativo_"><AdministrativoHub /></ProtectedRoute>} />
                <Route path="/administrativo/pedidos" element={<Navigate to="/fabrica/montagem-pedidos" replace />} />
                <Route path="/administrativo/pedidos/:id" element={<RedirectPedidoAdmin />} />
                <Route path="/fabrica/montagem-pedidos" element={<ProtectedRoute routeKey="administrativo_hub"><PedidosAdminMinimalista /></ProtectedRoute>} />
                <Route path="/fabrica/montagem-pedidos/:id" element={<ProtectedRoute routeKey="administrativo_hub"><PedidoViewMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/vendas/:id" element={<ProtectedRoute routeKey="administrativo_hub"><VendaDetalhesMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro" element={<ProtectedRoute routeKey="administrativo_hub"><FinanceiroHub /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/faturamento" element={<ProtectedRoute routeKey="administrativo_hub"><FaturamentoHub /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/faturamento/vendas" element={<ProtectedRoute routeKey="administrativo_hub"><FaturamentoVendasMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/faturamento/produtos" element={<ProtectedRoute routeKey="administrativo_hub"><FaturamentoProdutosMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/faturamento/:id" element={<ProtectedRoute routeKey="administrativo_hub"><FaturamentoVendaMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/custos/:mes" element={<ProtectedRoute routeKey="administrativo_hub"><CustosMesMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/custos" element={<ProtectedRoute routeKey="administrativo_hub"><CustosGridMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/gastos" element={<ProtectedRoute routeKey="admin_gastos"><GastosPage /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/custo-folha" element={<ProtectedRoute routeKey="administrativo_hub"><CustoFolhaMensal /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/bancos" element={<ProtectedRoute routeKey="admin_bancos"><BancosPage /></ProtectedRoute>} />
                
                
                {/* Hub de Caixa Minimalista */}
                <Route path="/administrativo/financeiro/caixa" element={<ProtectedRoute routeKey="administrativo_hub"><CaixaHub /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/caixa/gestao" element={<ProtectedRoute routeKey="administrativo_hub"><GestaoCaixaMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/caixa/contas-a-receber" element={<ProtectedRoute routeKey="administrativo_hub"><ContasReceberMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/financeiro/caixa/contas-a-pagar" element={<ProtectedRoute routeKey="administrativo_hub"><ContasPagarMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/documentos" element={<ProtectedRoute routeKey="administrativo_hub"><DocumentosMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/documentos/novo" element={<ProtectedRoute routeKey="administrativo_hub"><DocumentoNovo /></ProtectedRoute>} />
                <Route path="/administrativo/multas" element={<ProtectedRoute routeKey="admin_multas"><MultasMinimalista /></ProtectedRoute>} />
                

                {/* Hub RH/DP Minimalista */}
                <Route path="/administrativo/rh-dp" element={<ProtectedRoute routeKey="administrativo_hub"><RhDpHub /></ProtectedRoute>} />
                <Route path="/administrativo/rh-dp/colaboradores" element={<ProtectedRoute routeKey="administrativo_hub"><ColaboradoresMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/rh-dp/colaboradores/folha-pagamento" element={<ProtectedRoute routeKey="admin_rh_dp_folha"><FolhaPagamentoNova /></ProtectedRoute>} />
                <Route path="/administrativo/rh-dp/colaboradores/novo" element={<ProtectedRoute routeKey="administrativo_hub"><NovoColaborador /></ProtectedRoute>} />
                <Route path="/administrativo/rh-dp/vagas" element={<ProtectedRoute routeKey="admin_rh_dp_vagas"><VagasPage /></ProtectedRoute>} />
                <Route path="/administrativo/rh-dp/vagas/preencher/:vagaId" element={<ProtectedRoute routeKey="admin_rh_dp_vagas"><PreencherVagaPage /></ProtectedRoute>} />
                <Route path="/administrativo/rh-dp/responsabilidades" element={<ProtectedRoute routeKey="admin_rh_dp_responsabilidades"><ResponsabilidadesPage /></ProtectedRoute>} />
                <Route path="/administrativo/rh-dp/funcoes" element={<ProtectedRoute routeKey="admin_rh_dp_funcoes"><FuncoesPage /></ProtectedRoute>} />

                {/* Hub de Compras Minimalista */}
                <Route path="/administrativo/compras" element={<ProtectedRoute routeKey="administrativo_hub"><ComprasHub /></ProtectedRoute>} />
                <Route path="/administrativo/compras/estoque" element={<ProtectedRoute routeKey="administrativo_hub"><ItensAdministrativo /></ProtectedRoute>} />
                <Route path="/administrativo/compras/requisicoes" element={<ProtectedRoute routeKey="administrativo_hub"><RequisicoesMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/compras/requisicoes/nova" element={<ProtectedRoute routeKey="administrativo_hub"><NovaRequisicaoCompra /></ProtectedRoute>} />
                <Route path="/administrativo/compras/itens" element={<ProtectedRoute routeKey="administrativo_hub"><ItensAdministrativo /></ProtectedRoute>} />
                <Route path="/administrativo/compras/fornecedores" element={<ProtectedRoute routeKey="administrativo_hub"><FornecedoresMinimalista /></ProtectedRoute>} />

                {/* Hub Fiscal Minimalista */}
                <Route path="/administrativo/fiscal" element={<ProtectedRoute routeKey="administrativo_hub"><FiscalHub /></ProtectedRoute>} />
                <Route path="/administrativo/fiscal/notas-fiscais" element={<ProtectedRoute routeKey="administrativo_hub"><NotasFiscaisMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/fiscal/notas-fiscais/emitir-nfe" element={<ProtectedRoute routeKey="administrativo_hub"><EmitirNfeMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/fiscal/notas-fiscais/emitir-nfse" element={<ProtectedRoute routeKey="administrativo_hub"><EmitirNfseMinimalista /></ProtectedRoute>} />
                <Route path="/administrativo/fiscal/configuracoes" element={<ProtectedRoute routeKey="administrativo_hub"><ConfiguracoesFiscaisMinimalista /></ProtectedRoute>} />

                <Route path="/producao/login" element={<ProducaoLogin />} />
                <Route path="/producao/forbidden" element={<ForbiddenProducao />} />

                {/* Todas as rotas de produção sob um único ProducaoAuthProvider */}
                <Route
                  path="/producao/*"
                  element={
                    <ProducaoAuthProvider>
                      <Routes>
                        <Route
                          index
                          element={
                            <ProtectedProducaoRoute>
                              <ProducaoLayout>
                                <ProducaoHome />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/solda"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_solda">
                              <ProducaoLayout>
                                <ProducaoSolda />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/perfiladeira"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_perfiladeira">
                              <ProducaoLayout>
                                <ProducaoPerfiladeira />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/separacao"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_separacao">
                              <ProducaoLayout>
                                <ProducaoSeparacao />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/pintura"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_pintura">
                              <ProducaoLayout>
                                <ProducaoPintura />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/qualidade"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_qualidade">
                              <ProducaoLayout>
                                <ProducaoQualidade />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/carregamento"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_carregamento">
                              <ProducaoLayout>
                                <ProducaoCarregamento />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/embalagem"
                          element={
                            <ProtectedProducaoRoute>
                              <ProducaoLayout>
                                <ProducaoEmbalagem />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/instalacoes"
                          element={
                            <ProtectedProducaoRoute>
                              <ProducaoLayout>
                                <ProducaoInstalacoes />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/controle"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_controle">
                              <ProducaoLayout>
                                <ProducaoControle />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/controle/pedido/:id/view"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_controle">
                              <ProducaoLayout>
                                <PedidoView />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/terceirizacao"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_terceirizacao">
                              <ProducaoLayout>
                                <ProducaoTerceirizacao />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/pedidos/:id"
                          element={
                            <ProtectedProducaoRoute>
                              <ProducaoLayout>
                                <PedidoView />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route
                          path="/meu-historico"
                          element={
                            <ProtectedProducaoRoute>
                              <MeuHistoricoMinimalista />
                            </ProtectedProducaoRoute>
                          }
                        />
                        <Route 
                          path="/conferencia-estoque" 
                          element={
                            <ProtectedProducaoRoute>
                              <ProducaoLayout>
                                <ConferenciaEstoqueProducao />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          } 
                        />
                        <Route 
                          path="/conferencia-estoque/:id" 
                          element={
                            <ProtectedProducaoRoute>
                              <ProducaoLayout>
                                <ConferenciaExecucaoProducao />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          } 
                        />
                        <Route 
                          path="/conferencia-almox" 
                          element={
                            <ProtectedProducaoRoute>
                              <ProducaoLayout>
                                <ConferenciaAlmoxProducao />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          } 
                        />
                        <Route 
                          path="/conferencia-almox/:id" 
                          element={
                            <ProtectedProducaoRoute>
                              <ProducaoLayout>
                                <ConferenciaAlmoxExecucao />
                              </ProducaoLayout>
                            </ProtectedProducaoRoute>
                          } 
                        />
                        <Route
                          path="/gestao-pedidos"
                          element={
                            <ProtectedProducaoRoute routeKey="producao_gestao_pedidos">
                              <GestaoPedidosProducao />
                            </ProtectedProducaoRoute>
                          }
                        />
                      </Routes>
                    </ProducaoAuthProvider>
                  }
                />
                
                {/* Redirects das rotas antigas para as novas */}
                <Route path="/hub-fabrica" element={<Navigate to="/producao" replace />} />
                <Route path="/hub-fabrica/*" element={<Navigate to="/producao" replace />} />
                {/* Dashboard descontinuado - Redirect para /home */}
                <Route path="/dashboard" element={<Navigate to="/home" replace />} />
                <Route path="/dashboard/*" element={<Navigate to="/home" replace />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute routeKey="admin">
                      <AdminHub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/permissions"
                  element={
                    <ProtectedRoute routeKey="admin_permissions">
                      <AdminPermissionsMinimalista />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/roles"
                  element={
                    <ProtectedRoute routeKey="admin_roles">
                      <AdminRolesMinimalista />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/companies"
                  element={
                    <ProtectedRoute routeKey="admin_companies">
                      <AdminCompaniesMinimalista />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/companies/:id"
                  element={
                    <ProtectedRoute routeKey="admin_companies">
                      <AdminCompanyEditMinimalista />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute routeKey="users">
                      <AdminUsersMinimalista />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/logs"
                  element={
                    <ProtectedRoute routeKey="admin_logs">
                      <AdminLogs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/company"
                  element={
                    <Navigate to="/admin/companies" replace />
                  }
                />

                {/* Hub de Painéis */}
                <Route path="/paineis" element={<ProtectedRoute routeKey="paineis"><PaineisHome /></ProtectedRoute>} />
                <Route path="/paineis/tv-dashboard" element={<ProtectedRoute routeKey="tv_dashboard"><TvDashboard /></ProtectedRoute>} />
                <Route path="/paineis/mapa" element={<ProtectedRoute routeKey="mapa_autorizados"><MapaAutorizados /></ProtectedRoute>} />
                <Route path="/paineis/diario-bordo" element={<ProtectedRoute routeKey="diario_bordo"><DiarioBordo /></ProtectedRoute>} />
                <Route path="/paineis/calendario" element={<ProtectedRoute routeKey="calendario"><Calendario /></ProtectedRoute>} />
                <Route path="/paineis/contador-vendas" element={<ProtectedRoute routeKey="contador_vendas"><ContadorVendas /></ProtectedRoute>} />
                <Route path="/paineis/metas-vendas" element={<ProtectedRoute routeKey="paineis_metas_vendas"><PaineisMetasVendas /></ProtectedRoute>} />
                
                {/* Redirect TV Dashboard */}
                <Route path="/tv-dashboard" element={<Navigate to="/paineis/tv-dashboard" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;