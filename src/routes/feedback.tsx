import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useFinwise } from "@/lib/finwise/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, Share2, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/finwise/errors";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Feedback — Controle Financeiro" }] }),
  component: Feedback,
});

type FeedbackRow = {
  id: number;
  content: string;
  author_name: string;
  created_at: string;
  auth_user_id: string;
};

const APP_URL = "https://fin-wise-scope.lovable.app";
const SHARE_TEXT = "Conheça o Controle Financeiro — controle suas finanças com inteligência:";
const ContentSchema = z.string().trim().min(2, "Escreva algo").max(500, "Máximo 500 caracteres");

function Feedback() {
  const { session, profile } = useFinwise();
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [likes, setLikes] = useState<Map<number, number>>(new Map());
  const [myLikes, setMyLikes] = useState<Set<number>>(new Set());
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: feedback }, { data: lk }] = await Promise.all([
      supabase.from("app_feedback").select("id,content,author_name,created_at,auth_user_id").order("created_at", { ascending: false }).limit(100),
      supabase.from("feedback_likes").select("feedback_id,auth_user_id"),
    ]);
    setItems((feedback ?? []) as FeedbackRow[]);
    const counts = new Map<number, number>();
    const mine = new Set<number>();
    for (const l of (lk ?? []) as { feedback_id: number; auth_user_id: string }[]) {
      counts.set(l.feedback_id, (counts.get(l.feedback_id) ?? 0) + 1);
      if (session?.user && l.auth_user_id === session.user.id) mine.add(l.feedback_id);
    }
    setLikes(counts);
    setMyLikes(mine);
    setLoading(false);
  }, [session]);

  useEffect(() => { if (session?.user) load(); }, [session, load]);

  const submit = async () => {
    if (!session?.user) return;
    const parsed = ContentSchema.safeParse(content);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.from("app_feedback").insert({
      auth_user_id: session.user.id,
      author_name: profile?.name?.trim() || "Anônimo",
      content: parsed.data,
    });
    setBusy(false);
    if (error) return toast.error(toUserMessage(error, "Falha ao enviar"));
    setContent("");
    toast.success("Comentário publicado.");
    load();
  };

  const toggleLike = async (id: number) => {
    if (!session?.user) return;
    if (myLikes.has(id)) {
      const { error } = await supabase.from("feedback_likes").delete().eq("feedback_id", id).eq("auth_user_id", session.user.id);
      if (error) return toast.error(toUserMessage(error, "Falha ao remover curtida"));
      setMyLikes((s) => { const n = new Set(s); n.delete(id); return n; });
      setLikes((m) => { const n = new Map(m); n.set(id, Math.max(0, (n.get(id) ?? 1) - 1)); return n; });
    } else {
      const { error } = await supabase.from("feedback_likes").insert({ feedback_id: id, auth_user_id: session.user.id });
      if (error) return toast.error(toUserMessage(error, "Falha ao curtir"));
      setMyLikes((s) => new Set(s).add(id));
      setLikes((m) => { const n = new Map(m); n.set(id, (n.get(id) ?? 0) + 1); return n; });
    }
  };

  const remove = async (id: number) => {
    const { error } = await supabase.from("app_feedback").delete().eq("id", id);
    if (error) return toast.error(toUserMessage(error, "Falha ao remover"));
    setItems((p) => p.filter((x) => x.id !== id));
  };

  const shareLinks = useMemo(() => {
    const u = encodeURIComponent(APP_URL);
    const t = encodeURIComponent(SHARE_TEXT);
    return {
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`,
      x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    };
  }, []);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(APP_URL); toast.success("Link copiado!"); }
    catch { toast.error("Não foi possível copiar."); }
  };
  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Controle Financeiro", text: SHARE_TEXT, url: APP_URL }); } catch { /* user cancelled */ }
    } else copyLink();
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Feedback da comunidade</h1>
        <p className="text-sm text-muted-foreground">Deixe seu comentário, curta outros e compartilhe o app.</p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Share2 className="h-4 w-4" /> Compartilhar o app</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={shareLinks.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a></Button>
          <Button asChild size="sm" variant="outline"><a href={shareLinks.telegram} target="_blank" rel="noreferrer">Telegram</a></Button>
          <Button asChild size="sm" variant="outline"><a href={shareLinks.x} target="_blank" rel="noreferrer">X / Twitter</a></Button>
          <Button asChild size="sm" variant="outline"><a href={shareLinks.facebook} target="_blank" rel="noreferrer">Facebook</a></Button>
          <Button size="sm" variant="outline" onClick={copyLink}>Copiar link</Button>
          <Button size="sm" onClick={nativeShare}>Compartilhar…</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-4 w-4" /> Deixe um comentário</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="O que você acha do app?"
            maxLength={500}
            rows={3}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length}/500</span>
            <Button size="sm" onClick={submit} disabled={busy}><Send className="h-4 w-4" /> Publicar</Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando comentários…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem comentários. Seja o primeiro!</p>
        ) : (
          items.map((it) => {
            const mine = session?.user?.id === it.auth_user_id;
            const liked = myLikes.has(it.id);
            const count = likes.get(it.id) ?? 0;
            return (
              <Card key={it.id}>
                <CardContent className="grid gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{it.author_name || "Anônimo"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    {mine && (
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)} aria-label="Remover">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{it.content}</p>
                  <div>
                    <Button size="sm" variant={liked ? "default" : "outline"} onClick={() => toggleLike(it.id)}>
                      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {count}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
