import { useMemo } from "react";
import { Investment } from "@/hooks/useInvestments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface InvestmentChartProps {
  investments: Investment[];
  year: number;
}

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function InvestmentChart({ investments, year }: InvestmentChartProps) {
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthInvestments = investments.filter(inv => inv.mes === monthKey);
      
      const googleAds = monthInvestments.reduce((sum, inv) => sum + (inv.investimento_google_ads || 0), 0);
      const metaAds = monthInvestments.reduce((sum, inv) => sum + (inv.investimento_meta_ads || 0), 0);
      const linkedinAds = monthInvestments.reduce((sum, inv) => sum + (inv.investimento_linkedin_ads || 0), 0);
      const outros = monthInvestments.reduce((sum, inv) => sum + (inv.outros_investimentos || 0), 0);
      
      return {
        mes: MONTH_ABBR[i],
        "Google Ads": googleAds,
        "Meta Ads": metaAds,
        "LinkedIn Ads": linkedinAds,
        "Outros": outros,
      };
    });
  }, [investments, year]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução dos Investimentos por Canal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="mes" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Google Ads" 
              stroke="#4285F4" 
              strokeWidth={2}
              dot={{ fill: '#4285F4', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="Meta Ads" 
              stroke="#1877F2" 
              strokeWidth={2}
              dot={{ fill: '#1877F2', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="LinkedIn Ads" 
              stroke="#0A66C2" 
              strokeWidth={2}
              dot={{ fill: '#0A66C2', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="Outros" 
              stroke="#64748b" 
              strokeWidth={2}
              dot={{ fill: '#64748b', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
