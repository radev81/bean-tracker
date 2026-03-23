import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import "./ContainerQRPage.css";

// ─── Small helpers ────────────────────────────────────────────────────────────

// Formats a recipe row into readable numbers with units.
function RecipeRow({ recipe }) {
  if (!recipe) return null;
  return (
    <div className="qr-recipe">
      <div className="qr-recipe-label">
        {recipe.shot_type === "double" ? "Double espresso" : "Single espresso"}
      </div>
      <div className="qr-recipe-values">
        {recipe.dose_in_g != null && (
          <span>
            <strong>{recipe.dose_in_g}</strong>
            <em>g in</em>
          </span>
        )}
        {recipe.yield_out_g != null && (
          <span>
            <strong>{recipe.yield_out_g}</strong>
            <em>g out</em>
          </span>
        )}
        {recipe.time_seconds != null && (
          <span>
            <strong>{recipe.time_seconds}</strong>
            <em>s</em>
          </span>
        )}
        {recipe.temp_celsius != null && (
          <span>
            <strong>{recipe.temp_celsius}</strong>
            <em>°C</em>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContainerQRPage() {
  const { id } = useParams(); // the container number from the URL
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [container, setContainer] = useState(null);
  const [bean, setBean] = useState(null);

  useEffect(() => {
    // Reset state whenever the URL id changes (edge case: user navigates
    // from /container/1 to /container/2 without unmounting)
    setLoading(true);
    setError(null);

    apiFetch(`/api/containers/${id}/current-bean`)
      .then((data) => {
        setContainer(data.container);
        setBean(data.bean); // null if the container is empty
      })
      .catch(() =>
        setError("Could not load container data. Check your connection."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="qr-page">
        <div className="qr-loading">Loading…</div>
      </div>
    );
  }

  // ── Network / 404 error ──
  if (error || !container) {
    return (
      <div className="qr-page">
        <button className="qr-back" onClick={() => navigate("/")}>
          ← All beans
        </button>
        <div className="qr-error">
          <div className="qr-error-icon">⚠️</div>
          <p>{error || "Container not found."}</p>
        </div>
      </div>
    );
  }

  // ── CB-73: container exists but no bean assigned ──
  if (!bean) {
    return (
      <div className="qr-page">
        <button className="qr-back" onClick={() => navigate("/")}>
          ← All beans
        </button>
        <div className="qr-container-badge">{container.name}</div>
        <div className="qr-empty">
          <div className="qr-empty-icon">☕</div>
          <p className="qr-empty-title">No beans assigned</p>
          <p className="qr-empty-sub">
            {container.name} doesn't have any coffee beans assigned to it yet.
          </p>
          {/* Navigates home; BeanList will handle opening the add form */}
          <button className="qr-add-btn" onClick={() => navigate("/")}>
            + Add Coffee Beans
          </button>
        </div>
      </div>
    );
  }

  // ── CB-72: container has a bean assigned — show it expanded ──
  // Prefer the double recipe if available, fall back to single.
  const recipe =
    bean.recipes?.find((r) => r.shot_type === "double") ||
    bean.recipes?.find((r) => r.shot_type === "single") ||
    null;

  return (
    <div className="qr-page">
      <button className="qr-back" onClick={() => navigate("/")}>
        ← All beans
      </button>

      {/* Gradient pill showing which container was scanned */}
      <div className="qr-container-badge">{container.name}</div>

      {/* The bean card — always shown in its expanded state on this page */}
      <div className="qr-card">
        <div className="qr-card-bar" />{" "}
        {/* left gradient bar, same as expanded BeanCard */}
        {/* Header row */}
        <div className="qr-card-header">
          <span className={`qr-fav-icon${bean.is_favourite ? " active" : ""}`}>
            ♥
          </span>
          <div className="qr-card-title">
            <div className="qr-bean-name">{bean.name}</div>
            <div className="qr-bean-meta">
              {bean.country}
              {bean.processing ? ` · ${bean.processing}` : ""}
              {bean.shop_name ? ` · ${bean.shop_name}` : ""}
            </div>
          </div>
        </div>
        {/* Detail grid */}
        <div className="qr-details">
          {bean.region && (
            <div className="qr-detail">
              <span className="qr-dl">Region</span>
              <span className="qr-dv">{bean.region}</span>
            </div>
          )}
          {bean.altitude && (
            <div className="qr-detail">
              <span className="qr-dl">Altitude</span>
              <span className="qr-dv">{bean.altitude}</span>
            </div>
          )}
          {bean.sca_score && (
            <div className="qr-detail">
              <span className="qr-dl">SCA</span>
              <span className="qr-dv">{bean.sca_score}</span>
            </div>
          )}
          {bean.variety && (
            <div className="qr-detail">
              <span className="qr-dl">Variety</span>
              <span className="qr-dv">{bean.variety}</span>
            </div>
          )}
          {bean.processing && (
            <div className="qr-detail">
              <span className="qr-dl">Process</span>
              <span className="qr-dv">{bean.processing}</span>
            </div>
          )}
          {bean.farm_producer && (
            <div className="qr-detail">
              <span className="qr-dl">Farm</span>
              <span className="qr-dv">{bean.farm_producer}</span>
            </div>
          )}
        </div>
        {/* Flavour tags */}
        {bean.tags?.length > 0 && (
          <div className="qr-tags">
            {bean.tags.map((tag) => (
              <span key={tag} className="qr-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Tasting notes */}
        {bean.notes && <p className="qr-notes">"{bean.notes}"</p>}
        {/* Recipe */}
        {recipe && <RecipeRow recipe={recipe} />}
      </div>
    </div>
  );
}
