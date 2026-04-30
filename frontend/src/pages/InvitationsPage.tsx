import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { api } from "../api";
import type { CreateInvitationPayload, InvitationSummary } from "../api";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";

type InvitationFilter = "all" | "mine" | "active" | "expired";

function getInviteUrl(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function getInvitationStatus(invitation: InvitationSummary) {
  if (invitation.revokedAt) {
    return { label: "Widerrufen", className: "bg-red-500/10 text-red-200 ring-red-500/30" };
  }

  if (new Date(invitation.expiresAt) <= new Date()) {
    return { label: "Abgelaufen", className: "bg-amber-500/10 text-amber-200 ring-amber-500/30" };
  }

  if (invitation.useCount >= invitation.maxUses) {
    return { label: "Aufgebraucht", className: "bg-slate-500/10 text-slate-200 ring-slate-500/30" };
  }

  return { label: "Aktiv", className: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30" };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function InvitationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<InvitationFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [formState, setFormState] = useState<CreateInvitationPayload>({
    email: "",
    expiresInDays: 7,
    maxUses: 1,
    note: ""
  });

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const response = await api.get<InvitationSummary[]>("/invitations");
      return response.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateInvitationPayload) => {
      const response = await api.post<InvitationSummary>("/invitations", payload);
      return response.data;
    },
    onSuccess: invitation => {
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setCreatedInviteUrl(getInviteUrl(invitation.token));
      setFormState({ email: "", expiresInDays: 7, maxUses: 1, note: "" });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/invitations/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
    }
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/invitations/${id}/resend`);
    }
  });

  const filteredInvitations = useMemo(() => {
    return invitations.filter(invitation => {
      const status = getInvitationStatus(invitation).label;

      if (filter === "mine") {
        return invitation.createdBy === user?.id;
      }

      if (filter === "active") {
        return status === "Aktiv";
      }

      if (filter === "expired") {
        return status === "Abgelaufen";
      }

      return true;
    });
  }, [filter, invitations, user?.id]);

  function updateForm<K extends keyof CreateInvitationPayload>(
    key: K,
    value: CreateInvitationPayload[K]
  ) {
    setFormState(current => ({ ...current, [key]: value }));
  }

  function handleCreateInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatedInviteUrl(null);

    createMutation.mutate({
      email: formState.email?.trim() || undefined,
      expiresInDays: Number(formState.expiresInDays),
      maxUses: Number(formState.maxUses),
      note: formState.note?.trim() || undefined
    });
  }

  async function copyInviteUrl(token: string) {
    await navigator.clipboard.writeText(getInviteUrl(token));
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(null), 1800);
  }

  function handleRevoke(invitation: InvitationSummary) {
    const confirmed = window.confirm("Diese Einladung wirklich widerrufen?");
    if (confirmed) {
      revokeMutation.mutate(invitation.id);
    }
  }

  const filters: Array<{ id: InvitationFilter; label: string }> = [
    { id: "all", label: "Alle" },
    { id: "mine", label: "Meine" },
    { id: "active", label: "Aktiv" },
    { id: "expired", label: "Abgelaufen" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-purple-300">
              Einladungen
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Einladungslinks verwalten
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Erstelle Links, teile sie per Email und widerrufe Einladungen bei Bedarf.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setCreatedInviteUrl(null);
              setIsCreateOpen(true);
            }}
            className="rounded-xl bg-purple-500 px-5 py-3 font-semibold text-white transition hover:bg-purple-400"
          >
            Neue Einladung erstellen
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === item.id
                  ? "bg-purple-500 text-white"
                  : "border border-slate-700 text-slate-300 hover:border-purple-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/30">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">Token</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Erstellt von</th>
                  <th className="px-5 py-4">Ablaufdatum</th>
                  <th className="px-5 py-4">Verwendungen</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Einladungen werden geladen...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Keine Einladungen gefunden.
                    </td>
                  </tr>
                ) : null}

                {filteredInvitations.map(invitation => {
                  const status = getInvitationStatus(invitation);

                  return (
                    <tr key={invitation.id} className="text-slate-200">
                      <td className="px-5 py-4 font-mono text-purple-200">
                        {invitation.token.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-4">{invitation.email ?? "-"}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">
                        {invitation.createdBy === user?.id ? "Du" : invitation.createdBy.slice(0, 10)}
                      </td>
                      <td className="px-5 py-4">{formatDate(invitation.expiresAt)}</td>
                      <td className="px-5 py-4">
                        {invitation.useCount}/{invitation.maxUses}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs ring-1 ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void copyInviteUrl(invitation.token)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-purple-400"
                          >
                            {copiedToken === invitation.token ? "Kopiert" : "Kopieren"}
                          </button>
                          <button
                            type="button"
                            onClick={() => resendMutation.mutate(invitation.id)}
                            disabled={!invitation.email || Boolean(invitation.revokedAt)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(invitation)}
                            disabled={Boolean(invitation.revokedAt)}
                            className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Widerrufen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur">
          <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-purple-950/30">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Neue Einladung</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Email ist optional. Der Link kann nach dem Erstellen kopiert werden.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:text-white"
              >
                Schließen
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateInvitation}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Email optional</span>
                <input
                  value={formState.email}
                  onChange={event => updateForm("email", event.target.value)}
                  type="email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-400"
                  placeholder="name@example.com"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Ablauf in Tagen</span>
                  <input
                    value={formState.expiresInDays}
                    onChange={event => updateForm("expiresInDays", Number(event.target.value))}
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-400"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">
                    Max. Verwendungen
                  </span>
                  <input
                    value={formState.maxUses}
                    onChange={event => updateForm("maxUses", Number(event.target.value))}
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-400"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Notiz</span>
                <textarea
                  value={formState.note}
                  onChange={event => updateForm("note", event.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-400"
                  placeholder="Optionaler Hinweis fuer den Empfaenger"
                />
              </label>

              {createMutation.isError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  Einladung konnte nicht erstellt werden.
                </div>
              ) : null}

              {createdInviteUrl ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4">
                  <p className="mb-2 text-sm font-medium text-emerald-200">Einladungslink erstellt:</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={createdInviteUrl}
                      className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(createdInviteUrl)}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                    >
                      Kopieren
                    </button>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-xl bg-purple-500 px-4 py-3 font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending ? "Erstelle..." : "Einladung erstellen"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
