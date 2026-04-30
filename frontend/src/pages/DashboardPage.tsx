import { useQuery } from "@tanstack/react-query";
import { Navbar } from "../components/Navbar";
import { api, type InvitationSummary } from "../api";

function isActive(invitation: InvitationSummary) {
  return !invitation.revokedAt && new Date(invitation.expiresAt) > new Date() && invitation.useCount < invitation.maxUses;
}

export function DashboardPage() {
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const response = await api.get<InvitationSummary[]>("/invitations");
      return response.data;
    }
  });

  const activeInvitations = invitations.filter(isActive).length;
  const usedInvitations = invitations.reduce((sum, invitation) => sum + invitation.useCount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-purple-300">
            Dashboard
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Jellyfin Einladungen verwalten
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Behalte aktive Einladungslinks und bereits verwendete Einladungen im Blick.
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
            <p className="text-sm font-medium text-slate-400">Aktive Einladungen</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {isLoading ? "..." : activeInvitations}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
            <p className="text-sm font-medium text-slate-400">Verwendete Einladungen</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {isLoading ? "..." : usedInvitations}
            </p>
          </article>

          <article className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-6 shadow-lg shadow-purple-950/20">
            <p className="text-sm font-medium text-purple-200">Gesamt erstellt</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {isLoading ? "..." : invitations.length}
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
