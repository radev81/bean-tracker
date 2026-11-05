// pages/BeanDetail.jsx
// ─────────────────────────────────────────────────────────────────────────────
// One bean, full screen: /beans/bean/:id
// Replaces the old "expand the card" view (CB-42 – CB-52).
//
//  • Header: back · favourite ★ · edit
//  • SCA dial (80–100) + country, name, process and variety
//  • Shop (with product page link) and container
//  • Flavour tags, origin details, tasting notes
//  • Espresso recipe with Double / Single switch (single = halved dose and
//    yield; time can't be halved reliably so it shows "?"), plus
//    "Dial in this bean" → /bean/:id/dial
//  • Delete bean (CB-67 – CB-71)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../api";
import { computeRatio, externalUrl, fmt, getDoubleRecipe, hostname, metaLine } from "../beanUtils";
import Dialog from "../components/common/Dialog";
import { Button, Chip, Dial, RingBadge, Segmented, SectionLabel, containerColor } from "../components/ui";
import { BackIcon, DialIcon, EditIcon, ExternalIcon, StarIcon } from "../components/ui/icons";
import "./BeanDetail.css";

// ── Recipe card ───────────────────────────────────────────────────────────────
function RecipeCard({ bean }) {
  const [size, setSize] = useState("double");
  const double = getDoubleRecipe(bean);
  const singleOnly = !double && bean.recipes?.find((r) => r.shot_type === "single");
  const recipe = double || singleOnly;

  if (!recipe) {
    return (
      <section className="bd-card bd-recipe" aria-labelledby="bd-recipe-title">
        <SectionLabel as="h2">
          <span id="bd-recipe-title">Espresso recipe</span>
        </SectionLabel>
        <p className="bd-muted">No recipe yet.</p>
        <Link to={`/bean/${bean.id}/dial`} className="ui-btn ui-btn--primary ui-btn--block">
          <DialIcon /> Set up a recipe
        </Link>
      </section>
    );
  }

  const half = size === "single" && Boolean(double);
  const inG = half && recipe.dose_in_g != null ? fmt(recipe.dose_in_g / 2) : fmt(recipe.dose_in_g);
  const outG = half && recipe.yield_out_g != null ? fmt(recipe.yield_out_g / 2) : fmt(recipe.yield_out_g);
  const time = half ? "?" : recipe.time_seconds;
  const ratio = computeRatio(recipe.dose_in_g, recipe.yield_out_g);

  const values = [
    { label: "g in", value: inG },
    { label: "g out", value: outG },
    { label: "sec", value: time },
    { label: "°C", value: fmt(recipe.temp_celsius) },
  ];

  return (
    <section className="bd-card bd-recipe" aria-labelledby="bd-recipe-title">
      <div className="bd-recipe__head">
        <SectionLabel as="h2">
          <span id="bd-recipe-title">
            {double ? "Espresso recipe" : "Single espresso"}
            {ratio && <span className="bd-recipe__ratio"> · {ratio}</span>}
          </span>
        </SectionLabel>
        {double && (
          <Segmented
            size="sm"
            ariaLabel="Shot size"
            value={size}
            onChange={setSize}
            options={[
              { value: "single", label: "Single" },
              { value: "double", label: "Double" },
            ]}
          />
        )}
      </div>

      <dl className="bd-recipe__values">
        {values.map((v) => (
          <div key={v.label} className="bd-recipe__value">
            {/* dt must come first in HTML; CSS shows the number on top */}
            <dt>{v.label}</dt>
            <dd>{v.value ?? "–"}</dd>
          </div>
        ))}
      </dl>
      {half && <p className="bd-muted bd-small">Single = half the double. Time varies, so it isn't halved.</p>}
      {recipe.notes && <p className="bd-recipe__notes">{recipe.notes}</p>}

      {double ? (
        <Link to={`/bean/${bean.id}/dial`} className="ui-btn ui-btn--primary ui-btn--block">
          <DialIcon /> Dial in this bean
        </Link>
      ) : (
        <Link to={`/bean/${bean.id}/edit`} className="ui-btn ui-btn--secondary ui-btn--block">
          Edit recipe
        </Link>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BeanDetail() {
  const { id } = useParams();
  const api = useApi();
  const navigate = useNavigate();

  const [bean, setBean] = useState(null);
  const [error, setError] = useState(null);
  const [favBusy, setFavBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getBeanById(id)
      .then((data) => !cancelled && setBean(data))
      .catch((err) =>
        !cancelled &&
        setError(err.status === 404 ? "This bean doesn't exist any more." : "Could not load this bean."),
      );
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  }

  async function toggleFavourite() {
    if (favBusy) return;
    setFavBusy(true);
    try {
      const res = await api.toggleFavourite(bean.id);
      setBean((b) => ({ ...b, is_favourite: res.is_favourite }));
    } catch (err) {
      console.error("Could not toggle favourite:", err.message);
    } finally {
      setFavBusy(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteBean(bean.id);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Could not delete bean:", err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const backButton = (
    <Button icon variant="secondary" aria-label="Back" onClick={goBack}>
      <BackIcon />
    </Button>
  );

  if (error || !bean) {
    return (
      <div className="app-fullscreen bd">
        <header className="bd-bar">{backButton}</header>
        <p className="app-page-message">{error || "Loading bean…"}</p>
      </div>
    );
  }

  const fav = bean.is_favourite === 1;
  const productUrl = bean.url || bean.shop_url;
  const origin = [
    { label: "Region", value: bean.region },
    { label: "Altitude", value: bean.altitude },
    { label: "Variety", value: bean.variety },
    { label: "Process", value: bean.processing },
    { label: "Farm / producer", value: bean.farm_producer },
  ];
  const longNotes = (bean.notes?.length ?? 0) > 180;

  return (
    <div className="app-fullscreen bd">
      {/* ── Top bar ── */}
      <header className="bd-bar">
        {backButton}
        <div className="bd-bar__actions">
          <Button
            icon
            variant="secondary"
            aria-label="Favourite"
            aria-pressed={fav}
            className={fav ? "bd-fav--on" : ""}
            onClick={toggleFavourite}
            disabled={favBusy}
          >
            <StarIcon filled={fav} />
          </Button>
          <Link to={`/bean/${bean.id}/edit`} className="ui-btn ui-btn--icon ui-btn--secondary" aria-label="Edit bean">
            <EditIcon />
          </Link>
        </div>
      </header>

      {/* ── Title + SCA dial ── */}
      <section className="bd-hero">
        {bean.sca_score != null && (
          <Dial
            value={bean.sca_score}
            min={80}
            max={100}
            ticks={20}
            majorEvery={5}
            size={128}
            label="SCA"
            display={String(bean.sca_score)}
            ariaLabel={`SCA cup score ${bean.sca_score} out of 100`}
          />
        )}
        <div className="bd-hero__text">
          <span className="ui-eyebrow ui-eyebrow--accent">{bean.country}</span>
          <h1 className="bd-hero__name">{bean.name}</h1>
          <span className="bd-muted">{metaLine(bean.processing, bean.variety)}</span>
        </div>
      </section>

      {/* ── Shop + container ── */}
      <section className="bd-pair" aria-label="Shop and container">
        <div className="bd-tile">
          <span className="ui-eyebrow">Shop</span>
          <span className="bd-tile__value">{bean.shop_name}</span>
          {productUrl && (
            <a
              className="bd-tile__link"
              href={externalUrl(productUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalIcon size={13} />
              <span>{bean.url ? "Product page" : hostname(productUrl)}</span>
            </a>
          )}
        </div>
        <Link to="/containers" className="bd-tile bd-tile--row">
          {bean.container_id ? (
            <>
              <RingBadge size={36} ringColor={containerColor(bean.container_name)}>
                {bean.container_id}
              </RingBadge>
              <span className="bd-tile__stack">
                <span className="ui-eyebrow">Container</span>
                <span className="bd-tile__value">{bean.container_name}</span>
              </span>
            </>
          ) : (
            <span className="bd-tile__stack">
              <span className="ui-eyebrow">Container</span>
              <span className="bd-tile__value bd-muted">None</span>
            </span>
          )}
        </Link>
      </section>

      {/* ── Flavour tags ── */}
      {bean.tags?.length > 0 && (
        <section className="bd-tags" aria-label="Flavour tags">
          {bean.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </section>
      )}

      {/* ── Origin ── */}
      <section className="bd-origin" aria-label="Origin">
        <dl className="bd-origin__grid">
          {origin.map((o) => (
            <div key={o.label} className="bd-origin__item">
              <dt className="ui-eyebrow">{o.label}</dt>
              <dd>
                {o.value ? (
                  o.value
                ) : (
                  <Link to={`/bean/${bean.id}/edit`} className="bd-add">
                    + Add
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Tasting notes ── */}
      {bean.notes && (
        <section className="bd-notes" aria-labelledby="bd-notes-title">
          <SectionLabel as="h2">
            <span id="bd-notes-title">Tasting notes</span>
          </SectionLabel>
          <p className={`bd-notes__text${longNotes && !notesOpen ? " bd-notes__text--clamped" : ""}`}>
            {bean.notes}
          </p>
          {longNotes && (
            <Button variant="quiet" className="bd-notes__more" onClick={() => setNotesOpen((o) => !o)}>
              {notesOpen ? "Show less" : "Read all"}
            </Button>
          )}
        </section>
      )}

      {/* ── Recipe ── */}
      <RecipeCard bean={bean} />

      {/* ── Delete ── */}
      <div className="bd-delete">
        <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
          Delete bean
        </Button>
      </div>

      {confirmDelete && (
        <Dialog
          title={`Delete ${bean.name}?`}
          body={
            bean.container_name
              ? `This permanently removes the bean and frees ${bean.container_name}. This cannot be undone.`
              : "This permanently removes the bean. This cannot be undone."
          }
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => setConfirmDelete(false) },
            { label: deleting ? "Deleting…" : "Delete", variant: "danger", onClick: handleDelete },
          ]}
        />
      )}
    </div>
  );
}
