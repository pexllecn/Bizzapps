# Power Platform Landscape · Interactive Portfolio (Proof of Concept)

An interactive, **isometric** landscape where every building is a business
solution we shipped on the **Microsoft Power Platform**. A Dataverse core sits
at the centre, the platform services (Power Apps, Power Automate, Power BI,
Power Pages, Copilot Studio, Dynamics 365, SharePoint, Teams, Azure) surround
it with their product marks, and animated data flows link each solution to the
services it's built on. Click any building to see its story and impact.

Light, colourful, Microsoft-branded — a leadership- and client-facing proof of
concept, built as **pure SVG + JavaScript with no third-party libraries**.

![The Power Platform landscape](docs/preview-city.png)

---

## What's in the experience

| | |
|---|---|
| **Isometric landscape** | A light Power Platform "island" with a Dataverse core and the services arrayed around it. |
| **Microsoft product marks** | Simplified, brand-coloured marks for Dataverse, Power Apps, Power Automate, Power BI, Power Pages, Copilot Studio, Dynamics 365, SharePoint, Teams and Azure. |
| **Solutions as buildings** | Each business solution is a tower; height reflects its scale, colour its platform layer. |
| **Animated data flows** | Pulses travel along arcs from Dataverse and services into the solutions they power. |
| **Click to explore** | A light detail panel with the story, feature chips, impact metrics that count up, and the Microsoft services it's *Built with* (click a service to jump to it). |
| **Layer filter** | Spotlight one layer — Data, Apps, Automation, Insights or Experiences. |
| **Explore freely** | Drag to pan, scroll to zoom, staggered build-in animation, reset view. |
| **Robust** | Reduced-motion aware, responsive, keyboard `Esc` to close. |

---

## Editing the content — the only file you touch

All content lives in **[`src/ms-data.js`](src/ms-data.js)** (`window.SHOWCASE`):

- **`services`** — the Microsoft building blocks (name, `logo`, `layer`, grid `pos`).
- **`apps`** — your business solutions. Each becomes a building:

```js
{
  id:"field", name:"Field Service Companion", client:"Utilities provider",
  layer:"apps",                 // Data | Apps | Automation | Insights | Experiences
  pos:[-4.6,-2.2], h:2.1,       // grid position + building height
  uses:["powerapps","dataverse","powerautomate"],   // draws the data flows + panel chips
  summary:"…one or two sentences…",
  features:["Offline mobile app","Guided inspections"],
  metrics:[{label:"Admin time",value:-64,suffix:"%"}, …],   // count up in the panel
}
```

Swap the placeholder solutions for your real Power Platform projects and the
whole landscape rebuilds itself.

> The product marks are simplified, brand-coloured interpretations of Microsoft
> logos, used to identify the technology stack — not official Microsoft artwork.

---

## Content governance — internal vs client-facing

`src/ms-data.js` is authored for an **internal** audience: staff names, real
tenant strings, and unverified commercial figures live there. `src/content-visibility.js`
derives a safe client-facing view at runtime — it never trusts anyone to
remember to delete things by hand before a client meeting.

- **Mode**: append `?mode=client` to the URL (or set `window.CITY_MODE = "client"`
  before the scripts load) to preview what a client audience sees. Default is
  `internal`.
- **`visibility`** on a client or solution: `'internal'` never appears in
  client mode; `'anonymised'` shows a category label (e.g. "Regional
  local-government organisation") instead of a name; `'client-approved'` shows
  the real name.
- **`approvalStatus`**: `'not-approved'` is a hard veto in client mode
  regardless of `visibility`. No client in this dataset has a recorded
  approval yet — `approvalOwner`/`approvalReference` are `"VERIFY"`
  placeholders throughout. Tighten the gate in `content-visibility.js`
  (`visibleTo`) to require `approvalStatus === 'approved'` once real sign-off
  exists.
- **Unverified figures**: a solution's `value` line with `verified: false`
  (or an `outcomeMetrics` entry without `verified: true`) is swapped for an
  approved non-numeric statement in client mode, never silently hidden
  mid-sentence.
- **Logos**: a client only gets its real logo in client mode if
  `clientFacingApproved: true`. Otherwise (or if the asset file is simply
  missing) it gets a neutral architectural monogram plate — never a redrawn
  approximation of the real mark.

---

## Run it

`index.html` is fully self-contained (no libraries) — **open it by
double-clicking**, offline. Or serve the folder:

```bash
python3 -m http.server 8080   # http://localhost:8080
```

## Build

`index.html` and `artifact.html` are generated from `src/`:

```bash
./build.sh
```

- `index.html` — standalone document (present it / host it anywhere).
- `artifact.html` — body-only build used to publish the Claude Artifact.

## Project layout

```
src/
  ms-data.js    ← YOUR CONTENT (services, solutions, metrics)
  ms-iso.js     ← isometric engine: geometry, product marks, flows, interaction
  ms-styles.css ← light Microsoft-themed interface
  ms-body.html  ← DOM shell (SVG stage, panel, intro, chrome)
build.sh        ← assembles the two HTML outputs
index.html      ← built · standalone
artifact.html   ← built · for Artifact publishing
```

## Driving the demo

A small API is exposed on `window.Landscape`:

```js
Landscape.enter();            // start / reveal the scene
Landscape.select("field");    // open a solution (or service) by id
Landscape.reset();            // back to the overview
```
