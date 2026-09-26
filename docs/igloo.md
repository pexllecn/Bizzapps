# BizApps City in the Igloo

Three pages turn the room into BizApps City: the audience stands on EY's platform at the centre of
the lagoon, with the skyline all the way round them on the walls and the city seen from above on the floor.

| Surface | Page | What it does |
| --- | --- | --- |
| Walls | `igloo.html` | One continuous 360° canvas. The skyline all round the room, the five landmark towers named over their tops, the brand four times round so everyone has it in front of them. Selecting a landmark turns the city until it is on the front wall and opens its panel and journey beside it. |
| Floor | `igloo-floor.html` | The city from directly above, EY's platform under the audience's feet. Follows the walls, including their turn, so the top of the floor is always the front wall. The name of what is on screen reads upright from all four sides. Takes no input. |
| Controller | `igloo-control.html` | For the facilitator's phone or laptop. Landmarks, journey steps, overview, the self-running tour, time of night, turning the room, the join card and reloading the walls. Behind the presentation gate. |

The walls own the room: they decide what is on screen and publish it; the controller only sends
commands and the floor only follows. There is never a second version of what the room is showing.

## Setting up the layers in Igloo Core Engine

1. **Walls.** Add a web layer spanning the whole wall canvas and point it at
   `https://<deployment>/igloo.html`. If the content should fill only part of the canvas height
   (a letterboxed band), use `band` and `offset`, e.g. `igloo.html?band=0.5&offset=0.25`.
2. **Floor.** Add a web layer on the floor output, pointed at `https://<deployment>/igloo-floor.html`.
   If the floor's top edge is not aligned with the front wall, turn it with `rot` (degrees).
3. **Controller.** Open `https://<deployment>/igloo-control.html` on the facilitator's device and pass the gate.
   The header shows **Shared room channel** / **This browser only** and **Walls live** / **Walls not open**.
4. Walk round the room once with the tour running and check the front: if the intro card and the chosen
   landmark are not centred on the front wall, set `front` on the walls (fraction of the canvas width).

Use hardware acceleration in the layer's browser. The walls say so on screen if WebGL is unavailable.

## Parameters

Walls (`igloo.html`):

| Param | Default | Meaning |
| --- | --- | --- |
| `band` | `1` | Fraction of the canvas height the content fills |
| `offset` | `0` | Fraction of the canvas height above the content |
| `front` | `0.5` | Where the front wall is, as a fraction of the canvas width |
| `horizon` | `0.4` | Height of the horizon in the band, from the bottom |
| `room` | `main` | Room code shared with the floor and the controller |
| `tour` | `1` | Run the city by itself until the controller takes over (`0` to start still) |
| `idle` | `180` | Seconds without a command before the tour resumes |
| `card` | `1` | Show the join card (controller and floor addresses) for the first 30 seconds |
| `q` | `high` | `high` / `mid` / `low` |
| `face` | by `q` (2048 / 1536 / 1024) | Cap on the cube-map face size |
| `fps` | `60` | Frame cap |
| `adaptive` | `1` | `0` fixes the resolution instead of trading it for frame rate |
| `mode` | `internal` | Audience mode: `internal`, `sanitised`, `external` |
| `pointer` | `0` | `1` shows the mouse cursor (hidden by default on the walls) |
| `debug` | `0` | `1` shows frame rate and cube-map size |

Floor (`igloo-floor.html`): `room`, `dim` (0.2–1, brightness), `rot` (degrees), `scale` (size of the circle), `q` (default `mid`).

Controller (`igloo-control.html`): `room`.

## How the walls are rendered, and why it is fast

The walls do not stretch a flat camera across 7,680 pixels. The city is rendered once per frame into a
cube map from the audience's eye, then unwrapped onto a cylinder at full canvas width, so every column
of the wall is a true bearing from the centre of the room and there is no seam and no distortion
at the edges of the projectors. Turning the room is a uniform, not a re-render of the scene.
The cube face is sized to the canvas (about a quarter of its width) and scaled down automatically
if the frame rate drops. Bloom runs at a third of the resolution and nothing uses `backdrop-filter`
over the canvas.

## Joining the room across networks

In one browser (e.g. testing on a laptop) the three pages talk over `BroadcastChannel` and need nothing.

In the room, the Igloo PC and the facilitator's device are usually on different networks, so they meet
through `/api/room` on the deployment. That endpoint needs a key store:

1. In the Vercel project, **Storage → Create → Upstash for Redis** (the Marketplace integration) and connect it to the project.
2. Vercel adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (older KV stores add `KV_REST_API_URL` / `KV_REST_API_TOKEN`; either works).
3. Redeploy. The controller should now say **Shared room channel**.

Without it the endpoint answers 503 and the controller says **This browser only** rather than pretending.
The store holds only the walls' last snapshot and the last 40 commands per room, all expiring four hours
after the last write. A wall that opens never replays commands sent before it opened. Use a different
`room` code on every page to run two rooms from one deployment.

## Troubleshooting

- **Black or flickering walls.** Try `?q=mid` or `?face=1024`, then `?msaa=0`. Add `?debug=1` to see the frame rate. If the GPU driver resets, the page reloads itself.
- **Chosen landmark not on the front wall.** Set `front`.
- **Floor turned against the walls.** Set `rot` on the floor.
- **Controller says "Walls not open".** The walls have not published in 30 seconds: check the wall layer is running and uses the same `room`.
- **Controller says "store not answering".** The key store is configured but failing; check it in the Vercel dashboard.

## What has and has not been checked

Checked in headless Chromium (software GL): the 360° wall at 3840×1080, the floor, controller → walls → floor
over `BroadcastChannel`, and controller → walls across separate browsers through `/api/room` against an
in-memory stand-in for the key store. Not yet checked: the real Igloo projectors, blending and frame rate
on the room's GPU, and a live Upstash store.
