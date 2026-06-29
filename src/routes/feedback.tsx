import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useFinwise } from "@/lib/finwise/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, Share2, Trash2, MessageCircle, ThumbsUp, Smile } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/finwise/errors";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Controle Financeiro" }] }),
  component: Feedback,
});

type FeedbackRow = {
  id: number;
  content: string;
  author_name: string;
  created_at: string;
  auth_user_id: string;
};

type ReactionKind = "like" | "love" | "thumbsup";

type ReactionRow = { feedback_id: number; auth_user_id: string; reaction: ReactionKind };

type ReplyRow = {
  id: number;
  feedback_id: number;
  auth_user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

const APP_URL = "https://fin-wise-scope.lovable.app";
const REACTIONS: ReactionKind[] = ["like", "love", "thumbsup"];

function Feedback() {
  const { t, i18n } = useTranslation();
  const { session, profile } = useFinwise();
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [reactions, setReactions] = useState<Map<string, number>>(new Map()); // key `${id}:${kind}`
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Map<number, ReplyRow[]>>(new Map());
  const [openReplies, setOpenReplies] = useState<Set<number>>(new Set());
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyBusy, setReplyBusy] = useState<Record<number, boolean>>({});
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const ContentSchema = useMemo(
    () => z.string().trim().min(2, t("feedback.minLen")).max(500, t("feedback.maxLen")),
    [t]
  );
  const ReplySchema = useMemo(
    () => z.string().trim().min(1, t("feedback.minLen")).max(500, t("feedback.maxLen")),
    [t]
  );

  const load = useCallback(async () => {
    const [{ data: feedback }, { data: lk }, { data: rp }] = await Promise.all([
      supabase.from("app_feedback").select("id,content,author_name,created_at,auth_user_id").order("created_at", { ascending: false }).limit(100),
      supabase.from("feedback_likes").select("feedback_id,auth_user_id,reaction"),
      supabase.from("feedback_replies").select("id,feedback_id,auth_user_id,author_name,content,created_at").order("created_at", { ascending: true }),
    ]);
    setItems((feedback ?? []) as FeedbackRow[]);
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const l of (lk ?? []) as ReactionRow[]) {
      const k = `${l.feedback_id}:${l.reaction}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      if (session?.user && l.auth_user_id === session.user.id) mine.add(k);
    }
    setReactions(counts);
    setMyReactions(mine);
    const grouped = new Map<number, ReplyRow[]>();
    for (const r of (rp ?? []) as ReplyRow[]) {
      const arr = grouped.get(r.feedback_id) ?? [];
      arr.push(r);
      grouped.set(r.feedback_id, arr);
    }
    setReplies(grouped);
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
      author_name: profile?.name?.trim() || t("common.anonymous"),
      content: parsed.data,
    });
    setBusy(false);
    if (error) return toast.error(toUserMessage(error, t("feedback.publishFail")));
    setContent("");
    toast.success(t("feedback.published"));
    load();
  };

  const toggleReaction = async (id: number, kind: ReactionKind) => {
    if (!session?.user) return;
    const key = `${id}:${kind}`;
    if (myReactions.has(key)) {
      const { error } = await supabase.from("feedback_likes").delete()
        .eq("feedback_id", id).eq("auth_user_id", session.user.id).eq("reaction", kind);
      if (error) return toast.error(toUserMessage(error, t("feedback.unlikeFail")));
      setMyReactions((s) => { const n = new Set(s); n.delete(key); return n; });
      setReactions((m) => { const n = new Map(m); n.set(key, Math.max(0, (n.get(key) ?? 1) - 1)); return n; });
    } else {
      const { error } = await supabase.from("feedback_likes").insert({ feedback_id: id, auth_user_id: session.user.id, reaction: kind });
      if (error) return toast.error(toUserMessage(error, t("feedback.likeFail")));
      setMyReactions((s) => new Set(s).add(key));
      setReactions((m) => { const n = new Map(m); n.set(key, (n.get(key) ?? 0) + 1); return n; });
    }
  };

  const remove = async (id: number) => {
    const { error } = await supabase.from("app_feedback").delete().eq("id", id);
    if (error) return toast.error(toUserMessage(error, t("feedback.removeFail")));
    setItems((p) => p.filter((x) => x.id !== id));
  };

  const submitReply = async (feedbackId: number) => {
    if (!session?.user) return;
    const draft = replyDrafts[feedbackId] ?? "";
    const parsed = ReplySchema.safeParse(draft);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setReplyBusy((s) => ({ ...s, [feedbackId]: true }));
    const { data, error } = await supabase.from("feedback_replies").insert({
      feedback_id: feedbackId,
      auth_user_id: session.user.id,
      author_name: profile?.name?.trim() || t("common.anonymous"),
      content: parsed.data,
    }).select("id,feedback_id,auth_user_id,author_name,content,created_at").single();
    setReplyBusy((s) => ({ ...s, [feedbackId]: false }));
    if (error || !data) return toast.error(toUserMessage(error, t("feedback.replyFail")));
    setReplies((m) => {
      const n = new Map(m);
      const arr = [...(n.get(feedbackId) ?? []), data as ReplyRow];
      n.set(feedbackId, arr);
      return n;
    });
    setReplyDrafts((s) => ({ ...s, [feedbackId]: "" }));
    setOpenReplies((s) => new Set(s).add(feedbackId));
    toast.success(t("feedback.replySent"));
  };

  const removeReply = async (replyId: number, feedbackId: number) => {
    const { error } = await supabase.from("feedback_replies").delete().eq("id", replyId);
    if (error) return toast.error(toUserMessage(error, t("feedback.removeFail")));
    setReplies((m) => {
      const n = new Map(m);
      n.set(feedbackId, (n.get(feedbackId) ?? []).filter((r) => r.id !== replyId));
      return n;
    });
  };

  const toggleOpenReplies = (id: number) =>
    setOpenReplies((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const shareText = t("app.shareText");
  const shareLinks = useMemo(() => {
    const u = encodeURIComponent(APP_URL);
    const tx = encodeURIComponent(shareText);
    return {
      whatsapp: `https://wa.me/?text=${tx}%20${u}`,
      telegram: `https://t.me/share/url?url=${u}&text=${tx}`,
      x: `https://twitter.com/intent/tweet?text=${tx}&url=${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    };
  }, [shareText]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(APP_URL); toast.success(t("feedback.linkCopied")); }
    catch { toast.error(t("feedback.copyFail")); }
  };
  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: t("app.name"), text: shareText, url: APP_URL }); } catch { /* user cancelled */ }
    } else copyLink();
  };

  const reactionMeta: Record<ReactionKind, { label: string; icon: ReactNode; activeClass: string }> = {
    like: { label: t("feedback.reactLike"), icon: <Heart className="h-4 w-4" />, activeClass: "text-rose-500" },
    love: { label: t("feedback.reactLove"), icon: <Smile className="h-4 w-4" />, activeClass: "text-pink-500" },
    thumbsup: { label: t("feedback.reactThumb"), icon: <ThumbsUp className="h-4 w-4" />, activeClass: "text-blue-500" },
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("feedback.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("feedback.subtitle")}</p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Share2 className="h-4 w-4" /> {t("feedback.shareApp")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={shareLinks.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a></Button>
          <Button asChild size="sm" variant="outline"><a href={shareLinks.telegram} target="_blank" rel="noreferrer">Telegram</a></Button>
          <Button asChild size="sm" variant="outline"><a href={shareLinks.x} target="_blank" rel="noreferrer">X / Twitter</a></Button>
          <Button asChild size="sm" variant="outline"><a href={shareLinks.facebook} target="_blank" rel="noreferrer">Facebook</a></Button>
          <Button size="sm" variant="outline" onClick={copyLink}>{t("feedback.copyLink")}</Button>
          <Button size="sm" onClick={nativeShare}>{t("feedback.share")}</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-4 w-4" /> {t("feedback.leaveComment")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("feedback.commentPlaceholder")}
            maxLength={500}
            rows={3}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length}/500</span>
            <Button size="sm" onClick={submit} disabled={busy}><Send className="h-4 w-4" /> {t("feedback.publish")}</Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("feedback.loadingComments")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("feedback.noneYet")}</p>
        ) : (
          items.map((it) => {
            const mine = session?.user?.id === it.auth_user_id;
            const itemReplies = replies.get(it.id) ?? [];
            const isOpen = openReplies.has(it.id);
            return (
              <Card key={it.id}>
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{it.author_name || t("common.anonymous")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString(i18n.language)}</p>
                    </div>
                    {mine && (
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)} aria-label={t("feedback.removeAria")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{it.content}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    {REACTIONS.map((kind) => {
                      const key = `${it.id}:${kind}`;
                      const active = myReactions.has(key);
                      const count = reactions.get(key) ?? 0;
                      const meta = reactionMeta[kind];
                      return (
                        <Button
                          key={kind}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() => toggleReaction(it.id, kind)}
                          className={active ? "" : meta.activeClass}
                          aria-label={meta.label}
                        >
                          {meta.icon}
                          <span className="ml-1 text-xs">{meta.label}</span>
                          <span className="ml-1 tabular-nums text-xs">{count}</span>
                        </Button>
                      );
                    })}
                    {itemReplies.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => toggleOpenReplies(it.id)}>
                        <MessageCircle className="h-4 w-4" />
                        <span className="ml-1 text-xs">
                          {isOpen ? t("feedback.hideReplies") : t("feedback.showReplies", { count: itemReplies.length })}
                        </span>
                      </Button>
                    )}
                  </div>

                  {(isOpen && itemReplies.length > 0) && (
                    <div className="grid gap-2 border-l-2 border-muted pl-3">
                      {itemReplies.map((r) => {
                        const isMineReply = session?.user?.id === r.auth_user_id;
                        return (
                          <div key={r.id} className="rounded-md bg-muted/40 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-medium">{r.author_name || t("common.anonymous")}</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString(i18n.language)}</p>
                              </div>
                              {isMineReply && (
                                <Button size="icon" variant="ghost" onClick={() => removeReply(r.id, it.id)} aria-label={t("feedback.removeAria")}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-sm">{r.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Textarea
                      value={replyDrafts[it.id] ?? ""}
                      onChange={(e) => setReplyDrafts((s) => ({ ...s, [it.id]: e.target.value }))}
                      placeholder={t("feedback.replyPlaceholder")}
                      maxLength={500}
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => submitReply(it.id)} disabled={!!replyBusy[it.id]}>
                        <Send className="h-4 w-4" />
                        <span className="ml-1">{t("feedback.send")}</span>
                      </Button>
                    </div>
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
