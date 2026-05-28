import {useCallback, useEffect, useMemo, useState} from "react";
import {useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {AuthService} from "../../../core/auth/AuthService";
import {getStoresForAdmin} from "../../../data/store/storeApi";
import {
  AdminsSnapshot,
  FunctionsClient,
  InviteOutcome,
} from "../../../data/functions/FunctionsClient";

function formatDate(epochMs: number): string {
  if (!epochMs || epochMs <= 0) return "—";
  return new Date(epochMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ManageAdminsPage() {
  const user = AuthService.getCurrentUser();
  const {storeId: routeStoreId} = useParams();
  const ownerUid = user?.uid ?? null;

  const [resolvedStoreId, setResolvedStoreId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AdminsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Resolve the primary store for the signed-in owner.
  useEffect(() => {
    if (!ownerUid) return;
    if (routeStoreId) {
      setResolvedStoreId(routeStoreId);
      return;
    }
    (async () => {
      const stores = await getStoresForAdmin(ownerUid);
      const primary =
        stores.find((s) => s.id === ownerUid) ?? stores[0] ?? null;
      setResolvedStoreId(primary?.id ?? null);
    })();
  }, [ownerUid, routeStoreId]);

  const reload = useCallback(async () => {
    if (!resolvedStoreId) return;
    setLoading(true);
    setErr(null);
    try {
      const snap = await FunctionsClient.listStoreAdmins(resolvedStoreId);
      setSnapshot(snap);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load admins.");
    } finally {
      setLoading(false);
    }
  }, [resolvedStoreId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleResult = useCallback(
    (outcome: InviteOutcome) => {
      const msg = inviteOutcomeMessage(outcome);
      setToast(msg);
      setShowAdd(false);
      void reload();
    },
    [reload]
  );

  const handleRemove = useCallback(
    async (uid: string, email: string) => {
      if (!resolvedStoreId) return;
      const ok = window.confirm(
        `Remove ${email || "this admin"} from your store?`
      );
      if (!ok) return;
      try {
        await FunctionsClient.removeStoreAdmin(resolvedStoreId, uid);
        setToast("Admin removed.");
        await reload();
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Couldn't remove admin.");
      }
    },
    [resolvedStoreId, reload]
  );

  const handleRevoke = useCallback(
    async (token: string, email: string) => {
      if (!resolvedStoreId) return;
      const ok = window.confirm(`Cancel the invite sent to ${email}?`);
      if (!ok) return;
      try {
        await FunctionsClient.revokeStoreAdminInvite(resolvedStoreId, token);
        setToast("Invite revoked.");
        await reload();
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Couldn't revoke invite.");
      }
    },
    [resolvedStoreId, reload]
  );

  const admins = snapshot?.admins ?? [];
  const pending = snapshot?.pending ?? [];

  return (
    <>
      <AppBar title="Manage Admins" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 600}}>
          <p style={{
            margin: "0 0 1rem",
            fontSize: "0.85rem",
            color: "var(--color-text-muted)",
          }}>
            The original store owner can grant admin access to other people by
            email.
          </p>

          {!resolvedStoreId && (
            <p className="empty-text">Loading store…</p>
          )}

          {err && (
            <p className="error-message" style={{marginBottom: "1rem"}}>
              {err}
            </p>
          )}

          {toast && (
            <div
              role="status"
              style={{
                background: "#ecfdf5",
                color: "#065f46",
                padding: "0.55rem 0.8rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                marginBottom: "0.75rem",
              }}
            >
              {toast}
            </div>
          )}

          {resolvedStoreId && (
            <>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.4rem",
              }}>
                <p className="nnc-label" style={{margin: 0}}>Admins</p>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowAdd(true)}
                >
                  + Add Admin
                </button>
              </div>

              {loading && !snapshot && <p className="empty-text">Loading…</p>}

              {!loading && admins.length === 0 && (
                <p className="empty-text">No admins yet.</p>
              )}

              {admins.map((a) => {
                const displayName = [a.firstName, a.lastName]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={a.uid} className="nnc-list-row">
                    <div
                      className="icon-circle"
                      style={{
                        background: a.isOwner
                          ? "linear-gradient(135deg,#fcd34d,#f59e0b)"
                          : "linear-gradient(135deg,#a78bfa,#7c3aed)",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {(displayName || a.email)[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="nnc-list-row__body">
                      <p className="nnc-list-row__title">
                        {displayName || a.email}
                      </p>
                      <p className="nnc-list-row__sub">
                        {displayName && a.email ? `${a.email} · ` : ""}
                        {a.isOwner ? "Owner" : "Admin"}
                      </p>
                    </div>
                    {!a.isOwner && (
                      <button
                        className="btn btn--outline btn--sm"
                        onClick={() => handleRemove(a.uid, a.email)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}

              <p className="nnc-label" style={{marginTop: "1.25rem"}}>
                Pending invites
              </p>
              {pending.length === 0 ? (
                <p className="empty-text">No pending invites.</p>
              ) : (
                pending.map((p) => (
                  <div key={p.token} className="nnc-list-row">
                    <div
                      className="icon-circle"
                      style={{
                        background: "linear-gradient(135deg,#6ee7f7,#3b82f6)",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      ✉️
                    </div>
                    <div className="nnc-list-row__body">
                      <p className="nnc-list-row__title">{p.email}</p>
                      <p className="nnc-list-row__sub">
                        Expires {formatDate(p.expiresAtMs)}
                      </p>
                    </div>
                    <button
                      className="btn btn--outline btn--sm"
                      onClick={() => handleRevoke(p.token, p.email)}
                    >
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </main>
      </div>

      {showAdd && resolvedStoreId && (
        <AddAdminModal
          storeId={resolvedStoreId}
          onClose={() => setShowAdd(false)}
          onResult={handleResult}
        />
      )}
    </>
  );
}

function inviteOutcomeMessage(outcome: InviteOutcome): string {
  switch (outcome.status) {
    case "added":
      return outcome.method === "push_email"
        ? `${outcome.email} now has admin access and was notified by email and push.`
        : outcome.method === "email"
          ? `${outcome.email} now has admin access and was emailed.`
          : outcome.method === "push"
            ? `${outcome.email} now has admin access and was notified.`
            : `${outcome.email} now has admin access. They can log in to manage the store.`;
    case "already_admin":
      return `${outcome.email} already has admin access.`;
    case "invited":
      return `Invitation email sent to ${outcome.email}.`;
  }
}

function AddAdminModal({
  storeId,
  onClose,
  onResult,
}: {
  storeId: string;
  onClose: () => void;
  onResult: (outcome: InviteOutcome) => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setErr("Enter a valid email address.");
      return;
    }
    setSending(true);
    setErr(null);
    try {
      const outcome = await FunctionsClient.inviteStoreAdmin(
        storeId,
        email.trim().toLowerCase()
      );
      onResult(outcome);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send invite.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 50,
      }}
    >
      <div
        className="form-card"
        style={{maxWidth: 420, width: "100%"}}
      >
        <h3 style={{margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700}}>
          Add an admin
        </h3>
        <p style={{
          margin: "0 0 1rem",
          fontSize: "0.85rem",
          color: "var(--color-text-muted)",
        }}>
          Enter the email address of the person you want to add. If they
          already use NailShopRewards, they'll get a push notification right
          away. Otherwise we'll email them an invite link that expires in
          14 days.
        </p>
        <form onSubmit={submit} noValidate>
          <div className="form-group">
            <label htmlFor="invite-email">Email *</label>
            <input
              id="invite-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(null); }}
              required
              autoFocus
            />
          </div>
          {err && <p className="error-message">{err}</p>}
          <div style={{display: "flex", gap: "0.5rem", marginTop: "0.5rem"}}>
            <button
              type="submit"
              className="btn--primary-full"
              disabled={sending || !valid}
              style={{flex: 1}}
            >
              {sending ? "Sending…" : "Send Invitation"}
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={onClose}
              disabled={sending}
              style={{flex: 1}}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
