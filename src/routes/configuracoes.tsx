import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Controle Financeiro" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Configurações</h1>
      <p className="text-sm text-muted-foreground">Preferências do app em breve.</p>
    </div>
  );
}
