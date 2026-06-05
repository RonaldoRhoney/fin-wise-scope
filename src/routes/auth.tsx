import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Controle Financeiro" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/" });
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode entrar.");
    setTab("login");
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um link para o seu email.");
  };

  const onOAuth = async (provider: "google" | "apple") => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      return toast.error(result.error.message ?? `Falha ao entrar com ${provider}`);
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };
  const onGoogle = () => onOAuth("google");
  const onApple = () => onOAuth("apple");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6" style={{ background: "var(--gradient-hero)" }}>
      {/* subtle floating dollar signs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <span className="absolute left-[8%] top-[12%] text-7xl font-light text-primary/10 blur-[1px]">$</span>
        <span className="absolute left-[78%] top-[18%] text-5xl font-light text-primary/15">$</span>
        <span className="absolute left-[20%] top-[78%] text-6xl font-light text-accent/15">$</span>
        <span className="absolute left-[85%] top-[72%] text-8xl font-light text-primary/10 blur-[2px]">$</span>
        <span className="absolute left-[45%] top-[6%] text-4xl font-light text-primary/20">$</span>
        <span className="absolute left-[60%] top-[88%] text-5xl font-light text-accent/15 blur-[1px]">$</span>
      </div>
      <Card className="relative w-full max-w-md border-border/60 backdrop-blur-sm" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            $
          </div>
          <CardTitle className="text-center text-2xl tracking-tight">Controle Financeiro</CardTitle>
          <p className="text-center text-sm text-muted-foreground">Controle suas finanças com inteligência</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 pb-4">
            <Button type="button" variant="outline" disabled={busy} onClick={onGoogle}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 10.2v3.9h5.5c-.24 1.3-1.66 3.8-5.5 3.8-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.84 3.13 14.65 2.2 12 2.2 6.85 2.2 2.7 6.35 2.7 11.5S6.85 20.8 12 20.8c6.93 0 9.3-4.86 9.3-7.4 0-.5-.05-.88-.13-1.2H12z"/>
              </svg>
              Continuar com Google
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={onApple}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M16.365 12.86c-.02-2.07 1.69-3.06 1.77-3.11-.97-1.41-2.47-1.6-3-1.62-1.28-.13-2.5.75-3.15.75-.65 0-1.66-.74-2.73-.72-1.4.02-2.7.82-3.42 2.07-1.46 2.53-.37 6.27 1.05 8.32.69.99 1.52 2.11 2.6 2.07 1.04-.04 1.44-.67 2.7-.67 1.26 0 1.62.67 2.73.65 1.13-.02 1.84-1.01 2.53-2.01.8-1.16 1.13-2.28 1.15-2.34-.03-.01-2.21-.85-2.23-3.39zM14.3 6.42c.57-.69.96-1.65.85-2.6-.82.03-1.82.55-2.41 1.24-.53.61-1 1.59-.87 2.52.92.07 1.86-.47 2.43-1.16z"/>
              </svg>
              Continuar com Apple
            </Button>
            <div className="relative my-1 text-center text-xs text-muted-foreground">
              <span className="relative z-10 bg-card px-2">ou com email</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              <TabsTrigger value="reset">Recuperar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={onLogin} className="grid gap-3 pt-3">
                <div className="grid gap-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Senha</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button disabled={busy} type="submit">Entrar</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignup} className="grid gap-3 pt-3">
                <div className="grid gap-2"><Label>Nome</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Senha</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button disabled={busy} type="submit">Criar conta</Button>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              <form onSubmit={onReset} className="grid gap-3 pt-3">
                <div className="grid gap-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button disabled={busy} type="submit">Enviar link de recuperação</Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/">Voltar ao app</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
