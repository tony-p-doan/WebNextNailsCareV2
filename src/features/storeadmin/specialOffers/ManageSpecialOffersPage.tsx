import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {listSpecialOffers, deleteSpecialOffer} from "../../../data/specialOffersApi";
import type {SpecialOffer} from "../../../domain/models/SpecialOffer";
import {getActiveStoreId} from "../storeAdminContext";

export function ManageSpecialOffersPage() {
  const storeId = getActiveStoreId();
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    listSpecialOffers(storeId).then(setOffers).finally(() => setLoading(false));
  }, [storeId]);

  async function remove(id: string) {
    if (!storeId || !window.confirm("Delete this special offer?")) return;
    await deleteSpecialOffer(storeId, id);
    setOffers((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <>
      <AppBar title="Special Offers" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <Link className="btn btn--primary" to="/store-admin/special-offers/new">
            Add a Special Offer
          </Link>
          {loading ? (
            <p className="loading-text">Loading...</p>
          ) : offers.length === 0 ? (
            <p className="empty-text">No special offers yet.</p>
          ) : (
            offers.map((offer) => (
              <div key={offer.id} className="nnc-list-row">
                <div className="icon-circle" style={{background: "linear-gradient(135deg,#a78bfa,#7c3aed)"}}>
                  %
                </div>
                <Link to={`/store-admin/special-offers/${offer.id}`} className="nnc-list-row__body" style={{textDecoration: "none"}}>
                  <p className="nnc-list-row__title">{offer.title}</p>
                  <p className="nnc-list-row__sub">{offer.description}</p>
                  <span className="badge badge--primary">
                    Platinum · {offer.pointsRequired} pts · {offer.isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </Link>
                <button className="icon-btn" onClick={() => remove(offer.id)} aria-label="Delete offer">
                  🗑
                </button>
              </div>
            ))
          )}
        </main>
      </div>
    </>
  );
}
