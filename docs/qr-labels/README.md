# QR stickers for containers

Round 40 mm stickers for **HERMA 10761** (natural-brown kraft, 24 per A4 sheet).
Scanning one opens the public container page:
`https://ra-homelab.synology.me:3200/beans/container/<number>`

Design: the Dial arc in the container colour, an amber knob, a coffee bean in the
centre and "SCAN TO SEE WHAT'S INSIDE" in the gap at the bottom. There's no
background colour: the brown label is the background.

## Files in `output/`

| File | What it is |
|---|---|
| `sheet-herma-10761.pdf` / `.svg` | A4 page to print on the label sheet (container 1 top-left, 2 next to it) |
| `alignment-test-plain-paper.pdf` | The same page with dashed label outlines. Print it on plain paper first |
| `container-1.svg` / `.pdf` / `.png` | One sticker, exactly 40 × 40 mm (PNG: 1890 px, 1200 dpi, see-through background) |
| `container-2.svg` / `.pdf` / `.png` | Same for container 2 |

`preview-on-kraft.png` shows roughly how the stickers look printed on brown paper.
The script makes the SVG files; the PDF and PNG versions were exported from those SVGs.

## Printing

1. Print `alignment-test-plain-paper.pdf` on **plain paper**.
2. Print settings: **Scale 100 %** / "Actual size". Turn off "Fit to page" and
   "Shrink to fit". Paper: A4 (not Letter). Borderless off.
3. Put the test print on top of a label sheet and hold both against a window.
   The stickers should sit inside the label circles. A shift of up to about 1 mm is fine.
4. Scan both codes on the test print with your phone camera.
5. Put the label sheet in the printer (check which side gets printed, usually
   face down in the tray for inkjets) and print `sheet-herma-10761.pdf`
   with the same settings. Quality: "Best"/"High"; paper type: "Matte" or "Plain".
6. Let inkjet ink dry for a few minutes before peeling off a label.

**Used sheet?** The sheet PDF only prints on labels 1 and 2. Next time, make
stickers starting at a free label with `--start-slot` (see below).

## Making a sticker for a new container

Needs Python and one package (once): `pip install reportlab`

```bash
# from the repo root, in the VS Code terminal
python docs/qr-labels/make_qr_labels.py 3:blue --start-slot 2
```

- `3:blue` = container number 3, blue ring (colour words as in `containerColor.js`,
  or a hex code such as `#6E9A62`). You can list several: `3:blue 4:red`.
- `--start-slot 2` = start at the 3rd label of the sheet (0 = top-left,
  counting left to right, row by row, up to 23).
- Open `output/sheet-herma-10761.svg` in Chrome or Edge, then Print at 100 %.
  You can also choose "Save as PDF" there.

## Technical notes

- QR version 6 (41 × 41 dots), error correction **H** (~30 % can be damaged;
  the bean covers ~7 %), 4-dot quiet zone, 0.48 mm per dot (code 19.7 mm wide).
- Sheet grid: 4 × 6 labels, left/right margin 16 mm, top/bottom 13.5 mm,
  46 mm from one label to the next (6 mm gaps).
- Text is converted to outlines (Inter SemiBold), so no font is needed.
- The grey ring prints darker on brown paper (inkjet ink is see-through), so
  it looks greyish-brown. The green stays clearly green.
