import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";
import { useInvestments } from "@/hooks/useInvestments";
import MonthlyInvestmentGrid from "@/components/investimentos/MonthlyInvestmentGrid";
import InvestmentModal from "@/components/investimentos/InvestmentModal";
import InvestmentChart from "@/components/investimentos/InvestmentChart";
import { MinimalistLayout } from "@/components/MinimalistLayout";

export default function InvestimentosMinimalista() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const { investments, loading, saveInvestment } = useInvestments(selectedYear);

  return (
    <MinimalistLayout
      title="Investimentos"
      subtitle="Investimentos em marketing por região"
      backPath="/marketing"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Marketing", path: "/marketing" },
        { label: "Investimentos" }
      ]}
      headerActions={
        <Button
          onClick={() => navigate('/marketing/canais-aquisicao')}
          className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
        >
          <Database className="w-4 h-4 mr-2" />
          Canais de Aquisição
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Investimentos Mensais</CardTitle>
              <div className="flex items-center gap-2">
                <label htmlFor="year-select" className="text-sm font-medium text-white/70">
                  Ano:
                </label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border rounded-md text-sm bg-white/5 border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year} className="bg-zinc-900 text-white">
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MonthlyInvestmentGrid
              investments={investments}
              year={selectedYear}
              loading={loading}
              onEditMonth={setSelectedMonth}
            />
          </CardContent>
        </Card>

        <div className="[&_.recharts-cartesian-grid-horizontal_line]:stroke-white/10 [&_.recharts-cartesian-grid-vertical_line]:stroke-white/10">
          <InvestmentChart investments={investments} year={selectedYear} />
        </div>

        <InvestmentModal
          open={selectedMonth !== null}
          onClose={() => setSelectedMonth(null)}
          month={selectedMonth}
          year={selectedYear}
          investments={investments}
          onSave={saveInvestment}
        />
      </div>
    </MinimalistLayout>
  );
}
