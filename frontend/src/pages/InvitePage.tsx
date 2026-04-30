import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { InvitationValidationResponse, UseInvitationResponse } from "../api";

function getCountdown(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();

  if (diff <= 0) {
    return "Abgelaufen";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

export function InvitePage() {
  const { token } = useParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);

  const validationQuery = useQuery({
    queryKey: ["invite-validation", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await api.get<InvitationValidationResponse>(`/invitations/${token}/validate`);
      return response.data;
    }
  });

  useEffect(() => {
    if (!validationQuery.data?.expiresAt) {
      return;
    }

    const updateCountdown = () => {
      setCountdown(getCountdown(validationQuery.data.expiresAt));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [validationQuery.data]);

  const useInvitationMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<UseInvitationResponse>("/invitations/use", {
        token,
        username,
        password
      });
      return response.data;
    }
  });

  const validationError = useMemo(() => {
    if (!validationQuery.isError) {
      return null;
    }

    const error = validationQuery.error;
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      return String(error.response.data.error);
    }

    return "Dieser Einladungslink ist ungueltig oder nicht mehr verfuegbar.";
  }, [validationQuery.error, validationQuery.isError]);

  const submitError = useMemo(() => {
    if (!useInvitationMutation.isError) {
      return null;
    }

    const error = useInvitationMutation.error;
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      return String(error.response.data.error);
    }

    return "Die Einladung konnte nicht eingelöst werden.";
  }, [useInvitationMutation.error, useInvitationMutation.isError]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError("Die Passwoerter stimmen nicht ueberein.");
      return;
    }

    if (password.length < 8) {
      setFormError("Bitte waehle ein Passwort mit mindestens 8 Zeichen.");
      return;
    }

    useInvitationMutation.mutate();
  }

  const serverUrl = import.meta.env.VITE_JELLYFIN_URL ?? "deinen Jellyfin-Server";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.28),_transparent_34%),#020617] px-4 py-10 text-slate-100">
      <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/85 p-8 shadow-2xl shadow-purple-950/30 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-purple-300">
            Jellyfin Einladung
          </p>
          <h1 className="text-3xl font-bold text-white">Account erstellen</h1>
          <p className="mt-3 text-sm text-slate-400">
            Richte deinen Zugang ein und tritt dem Jellyfin-Server bei.
          </p>
        </div>

        {validationQuery.isLoading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-center text-slate-300">
            Einladung wird geprueft...
          </div>
        ) : null}

        {validationError ? (
          <div className="space-y-5 rounded-2xl border border-red-500/30 bg-red-950/30 p-5 text-center">
            <h2 className="text-xl font-semibold text-red-100">Einladung nicht verfuegbar</h2>
            <p className="text-sm text-red-200">{validationError}</p>
            <Link className="inline-flex text-sm font-medium text-purple-200 hover:text-white" to="/login">
              Zur Admin-Anmeldung
            </Link>
          </div>
        ) : null}

        {useInvitationMutation.isSuccess ? (
          <div className="space-y-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 text-center">
            <h2 className="text-xl font-semibold text-emerald-100">Einladung erfolgreich eingelöst</h2>
            <p className="text-sm text-emerald-200">
              Dein Jellyfin-Account wurde erstellt. Du kannst dich jetzt bei {serverUrl} anmelden.
            </p>
          </div>
        ) : null}

        {validationQuery.data && !useInvitationMutation.isSuccess ? (
          <>
            <div className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <div className="flex justify-between gap-4">
                <span>Ablauf</span>
                <strong className="text-white">{countdown ?? "..."}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Verwendungen</span>
                <strong className="text-white">
                  {validationQuery.data.useCount}/{validationQuery.data.maxUses}
                </strong>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Gewuenschter Jellyfin-Username
                </span>
                <input
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30"
                  placeholder="mein-username"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Passwort</span>
                <input
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30"
                  type="password"
                  placeholder="Mindestens 8 Zeichen"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Passwort bestaetigen</span>
                <input
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30"
                  type="password"
                  placeholder="Passwort erneut eingeben"
                  required
                />
              </label>

              {formError || submitError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {formError ?? submitError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={useInvitationMutation.isPending}
                className="w-full rounded-xl bg-purple-500 px-4 py-3 font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {useInvitationMutation.isPending ? "Account wird erstellt..." : "Einladung einloesen"}
              </button>
            </form>
          </>
        ) : null}
      </section>
    </main>
  );
}
