# EY BizApps - three views, one product

```
index.html              View 01  Showcase        interactive
city.html               View 02  BizApps City    interactive 3D
engagement-index.html   View 03  Engagement Index  document

assets/
  ey-core.css       tokens, typeface, shared primitives, view switcher
  ey-show.css       showcase chrome
  ey-city.css       city chrome
  ey-doc.css        engagement index chrome
  ey-content.js     the content model          (edit this to change copy)
  ey-icons.js       32 brand marks             (unchanged, now shared)
  ey-gl.js          WebGL renderer             (new)
  ey-city.js        city geometry              (new)
  ey-stack.js       platform stack renderer    (showcase)
  ey-fs.js          full screen across pages
  fonts/            drop EY Interstate .woff2 here
```

Open any page directly from the file system. Everything is classic scripts, no
modules, no build step, no network call at runtime.

---

## The city was rebuilt

The previous city was a 2D canvas faking isometric depth with a painter's
sort. Every structural problem followed from that: the depth key had to be
hand-patched for orbit angles, clicking used a proximity circle rather than a
hit test, and the scene could only be sold with constant motion.

It is now real 3D.

| | before | after |
|---|---|---|
| Renderer | canvas 2D, painter's sort | WebGL, hardware depth buffer |
| Draw calls | one per element, sorted every frame | one, for the whole city |
| Occlusion | sort key, wrong past 90° orbit | correct at every angle |
| Picking | nearest centre within a radius | colour-ID buffer, pixel exact |
| Shadows | none | 2048² shadow map, 4-tap PCF |
| Lighting | hand-tinted faces | linear-space hemisphere + key light |
| Camera | ad-hoc | damped spherical orbit, zoom to cursor |
| Idle cost | full rate, always, even hidden | renders only while something moves |
| Geometry | ~1,200 lines of 2D elevations | 8,430 triangles |

**What was removed.** Walking pedestrians with swinging strides and contact
shadows. Traffic with headlight wash. A 170-star baked starfield. Sodium haze.
Pulsing beacon masts. Shock rings. The reference is an architect's massing
model: matte materials, one light, and the only thing that moves is the camera.

### EY HQ at the centre

The HQ campus from the supplied reference is built at the origin, which is what
the content model already described: *"EY sits at the centre of the city. Each
landmark around it is a separate client in its own isolated Microsoft tenant."*

Modelled to the reference: the trimmed plaza deck, the long north-east slab and
the L-shaped south-west block, curtain wall on a warm mullion grid over solid
cores, ground-floor colonnades, planted roof panels, rooftop plant, the glazed
atrium, trees and lamp standards with their pools on the deck.

The EY mark is **not redrawn**. It is placed as a textured decal using the
original brand asset from `ey-icons.js`, on the roof panel and in the
yellow-framed sign on the long facade. Two renderer capabilities were added for
this: a per-vertex emissive channel (lamp heads, lit signage) and a depth-tested
textured decal pass.

Click the HQ, or the EY chip that now leads the roster, for the firm panel.

### The journey is interactive

Each step now has a presence in the scene rather than just a caption. The
capabilities for the engagement are anchored in world space on a helix beside
the building, carrying their real product marks, wired in sequence, with the
flow visibly travelling along the wire into the active node. Nodes carry
Complete / Running / Ahead state, and clicking one jumps to that step. The
narration panel names the Microsoft products doing the work at each step.

The helix radius, angular spread and camera distance were solved by projecting
the anchors for all five engagements and measuring: this is the tightest
arrangement where no card is clipped and the closest pair still clears a card
width.

**What replaced it.** Five landmarks with genuinely distinct silhouettes, each
a clear step lighter and larger than the surrounding fabric so they read as the
subject. Facades are built as floor plates and spandrel bands, so the massing
survives being zoomed into. The client's colour appears once per landmark, as a
slim crown band. Selecting a building does not paint it: it holds the light
while the rest of the model steps back.

---

## Fixed from the review

**Structure.** The showcase carried the entire city stylesheet with no city
markup, and the city carried the entire showcase stylesheet with no showcase
markup - 97 duplicated selectors each. That is why `.c-view` was defined twice
and the view dock rendered with properties from two different designs. One
design system now, in `ey-core.css`.

**Duplication.** The engagement index existed twice, byte for byte: as a file
and as base64 inside the showcase. The 32 brand marks existed three times. Both
now exist once. **4.64 MB → 1.17 MB.**

**Navigation.** All three views carry the same switcher, so no view is a dead
end - the city previously had no route to the engagement index at all. The
showcase nav no longer disappears below 1120px; there is a real menu.

**Typography.** The showcase and city loaded Archivo from Google Fonts while
the engagement index loaded EY Interstate, so the same product rendered in two
typefaces one click apart. All three now resolve EY Interstate, local first.
Only the three weights that exist are declared.

**Interaction.** Keyboard shortcuts are guarded on Cmd/Ctrl/Alt, so Cmd+F, Cmd+A
and Cmd+R work normally again. The camera dock stays mounted while the dossier
is open and is present on touch. Camera framing offsets by the real panel
width, measured, rather than a guessed 240px against a 480px panel.

**Accessibility.** Journey narration announces through an `aria-live` region.
Visible focus on every control. `prefers-reduced-motion` respected throughout.

---

## Two things for you to confirm

1. **A data conflict, inherited.** The showcase listed Harry Corbally, Donal
   Cahill and Gerry Reid as **Director**; the city listed all three as **Senior
   Manager**. This is the duplication drift the old structure made inevitable.
   The showcase values were kept. Confirm which is correct - it is now in one
   place, `ey-content.js`.

2. **Client names and commercials.** `ey-content.js` carries named
   engagements, a named delivery lead, and 16 indicative price points from
   €15k/month to €320k, in plain text in a file anyone can forward. The
   `indicative` flag and the "Illustrative composite" tag show the risk was
   considered. Worth a decision before this goes outside EY.
