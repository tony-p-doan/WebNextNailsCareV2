import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {listExperienceSharesForStore, type ExperienceShare} from "../../../data/experienceShareApi";
import {getActiveStoreId} from "../storeAdminContext";

function dateLabel(share: ExperienceShare): string {
  return share.createdAt?.toDate ? share.createdAt.toDate().toLocaleDateString() : "";
}

export function SharedExperiencesPage() {
  const storeId = getActiveStoreId();
  const [shares, setShares] = useState<ExperienceShare[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    listExperienceSharesForStore(storeId).then(setShares).finally(() => setLoading(false));
  }, [storeId]);

  return (
    <>
      <AppBar title="Shared Experiences" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1rem", paddingBottom: "2rem"}}>
          {loading && <p className="loading-text">Loading shared experiences...</p>}
          {!loading && shares.length === 0 && (
            <div className="nnc-card"><p className="empty-text">No shared experiences yet.</p></div>
          )}
          <div style={{display: "grid", gap: "1rem"}}>
            {shares.map((share) => (
              <article key={share.id} className="nnc-card" style={{padding: "1rem"}}>
                <h2 style={{marginTop: 0}}>{share.serviceType || "Service"}</h2>
                <p className="empty-text" style={{textAlign: "left", marginTop: 0}}>
                  {dateLabel(share)} · {share.storeName}
                </p>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem"}}>
                  <div>
                    <p className="nnc-label">Before</p>
                    {share.beforeImageUrls.slice(0, 2).map((url) => (
                      <img key={url} src={url} alt="Before" style={{width: "100%", borderRadius: 10, marginBottom: 8}} />
                    ))}
                  </div>
                  <div>
                    <p className="nnc-label">After</p>
                    {share.afterImageUrls.slice(0, 2).map((url) => (
                      <img key={url} src={url} alt="After" style={{width: "100%", borderRadius: 10, marginBottom: 8}} />
                    ))}
                  </div>
                </div>
                <Link className="btn btn--outline btn--full" style={{marginTop: "0.75rem"}} to={`/experience/${share.id}`}>
                  View Public Page
                </Link>
              </article>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
