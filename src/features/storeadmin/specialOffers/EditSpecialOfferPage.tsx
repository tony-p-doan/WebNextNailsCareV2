import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {getSpecialOffer, updateSpecialOffer} from "../../../data/specialOffersApi";
import {getActiveStoreId} from "../storeAdminContext";
import {SpecialOfferForm} from "./SpecialOfferForm";
import type {SpecialOffer} from "../../../domain/models/SpecialOffer";

export function EditSpecialOfferPage() {
  const {offerId = ""} = useParams<{offerId: string}>();
  const storeId = getActiveStoreId();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<SpecialOffer | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storeId || !offerId) return;
    getSpecialOffer(storeId, offerId).then(setOffer);
  }, [storeId, offerId]);

  async function save(next: Omit<SpecialOffer, "id">) {
    if (!storeId || !offerId) return;
    setSaving(true);
    await updateSpecialOffer(storeId, offerId, next);
    navigate("/store-admin/special-offers");
  }

  return (
    <>
      <AppBar title="Edit Special Offer" backTo="/store-admin/special-offers" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          {offer ? (
            <SpecialOfferForm initial={offer} saving={saving} submitLabel="Update Special Offer" onSubmit={save} />
          ) : (
            <p className="loading-text">Loading...</p>
          )}
        </main>
      </div>
    </>
  );
}
