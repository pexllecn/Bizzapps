/* ============================================================================
 *  EY BizApps - igloo-room.js
 *  The channel that holds an Igloo room together: the walls, the floor and
 *  the controller.
 *  ---------------------------------------------------------------------------
 *  The walls own the room. They run the city, decide what is on screen and
 *  publish a small snapshot whenever it changes. The controller only sends
 *  commands; the floor only follows the snapshot. So there can never be two
 *  versions of what the room is showing.
 *
 *  Two transports, used together:
 *    1. BroadcastChannel - every surface open in one browser. Needs nothing.
 *    2. /api/room - a serverless endpoint over a key store, for when the
 *       Igloo PC and the facilitator's laptop are on different networks.
 *       Without a key store configured it answers 503 and the room says so
 *       ("This browser only") rather than pretending to be shared.
 *
 *  A wall that opens never replays commands sent before it opened: it starts
 *  from the current sequence number. A room left behind by an earlier
 *  session cannot drive a new one.
 * ========================================================================== */
(function (root) {
  "use strict";

  function roomCode() {
    var q = new URLSearchParams(root.location.search).get("room") || "main";
    return q.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32) || "main";
  }

  var API = "api/room";

  function Room(role) {
    this.role = role;                       // "wall" | "floor" | "control"
    this.code = roomCode();
    this.shared = null;                     // null unknown, true key store, false this browser only
    this.seq = 0;
    this.state = null;
    this.stateAt = 0;
    this.handlers = { command: [], state: [], status: [] };
    this.bc = null;
    try {
      this.bc = new BroadcastChannel("bizapps-igloo-" + this.code);
      var self = this;
      this.bc.onmessage = function (e) { self._local(e.data); };
    } catch (e) { this.bc = null; }
    this._poll = this._poll.bind(this);
    this._probe();
  }

  /* the same command can arrive twice, once over each transport */
  Room.prototype._command = function (c) {
    if (!c) return;
    this.seen = this.seen || {};
    if (c.id) { if (this.seen[c.id]) return; this.seen[c.id] = Date.now(); }
    this._emit("command", c);
  };

  Room.prototype.on = function (ev, fn) { this.handlers[ev].push(fn); return this; };
  Room.prototype._emit = function (ev, a) { this.handlers[ev].forEach(function (f) { try { f(a); } catch (e) { /* keep the room running */ } }); };

  Room.prototype._local = function (m) {
    if (!m || typeof m !== "object") return;
    if (m.kind === "cmd" && this.role === "wall") this._command(m.cmd);
    if (m.kind === "state" && this.role !== "wall") this._state(m.state);
    if (m.kind === "hello" && this.role === "wall" && this.state) this.publish(this.state, true);
  };

  Room.prototype._state = function (s) {
    if (!s) return;
    if (this.state && s.rev && this.state.rev && s.rev < this.state.rev && s.at <= this.state.at) return;
    this.state = s; this.stateAt = Date.now();
    this._emit("state", s);
  };

  /** Is there a key store behind /api/room? */
  Room.prototype._probe = function () {
    var self = this;
    fetch(API + "?room=" + this.code + "&since=0", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        self.shared = !!(j && j.shared);
        if (self.shared) {
          // a wall starts from now; it never replays what came before it
          if (self.role === "wall") self.seq = j.seq || 0;
          if (j.state && self.role !== "wall") self._state(j.state);
          self._timer = setTimeout(self._poll, 400);
        }
        self._emit("status", self.status());
      })
      .catch(function () { self.shared = false; self._emit("status", self.status()); });
    if (this.bc && this.role !== "wall") this.bc.postMessage({ kind: "hello" });
  };

  Room.prototype._poll = function () {
    var self = this;
    var busy = !document.hidden;
    fetch(API + "?room=" + this.code + "&since=" + this.seq, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) {
        self.fails = 0;
        if (self.role === "wall") {
          (j.cmds || []).forEach(function (c) { if (c.seq > self.seq) { self.seq = c.seq; self._command(c); } });
        } else if (j.state) self._state(j.state);
        if (j.seq > self.seq && self.role !== "wall") self.seq = j.seq;
      })
      .catch(function () { self.fails = (self.fails || 0) + 1; })
      .then(function () {
        self._emit("status", self.status());
        // brisk while the room is on screen, resting when it is not
        var wait = !busy ? 5000 : self.fails > 2 ? 4000 : self.role === "floor" ? 1200 : 700;
        self._timer = setTimeout(self._poll, wait);
      });
  };

  /** The walls publish what the room is showing. */
  Room.prototype.publish = function (state, force) {
    state.at = Date.now();
    state.rev = (this.state && this.state.rev || 0) + 1;
    this.state = state;
    if (this.bc) this.bc.postMessage({ kind: "state", state: state });
    if (!this.shared) return;
    var now = Date.now();
    // the clock-only heartbeat is throttled; anything the room can see is sent at once
    if (!force && state.beat && this._sentAt && now - this._sentAt < 10000) return;
    this._sentAt = now;
    fetch(API + "?room=" + this.code, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "state", state: state }) }).catch(function () {});
  };

  /** The controller sends a command; the walls decide what it means. */
  Room.prototype.send = function (cmd) {
    cmd.id = cmd.id || Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    if (this.bc) this.bc.postMessage({ kind: "cmd", cmd: cmd });
    if (!this.shared) return;
    fetch(API + "?room=" + this.code, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "cmd", cmd: cmd }) }).catch(function () {});
  };

  Room.prototype.status = function () {
    var live = this.state && Date.now() - this.state.at < 30000;
    return {
      reach: this.shared === null ? "checking" : this.shared ? (this.fails > 2 ? "store not answering" : "shared") : "this browser only",
      walls: this.role === "wall" ? true : !!live,
      room: this.code,
    };
  };

  root.ROOM = { connect: function (role) { return new Room(role); }, code: roomCode };
})(window);
