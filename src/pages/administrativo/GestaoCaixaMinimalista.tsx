import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Calendar, CalendarDays, Settings, ArrowLeft, Banknote, AlertTriangle, ShieldCheck } from "lucide-react";
import { addWeeks, addMonths } from "date-fns";
import { useDepositosCaixa } from "@/hooks/useDepositosCaixa";
import { CalendarioSemanalCaixa } from "@/components/caixa/CalendarioSemanalCaixa";
import { CalendarioMensalCaixa } from "@/components/caixa/CalendarioMensalCaixa";
import { AdicionarDepositoModal } from "@/components/caixa/AdicionarDepositoModal";
import { DepositoCaixa, CATEGORIAS_DEPOSITO } from "@/types/caixa";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
export default function GestaoCaixaMinimalista() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [depositoModal, setDepositoModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDeposito, setSelectedDeposito] = useState<DepositoCaixa | null>(null);
  
  const [giroCaixaTotal, setGiroCaixaTotal] = useState<number>(500000);
  const [capitalTomado, setCapitalTomado] = useState<number>(200000);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { 
    depositos, 
    totaisAcumulados,
    loading, 
    createDeposito, 
    updateDeposito, 
    deleteDeposito 
  } = useDepositosCaixa(currentDate, viewMode);

  const handleAddDeposito = (date: Date) => {
    setSelectedDate(date);
    setSelectedDeposito(null);
    setDepositoModal(true);
  };

  const handleEditDeposito = (deposito: DepositoCaixa) => {
    setSelectedDeposito(deposito);
    setSelectedDate(null);
    setDepositoModal(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const valorDisponivel = giroCaixaTotal - capitalTomado;
  const totalDepositos = totaisAcumulados.totalTravesseiro + totaisAcumulados.totalPrecaucoes;

  const indicadores = [
    { 
      label: "Giro de Caixa (Total)", 
      value: formatCurrency(giroCaixaTotal), 
      icon: Wallet,
      color: "from-purple-500 to-purple-700"
    },
    { 
      label: "Capital Tomado", 
      value: formatCurrency(capitalTomado), 
      icon: Banknote,
      color: "from-rose-500 to-rose-700"
    },
    { 
      label: "Valor Disponível", 
      value: formatCurrency(valorDisponivel), 
      icon: ShieldCheck,
      color: "from-emerald-500 to-emerald-700"
    },
    { 
      label: "Travesseiro", 
      value: formatCurrency(totaisAcumulados.totalTravesseiro), 
      icon: Wallet,
      color: "from-blue-500 to-blue-700"
    },
    { 
      label: "Precauções", 
      value: formatCurrency(totaisAcumulados.totalPrecaucoes), 
      icon: AlertTriangle,
      color: "from-amber-500 to-amber-700"
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Breadcrumb */}
      <AnimatedBreadcrumb 
        items={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "Financeiro", path: "/administrativo/financeiro" },
          { label: "Caixa", path: "/administrativo/financeiro/caixa" },
          { label: "Gestão" }
        ]} 
        mounted={mounted} 
      />

      {/* Menu de Perfil Flutuante */}
      {/* Botão Voltar */}
      <button
        onClick={() => navigate('/administrativo/financeiro/caixa')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10
                   hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms'
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="container mx-auto px-4 py-20 space-y-6">
        {/* Header */}
        <div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 200ms'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestão de Caixa</h1>
              <p className="text-white/60 text-sm">Controle de depósitos e movimentações</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'week' ? 'default' : 'outline'}
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-700 border-purple-400/30' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }
            >
              <Calendar className="h-4 w-4 mr-2" />
              Semana
            </Button>
            <Button 
              variant={viewMode === 'month' ? 'default' : 'outline'}
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-700 border-purple-400/30' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Mês
            </Button>
          </div>
        </div>

        {/* Configuração de Giro de Caixa */}
        <Card 
          className="bg-white/5 border-white/10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms'
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Settings className="h-5 w-5 text-purple-400" />
              Configuração de Giro de Caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="giro-total" className="text-white/70">Giro de Caixa (Total)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">R$</span>
                  <Input
                    id="giro-total"
                    type="number"
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    value={giroCaixaTotal}
                    onChange={(e) => setGiroCaixaTotal(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capital-tomado" className="text-white/70">Capital Tomado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">R$</span>
                  <Input
                    id="capital-tomado"
                    type="number"
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    value={capitalTomado}
                    onChange={(e) => setCapitalTomado(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicadores */}
        <div 
          className="grid grid-cols-2 md:grid-cols-5 gap-3"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 400ms'
          }}
        >
          {indicadores.map((ind, index) => {
            const Icon = ind.icon;
            return (
              <Card key={ind.label} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${ind.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">{ind.label}</p>
                      <p className="text-sm font-semibold text-white">{ind.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Calendário */}
        <Card 
          className="bg-white/5 border-white/10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 500ms'
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">
              {viewMode === 'week' ? 'Visualização Semanal' : 'Visualização Mensal'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : viewMode === 'week' ? (
              <CalendarioSemanalCaixa
                currentWeek={currentDate}
                depositos={depositos}
                onAddDeposito={handleAddDeposito}
                onEditDeposito={handleEditDeposito}
                onDeleteDeposito={deleteDeposito}
                onPreviousWeek={() => setCurrentDate(addWeeks(currentDate, -1))}
                onNextWeek={() => setCurrentDate(addWeeks(currentDate, 1))}
                onToday={() => setCurrentDate(new Date())}
              />
            ) : (
              <CalendarioMensalCaixa
                currentMonth={currentDate}
                depositos={depositos}
                onAddDeposito={handleAddDeposito}
                onEditDeposito={handleEditDeposito}
                onDeleteDeposito={deleteDeposito}
                onPreviousMonth={() => setCurrentDate(addMonths(currentDate, -1))}
                onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
                onToday={() => setCurrentDate(new Date())}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de adicionar/editar depósito */}
      <AdicionarDepositoModal
        open={depositoModal}
        onOpenChange={setDepositoModal}
        selectedDate={selectedDate}
        deposito={selectedDeposito}
        onSave={createDeposito}
        onUpdate={updateDeposito}
        onDelete={deleteDeposito}
      />
    </div>
  );
}
