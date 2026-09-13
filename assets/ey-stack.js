/* ============================================================================
 *  THE PLATFORM STACK - five layered plates in real 3D
 *  ---------------------------------------------------------------------------
 *  A compact WebGL2 renderer. Five translucent plates lie in the XY plane and
 *  stack along +Z. Product marks sit on their plate as lit chips with a stem
 *  down to the surface, and each plate carries its own edge label.
 *
 *  Why not three.js: this file must stay a single self-contained offline HTML
 *  document. three.js cannot be inlined without shipping ~600KB of third-party
 *  code, and a CDN <script> breaks the offline requirement.
 *
 *  Orbit convention: drag right -> camera swings right; drag DOWN -> camera
 *  drops toward the horizon (side-on); drag UP -> climbs to a top-down view.
 * ========================================================================== */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------ math ----- */
  function m4() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  function mul(a, b) {
    var o = m4();
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      var s = 0;
      for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      o[i * 4 + j] = s;
    }
    return o;
  }
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), o = m4();
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf;
    o[11] = -1; o[14] = 2 * far * near * nf; o[15] = 0;
    return o;
  }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; }
  function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
  function lookAt(eye, tgt, up) {
    var z = norm(sub(eye, tgt)), x = norm(cross(up, z)), y = cross(z, x), o = m4();
    o[0]=x[0]; o[4]=x[1]; o[8]=x[2];
    o[1]=y[0]; o[5]=y[1]; o[9]=y[2];
    o[2]=z[0]; o[6]=z[1]; o[10]=z[2];
    o[12]=-dot(x,eye); o[13]=-dot(y,eye); o[14]=-dot(z,eye);
    return o;
  }
  function model(t, sx, sy) {
    var o = m4();
    o[0] = sx; o[5] = sy;
    o[12] = t[0]; o[13] = t[1]; o[14] = t[2];
    return o;
  }
  function project(vp, p) {
    var x = vp[0]*p[0] + vp[4]*p[1] + vp[8]*p[2] + vp[12];
    var y = vp[1]*p[0] + vp[5]*p[1] + vp[9]*p[2] + vp[13];
    var w = vp[3]*p[0] + vp[7]*p[1] + vp[11]*p[2] + vp[15];
    return { x: x / w, y: y / w, w: w };
  }
  function hex(h) {
    return [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var EL_MIN = 0.34, EL_MAX = 1.16;
  function clampEl(v) { return Math.max(EL_MIN, Math.min(EL_MAX, v)); }

  /* ----------------------------------------------------------- shaders --- */
  var VS = "#version 300 es\n" +
    "in vec3 aPos; in vec2 aUV; uniform mat4 uVP, uModel; out vec2 vUV;\n" +
    "void main(){ vUV = aUV; gl_Position = uVP * uModel * vec4(aPos,1.0); }";
  var FS = "#version 300 es\nprecision highp float;\n" +
    "in vec2 vUV; out vec4 o;\n" +
    "uniform sampler2D uTex; uniform vec4 uTint; uniform float uUseTex, uAlpha;\n" +
    "void main(){\n" +
    "  vec4 t = uUseTex > 0.5 ? texture(uTex, vUV) : vec4(1.0);\n" +
    "  o = vec4(t.rgb * uTint.rgb, t.a * uTint.a * uAlpha);\n" +
    "  if (o.a < 0.004) discard;\n" +
    "}";

  /* ------------------------------------------------------- canvas art ---- */
  function cv(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function rr(x, a, b, w, h, r) {
    x.beginPath();
    x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r);
    x.lineTo(a + w, b + h - r); x.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
    x.lineTo(a + r, b + h); x.quadraticCurveTo(a, b + h, a, b + h - r);
    x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b);
    x.closePath();
  }

  /* Plate: soft tinted glass, inner grid, dashed inset, edge label. */
  function plateTex(layer) {
    var W = 1024, H = 768, c = cv(W, H), x = c.getContext("2d");
    var col = layer.color;

    x.save(); rr(x, 8, 8, W - 16, H - 16, 30); x.clip();
    // base sheet so the plate reads as a surface, not just a tint
    x.fillStyle = "rgba(16,17,24,.72)"; x.fillRect(0, 0, W, H);
    var g = x.createLinearGradient(0, 0, W * 0.8, H);
    g.addColorStop(0, col + "62");
    g.addColorStop(0.5, col + "24");
    g.addColorStop(1, col + "12");
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    x.strokeStyle = col + "3A"; x.lineWidth = 1.6;
    for (var i = 1; i < 12; i++) { var px = i * W / 12; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H); x.stroke(); }
    for (var j = 1; j < 9; j++) { var py = j * H / 9; x.beginPath(); x.moveTo(0, py); x.lineTo(W, py); x.stroke(); }
    x.restore();

    // outer edge
    x.strokeStyle = col + "F0"; x.lineWidth = 5;
    rr(x, 8, 8, W - 16, H - 16, 30); x.stroke();
    // dashed inset
    x.strokeStyle = col + "72"; x.lineWidth = 1.8; x.setLineDash([9, 11]);
    rr(x, 30, 30, W - 60, H - 60, 20); x.stroke(); x.setLineDash([]);

    return c;
  }

  /* Edge label strip, drawn on its own thin quad along the plate's +X edge. */
  function labelTex(layer) {
    var W = 512, H = 64, c = cv(W, H), x = c.getContext("2d");
    x.clearRect(0, 0, W, H);
    x.font = "800 34px Archivo, 'Segoe UI', sans-serif";
    x.textAlign = "right"; x.textBaseline = "middle";
    x.fillStyle = layer.color;
    x.shadowColor = "rgba(0,0,0,.85)"; x.shadowBlur = 10;
    var label = layer.index + "  " + layer.name.toUpperCase();
    x.letterSpacing = "3px";
    x.fillText(label, W - 18, H / 2);
    return c;
  }

  /* Chip: rounded glass tile carrying a product mark. */
  function chipTex(img, col) {
    var S = 256, c = cv(S, S), x = c.getContext("2d");
    var pad = 26, w = S - pad * 2;
    rr(x, pad, pad, w, w, 52); x.fillStyle = "rgba(24,24,32,.90)"; x.fill();
    var g = x.createLinearGradient(pad, pad, S - pad, S - pad);
    g.addColorStop(0, "rgba(255,255,255,0.16)");
    g.addColorStop(1, "rgba(255,255,255,0.04)");
    rr(x, pad, pad, w, w, 52); x.fillStyle = g; x.fill();
    rr(x, pad, pad, w, w, 52);
    x.strokeStyle = col + "8C"; x.lineWidth = 3; x.stroke();
    if (img) {
      var s = w * 0.60, o = (S - s) / 2;
      try { x.drawImage(img, o, o, s, s); } catch (e) {}
    }
    return c;
  }
  function glowTex() {
    var S = 256, c = cv(S, S), x = c.getContext("2d");
    var g = x.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.32)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return c;
  }
  function lineTex() {
    var c = cv(8, 128), x = c.getContext("2d");
    var g = x.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 8, 128);
    return c;
  }

  /* ============================================================== Stage == */
  function Stage(host, layers, products, icons) {
    var self = this;
    this.host = host;
    this.layersDef = layers;
    this.products = products;
    this.icons = icons || {};

    this.canvas = document.createElement("canvas");
    this.canvas.className = "gl";
    host.appendChild(this.canvas);

    var gl = this.canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) { this.failed = true; return; }
    this.gl = gl;

    function sh(t, src) {
      var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    this.u = {
      VP: gl.getUniformLocation(p, "uVP"), M: gl.getUniformLocation(p, "uModel"),
      tex: gl.getUniformLocation(p, "uTex"), tint: gl.getUniformLocation(p, "uTint"),
      useTex: gl.getUniformLocation(p, "uUseTex"), alpha: gl.getUniformLocation(p, "uAlpha"),
    };
    gl.uniform1i(this.u.tex, 0);

    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -.5,-.5,0, 0,1,   .5,-.5,0, 1,1,   .5,.5,0, 1,0,
      -.5,-.5,0, 0,1,   .5,.5,0, 1,0,   -.5,.5,0, 0,0,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    this.PW = 11.6; this.PH = 8.7;
    this.gap = 2.75; this.gapTarget = 2.75;
    this.exploded = false;
    this.spinning = !REDUCED;
    this.focus = null; this.hover = null; this.selected = null;

    this.az = -0.62; this.el = 0.72; this.dist = 29.5; this.distT = 29.5;

    this.glow = this.tex(glowTex());
    this.line = this.tex(lineTex());

    this.layers = layers.slice().reverse().map(function (L, i) {
      return {
        def: L, i: i, rgb: hex(L.color),
        tex: self.tex(plateTex(L)),
        label: self.tex(labelTex(L)),
        alpha: 1,
      };
    });

    this.nodes = [];
    this.layers.forEach(function (L) {
      var m = L.def.products.length;
      L.def.products.forEach(function (pid, k) {
        if (!products[pid]) return;
        var phase = -Math.PI / 2 + L.i * 0.82;
        var a = phase + k * (Math.PI * 2 / m);
        var rr2 = 0.56 + (L.i % 3) * 0.11;
        self.nodes.push({
          pid: pid, layer: L,
          x: Math.cos(a) * self.PW * 0.5 * rr2,
          y: Math.sin(a) * self.PH * 0.5 * rr2,
          lift: 0.30, liftT: 0.30, tex: null,
        });
      });
    });
    this.loadIcons();
    this.bind();
    this.resize();
    window.addEventListener("resize", function () { self.resize(); });

    this.last = performance.now();
    this.running = true;
    this.loop = function (t) { if (self.running) { self.frame(t); requestAnimationFrame(self.loop); } };
    requestAnimationFrame(this.loop);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !self.running) { self.running = true; self.last = performance.now(); requestAnimationFrame(self.loop); }
          else if (!e.isIntersecting) self.running = false;
        });
      }, { threshold: 0 }).observe(host);
    }
  }

  Stage.prototype.tex = function (canvas) {
    var gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    return t;
  };

  Stage.prototype.loadIcons = function () {
    var self = this;
    this.nodes.forEach(function (n) {
      n.tex = self.tex(chipTex(null, n.layer.def.color));
      var src = self.icons[n.pid];
      if (!src) return;
      var im = new Image();
      im.onload = function () {
        self.gl.deleteTexture(n.tex);
        n.tex = self.tex(chipTex(im, n.layer.def.color));
      };
      im.src = src;
    });
  };

  Stage.prototype.resize = function () {
    var r = this.host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };

  Stage.prototype.bind = function () {
    var self = this, host = this.host;
    var drag = false, lx = 0, ly = 0, moved = 0, id = null;

    host.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".stage-chrome")) return;
      drag = true; moved = 0; lx = e.clientX; ly = e.clientY; id = e.pointerId;
      host.classList.add("grabbing"); host.setPointerCapture(id);
    });
    host.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      self.mx = e.clientX - r.left; self.my = e.clientY - r.top;
      if (!drag) { self.pick(); return; }
      var dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      self.az -= dx * 0.0042;
      // Vertical drag is inverted: drag DOWN to climb toward a top-down view,
      // drag UP to drop toward a side-on view.
      self.el = clampEl(self.el + dy * 0.0030);
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      host.addEventListener(ev, function () {
        if (drag && moved < 6) self.click();
        drag = false; host.classList.remove("grabbing");
        if (id !== null) { try { host.releasePointerCapture(id); } catch (x) {} id = null; }
      });
    });
    host.addEventListener("pointerleave", function () { drag = false; self.mx = self.my = -9999; self.pick(); });
    host.addEventListener("wheel", function (e) {
      e.preventDefault();
      self.distT = Math.max(15, Math.min(46, self.distT + e.deltaY * 0.022));
    }, { passive: false });
    host.addEventListener("keydown", function (e) {
      var s = 0.09;
      if (e.key === "ArrowLeft")  { self.az += s; e.preventDefault(); }
      if (e.key === "ArrowRight") { self.az -= s; e.preventDefault(); }
      if (e.key === "ArrowUp")    { self.el = clampEl(self.el - s); e.preventDefault(); }
      if (e.key === "ArrowDown")  { self.el = clampEl(self.el + s); e.preventDefault(); }
      if (e.key === "Enter" && self.hover) self.emit(self.hover.pid);
    });
  };

  Stage.prototype.pick = function () {
    if (this.mx == null || !this.vp) return;

    /* Sticky hover: once a chip is acquired it keeps hover until the pointer
       leaves a slightly larger radius. Without this, a cursor resting near the
       edge of a target flickers between hovered and not on every frame. */
    var cur = this.hover;
    if (cur && cur.hit && cur.hit.w > 0 && (!this.focus || cur.layer.def.id === this.focus)) {
      var cd = Math.hypot(cur.hit.x - this.mx, cur.hit.y - this.my);
      if (cd < cur.hit.r * 1.45) return;
    }

    var best = null, bd = 1e9;
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i];
      if (this.focus && n.layer.def.id !== this.focus) continue;
      if (!n.hit || n.hit.w <= 0) continue;
      var d = Math.hypot(n.hit.x - this.mx, n.hit.y - this.my);
      if (d < n.hit.r && d < bd) { bd = d; best = n; }
    }
    if (best !== this.hover) {
      this.hover = best;
      this.host.style.cursor = best ? "pointer" : "";
      if (this.onHover) this.onHover(best);
    }
  };
  Stage.prototype.click = function () { if (this.hover) this.emit(this.hover.pid); };
  Stage.prototype.emit = function (pid) { this.selected = pid; if (this.onSelect) this.onSelect(pid); };

  Stage.prototype.draw = function (tex, tint, alpha, mat, add) {
    var gl = this.gl;
    gl.blendFunc(gl.SRC_ALPHA, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1f(this.u.useTex, tex ? 1 : 0);
    gl.uniform4f(this.u.tint, tint[0], tint[1], tint[2], tint[3] == null ? 1 : tint[3]);
    gl.uniform1f(this.u.alpha, alpha);
    gl.uniformMatrix4fv(this.u.M, false, mat);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  /* billboard quads */
  Stage.prototype.bb = function (pos, size) {
    var c = Math.cos(this.az + Math.PI / 2), s = Math.sin(this.az + Math.PI / 2);
    var ce = Math.cos(Math.PI / 2 - this.el), se = Math.sin(Math.PI / 2 - this.el);
    var o = m4();
    o[0] = c * size;       o[1] = s * size;       o[2] = 0;
    o[4] = -s * ce * size; o[5] = c * ce * size;  o[6] = se * size;
    o[12] = pos[0]; o[13] = pos[1]; o[14] = pos[2];
    return o;
  };
  Stage.prototype.bbZ = function (pos, w, h) {
    var c = Math.cos(this.az + Math.PI / 2), s = Math.sin(this.az + Math.PI / 2);
    var o = m4();
    o[0] = c * w; o[1] = s * w; o[2] = 0;
    o[4] = 0;     o[5] = 0;     o[6] = h;
    o[12] = pos[0]; o[13] = pos[1]; o[14] = pos[2];
    return o;
  };

  Stage.prototype.frame = function (t) {
    var gl = this.gl, dt = Math.min(64, t - this.last) / 1000; this.last = t;
    var n = this.layers.length;

    this.gap = lerp(this.gap, this.gapTarget, Math.min(1, dt * 5));
    this.dist = lerp(this.dist, this.distT, Math.min(1, dt * 5));
    if (this.spinning) this.az -= dt * 0.085;

    var top = (n - 1) * this.gap, midZ = top / 2;
    var ce = Math.cos(this.el), se = Math.sin(this.el);
    var eye = [Math.cos(this.az) * ce * this.dist, Math.sin(this.az) * ce * this.dist, midZ + se * this.dist];
    var V = lookAt(eye, [0, 0, midZ], [0, 0, 1]);
    var P = perspective(0.72, this.w / this.h, 0.5, 200);
    var vp = mul(P, V); this.vp = vp;
    gl.uniformMatrix4fv(this.u.VP, false, vp);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var items = [];
    function viewZ(p) { return V[2]*p[0] + V[6]*p[1] + V[10]*p[2] + V[14]; }

    for (var i = 0; i < n; i++) {
      var L = this.layers[i], z = i * this.gap;
      var tgt = (!this.focus || this.focus === L.def.id) ? 1 : 0.10;
      L.alpha = lerp(L.alpha, tgt, Math.min(1, dt * 6));
      items.push({ z: viewZ([0,0,z]), tex: L.tex, tint: [1,1,1,1], a: L.alpha,
                   m: model([0,0,z], this.PW, this.PH), add: false });
      // edge label, standing upright just off the +X edge and facing the camera
      var lp = [this.PW * 0.5 + 1.35, 0, z + 0.42];
      items.push({ z: viewZ(lp) + 0.02, tex: L.label, tint: [1,1,1,1], a: L.alpha,
                   m: this.bbZ(lp, 5.6, 0.70), add: false });
    }

    var spineA = this.focus ? 0.10 : 0.5;
    items.push({ z: viewZ([0,0,midZ]) + 0.01, tex: this.line, tint: [1, 0.90, 0.0, 1],
                 a: spineA, m: this.bbZ([0,0,midZ], 0.16, top + 1.2), add: true });
    if (!REDUCED) {
      for (var q = 0; q < 3; q++) {
        var k = ((t / 3400) + q / 3) % 1;
        var pz = k * top;
        items.push({ z: viewZ([0,0,pz]) + 0.02, tex: this.glow, tint: [1, 0.94, 0.25, 1],
                     a: Math.sin(k * Math.PI) * 0.8 * (this.focus ? 0.2 : 1),
                     m: this.bb([0,0,pz], 1.5), add: true });
      }
    }

    for (var j = 0; j < this.nodes.length; j++) {
      var nd = this.nodes[j], LL = nd.layer;
      var hot = (this.hover === nd) || (this.selected === nd.pid);
      nd.liftT = hot ? 1.15 : 0.30;
      nd.lift = lerp(nd.lift, nd.liftT, Math.min(1, dt * 9));
      var nz = LL.i * this.gap + nd.lift;
      var pos = [nd.x, nd.y, nz];
      var a = LL.alpha;

      var s = project(vp, pos);
      if (s.w > 0) {
        var rgt = [Math.cos(this.az + Math.PI / 2), Math.sin(this.az + Math.PI / 2), 0];
        var e = project(vp, [nd.x + rgt[0] * 0.81, nd.y + rgt[1] * 0.81, nz]);
        nd.scr = {
          x: (s.x * 0.5 + 0.5) * this.w,
          y: (-s.y * 0.5 + 0.5) * this.h,
          r: Math.max(22, Math.abs((e.x - s.x) * 0.5 * this.w)),
          w: s.w,
        };
      } else nd.scr = null;

      /* Hit target is the chip's RESTING position, never the animated one.
         Hovering lifts the chip toward the camera, which moves it on screen;
         testing against that moving position made a hovered chip slide out
         from under the cursor and oscillate. The target now stays put. */
      var rz = LL.i * this.gap + 0.30;
      var hs = project(vp, [nd.x, nd.y, rz]);
      if (hs.w > 0) {
        var hr = [Math.cos(this.az + Math.PI / 2), Math.sin(this.az + Math.PI / 2), 0];
        var he = project(vp, [nd.x + hr[0] * 0.81, nd.y + hr[1] * 0.81, rz]);
        nd.hit = {
          x: (hs.x * 0.5 + 0.5) * this.w,
          y: (-hs.y * 0.5 + 0.5) * this.h,
          r: Math.max(22, Math.abs((he.x - hs.x) * 0.5 * this.w)),
          w: hs.w,
        };
      } else nd.hit = null;

      var stemH = nd.lift;
      items.push({ z: viewZ([nd.x, nd.y, LL.i * this.gap + stemH / 2]) - 0.001, tex: this.line,
                   tint: [LL.rgb[0], LL.rgb[1], LL.rgb[2], 1], a: a * 0.7,
                   m: this.bbZ([nd.x, nd.y, LL.i * this.gap + stemH / 2], 0.075, stemH), add: true });
      items.push({ z: viewZ(pos) - 0.0005, tex: this.glow,
                   tint: [LL.rgb[0], LL.rgb[1], LL.rgb[2], 1],
                   a: a * (hot ? 0.8 : 0.28), m: model(pos, hot ? 4.2 : 3.1, hot ? 4.2 : 3.1), add: true });
      items.push({ z: viewZ(pos), tex: nd.tex, tint: [1,1,1,1], a: a,
                   m: this.bb(pos, 1.62), add: false });
    }

    items.sort(function (a, b) { return a.z - b.z; });
    for (var d = 0; d < items.length; d++) {
      var it = items[d];
      this.draw(it.tex, it.tint, it.a, it.m, it.add);
    }
    if (this.onFrame) this.onFrame();
  };

  Stage.prototype.setFocus = function (id) { this.focus = (this.focus === id) ? null : id; return this.focus; };
  Stage.prototype.setExplode = function (on) {
    this.exploded = on;
    this.gapTarget = on ? 4.6 : 2.75;
    this.distT = on ? 37 : 29.5;
  };
  Stage.prototype.setSpin = function (on) { this.spinning = on; };
  Stage.prototype.resetView = function () {
    this.az = -0.62; this.el = 0.72; this.distT = this.exploded ? 37 : 29.5;
  };
  Stage.prototype.select = function (pid) { this.selected = pid; };

  window.BizStack = Stage;
})();

