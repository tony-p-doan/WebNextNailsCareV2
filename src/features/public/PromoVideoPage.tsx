import {useState} from "react";
import {Link} from "react-router-dom";

export function PromoVideoPage() {
  const [showTrialButton, setShowTrialButton] = useState(false);

  return (
    <main
      style={{
        width: "100vw",
        minHeight: "100svh",
        background: "#000",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <video
        src="/attempt-1-promo-demo.mp4"
        controls
        playsInline
        autoPlay
        onEnded={() => setShowTrialButton(true)}
        style={{
          display: "block",
          width: "100vw",
          height: "100svh",
          objectFit: "contain",
          background: "#000",
        }}
      />
      {showTrialButton && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "16px 18px calc(16px + env(safe-area-inset-bottom))",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.88) 32%, #000 100%)",
          }}
        >
          <Link
            to="/store-admin/register"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              minHeight: 56,
              borderRadius: 14,
              background: "#2f80ed",
              color: "#fff",
              fontSize: 18,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 14px 34px rgba(47,128,237,0.42)",
            }}
          >
            Start Free 3 Month Trial
          </Link>
        </div>
      )}
    </main>
  );
}
