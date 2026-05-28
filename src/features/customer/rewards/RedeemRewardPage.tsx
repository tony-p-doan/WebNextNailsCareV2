import {useEffect, useMemo, useState} from "react";
import {Link, useParams, useSearchParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {useAuth} from "../../../core/auth/AuthContext";
import {FunctionsClient, type CustomerRewardsProgramStore} from "../../../data/functions/FunctionsClient";

export function RedeemRewardPage() {
  const {storeId = ""} = useParams<{storeId: string}>();
  const [params] = useSearchParams();
  const {user} = useAuth();
  const itemType = params.get("type") === "specialOffer" ? "specialOffer" : "reward";
  const itemId = params.get("itemId") ?? "";
  const [store, setStore] = useState<CustomerRewardsProgramStore | null>(null);

  useEffect(() => {
    FunctionsClient.getCustomerRewardsProgram().then((program) => {
      setStore(program.stores.find((s) => s.storeId === storeId) ?? null);
    });
  }, [storeId]);

  const item = useMemo(() => {
    if (!store) return null;
    return itemType === "reward"
      ? store.rewards.find((r) => r.id === itemId)
      : store.specialOffers.find((o) => o.id === itemId);
  }, [store, itemType, itemId]);

  const payload = useMemo(() => JSON.stringify({
    storeId,
    customerUserId: user?.uid ?? "",
    itemType,
    itemId,
  }), [storeId, user, itemType, itemId]);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(payload)}`;

  return (
    <>
      <AppBar title="Redeem Reward" backTo={`/customer/rewards/${storeId}`} />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 520}}>
          <div className="nnc-card" style={{textAlign: "center", padding: "1.25rem"}}>
            <h2 style={{margin: "0 0 0.35rem"}}>{item?.title ?? "Reward"}</h2>
            <p className="empty-text">{store?.storeName}</p>
            <img
              src={qrUrl}
              alt="Reward redemption QR code"
              width={280}
              height={280}
              style={{maxWidth: "100%", borderRadius: 12, background: "#fff"}}
            />
            <p className="empty-text">
              Show this QR code to the store admin to redeem this item.
            </p>
            <Link className="btn btn--outline" to={`/customer/rewards/${storeId}`}>
              Back to Rewards Program
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
