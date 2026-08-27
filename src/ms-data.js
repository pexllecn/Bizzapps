/* ============================================================================
 *  THE CITY · content model  (edit copy here; geometry lives in ms-iso.js)
 *  ---------------------------------------------------------------------------
 *  EY — Microsoft AI · Business Applications. Each `clients[]` entry is a
 *  client tenant island — the "building" a visitor recognises. Each entry in
 *  `buildings[]` is a reusable SOLUTION (a Microsoft-powered capability
 *  pattern); a client's `runs[]` lists which solutions were deployed for it.
 *  Solutions are content-shared across clients; nothing here is geometry.
 *
 *  CONTENT GOVERNANCE — read before editing a client or a client's runs.
 *  This file is authored assuming an INTERNAL audience. src/content-visibility.js
 *  derives a safe, client-facing view from it at runtime — it does not trust
 *  anyone to remember to delete things before a client demo.
 *
 *  @typedef {'internal'|'client-approved'|'anonymised'} Visibility
 *  @typedef {'advise'|'build'|'run'} LifecycleStage
 *
 *  ClientBuilding (an entry in `clients[]`) fields beyond the obvious:
 *    visibility        {Visibility}  who this client may be shown to, by name
 *    anonymisedName    {string=}     shown instead of `name` when visibility
 *                                    is 'anonymised' — a category, not a client
 *    approvalStatus    {'approved'|'pending'|'not-approved'}
 *    approvalOwner     {string}      "VERIFY" until a named approver is recorded
 *    approvalReference {string}      "VERIFY" until a sign-off record exists
 *    engagementTheme   {string}      one line, shown on hover
 *    challenge         {string}      plain-language client need
 *    outcome           {string}      approved value statement (no client mode
 *                                    without verified support — see outcomeMetrics)
 *    outcomeMetrics    {Array<{label,value,verified,sourceReference}>}
 *    eyDifference      {string}      the specific full-firm contribution
 *    relatedClientIds  {string[]=}
 *    logoKey           {string=}     window.ICONS key for the rotating beacon
 *    clientFacingApproved {boolean}  may the real logo render outside internal mode
 *    metricsVerified / commercialsVerified {boolean}
 *    lastContentReview {string}      "VERIFY" until dated
 *
 *  ClientSolution (an entry in `buildings[]`) fields beyond the obvious:
 *    visibility        {Visibility}  default 'client-approved' — these are
 *                                    reusable patterns, not client secrets
 *    value             {Array<{type:'outcome'|'speed-commercial'|'why-ey',
 *                              text:string, verified?:boolean}>}  EXACTLY THREE,
 *                       in this fixed order. `verified:false` marks a figure
 *                       that hasn't been signed off — content-visibility.js
 *                       swaps it for an approved non-numeric line in client mode.
 *    reusableProposition {string}   "Relevant to your organisation" — the
 *                       plain-language, client-agnostic pattern, one or two
 *                       sentences, never a claim that a client build can be
 *                       copied unchanged.
 * ========================================================================== */
