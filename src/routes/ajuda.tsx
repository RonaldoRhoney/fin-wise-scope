import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  LogIn, LayoutDashboard, ListChecks, BarChart3, Target, Building2, Sparkles,
  MessageCircle, User, Settings, Download, Upload, HelpCircle,
} from "lucide-react";


export const Route = createFileRoute("/ajuda")({
  head: () => ({ meta: [{ title: "Ajuda — Controle Financeiro" }] }),
  component: AjudaPage,
});

function AjudaPage() {
  const { t } = useTranslation();

  const steps = [
    {
      num: 1,
      icon: <LogIn className="h-5 w-5" />,
      title: t("ajuda.step1.title"),
      desc: t("ajuda.step1.desc"),
    },
    {
      num: 2,
      icon: <LayoutDashboard className="h-5 w-5" />,
      title: t("ajuda.step2.title"),
      desc: t("ajuda.step2.desc"),
    },
    {
      num: 3,
      icon: <ListChecks className="h-5 w-5" />,
      title: t("ajuda.step3.title"),
      desc: t("ajuda.step3.desc"),
    },
    {
      num: 4,
      icon: <BarChart3 className="h-5 w-5" />,
      title: t("ajuda.step4.title"),
      desc: t("ajuda.step4.desc"),
    },
    {
      num: 5,
      icon: <Target className="h-5 w-5" />,
      title: t("ajuda.step5.title"),
      desc: t("ajuda.step5.desc"),
    },
    {
      num: 6,
      icon: <Building2 className="h-5 w-5" />,
      title: t("ajuda.step6.title"),
      desc: t("ajuda.step6.desc"),
    },
    {
      num: 7,
      icon: <Sparkles className="h-5 w-5" />,
      title: t("ajuda.step7.title"),
      desc: t("ajuda.step7.desc"),
    },
    {
      num: 8,
      icon: <Download className="h-5 w-5" />,
      title: t("ajuda.step8.title"),
      desc: t("ajuda.step8.desc"),
    },
  ];

  const extraItems = [
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: t("ajuda.extra.feedback.title"),
      desc: t("ajuda.extra.feedback.desc"),
      to: "/feedback" as const,
    },
    {
      icon: <User className="h-5 w-5" />,
      title: t("ajuda.extra.perfil.title"),
      desc: t("ajuda.extra.perfil.desc"),
      to: "/perfil" as const,
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: t("ajuda.extra.config.title"),
      desc: t("ajuda.extra.config.desc"),
      to: "/configuracoes" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("ajuda.title")}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("ajuda.subtitle")}</p>
      </header>

      <section className="mb-8">
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.num} className="relative flex gap-4 pl-2">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  {step.icon}
                </div>
                <Card className="flex-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <span className="text-muted-foreground">{step.num}.</span>{" "}
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{t("ajuda.extra.title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {extraItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="mb-2 flex items-center gap-2 text-primary">
                {item.icon}
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{t("ajuda.faq.title")}</h2>
        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {(t("ajuda.faq.items", { returnObjects: true }) as { q: string; a: string }[]).map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
