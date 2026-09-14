/* ============================================================================
 *  EY BizApps - ey-city.js
 *  Scene construction for the BizApps City masterplan.
 *  ---------------------------------------------------------------------------
 *  The reference is an architect's massing model, not a game map. That drives
 *  every decision here:
 *
 *    - Matte materials only. No emissive windows, no neon, no glow. Depth is
 *      carried by geometry, the key light and the shadow map.
 *    - No inhabitants. The v1 scene had walking pedestrians, traffic with
 *      headlight wash, a starfield and pulsing crown beacons. All removed.
 *      A presentation model is still; the only thing that moves is the camera.
 *    - The five client landmarks are the subject. The surrounding fabric is
 *      deliberately low contrast so the eye goes to the landmarks first.
 *    - Facades are built as floor plates and spandrel bands rather than as
 *      plain extrusions, so the massing survives being zoomed into.
 *
 *  Everything is generated deterministically, so the city is identical on
 *  every load and in every screenshot.
 * ========================================================================== */
(function (root) {
  "use strict";

  var HQ_ID = 90;          // picking id for the EY HQ, clear of the client ids
  var PITCH = 7.4;      // parcel + street, matches the v1 content model spacing
  var ROAD  = 2.05;
  var PARCEL = PITCH - ROAD;
  var EXT   = 11;       // parcels from centre, each way
  var LIMIT = EXT * PITCH;

  /* ---------------------------------------------------------- materials */
  /* Colours are authored as sRGB hex, because that is how a brand palette is
     specified, and converted to LINEAR here. The shader lights in linear and
     encodes back to sRGB at the end. Skipping this step is what made the
     first pass read as pale plastic rather than stone. */
  function srgb(c) { return Math.pow(c, 2.2); }
  function hex(h) {
    h = h.replace("#", "");
    return [srgb(parseInt(h.slice(0,2),16)/255),
            srgb(parseInt(h.slice(2,4),16)/255),
            srgb(parseInt(h.slice(4,6),16)/255)];
  }
  function mix(a, b, t) { return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
  function scale(a, k) { return [a[0]*k, a[1]*k, a[2]*k]; }

  var M = {
    asphalt:  hex("#131722"),
    kerb:     hex("#222738"),
    pavement: hex("#1A1E2A"),
    plinth:   hex("#202534"),
    /* The fabric sits close to EY charcoal and deliberately low in value. It
       is context: it should describe a city without ever competing with the
       five landmarks for attention. */
    fabricA:  hex("#3A3B47"),   // EY charcoal, near the centre
    fabricB:  hex("#282A35"),   // further out, sinking into the haze
    fabricCap:hex("#454652"),
    /* Landmarks are a full step lighter, which is the entire reason they read
       as the subject of the model. */
    /* ---- EY HQ palette, read off the reference renders ---- */
    hqPlaza:  hex("#B0B2BC"),
    hqCourt:  hex("#BEC0C9"),
    hqDeck:   hex("#B6B8C1"),   // plaza deck
    hqTrim:   hex("#8A7F2E"),   // olive-yellow plaza edge
    hqRoof:   hex("#6E6F7B"),   // flat roof field
    hqParap:  hex("#ADAFBA"),   // parapet / roof edge
    hqSpan:   hex("#9DA0AB"),   // spandrel between floors
    hqGlass:  hex("#39435C"),   // curtain wall glazing
    hqMull:   hex("#9C8F62"),   // warm mullion grid
    hqCol:    hex("#8A8C96"),
    hqCore:   hex("#4A4C58"),   // ground-floor columns
    /* Landscape is desaturated to near-monochrome on purpose. Saturated
       greens on a grey massing model read as a cartoon park, and they pull
       the eye off the architecture and the signage, which are the subject.
       An architectural model shows planting as tone, not as colour. */
    hqGreen:  hex("#39402F"),   // planted roof panel
    hqTree:   hex("#5A6154"),   // canopy
    hqTreeLt: hex("#6C7267"),   // canopy, lit side
    hqTrunk:  hex("#4E4F4A"),
    hqLamp:   hex("#F2E6CC"),
    hqSign:   hex("#14161F"),   // sign panel behind the mark
    signFace: hex("#15171F"),   // client sign panel
    signBed:  hex("#23252E"),   // roof sign surround
    beam:     hex("#FFE9B8"),   // lamp head, reads as the source
    /* The wash is a DARK warm material carried almost entirely by its
       emissive term. Given a pale colour it gets lit like any other surface
       and the beams blow out into a cartoon starburst. */
    beamGlow: hex("#59503F"),
    stone:    hex("#9AA0B2"),
    stoneLt:  hex("#B4BAC9"),
    glass:    hex("#66708A"),
    metal:    hex("#7A8194")
  };

  /* deterministic hash noise - no Math.random, so the model never shifts */
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* ======================================================= FACADE HELPERS */

  /* A stacked facade: each floor is a stone plate with a recessed glazing
     band under it. This is the single detail that makes a mass read as a
     building instead of a block, and it costs two boxes per floor. */
  function stack(b, cx, cy, z, w, d, floors, fh, stoneCol, glassCol, id) {
    for (var f = 0; f < floors; f++) {
      var zf = z + f * fh;
      b.box(cx, cy, zf, w - 0.13, d - 0.13, fh * 0.70, glassCol, id, 0.55);
      b.box(cx, cy, zf + fh * 0.70, w, d, fh * 0.30, stoneCol, id, 0.78);
    }
    return z + floors * fh;
  }

  /* Vertical fins across one facade. Reads as a brise-soleil at distance and
     as structure close up. */
  function fins(b, axis, cx, cy, z, span, off, h, n, col, id) {
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n - 0.5;
      if (axis === "x") b.box(cx + t * span, cy + off, z, 0.16, 0.14, h, col, id, 0.8);
      else              b.box(cx + off, cy + t * span, z, 0.14, 0.16, h, col, id, 0.8);
    }
  }

  /* A colonnade along one side */
  function colonnade(b, axis, cx, cy, z, span, off, h, n, col, id) {
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n - 0.5;
      var px = axis === "x" ? cx + t * span : cx + off;
      var py = axis === "x" ? cy + off : cy + t * span;
      b.prism(px, py, z, 0.24, 0.22, h, 8, 0, col, id, 0.6);
    }
  }

  /* Roof plant: the mechanical clutter that stops a flat roof looking unfinished */
  function plant(b, cx, cy, z, w, d, col, id, seed) {
    b.box(cx - w * 0.18, cy + d * 0.14, z, w * 0.30, d * 0.26, 0.9 + rnd(seed) * 0.6, col, id, 0.9);
    b.box(cx + w * 0.22, cy - d * 0.10, z, w * 0.22, d * 0.34, 0.6 + rnd(seed + 7) * 0.5, col, id, 0.9);
    b.box(cx, cy, z, w * 0.16, d * 0.16, 0.45, col, id, 0.9);
  }

  /* A parapet lip around a roof edge - a thin frame, four boxes */
  function parapet(b, cx, cy, z, w, d, col, id) {
    var t = 0.18, h = 0.34;
    b.box(cx, cy - d/2 + t/2, z, w, t, h, col, id, 0.95);
    b.box(cx, cy + d/2 - t/2, z, w, t, h, col, id, 0.95);
    b.box(cx - w/2 + t/2, cy, z, t, d - t*2, h, col, id, 0.95);
    b.box(cx + w/2 - t/2, cy, z, t, d - t*2, h, col, id, 0.95);
  }

  /* The client's colour appears once per landmark, as a slim crown band.
     One accent, at the top, is the whole brand gesture. */
  function crown(b, cx, cy, z, w, d, tone, id) {
    b.box(cx, cy, z, w + 0.16, d + 0.16, 0.52, tone, id, 1);
  }


  /* ==================================================== CLIENT SIGNAGE ====
   *  Every landmark carries its client's mark twice, and both are mounted the
   *  way real signage is mounted:
   *    - a standing roof sign, a board carried on posts above the roof deck,
   *      double sided, facing the bearing the focus camera approaches from
   *    - a framed sign fixed flat to the facade pointing away from the city
   *      centre
   *  Both are decals of the supplied artwork - nothing is redrawn.
   * ====================================================================== */

  /* the axis-aligned facade whose normal best matches the outward direction */
  function outward(x, y) {
    if (Math.abs(x) >= Math.abs(y)) return [x >= 0 ? 1 : -1, 0, 0];
    return [0, y >= 0 ? 1 : -1, 0];
  }
  function cross(a, b) {
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  }
  /* The across-vector for a decal on a wall with outward normal n. It is
     cross(up, n), NOT cross(n, up): the viewer stands outside looking back
     along -n, so getting this backwards renders every mark mirrored. */
  function faceRight(n) { return cross([0, 0, 1], n); }

  /* ---- mark proportions -------------------------------------------------
     Every mark is a different shape: HSE is 1.7:1, Kerry is 3.9:1. Both the
     sign board and the decal quad are sized from the artwork's own aspect, so
     nothing is stretched. The PNG header carries the dimensions, so they are
     read straight out of the data URI rather than being hard-coded per
     client. */
  var _ar = {};
  function markAspect(key) {
    if (_ar[key] !== undefined) return _ar[key];
    var uri = (root.ICONS || {})[key], out = 1;
    try {
      var head = atob(uri.slice(uri.indexOf(",") + 1, uri.indexOf(",") + 45));
      /* PNG: 8-byte signature, IHDR length+type, then width at 16, height at 20 */
      var u32 = function (o) {
        return ((head.charCodeAt(o) << 24) | (head.charCodeAt(o + 1) << 16) |
                (head.charCodeAt(o + 2) << 8) | head.charCodeAt(o + 3)) >>> 0;
      };
      var w = u32(16), h = u32(20);
      if (w && h) out = w / h;
    } catch (e) {}
    _ar[key] = out;
    return out;
  }

  /* ---- signage ----------------------------------------------------------
     Both sign types are the same object: a dark tray, a thin accent reveal in
     the client's colour, a recessed sign face, and the mark on the face with
     an even margin all round. That margin is what makes it read as a sign
     board rather than a logo stuck to the building.

     MARGIN is the fraction of the board the artwork leaves clear. The supplied
     marks already carry their own white plate, so the board reads as an
     illuminated sign box - which is what these actually are on a real roof. */
  var SIGN_MARGIN = 0.13;

  /* board(w) -> the mark drawn `w` wide, and everything sized around it */
  function signBoard(key, w) {
    var ar = markAspect(key);
    return { mw: w, mh: w / ar,
             bw: w * (1 + SIGN_MARGIN * 2),
             bh: (w / ar) * (1 + SIGN_MARGIN * 2) };
  }

  /* An upright sign is authored in the landmark's local space and then scaled
     non-uniformly with it - 1.46 across the plan against 1.04 in height. Left
     alone that stretches the mark by a factor of 1.4, so the height is
     pre-compensated here and comes out exact in world space. A roof sign lies
     flat, both its axes scale together, and it needs none of this. */
  function vComp(b) { return b.T ? (b.T.s / b.T.sz) : 1; }

  /* A facade sign: a board mounted proud of the wall, mark facing out. */
  function faceSign(b, decals, key, cx, cy, hx, hy, z, w, n, tone, id) {
    if (!key) return;
    var s = signBoard(key, w), k = vComp(b);
    s.mh *= k; s.bh *= k;
    var px = cx + n[0] * (hx + 0.04), py = cy + n[1] * (hy + 0.04);
    /* thickness runs along the wall normal; the board spans the other axis */
    var dx = Math.abs(n[0]) ? 0.07 : s.bw, dy = Math.abs(n[0]) ? s.bw : 0.07;
    b.box(px, py, z - s.bh / 2, dx * 1.05, dy * 1.05, s.bh * 1.12, tone, id, 1);
    b.emis(0.16);
    b.box(px + n[0] * 0.03, py + n[1] * 0.03, z - s.bh / 2, dx, dy, s.bh,
          M.signFace, id, 1);
    b.emis(0);
    decals.push({ key: key, id: id, dim: 0.88,
                  p: [px + n[0] * 0.085, py + n[1] * 0.085, z],
                  right: faceRight(n), up: [0, 0, 1], w: s.mw, h: s.mh });
  }

  /* A roof sign: a board STANDING on the roof, the way rooftop identity
     signage is actually built - a shallow base deck, a pair of posts, and the
     board carried clear of the roof deck on them, double sided so the mark
     reads from either approach. The previous version laid the mark flat on
     the roof, which only read from directly overhead.

     `rect` is the roof the sign stands on, [cx, cy, w, d]. The board is
     centred across that roof and set back from the front edge on the side the
     focus camera approaches from, so it is square on from the view that
     matters and can never hang over an edge or foul the roof plant.

     Alignment is snapped to the building's own axes rather than set to the
     exact bearing, because a real roof sign is parallel to the parapet it
     stands behind. */
  function roofMark(b, decals, key, rect, z, w, az, tone, id) {
    if (!key) return;
    var k = vComp(b);

    /* The mark height is capped rather than the width being taken as given.
       HSE's mark is 1.7:1 and Kerry's is 3.9:1, so one width produces a board
       twice as tall for one as for the other. Capping the height instead
       keeps every roof sign to the same standing height across the plan. */
    var ar = markAspect(key);
    var s = signBoard(key, Math.min(w, 0.72 * ar));
    s.mh *= k; s.bh *= k;

    /* facing: whichever of the four axes is nearest the approach bearing */
    var fx = Math.cos(az), fy = Math.sin(az);
    var n  = Math.abs(fx) >= Math.abs(fy) ? [fx >= 0 ? 1 : -1, 0, 0]
                                          : [0, fy >= 0 ? 1 : -1, 0];
    var ax = Math.abs(n[0]);                     // 1 when the board spans Y
    var rt = faceRight(n);
    var half = (ax ? rect[2] : rect[3]) / 2;
    var setb = Math.min(half * 0.42, 0.62);      // set back off the roof edge
    var cx = rect[0] + n[0] * (half - setb);
    var cy = rect[1] + n[1] * (half - setb);

    var LEG = 0.30 * k, TH = 0.085;
    var bw = s.bw, bh = s.bh;
    var wx = ax ? TH : bw, wy = ax ? bw : TH;

    /* base deck and the two posts that carry the board */
    b.box(cx, cy, z, ax ? 0.34 : bw * 0.92, ax ? bw * 0.92 : 0.34,
          0.05 * k, M.signBed, id, 0.95);
    for (var g = -1; g <= 1; g += 2) {
      b.box(cx + rt[0] * g * bw * 0.33, cy + rt[1] * g * bw * 0.33, z,
            0.09, 0.09, LEG + 0.05 * k, M.metal, id, 0.8);
    }

    /* The board: a tray in the client's tone with a lit face standing proud
       of it on both sides, so the tone is left as a hairline reveal around
       the mark rather than as a saturated slab behind it. */
    var z0 = z + LEG;
    var mi = Math.min(0.055, bw * 0.09);         // reveal across the board
    var mz = Math.min(0.055 * k, bh * 0.09);     // reveal top and bottom
    b.box(cx, cy, z0, wx, wy, bh, tone, id, 1);
    b.emis(0.16);
    b.box(cx, cy, z0 + mz,
          ax ? TH + 0.04 : wx - mi * 2,
          ax ? wy - mi * 2 : TH + 0.04,
          bh - mz * 2, M.signFace, id, 1);
    b.emis(0);

    /* One decal per face. faceRight() is taken against that face's own
       outward normal, otherwise the back of the board renders mirrored. */
    var off = (TH + 0.04) / 2 + 0.02, zc = z0 + bh / 2;
    [n, [-n[0], -n[1], 0]].forEach(function (f) {
      decals.push({ key: key, id: id, dim: 0.86,
                    p: [cx + f[0] * off, cy + f[1] * off, zc],
                    right: faceRight(f), up: [0, 0, 1], w: s.mw, h: s.mh });
    });
  }

  /* ==================================================== LANDMARK MASSING */
  /* Five distinct silhouettes. Abstract civic architecture: each one should be
     recognisable from the roster in one glance, without being a caricature. */
  var LM = {};

  /* Department of Justice - civic, symmetrical, colonnaded podium */
  LM.courthouse = function (b, x, y, tone, id, decals, key, az) {
    var S = M.stone, L = M.stoneLt;
    b.box(x, y, 0, PARCEL + 0.7, PARCEL + 0.7, 0.55, M.plinth, id, 0.9);      // plinth
    b.box(x, y, 0.55, 5.6, 4.9, 1.5, S, id, 0.6);                             // podium
    colonnade(b, "x", x, y, 2.05, 5.0, -2.2, 3.0, 9, L, id);                  // portico
    b.box(x, y - 2.2, 5.05, 5.4, 0.52, 0.6, L, id, 0.85);                     // entablature
    var top = stack(b, x, y + 0.45, 2.05, 4.9, 3.7, 3, 1.62, S, M.glass, id); // main block
    b.box(x, y + 0.45, top, 5.2, 4.0, 0.45, L, id, 0.9);                      // cornice
    /* the attic sits back from the front cornice, which leaves a clear ledge
       for the sign - it used to be centred and the mark was buried inside it */
    b.box(x, y + 0.62, top + 0.42, 3.0, 2.6, 1.5, S, id, 0.9);                // attic storey
    /* A pyramid roof capped this and read as a toy house on a civic block.
       The attic now finishes the way the rest of the model does: a cornice
       and a parapet lip around a flat deck. */
    b.box(x, y + 0.62, top + 1.92, 3.2, 2.8, 0.26, L, id, 0.9);               // attic cornice
    parapet(b, x, y + 0.62, top + 2.18, 3.2, 2.8, L, id);
    crown(b, x, y + 0.45, top + 0.26, 5.2, 4.0, tone, id);
    var n = outward(x, y);
    faceSign(b, decals, key, x, y, 2.8, 2.45, 1.52, 1.45, n, tone, id);
    /* standing on the crown band, on the ledge the attic leaves clear all
       the way round. The rect is the cornice, so whichever edge the camera
       approaches from, the board sets back off it and clears the attic. */
    roofMark(b, decals, key, [x, y + 0.45, 5.2, 4.0], top + 0.78, 1.46, az, tone, id);
    return top + 1.9;
  };

  /* HSE - cruciform ward block over a broad diagnostic podium.
     Built as a core plus four butting arms. Crossing two full slabs through
     each other put two sets of coplanar faces in the same space, and the
     depth buffer tore along every one of them. */
  LM.hospital = function (b, x, y, tone, id, decals, key, az) {
    var S = M.stone, L = M.stoneLt;
    var CORE = 2.5, ARM = 1.05, FL = 5, FH = 1.55, Z0 = 2.7;

    b.box(x, y, 0, PARCEL + 0.7, PARCEL + 0.7, 0.5, M.plinth, id, 0.9);
    b.box(x, y, 0.5, 5.4, 4.4, 2.2, S, id, 0.6);                              // podium
    fins(b, "x", x, y, 0.5, 4.9, -2.2, 2.2, 11, L, id);   // pilasters, flush with the podium
    parapet(b, x, y, 2.7, 5.4, 4.4, L, id);

    var top = stack(b, x, y, Z0, CORE, CORE, FL, FH, S, M.glass, id);         // core
    /* Arms are a clear step narrower than the core across their short axis.
       At equal widths the arms' recessed glazing landed 0.005 units from the
       core's stone face - close enough that the depth buffer could not
       separate them, which is what produced the sawtooth along every edge. */
    var WARM = CORE - 0.36;
    var off = CORE / 2 + ARM / 2 - 0.06;
    [[0, -off, WARM, ARM], [0, off, WARM, ARM],
     [-off, 0, ARM, WARM], [off, 0, ARM, WARM]].forEach(function (a) {
      stack(b, x + a[0], y + a[1], Z0, a[2], a[3] + 0.12, FL, FH, S, M.glass, id);
    });

    /* the two roof slabs cross, so they are given different thicknesses:
       equal ones put two coplanar top faces in the same plane and the depth
       buffer tore along the join */
    b.box(x, y, top, CORE + 0.3, CORE + ARM * 2, 0.38, L, id, 0.9);
    b.box(x, y, top, CORE + ARM * 2, CORE + 0.3, 0.41, L, id, 0.9);
    /* plant moved out on to the north arm: centred it sat exactly where the
       roof sign goes */
    plant(b, x, y + 1.70, top + 0.38, 1.5, 1.1, M.metal, id, 11);
    /* One square band around the core, not two crossing bars: crossing bars
       at different heights left a 0.02 sliver of one poking through the other
       all the way round. This stands proud of both roof slabs on every side. */
    crown(b, x, y, top - 0.34, CORE + 0.3, CORE + 0.3, tone, id);
    var n = outward(x, y);
    faceSign(b, decals, key, x, y, 2.7, 2.2, 1.58, 1.34, n, tone, id);
    /* the crossing roof slabs give a 4.6 square envelope; the board stands
       on whichever arm faces the approach */
    roofMark(b, decals, key, [x, y, 4.6, 4.6], top + 0.41, 1.58, az, tone, id);
    return top + 1.5;
  };

  /* CSO - a drum of data on a square base, stepped crown */
  LM.observatory = function (b, x, y, tone, id, decals, key, az) {
    var S = M.stone, L = M.stoneLt;
    b.box(x, y, 0, PARCEL + 0.7, PARCEL + 0.7, 0.5, M.plinth, id, 0.9);
    b.box(x, y, 0.5, 5.0, 5.0, 1.7, S, id, 0.6);                              // base
    parapet(b, x, y, 2.2, 5.0, 5.0, L, id);
    var z = 2.2, i;
    for (i = 0; i < 7; i++) {                                                 // glazed drum
      b.prism(x, y, z + i * 1.55, 2.00, 2.00, 1.06, 28, 0, M.glass, id, 0.58);
      b.prism(x, y, z + i * 1.55 + 1.06, 2.06, 2.06, 0.49, 28, 0, S, id, 0.78);
    }
    z += 7 * 1.55;
    b.prism(x, y, z, 2.25, 2.25, 0.4, 28, 0, L, id, 0.9);                     // cornice ring
    b.prism(x, y, z + 0.4, 2.02, 1.72, 1.35, 28, 0, S, id, 0.9);              // tapered crown
    b.prism(x, y, z + 1.75, 1.72, 1.72, 0.30, 28, 0, L, id, 0.95);
    b.box(x, y + 1.28, z + 2.05, 0.18, 0.18, 1.5, M.metal, id, 0.95);          // mast, set back off the sign
    b.prism(x, y, z, 2.32, 2.32, 0.26, 28, 0, tone, id, 1);                   // accent ring
    var n = outward(x, y);
    faceSign(b, decals, key, x, y, 2.5, 2.5, 1.36, 1.50, n, tone, id);
    /* the drum's flat crown, 1.72 radius; the mast is set back off it */
    roofMark(b, decals, key, [x, y, 3.44, 3.44], z + 2.05, 1.42, az, tone, id);
    return z + 3.7;
  };

  /* Kerry Group - production halls, silo cluster, linking bridge */
  LM.plant = function (b, x, y, tone, id, decals, key, az) {
    var S = M.stone, L = M.stoneLt, Mt = M.metal;
    b.box(x, y, 0, PARCEL + 0.7, PARCEL + 0.7, 0.45, M.plinth, id, 0.9);
    b.box(x - 1.1, y - 0.9, 0.45, 3.0, 3.6, 3.4, S, id, 0.6);                 // main hall
    /* Both halls had steep pitched roofs, which on a 3-unit block read as a
       cartoon barn. A production hall is a shallow deck behind an upstand,
       so that is what they get - a thin roof plate and a parapet. */
    b.box(x - 1.1, y - 0.9, 3.85, 3.06, 3.66, 0.16, L, id, 0.92);
    parapet(b, x - 1.1, y - 0.9, 4.01, 3.06, 3.66, L, id);
    b.box(x - 1.1, y + 1.55, 0.45, 2.88, 1.5, 2.4, S, id, 0.65);              // low annexe
    b.box(x - 1.1, y + 1.55, 2.85, 2.94, 1.56, 0.14, L, id, 0.92);
    parapet(b, x - 1.1, y + 1.55, 2.99, 2.94, 1.56, L, id);
    fins(b, "y", x - 1.1, y - 0.9, 0.45, 3.4, -1.5, 3.4, 9, L, id);
    var si;                                                                    // silo cluster
    for (si = 0; si < 3; si++) {
      var sx = x + 1.6 + (si % 2) * 1.45, sy = y - 1.6 + Math.floor(si / 2) * 1.45;
      b.prism(sx, sy, 0.45, 0.82, 0.82, 5.6 + rnd(si * 3) * 1.0, 22, 0, L, id, 0.6);
      b.prism(sx, sy, 6.05 + rnd(si * 3) * 1.0, 0.82, 0.30, 0.5, 22, 0, Mt, id, 0.95);
    }
    b.box(x + 2.05, y + 1.5, 0.45, 1.9, 1.9, 4.3, S, id, 0.6);                // process block
    parapet(b, x + 2.05, y + 1.5, 4.75, 1.9, 1.9, L, id);
    b.box(x + 0.5, y + 1.5, 3.5, 1.3, 0.55, 0.55, Mt, id, 0.9);               // conveyor bridge
    /* tucked to the far side of the process block so the standing roof sign
       has the front of that roof to itself */
    plant(b, x + 2.55, y + 1.50, 4.75, 0.72, 1.60, Mt, id, 23);
    crown(b, x + 2.05, y + 1.5, 4.45, 1.9, 1.9, tone, id);
    var n = outward(x, y);
    faceSign(b, decals, key, x - 1.1, y - 0.9, 1.5, 1.8, 2.38, 1.46, n, tone, id);
    roofMark(b, decals, key, [x + 2.05, y + 1.5, 1.9, 1.9], 4.78, 1.40, az, tone, id);
    return 8.6;
  };

  /* National Utility - control block, two tapered cooling forms, clean stack */
  LM.powerstation = function (b, x, y, tone, id, decals, key, az) {
    var S = M.stone, L = M.stoneLt, Mt = M.metal;
    b.box(x, y, 0, PARCEL + 0.7, PARCEL + 0.7, 0.5, M.plinth, id, 0.9);
    var top = stack(b, x - 1.5, y - 1.2, 0.5, 2.3, 3.4, 7, 1.35, S, M.glass, id);
    b.box(x - 1.5, y - 1.2, top, 2.6, 3.7, 0.4, L, id, 0.9);                  // control block
    crown(b, x - 1.5, y - 1.2, top - 0.3, 2.6, 3.7, tone, id);
    b.box(x + 1.2, y - 1.6, 0.5, 3.0, 2.2, 3.6, S, id, 0.6);                  // turbine hall
    b.box(x + 1.2, y - 1.6, 4.1, 3.06, 2.26, 0.15, L, id, 0.92);              // flat roof deck
    parapet(b, x + 1.2, y - 1.6, 4.25, 3.06, 2.26, L, id);
    fins(b, "x", x + 1.2, y - 1.6, 0.5, 2.7, -1.1, 3.6, 8, L, id);
    /* hyperboloid-ish cooling forms: waisted, not cartoon funnels */
    [[x + 1.0, y + 1.7], [x + 2.6, y + 0.7]].forEach(function (p, k) {
      var z0 = 0.5, r0 = 1.05 - k * 0.18, seg = 7, H = 5.6 - k * 1.0;
      for (var s = 0; s < seg; s++) {
        var u0 = s / seg, u1 = (s + 1) / seg;
        var rr = function (u) { return r0 * (1 - 0.42 * Math.sin(u * Math.PI * 0.92)) * (1 + u * 0.16); };
        b.prism(p[0], p[1], z0 + u0 * H, rr(u0), rr(u1), H / seg, 22, 0, L, id, 0.62);
      }
      b.prism(p[0], p[1], z0 + H, rr_top(r0), rr_top(r0) * 0.93, 0.26, 22, 0, Mt, id, 0.95);
      function rr_top(r) { return r * (1 - 0.42 * Math.sin(Math.PI * 0.92)) * 1.16; }
    });
    b.prism(x - 2.4, y + 2.1, 0.5, 0.40, 0.30, 8.6, 18, 0, L, id, 0.6);       // stack
    b.prism(x - 2.4, y + 2.1, 9.1, 0.32, 0.32, 0.28, 18, 0, Mt, id, 0.95);
    /* Both signs go on the control block. The turbine hall is the obvious
       host for the facade sign, but the two cooling forms stand directly in
       front of it from the bearing focusOn() approaches on, so the mark would
       be hidden exactly when the client opens their own landmark. */
    var n = outward(x, y);
    faceSign(b, decals, key, x - 1.5, y - 1.2, 1.3, 1.85, 2.62, 1.30, n, tone, id);
    /* offset off the control block centre so the flue stack stands clear of
       the board rather than across its edge */
    roofMark(b, decals, key, [x - 1.2, y - 1.2, 2.6, 3.7], top + 0.40, 1.44, az, tone, id);
    return top + 1.2;
  };

  /* ======================================================== EY HQ CAMPUS ==
   *  Modelled from the supplied reference renders: a square plaza with an
   *  olive-yellow edge trim, a long slab block to the north-east and an
   *  L-shaped block to the south-west, both glazed on a warm mullion grid and
   *  lifted on ground-floor columns, with planted roof panels, rooftop plant,
   *  trees and lamp standards to the plaza.
   *
   *  The EY mark itself is NOT drawn here. It is placed as a textured decal
   *  using the original brand asset, so it is never redrawn or approximated.
   *  `decals` collects where those go.
   * ====================================================================== */

  /* A glazed bay: recessed glass with a mullion frame around it. Repeated per
     floor per face, this is what gives the HQ its curtain-wall read. */
  function bay(b, side, cx, cy, z, span, off, h, n, id) {
    var horiz = (side === "x");
    var gw = span / n;
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n - 0.5;
      var px = horiz ? cx + t * span : cx + off;
      var py = horiz ? cy + off : cy + t * span;
      var w  = horiz ? gw * 0.94 : 0.04;
      var d  = horiz ? 0.04 : gw * 0.94;
      b.box(px, py, z + h * 0.06, w, d, h * 0.80, M.hqGlass, id, 0.80);
      // slim vertical mullion on the bay division, standing just proud
      var mx = horiz ? cx + ((i + 1) / n - 0.5) * span : cx + off;
      var my = horiz ? cy + off : cy + ((i + 1) / n - 0.5) * span;
      if (i < n - 1) {
        b.box(mx, my, z, horiz ? 0.045 : 0.075, horiz ? 0.075 : 0.045, h, M.hqMull, id, 0.88);
      }
    }
  }

  /* One storey of facade on all four sides: glazing, mullions, spandrel band */
  function hqFloor(b, cx, cy, z, w, d, fh, nx, ny, id) {
    bay(b, "x", cx, cy, z, w, -d / 2, fh, nx, id);
    bay(b, "x", cx, cy, z, w,  d / 2, fh, nx, id);
    bay(b, "y", cx, cy, z, d, -w / 2, fh, ny, id);
    bay(b, "y", cx, cy, z, d,  w / 2, fh, ny, id);
    /* Spandrel band capping the storey. Kept almost flush: at +0.10 it stood
       out far enough to read as a row of shelves rather than a floor line. */
    b.box(cx, cy, z + fh * 0.86, w + 0.035, d + 0.035, fh * 0.14, M.hqSpan, id, 0.92);
  }

  /* A block: columns at grade, glazed storeys, parapet and roof field */
  function hqBlock(b, cx, cy, w, d, floors, fh, z0, decals, opts, id) {
    opts = opts || {};
    var i, z = z0;

    // ground-floor colonnade
    var cn = Math.max(3, Math.round(w / 0.95));
    for (i = 0; i < cn; i++) {
      var t = (i + 0.5) / cn - 0.5;
      b.box(cx + t * w, cy - d / 2, z, 0.12, 0.12, 0.62, M.hqCol, id, 0.7);
      b.box(cx + t * w, cy + d / 2, z, 0.12, 0.12, 0.62, M.hqCol, id, 0.7);
    }
    z += 0.62;
    b.box(cx, cy, z - 0.10, w + 0.06, d + 0.06, 0.14, M.hqSpan, id, 0.9);

    /* Solid core behind the curtain wall. Without it the block is a shell of
       thin glass panels and you see straight through to the inside faces of
       the far facade - the whole thing read as a wireframe cage. */
    b.box(cx, cy, z, w - 0.16, d - 0.16, floors * fh, M.hqCore, id, 0.62);

    var nx = Math.max(4, Math.round(w / 0.62)), ny = Math.max(3, Math.round(d / 0.62));
    for (i = 0; i < floors; i++) { hqFloor(b, cx, cy, z + i * fh, w, d, fh, nx, ny, id); }
    z += floors * fh;

    // roof field, parapet lip and a planted panel
    b.box(cx, cy, z, w + 0.17, d + 0.17, 0.09, M.hqRoof, id, 0.95);
    hqParapet(b, cx, cy, z + 0.09, w + 0.17, d + 0.17, id);
    if (opts.green) {
      b.box(cx + (opts.greenOff || 0), cy, z + 0.10,
            w * 0.56, d * 0.30, 0.05, M.hqGreen, id, 1);
    }
    if (opts.plant) {
      /* plantOff keeps the mechanical clutter clear of the sign bay - at the
         default position it sat straight across the EY mark */
      var po = opts.plantOff === undefined ? 0.14 : opts.plantOff;
      b.box(cx + w * 0.20, cy + d * po, z + 0.10, w * 0.26, d * 0.16, 0.30, M.hqParap, id, 0.95);
      b.box(cx + w * 0.20, cy + d * po, z + 0.40, w * 0.26, d * 0.16, 0.06, M.hqRoof, id, 1);
    }
    return z + 0.10;
  }

  /* The shared parapet() is sized for the civic landmarks and is far too
     heavy here; the HQ roof edge is a thin upstand. */
  function hqParapet(b, cx, cy, z, w, d, id) {
    var t = 0.085, h = 0.17;
    b.box(cx, cy - d/2 + t/2, z, w, t, h, M.hqParap, id, 0.98);
    b.box(cx, cy + d/2 - t/2, z, w, t, h, M.hqParap, id, 0.98);
    b.box(cx - w/2 + t/2, cy, z, t, d - t*2, h, M.hqParap, id, 0.98);
    b.box(cx + w/2 - t/2, cy, z, t, d - t*2, h, M.hqParap, id, 0.98);
  }

  /* A model tree, not an illustrated one. The three stacked bands it replaces
     built a bobbled cartoon shrub: a wide middle band pinched top and bottom,
     which is how a tree is drawn rather than how one is massed.

     This is the architectural convention instead - a slim standard on a
     ground disc carrying one clean tapered canopy, in tone rather than in
     colour, with a second lighter cap so the form still turns in the light.
     At plan distance it reads as planting; up close it reads as a model. */
  function hqTree(b, x, y, z, r, id) {
    b.prism(x, y, z + 0.005, r * 0.40, r * 0.40, 0.022, 12, 0, M.hqGreen, id, 1);
    b.prism(x, y, z, 0.036, 0.030, r * 1.05, 8, 0, M.hqTrunk, id, 0.7);
    /* The canopy is taller than it is wide. A squat one reads as a mushroom,
       or worse as another lamp standard, which is exactly what the plaza does
       not need more of. */
    var z0 = z + r * 0.66, H = r * 1.70;
    b.prism(x, y, z0,             r * 0.34, r * 0.60, H * 0.38, 12, 0.26, M.hqTree,   id, 0.72);
    b.prism(x, y, z0 + H * 0.38,  r * 0.60, r * 0.22, H * 0.62, 12, 0.26, M.hqTreeLt, id, 0.92);
  }

  /* Lamp standard: a slim column and a lit head. Nothing on the deck. */
  function hqLamp(b, x, y, z, id) {
    b.box(x, y, z, 0.05, 0.05, 0.72, M.hqCol, id, 0.8);
    b.emis(1.0);
    b.prism(x, y, z + 0.72, 0.09, 0.065, 0.11, 8, 0, M.hqLamp, id, 1);
    b.emis(0);
    /* The two pooled rings on the deck are gone. They were flat discs of a
       pale warm material standing in for a light that does not exist in the
       scene, and at any brightness they read as painted circles on the
       paving - in plan the plaza became a row of them. Darkening them only
       swapped tan circles for brown ones, because a disc is lit like any
       other surface here.

       It also put them at odds with the rule the rest of this model is built
       on: matte materials, one key light, no glow. The lamp standard and its
       head carry the idea on their own. */
  }

  LM.eyhq = function (b, x, y, tone, id, decals) {
    var Z = 0.0;

    // plaza deck with the olive edge trim from the reference
    b.box(x, y, Z, 13.8, 13.0, 0.10, M.hqTrim, id, 1);
    b.box(x, y, Z + 0.10, 13.3, 12.5, 0.06, M.hqPlaza, id, 1);
    Z += 0.16;

    /* NE slab: the long block carrying the roof mark and the facade sign */
    var AW = 3.1, AD = 8.2, AX = x + 3.0, AY = y + 0.4;
    var aTop = hqBlock(b, AX, AY, AW, AD, 5, 0.78, Z, decals,
                       { plant: true, plantOff: 0.38 }, id);

    /* SW block, L-shaped: a long wing and a square wing meeting at the corner */
    var BW = 3.0, BD = 4.6, BX = x - 3.2, BY = y + 2.1;
    var bTop = hqBlock(b, BX, BY, BW, BD, 4, 0.78, Z, decals, { green: true, greenOff: -0.5 }, id);
    var CW = 4.3, CD = 3.0, CX = x - 1.9, CY = y - 2.6;
    var cTop = hqBlock(b, CX, CY, CW, CD, 4, 0.78, Z, decals, { green: true }, id);
    // glazed atrium over the square wing, as in the reference
    b.box(CX + 0.3, CY + 0.2, cTop, 1.5, 1.15, 0.30, M.hqGlass, id, 0.85);
    b.box(CX + 0.3, CY + 0.2, cTop + 0.30, 1.62, 1.25, 0.06, M.hqParap, id, 1);

    /* courtyard paving between the blocks */
    b.box(x + 0.15, y + 0.3, Z + 0.16, 2.5, 7.6, 0.035, M.hqCourt, id, 1);

    /* trees and lamp standards */
    var T = [[-6.0,4.6,0.72],[-6.2,2.0,0.52],[-5.7,-4.5,0.58],[-4.2,-5.4,0.48],
             [-2.6,-5.6,0.44],[1.05,-1.5,0.38],[1.25,-2.6,0.36],[1.0,-3.6,0.40],
             [1.35,2.3,0.38],[1.55,3.6,0.46],[5.6,-4.4,0.50],[5.8,3.9,0.44],
             [-6.1,-1.4,0.42],[0.2,5.3,0.40]];
    T.forEach(function (t) { hqTree(b, x + t[0], y + t[1], Z, t[2], id); });
    var L = [[1.25,0.5],[1.1,-4.4],[1.3,4.7],[-5.6,-1.2],[5.6,-5.3],[-1.2,-5.6],
             [-5.7,3.0],[5.7,2.2]];
    L.forEach(function (l) { hqLamp(b, x + l[0], y + l[1], Z, id); });

    /* ================================================ EY SIGNAGE ==========
     *  A dark roof sign recessed into the NE slab, washed from below by a rank
     *  of narrow spotlights, plus the framed sign on the long south-east
     *  facade and a scatter of small marks through the glazing.
     * ==================================================================== */

    /* ---- roof sign ----
       The EY mark stands on a board above the NE slab: a base deck, two
       pylons, a yellow tray and a dark lit face, with the mark on both sides.
       It is a freestanding sign on the skyline, not a panel lying on a roof -
       the recessed version it replaces only read from straight overhead.

       The board spans the slab's long axis and faces +X, which is the side
       the home camera and every focus approach come in on. */
    var EYAR = markAspect("ey-decal");
    var SX = AX + 0.15, SY = AY + 0.35;        // board centre in plan
    var MW = 1.05, MH = MW / EYAR;             // the mark itself
    var BW = MW * 1.26, BH = MH * 1.26;        // board, even margin all round
    var LEGH = 0.40, STH = 0.10;               // clear air beneath, board thickness

    /* base deck and the two pylons that carry the board */
    b.box(SX, SY, aTop, 0.80, BW * 0.98, 0.07, M.hqParap, id, 1);
    b.box(SX, SY, aTop + 0.07, 0.64, BW * 0.88, 0.028, M.hqRoof, id, 1);
    [-1, 1].forEach(function (g) {
      b.box(SX, SY + g * BW * 0.33, aTop + 0.07, 0.10, 0.10, LEGH + 0.04,
            M.hqCol, id, 0.85);
    });

    /* the board: yellow tray, dark face standing proud on both sides */
    var SZ0 = aTop + 0.07 + LEGH, SZC;
    b.box(SX, SY, SZ0, STH, BW, BH, tone, id, 1);
    b.emis(0.13);
    b.box(SX, SY, SZ0 + 0.055, STH + 0.05, BW - 0.11, BH - 0.11, M.hqSign, id, 1);
    b.emis(0);
    SZC = SZ0 + BH / 2;
    [[1, 0, 0], [-1, 0, 0]].forEach(function (f) {
      decals.push({ key: "ey-decal", id: id, dim: 1,
                    p: [SX + f[0] * ((STH + 0.05) / 2 + 0.02), SY, SZC],
                    right: faceRight(f), up: [0, 0, 1], w: MW, h: MH });
    });

    /* ---- the rank that lights it ----
       Four narrow fixtures standing on the deck in front of the board, each
       throwing a wedge of light up on to the face. The wedge is a flat quad
       lying in the plane through its own beam axis and the board's width
       direction, tilted about fifty degrees off the deck, so it reads as a
       shaft of light from every bearing except straight down the rank. A true
       cone was tried first and read as a stack of discs.

       Each wedge is drawn in both windings: the scene culls back faces, and a
       single-wound beam disappears the moment you orbit past it. */
    var FX = SX + 0.32, FZ = aTop + 0.10;
    /* The wedges stop a hair in front of the sign face but BEHIND the plane
       the decal sits on. Past it they are opaque geometry in front of the
       mark and the wash cuts the bottom off the logo. */
    var TZ = SZ0 + BH * 0.66, TXB = SX + (STH + 0.05) / 2 + 0.008;
    for (var si = 0; si < 4; si++) {
      var u  = si / 3 - 0.5;
      var fy = SY + u * BW * 0.74;

      b.box(FX, fy, FZ, 0.09, 0.09, 0.11, M.hqCol, id, 0.85);
      b.emis(0.55);
      b.prism(FX, fy, FZ + 0.11, 0.055, 0.048, 0.075, 8, 0, M.beam, id, 1);
      b.emis(0);

      /* Each wedge leans in towards the centre of the mark, but only part of
         the way. Aimed dead centre the four washes overlapped into one solid
         slab of light across the bottom of the board; this keeps them
         readable as four separate fixtures. */
      var ty = SY + u * BW * 0.50, hw = BW * 0.125;
      var p0 = [FX - 0.03, fy - 0.035, FZ + 0.165];
      var p1 = [FX - 0.03, fy + 0.035, FZ + 0.165];
      var p2 = [TXB, ty + hw, TZ];
      var p3 = [TXB, ty - hw, TZ];
      b.emis(0.5);
      b.tri(p0, p1, p2, M.beamGlow, id, 1);
      b.tri(p0, p2, p3, M.beamGlow, id, 1);
      b.tri(p2, p1, p0, M.beamGlow, id, 1);
      b.tri(p3, p2, p0, M.beamGlow, id, 1);
      b.emis(0);
    }

    /* ---- framed sign on the long south-east facade ---- */
    b.box(AX + AW / 2 + 0.07, AY - 1.9, Z + 1.30, 0.06, 2.24, 2.04, tone, id, 1);
    b.emis(0.22);
    b.box(AX + AW / 2 + 0.10, AY - 1.9, Z + 1.37, 0.04, 2.10, 1.90, M.hqSign, id, 1);
    b.emis(0);
    decals.push({ key: "ey-decal", id: id, dim: 1,
                  p: [AX + AW / 2 + 0.14, AY - 1.9, Z + 2.32],
                  right: faceRight([1, 0, 0]), up: [0, 0, 1],
                  w: 1.78, h: 1.78 / EYAR });

    /* ---- marks in the glazing ----
       A scatter of small EY marks across the curtain wall, as though lit from
       inside a handful of floors. Deterministic, so the same windows carry
       them on every load, and kept sparse so it reads as a detail rather than
       as wallpaper. */
    /* the fifth entry is the block's storey count: the NE slab has five, the
       other two have four. Without it the floor index ran to 5 on a four
       storey block and the mark landed behind the parapet overhang. */
    var WIN = [
      [AX, AY, AW / 2, AD / 2, [ 1, 0, 0], 5],
      [AX, AY, AW / 2, AD / 2, [-1, 0, 0], 5],
      [AX, AY, AW / 2, AD / 2, [ 0,-1, 0], 5],
      [BX, BY, BW / 2, BD / 2, [-1, 0, 0], 4],
      [BX, BY, BW / 2, BD / 2, [ 0, 1, 0], 4],
      [CX, CY, CW / 2, CD / 2, [ 0,-1, 0], 4],
      [CX, CY, CW / 2, CD / 2, [ 1, 0, 0], 4],
    ];
    /* The facade sign already occupies part of the NE slab's outward face, so
       that patch is a keep-out: a window mark landing on it would sit on top
       of another sign. */
    var KEEP = { fx: AX + AW / 2, y0: AY - 3.2, y1: AY - 0.6,
                 z0: Z + 1.0, z1: Z + 3.8 };

    var placed = 0;
    for (var wi = 0; wi < 40 && placed < 11; wi++) {
      var f = WIN[wi % WIN.length], nn = f[4];
      var span = nn[0] ? f[3] : f[2];
      var along = (rnd(wi * 31 + 7) - 0.5) * 1.2 * span;
      /* the top storey is skipped: its parapet oversails the facade and a
         mark up there sits behind the overhang */
      var floors = f[5], floor = Math.floor(rnd(wi * 17 + 3) * (floors - 1));
      /* the glazed band of that storey, not the spandrel above it */
      var wz = Z + 0.62 + floor * 0.78 + 0.78 * 0.36;
      /* stood off far enough to clear the mullions and the spandrel band */
      var wx = f[0] + (nn[0] ? nn[0] * (f[2] + 0.06) : along);
      var wy = f[1] + (nn[1] ? nn[1] * (f[3] + 0.06) : along);

      if (Math.abs(wx - KEEP.fx) < 0.30 && wy > KEEP.y0 && wy < KEEP.y1 &&
          wz > KEEP.z0 && wz < KEEP.z1) continue;

      decals.push({ key: "ey-decal", id: id, dim: 0.9, p: [wx, wy, wz],
                    right: faceRight(nn), up: [0, 0, 1],
                    w: 0.30, h: 0.30 / EYAR });
      placed++;
    }

    /* the standing roof sign is now the tallest thing on the campus, so the
       height reported back covers it - the HTML label and the framing
       distance are both derived from this and would otherwise sit on the
       board rather than above it */
    return aTop + 1.35;
  };

  /* =========================================================== THE FABRIC */
  /* Background blocks. Deliberately quiet: narrow height range, low contrast,
     no accent colour, so they read as context and never compete. */
  /* The first pass gave every background block the same per-floor banding as
     the landmarks. At plan distance that turned the whole city into uniform
     horizontal corduroy and flattened the landmarks into it. Context blocks
     are now clean masses with a single cap band: cheaper, quieter, and it
     leaves the floor-plate detail as something only the landmarks have. */
  function fabric(b, occupied) {
    for (var gx = -EXT; gx <= EXT; gx++) {
      for (var gy = -EXT; gy <= EXT; gy++) {
        if (occupied[gx + "," + gy]) continue;
        var cx = gx * PITCH, cy = gy * PITCH;
        var seed = (gx + 40) * 131 + (gy + 40);
        var r = rnd(seed);
        var dist = Math.min(1, Math.hypot(gx, gy) / EXT);

        /* public realm: squares and gardens, so the grid is not wall to wall */
        if (r > 0.88) { b.box(cx, cy, 0, PARCEL, PARCEL, 0.12, M.pavement, 0, 1); continue; }

        var base = mix(M.fabricA, M.fabricB, dist * 0.92);
        var cap  = mix(M.fabricCap, M.fabricB, dist * 0.92);

        /* Mostly low perimeter blocks with a small number of towers, rather
           than a smooth height falloff. A smooth falloff built a dome, which
           read as terrain instead of a city. */
        var tower = rnd(seed + 11) > 0.93 && dist > 0.30 && dist < 0.82;
        var h = tower ? 5.0 + rnd(seed + 5) * 2.6
                      : 1.5 + Math.pow(rnd(seed + 5), 1.7) * 6.2 * (1.1 - dist * 0.3);

        var sub = rnd(seed + 17) > 0.58 ? 2 : 1;
        for (var s = 0; s < sub; s++) {
          var ox = sub === 1 ? 0 : (s === 0 ? -PARCEL * 0.24 : PARCEL * 0.25);
          var oy = sub === 1 ? 0 : (rnd(seed + s * 7) - 0.5) * PARCEL * 0.16;
          var w  = sub === 1 ? PARCEL : PARCEL * (s === 0 ? 0.48 : 0.44);
          var d  = PARCEL * (0.82 + rnd(seed + s * 13) * 0.16);
          var hh = h * (s === 0 ? 1 : 0.54 + rnd(seed + s * 3) * 0.32);

          if (dist > 0.62) {
            /* beyond the framed area the blocks are simple masses: they exist
               to fill the horizon, and detail there costs triangles for
               something the haze is about to remove anyway */
            b.box(cx + ox, cy + oy, 0, w, d, hh, base, 0, 0.5);
          } else if (tower && s === 0) {
            b.box(cx + ox, cy + oy, 0, w, d, 1.5, base, 0, 0.5);          // podium
            b.box(cx + ox, cy + oy, 1.5, w * 0.74, d * 0.74, hh, base, 0, 0.72);
            b.taper(cx + ox, cy + oy, 1.5 + hh, w * 0.76, d * 0.76, 1.4, 0.66, cap, 0, 0.9);
          } else {
            b.box(cx + ox, cy + oy, 0, w, d, hh, base, 0, 0.5);
            b.box(cx + ox, cy + oy, hh, w * 1.02, d * 1.02, 0.26, cap, 0, 0.95);
          }
        }
      }
    }
  }

  /* ============================================================= STREETS */
  /* Carriageway, kerb and pavement as three thin stacked slabs. Drawn above
     the ground plane by a hair so nothing z-fights. */
  function streets(b) {
    var n = EXT * 2 + 1, span = (EXT * 2 + 1) * PITCH;
    for (var i = -EXT; i <= EXT; i++) {
      var c = i * PITCH + PITCH / 2;
      if (Math.abs(c) > LIMIT + PITCH) continue;
      b.box(0, c, 0.02, span, ROAD + 0.9, 0.02, M.kerb, 0, 1);
      b.box(0, c, 0.04, span, ROAD, 0.02, M.asphalt, 0, 1);
      b.box(c, 0, 0.06, ROAD + 0.9, span, 0.02, M.kerb, 0, 1);
      b.box(c, 0, 0.08, ROAD, span, 0.02, M.asphalt, 0, 1);
    }
  }

  /* ============================================================== BUILD */
  function build(BIZ) {
    var b = new root.EYGL.Builder();
    var clients = BIZ.city.clients;
    var occupied = {}, landmarks = [], decals = [];

    /* The EY HQ campus holds the centre of the plan. The content model already
       says so: "EY sits at the centre of the city. Each landmark around it is
       a separate client in its own isolated Microsoft tenant." It needs a
       wider clearing than a client landmark because it is a campus, not a
       single building. */
    for (var hx = -1; hx <= 1; hx++) {
      for (var hy = -1; hy <= 1; hy++) occupied[hx + "," + hy] = 1;
    }

    var SPREAD = 1.35;
    clients.forEach(function (c) {
      var gx = Math.round(c.pos[0] * SPREAD / PITCH),
          gy = Math.round(c.pos[1] * SPREAD / PITCH);
      /* the landmark parcel and its eight neighbours are cleared, so each one
         stands in its own setting rather than shoulder to shoulder */
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) occupied[(gx + dx) + "," + (gy + dy)] = 1;
      }
      landmarks.push({ c: c, gx: gx, gy: gy, x: gx * PITCH, y: gy * PITCH });
    });

    /* Ground plane. Sized so its edge is already fully absorbed by the
       exponential haze before it could reach the frame at maximum zoom out. */
    b.box(0, 0, -0.6, 7000, 7000, 0.6, M.asphalt, 0, 1);
    streets(b);
    fabric(b, occupied);

    /* Approach plazas, then the landmark itself. Each landmark is authored at
       parcel size and then scaled up into the cleared 3x3 block it owns, so it
       stands a clear step above the fabric in both footprint and height. That
       separation is the whole reason the five read as the subject. */
    var LSXY = 1.46, LSZ = 1.04;

    /* A decal is authored in the same local space as the geometry beside it,
       so it takes the same transform. The scale is non-uniform, so the two
       half-extent vectors are scaled AS VECTORS and re-normalised rather than
       width and height being scaled by one factor - otherwise a facade sign
       stretches differently from the wall it is mounted on. */
    function xformDecals(list, ox, oy, sxy, sz) {
      list.forEach(function (d) {
        if (d.done) return;
        d.done = true;
        d.p = [ox + (d.p[0] - ox) * sxy, oy + (d.p[1] - oy) * sxy, d.p[2] * sz];
        var rw = [d.right[0] * d.w / 2 * sxy, d.right[1] * d.w / 2 * sxy, d.right[2] * d.w / 2 * sz];
        var uh = [d.up[0]    * d.h / 2 * sxy, d.up[1]    * d.h / 2 * sxy, d.up[2]    * d.h / 2 * sz];
        var rl = Math.hypot(rw[0], rw[1], rw[2]) || 1;
        var ul = Math.hypot(uh[0], uh[1], uh[2]) || 1;
        d.w = rl * 2; d.h = ul * 2;
        d.right = [rw[0] / rl, rw[1] / rl, rw[2] / rl];
        d.up    = [uh[0] / ul, uh[1] / ul, uh[2] / ul];
      });
    }

    /* EY HQ first, at the origin, on its own plaza */
    var HQS = 1.62;
    b.xform(0, 0, HQS, HQS);
    var hqTop = LM.eyhq(b, 0, 0, hex("#FFE600"), HQ_ID, decals) * HQS;
    b.xformEnd();
    xformDecals(decals, 0, 0, HQS, HQS);

    landmarks.forEach(function (L, i) {
      var id = i + 1;
      b.box(L.x, L.y, 0.10, PITCH * 2.5, PITCH * 2.5, 0.06, M.pavement, 0, 1);
      var fn = LM[L.c.kind] || LM.courthouse;
      /* the bearing focusOn() approaches from, so the roof mark is laid to
         read upright from that view */
      var az = Math.atan2(L.y, L.x) + 0.55;
      b.xform(L.x, L.y, LSXY, LSZ);
      L.top = fn(b, L.x, L.y, hex(L.c.tone), id, decals, L.c.logo, az) * LSZ;
      b.xformEnd();
      xformDecals(decals, L.x, L.y, LSXY, LSZ);
    });

    /* Resolve each mark to its asset and drop any the icon set does not have,
       so a missing logo can never draw an empty quad. */
    var ICO = root.ICONS || {};
    decals = decals.filter(function (d) {
      d.img = ICO[d.key];
      delete d.done;
      return !!d.img;
    });

    /* FRAME is the radius the home view is composed around: the landmarks and
       the HQ, not the whole built extent. The fabric now runs well past it so
       the city dissolves into haze instead of ending at a visible edge, but
       the camera and the shadow map stay sized to the subject. */
    var FRAME = 46;
    return { builder: b, landmarks: landmarks, decals: decals,
             hq: { id: HQ_ID, x: 0, y: 0, top: hqTop },
             radius: LIMIT + PITCH, FRAME: FRAME, shadowR: FRAME * 1.7,
             PITCH: PITCH, LIMIT: LIMIT };
  }

  root.EYCITY = { build: build, M: M, hex: hex, PITCH: PITCH, LIMIT: LIMIT, HQ_ID: HQ_ID };
})(window);
