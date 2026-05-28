import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {listServices, updateService, deleteService} from "../../../data/store/storeApi";
import type {Service} from "../../../domain/models/Store";
import {serviceIsComplete} from "../../../domain/models/Store";
import {getActiveStoreId} from "../storeAdminContext";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ManageServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const storeId = getActiveStoreId();
  const navigate = useNavigate();

  useEffect(() => {
    if (!storeId) return;
    listServices(storeId).then(setServices);
  }, [storeId]);

  function promptEditService(svc: Service) {
    if (confirm("Edit the price, duration, and active setting for this service.")) {
      navigate(`/store-admin/services/${svc.id}`);
    }
  }

  function openService(svc: Service) {
    if (svc.isActive && serviceIsComplete(svc)) {
      navigate(`/store-admin/services/${svc.id}`);
    } else {
      promptEditService(svc);
    }
  }

  async function toggleActive(svc: Service) {
    if (!storeId) return;
    if (!svc.isActive || !serviceIsComplete(svc)) {
      promptEditService(svc);
      return;
    }
    await updateService(
      storeId, svc.id, svc.icon, svc.title, svc.description,
      svc.durationMinutes, svc.priceCents, svc.rewardsPoints ?? 0, !svc.isActive
    );
    setServices((prev) =>
      prev.map((s) => (s.id === svc.id ? {...s, isActive: !s.isActive} : s))
    );
  }

  async function remove(svc: Service) {
    if (!storeId) return;
    if (!confirm("Delete this service?")) return;
    await deleteService(storeId, svc.id);
    setServices((prev) => prev.filter((s) => s.id !== svc.id));
  }

  if (!storeId) return null;

  return (
    <>
      <AppBar title="Manage Services" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", paddingBottom: "6rem", maxWidth: 640}}>
          <p className="nnc-label">Services</p>
          {services.length === 0 && (
            <p className="empty-text">No services yet. Add one below.</p>
          )}
          {services.map((svc) => {
            const complete = serviceIsComplete(svc);
            return (
              <div
                key={svc.id}
                className="nnc-list-row"
                onClick={() => openService(svc)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") openService(svc);
                }}
                style={{cursor: "pointer", marginBottom: "0.6rem"}}
              >
                <label style={{display: "flex", alignItems: "center", flexShrink: 0}}>
                  <input
                    type="checkbox"
                    checked={svc.isActive}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggleActive(svc)}
                    style={{width: 18, height: 18, accentColor: "var(--color-primary)"}}
                  />
                </label>
                <div
                  className="icon-circle"
                  style={{
                    background: complete ? "linear-gradient(135deg,#f9a8d4,#ec4899)" : "#f5f5f5",
                    fontSize: "1.5rem",
                  }}
                >
                  {svc.icon || "💅"}
                </div>
                <div style={{flex: 1, minWidth: 0}}>
                  <p className="nnc-list-row__title" style={{color: complete ? "var(--color-text)" : "var(--color-danger)"}}>
                    {svc.title}
                  </p>
                  <p className="nnc-list-row__sub">
                    {svc.durationMinutes ? `${svc.durationMinutes} min` : ""}
                    {svc.durationMinutes && svc.priceCents != null ? " · " : ""}
                    {svc.priceCents != null ? formatPrice(svc.priceCents) : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(svc);
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </main>
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "max(1rem, env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            width: "calc(100% - 2rem)",
            maxWidth: 640,
            zIndex: 20,
          }}
        >
          <Link to="/store-admin/services/new" className="nnc-add-btn" style={{marginTop: 0}}>
            + Add New Service
          </Link>
        </div>
      </div>
    </>
  );
}
