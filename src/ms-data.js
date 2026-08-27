/* ============================================================================
 *  THE CITY · content model  (edit copy here; geometry lives in ms-iso.js)
 *  ---------------------------------------------------------------------------
 *  EY — Microsoft AI · Business Applications. 50 people, six districts, three
 *  proof landmarks. Every building is something this practice does on Microsoft.
 *
 *  Each building's `value` is EXACTLY THREE lines, in fixed order:
 *    [0] business outcome — what changes for the client, in their language
 *    [1] how fast / what it costs — a real number (commercials // VERIFY)
 *    [2] why EY, not a pure-play — the full-firm wrap, specific each time
 * ========================================================================== */
window.CITY = {
  practice: {
    name: "BizzApps",
    wordmark: "Microsoft AI · Business Applications",
    hero: {
      eyebrow: "EY · Microsoft AI — Business Applications (BizzApps)",
      headline: "We bring Microsoft AI into the organisations that run public services and industry.",
      sub: "BizzApps is EY’s Microsoft Business Applications practice — around 50 people who advise, build and run solutions on the Microsoft cloud: Power Platform, Dynamics 365, Copilot and Azure AI. We take an idea from business case to something live and supported, and we stand behind the numbers.",
      points: [
        "Advise · Build · Run — the full lifecycle, one accountable EY team",
        "Power Platform · Dynamics 365 · Copilot · Azure AI · Fabric · Purview",
        "Every client on their own governed Microsoft tenant — never one shared platform",
      ],
      cta: "Explore the practice",
      note: "What follows is a live map of the work. Each island is one client’s separate environment — drag to move, use the compass to orbit, and click any building to see what we run for them and what it’s worth.",
    },
    footer: "One practice, many isolated tenants — we bring Microsoft AI into each client and run it where the stakes are highest.",
  },

  substrate: {
    core: "dataverse",
    label: "Separate tenants · isolated Dataverse · Azure · Fabric · Purview",
    etched: ["azure", "fabric", "purview"],
  },

  /* six districts — spatial groupings, colour + team. NOT filters. */
  districts: [
    { id: "A", name: "Customer & Contact",   color: "#C4399B", center: [0.2, 0.5],   lead: "Terry Maguire",  headcount: 16 },
    { id: "B", name: "Power Factory & C4E",  color: "#7A57B5", center: [-7.2, -3.0],  lead: "Harry Corbally", headcount: 14 },
    { id: "C", name: "Portfolio & Project",  color: "#12A5A5", center: [6.8, -3.2],   headcount: 6 },
    { id: "D", name: "Field & Operations",   color: "#E2A310", center: [7.3, 2.1],    lead: "Gerry Reid",     headcount: 5 },
    { id: "E", name: "Run",                  color: "#2F9E6E", center: [-5.6, 4.6],   headcount: 4 },
    { id: "F", name: "Data, AI & Platform",  color: "#2E7AD1", center: [4.4, 4.9],    headcount: 5 },
  ],

  buildings: [
    /* ---- District A · Customer & Contact ---- */
    {
      id: "contact-centre", district: "A", flagship: true, pos: [0.2, -0.9], h: 2.7, size: 1.45,
      name: "Digital Contact Centre",
      microsoftProducts: ["d365-contact-center", "copilot", "azure-ai"],
      whatItDoes: "A national-scale contact centre on Dynamics 365 — voice, chat and case in one place, with Copilot drafting replies and summarising every interaction for the agent.",
      value: [
        "Citizens get through and get answers. Agents handle more, with the full history and a suggested next step in front of them — not five screens and a hold queue.",
        "Live in 10–14 weeks on a proven blueprint; from ~€350k for a production contact centre, scaling with agent seats. // VERIFY",
        "We’ve run one for real — around 100 agents engaging 200,000+ citizens through the HSE breach. EY brings Cyber, Data Protection and Change in the same team; a pure-play can’t staff that.",
      ],
      lifecycle: ["advise", "build", "run"], pod: { headcount: 6, lead: "Terry Maguire" }, proof: ["hse"],
    },
    {
      id: "customer-service", district: "A", pos: [-2.9, 0.3], h: 1.7, size: 1.2,
      name: "Customer Service & Case Management",
      microsoftProducts: ["d365-customer-service"],
      whatItDoes: "Case management for high-volume service teams — routing, SLAs, knowledge and reporting on Dynamics 365 Customer Service.",
      value: [
        "Every case tracked to resolution against an SLA, so nothing is lost between teams and managers see the backlog before it becomes a headline.",
        "8–12 weeks to a live queue; from ~€180k depending on integrations. // VERIFY",
        "EY wraps the operating model and workforce change around the tech, and Digital Assurance stands behind the numbers you report to a regulator.",
      ],
      lifecycle: ["build", "run"], pod: { headcount: 4, lead: "Terry Maguire" }, proof: ["hse"],
    },
    {
      id: "self-service", district: "A", pos: [3.0, 0.2], h: 1.5, size: 1.2,
      name: "Self-Service & Citizen Portals",
      microsoftProducts: ["power-pages"],
      whatItDoes: "Secure public-facing portals on Power Pages where citizens self-serve — apply, upload, track status — without calling anyone.",
      value: [
        "The simple requests never reach an agent, so the phones stay free for the ones that need a human.",
        "6–8 weeks to a branded, accessible portal; from ~€90k. // VERIFY",
        "Accessibility and identity built to public-service standard and assured by EY — a portal a department can defend at committee, not just demo.",
      ],
      lifecycle: ["build"], pod: { headcount: 3, lead: "Terry Maguire" }, proof: ["doj"],
    },
    {
      id: "agent-copilot", district: "A", pos: [0.5, 2.7], h: 1.6, size: 1.2,
      name: "Agent Copilot & Conversational AI",
      microsoftProducts: ["copilot-studio", "azure-ai"],
      whatItDoes: "Custom copilots and conversational agents built in Copilot Studio, grounded in the client’s own knowledge and connected to Dynamics.",
      value: [
        "Routine questions answered in seconds, day or night, with every answer traceable to a source the organisation controls.",
        "A first agent in 4–6 weeks; from ~€75k, then iterate. // VERIFY",
        "EY’s Responsible AI and Cyber teams govern what the agent can say and see — the difference between a demo and something you’ll put in front of the public.",
      ],
      lifecycle: ["advise", "build"], pod: { headcount: 3, lead: "Terry Maguire" }, proof: ["hse"],
    },

    /* ---- District B · Power Factory & C4E ---- */
    {
      id: "c4e", district: "B", pos: [-8.1, -3.9], h: 1.9, size: 1.25,
      name: "Centre for Enablement (C4E)",
      microsoftProducts: ["power-platform", "purview"],
      whatItDoes: "A Centre for Enablement that lets a client’s own people build on Power Platform safely — standards, guardrails, reuse and governance with Purview.",
      value: [
        "Hundreds of citizen developers shipping without a shadow-IT mess — one governed platform instead of a thousand unmanaged apps.",
        "Stood up in 12 weeks at ~€285k, then it pays for itself as delivery moves in-house.",
        "EY sets the governance a board will sign off — Cyber, Data Protection and Risk in the room — not just a tenant with the settings turned on.",
      ],
      lifecycle: ["advise", "build"], pod: { headcount: 3, lead: "Harry Corbally" },
    },
    {
      id: "power-activate", district: "B", pos: [-6.3, -4.1], h: 1.5, size: 1.15,
      name: "Power Activate",
      microsoftProducts: ["power-apps", "power-automate"],
      whatItDoes: "A fast-start engagement that turns one painful manual process into a working app and an automated flow.",
      value: [
        "The spreadsheet-and-email process becomes an app people actually use, with the hand-offs automated end to end.",
        "8 weeks, fixed at ~€115k — a real thing in production, not a proof of concept.",
        "It lands inside EY’s wider transformation, so the quick win connects to the target operating model instead of becoming another island.",
      ],
      lifecycle: ["build"], pod: { headcount: 3, lead: "Harry Corbally" },
    },
    {
      id: "app-factory", district: "B", pos: [-8.3, -2.0], h: 1.6, size: 1.2,
      name: "App Factory",
      microsoftProducts: ["power-apps", "dataverse"],
      whatItDoes: "An industrialised app-delivery capability on Power Apps and Dataverse — a backlog of business apps built to a common standard.",
      value: [
        "A steady stream of apps retiring manual work, each built on the same data foundation so they compound instead of colliding.",
        "First apps in 6–8 weeks; run as a managed factory from ~€25k/month. // VERIFY",
        "EY’s data and assurance teams keep the estate coherent as it scales — the thing that breaks when a pure-play just keeps shipping.",
      ],
      lifecycle: ["build", "run"], pod: { headcount: 3, lead: "Harry Corbally" },
    },
    {
      id: "process-automation", district: "B", pos: [-6.4, -2.1], h: 1.4, size: 1.15,
      name: "Process Automation",
      microsoftProducts: ["power-automate"],
      whatItDoes: "Automating the swivel-chair work — approvals, data movement and integrations — with Power Automate cloud flows and RPA.",
      value: [
        "Hours of copy-paste a day handed back to the team, with a full audit trail of every automated step.",
        "First automations live in 4–6 weeks; from ~€60k. // VERIFY",
        "EY maps automation to the control environment, so what you automate is also what you can evidence to an auditor.",
      ],
      lifecycle: ["build", "run"], pod: { headcount: 2, lead: "Harry Corbally" },
    },
    {
      id: "insight-reporting", district: "B", pos: [-9.4, -3.0], h: 1.6, size: 1.15,
      name: "Insight & Reporting",
      microsoftProducts: ["power-bi", "fabric"],
      whatItDoes: "Governed reporting and analytics on Power BI and Microsoft Fabric — one version of the numbers, secured by role.",
      value: [
        "Leadership sees the same trusted figures, with drill-through to the detail, instead of arguing about whose spreadsheet is right.",
        "A first governed dashboard in 6–8 weeks; from ~€95k. // VERIFY",
        "EY’s Data & AI and Assurance practices stand behind the model, so the numbers hold up when they leave the room.",
      ],
      lifecycle: ["build"], pod: { headcount: 3, lead: "Harry Corbally" },
    },

    /* ---- District C · Portfolio & Project ---- */
    {
      id: "portfolio", district: "C", pos: [6.8, -3.2], h: 1.8, size: 1.25,
      name: "Portfolio & Project Management",
      microsoftProducts: ["m365", "power-bi"],
      whatItDoes: "Portfolio and project management across a large programme — plans, resources and reporting on Microsoft 365 and Power BI, delivered with our TPG partnership.",
      value: [
        "One live view of every project, spend and risk, so the programme is steered on facts rather than status decks.",
        "Stood up in 8–10 weeks; run as a service from ~€20k/month. // VERIFY",
        "EY brings the programme-delivery muscle and TPG the tooling depth — governance a national programme can be run on, and assured.",
      ],
      lifecycle: ["advise", "build", "run"], pod: { headcount: 6 }, proof: ["cso"],
    },

    /* ---- District D · Field & Operations ---- */
    {
      id: "field-service", district: "D", pos: [7.9, 1.2], h: 1.7, size: 1.2,
      name: "Field Service",
      microsoftProducts: ["d365-field-service"],
      whatItDoes: "Scheduling, mobile work orders and asset history for field crews on Dynamics 365 Field Service — online and offline.",
      value: [
        "More jobs done right first time, because the engineer arrives with the history, the parts and the next step already in hand.",
        "Live in 10–12 weeks; from ~€200k depending on fleet size. // VERIFY",
        "EY wraps the workforce change and safety process around the rollout — the reason field programmes stick instead of stalling at go-live.",
      ],
      lifecycle: ["build", "run"], pod: { headcount: 3, lead: "Gerry Reid" },
    },
    {
      id: "asset-maintenance", district: "D", pos: [6.5, 2.7], h: 1.5, size: 1.15,
      name: "Asset & Predictive Maintenance",
      microsoftProducts: ["dynamics365", "azure-ai"],
      whatItDoes: "Predictive maintenance — asset data and Azure AI flagging failures before they happen, feeding work straight into Field Service.",
      value: [
        "Fewer unplanned outages, because the asset tells you it’s about to fail while you can still plan the fix.",
        "A first predictive model in 10–12 weeks; from ~€150k. // VERIFY",
        "EY’s engineers and data scientists build models the business trusts and can defend — not a black box nobody will act on.",
      ],
      lifecycle: ["advise", "build"], pod: { headcount: 2, lead: "Gerry Reid" },
    },

    /* ---- District E · Run ---- */
    {
      id: "managed-run", district: "E", pos: [-6.3, 5.0], h: 1.8, size: 1.2,
      name: "Managed Service & 24/7 Run",
      microsoftProducts: ["dynamics365", "azure"],
      whatItDoes: "A 24/7 managed service — we run the platform in production: monitoring, releases, support and continuous improvement.",
      value: [
        "The service stays up and keeps getting better, with one accountable team instead of a hand-off to a support queue that never met the build.",
        "Onboarded in 4–6 weeks; from ~€15k/month by scope. // VERIFY",
        "Advise, build and run under one EY roof — the same firm that designed it keeps it alive, with the SLAs a critical service demands.",
      ],
      lifecycle: ["advise", "build", "run"], pod: { headcount: 2 }, proof: ["cso", "hse"],
    },
    {
      id: "platform-health", district: "E", pos: [-4.6, 4.5], h: 1.5, size: 1.15,
      name: "Platform Health & Adoption",
      microsoftProducts: ["power-bi", "purview"],
      whatItDoes: "The control room for the estate — adoption, licence spend, security posture and data governance on Power BI and Purview.",
      value: [
        "You can see whether what you paid for is being used, and whether it’s safe — before finance or a regulator asks.",
        "Live in 6–8 weeks; included in managed service or from ~€8k/month. // VERIFY",
        "EY’s Cyber and Data Protection teams turn platform telemetry into board-level assurance, not just an admin dashboard.",
      ],
      lifecycle: ["advise", "build", "run"], pod: { headcount: 2 },
    },

    /* ---- District F · Data, AI & Platform ---- */
    {
      id: "data-foundation", district: "F", pos: [3.7, 5.3], h: 1.7, size: 1.2,
      name: "Data Foundation",
      microsoftProducts: ["dataverse", "fabric"],
      whatItDoes: "Each client’s own governed data foundation — an isolated Dataverse environment, with Microsoft Fabric, giving that client one trusted source for every app and report.",
      value: [
        "Apps and analytics built once on trusted data, so the next solution is weeks not months and the numbers reconcile — inside one client’s boundary, never mixed with anyone else’s.",
        "Foundations in 8–10 weeks; from ~€160k. // VERIFY",
        "EY designs each client a separate, governed Dataverse — data residency, isolation and lineage a regulator will accept — with Assurance standing behind its integrity.",
      ],
      lifecycle: ["build", "run"], pod: { headcount: 3 }, proof: ["cso"],
    },
    {
      id: "responsible-ai", district: "F", pos: [5.4, 4.5], h: 1.5, size: 1.15,
      name: "Responsible AI & Governance",
      microsoftProducts: ["purview", "azure-ai"],
      whatItDoes: "Guardrails for AI across the estate — inventory, governance, monitoring and controls on Microsoft Purview and Azure AI.",
      value: [
        "AI you can put in front of the public and defend to a regulator, because every model is inventoried, monitored and controlled.",
        "A first governance baseline in 6–8 weeks; from ~€110k. // VERIFY",
        "This is EY home turf — Responsible AI, Cyber, Law and Assurance in one team, the wrap no pure-play can field.",
      ],
      lifecycle: ["advise", "build"], pod: { headcount: 2 },
    },
  ],

  /* ---------------------------------------------------------------------------
   *  CLIENT TENANTS — each is a SEPARATE Microsoft tenant with its OWN isolated
   *  Dataverse. Islands never touch; there are no wires between them. `runs`
   *  lists the capability ids (from `buildings` above) deployed for that client.
   *  `center` places the island; `tenant` strings are illustrative only.
   * ------------------------------------------------------------------------- */
  clients: [
    {
      id: "doj", name: "Department of Justice", short: "DoJ", sector: "Justice · national",
      real: true, color: "#7A57B5", center: [0, 0], tenant: "justice.crm4.dynamics.com",
      story: "Immigration Service Delivery — modernising a service the whole country depends on.",
      runs: ["self-service", "customer-service", "process-automation", "c4e"], flagship: "self-service",
    },
    {
      id: "hse", name: "HSE", short: "HSE", sector: "Health · national",
      real: true, color: "#C4399B", center: [-11.5, -8], tenant: "hse.crm4.dynamics.com",
      story: "National breach response — we designed and ran the digital contact centre engaging 200,000+ affected citizens, around 100 agents at peak, over 2.5 years.",
      runs: ["contact-centre", "customer-service", "agent-copilot", "platform-health", "managed-run"], flagship: "contact-centre",
    },
    {
      id: "cso", name: "Central Statistics Office", short: "CSO", sector: "Statistics · national",
      real: true, color: "#2E7AD1", center: [11.5, -8], tenant: "cso.crm4.dynamics.com",
      story: "Census 2027 — delivery partner and managed service provider for a multi-year national programme.",
      runs: ["data-foundation", "insight-reporting", "portfolio", "responsible-ai", "managed-run"], flagship: "data-foundation",
    },
    {
      id: "council", name: "County Council", short: "Council", sector: "Local government",
      real: false, color: "#12A5A5", center: [-11.5, 8], tenant: "council.crm4.dynamics.com",
      story: "[Placeholder] A county council digitising resident-facing services and back-office process. Swap for a real reference.",
      runs: ["self-service", "power-activate", "app-factory", "process-automation"], flagship: "self-service",
    },
    {
      id: "utility", name: "National Utility", short: "Utility", sector: "Utilities",
      real: false, color: "#E2A310", center: [11.5, 8], tenant: "utility.crm4.dynamics.com",
      story: "[Placeholder] A national utility running field operations and predictive maintenance on Dynamics 365. Swap for a real reference.",
      runs: ["field-service", "asset-maintenance", "insight-reporting", "managed-run"], flagship: "field-service",
    },
  ],
};
