import {useState} from "react";
import {AppBar} from "../../../core/ui/AppBar";
import {sendRewardsReminders, sendBroadcastMessage} from "../../../data/messagingApi";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus = "idle" | "sending" | "success" | "error";

interface CampaignState {
  status: CampaignStatus;
  message: string;
}

const IDLE: CampaignState = {status: "idle", message: ""};

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerMessagingPage() {
  const [rewardsState, setRewardsState] = useState<CampaignState>(IDLE);
  const [broadcastState, setBroadcastState] = useState<CampaignState>(IDLE);
  const [broadcastText, setBroadcastText] = useState("");

  // Campaign 1: personalised rewards reminder
  async function handleSendRewards() {
    setRewardsState({status: "sending", message: ""});
    try {
      const result = await sendRewardsReminders();
      setRewardsState({
        status: "success",
        message: `Sent to ${result.sent} customer${result.sent !== 1 ? "s" : ""}` +
          ` (${result.skipped} skipped — no FCM token or no appointments).`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRewardsState({status: "error", message: msg});
    }
  }

  // Campaign 2: custom broadcast
  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    const text = broadcastText.trim();
    if (!text) return;
    setBroadcastState({status: "sending", message: ""});
    try {
      const result = await sendBroadcastMessage(text);
      setBroadcastState({
        status: "success",
        message: `Message sent to ${result.sent} customer${result.sent !== 1 ? "s" : ""}.`,
      });
      setBroadcastText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBroadcastState({status: "error", message: msg});
    }
  }

  return (
    <>
      <AppBar title="Customer Messaging" backTo="/super-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 680}}>

          {/* ── Campaign 1: Rewards Reminders ─────────────────────────────── */}
          <p className="nnc-label">Push Notification Campaigns</p>

          <div className="card" style={{marginBottom: "1.25rem", padding: "1.25rem"}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem"}}>
              <div
                className="icon-circle"
                style={{background: "linear-gradient(135deg,#fcd34d,#f59e0b)", flexShrink: 0}}
              >
                ⭐
              </div>
              <div>
                <p style={{margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--color-text)"}}>
                  Rewards Reminder
                </p>
                <p style={{margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)"}}>
                  Sends each customer a personalised push notification based on
                  their service history and how close they are to a reward.
                  Customers with no matching rewards receive a general
                  "come back soon" message.
                </p>
              </div>
            </div>

            <button
              className="btn"
              onClick={handleSendRewards}
              disabled={rewardsState.status === "sending"}
              style={{width: "100%"}}
            >
              {rewardsState.status === "sending"
                ? "Sending…"
                : "Send Rewards Reminders"}
            </button>

            {rewardsState.status !== "idle" && (
              <p style={{
                marginTop: "0.6rem",
                fontSize: "0.85rem",
                color: rewardsState.status === "error"
                  ? "var(--color-danger, #ef4444)"
                  : "var(--color-success, #10b981)",
              }}>
                {rewardsState.status === "error" ? "Error: " : ""}{rewardsState.message}
              </p>
            )}
          </div>

          {/* ── Campaign 2: Custom Broadcast ──────────────────────────────── */}
          <div className="card" style={{padding: "1.25rem"}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem"}}>
              <div
                className="icon-circle"
                style={{background: "linear-gradient(135deg,#6ee7f7,#3b82f6)", flexShrink: 0}}
              >
                📣
              </div>
              <div>
                <p style={{margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--color-text)"}}>
                  Custom Broadcast
                </p>
                <p style={{margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)"}}>
                  Send a custom push notification to all customers on iOS and
                  Android.
                </p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast}>
              <textarea
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Type your message here…"
                rows={4}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--color-border, #e5e7eb)",
                  fontSize: "0.9rem",
                  resize: "vertical",
                  fontFamily: "inherit",
                  color: "var(--color-text)",
                  background: "var(--color-surface, #fff)",
                  marginBottom: "0.75rem",
                }}
              />
              <button
                type="submit"
                className="btn"
                disabled={
                  broadcastState.status === "sending" || !broadcastText.trim()
                }
                style={{width: "100%"}}
              >
                {broadcastState.status === "sending"
                  ? "Sending…"
                  : "Send to All Customers"}
              </button>
            </form>

            {broadcastState.status !== "idle" && (
              <p style={{
                marginTop: "0.6rem",
                fontSize: "0.85rem",
                color: broadcastState.status === "error"
                  ? "var(--color-danger, #ef4444)"
                  : "var(--color-success, #10b981)",
              }}>
                {broadcastState.status === "error" ? "Error: " : ""}{broadcastState.message}
              </p>
            )}
          </div>

        </main>
      </div>
    </>
  );
}
