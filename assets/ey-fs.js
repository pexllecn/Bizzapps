/* ============================================================================
 *  FULL SCREEN - shared by both pages
 *  ---------------------------------------------------------------------------
 *  The Fullscreen API is scoped to a DOCUMENT. The showcase and the city are
 *  two separate pages, so every link between them ("Back to the showcase",
 *  "Enter BizApps City", "Walk the city"...) tears fullscreen down on
 *  navigation. That is the browser working as specified, not a bug we can
 *  suppress - but it makes the control feel broken, because you enter full
 *  screen, click one link and you are back in a window.
 *
 *  The fix is to treat fullscreen as an INTENT that survives navigation:
 *
 *    1. The intent is recorded in sessionStorage when the user turns it on,
 *       and cleared when they turn it off.
 *    2. On the next page, if the intent is set but the document is not
 *       fullscreen, we re-enter. Browsers only grant fullscreen from a real
 *       user gesture, so we cannot do it on load - instead we arm a one-shot
 *       listener and restore on the user's very next click or keypress, which
 *       on these pages is almost always immediate.
 *    3. A discreet prompt tells the user why, so nothing happens unexplained.
 *
 *  Exposed as window.FS so each page can wire its own button to it.
 * ========================================================================== */
(function () {
  "use strict";

  var KEY = "bizapps.fullscreen";
  var doc = document;
  var el = doc.documentElement;

  function isFull() {
    return !!(doc.fullscreenElement || doc.webkitFullscreenElement ||
              doc.mozFullScreenElement || doc.msFullscreenElement);
  }
  function supported() {
    return !!(el.requestFullscreen || el.webkitRequestFullscreen ||
              el.mozRequestFullScreen || el.msRequestFullscreen);
  }
  function request() {
    var fn = el.requestFullscreen || el.webkitRequestFullscreen ||
             el.mozRequestFullScreen || el.msRequestFullscreen;
    if (!fn) return null;
    try { return fn.call(el); } catch (e) { return null; }
  }
  function release() {
    var fn = doc.exitFullscreen || doc.webkitExitFullscreen ||
             doc.mozCancelFullScreen || doc.msExitFullscreen;
    if (!fn) return;
    try { fn.call(doc); } catch (e) {}
  }

  function want(v) {
    try { v ? sessionStorage.setItem(KEY, "1") : sessionStorage.removeItem(KEY); }
    catch (e) {}
  }
  function wanted() {
    try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }

  /* The user pressed the button: intent follows the action. */
  function toggle() {
    if (isFull()) { want(false); release(); }
    else { want(true); request(); }
  }

  /* Leaving the page by a link is not "exiting fullscreen" - the intent must
     survive so the next page can restore it. Only an explicit exit clears it,
     which is handled in toggle() and in the Escape/F11 case below. */
  var navigating = false;
  window.addEventListener("pagehide", function () { navigating = true; });
  window.addEventListener("beforeunload", function () { navigating = true; });

  doc.addEventListener("fullscreenchange", onChange);
  doc.addEventListener("webkitfullscreenchange", onChange);
  function onChange() {
    // If we dropped out of fullscreen and it was NOT a navigation, the user
    // pressed Escape or F11, so respect that and forget the intent.
    if (!isFull() && !navigating) want(false);
    FS.emit();
  }

  /* Restore after navigation, on the first gesture we are allowed to use. */
  function arm() {
    if (!wanted() || isFull() || !supported()) return;

    var hint = doc.createElement("div");
    hint.className = "fs-restore";
    hint.setAttribute("role", "status");
    hint.innerHTML = '<span>Click anywhere to return to full screen</span>';
    doc.body.appendChild(hint);
    requestAnimationFrame(function () { hint.classList.add("on"); });

    function go() {
      off();
      request();
    }
    function dismiss(e) {
      // Escape means "no, stay windowed"
      if (e && e.key === "Escape") { want(false); off(); }
    }
    function off() {
      doc.removeEventListener("pointerdown", go, true);
      doc.removeEventListener("keydown", onKey, true);
      hint.classList.remove("on");
      setTimeout(function () { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 420);
    }
    function onKey(e) {
      if (e.key === "Escape") return dismiss(e);
      go();
    }
    doc.addEventListener("pointerdown", go, true);
    doc.addEventListener("keydown", onKey, true);

    // don't nag forever
    setTimeout(function () { if (hint.parentNode) off(); }, 12000);
  }

  var listeners = [];

  var FS = {
    isFull: isFull,
    supported: supported,
    toggle: toggle,
    /* Register a button; it is kept in sync automatically. */
    bind: function (btn, labelEl) {
      if (!btn) return;
      if (!supported()) { btn.style.display = "none"; return; }
      btn.addEventListener("click", toggle);
      listeners.push(function () {
        var on = isFull();
        btn.classList.toggle("on", on);
        if (labelEl) labelEl.textContent = on ? "Exit full screen" : "Full screen";
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      FS.emit();
    },
    onChange: function (fn) { listeners.push(fn); },
    emit: function () { listeners.forEach(function (f) { try { f(); } catch (e) {} }); },
  };

  window.FS = FS;

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", arm);
  else arm();
})();

