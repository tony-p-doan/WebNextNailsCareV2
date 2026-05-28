import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {listServices} from "../../../data/store/storeApi";
import {serviceIsComplete} from "../../../domain/models/Store";
import {useBooking} from "./BookingContext";
import type {Service} from "../../../domain/models/Store";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const SVC_GRADIENTS = [
  "linear-gradient(135deg,#f9a8d4,#ec4899)",
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#6ee7f7,#3b82f6)",
  "linear-gradient(135deg,#fcd34d,#f59e0b)",
  "linear-gradient(135deg,#6ee7b7,#10b981)",
];

export function SelectServicePage() {
  const {storeId = ""} = useParams<{storeId: string}>();
  const navigate = useNavigate();
  const {selectedStore, pendingDate, pendingTimeSlot} = useBooking();
  const isDemo = selectedStore?.isDemoStore ?? false;

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    listServices(storeId).then((list) => {
      // Demo store: show all complete services regardless of isActive
      const filtered = isDemo
        ? list.filter((s) => serviceIsComplete(s))
        : list.filter((s) => s.isActive && serviceIsComplete(s));
      setServices(filtered);
      setLoading(false);
    });
  }, [storeId, isDemo]);

  function openService(svc: Service) {
    if (pendingDate && pendingTimeSlot) {
      navigate(`/customer/booking/${storeId}/service/${svc.id}/date/${pendingDate}/time/${pendingTimeSlot}/provider`);
      return;
    }
    navigate(`/customer/booking/${storeId}/service/${svc.id}/date`);
  }

  return (
    <>
      <AppBar title="Select a Service" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          {isDemo && (
            <div className="info-message" style={{marginBottom: "1rem"}}>
              ✨ <strong>Demo Store</strong> — all services are available for booking.
            </div>
          )}
          <p className="nnc-label">Available Services</p>
          {loading ? (
            <p className="loading-text">Loading services…</p>
          ) : services.length === 0 ? (
            <p className="empty-text">No services available at this store.</p>
          ) : (
            services.map((svc, idx) => (
              <button
                key={svc.id}
                className="nnc-list-row"
                onClick={() => openService(svc)}
              >
                <div
                  className="icon-circle"
                  style={{background: SVC_GRADIENTS[idx % SVC_GRADIENTS.length]}}
                >
                  {svc.icon || "💅"}
                </div>
                <div className="nnc-list-row__body">
                  <p className="nnc-list-row__title">{svc.title}</p>
                  <p className="nnc-list-row__sub">
                    {[
                      svc.durationMinutes ? `⏱ ${svc.durationMinutes} min` : null,
                      svc.priceCents != null ? `💰 ${formatPrice(svc.priceCents)}` : null,
                      svc.rewardsPoints > 0 ? `⭐ ${svc.rewardsPoints} pts` : null,
                    ].filter(Boolean).join("  ·  ")}
                  </p>
                </div>
                <span className="nnc-list-row__arrow">›</span>
              </button>
            ))
          )}
        </main>
      </div>
    </>
  );
}
