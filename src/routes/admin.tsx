import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/finwise/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Shield, Users, Activity, Smartphone } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin" }] }),
  component: AdminPage,
});

type AccessLog = {
  id: string;
  user_id: string;
  user_email: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  login_method: string | null;
  created_at: string;
};
type UserRow = { id: number; auth_user_id: string; name: string; email: string; created_at: string };

const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#EF4444", "#F59E0B"];

function AdminPage() {
  const { isAdmin, checked } = useIsAdmin();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (checked && !isAdmin) navigate({ to: "/" });
  }, [checked, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [logsRes, usersRes] = await Promise.all([
        supabase.from("access_logs").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, auth_user_id, name, email, created_at").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setLogs((logsRes.data ?? []) as AccessLog[]);
      setUsers((usersRes.data ?? []) as UserRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const byDevice = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => map.set(l.device_type ?? "unknown", (map.get(l.device_type ?? "unknown") ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    logs.forEach((l) => {
      const key = l.created_at.slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [logs]);

  if (!checked) return <div className="p-6 text-sm text-muted-foreground">Verificando permissões…</div>;
  if (!isAdmin) return null;

  const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Painel Administrativo</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Usuários cadastrados" value={users.length} />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Acessos registrados" value={logs.length} />
        <StatCard icon={<Smartphone className="h-4 w-4" />} label="Usuários únicos (acesso)" value={uniqueUsers} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Acessos por dia (14d)</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Acessos por dispositivo</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byDevice} dataKey="value" nameKey="name" outerRadius={90} label>
                  {byDevice.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários ({users.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
              {!users.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum usuário</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Acessos recentes ({logs.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>SO</TableHead>
                <TableHead>Navegador</TableHead>
                <TableHead>Método</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{l.user_email ?? l.user_id.slice(0, 8)}</TableCell>
                  <TableCell><Badge variant="secondary">{l.device_type ?? "—"}</Badge></TableCell>
                  <TableCell>{l.os ?? "—"}</TableCell>
                  <TableCell>{l.browser ?? "—"}</TableCell>
                  <TableCell>{l.login_method ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!logs.length && !loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem acessos registrados ainda</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
