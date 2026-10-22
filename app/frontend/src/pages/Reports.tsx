import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarDays, Clock3, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatDateOnly } from "@/lib/format";
import type { ReportsData } from "@/lib/types";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/lib/recharts";

const PIE_COLORS = ["#155E75", "#0284C7", "#0891B2", "#16A34A", "#D97706"];

export default function Reports() {
  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiGet<ReportsData>("/stats/reports"),
  });
  const data = reportsQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="reports-page">
      <div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">Relatórios</h2>
        <p className="text-sm text-slate-500">Indicadores do hospital — últimos 7 dias.</p>
      </div>

      {!data ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Total de pacientes"
              value={data.total_patients}
              icon={Users}
              tone="primary"
              testid="reports-stat-patients"
              hint="Cadastros no sistema"
            />
            <StatCard
              label="Atendimentos realizados"
              value={data.total_attendances}
              icon={Activity}
              tone="success"
              testid="reports-stat-attendances"
              hint="Histórico completo"
            />
            <StatCard
              label="Atendimentos (7 dias)"
              value={data.attendances_7d}
              icon={CalendarDays}
              tone="primary"
              testid="reports-stat-7d"
              hint="Janela da semana"
            />
            <StatCard
              label="Tempo médio de espera"
              value={`${data.avg_wait_min} min`}
              icon={Clock3}
              tone="warning"
              testid="reports-stat-wait"
              hint="Senha emitida até a chamada"
            />
            <StatCard
              label="Chamadas (7 dias)"
              value={data.total_calls_7d}
              icon={Activity}
              tone="danger"
              testid="reports-stat-calls"
              hint="Senhas geradas na semana"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                  Por consultório
                </CardDescription>
                <CardTitle className="font-heading text-lg">Atendimentos finalizados (7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.by_room} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      tickFormatter={(value: string) => value.replace("Consultório ", "C")}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip formatter={(value: number) => [`${value} atendimentos`, "Total"]} />
                    <Bar dataKey="count" fill="#155E75" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader>
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                  Por tipo de atendimento
                </CardDescription>
                <CardTitle className="font-heading text-lg">Distribuição (7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.by_type}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {data.by_type.map((entry, index) => (
                        <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} senhas`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-2 flex flex-wrap justify-center gap-3">
                  {data.by_type.map((entry, index) => (
                    <li key={entry.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        aria-hidden="true"
                      />
                      {entry.label} ({entry.count})
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="lg:col-span-12">
              <CardHeader>
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                  Movimento diário
                </CardDescription>
                <CardTitle className="font-heading text-lg">Senhas emitidas por dia (7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.by_day} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      tickFormatter={(value: string) => formatDateOnly(value).slice(0, 5)}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip
                      labelFormatter={(label: string) => formatDateOnly(label)}
                      formatter={(value: number) => [`${value} senhas`, "Emitidas"]}
                    />
                    <Area type="monotone" dataKey="count" stroke="#0284C7" strokeWidth={2} fill="#E0F2FE" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
