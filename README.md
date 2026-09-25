# EY Microsoft AI Business Applications

A static showcase of the EY Ireland BizApps practice in three views:

| View | File | What it is |
| --- | --- | --- |
| 01 Showcase | `index.html` | The practice, told over two photoreal 3D scenes: **the Circle** at golden hour behind the title, and **the Workbench**, a scroll-driven scene that moves from a brass difference engine (the machine age of service) to five glass cores, one per platform layer, cabled into one governed hub. |
| 02 The Circle | `city.html` | The client engagements as a monument on open downland. Each of the five great trilithons is one client's gateway, lit in its own colour; EY is the altar stone at the centre, joined to every gateway by a thread of light but never joining the gateways to each other. Select a gateway to open the engagement, run its journey, or export a brief. Golden hour, midday and dusk lighting. |
| 03 Index | `engagement-index.html` | The same engagements as a printed monograph. Plain HTML, no WebGL, works anywhere. |

## Running it

The pages are static and open straight from disk (`file://`) or from any web server:

```sh
npm run serve        # http://localhost:8080
```

## The 3D worlds

The worlds are written as ES modules in `src/` on [three.js](https://threejs.org) and bundled by esbuild
into one classic script, `assets/js/worlds.js`, so the pages keep working from `file://`.
The bundle is committed; rebuild it after changing anything in `src/`:

```sh
npm install
npm run build        # or: npm run watch
```

| Path | Role |
| --- | --- |
| `src/engine/core.js` | Renderer, filmic grade (ACES, bloom, vignette, grain), quality tiers, damped camera rig |
| `src/engine/land.js` | Physically modelled sky and sun, times of day, rolling downland, wind-blown meadow, tree lines |
| `src/engine/stone.js` | Procedural sarsen stones: displaced geometry and a triplanar weathered-stone material |
| `src/engine/textures.js` | Every surface map, drawn procedurally on canvas: stone, meadow, chalk, steel, paper, circuitry |
| `src/circle.js` | The Circle: the monument, the gateways, labels, picking and the journey layer (`window.EYCIRCLE`) |
| `src/workbench.js` | The Workbench: the engine, the glass cores, the cables and the hub (`window.EYBENCH`) |

Nothing is downloaded at runtime and no texture is licensed: stone, grass, brass, paper and glass are
all generated in the browser. Client and product marks come from `assets/ey-icons.js` as data URIs,
so WebGL can use them from `file://`.

**Quality.** The renderer picks a tier on load: `high` (full meadow, 4K shadows, bloom), `mid` for
phones and touch devices, `low` for software rendering. Force one with `?q=high|mid|low`.
Both worlds stop drawing when they are off screen or the tab is hidden, and respect
`prefers-reduced-motion`.

## Everything else

| Path | Role |
| --- | --- |
| `assets/ey-content.js` | The content model: clients, solutions, products, copy. The single source of truth |
| `assets/ey-gov.js` | Audience mode (`?mode=internal|sanitised|external`), the presentation gate on the Circle, local telemetry |
| `assets/ey-brief.js`, `assets/ey-diagram.js`, `assets/ey-print.css` | The printable leave-behind brief |
| `assets/css/site.css` | The shared design system: tokens, type, bar, buttons, drawer |
| `assets/css/home.css`, `circle.css`, `monograph.css` | One stylesheet per view |
| `assets/ui.js` | Shared page behaviour: bar, menu, full screen, reveal on scroll |
| `assets/ey-fs.js` | Full screen that survives moving between views |

The audience gate on the Circle is a presentation control, not security. Client identities and pricing are
removed by audience mode before anything renders; see the header of `assets/ey-gov.js`.
