/* ============================================================================
 *  EY BizApps - ey-gl.js
 *  Minimal dependency-free WebGL renderer for the BizApps City masterplan.
 *  ---------------------------------------------------------------------------
 *  Why this exists
 *    The v1 city was a 2D canvas faking isometric depth with a painter's sort.
 *    That is why the depth key had to be patched for orbit angles, why picking
 *    was a proximity circle, and why the scene could only be sold with motion.
 *    This replaces all of it with real 3D:
 *      - hardware depth buffer, so occlusion is correct at every camera angle
 *      - a single batched draw call for the whole city
 *      - a shadow map from a fixed key light
 *      - colour-ID picking, so a click hits the pixel you clicked
 *
 *  Conventions
 *    World is Z-up, metres. X east, Y north.
 *    Classic script, no modules, so it loads over file:// as well as http.
 * ========================================================================== */
(function (root) {
  "use strict";

  /* ========================================================== 1. MATH ===== */
  var M4 = {
    ident: function () {
      return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    },
    mul: function (a, b, out) {
      out = out || new Float32Array(16);
      for (var c = 0; c < 4; c++) {
        for (var r = 0; r < 4; r++) {
          var s = 0;
          for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
          out[c * 4 + r] = s;
        }
      }
      return out;
    },
    persp: function (fovy, aspect, near, far) {
      var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      return new Float32Array([
        f / aspect,0,0,0,
        0,f,0,0,
        0,0,(far + near) * nf,-1,
        0,0,2 * far * near * nf,0
      ]);
    },
    ortho: function (l, r, b, t, n, f) {
      var lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
      return new Float32Array([
        -2 * lr,0,0,0,
        0,-2 * bt,0,0,
        0,0,2 * nf,0,
        (l + r) * lr,(t + b) * bt,(f + n) * nf,1
      ]);
    },
    look: function (eye, tgt, up) {
      var zx = eye[0] - tgt[0], zy = eye[1] - tgt[1], zz = eye[2] - tgt[2];
      var zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
      var xx = up[1] * zz - up[2] * zy,
          xy = up[2] * zx - up[0] * zz,
          xz = up[0] * zy - up[1] * zx;
      var xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
      var yx = zy * xz - zz * xy,
          yy = zz * xx - zx * xz,
          yz = zx * xy - zy * xx;
      return new Float32Array([
        xx,yx,zx,0,
        xy,yy,zy,0,
        xz,yz,zz,0,
        -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
        -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
        -(zx * eye[0] + zy * eye[1] + zz * eye[2]),1
      ]);
    },
    /* project a world point to normalised device coords, then to pixels */
    project: function (m, x, y, z, w, h) {
      var cx = m[0]*x + m[4]*y + m[8]*z  + m[12],
          cy = m[1]*x + m[5]*y + m[9]*z  + m[13],
          cw = m[3]*x + m[7]*y + m[11]*z + m[15];
      if (cw <= 0.0001) return null;
      return { x: (cx / cw * 0.5 + 0.5) * w, y: (1 - (cy / cw * 0.5 + 0.5)) * h, w: cw };
    }
  };

  /* ================================================== 2. MESH BUILDER ===== */
  /* Accumulates interleaved geometry for the whole scene into flat arrays.
     Every vertex carries an object id so one draw call can render the entire
     city and still support per-object picking and highlight. */
  function Builder() {
    this.p = []; this.n = []; this.c = []; this.i = []; this.a = []; this.e = [];
    this.T = null;
    this.EM = 0;          // current emissive level, applied to new vertices
  }
  /* Emissive is a per-vertex multiplier on the base colour, added after
     lighting. It exists so signage and lamp heads can read as lit without a
     bloom pass and without lighting the rest of the model. */
  Builder.prototype.emis = function (v) { this.EM = v || 0; return this; };
  /* Non-uniform scale about a ground anchor, so a massing routine can be
     authored at a convenient size and then placed and scaled. The normal is
     corrected by the inverse transpose, which for an axis scale is just the
     reciprocal per axis - without it every lit face on a scaled landmark
     would be subtly wrong. */
  Builder.prototype.xform = function (ox, oy, sxy, sz) {
    this.T = { ox: ox, oy: oy, s: sxy, sz: sz === undefined ? sxy : sz };
    return this;
  };
  Builder.prototype.xformEnd = function () { this.T = null; return this; };
  Builder.prototype.vert = function (x, y, z, nx, ny, nz, col, id, ao) {
    var T = this.T;
    if (T) {
      x = T.ox + (x - T.ox) * T.s;
      y = T.oy + (y - T.oy) * T.s;
      z = z * T.sz;
      nx /= T.s; ny /= T.s; nz /= T.sz;
      var l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    }
    this.p.push(x, y, z); this.n.push(nx, ny, nz);
    this.c.push(col[0], col[1], col[2]); this.i.push(id);
    this.a.push(ao === undefined ? 1 : ao);
    this.e.push(this.EM);
  };
  /* a planar quad, wound a-b-c-d; normal derived from the first triangle */
  Builder.prototype.quad = function (a, b, c, d, col, id, aoTop, aoBot) {
    var ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
    var vx = d[0]-a[0], vy = d[1]-a[1], vz = d[2]-a[2];
    var nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
    var l = Math.hypot(nx, ny, nz) || 1; nx/=l; ny/=l; nz/=l;
    var t = aoTop === undefined ? 1 : aoTop, o = aoBot === undefined ? t : aoBot;
    this.vert(a[0],a[1],a[2], nx,ny,nz, col, id, o);
    this.vert(b[0],b[1],b[2], nx,ny,nz, col, id, o);
    this.vert(c[0],c[1],c[2], nx,ny,nz, col, id, t);
    this.vert(a[0],a[1],a[2], nx,ny,nz, col, id, o);
    this.vert(c[0],c[1],c[2], nx,ny,nz, col, id, t);
    this.vert(d[0],d[1],d[2], nx,ny,nz, col, id, t);
  };
  Builder.prototype.tri = function (a, b, c, col, id, ao) {
    var ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
    var vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
    var nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
    var l = Math.hypot(nx, ny, nz) || 1;
    this.vert(a[0],a[1],a[2], nx/l,ny/l,nz/l, col, id, ao);
    this.vert(b[0],b[1],b[2], nx/l,ny/l,nz/l, col, id, ao);
    this.vert(c[0],c[1],c[2], nx/l,ny/l,nz/l, col, id, ao);
  };
  /* axis-aligned box; z is the base, h the height. Contact darkening is baked
     into the vertex AO term so the model reads as grounded without an SSAO
     pass. */
  Builder.prototype.box = function (x, y, z, w, d, h, col, id, aoBase) {
    var x0=x-w/2, x1=x+w/2, y0=y-d/2, y1=y+d/2, z0=z, z1=z+h;
    var ab = aoBase === undefined ? 0.55 : aoBase;
    /* every face wound counter-clockwise seen from outside, and the first two
       vertices of each side are the base pair so the AO term darkens the
       ground contact rather than the parapet */
    this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1], col, id, 1, 1);      // top   +Z
    this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1], col, id, 1, ab);     // south -Y
    this.quad([x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1], col, id, 1, ab);     // north +Y
    this.quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1], col, id, 1, ab);     // east  +X
    this.quad([x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1], col, id, 1, ab);     // west  -X
  };
  /* box whose top face is inset by `shrink` - the setback that makes a tower
     read as designed rather than extruded */
  Builder.prototype.taper = function (x, y, z, w, d, h, shrink, col, id, aoBase) {
    var s = shrink, z0 = z, z1 = z + h;
    var b = [[x-w/2,y-d/2],[x+w/2,y-d/2],[x+w/2,y+d/2],[x-w/2,y+d/2]];
    var t = [[x-w*s/2,y-d*s/2],[x+w*s/2,y-d*s/2],[x+w*s/2,y+d*s/2],[x-w*s/2,y+d*s/2]];
    var ab = aoBase === undefined ? 0.55 : aoBase;
    for (var k = 0; k < 4; k++) {
      var k2 = (k + 1) % 4;
      this.quad([b[k][0],b[k][1],z0],[b[k2][0],b[k2][1],z0],
                [t[k2][0],t[k2][1],z1],[t[k][0],t[k][1],z1], col, id, 1, ab);
    }
    this.quad([t[0][0],t[0][1],z1],[t[1][0],t[1][1],z1],
              [t[2][0],t[2][1],z1],[t[3][0],t[3][1],z1], col, id, 1, 1);
  };
  /* n-sided prism, optionally tapered from rb to rt */
  Builder.prototype.prism = function (cx, cy, z, rb, rt, h, n, rot, col, id, aoBase) {
    var i, a0, a1, p0, p1, q0, q1;
    var ab = aoBase === undefined ? 0.55 : aoBase;
    var top = [];
    for (i = 0; i < n; i++) {
      a0 = rot + i / n * Math.PI * 2; a1 = rot + (i + 1) / n * Math.PI * 2;
      p0 = [cx + Math.cos(a0) * rb, cy + Math.sin(a0) * rb, z];
      p1 = [cx + Math.cos(a1) * rb, cy + Math.sin(a1) * rb, z];
      q1 = [cx + Math.cos(a1) * rt, cy + Math.sin(a1) * rt, z + h];
      q0 = [cx + Math.cos(a0) * rt, cy + Math.sin(a0) * rt, z + h];
      this.quad(p0, p1, q1, q0, col, id, 1, ab);
      top.push(q0);
    }
    for (i = 1; i < n - 1; i++) this.tri(top[0], top[i], top[i + 1], col, id, 1);
  };
  /* hipped / pitched roof over a rectangular plan */
  Builder.prototype.roof = function (x, y, z, w, d, h, col, id) {
    var x0=x-w/2, x1=x+w/2, y0=y-d/2, y1=y+d/2;
    var rx0 = x - w * 0.16, rx1 = x + w * 0.16, rz = z + h;
    this.quad([x0,y0,z],[x1,y0,z],[rx1,y,rz],[rx0,y,rz], col, id, 1, 0.9);
    this.quad([x1,y1,z],[x0,y1,z],[rx0,y,rz],[rx1,y,rz], col, id, 1, 0.9);
    this.tri([x1,y0,z],[x1,y1,z],[rx1,y,rz], col, id, 0.86);
    this.tri([x0,y1,z],[x0,y0,z],[rx0,y,rz], col, id, 0.86);
  };
  Builder.prototype.count = function () { return this.i.length; };

  /* ==================================================== 3. GL HELPERS ===== */
  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error("shader: " + gl.getShaderInfoLog(s));
    }
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error("link: " + gl.getProgramInfoLog(p));
    }
    /* cache locations so the draw path never calls getUniformLocation */
    p.u = {}; p.a = {};
    var i, nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (i = 0; i < nu; i++) {
      var un = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, "");
      p.u[un] = gl.getUniformLocation(p, un);
    }
    var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (i = 0; i < na; i++) {
      var an = gl.getActiveAttrib(p, i).name;
      p.a[an] = gl.getAttribLocation(p, an);
    }
    return p;
  }
  /* An inactive or optimised-away uniform has no location. Handing `undefined`
     to gl.uniform* is an error on some drivers and silently wrong on others,
     so every upload goes through these. */
  function u1f(gl, p, n, v) { if (p.u[n]) gl.uniform1f(p.u[n], v); }
  function u1i(gl, p, n, v) { if (p.u[n]) gl.uniform1i(p.u[n], v); }
  function u3f(gl, p, n, v) { if (p.u[n]) gl.uniform3fv(p.u[n], v); }
  function um4(gl, p, n, v) { if (p.u[n]) gl.uniformMatrix4fv(p.u[n], false, v); }

  function buffer(gl, data, size) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    b.size = size; b.n = data.length / size;
    return b;
  }

  /* ======================================================== 4. SHADERS ==== */
  /* GLSL ES 1.00 so a single shader set runs on both WebGL1 and WebGL2. */

  var VS_MAIN = [
    "precision highp float;",
    "attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol;",
    "attribute float aId; attribute float aAo; attribute float aEm;",
    "uniform mat4 uVP; uniform mat4 uLVP;",
    "uniform float uSel; uniform float uHov;",
    "varying vec3 vN; varying vec3 vC; varying float vAo; varying float vEm;",
    "varying vec4 vLp; varying float vSel; varying float vHov; varying vec3 vW;",
    "void main(){",
    "  vec3 p = aPos;",
    /* Selection and hover are carried to the fragment stage as flags. The
       geometry is never displaced: lifting the selected mass opened a visible
       gap between its plinth and its plaza. */
    "  float sel = (abs(aId - uSel) < 0.5) ? 1.0 : 0.0;",
    "  float hov = (abs(aId - uHov) < 0.5) ? 1.0 : 0.0;",
    "  vN = aNrm; vC = aCol; vAo = aAo; vEm = aEm; vW = p;",
    "  vSel = sel; vHov = hov;",
    "  vLp = uLVP * vec4(p, 1.0);",
    "  gl_Position = uVP * vec4(p, 1.0);",
    "}"
  ].join("\n");

  var FS_MAIN = [
    "precision highp float;",
    "varying vec3 vN; varying vec3 vC; varying float vAo; varying float vEm;",
    "varying vec4 vLp; varying float vSel; varying float vHov; varying vec3 vW;",
    "uniform vec3 uLdir; uniform vec3 uSky; uniform vec3 uGrd;",
    "uniform vec3 uFog; uniform vec3 uEye; uniform float uHasSel;",
    "uniform sampler2D uShadow; uniform float uHasShadow; uniform float uFar;",
    "float shade(vec4 lp){",
    "  if(uHasShadow < 0.5) return 1.0;",
    "  vec3 q = lp.xyz / lp.w * 0.5 + 0.5;",
    "  if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0||q.z>1.0) return 1.0;",
    /* 4-tap PCF: enough to soften the edge without banding on flat facades */
    "  float s = 0.0; float b = 0.0025;",
    "  for(int i=0;i<4;i++){",
    "    vec2 o = vec2(float(i==1||i==3)-0.5, float(i==2||i==3)-0.5) * 0.0018;",
    "    float d = texture2D(uShadow, q.xy + o).r;",
    "    s += (q.z - b > d) ? 0.0 : 1.0;",
    "  }",
    "  return s * 0.25;",
    "}",
    "void main(){",
    "  vec3 n = normalize(vN);",
    "  float ndl = max(dot(n, uLdir), 0.0);",
    /* hemisphere ambient: sky above, bounced ground below. This is what makes
       a matte massing model read as architecture rather than flat shading. */
    "  float hemi = n.z * 0.5 + 0.5;",
    "  vec3 amb = mix(uGrd, uSky, hemi);",
    "  float sh = shade(vLp);",
    "  vec3 col = vC * (amb + ndl * 1.22 * sh);",
    "  col *= mix(0.62, 1.0, vAo);",
    /* grazing-angle sheen, kept low so glass reads as stone-and-glass and not
       as a video game specular */
    "  vec3 v = normalize(uEye - vW);",
    "  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);",
    "  col += uSky * fres * 0.16;",
    "  col += vC * vEm * 2.1;",
    "  float other = (uHasSel > 0.5 && vSel < 0.5) ? 1.0 : 0.0;",
    "  col *= mix(1.0, 0.34, other);",
    "  col *= 1.0 + vSel * 0.16 + vHov * 0.13;",
    /* Distance haze. Exponential rather than the old quadratic ramp: the
       ground plane has to be fully absorbed before its edge reaches the
       frame, or the city sits on a visible square. */
    "  float d = length(uEye - vW);",
    "  float fg = 1.0 - exp(-pow(d / uFar, 1.65) * 3.4);",
    "  col = mix(col, uFog, clamp(fg, 0.0, 0.97));",
    /* Lighting above is done in linear space, which is the only way the matte
       stone reads correctly against the dark fabric. Encode back to sRGB on
       the way out. */
    "  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);",
    "}"
  ].join("\n");

  var VS_FLAT = [
    "precision highp float;",
    "attribute vec3 aPos; attribute float aId;",
    "uniform mat4 uVP;",
    "varying float vId;",
    "void main(){ vec3 p=aPos;",
    "  vId=aId; gl_Position = uVP * vec4(p,1.0); }"
  ].join("\n");

  /* object id -> rgb. 65k ids is far more than this scene needs, but it costs
     nothing and removes any ceiling on scene complexity. */
  var FS_PICK = [
    "precision highp float;",
    "varying float vId;",
    "void main(){",
    "  float id = vId + 1.0;",
    "  float r = floor(id / 65536.0);",
    "  float g = floor(mod(id, 65536.0) / 256.0);",
    "  float b = mod(id, 256.0);",
    "  gl_FragColor = vec4(r/255.0, g/255.0, b/255.0, 1.0);",
    "}"
  ].join("\n");

  /* ---- decals -------------------------------------------------------------
     A world-anchored textured quad, depth tested against the scene so it is
     occluded correctly. This is how the EY mark is placed on the HQ: the real
     brand asset, drawn at its own aspect ratio, never redrawn as geometry. */
  var VS_DECAL = [
    "precision highp float;",
    "attribute vec3 aPos; attribute vec2 aUV;",
    "uniform mat4 uVP;",
    "varying vec2 vUV; varying vec3 vW;",
    "void main(){ vUV = aUV; vW = aPos; gl_Position = uVP * vec4(aPos,1.0); }"
  ].join("\n");

  var FS_DECAL = [
    "precision highp float;",
    "varying vec2 vUV; varying vec3 vW;",
    "uniform sampler2D uTex; uniform float uDim; uniform vec3 uFog;",
    "uniform vec3 uEye; uniform float uFar;",
    "void main(){",
    "  vec4 t = texture2D(uTex, vUV);",
    "  if (t.a < 0.02) discard;",
    "  vec3 col = t.rgb * uDim;",
    /* same haze as the scene, so a decal never floats out of the atmosphere */
    "  float d = length(uEye - vW);",
    "  float fg = 1.0 - exp(-pow(d / uFar, 1.65) * 3.4);",
    "  col = mix(col, uFog, clamp(fg, 0.0, 0.97));",
    "  gl_FragColor = vec4(pow(max(col,0.0), vec3(1.0/2.2)), t.a);",
    "}"
  ].join("\n");

  var FS_DEPTH = [
    "precision highp float;",
    "void main(){ gl_FragColor = vec4(1.0); }"
  ].join("\n");

  /* ========================================================= 5. CAMERA ==== */
  /* Orbit camera in spherical coordinates around a target on the ground.
     Everything is a target/current pair so the view is always critically
     damped - no snapping, and no inertia that overshoots and has to settle. */
  function Camera() {
    this.tgt = [0, 0, 0]; this.tgtT = [0, 0, 0];
    this.az = -0.72; this.azT = -0.72;
    this.el = 0.52;  this.elT = 0.52;
    this.dist = 150; this.distT = 150;
    this.fov = 0.46;               // ~26 deg: mild perspective, model-like
    this.minEl = 0.10; this.maxEl = 1.40;
    this.minD = 18;    this.maxD = 420;
  }
  Camera.prototype.eye = function () {
    var ce = Math.cos(this.el), se = Math.sin(this.el);
    return [
      this.tgt[0] + Math.cos(this.az) * ce * this.dist,
      this.tgt[1] + Math.sin(this.az) * ce * this.dist,
      this.tgt[2] + se * this.dist
    ];
  };
  Camera.prototype.step = function (k) {
    k = k === undefined ? 0.12 : k;
    this.az   += (this.azT   - this.az)   * k;
    this.el   += (this.elT   - this.el)   * k;
    this.dist += (this.distT - this.dist) * k;
    for (var i = 0; i < 3; i++) this.tgt[i] += (this.tgtT[i] - this.tgt[i]) * k;
  };
  Camera.prototype.settled = function () {
    return Math.abs(this.azT - this.az) < 1e-4 &&
           Math.abs(this.elT - this.el) < 1e-4 &&
           Math.abs(this.distT - this.dist) < 0.02 &&
           Math.abs(this.tgtT[0] - this.tgt[0]) < 0.02 &&
           Math.abs(this.tgtT[1] - this.tgt[1]) < 0.02 &&
           Math.abs(this.tgtT[2] - this.tgt[2]) < 0.02;
  };
  Camera.prototype.clamp = function () {
    this.elT = Math.max(this.minEl, Math.min(this.maxEl, this.elT));
    this.distT = Math.max(this.minD, Math.min(this.maxD, this.distT));
  };
  Camera.prototype.vp = function (aspect) {
    var far = this.dist * 4 + 400;
    var P = M4.persp(this.fov, aspect, 0.5, far);
    var V = M4.look(this.eye(), this.tgt, [0, 0, 1]);
    this.far = far;
    return M4.mul(P, V);
  };

  /* ======================================================= 6. RENDERER ==== */
  function Renderer(canvas, opts) {
    this.canvas = canvas;
    this.opts = opts || {};
    var attrs = { antialias: true, alpha: false, depth: true,
                  powerPreference: "high-performance" };
    var gl = canvas.getContext("webgl2", attrs);
    this.gl2 = !!gl;
    if (!gl) gl = canvas.getContext("webgl", attrs) ||
                  canvas.getContext("experimental-webgl", attrs);
    if (!gl) { this.failed = true; return; }
    this.gl = gl;

    /* depth textures are core in WebGL2 and an extension in WebGL1; without
       them the scene still renders, just without cast shadows */
    this.shadowOK = this.gl2 || !!gl.getExtension("WEBGL_depth_texture");

    this.progMain = program(gl, VS_MAIN, FS_MAIN);
    this.progPick = program(gl, VS_FLAT, FS_PICK);
    this.progDep  = program(gl, VS_FLAT, FS_DEPTH);
    this.progDec  = program(gl, VS_DECAL, FS_DECAL);
    this.decals = [];

    this.cam = new Camera();
    this.sel = -1; this.hover = -1;
    this.dpr = 1; this.w = 1; this.h = 1;

    /* All of these are LINEAR, because the shader lights in linear and encodes
       to sRGB at the end. Writing sRGB values here is what made the first
       pass of the model look washed out and plastic. */
    this.sky    = [0.132, 0.156, 0.214];   // hemisphere ambient, zenith
    this.ground = [0.034, 0.035, 0.046];   // hemisphere ambient, bounced
    this.fog    = [0.0098, 0.0138, 0.0258];// horizon haze  ~ #1A1F2C
    this.accent = [1.000, 0.787, 0.000];   // EY yellow #FFE600
    this.ldir   = (function () {
      var v = [0.46, 0.64, 0.62], l = Math.hypot(v[0], v[1], v[2]);
      return [v[0]/l, v[1]/l, v[2]/l];
    })();

    this._initTargets();
  }

  Renderer.prototype._initTargets = function () {
    var gl = this.gl;
    /* pick target: quarter res is ample, and keeps readPixels cheap */
    this.pickFbo = gl.createFramebuffer();
    this.pickTex = gl.createTexture();
    this.pickRb  = gl.createRenderbuffer();
    this.pickSize = [1, 1];

    if (this.shadowOK) {
      this.SHADOW = 2048;
      this.shFbo = gl.createFramebuffer();
      this.shTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.shTex);
      gl.texImage2D(gl.TEXTURE_2D, 0,
        this.gl2 ? gl.DEPTH_COMPONENT24 : gl.DEPTH_COMPONENT,
        this.SHADOW, this.SHADOW, 0, gl.DEPTH_COMPONENT,
        this.gl2 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
                              gl.TEXTURE_2D, this.shTex, 0);
      if (this.gl2) { gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); }
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        this.shadowOK = false;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  };

  /* upload a finished Builder as the static scene */
  Renderer.prototype.upload = function (b) {
    var gl = this.gl;
    this.bPos = buffer(gl, new Float32Array(b.p), 3);
    this.bNrm = buffer(gl, new Float32Array(b.n), 3);
    this.bCol = buffer(gl, new Float32Array(b.c), 3);
    this.bId  = buffer(gl, new Float32Array(b.i), 1);
    this.bAo  = buffer(gl, new Float32Array(b.a), 1);
    this.bEm  = buffer(gl, new Float32Array(b.e), 1);
    this.nVerts = b.i.length;
  };

  Renderer.prototype.resize = function () {
    var gl = this.gl, r = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * dpr)),
        h = Math.max(1, Math.round(r.height * dpr));
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.canvas.width = w; this.canvas.height = h;
    this.w = r.width; this.h = r.height; this.dpr = dpr;

    var pw = Math.max(1, Math.round(w / 4)), ph = Math.max(1, Math.round(h / 4));
    this.pickSize = [pw, ph];
    gl.bindTexture(gl.TEXTURE_2D, this.pickTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pw, ph, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, pw, ph);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickRb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  Renderer.prototype._attach = function (p, withShading) {
    var gl = this.gl;
    function bind(buf, loc) {
      if (loc === undefined || loc < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, buf.size, gl.FLOAT, false, 0, 0);
    }
    bind(this.bPos, p.a.aPos);
    bind(this.bId,  p.a.aId);
    if (withShading) {
      bind(this.bNrm, p.a.aNrm);
      bind(this.bCol, p.a.aCol);
      bind(this.bAo,  p.a.aAo);
      bind(this.bEm,  p.a.aEm);
    }
  };

  /* light matrix: an orthographic box that just contains the built area */
  Renderer.prototype._lightVP = function (radius) {
    var d = radius * 2.0;
    var eye = [this.ldir[0] * d, this.ldir[1] * d, this.ldir[2] * d];
    var P = M4.ortho(-radius, radius, -radius, radius, 1, d * 2.4);
    var V = M4.look(eye, [0, 0, 0], [0, 0, 1]);
    return M4.mul(P, V);
  };

  Renderer.prototype.draw = function (radius) {
    var gl = this.gl;
    if (!this.nVerts) return;
    var lvp = this._lightVP(radius || 120);

    /* ---- shadow pass ---- */
    if (this.shadowOK) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFbo);
      gl.viewport(0, 0, this.SHADOW, this.SHADOW);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      /* front-face culling in the depth pass removes almost all acne without
         needing a large constant bias that would detach the shadows */
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
      gl.useProgram(this.progDep);
      this._attach(this.progDep, false);
      um4(gl, this.progDep, 'uVP', lvp);
        gl.drawArrays(gl.TRIANGLES, 0, this.nVerts);
      gl.cullFace(gl.BACK);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* ---- main pass ---- */
    var aspect = this.canvas.width / this.canvas.height;
    var vp = this.cam.vp(aspect), eye = this.cam.eye();
    this.lastVP = vp;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.clearColor(this.fog[0], this.fog[1], this.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var p = this.progMain;
    gl.useProgram(p);
    this._attach(p, true);
    um4(gl, p, 'uVP', vp);
    um4(gl, p, 'uLVP', lvp);
    u3f(gl, p, 'uLdir', this.ldir);
    u3f(gl, p, 'uSky', this.sky);
    u3f(gl, p, 'uGrd', this.ground);
    u3f(gl, p, 'uFog', this.fog);
    u3f(gl, p, 'uEye', eye);
    u1f(gl, p, 'uSel', this.sel);
    u1f(gl, p, 'uHov', this.hover);
    u1f(gl, p, 'uHasSel', this.sel > 0 ? 1 : 0);
    u1f(gl, p, 'uFar', this.cam.far);
    u1f(gl, p, 'uHasShadow', this.shadowOK ? 1 : 0);
    if (this.shadowOK) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.shTex);
      u1i(gl, p, 'uShadow', 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, this.nVerts);

    this._drawDecals(vp, eye);
  };

  /* setDecals([{ img, p, right, up, w, h }])
       p      centre of the quad in world space
       right  unit vector across the quad
       up     unit vector up the quad
     The texture is uploaded once the image has decoded; until then the decal
     is simply skipped, so a slow asset never blocks a frame. */
  Renderer.prototype.setDecals = function (list) {
    var gl = this.gl, self = this;
    this.decals = (list || []).map(function (d) {
      var hw = d.w / 2, hh = d.h / 2, o = d.p, r = d.right, u = d.up;
      function corner(sx, sy) {
        return [o[0] + r[0]*hw*sx + u[0]*hh*sy,
                o[1] + r[1]*hw*sx + u[1]*hh*sy,
                o[2] + r[2]*hw*sx + u[2]*hh*sy];
      }
      var a = corner(-1,-1), b = corner(1,-1), c = corner(1,1), e = corner(-1,1);
      var verts = new Float32Array([
        a[0],a[1],a[2], 0,1,  b[0],b[1],b[2], 1,1,  c[0],c[1],c[2], 1,0,
        a[0],a[1],a[2], 0,1,  c[0],c[1],c[2], 1,0,  e[0],e[1],e[2], 0,0
      ]);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

      var rec = { buf: buf, tex: null };
      var im = new Image();
      im.onload = function () {
        var t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        rec.tex = t;
        if (self.onAsset) self.onAsset();
      };
      im.src = d.img;
      return rec;
    });
  };

  Renderer.prototype._drawDecals = function (vp, eye) {
    var gl = this.gl, p = this.progDec;
    if (!this.decals.length) return;
    gl.useProgram(p);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // premultiplied
    gl.depthMask(false);
    um4(gl, p, 'uVP', vp);
    u3f(gl, p, 'uEye', eye);
    u3f(gl, p, 'uFog', this.fog);
    u1f(gl, p, 'uFar', this.cam.far);
    u1f(gl, p, 'uDim', this.sel > 0 ? 0.34 : 1.0);
    for (var i = 0; i < this.decals.length; i++) {
      var d = this.decals[i];
      if (!d.tex) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, d.buf);
      gl.enableVertexAttribArray(p.a.aPos);
      gl.vertexAttribPointer(p.a.aPos, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(p.a.aUV);
      gl.vertexAttribPointer(p.a.aUV, 2, gl.FLOAT, false, 20, 12);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, d.tex);
      u1i(gl, p, 'uTex', 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  };

  /* Read one pixel out of the id buffer. Called on demand from pointermove,
     not every frame. */
  Renderer.prototype.pickAt = function (cssX, cssY) {
    var gl = this.gl;
    if (!this.nVerts) return -1;
    var pw = this.pickSize[0], ph = this.pickSize[1];
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.viewport(0, 0, pw, ph);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.progPick);
    this._attach(this.progPick, false);
    um4(gl, this.progPick, 'uVP',
        this.lastVP || this.cam.vp(this.canvas.width / this.canvas.height));
    gl.drawArrays(gl.TRIANGLES, 0, this.nVerts);

    var px = Math.floor(cssX / this.w * pw),
        py = Math.floor((1 - cssY / this.h) * ph);
    var out = new Uint8Array(4);
    if (px >= 0 && px < pw && py >= 0 && py < ph) {
      gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var id = out[0] * 65536 + out[1] * 256 + out[2] - 1;
    return id;
  };

  /* world -> screen, for HTML labels pinned to buildings */
  Renderer.prototype.toScreen = function (x, y, z) {
    if (!this.lastVP) return null;
    return M4.project(this.lastVP, x, y, z, this.w, this.h);
  };

  root.EYGL = {
    M4: M4, Builder: Builder, Camera: Camera, Renderer: Renderer
  };
})(window);
