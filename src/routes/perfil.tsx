import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useFinwise } from "@/lib/finwise/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Save, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/finwise/errors";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — Controle Financeiro" }] }),
  component: Perfil,
});

function Perfil() {
  const { profile, session, updateProfileName, signOut, exportJSON, importJSON, refresh } = useFinwise();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!session) navigate({ to: "/auth" });
  }, [session, navigate]);

  useEffect(() => { if (profile) setName(profile.name); }, [profile]);

  if (!profile) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finwise-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const n = await importJSON(String(reader.result));
        toast.success(`${n} registro(s) importado(s).`);
        await refresh();
      } catch (err) {
        toast.error(toUserMessage(err, "Falha ao importar"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Suas informações e dados</p>
      </header>

      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações da conta</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2"><Label>Email</Label><Input value={profile.email} disabled /></div>
            <div className="grid gap-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Button
                onClick={async () => { await updateProfileName(name); toast.success("Perfil atualizado."); }}
              >
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4" /> Exportar JSON</Button>
            <label className="inline-flex">
              <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" /> Importar JSON
              </span>
            </label>
            <Button
              variant="destructive"
              onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
            >
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
