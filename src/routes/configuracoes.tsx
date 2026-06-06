import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFinwise } from "@/lib/finwise/store";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Download, Globe, KeyRound, LogOut, Mail, Moon, ShieldCheck, Sun, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_LANGS, setLanguage, type LangCode } from "@/lib/i18n";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Controle Financeiro" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, session, signOut, exportJSON } = useFinwise();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    if (!session) navigate({ to: "/auth" });
  }, [session, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem("cf-theme");
    const isDark = saved ? saved === "dark" : document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggleTheme = (next: boolean) => {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("cf-theme", next ? "dark" : "light");
  };

  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `controle-financeiro-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("configuracoes.dataExported"));
  };

  const sendResetEmail = async () => {
    if (!profile?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(t("configuracoes.sendEmailFail"));
    toast.success(t("perfil.resetLinkSent"));
  };

  const onLangChange = (code: string) => {
    setLanguage(code as LangCode);
    toast.success(t("configuracoes.languageChanged"));
  };

  const currentLang = (SUPPORTED_LANGS.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGS[0]).code;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("configuracoes.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("configuracoes.subtitle")}</p>
      </header>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("configuracoes.account")}</CardTitle>
            <CardDescription>{t("configuracoes.accountDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            <Row icon={<UserIcon className="h-4 w-4 text-primary" />} title={t("configuracoes.editProfile")} subtitle={t("configuracoes.editProfileDesc")} to="/perfil" />
            <Separator className="my-1" />
            <Row icon={<KeyRound className="h-4 w-4 text-primary" />} title={t("configuracoes.changePassword")} subtitle={t("configuracoes.changePasswordDesc")} to="/perfil" hash="senha" />
            <Separator className="my-1" />
            <ActionRow icon={<Mail className="h-4 w-4 text-primary" />} title={t("configuracoes.recoverEmail")} subtitle={profile?.email ?? ""} onClick={sendResetEmail} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("configuracoes.language")}</CardTitle>
            <CardDescription>{t("configuracoes.languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-sm font-medium">{t("configuracoes.languageSelect")}</div>
                  <div className="text-xs text-muted-foreground">{t("configuracoes.languageDesc")}</div>
                </div>
              </div>
              <Select value={currentLang} onValueChange={onLangChange}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      <span className="mr-2">{l.flag}</span>{l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("configuracoes.appearance")}</CardTitle>
            <CardDescription>{t("configuracoes.appearanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                {dark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-amber-500" />}
                <div>
                  <div className="text-sm font-medium">{t("configuracoes.darkTheme")}</div>
                  <div className="text-xs text-muted-foreground">{t("configuracoes.darkThemeDesc")}</div>
                </div>
              </div>
              <Switch checked={dark} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("configuracoes.dataPriv")}</CardTitle>
            <CardDescription>{t("configuracoes.dataPrivDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            <ActionRow icon={<Download className="h-4 w-4 text-primary" />} title={t("configuracoes.exportData")} subtitle={t("configuracoes.exportDataDesc")} onClick={handleExport} />
            <Separator className="my-1" />
            <ActionRow icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />} title={t("configuracoes.privacyPolicy")} subtitle={t("configuracoes.privacyPolicyDesc")} onClick={() => toast.info(t("configuracoes.privacyToast"))} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button variant="destructive" className="w-full" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="h-4 w-4" /> {t("configuracoes.signOut")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, title, subtitle, to, hash }: { icon: React.ReactNode; title: string; subtitle?: string; to: string; hash?: string }) {
  return (
    <Link to={to} hash={hash} className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">{icon}</span>
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function ActionRow({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">{icon}</span>
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
