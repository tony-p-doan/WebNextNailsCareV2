import {useEffect, useRef, useState} from "react";
import {AppBar} from "../../../core/ui/AppBar";
import {FunctionsClient} from "../../../data/functions/FunctionsClient";
import {getActiveStoreId} from "../storeAdminContext";

type BarcodeDetectorCtor = new (options?: {formats?: string[]}) => {
  detect: (image: HTMLVideoElement) => Promise<Array<{rawValue: string}>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export function RedeemRewardScannerPage() {
  const storeId = getActiveStoreId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startCamera() {
    setMessage("");
    if (!window.BarcodeDetector) {
      setMessage("Camera QR scanning is not supported in this browser. Paste the QR payload instead.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}});
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setScanning(true);
    const detector = new window.BarcodeDetector({formats: ["qr_code"]});
    const tick = async () => {
      if (!videoRef.current || !scanning) return;
      const codes = await detector.detect(videoRef.current).catch(() => []);
      if (codes[0]?.rawValue) {
        setManual(codes[0].rawValue);
        setScanning(false);
        await redeem(codes[0].rawValue);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function redeem(raw = manual) {
    try {
      const payload = JSON.parse(raw) as {
        storeId: string;
        customerUserId: string;
        itemType: "reward" | "specialOffer";
        itemId: string;
      };
      if (storeId && payload.storeId !== storeId) {
        setMessage("This QR code is for a different store.");
        return;
      }
      const result = await FunctionsClient.redeemRewardItem(
        payload.storeId,
        payload.customerUserId,
        payload.itemType,
        payload.itemId
      );
      setMessage(`Redeemed. ${result.pointsDeducted} points deducted. Balance: ${result.pointsAfter}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to redeem this QR code.");
    }
  }

  return (
    <>
      <AppBar title="Redeem Reward" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <div className="nnc-card form-card">
            <video ref={videoRef} muted playsInline style={{width: "100%", borderRadius: 12, background: "#111"}} />
            <button className="btn btn--primary" onClick={startCamera}>
              Open Camera
            </button>
            <label>QR Payload</label>
            <textarea value={manual} onChange={(e) => setManual(e.target.value)} />
            <button className="btn btn--outline" onClick={() => redeem()}>
              Redeem
            </button>
            {message && <p className="empty-text" style={{textAlign: "left"}}>{message}</p>}
          </div>
        </main>
      </div>
    </>
  );
}
