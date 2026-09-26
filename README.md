# EY Microsoft AI Business Applications

A static showcase of the EY Ireland BizApps practice in three views:

| View | File | What it is |
| --- | --- | --- |
| 01 Showcase | `index.html` | The practice, told over two photoreal 3D scenes: **BizApps City** at night behind the title, and **the Workbench**, a scroll-driven scene that moves from a brass difference engine (the machine age of service) to five glass cores, one per platform layer, cabled into one governed hub. |
| 02 BizApps City | `city.html` | The client engagements as a digital city at night: a skyline on an island in a mirror-still sea under the stars. Each of the five landmark towers is one client, with its own form and light; EY is the tower at the centre, joined to every landmark by a line of light but never joining the landmarks to each other. A network of light is laid on the water and traffic moves between the towers. Select a landmark to open the engagement, run its journey, or export a brief. Night, blue hour and dawn lighting. |
| 03 Index | `engagement-index.html` | The same engagements as a printed monograph. Plain HTML, no WebGL, works anywhere. |

## In the Igloo room

`igloo.html` (the 360° walls), `igloo-floor.html` (the floor) and `igloo-control.html` (the facilitator's
controller) run BizApps City in the Igloo, with the audience standing on EY's platform at the centre.
Set-up, parameters, the shared room channel (`api/room.js`, which needs an Upstash store on the Vercel
project to work across networks) and troubleshooting are in [docs/igloo.md](docs/igloo.md).

## Running it

The pages are static and open straight from disk (`file://`) or from any web server:

```sh
npm run serve        # http://localhost:8080
```

## The 3D worlds

The worlds are written as ES modules in `src/` on [three.js](https://threejs.org) and bundled by esbuild
into one classic script, `assets/js/worlds.js`, so the pages keep working from `file://`.
The bundle is committed; rebuild it after changing anything in `src/`. (The script is deliberately not called `build`: the site deploys as static files, and a `build` script would make the host try to build it.)

```sh
npm install
npm run bundle       # or: npm run bundle:watch
```

| Path | Role |
| --- | --- |
| `src/engine/core.js` | Renderer, filmic grade (ACES, bloom, vignette, grain), quality tiers, damped camera rig |
| `src/engine/night.js` | The night sky, stars, times of night and the water shader |
| `src/engine/textures.js` | Surface maps drawn procedurally on canvas: steel, paper, circuitry |
| `src/city.js` | BizApps City: the skyline, the landmark towers, the reflection, the network, picking and the journey layer (`window.EYCITY`). Windows are computed in the shader from world position, so no textures are needed |
| `src/workbench.js` | The Workbench: the engine, the glass cores, the cables and the hub (`window.EYBENCH`) |

Nothing is downloaded at runtime and no texture is licensed: the skyline, the sky, brass, paper and glass are
all generated in the browser. Client and product marks come from `assets/ey-icons.js` as data URIs,
so WebGL can use them from `file://`.

**Quality.** The renderer picks a tier on load: `high` (full detail and bloom), `mid` for
phones and touch devices, `low` for software rendering. Force one with `?q=high|mid|low`.
Both worlds stop drawing when they are off screen or the tab is hidden, and respect
`prefers-reduced-motion`.

## Everything else

| Path | Role |
| --- | --- |
| `assets/ey-content.js` | The content model: clients, solutions, products, copy. The single source of truth |
| `assets/ey-gov.js` | Audience mode (`?mode=internal|sanitised|external`), the presentation gate on BizApps City, local telemetry |
| `assets/ey-brief.js`, `assets/ey-diagram.js`, `assets/ey-print.css` | The printable leave-behind brief |
| `assets/css/site.css` | The shared design system: tokens, type, bar, buttons, drawer |
| `assets/css/home.css`, `city.css`, `monograph.css` | One stylesheet per view |
| `assets/ui.js` | Shared page behaviour: bar, menu, full screen, reveal on scroll |
| `assets/ey-fs.js` | Full screen that survives moving between views |

The audience gate on BizApps City is a presentation control, not security. Client identities and pricing are
removed by audience mode before anything renders; see the header of `assets/ey-gov.js`.
