/* ============================================================================
 *  BIZZAPPS · SHOWCASE DATA
 *  ---------------------------------------------------------------------------
 *  This is the ONLY file you edit to change the showcase content.
 *  Every building in the 3D city is one entry in `projects`.
 *
 *    • district  -> which neighbourhood / colour the building belongs to
 *    • impact     -> 0..100, drives the building HEIGHT (bigger = more impact)
 *    • metrics    -> the numbers that count up in the side panel
 *    • flows      -> optional data-flow links between apps (by id)
 *
 *  Replace the placeholder projects below with your real work and the whole
 *  city rebuilds itself automatically.
 * ========================================================================== */

window.SHOWCASE = {

  brand: {
    name: "BIZZAPPS",
    tagline: "A city built from the business applications we ship.",
    // Short line shown under the aggregate stats on the intro screen.
    kicker: "Interactive portfolio · proof of concept",
  },

  /* Headline numbers on the intro + live HUD. Keep to 3–4. */
  aggregate: [
    { label: "Apps delivered",   value: 13,   suffix: ""   },
    { label: "Clients served",   value: 9,    suffix: ""   },
    { label: "Hours saved / yr", value: 182,  suffix: "K"  },
    { label: "Avg. rollout",     value: 6,    suffix: " wk" },
  ],

  /* Neighbourhoods. `color` drives building glow, edges and the legend. */
  districts: [
    { id: "fin",    name: "Finance & Payments",  color: "#22D3EE" },
    { id: "log",    name: "Logistics & Supply",  color: "#F5A524" },
    { id: "health", name: "Healthcare & Life",   color: "#34D399" },
    { id: "retail", name: "Retail & Commerce",   color: "#F472B6" },
    { id: "people", name: "People & HR",         color: "#8B7CF6" },
    { id: "data",   name: "Data & AI Platform",  color: "#60A5FA" },
  ],

  /* ---- The apps. Each one becomes a building. ---- */
  projects: [
    {
      id: "atlas",
      name: "Atlas Treasury",
      client: "Regional bank · 4 countries",
      district: "fin",
      year: 2025,
      impact: 96,
      summary:
        "Real-time cash-positioning and liquidity cockpit that replaced a maze of spreadsheets across four subsidiaries with a single, auditable source of truth.",
      features: ["Live liquidity map", "Automated reconciliation", "Approval workflows", "Audit trail"],
      metrics: [
        { label: "Manual hours cut", value: 41000, suffix: "/yr" },
        { label: "Close time",       value: -73,   suffix: "%"   },
        { label: "Entities unified", value: 4,     suffix: ""    },
      ],
    },
    {
      id: "swift-pay",
      name: "SwiftPay Portal",
      client: "B2B payments provider",
      district: "fin",
      year: 2024,
      impact: 78,
      summary:
        "Self-service payments portal with instant onboarding, virtual cards and programmable payout rules — launched to 20k merchants in one quarter.",
      features: ["KYC onboarding", "Virtual cards", "Payout rules engine", "Webhook API"],
      metrics: [
        { label: "Merchants live", value: 20000, suffix: "" },
        { label: "Onboarding",     value: -88,   suffix: "%" },
        { label: "Uptime",         value: 99.98, suffix: "%" },
      ],
    },
    {
      id: "riskradar",
      name: "RiskRadar",
      client: "Insurance group",
      district: "fin",
      year: 2025,
      impact: 64,
      summary:
        "AI-assisted underwriting workbench that scores risk in seconds and surfaces the three drivers behind every decision for the underwriter to confirm.",
      features: ["Explainable scoring", "Document intake", "Portfolio view", "Straight-through processing"],
      metrics: [
        { label: "Quote turnaround", value: -62, suffix: "%" },
        { label: "Auto-decisions",   value: 57,  suffix: "%" },
      ],
    },

    {
      id: "cargoflow",
      name: "CargoFlow",
      client: "Freight & 3PL operator",
      district: "log",
      year: 2024,
      impact: 88,
      summary:
        "Control tower for a 1,200-vehicle fleet — live ETAs, dynamic routing and a dock-scheduling board that shaved hours off every yard.",
      features: ["Live fleet map", "Dynamic routing", "Dock scheduling", "Driver app"],
      metrics: [
        { label: "Empty miles",   value: -19, suffix: "%" },
        { label: "On-time",       value: 34,  suffix: "%" },
        { label: "Vehicles",      value: 1200, suffix: "" },
      ],
    },
    {
      id: "stockpilot",
      name: "StockPilot",
      client: "Multi-warehouse distributor",
      district: "log",
      year: 2023,
      impact: 59,
      summary:
        "Demand-forecasting and replenishment app that keeps eleven warehouses stocked without the overstock, driven by a nightly ML pipeline.",
      features: ["Demand forecasting", "Auto-replenishment", "Stock heatmap", "Supplier portal"],
      metrics: [
        { label: "Stockouts",   value: -46, suffix: "%" },
        { label: "Carrying cost", value: -23, suffix: "%" },
      ],
    },

    {
      id: "carelink",
      name: "CareLink",
      client: "Hospital network",
      district: "health",
      year: 2025,
      impact: 82,
      summary:
        "Care-coordination platform connecting wards, labs and discharge teams so nothing falls through the cracks between shifts.",
      features: ["Shift handover", "Lab integration", "Discharge planner", "Patient timeline"],
      metrics: [
        { label: "Readmissions", value: -17, suffix: "%" },
        { label: "Handover time", value: -55, suffix: "%" },
      ],
    },
    {
      id: "trialtrack",
      name: "TrialTrack",
      client: "Clinical research org",
      district: "health",
      year: 2024,
      impact: 51,
      summary:
        "Clinical-trial operations hub tracking sites, consent and adverse events with a full regulatory audit trail baked in.",
      features: ["Site management", "e-Consent", "Adverse-event capture", "Audit trail"],
      metrics: [
        { label: "Data queries", value: -38, suffix: "%" },
        { label: "Sites",        value: 42,  suffix: "" },
      ],
    },

    {
      id: "shelfsense",
      name: "ShelfSense",
      client: "Grocery retailer · 300 stores",
      district: "retail",
      year: 2025,
      impact: 74,
      summary:
        "Store-ops app that turns planograms, promotions and out-of-stock alerts into a daily task list on every associate's phone.",
      features: ["Planogram compliance", "Promo rollout", "Task list", "Out-of-stock alerts"],
      metrics: [
        { label: "On-shelf avail.", value: 12, suffix: "%" },
        { label: "Stores",          value: 300, suffix: "" },
      ],
    },
    {
      id: "loyaltyloop",
      name: "LoyaltyLoop",
      client: "Fashion brand",
      district: "retail",
      year: 2023,
      impact: 45,
      summary:
        "Unified loyalty and clienteling app that lets store staff recognise, reward and re-engage shoppers across online and in-store.",
      features: ["Unified profiles", "Clienteling", "Rewards engine", "Campaign builder"],
      metrics: [
        { label: "Repeat rate", value: 21, suffix: "%" },
        { label: "Members",     value: 480000, suffix: "" },
      ],
    },

    {
      id: "peoplehub",
      name: "PeopleHub",
      client: "Enterprise · 8k staff",
      district: "people",
      year: 2024,
      impact: 69,
      summary:
        "Everything-in-one-place HR portal — onboarding, time-off, reviews and org chart — that finally retired the intranet nobody used.",
      features: ["Onboarding flows", "Time-off", "Performance reviews", "Org chart"],
      metrics: [
        { label: "HR tickets", value: -44, suffix: "%" },
        { label: "Employees",  value: 8000, suffix: "" },
      ],
    },
    {
      id: "shiftwise",
      name: "ShiftWise",
      client: "Hospitality group",
      district: "people",
      year: 2025,
      impact: 48,
      summary:
        "Rota and labour-planning app that builds fair, compliant schedules in minutes and lets staff swap shifts from their phones.",
      features: ["Auto-scheduling", "Shift swaps", "Labour compliance", "Cost forecasting"],
      metrics: [
        { label: "Scheduling time", value: -70, suffix: "%" },
        { label: "Overtime",        value: -15, suffix: "%" },
      ],
    },

    {
      id: "insightgrid",
      name: "InsightGrid",
      client: "Cross-department platform",
      district: "data",
      year: 2025,
      impact: 91,
      summary:
        "The platform beneath the city — a shared data layer and embedded-analytics engine every other app plugs into for metrics and AI.",
      features: ["Unified data layer", "Embedded dashboards", "AI copilots", "Event pipeline"],
      metrics: [
        { label: "Apps powered", value: 11, suffix: "" },
        { label: "Events/day",   value: 240, suffix: "M" },
      ],
    },
    {
      id: "docmind",
      name: "DocMind",
      client: "Shared AI service",
      district: "data",
      year: 2024,
      impact: 62,
      summary:
        "Document-intelligence service that reads contracts, invoices and forms across the portfolio and hands back clean, structured data.",
      features: ["OCR + extraction", "Contract analysis", "Human-in-the-loop", "API for every app"],
      metrics: [
        { label: "Docs / month", value: 3, suffix: "M" },
        { label: "Accuracy",     value: 98.4, suffix: "%" },
      ],
    },
  ],

  /* Optional explicit data-flow links between apps (by id). If left empty,
     the platform apps in the "data" district auto-connect to everything. */
  flows: [
    ["insightgrid", "atlas"],
    ["insightgrid", "cargoflow"],
    ["insightgrid", "carelink"],
    ["insightgrid", "shelfsense"],
    ["insightgrid", "peoplehub"],
    ["docmind", "riskradar"],
    ["docmind", "trialtrack"],
    ["docmind", "swift-pay"],
    ["atlas", "swift-pay"],
    ["cargoflow", "stockpilot"],
    ["shelfsense", "loyaltyloop"],
    ["peoplehub", "shiftwise"],
  ],
};
