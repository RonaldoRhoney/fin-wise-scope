import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { logAccessOnce } from "@/lib/finwise/access-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Controle Financeiro" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.user) await logAccessOnce(data.user.id, data.user.email ?? null, "password");
    toast.success(t("auth.welcome"));
    navigate({ to: "/" });
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.accountCreated"));
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
    toast.success(t("auth.resetSent"));
  };

  const onGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      return toast.error(result.error.message ?? t("auth.oauthFail", { provider: "google" }));
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6"
      style={{ background: "linear-gradient(135deg, oklch(0.16 0.08 260) 0%, oklch(0.14 0.10 280) 50%, oklch(0.18 0.13 305) 100%)" }}
    >
      {/* animated ambient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl animate-pulse"
             style={{ background: "radial-gradient(circle, oklch(0.78 0.17 165) 0%, transparent 70%)" }} />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full opacity-30 blur-3xl animate-pulse"
             style={{ background: "radial-gradient(circle, oklch(0.72 0.15 210) 0%, transparent 70%)", animationDelay: "1s" }} />
        <div className="absolute left-1/3 -bottom-32 h-80 w-80 rounded-full opacity-30 blur-3xl animate-pulse"
             style={{ background: "radial-gradient(circle, oklch(0.65 0.20 305) 0%, transparent 70%)", animationDelay: "2s" }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <span className="absolute left-[8%] top-[12%] text-7xl font-light text-primary/10 blur-[1px]">$</span>
        <span className="absolute left-[78%] top-[18%] text-5xl font-light text-primary/15">$</span>
        <span className="absolute left-[20%] top-[78%] text-6xl font-light text-accent/15">$</span>
        <span className="absolute left-[85%] top-[72%] text-8xl font-light text-primary/10 blur-[2px]">$</span>
      </div>
      <Card
        className="relative w-full max-w-md border-border/40 bg-card/70 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500"
        style={{ boxShadow: "0 24px 80px -20px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.05) inset" }}
      >
        <CardHeader className="space-y-3 pb-4">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground transition-transform hover:scale-105"
            style={{
              background: "linear-gradient(135deg, oklch(0.78 0.17 165), oklch(0.72 0.15 210))",
              boxShadow: "0 0 50px color-mix(in oklab, oklch(0.78 0.17 165) 50%, transparent)",
            }}
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <CardTitle className="text-center text-2xl font-semibold tracking-tight">{t("app.name")}</CardTitle>
          <p className="text-center text-sm text-muted-foreground">{t("app.tagline")}</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 pb-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onGoogle}
              className="border-white/20 bg-white/5 text-foreground transition-all hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 10.2v3.9h5.5c-.24 1.3-1.66 3.8-5.5 3.8-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.84 3.13 14.65 2.2 12 2.2 6.85 2.2 2.7 6.35 2.7 11.5S6.85 20.8 12 20.8c6.93 0 9.3-4.86 9.3-7.4 0-.5-.05-.88-.13-1.2H12z"/></svg>
              {t("auth.continueGoogle")}
            </Button>
            <div className="relative my-2 text-center text-xs text-muted-foreground">
              <span className="relative z-10 bg-card/0 px-2">{t("auth.orEmail")}</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">{t("auth.signIn")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
              <TabsTrigger value="reset">{t("auth.recover")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={onLogin} className="grid gap-3 pt-3">
                <div className="grid gap-2"><Label>{t("auth.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="grid gap-2"><Label>{t("auth.password")}</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button disabled={busy} type="submit">{t("auth.signIn")}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignup} className="grid gap-3 pt-3">
                <div className="grid gap-2"><Label>{t("auth.name")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="grid gap-2"><Label>{t("auth.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="grid gap-2"><Label>{t("auth.password")}</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button disabled={busy} type="submit">{t("auth.createAccount")}</Button>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              <form onSubmit={onReset} className="grid gap-3 pt-3">
                <div className="grid gap-2"><Label>{t("auth.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button disabled={busy} type="submit">{t("auth.sendResetLink")}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/">{t("common.backToApp")}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
