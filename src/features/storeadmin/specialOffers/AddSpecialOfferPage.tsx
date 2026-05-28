import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {addSpecialOffer} from "../../../data/specialOffersApi";
import {getActiveStoreId} from "../storeAdminContext";
import {SpecialOfferForm} from "./SpecialOfferForm";
import type {SpecialOffer} from "../../../domain/models/SpecialOffer";

export function AddSpecialOfferPage() {
  const storeId = getActiveStoreId();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  async function save(offer: Omit<SpecialOffer, "id">) {
    if (!storeId) return;
    setSaving(true);
    await addSpecialOffer(storeId, offer);
    navigate("/store-admin/special-offers");
  }

  return (
    <>
      <AppBar title="Add Special Offer" backTo="/store-admin/special-offers" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <SpecialOfferForm saving={saving} submitLabel="Add Special Offer" onSubmit={save} />
        </main>
      </div>
    </>
  );
}
