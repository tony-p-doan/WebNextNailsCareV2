import {useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {AppBar, IconCircle} from "../../../core/ui/AppBar";
import {useAuth} from "../../../core/auth/AuthContext";
import {getStoreAccount} from "../../../data/accountApi";
import type {StoreAccount} from "../../../data/accountApi";
import {StripeSubscriptionClient} from "../../../data/stripe/StripeSubscriptionClient";
import {FunctionsClient} from "../../../data/functions/FunctionsClient";
import type {StripeTransaction} from "../../../data/functions/FunctionsClient";
import {getActiveStoreId} from "../storeAdminContext";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "None";
  const [y, mo, d] = dateStr.split("-");
  return new Date(Number(y), Number(mo) - 1, Number(d)).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export function ManageAccountPage() {
  const {user} = useAuth();
  const storeId = getActiveStoreId() ?? user?.uid ?? "";
  const [searchParams] = useSearchParams();

  const [account, setAccount] = useState<StoreAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<StripeTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const paymentResult = searchParams.get("payment");

  useEffect(() => {
    if (!storeId) return;
    getStoreAccount(storeId).then((acc) => {
      setAccount(acc);
      setLoading(false);
    });
    setTxLoading(true);
    FunctionsClient.getTransactionHistory()
      .then((tx) => setTransactions(tx))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [storeId]);

  async function handleMakePayment() {
    setPaying(true);
    setPayError(null);
    try {
      await StripeSubscriptionClient.redirectToCheckout();
    } catch (err) {
      console.error("Stripe checkout error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setPayError(`Payment error: ${msg}`);
      setPaying(false);
    }
  }

  const status = account?.status ?? "inactive";
  const isActive = status === "active";

  return (
    <>
      <AppBar title="Manage Account" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 480}}>

          {paymentResult === "success" && (
            <div className="nnc-card" style={{
              marginBottom: "1rem",
              background: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
              border: "1px solid #6ee7b7",
              textAlign: "center",
              padding: "1rem",
            }}>
              <p style={{margin: 0, fontWeight: 700, color: "#065f46"}}>
                ✅ Payment successful! Your account is now active.
              </p>
            </div>
          )}

          {paymentResult === "cancelled" && (
            <div className="nnc-card" style={{
              marginBottom: "1rem",
              background: "linear-gradient(135deg,#fef3c7,#fde68a)",
              border: "1px solid #f59e0b",
              textAlign: "center",
              padding: "1rem",
            }}>
              <p style={{margin: 0, fontWeight: 700, color: "#92400e"}}>
                ⚠️ Payment was cancelled. No charge was made.
              </p>
            </div>
          )}

          <div className="nnc-card" style={{padding: "1.5rem", textAlign: "center"}}>
            <IconCircle
              emoji="💳"
              gradient="linear-gradient(135deg,#6ee7b7,#10b981)"
              size={64}
            />
            <h2 style={{margin: "0.75rem 0 0.25rem", fontSize: "1.2rem"}}>Subscription</h2>
            <p style={{margin: 0, color: "var(--color-text-muted)", fontSize: "0.9rem"}}>
              NailShopRewards monthly plan
            </p>
          </div>

          {loading ? (
            <p className="loading-text">Loading account info…</p>
          ) : (
            <>
              <div className="nnc-card" style={{marginTop: "1rem"}}>
                <p className="nnc-label">Account Status</p>
                <div style={{display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem"}}>
                  <span style={{
                    display: "inline-block",
                    width: 10, height: 10, borderRadius: "50%",
                    background: isActive ? "var(--color-success)" : "var(--color-danger)",
                  }} />
                  <span style={{
                    fontWeight: 700,
                    color: isActive ? "var(--color-success)" : "var(--color-danger)",
                    fontSize: "1rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div style={{marginTop: "1rem"}}>
                  <p className="nnc-label">Last Payment Date</p>
                  <p style={{margin: "0.25rem 0 0", fontWeight: 600, fontSize: "0.95rem"}}>
                    {formatDate(account?.lastPaymentDate ?? null)}
                  </p>
                </div>
              </div>

              <div className="nnc-card" style={{marginTop: "1rem"}}>
                <p className="nnc-label" style={{marginBottom: "0.5rem"}}>Make a Payment</p>
                <p style={{fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "0 0 1rem"}}>
                  Click below to subscribe or renew your NailShopRewards plan with automatic recurring billing.
                </p>

                {payError && (
                  <p style={{
                    color: "var(--color-danger)",
                    fontSize: "0.85rem",
                    marginBottom: "0.75rem",
                    textAlign: "center",
                  }}>
                    {payError}
                  </p>
                )}

                <button
                  className="btn--primary-full"
                  onClick={handleMakePayment}
                  disabled={paying}
                >
                  {paying ? "Redirecting to Stripe…" : "💳 Make Payment"}
                </button>
                <p style={{fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.75rem", textAlign: "center"}}>
                  Payments are processed securely via Stripe. Subscription renews monthly.
                </p>
              </div>

              {/* Transaction History */}
              <div className="nnc-card" style={{marginTop: "1rem"}}>
                <p className="nnc-label" style={{marginBottom: "0.75rem"}}>Transaction History</p>
                {txLoading ? (
                  <p style={{fontSize: "0.85rem", color: "var(--color-text-muted)"}}>Loading transactions…</p>
                ) : transactions.length === 0 ? (
                  <p style={{fontSize: "0.85rem", color: "var(--color-text-muted)"}}>No transactions found.</p>
                ) : (
                  <div style={{display: "flex", flexDirection: "column", gap: "0.6rem"}}>
                    {transactions.map((tx) => {
                      const date = new Date(tx.created * 1000).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      });
                      const amount = (tx.amount / 100).toLocaleString("en-US", {
                        style: "currency", currency: tx.currency.toUpperCase(),
                      });
                      const isPaid = tx.status === "paid";
                      return (
                        <div key={tx.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0.75rem", borderRadius: "var(--radius-sm)",
                          background: "var(--color-bg-alt, #f9f7ff)",
                          border: "1px solid var(--color-border, #e9e3ff)",
                        }}>
                          <div>
                            <p style={{margin: 0, fontWeight: 600, fontSize: "0.9rem"}}>{amount}</p>
                            <p style={{margin: 0, fontSize: "0.75rem", color: "var(--color-text-muted)"}}>
                              {date} {tx.description ? `· ${tx.description}` : ""}
                            </p>
                          </div>
                          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                            <span style={{
                              fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                              letterSpacing: "0.05em", padding: "0.2rem 0.6rem", borderRadius: "999px",
                              background: isPaid ? "#d1fae5" : "#fef3c7",
                              color: isPaid ? "#065f46" : "#92400e",
                            }}>
                              {tx.status ?? "unknown"}
                            </span>
                            {tx.hostedInvoiceUrl && (
                              <a href={tx.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer"
                                 style={{fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "underline"}}>
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
