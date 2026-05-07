import { createFileRoute } from "@tanstack/react-router";
import { useFinwise } from "@/lib/finwise/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — FinWise" }] }),
  component: Perfil,
});

function Perfil() {
  const { profile, updateProfile, resetSeed, logout, loginAgain } = useFinwise();

  if (!profile.loggedIn) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-full bg-muted p-4"><User className="h-6 w-6" /></div>
            <h2 className="text-xl font-semibold">Você saiu da conta (simulado)</h2>
            <p className="text-sm text-muted-foreground">Esta é apenas uma simulação local — nenhum dado foi enviado.</p>
            <Button onClick={loginAgain}><LogIn className="h-4 w-4" /> Entrar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Suas informações e preferências</p>
      </header>

      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações da conta</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Nome" value={profile.name} />
            <Field label="Email" value={profile.email} />
            <Field label="Moeda" value="R$ BRL" />
            <Field label="Fuso/locale" value="pt-BR" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Preferências do app</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <Row>
              <div>
                <Label className="text-sm">Persistência local</Label>
                <p className="text-xs text-muted-foreground">Salva seus dados no navegador entre sessões.</p>
              </div>
              <Switch
                checked={profile.persistLocal}
                onCheckedChange={(v) => updateProfile({ persistLocal: v })}
              />
            </Row>
            <Row>
              <div>
                <Label className="text-sm">Limpar dados locais ao sair</Label>
                <p className="text-xs text-muted-foreground">Ao fazer logout simulado, dados serão zerados e o seed restaurado.</p>
              </div>
              <Switch
                checked={profile.clearOnLogout}
                onCheckedChange={(v) => updateProfile({ clearOnLogout: v })}
              />
            </Row>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => { resetSeed(); toast.success("Dados de exemplo restaurados."); }}>
                <RefreshCw className="h-4 w-4" /> Recarregar dados de exemplo
              </Button>
              <Button variant="destructive" onClick={() => { logout(); toast("Você saiu (simulado)."); }}>
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3">{children}</div>;
}