window.CITY = {
  practice: {
    name: "BizzApps",
    wordmark: "Microsoft AI · Business Applications",
    hero: {
      eyebrow: "EY · Microsoft AI — Business Applications",
      headline: "Real clients,",
      headlineAccent: "one connected practice.",
      sub: "Every island is a real client engagement EY has delivered on the Microsoft cloud — Power Platform, Dynamics 365, Copilot and Azure AI. Explore the city and click any client to see the challenge, the solutions we delivered, and what it could mean for your organisation.",
      stats: [
        { n: "16", label: "Solutions shipped" },
        { n: "5", label: "Client tenants" },
        { n: "50", label: "EY specialists" },
        { n: "200", unit: "K+", label: "Citizens reached" },
      ],
      logos: ["power-platform", "power-apps", "power-automate", "power-bi", "power-pages", "dataverse", "dynamics365", "copilot", "azure", "fabric", "purview"],
      cta: "Explore the city",
      note: "Each island is one client's separate Microsoft tenant. Drag to orbit, scroll to zoom, and click a client — the camera stays where you left it while you read.",
    },
    footer: "One practice, many isolated tenants — we bring Microsoft AI into each client and run it where the stakes are highest.",
  },

  substrate: {
    core: "dataverse",
    label: "Separate tenants · isolated Dataverse · Azure · Fabric · Purview",
    etched: ["azure", "fabric", "purview"],
  },

  /* six districts — spatial groupings, colour + team. NOT filters. `lead` is
     internal-only metadata (not currently rendered) — keep it that way. */
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
      visibility: "client-approved",
      microsoftProducts: ["d365-contact-center", "copilot", "azure-ai"],
      whatItDoes: "A national-scale contact centre on Dynamics 365 — voice, chat and case in one place, with Copilot drafting replies and summarising every interaction for the agent.",
      value: [
        { type: "outcome", text: "Citizens get through and get answers. Agents handle more, with the full history and a suggested next step in front of them — not five screens and a hold queue." },
        { type: "speed-commercial", text: "Live in 10–14 weeks on a proven blueprint; from ~€350k for a production contact centre, scaling with agent seats.", verified: false },
        { type: "why-ey", text: "We've run one for real — at national scale, through the HSE breach response. EY brings Cyber, Data Protection and Change in the same team; a pure-play can't staff that." },
      ],
      reusableProposition: "This pattern can help organisations with high-volume citizen or customer contact bring voice, digital channels and case handling into one operating model, with AI supporting agents rather than creating another disconnected tool.",
      lifecycle: ["advise", "build", "run"], pod: { headcount: 6, lead: "Terry Maguire" }, proof: ["hse"],
    },
    {
      id: "customer-service", district: "A", pos: [-2.9, 0.3], h: 1.7, size: 1.2,
      name: "Customer Service & Case Management",
      visibility: "client-approved",
      microsoftProducts: ["d365-customer-service"],
      whatItDoes: "Case management for high-volume service teams — routing, SLAs, knowledge and reporting on Dynamics 365 Customer Service.",
      value: [
        { type: "outcome", text: "Every case tracked to resolution against an SLA, so nothing is lost between teams and managers see the backlog before it becomes a headline." },
        { type: "speed-commercial", text: "8–12 weeks to a live queue; from ~€180k depending on integrations.", verified: false },
        { type: "why-ey", text: "EY wraps the operating model and workforce change around the tech, and Digital Assurance stands behind the numbers you report to a regulator." },
      ],
      reusableProposition: "Any service team drowning in email and spreadsheets can get a single, SLA-driven queue with the reporting a leadership team actually trusts.",
      lifecycle: ["build", "run"], pod: { headcount: 4, lead: "Terry Maguire" }, proof: ["hse"],
    },
    {
      id: "self-service", district: "A", pos: [3.0, 0.2], h: 1.5, size: 1.2,
      name: "Self-Service & Citizen Portals",
      visibility: "client-approved",
      microsoftProducts: ["power-pages"],
      whatItDoes: "Secure public-facing portals on Power Pages where citizens self-serve — apply, upload, track status — without calling anyone.",
      value: [
        { type: "outcome", text: "The simple requests never reach an agent, so the phones stay free for the ones that need a human." },
        { type: "speed-commercial", text: "6–8 weeks to a branded, accessible portal; from ~€90k.", verified: false },
        { type: "why-ey", text: "Accessibility and identity built to public-service standard and assured by EY — a portal a department can defend at committee, not just demo." },
      ],
      reusableProposition: "Any organisation with a public-facing application or renewal process can move the routine requests online, safely, without adding to the call queue.",
      lifecycle: ["build"], pod: { headcount: 3, lead: "Terry Maguire" }, proof: ["doj"],
    },
    {
      id: "agent-copilot", district: "A", pos: [0.5, 2.7], h: 1.6, size: 1.2,
      name: "Agent Copilot & Conversational AI",
      visibility: "client-approved",
      microsoftProducts: ["copilot-studio", "azure-ai"],
      whatItDoes: "Custom copilots and conversational agents built in Copilot Studio, grounded in the client's own knowledge and connected to Dynamics.",
      value: [
        { type: "outcome", text: "Routine questions answered in seconds, day or night, with every answer traceable to a source the organisation controls." },
        { type: "speed-commercial", text: "A first agent in 4–6 weeks; from ~€75k, then iterate.", verified: false },
        { type: "why-ey", text: "EY's Responsible AI and Cyber teams govern what the agent can say and see — the difference between a demo and something you'll put in front of the public." },
      ],
      reusableProposition: "Any organisation with a large, repetitive question volume — internal or public-facing — can deflect the routine ones safely, with the answers grounded in its own governed content.",
      lifecycle: ["advise", "build"], pod: { headcount: 3, lead: "Terry Maguire" }, proof: ["hse"],
    },

    /* ---- District B · Power Factory & C4E ---- */
    {
      id: "c4e", district: "B", pos: [-8.1, -3.9], h: 1.9, size: 1.25,
      name: "Centre for Enablement (C4E)",
      visibility: "client-approved",
      microsoftProducts: ["power-platform", "purview"],
      whatItDoes: "A Centre for Enablement that lets a client's own people build on Power Platform safely — standards, guardrails, reuse and governance with Purview.",
      value: [
        { type: "outcome", text: "Hundreds of citizen developers shipping without a shadow-IT mess — one governed platform instead of a thousand unmanaged apps." },
        { type: "speed-commercial", text: "Stood up in 12 weeks at ~€285k, then it pays for itself as delivery moves in-house.", verified: false },
        { type: "why-ey", text: "EY sets the governance a board will sign off — Cyber, Data Protection and Risk in the room — not just a tenant with the settings turned on." },
      ],
      reusableProposition: "Any organisation with citizen developers already building apps informally can get the guardrails to let that continue safely, instead of shutting it down.",
      lifecycle: ["advise", "build"], pod: { headcount: 3, lead: "Harry Corbally" },
    },
    {
      id: "power-activate", district: "B", pos: [-6.3, -4.1], h: 1.5, size: 1.15,
      name: "Power Activate",
      visibility: "client-approved",
      microsoftProducts: ["power-apps", "power-automate"],
      whatItDoes: "A fast-start engagement that turns one painful manual process into a working app and an automated flow.",
      value: [
        { type: "outcome", text: "The spreadsheet-and-email process becomes an app people actually use, with the hand-offs automated end to end." },
        { type: "speed-commercial", text: "8 weeks, fixed at ~€115k — a real thing in production, not a proof of concept.", verified: false },
        { type: "why-ey", text: "It lands inside EY's wider transformation, so the quick win connects to the target operating model instead of becoming another island." },
      ],
      reusableProposition: "Any team with one obviously painful manual process can get a working fix fast, as a foothold for a larger programme rather than another isolated tool.",
      lifecycle: ["build"], pod: { headcount: 3, lead: "Harry Corbally" },
    },
    {
      id: "app-factory", district: "B", pos: [-8.3, -2.0], h: 1.6, size: 1.2,
      name: "App Factory",
      visibility: "client-approved",
      microsoftProducts: ["power-apps", "dataverse"],
      whatItDoes: "An industrialised app-delivery capability on Power Apps and Dataverse — a backlog of business apps built to a common standard.",
      value: [
        { type: "outcome", text: "A steady stream of apps retiring manual work, each built on the same data foundation so they compound instead of colliding." },
        { type: "speed-commercial", text: "First apps in 6–8 weeks; run as a managed factory from ~€25k/month.", verified: false },
        { type: "why-ey", text: "EY's data and assurance teams keep the estate coherent as it scales — the thing that breaks when a pure-play just keeps shipping." },
      ],
      reusableProposition: "Any organisation with a long backlog of small internal apps can get them built to one standard, on one data foundation, instead of one-off and disconnected.",
      lifecycle: ["build", "run"], pod: { headcount: 3, lead: "Harry Corbally" },
    },
    {
      id: "process-automation", district: "B", pos: [-6.4, -2.1], h: 1.4, size: 1.15,
      name: "Process Automation",
      visibility: "client-approved",
      microsoftProducts: ["power-automate"],
      whatItDoes: "Automating the swivel-chair work — approvals, data movement and integrations — with Power Automate cloud flows and RPA.",
      value: [
        { type: "outcome", text: "Hours of copy-paste a day handed back to the team, with a full audit trail of every automated step." },
        { type: "speed-commercial", text: "First automations live in 4–6 weeks; from ~€60k.", verified: false },
        { type: "why-ey", text: "EY maps automation to the control environment, so what you automate is also what you can evidence to an auditor." },
      ],
      reusableProposition: "Any back-office team still moving data by hand between systems can automate the hand-offs with a full, auditable trail behind them.",
      lifecycle: ["build", "run"], pod: { headcount: 2, lead: "Harry Corbally" },
    },
    {
      id: "insight-reporting", district: "B", pos: [-9.4, -3.0], h: 1.6, size: 1.15,
      name: "Insight & Reporting",
      visibility: "client-approved",
      microsoftProducts: ["power-bi", "fabric"],
      whatItDoes: "Governed reporting and analytics on Power BI and Microsoft Fabric — one version of the numbers, secured by role.",
      value: [
        { type: "outcome", text: "Leadership sees the same trusted figures, with drill-through to the detail, instead of arguing about whose spreadsheet is right." },
        { type: "speed-commercial", text: "A first governed dashboard in 6–8 weeks; from ~€95k.", verified: false },
        { type: "why-ey", text: "EY's Data & AI and Assurance practices stand behind the model, so the numbers hold up when they leave the room." },
      ],
      reusableProposition: "Any organisation reporting from several disconnected spreadsheets can move to one governed model, with the same figures for everyone who needs them.",
      lifecycle: ["build"], pod: { headcount: 3, lead: "Harry Corbally" },
    },

    /* ---- District C · Portfolio & Project ---- */
    {
      id: "portfolio", district: "C", pos: [6.8, -3.2], h: 1.8, size: 1.25,
      name: "Portfolio & Project Management",
      visibility: "client-approved",
      microsoftProducts: ["m365", "power-bi"],
      whatItDoes: "Portfolio and project management across a large programme — plans, resources and reporting on Microsoft 365 and Power BI, delivered with our TPG partnership.",
      value: [
        { type: "outcome", text: "One live view of every project, spend and risk, so the programme is steered on facts rather than status decks." },
        { type: "speed-commercial", text: "Stood up in 8–10 weeks; run as a service from ~€20k/month.", verified: false },
        { type: "why-ey", text: "EY brings the programme-delivery muscle and TPG the tooling depth — governance a national programme can be run on, and assured." },
      ],
      reusableProposition: "Any organisation running a large, multi-year programme can get one live view of progress, spend and risk instead of status decks built by hand.",
      lifecycle: ["advise", "build", "run"], pod: { headcount: 6 }, proof: ["cso"],
    },

    /* ---- District D · Field & Operations ---- */
    {
      id: "field-service", district: "D", pos: [7.9, 1.2], h: 1.7, size: 1.2,
      name: "Field Service",
      visibility: "client-approved",
      microsoftProducts: ["d365-field-service"],
      whatItDoes: "Scheduling, mobile work orders and asset history for field crews on Dynamics 365 Field Service — online and offline.",
      value: [
        { type: "outcome", text: "More jobs done right first time, because the engineer arrives with the history, the parts and the next step already in hand." },
        { type: "speed-commercial", text: "Live in 10–12 weeks; from ~€200k depending on fleet size.", verified: false },
        { type: "why-ey", text: "EY wraps the workforce change and safety process around the rollout — the reason field programmes stick instead of stalling at go-live." },
      ],
      reusableProposition: "Any organisation with crews working from paper schedules can move to guided, mobile work orders that hold up offline in the field.",
      lifecycle: ["build", "run"], pod: { headcount: 3, lead: "Gerry Reid" },
    },
    {
      id: "asset-maintenance", district: "D", pos: [6.5, 2.7], h: 1.5, size: 1.15,
      name: "Asset & Predictive Maintenance",
      visibility: "client-approved",
      microsoftProducts: ["dynamics365", "azure-ai"],
      whatItDoes: "Predictive maintenance — asset data and Azure AI flagging failures before they happen, feeding work straight into Field Service.",
      value: [
        { type: "outcome", text: "Fewer unplanned outages, because the asset tells you it's about to fail while you can still plan the fix." },
        { type: "speed-commercial", text: "A first predictive model in 10–12 weeks; from ~€150k.", verified: false },
        { type: "why-ey", text: "EY's engineers and data scientists build models the business trusts and can defend — not a black box nobody will act on." },
      ],
      reusableProposition: "Any organisation running critical physical assets can move from reactive repairs to planned ones, with a model its own engineers can defend.",
      lifecycle: ["advise", "build"], pod: { headcount: 2, lead: "Gerry Reid" },
    },

    /* ---- District E · Run ---- */
    {
      id: "managed-run", district: "E", pos: [-6.3, 5.0], h: 1.8, size: 1.2,
      name: "Managed Service & 24/7 Run",
      visibility: "client-approved",
      microsoftProducts: ["dynamics365", "azure"],
      whatItDoes: "A 24/7 managed service — we run the platform in production: monitoring, releases, support and continuous improvement.",
      value: [
        { type: "outcome", text: "The service stays up and keeps getting better, with one accountable team instead of a hand-off to a support queue that never met the build." },
        { type: "speed-commercial", text: "Onboarded in 4–6 weeks; from ~€15k/month by scope.", verified: false },
        { type: "why-ey", text: "Advise, build and run under one EY roof — the same firm that designed it keeps it alive, with the SLAs a critical service demands." },
      ],
      reusableProposition: "Any organisation worried about what happens after go-live can hand run-the-service to the same team that designed and built it.",
      lifecycle: ["advise", "build", "run"], pod: { headcount: 2 }, proof: ["cso", "hse"],
    },
    {
      id: "platform-health", district: "E", pos: [-4.6, 4.5], h: 1.5, size: 1.15,
      name: "Platform Health & Adoption",
      visibility: "client-approved",
      microsoftProducts: ["power-bi", "purview"],
      whatItDoes: "The control room for the estate — adoption, licence spend, security posture and data governance on Power BI and Purview.",
      value: [
        { type: "outcome", text: "You can see whether what you paid for is being used, and whether it's safe — before finance or a regulator asks." },
        { type: "speed-commercial", text: "Live in 6–8 weeks; included in managed service or from ~€8k/month.", verified: false },
        { type: "why-ey", text: "EY's Cyber and Data Protection teams turn platform telemetry into board-level assurance, not just an admin dashboard." },
      ],
      reusableProposition: "Any organisation with a growing Microsoft estate can get one view of adoption, spend and security posture before it becomes a finance or audit question.",
      lifecycle: ["advise", "build", "run"], pod: { headcount: 2 },
    },

    /* ---- District F · Data, AI & Platform ---- */
    {
      id: "data-foundation", district: "F", pos: [3.7, 5.3], h: 1.7, size: 1.2,
      name: "Data Foundation",
      visibility: "client-approved",
      microsoftProducts: ["dataverse", "fabric"],
      whatItDoes: "Each client's own governed data foundation — an isolated Dataverse environment, with Microsoft Fabric, giving that client one trusted source for every app and report.",
      value: [
        { type: "outcome", text: "Apps and analytics built once on trusted data, so the next solution is weeks not months and the numbers reconcile — inside one client's boundary, never mixed with anyone else's." },
        { type: "speed-commercial", text: "Foundations in 8–10 weeks; from ~€160k.", verified: false },
        { type: "why-ey", text: "EY designs each client a separate, governed Dataverse — data residency, isolation and lineage a regulator will accept — with Assurance standing behind its integrity." },
      ],
      reusableProposition: "Any organisation about to build several apps or reports can start from one governed data foundation instead of a new silo for each one.",
      lifecycle: ["build", "run"], pod: { headcount: 3 }, proof: ["cso"],
    },
    {
      id: "responsible-ai", district: "F", pos: [5.4, 4.5], h: 1.5, size: 1.15,
      name: "Responsible AI & Governance",
      visibility: "client-approved",
      microsoftProducts: ["purview", "azure-ai"],
      whatItDoes: "Guardrails for AI across the estate — inventory, governance, monitoring and controls on Microsoft Purview and Azure AI.",
      value: [
        { type: "outcome", text: "AI you can put in front of the public and defend to a regulator, because every model is inventoried, monitored and controlled." },
        { type: "speed-commercial", text: "A first governance baseline in 6–8 weeks; from ~€110k.", verified: false },
        { type: "why-ey", text: "This is EY home turf — Responsible AI, Cyber, Law and Assurance in one team, the wrap no pure-play can field." },
      ],
      reusableProposition: "Any organisation starting to deploy AI at scale can put an inventory and set of controls around it before a regulator or an incident forces the issue.",
      lifecycle: ["advise", "build"], pod: { headcount: 2 },
    },
  ],

  /* ---------------------------------------------------------------------------
   *  CLIENT TENANTS — each is a SEPARATE Microsoft tenant with its OWN isolated
   *  Dataverse: the "building" a visitor recognises. `runs` lists the solution
   *  ids (from `buildings` above) deployed for that client. `center` places the
   *  island; `tenant` strings are illustrative only and are internal-only —
   *  content-visibility.js strips them from the client-facing view.
   *
   *  No approval has been recorded for any client yet: approvalOwner and
   *  approvalReference are placeholders. Replace "VERIFY" with a named
   *  approver and a real sign-off reference before treating a client as safe
   *  to name in front of an external audience.
   * ------------------------------------------------------------------------- */
  clients: [
    {
      id: "doj", name: "Department of Justice", short: "DoJ", sector: "Justice · national",
      real: true, color: "#7A57B5", center: [0, 0], tenant: "justice.crm4.dynamics.com",
      logoKey: "doj-crest", crestRatio: 2.55, clientFacingApproved: true,
      visibility: "client-approved", approvalStatus: "pending",
      approvalOwner: "VERIFY", approvalReference: "VERIFY", lastContentReview: "VERIFY",
      metricsVerified: false, commercialsVerified: false,
      engagementTheme: "Modernising immigration services citizens depend on",
      challenge: "Manual, paper-heavy immigration processes were slow for applicants and hard for staff to scale nationally.",
      story: "Immigration Service Delivery — modernising a service the whole country depends on.",
      outcome: "A secure self-service portal now lets applicants apply and track status online, backed by case management and automation that remove manual hand-offs behind the scenes.",
      outcomeMetrics: [],
      eyDifference: "EY paired Power Platform delivery with public-service accessibility standards and change management, so the portal is one a department can defend at committee, not just demo.",
      relatedClientIds: ["hse"],
      runs: ["self-service", "customer-service", "process-automation", "c4e"], flagship: "self-service",
    },
    {
      id: "hse", name: "HSE", short: "HSE", sector: "Health · national",
      real: true, color: "#C4399B", center: [-11.5, -8], tenant: "hse.crm4.dynamics.com",
      clientFacingApproved: false,
      visibility: "client-approved", approvalStatus: "pending",
      approvalOwner: "VERIFY", approvalReference: "VERIFY", lastContentReview: "VERIFY",
      metricsVerified: false, commercialsVerified: false,
      engagementTheme: "National-scale citizen response",
      challenge: "A national data breach meant hundreds of thousands of citizens needed a way to get answers fast, with no existing single point of contact at that scale.",
      story: "National breach response — we designed and ran the digital contact centre engaging 200,000+ affected citizens, around 100 agents at peak, over 2.5 years.",
      outcome: "A Dynamics 365 contact centre with Copilot-assisted case handling gave agents one place to see the full history and the next step — not five screens and a hold queue.",
      outcomeMetrics: [
        { label: "Citizens engaged", value: "200,000+", verified: false, sourceReference: "VERIFY" },
        { label: "Agents at peak", value: "~100", verified: false, sourceReference: "VERIFY" },
        { label: "Programme length", value: "2.5 years", verified: false, sourceReference: "VERIFY" },
      ],
      eyDifference: "EY ran this for real, with Cyber, Data Protection and Change in the same team from day one — a pure-play contact-centre vendor can't staff that combination.",
      relatedClientIds: ["cso"],
      runs: ["contact-centre", "customer-service", "agent-copilot", "platform-health", "managed-run"], flagship: "contact-centre",
    },
    {
      id: "cso", name: "Central Statistics Office", short: "CSO", sector: "Statistics · national",
      real: true, color: "#2E7AD1", center: [11.5, -8], tenant: "cso.crm4.dynamics.com",
      clientFacingApproved: false,
      visibility: "client-approved", approvalStatus: "pending",
      approvalOwner: "VERIFY", approvalReference: "VERIFY", lastContentReview: "VERIFY",
      metricsVerified: false, commercialsVerified: false,
      engagementTheme: "Delivering Census 2027 as a national programme",
      challenge: "A multi-year national census programme needed one trusted view of progress, spend and risk across many workstreams.",
      story: "Census 2027 — delivery partner and managed service provider for a multi-year national programme.",
      outcome: "A governed data foundation plus portfolio reporting gives programme leadership one live view instead of status decks, with a managed service keeping it running.",
      outcomeMetrics: [],
      eyDifference: "EY brings the programme-delivery muscle and TPG the tooling depth — governance a national statistics programme can be run on, and assured.",
      relatedClientIds: ["hse"],
      runs: ["data-foundation", "insight-reporting", "portfolio", "responsible-ai", "managed-run"], flagship: "data-foundation",
    },
    {
      id: "council", name: "County Council", short: "Council", sector: "Local government",
      real: false, color: "#12A5A5", center: [-11.5, 8], tenant: "council.crm4.dynamics.com",
      clientFacingApproved: false,
      visibility: "anonymised", anonymisedName: "Regional local-government organisation",
      approvalStatus: "approved", approvalOwner: "VERIFY", approvalReference: "VERIFY", lastContentReview: "VERIFY",
      metricsVerified: false, commercialsVerified: false,
      engagementTheme: "Digitising resident-facing services",
      challenge: "Resident requests and back-office processes ran on manual, disconnected steps.",
      story: "A composite, illustrative engagement — a local authority digitising resident-facing services and back-office process. Swap for an approved reference when one is cleared.",
      outcome: "A self-service portal and automated workflows let residents self-serve while staff focus on the requests that need a person.",
      outcomeMetrics: [],
      eyDifference: "The same pattern used in national engagements, scaled down and re-governed for a local authority's own risk and data-protection requirements.",
      runs: ["self-service", "power-activate", "app-factory", "process-automation"], flagship: "self-service",
    },
    {
      id: "utility", name: "National Utility", short: "Utility", sector: "Utilities",
      real: false, color: "#E2A310", center: [11.5, 8], tenant: "utility.crm4.dynamics.com",
      clientFacingApproved: false,
      visibility: "anonymised", anonymisedName: "National utility provider",
      approvalStatus: "approved", approvalOwner: "VERIFY", approvalReference: "VERIFY", lastContentReview: "VERIFY",
      metricsVerified: false, commercialsVerified: false,
      engagementTheme: "Running field operations at national scale",
      challenge: "Field crews and asset maintenance ran on paper schedules and reactive repairs.",
      story: "A composite, illustrative engagement — a national utility running field operations and predictive maintenance on Dynamics 365. Swap for an approved reference when one is cleared.",
      outcome: "Field Service scheduling plus predictive maintenance let crews arrive prepared and catch failures before they become outages.",
      outcomeMetrics: [],
      eyDifference: "EY's engineers and data scientists build maintenance models the business can defend, not a black box nobody acts on.",
      runs: ["field-service", "asset-maintenance", "insight-reporting", "managed-run"], flagship: "field-service",
    },
  ],
};
