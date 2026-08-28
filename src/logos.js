/* ============================================================================
 *  LOGO SYSTEM  ·  single source of truth for every product / brand mark
 *  ---------------------------------------------------------------------------
 *  Real marks are inlined as data URIs at build time into window.ICONS[key]
 *  (build.sh reads icons/ and maps files to these keys). A key with no asset
 *  degrades to a NEUTRAL FALLBACK: a rounded square in the product's official
 *  brand colour carrying a short monogram — never a drawn approximation of the
 *  real mark — and logs a console warning naming the missing key.
 * ========================================================================== */
(function () {
  const M = {
    // key                    label                               brand      mono
    "microsoft":            ["Microsoft",                         "#5E5E5E", "MS"],
    "dynamics365":          ["Dynamics 365",                      "#0B53CE", "365"],
    "d365-contact-center":  ["Dynamics 365 Contact Center",       "#0B53CE", "CC"],
    "d365-customer-service":["Dynamics 365 Customer Service",     "#0B53CE", "CS"],
    "d365-field-service":   ["Dynamics 365 Field Service",        "#0B53CE", "FS"],
    "d365-sales":           ["Dynamics 365 Sales",                "#0B53CE", "Sa"],
    "d365-project-ops":     ["Dynamics 365 Project Operations",   "#0B53CE", "PO"],
    "power-apps":           ["Power Apps",                        "#742774", "PA"],
    "power-automate":       ["Power Automate",                    "#0066FF", "PU"],
    "power-bi":             ["Power BI",                          "#E8A200", "BI"],
    "power-pages":          ["Power Pages",                       "#0E7C8B", "PP"],
    "power-platform":       ["Power Platform",                    "#742774", "PP"],
    "dataverse":            ["Dataverse",                         "#916AC8", "DV"],
    "copilot":              ["Copilot",                           "#7A5CD6", "Co"],
    "copilot-studio":       ["Copilot Studio",                    "#7A5CD6", "CS"],
    "azure":                ["Azure",                             "#0078D4", "Az"],
    "azure-ai":             ["Azure AI",                          "#0078D4", "AI"],
    "fabric":               ["Microsoft Fabric",                  "#117865", "Fa"],
    "purview":              ["Microsoft Purview",                 "#3B7A3D", "Pv"],
    "teams":                ["Microsoft Teams",                   "#5B5FC7", "Te"],
    "sharepoint":           ["SharePoint",                        "#036C70", "SP"],
    "m365":                 ["Microsoft 365",                     "#D83B01", "365"],
    // solution-marker icons (Microsoft Fluent Emoji, 3D style — MIT licensed,
    // see icons/THIRD_PARTY_LICENSES.md) — what the solution IS, not an
    // invented building type
    "iso-civic":            ["Customer contact",                  "#5B5FC7", "CC"],
    "iso-cloud":            ["AI & cloud",                        "#6C7BC9", "AI"],
    "iso-app":              ["Application",                       "#742774", "Ap"],
    "iso-chart":            ["Insight & reporting",               "#2E7AD1", "In"],
    "iso-portal":           ["Self-service portal",               "#0E7C8B", "SP"],
    "iso-vault":            ["Governance",                        "#3B7A3D", "Gv"],
    "iso-depot":            ["Field & operations",                "#E2A310", "FO"],
    "iso-control":          ["Managed run",                       "#2F9E6E", "MR"],
  };

  const manifest = {};
  for (const k in M) manifest[k] = { label: M[k][0], color: M[k][1], mono: M[k][2], alt: M[k][0] + " logo" };

  const warned = {};
  function assetFor(key) {
    const url = (window.ICONS || {})[key];
    if (!url && !warned[key]) { warned[key] = 1; console.warn("[logos] missing asset for product key: " + key + " — using monogram fallback"); }
    return url || null;
  }
  const get = (key) => manifest[key] || { label: key, color: "#8A93A6", mono: (key || "?").slice(0, 2).toUpperCase(), alt: key };

  /* HTML mark (panels, header) → returns an HTMLElement sized `size` px */
  function html(key, size) {
    const m = get(key), url = assetFor(key);
    if (url) {
      const img = document.createElement("img");
      img.src = url; img.alt = m.alt; img.width = size; img.height = size;
      img.style.cssText = "display:block;width:" + size + "px;height:" + size + "px;object-fit:contain";
      return img;
    }
    const d = document.createElement("span");
    d.setAttribute("role", "img"); d.setAttribute("aria-label", m.alt);
    d.textContent = m.mono;
    d.style.cssText = "display:inline-flex;align-items:center;justify-content:center;width:" + size +
      "px;height:" + size + "px;border-radius:" + Math.round(size * 0.24) + "px;background:" + m.color +
      ";color:#fff;font-weight:700;font-size:" + Math.round(size * 0.42) + "px;letter-spacing:-.02em;font-family:'Segoe UI',Inter,sans-serif";
    return d;
  }

  /* SVG mark (scene billboards) → appends into `parent`, centred, ~`half`-radius */
  const NS = "http://www.w3.org/2000/svg";
  function svg(parent, key, half) {
    const m = get(key), url = assetFor(key);
    if (url) {
      const im = document.createElementNS(NS, "image");
      im.setAttribute("x", -half); im.setAttribute("y", -half);
      im.setAttribute("width", half * 2); im.setAttribute("height", half * 2);
      im.setAttribute("preserveAspectRatio", "xMidYMid meet");
      im.setAttribute("href", url); im.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
      parent.appendChild(im);
      return;
    }
    const r = document.createElementNS(NS, "rect");
    const s = half * 2, rad = half * 0.5;
    r.setAttribute("x", -half); r.setAttribute("y", -half); r.setAttribute("width", s); r.setAttribute("height", s);
    r.setAttribute("rx", rad); r.setAttribute("fill", m.color);
    parent.appendChild(r);
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", 0); t.setAttribute("y", half * 0.06); t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "central"); t.setAttribute("fill", "#fff");
    t.setAttribute("font-weight", "700"); t.setAttribute("font-size", half * 0.85);
    t.setAttribute("font-family", "'Segoe UI',Inter,sans-serif");
    t.textContent = m.mono; parent.appendChild(t);
  }

  /* a "Built with" chip: real/fallback logo + product name, tinted by brand */
  function chip(key) {
    const m = get(key);
    const c = document.createElement("span");
    c.className = "p-chip2";
    c.style.background = m.color + "14";           // 8% tint
    c.style.borderColor = m.color + "33";
    c.appendChild(html(key, 16));
    const s = document.createElement("span"); s.textContent = m.label; c.appendChild(s);
    return c;
  }

  window.LOGOS = { manifest, get, html, svg, chip };
})();
