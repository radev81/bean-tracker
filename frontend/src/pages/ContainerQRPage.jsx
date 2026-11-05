// pages/ContainerQRPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// What opens when you scan the QR code on a container:
//   /beans/container/:id   (CB-72, CB-73)
//
//  • One big dial with the container's bean and its espresso ratio — the
//    "machine screen" view, readable at arm's length next to the grinder
//  • The recipe numbers, flavour tags and shortcuts to the bean / dial-in
//  • Empty container → fill it with one of your beans, or add a new bean
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../api";
import { fmt, getDoubleRecipe, metaLine, ratioNumber } from "../beanUtils";
import { Button, Chip, Dial, containerColor } from "../components/ui";
import { BackIcon, DialIcon } from "../components/ui/icons";
import "./ContainerQRPage.css";

export default function ContainerQRPage() {
  const api = useApi();
  const { id } = useParams(); // the container number from the URL
  const navigate = useNavigate();

  // Results are tagged with the id they belong to, so switching from
  // /container/1 to /container/2 never shows the old container's data.
  const [result, setResult] = useState(null); // { forId, container, bean }
  const [failure, setFailure] = useState(null); // { forId, message }

  useEffect(() => {
    let cancelled = false;
    api
      .getContainerCurrentBean(id)
      .then((data) => !cancelled && setResult({ forId: id, ...data }))
      .catch((err) =>
        !cancelled &&
        setFailure({
          forId: id,
          message:
            err.status === 404
              ? "There's no container with this number."
              : "Could not load the container. Check your connection.",
        }),
      );
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  const current = result?.forId === id ? result : null;
  const error = failure?.forId === id ? failure.message : null;

  const bar = (
    <header className="qr-bar">
      <Link to="/" className="ui-btn ui-btn--secondary qr-bar__back">
        <BackIcon size={18} /> All beans
      </Link>
    </header>
  );

  if (error || !current) {
    return (
      <div className="app-fullscreen qr">
        {bar}
        <p className="app-page-message">{error || "Loading…"}</p>
      </div>
    );
  }

  const { container, bean } = current;
  const label = `Container ${container.id} · ${container.name}`;
  const ring = containerColor(container.name);

  // ── CB-73: empty container ─────────────────────────────────────────────────
  if (!bean) {
    return (
      <div className="app-fullscreen qr">
        {bar}
        <section className="qr-dial">
          <Dial value={0} min={0} max={1} size={280} ariaLabel={`${label}: empty`}>
            <span className="qr-dial__label">
              <span className="qr-dot" style={{ background: ring }} aria-hidden="true" />
              {label}
            </span>
            <span className="ui-dial__value">Empty</span>
          </Dial>
        </section>
        <p className="qr-empty">No beans in this container yet.</p>
        <div className="qr-actions">
          <Button
            variant="primary"
            block
            onClick={() => navigate("/containers", { state: { fillId: container.id } })}
          >
            Fill with one of your beans
          </Button>
          <Link to="/new" className="ui-btn ui-btn--secondary ui-btn--block">
            Add a new bean
          </Link>
        </div>
      </div>
    );
  }

  // ── CB-72: container holds a bean ─────────────────────────────────────────
  const double = getDoubleRecipe(bean);
  const recipe = double || bean.recipes?.find((r) => r.shot_type === "single") || null;
  const ratio = recipe ? ratioNumber(recipe.dose_in_g, recipe.yield_out_g) : null;

  const values = recipe
    ? [
        { label: "g in", value: fmt(recipe.dose_in_g) },
        { label: "g out", value: fmt(recipe.yield_out_g) },
        { label: "sec", value: recipe.time_seconds },
        { label: "°C", value: fmt(recipe.temp_celsius) },
      ]
    : [];

  return (
    <div className="app-fullscreen qr">
      {bar}

      <section className="qr-dial">
        <Dial
          value={ratio ?? (bean.sca_score || 0)}
          min={ratio ? 1 : 80}
          max={ratio ? 3 : 100}
          ticks={ratio ? 60 : 20}
          majorEvery={ratio ? 10 : 5}
          knob={Boolean(ratio || bean.sca_score)}
          size={280}
          ariaLabel={
            ratio
              ? `${label}: ${bean.name}, ratio 1 to ${ratio.toFixed(1)}`
              : `${label}: ${bean.name}`
          }
        >
          <span className="qr-dial__label">
            <span className="qr-dot" style={{ background: ring }} aria-hidden="true" />
            {label}
          </span>
          <span className="ui-dial__value">
            {ratio ? `1:${ratio.toFixed(1)}` : bean.sca_score ?? "–"}
          </span>
          <span className="qr-dial__sub">
            {ratio ? (double ? "Double shot" : "Single shot") : bean.sca_score ? "SCA score" : "No recipe yet"}
          </span>
        </Dial>
      </section>

      <section className="qr-bean">
        <h1 className="qr-bean__name">{bean.name}</h1>
        <p className="qr-bean__meta">{metaLine(bean.shop_name, bean.country, bean.processing)}</p>
      </section>

      {values.length > 0 && (
        <dl className="qr-values">
          {values.map((v) => (
            <div key={v.label} className="qr-values__item">
              <dt>{v.label}</dt>
              <dd>{v.value ?? "–"}</dd>
            </div>
          ))}
        </dl>
      )}

      {recipe?.notes && <p className="qr-notes">{recipe.notes}</p>}

      {bean.tags?.length > 0 && (
        <div className="qr-tags" aria-label="Flavour tags">
          {bean.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      )}

      <div className="qr-actions">
        <Link to={`/bean/${bean.id}`} className="ui-btn ui-btn--primary ui-btn--block">
          Open bean
        </Link>
        {double && (
          <Link to={`/bean/${bean.id}/dial`} className="ui-btn ui-btn--secondary ui-btn--block">
            <DialIcon /> Dial in
          </Link>
        )}
      </div>
    </div>
  );
}
