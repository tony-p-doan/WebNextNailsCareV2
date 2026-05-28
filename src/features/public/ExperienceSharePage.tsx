import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {getExperienceShare, type ExperienceShare} from "../../data/experienceShareApi";

export function ExperienceSharePage() {
  const {shareId = ""} = useParams<{shareId: string}>();
  const [share, setShare] = useState<ExperienceShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!shareId) {
      setLoading(false);
      setError("Missing share experience ID.");
      return;
    }
    setLoading(true);
    setError("");
    getExperienceShare(shareId)
      .then((result) => {
        if (!cancelled) setShare(result);
      })
      .catch((err: unknown) => {
        console.error("Failed to load shared experience", err);
        if (!cancelled) setError("This shared experience could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (loading) {
    return <main className="page-bg"><p className="loading-text">Loading experience...</p></main>;
  }

  if (error || !share) {
    return (
      <main className="page-bg" style={{minHeight: "100svh"}}>
        <section className="container" style={{maxWidth: 520, paddingTop: "2rem"}}>
          <div className="nnc-card" style={{padding: "1rem"}}>
            <h1 style={{marginTop: 0}}>Shared Experience</h1>
            <p className="empty-text" style={{textAlign: "left"}}>
              {error || "This shared experience was not found."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const date = share.createdAt?.toDate
    ? share.createdAt.toDate().toLocaleDateString()
    : new Date().toLocaleDateString();
  const address = [share.storeAddress, share.storeCity, share.storeState, share.storeZip]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="page-bg" style={{minHeight: "100svh"}}>
      <section className="container" style={{maxWidth: 520, paddingTop: "1.5rem", paddingBottom: "2rem"}}>
        <div className="nnc-card" style={{padding: "1rem"}}>
          <h1 style={{margin: "0 0 0.25rem"}}>{share.serviceType}</h1>
          <p className="empty-text" style={{textAlign: "left", marginTop: 0}}>
            {date} · {share.storeName}
            {address && <><br />{address}</>}
          </p>
          <p className="nnc-label">Before</p>
          {share.beforeImageUrls.map((url, index) => (
            <img key={`before-${url}`} src={url} alt={`Before ${index + 1}`} style={{width: "100%", borderRadius: 12, marginBottom: 10}} />
          ))}
          <p className="nnc-label">After</p>
          {share.afterImageUrls.map((url, index) => (
            <img key={`after-${url}`} src={url} alt={`After ${index + 1}`} style={{width: "100%", borderRadius: 12, marginBottom: 10}} />
          ))}
        </div>
      </section>
    </main>
  );
}
