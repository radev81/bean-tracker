// components/beans/BeanImportSheet.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "Import bean details" sheet on the new-bean form (CB-95 – CB-104).
//
// You paste the JSON that the bean-import Claude skill made from a shop's
// product page (or pick the .json file it gave you). We check it with
// parseBeanImport(); only when it's valid does "Fill the form" pass the
// clean bean to the form. Nothing is saved here.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { parseBeanImport } from "../../beanImport";
import { Button, Field, Sheet } from "../ui";

export default function BeanImportSheet({ onClose, onImport }) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  // Reading the clipboard needs HTTPS (or localhost) and permission; on some
  // phones it's blocked, so the button only appears when the browser has it.
  const canReadClipboard = typeof navigator !== "undefined" && !!navigator.clipboard?.readText;

  function changeText(value) {
    setText(value);
    setErrors([]);
  }

  async function pasteFromClipboard() {
    try {
      changeText(await navigator.clipboard.readText());
      setFileName("");
    } catch {
      setErrors(["Couldn't read the clipboard — long-press the box and choose Paste instead."]);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still triggers
    if (!file) return;
    if (file.size > 200_000) {
      setErrors(["That file is too big for a bean JSON (max 200 KB)."]);
      return;
    }
    try {
      changeText(await file.text());
      setFileName(file.name);
    } catch {
      setErrors(["Couldn't read that file."]);
    }
  }

  function handleUse() {
    const result = parseBeanImport(text);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onImport(result);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Import bean details"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUse} disabled={!text.trim()}>
            Fill the form
          </Button>
        </>
      }
    >
      <p className="bfm-import__intro">
        Paste the JSON from the bean-import skill. It fills the form — nothing is saved until
        you tap Save.
      </p>

      <Field
        label="Bean JSON"
        as="textarea"
        rows={8}
        className="bfm-import__box"
        placeholder={'{ "name": "…", "shop_name": "…", … }'}
        value={text}
        onChange={(e) => {
          changeText(e.target.value);
          setFileName("");
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        hint={fileName ? `From ${fileName}` : "Long-press and Paste, or use the buttons below"}
      />

      <div className="bfm-import__actions">
        {canReadClipboard && (
          <Button variant="secondary" onClick={pasteFromClipboard}>
            Paste
          </Button>
        )}
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          Choose .json file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json,text/plain"
          hidden
          onChange={handleFile}
        />
      </div>

      {errors.length > 0 && (
        <div className="bfm-import__errors" role="alert">
          <strong>Can't use this JSON</strong>
          <ul>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
