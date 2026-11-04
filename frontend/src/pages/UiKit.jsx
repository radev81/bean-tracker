// pages/UiKit.jsx
// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY preview page for the Dial-design building blocks (step 2).
// Open http://localhost:5173/beans/kit while running `npm run dev`.
//
// Remove this file and its <Route path="/kit"> in App.jsx before merging
// the ux/dial-redesign branch into main.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  BottomNav,
  Button,
  Chip,
  Dial,
  Field,
  PageHeader,
  RingBadge,
  SectionLabel,
  Segmented,
  Sheet,
  containerColor,
} from "../components/ui";

const section = { display: "flex", flexDirection: "column", gap: 14, padding: "24px 16px 0" };
const row = { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" };

export default function UiKit() {
  const [yieldG, setYieldG] = useState(40);
  const [chips, setChips] = useState({ all: true, sca: false });
  const [sort, setSort] = useState("count");
  const [tags, setTags] = useState(["Vanilla", "Forest fruit", "Blueberry jam"]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("Gargari Gutiti");

  function toggleTheme() {
    const next =
      document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("bt-theme", next);
  }

  return (
    <div className="ui-has-nav" style={{ maxWidth: 560, margin: "0 auto" }}>
      <PageHeader
        eyebrow="Temporary · step 2"
        title="UI kit"
        actions={
          <Button icon variant="secondary" aria-label="Switch light/dark theme" onClick={toggleTheme}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </Button>
        }
      />

      {/* ── Dials ─────────────────────────────────────────────────────── */}
      <section style={section}>
        <SectionLabel>Dial · read-only with band (rest window 7–28 days)</SectionLabel>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Dial
            value={12}
            min={0}
            max={35}
            band={[7, 28]}
            knob
            label="Container 1"
            display="12"
            caption="Peak window"
            size={252}
            ariaLabel="Day 12 off roast, inside the 7 to 28 day rest window"
          >
            <span className="ui-dial__label">Container 1</span>
            <span className="ui-dial__value">12</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>days off roast</span>
            <span className="ui-dial__caption">Peak window</span>
          </Dial>
        </div>

        <SectionLabel>Dial · interactive (drag the ring or use arrow keys)</SectionLabel>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Dial
            value={yieldG}
            min={20}
            max={60}
            step={0.5}
            label="Yield"
            unit="g"
            display={yieldG.toFixed(1)}
            onChange={setYieldG}
            ariaLabel="Yield in grams"
            size={290}
          />
        </div>
        <div style={{ ...row, justifyContent: "center" }}>
          <Button icon aria-label="Decrease yield" onClick={() => setYieldG((v) => Math.max(20, v - 0.5))}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14" /></svg>
          </Button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Ratio 1:{(yieldG / 18).toFixed(1)} with 18 g in
          </span>
          <Button icon aria-label="Increase yield" onClick={() => setYieldG((v) => Math.min(60, v + 0.5))}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </Button>
        </div>

        <SectionLabel>Dial · small (SCA score 80–100)</SectionLabel>
        <div style={row}>
          <Dial value={88} min={80} max={100} ticks={20} majorEvery={5} size={132} label="SCA" display="88" />
          <Dial value={91.25} min={80} max={100} ticks={20} majorEvery={5} size={100} label="SCA" display="91.25" />
        </div>
      </section>

      {/* ── Ring badges ───────────────────────────────────────────────── */}
      <section style={section}>
        <SectionLabel>Ring badges · container colours from the name</SectionLabel>
        <div style={row}>
          <RingBadge ringColor={containerColor("Grey")}>1</RingBadge>
          <RingBadge ringColor={containerColor("Green")}>2</RingBadge>
          <RingBadge ringColor={containerColor("Azul")}>3</RingBadge>
          <RingBadge ringColor={containerColor("Shelf jar")}>4</RingBadge>
          <RingBadge muted>–</RingBadge>
          <RingBadge>A</RingBadge>
          <RingBadge progress={0.67}>12d</RingBadge>
          <RingBadge size={36} ringColor={containerColor("Grey")}>1</RingBadge>
        </div>
      </section>

      {/* ── Buttons ───────────────────────────────────────────────────── */}
      <section style={section}>
        <SectionLabel>Buttons</SectionLabel>
        <div style={row}>
          <Button variant="primary">Save changes</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="quiet">Read all</Button>
          <Button variant="danger">Remove bean</Button>
          <Button variant="secondary" disabled>Disabled</Button>
        </div>
        <Button variant="primary" block>
          Dial in this bean
        </Button>
      </section>

      {/* ── Chips and segmented ───────────────────────────────────────── */}
      <section style={section}>
        <SectionLabel>Chips · quick filters (tap) and tags (×)</SectionLabel>
        <div style={row}>
          <Chip selected={chips.all} onClick={() => setChips((c) => ({ ...c, all: !c.all }))}>All 34</Chip>
          <Chip selected={chips.sca} onClick={() => setChips((c) => ({ ...c, sca: !c.sca }))}>SCA 88+</Chip>
          <Chip>Bergamot</Chip>
        </div>
        <div style={row}>
          {tags.map((t) => (
            <Chip key={t} onRemove={() => setTags((ts) => ts.filter((x) => x !== t))}>{t}</Chip>
          ))}
        </div>
        <SectionLabel>Segmented</SectionLabel>
        <Segmented
          ariaLabel="Sort shops"
          value={sort}
          onChange={setSort}
          options={[
            { value: "count", label: "Most beans" },
            { value: "az", label: "A–Z" },
          ]}
        />
      </section>

      {/* ── Fields ────────────────────────────────────────────────────── */}
      <section style={section}>
        <SectionLabel accent>Required</SectionLabel>
        <div className="ui-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Bean name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Shop" hint="Pick one of your shops, or type a new one" defaultValue="Ineffable" />
          <Field label="Country of origin" error="Country is required" defaultValue="" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Field label="Region" defaultValue="Yirgacheffe" />
            <Field label="Altitude" defaultValue="1983 m" />
          </div>
          <Field label="Container" as="select" defaultValue="1">
            <option value="">None</option>
            <option value="1">1 · Grey</option>
            <option value="2">2 · Green</option>
          </Field>
          <Field label="Tasting notes" as="textarea" rows={3} placeholder="What does it taste like?" />
        </div>
      </section>

      {/* ── Sheet ─────────────────────────────────────────────────────── */}
      <section style={section}>
        <SectionLabel>Bottom sheet</SectionLabel>
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Open “Fill container” sheet
        </Button>
      </section>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Fill container 2 · Green"
        footer={
          <Button variant="primary" onClick={() => setSheetOpen(false)}>
            Done
          </Button>
        }
      >
        <Field label="Search beans" type="search" placeholder="Search beans not in a container" />
        {["Opita", "Maricela Joven", "Fulu Aha"].map((b) => (
          <Button key={b} variant="secondary" block onClick={() => setSheetOpen(false)}>
            {b}
          </Button>
        ))}
      </Sheet>

      <BottomNav />
    </div>
  );
}
