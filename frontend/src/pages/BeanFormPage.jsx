// pages/BeanFormPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen page around BeanForm, so adding and editing a bean get their
// own addresses:
//   /beans/new            → add a bean   (the + button in the bottom bar)
//   /beans/bean/12/edit   → edit bean 12
//
// After saving, or "View existing" in the duplicate dialog, we open that
// bean's page. The form's own history entry is replaced, so the phone's
// back button doesn't return to a form that was already saved.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../api";
import BeanForm from "../components/beans/BeanForm";

export default function BeanFormPage() {
  const { id } = useParams(); // undefined on /new
  const api = useApi();
  const navigate = useNavigate();

  const [bean, setBean] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);

  // BeanForm calls onViewExisting(id) and then onClose() straight after.
  // This flag stops onClose from overriding the "open that bean" navigation.
  const leavingRef = useRef(false);

  // Editing: load the full bean (with tags and recipes) first
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .getBeanById(id)
      .then((data) => !cancelled && setBean(data))
      .catch(() => !cancelled && setError("Could not load this bean."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  function openBean(beanId) {
    leavingRef.current = true;
    navigate(beanId ? `/bean/${beanId}` : "/", { replace: true });
  }

  if (loading) return <div className="app-page-message">Loading bean…</div>;
  if (error) return <div className="app-page-message">{error}</div>;

  return (
    <div className="app-fullscreen">
      <BeanForm
        // key: a fresh form when switching between beans
        key={id ?? "new"}
        bean={bean}
        onSaved={(saved) => openBean(saved?.id)}
        onViewExisting={(existingId) => openBean(existingId)}
        onClose={() => {
          if (leavingRef.current) return;
          // Back to where the user came from; fall back to the list
          if (window.history.state?.idx > 0) navigate(-1);
          else navigate("/");
        }}
      />
    </div>
  );
}
