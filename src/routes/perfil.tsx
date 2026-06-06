import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useFinwise } from "@/lib/finwise/store";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Download, KeyRound, LogOut, Mail, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/finwise/errors";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — Controle Financeiro" }] }),
  component: Perfil,
});

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB pré-compactação
const TARGET_DIM = 256;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (file.size > MAX_AVATAR_BYTES) throw new Error("Imagem muito grande (máx. 2MB)");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, TARGET_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Perfil() {
  const { profile, session, updateProfileName, updateProfileAvatar, signOut, exportJSON, importJSON, refresh } = useFinwise();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    a.download = `controle-financeiro-${new Date().toISOString().slice(0, 10)}.json`;
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

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      await updateProfileAvatar(dataUrl);
      toast.success("Foto atualizada.");
    } catch (err) {
      toast.error(toUserMessage(err, "Falha ao atualizar foto"));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const removeAvatar = async () => {
    setBusy(true);
    try {
      await updateProfileAvatar(null);
      toast.success("Foto removida.");
    } catch (err) {
      toast.error(toUserMessage(err, "Falha ao remover foto"));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Mínimo de 6 caracteres");
    if (newPassword !== confirmPassword) return toast.error("As senhas não coincidem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewPassword(""); setConfirmPassword("");
    toast.success("Senha alterada com sucesso.");
  };

  const sendResetEmail = async () => {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um link de recuperação para o seu email.");
  };

  const initials = (profile.name || profile.email).slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas informações e segurança</p>
      </header>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto e identidade</CardTitle>
            <CardDescription>Personalize como você aparece no app</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-border">
                  {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.name} /> : null}
                  <AvatarFallback className="bg-primary/10 text-lg text-primary">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105"
                  aria-label="Trocar foto"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatar}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => avatarInputRef.current?.click()}>
                  <Camera className="h-4 w-4" /> Trocar foto
                </Button>
                {profile.avatarUrl && (
                  <Button variant="outline" size="sm" disabled={busy} onClick={removeAvatar}>
                    <Trash2 className="h-4 w-4" /> Remover
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={profile.email} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await updateProfileName(name);
                      toast.success("Perfil atualizado.");
                    } catch (err) {
                      toast.error(toUserMessage(err, "Falha ao salvar perfil"));
                    }
                  }}
                >
                  <Save className="h-4 w-4" /> Salvar alterações
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="senha">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> Segurança
            </CardTitle>
            <CardDescription>Atualize sua senha ou recupere o acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid gap-3">
              <div className="grid gap-2">
                <Label>Nova senha</Label>
                <Input type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" />
              </div>
              <div className="grid gap-2">
                <Label>Confirmar senha</Label>
                <Input type="password" minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy || !newPassword}>
                  <KeyRound className="h-4 w-4" /> Alterar senha
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={sendResetEmail}>
                  <Mail className="h-4 w-4" /> Enviar link por email
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados</CardTitle>
            <CardDescription>Exporte ou importe seus registros</CardDescription>
          </CardHeader>
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
