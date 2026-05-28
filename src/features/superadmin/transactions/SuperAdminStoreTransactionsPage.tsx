import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {FunctionsClient, type StoreStripeTransaction} from "../../../data/functions/FunctionsClient";
import {getStore} from "../../../data/store/storeApi";
import type {Store} from "../../../domain/models/Store";

function formatAmount(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPeriod(start: number | null, end: number | null): string | null {
  if (!start || !end) return null;
  const fmt: Intl.DateTimeFormatOptions = {
    month: "short", day: "numeric", year: "numeric",
  };
  const s = new Date(start * 1000).toLocaleDateString("en-US", fmt);
  const e = new Date(end * 1000).toLocaleDateString("en-US", fmt);
  return `${s} – ${e}`;
}

function statusColor(status: string | null): string {
  switch (status) {
  case "paid": return "#059669";
  case "open":
  case "draft": return "#d97706";
  case "uncollectible":
  case "void": return "#b91c1c";
  default: return "#6b7280";
  }
}

/**
 * Superadmin detail view: shows the Stripe invoice/transaction history for a
 * single store fetched via the `getStoreTransactionHistory` callable.
 */
export function SuperAdminStoreTransactionsPage() {
  const {storeId} = useParams<{storeId: string}>();
  const [store, setStore] = useState<Store | null>(null);
  const [transactions, setTransactions] = useState<StoreStripeTransaction[]>([]);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [storeData, history] = await Promise.all([
          getStore(storeId).catch(() => null),
          FunctionsClient.getStoreTransactionHistory(storeId),
        ]);
        setStore(storeData);
        setTransactions(history.transactions);
        setStripeCustomerId(history.stripeCustomerId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [storeId]);

  return (
    <>
      <AppBar title="Transactions" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 760}}>
          <div className="welcome-banner" style={{marginBottom: "1rem"}}>
            <h2 className="welcome-banner__greeting">
              {store?.businessName || "Store"}
            </h2>
            <p className="welcome-banner__sub">
              {store?.address || "Stripe payment history"}
            </p>
            {stripeCustomerId && (
              <p style={{
                margin: "0.25rem 0 0",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                fontFamily: "monospace",
              }}>
                Stripe customer: {stripeCustomerId}
              </p>
            )}
          </div>

          {loading && <p className="loading-text">Loading transactions…</p>}

          {error && (
            <div style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}>
              {error}
            </div>
          )}

          {!loading && !error && transactions.length === 0 && (
            <div className="nnc-card" style={{padding: "1rem", textAlign: "center"}}>
              <p style={{margin: 0, color: "var(--color-text-muted)"}}>
                {stripeCustomerId
                  ? "No transactions yet for this store."
                  : "This store has no Stripe customer record."}
              </p>
            </div>
          )}

          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="nnc-card"
              style={{padding: "1rem", marginBottom: "0.75rem"}}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
              }}>
                <div style={{minWidth: 0, flex: 1}}>
                  <div style={{display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap"}}>
                    <p style={{margin: 0, fontWeight: 700, fontSize: "1.05rem"}}>
                      {formatAmount(tx.amount, tx.currency)}
                    </p>
                    <span style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.45rem",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      background: `${statusColor(tx.status)}1a`,
                      color: statusColor(tx.status),
                    }}>
                      {tx.status ?? "unknown"}
                    </span>
                  </div>
                  <p style={{
                    margin: "0.2rem 0 0",
                    fontSize: "0.82rem",
                    color: "var(--color-text-muted)",
                  }}>
                    {formatDate(tx.created)}
                  </p>
                  {tx.description && (
                    <p style={{margin: "0.35rem 0 0", fontSize: "0.88rem"}}>
                      {tx.description}
                    </p>
                  )}
                  {formatPeriod(tx.periodStart, tx.periodEnd) && (
                    <p style={{
                      margin: "0.2rem 0 0",
                      fontSize: "0.78rem",
                      color: "var(--color-text-muted)",
                    }}>
                      Period: {formatPeriod(tx.periodStart, tx.periodEnd)}
                    </p>
                  )}
                  <p style={{
                    margin: "0.35rem 0 0",
                    fontSize: "0.72rem",
                    color: "var(--color-text-muted)",
                    fontFamily: "monospace",
                  }}>
                    {tx.number ? `${tx.number} · ` : ""}{tx.id}
                    {tx.billingReason ? ` · ${tx.billingReason}` : ""}
                  </p>
                </div>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  flexShrink: 0,
                }}>
                  {tx.hostedInvoiceUrl && (
                    <a
                      href={tx.hostedInvoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn--outline"
                      style={{padding: "0.3rem 0.6rem", fontSize: "0.75rem"}}
                    >
                      Invoice
                    </a>
                  )}
                  {tx.invoicePdf && (
                    <a
                      href={tx.invoicePdf}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn--outline"
                      style={{padding: "0.3rem 0.6rem", fontSize: "0.75rem"}}
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    </>
  );
}
