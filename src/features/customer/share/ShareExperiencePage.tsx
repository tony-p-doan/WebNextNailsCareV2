import {useState} from "react";
import {AppBar} from "../../../core/ui/AppBar";
import {FunctionsClient} from "../../../data/functions/FunctionsClient";

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const max = 900;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

interface ShareExperiencePageProps {
  backTo?: string;
}

export function ShareExperiencePage({backTo = "/customer"}: ShareExperiencePageProps) {
  const [storeId, setStoreId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function choose(file: File | undefined, setter: (url: string) => void) {
    if (!file) return;
    setter(await fileToCompressedDataUrl(file));
  }

  async function save() {
    setSaving(true);
    const result = await FunctionsClient.createExperienceShare({
      storeId: storeId.trim(),
      serviceType: serviceType.trim(),
      beforeImageUrl: before,
      afterImageUrl: after,
    });
    setShareUrl(result.shareUrl);
    setSaving(false);
  }

  return (
    <>
      <AppBar title="Share Experience" backTo={backTo} />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <div className="nnc-card form-card">
            <label>Store ID</label>
            <input value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="Store ID" />
            <label>Service Type</label>
            <input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Manicure, pedicure, etc." />
            <label>Before Picture</label>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => choose(e.target.files?.[0], setBefore)} />
            {before && <img src={before} alt="Before" style={{width: "100%", borderRadius: 12}} />}
            <label>After Picture</label>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => choose(e.target.files?.[0], setAfter)} />
            {after && <img src={after} alt="After" style={{width: "100%", borderRadius: 12}} />}
            <button className="btn btn--primary" onClick={save} disabled={saving || !storeId || !serviceType || !before || !after}>
              {saving ? "Creating..." : "Create Share Page"}
            </button>
            {shareUrl && (
              <>
                <p className="success-text">Share page created.</p>
                <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
                <button className="btn btn--outline" onClick={() => navigator.clipboard.writeText(shareUrl)}>
                  Copy Link
                </button>
                <a className="btn btn--outline" href={`sms:?&body=${encodeURIComponent(shareUrl)}`}>Text Link</a>
                <a className="btn btn--outline" href={`mailto:?subject=Nail experience&body=${encodeURIComponent(shareUrl)}`}>Email Link</a>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
