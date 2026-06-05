import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Controle Financeiro" }] }),
  component: Relatorios,
});

function Relatorios() {
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Relatórios</h1>
      <p className="text-sm text-muted-foreground">Análises detalhadas em breve.</p>
    </div>
  );
}
