import {useState} from "react";
import type {SpecialOffer} from "../../../domain/models/SpecialOffer";

interface Props {
  initial?: Partial<SpecialOffer>;
  saving: boolean;
  submitLabel: string;
  onSubmit: (offer: Omit<SpecialOffer, "id">) => void;
}

export function SpecialOfferForm({initial, saving, submitLabel, onSubmit}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dollarValue, setDollarValue] = useState(
    initial?.dollarValueCents != null ? String(initial.dollarValueCents / 100) : ""
  );
  const [pointsRequired, setPointsRequired] = useState(String(initial?.pointsRequired ?? 0));
  const [isEnabled, setIsEnabled] = useState(initial?.isEnabled ?? true);
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError("");
    const value = dollarValue.trim() ? Math.round(Number(dollarValue) * 100) : null;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      dollarValueCents: Number.isFinite(value) ? value : null,
      pointsRequired: Math.max(0, Number.parseInt(pointsRequired, 10) || 0),
      memberTier: "platinum",
      isEnabled,
    });
  }

  return (
    <div className="nnc-card form-card">
      {error && <p className="form-error">{error}</p>}
      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <label>Optional Dollar Value</label>
      <input
        type="number"
        min={0}
        step="0.01"
        value={dollarValue}
        onChange={(e) => setDollarValue(e.target.value)}
        placeholder="e.g. 10.00"
      />
      <label>Rewards Points Required</label>
      <input
        type="number"
        min={0}
        value={pointsRequired}
        onChange={(e) => setPointsRequired(e.target.value)}
      />
      <p className="nnc-list-row__sub" style={{margin: "0.25rem 0 0"}}>
        Special Offers are for Platinum Members only.
      </p>
      <label style={{display: "flex", alignItems: "center", gap: 8, marginTop: 12}}>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
          style={{width: "auto"}}
        />
        Enabled
      </label>
      <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
        {saving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
