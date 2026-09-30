/* EY BizApps - shared asset. Generated from the v1 pages. Classic script: works on file://. */
window.BIZ = {

  brand: {
    practice: "Microsoft AI Business Applications",
    unit: "Customer & Growth · Technology Consulting",
    firm: "EY Ireland",
  },

  /* ------------------------------------------------------------------ hero */
  hero: {
    eyebrow: "EY · Technology Consulting · Microsoft & Cloud Services",
    line1: "Business Applications,",
    line2: "engineered for",
    rotator: ["national scale", "intelligent service", "governed AI", "connected operations"],
    sub: "We are not a technology implementation team. We change how customers, employees and operations connect and perform - on Dynamics 365, Power Platform, Copilot and Azure.",
    stats: [
      { n: 40,     s: "+", l: "Specialists",          sub: "Analyst to Director" },
      { n: 250000, s: "+", l: "Citizens contacted",   sub: "National health outreach" },
      { n: 100000, s: "+", l: "Cases processed",      sub: "Irish immigration service" },
      { n: 4,      s: "",  l: "Delivery geographies", sub: "IE · PL · MX · IN" },
    ],
  },

  /* ------------------------------------------------- the 5-layer platform */
  stack: {
    kicker: "The technology layer",
    title: "One governed platform. Five layers.",
    lede: "Every engagement we run is assembled from the same stack. Rotate it, pull it apart, and click any product to see what it does and where we have put it into production.",
    hint: "Drag to rotate · click a mark for detail",
    layers: [
      {
        id: "experience", name: "Experience", index: "05", color: "#FFE600",
        caption: "Where the customer and the agent actually meet the organisation.",
        products: ["d365-contact-center", "power-pages", "d365-customer-service", "teams", "sharepoint"],
      },
      {
        id: "intelligence", name: "Intelligence", index: "04", color: "#FF9831",
        caption: "Copilot and agents doing the repetitive reasoning, grounded in governed content.",
        products: ["copilot", "azure-ai", "d365-sales"],
      },
      {
        id: "applications", name: "Applications", index: "03", color: "#87D3F2",
        caption: "The business logic - model-driven and canvas apps, flows, field and portfolio operations.",
        products: ["power-apps", "power-automate", "d365-field-service", "d365-project-ops", "dynamics365"],
      },
      {
        id: "data", name: "Data", index: "02", color: "#7DDBB0",
        caption: "One governed source of truth per client tenant, and the reporting built on it.",
        products: ["dataverse", "fabric", "power-bi"],
      },
      {
        id: "trust", name: "Trust & Platform", index: "01", color: "#B39BE8",
        caption: "Isolation, identity, DLP, lifecycle and Responsible AI controls beneath everything.",
        products: ["azure", "purview", "power-platform", "m365"],
      },
    ],
  },

  /* ----------------------------------------------------- product dictionary */
  products: {
    "d365-contact-center": {
      name: "Dynamics 365 Contact Center", family: "Dynamics 365",
      what: "The Microsoft Digital Contact Centre Platform - voice, email, SMS, chat, social and virtual agents managed from one agent desktop, with routing, IVR and real-time assist.",
      ey: "We have stood this up as the core of national-scale citizen contact operations, including the design of routing, queue and escalation models and the operating model around them.",
      proof: ["hse", "doj", "cso"],
    },
    "power-pages": {
      name: "Power Pages", family: "Power Platform",
      what: "Secure, accessible external-facing sites on Dataverse - where citizens and customers apply, upload, pay and track status without calling anyone.",
      ey: "Self-service portals built to public-service accessibility standards, with identity verification, appointment booking and payment gateway integration.",
      proof: ["doj", "cso"],
    },
    "d365-customer-service": {
      name: "Dynamics 365 Customer Service", family: "Dynamics 365",
      what: "Case management at volume - intake, routing, SLA enforcement, knowledge management and a 360° view of the customer for the agent.",
      ey: "We implement the case model, SLA framework and knowledge base, then wrap the workforce change around it so the queue is worked the way it was designed.",
      proof: ["hse", "doj"],
    },
    "teams": {
      name: "Microsoft Teams", family: "Microsoft 365",
      what: "Collaboration surfaced inside the service process - swarming on complex cases, embedded approvals and voice for contact centre.",
      ey: "We connect Teams into case and field workflows so escalation happens where people already work.",
      proof: ["hse"],
    },
    "sharepoint": {
      name: "SharePoint", family: "Microsoft 365",
      what: "Document management and content services behind case files, evidence packs and knowledge articles.",
      ey: "We connect document handling into the case lifecycle so records, retention and audit trails hold up under scrutiny.",
      proof: ["hse"],
    },
    "copilot": {
      name: "Microsoft Copilot", family: "AI",
      what: "AI assistance inside the products people already use - drafting, summarising and surfacing context at the point of work, plus custom agents grounded in governed knowledge.",
      ey: "We identify the processes where Copilot genuinely removes effort, then govern what it can see. Every answer stays traceable to a source the organisation controls.",
      proof: ["doj", "cso"],
    },
    "azure-ai": {
      name: "Azure AI", family: "Azure",
      what: "The model, search and document intelligence services underneath the agents, plus the predictive models behind proactive maintenance.",
      ey: "We build models the business can defend to its own engineers and to a regulator, rather than a black box nobody will act on.",
      proof: ["cso", "utility"],
    },
    "d365-sales": {
      name: "Dynamics 365 Sales", family: "Dynamics 365",
      what: "Guided selling with customer context, pipeline health and AI-supported insight for the seller.",
      ey: "We connect marketing, sales and service onto one customer record so the pipeline reflects what actually happened.",
      proof: [],
    },
    "power-apps": {
      name: "Power Apps", family: "Power Platform",
      what: "Model-driven and canvas applications on Dataverse, including offline-capable mobile apps for people working in the field.",
      ey: "We run app delivery as a factory - a backlog of business apps built to one standard on one data foundation, so they compound instead of colliding.",
      proof: ["cso", "kerry"],
    },
    "power-automate": {
      name: "Power Automate", family: "Power Platform",
      what: "Cloud flows and RPA that remove the swivel-chair work - approvals, data movement and system-to-system hand-offs.",
      ey: "We map automation to the control environment, so what you automate is also what you can evidence to an auditor.",
      proof: ["doj", "kerry"],
    },
    "d365-field-service": {
      name: "Dynamics 365 Field Service", family: "Dynamics 365",
      what: "Work order management, resource scheduling optimisation, mobile enablement with offline capability, asset history and preventative maintenance.",
      ey: "We move crews off paper schedules onto guided mobile work orders that hold up without signal, and wrap the safety and workforce change around the rollout.",
      proof: ["utility"],
    },
    "d365-project-ops": {
      name: "Dynamics 365 Project Operations", family: "Dynamics 365",
      what: "Portfolio, programme and project management in one place - planning, scheduling, resourcing, budget and demand management.",
      ey: "Delivered with our TPG PowerPPM accelerator: one live view of every project, spend and risk, so a national programme is steered on facts rather than status decks.",
      proof: ["cso"],
    },
    "dynamics365": {
      name: "Dynamics 365", family: "Dynamics 365",
      what: "The application portfolio itself - the only set of intelligent business applications that combines immediate impact with the flexibility to extend without limits.",
      ey: "We treat Dynamics as one connected estate rather than separate module rollouts, which is what keeps the customer record whole across marketing, sales, service and field.",
      proof: ["hse", "doj", "cso"],
    },
    "dataverse": {
      name: "Microsoft Dataverse", family: "Power Platform",
      what: "The governed data foundation. Every client gets their own isolated environment - never a shared store.",
      ey: "We design each client a separate, governed Dataverse with the data residency, isolation and lineage a regulator will accept.",
      proof: ["cso", "doj", "hse", "kerry", "utility"],
    },
    "fabric": {
      name: "Microsoft Fabric", family: "Data & AI",
      what: "The analytics platform behind the reporting layer - lakehouse, pipelines and semantic models.",
      ey: "We build the model once so apps and analytics share the same definitions and the numbers reconcile between them.",
      proof: ["kerry"],
    },
    "power-bi": {
      name: "Power BI", family: "Power Platform",
      what: "Governed reporting and analytics, secured by role, with drill-through to the underlying detail.",
      ey: "30+ production reports delivered on a single engagement, replacing insight that legacy systems could not produce at all.",
      proof: ["kerry", "cso", "utility"],
    },
    "azure": {
      name: "Microsoft Azure", family: "Azure",
      what: "Identity, integration, hosting and the security perimeter around the whole estate.",
      ey: "Enterprise integration to on-premises and legacy systems, with the Azure security and compliance posture designed by EY Cyber alongside the build.",
      proof: ["doj", "cso", "hse"],
    },
    "purview": {
      name: "Microsoft Purview", family: "Governance",
      what: "Data governance, classification, DLP and the audit trail across the estate.",
      ey: "We turn platform telemetry into board-level assurance - an inventory and set of controls around AI and data before an incident forces the issue.",
      proof: ["kerry", "hse"],
    },
    "power-platform": {
      name: "Power Platform (C4E)", family: "Power Platform",
      what: "The platform itself - environment strategy, DLP policy, ALM pipelines, licensing and the Centre for Enablement operating model.",
      ey: "We stand up governance a board will sign off, with Cyber, Data Protection and Risk in the room, so citizen development can continue safely instead of being shut down.",
      proof: ["kerry"],
    },
    "m365": {
      name: "Microsoft 365", family: "Microsoft 365",
      what: "The productivity and collaboration substrate the business already lives in.",
      ey: "We land solutions where people already work rather than adding another system to log into.",
      proof: ["doj"],
    },
  },

  /* ============================================================== THE CITY */
  city: {
    eyebrow: "EY · Microsoft AI - Business Applications",
    title: "BizApps",
    titleAccent: "City",
    lede: "Every landmark is a real client engagement EY has delivered on the Microsoft cloud. Explore the city, then step inside any building to see the challenge, what we built, and what it means for your organisation.",
    stats: [
      { v: "12", l: "Solutions shipped" },
      { v: "5",  l: "Client tenants" },
      { v: "40+", l: "EY specialists" },
      { v: "250K+", l: "Citizens reached" },
    ],
    cta: "Explore the city",
    note: "Each landmark is one client's separate Microsoft tenant. Drag to rotate the city, scroll to zoom, shift-drag to pan, and click a building to walk inside.",

    lifecycle: [
      { id: "advise", name: "Advise" },
      { id: "build",  name: "Build" },
      { id: "run",    name: "Run" },
    ],

    /* ------------------------------------------------------------------
     *  SOLUTIONS - reusable capability patterns, not client secrets.
     *  A client references these by id, so the same capability can appear at
     *  several clients and the "see this elsewhere" links derive themselves.
     *
     *  value[]  EXACTLY THREE, in this order: outcome, speed & commercial,
     *           why EY. `indicative: true` marks a figure that has not been
     *           signed off - it renders with an Indicative tag.
     * ---------------------------------------------------------------- */
    solutions: {
      "self-service": {
        name: "Self-Service & Citizen Portals",
        short: "Self-service portals",
        icons: ["power-pages"],
        lifecycle: ["build"],
        what: "Secure public-facing portals on Power Pages where citizens self-serve - apply, upload, pay, track status - without calling anyone.",
        value: [
          { t: "Business outcome", b: "The simple requests never reach an agent, so the phones stay free for the ones that need a human." },
          { t: "Speed & commercial shape", b: "6-8 weeks to a branded, accessible portal; from ~€90k.", indicative: true },
          { t: "Why EY", b: "Accessibility and identity built to public-service standard and assured by EY - a portal a department can defend at committee, not just demo." },
        ],
        relevant: "Any organisation with a public-facing application or renewal process can move the routine requests online, safely, without adding to the call queue.",
        pod: { n: 3, lead: "Terry Maguire" },
      },
      "contact-centre": {
        name: "Digital Contact Centre",
        short: "Digital Contact Centre",
        icons: ["d365-contact-center", "copilot"],
        lifecycle: ["advise", "build", "run"],
        what: "A national-scale contact centre on the Microsoft Digital Contact Centre Platform - voice, email, SMS, chat, social and virtual agents from one agent desktop, with routing, IVR and real-time assist.",
        value: [
          { t: "Business outcome", b: "One place to reach the organisation on any channel, with the full history in front of whoever answers." },
          { t: "Speed & commercial shape", b: "A live pilot queue in 10-14 weeks; from ~€320k depending on channel mix.", indicative: true },
          { t: "Why EY", b: "We have run this at national scale under public scrutiny, with the routing, queue and escalation model and the operating model designed together." },
        ],
        relevant: "Any organisation whose contact volume has outgrown a single channel can consolidate onto one desktop without losing the customer record between channels.",
        pod: { n: 6, lead: "Terry Maguire" },
      },
      "customer-service": {
        name: "Customer Service & Case Management",
        short: "Case management",
        icons: ["d365-customer-service"],
        lifecycle: ["build", "run"],
        what: "Case management for high-volume service teams - intake, routing, SLA enforcement, knowledge and reporting on Dynamics 365 Customer Service.",
        value: [
          { t: "Business outcome", b: "Every case tracked to resolution against an SLA, so nothing is lost between teams and managers see the backlog before it becomes a headline." },
          { t: "Speed & commercial shape", b: "8-12 weeks to a live queue; from ~€180k depending on integrations.", indicative: true },
          { t: "Why EY", b: "EY wraps the operating model and workforce change around the technology, so the queue is worked the way it was designed." },
        ],
        relevant: "Any service team drowning in email and spreadsheets can get a single, SLA-driven queue with reporting a leadership team actually trusts.",
        pod: { n: 4, lead: "Terry Maguire" },
      },
      "agent-copilot": {
        name: "Agent Copilot & Conversational AI",
        short: "Agent Copilot",
        icons: ["copilot"],
        lifecycle: ["advise", "build"],
        what: "Custom copilots and conversational agents grounded in the client's own governed knowledge and connected to Dynamics and Dataverse.",
        value: [
          { t: "Business outcome", b: "Routine questions answered in seconds, day or night, with every answer traceable to a source the organisation controls." },
          { t: "Speed & commercial shape", b: "A first agent in 4-6 weeks; from ~€75k, then iterate.", indicative: true },
          { t: "Why EY", b: "EY's Responsible AI and Cyber teams govern what the agent can say and see - the difference between a demo and something you put in front of the public." },
        ],
        relevant: "Any organisation with a large, repetitive question volume can deflect the routine ones safely, with answers grounded in its own governed content.",
        pod: { n: 3, lead: "Terry Maguire" },
      },
      "process-automation": {
        name: "Process Automation",
        short: "Process automation",
        icons: ["power-automate"],
        lifecycle: ["build", "run"],
        what: "Automating the swivel-chair work - approvals, data movement and integrations - with Power Automate cloud flows and RPA.",
        value: [
          { t: "Business outcome", b: "Hours of copy-paste a day handed back to the team, with a full audit trail of every automated step." },
          { t: "Speed & commercial shape", b: "First automations live in 4-6 weeks; from ~€60k.", indicative: true },
          { t: "Why EY", b: "EY maps automation to the control environment, so what you automate is also what you can evidence to an auditor." },
        ],
        relevant: "Any back-office team still moving data by hand between systems can automate the hand-offs with a full, auditable trail behind them.",
        pod: { n: 2, lead: "Harry Corbally" },
      },
      "enterprise-integration": {
        name: "Enterprise & Legacy Integration",
        short: "Legacy integration",
        icons: ["azure"],
        lifecycle: ["build", "run"],
        what: "The connective tissue to on-premises, SAP and legacy estates, with the Azure security and compliance posture designed alongside the build.",
        value: [
          { t: "Business outcome", b: "A modern front end that is not sitting on a broken foundation - the records stay where they legally have to and still reach the service." },
          { t: "Speed & commercial shape", b: "First integrations in 6-10 weeks; from ~€140k by system count.", indicative: true },
          { t: "Why EY", b: "EY Cyber designs the perimeter with the builders, not after them, so integration does not quietly become the weakest link." },
        ],
        relevant: "Any organisation modernising the front end while the system of record stays put can connect the two without a big-bang migration.",
        pod: { n: 3, lead: "Harry Corbally" },
      },
      "identity-trust": {
        name: "Identity, Trust & Data Protection",
        short: "Identity & trust",
        icons: ["purview", "azure"],
        lifecycle: ["advise", "build"],
        what: "Real-time identity verification, classification, DLP and the audit trail across everything behind the front door.",
        value: [
          { t: "Business outcome", b: "You can prove who was told what, and when - which is what transparency actually requires when it is tested." },
          { t: "Speed & commercial shape", b: "A verification and control baseline in 6-8 weeks; from ~€110k.", indicative: true },
          { t: "Why EY", b: "Cyber, Data Protection and Law sit in the same team as the builders, so the controls survive contact with a regulator." },
        ],
        relevant: "Any service disclosing personal information needs identity assurance at the front door and an audit trail behind it, designed together.",
        pod: { n: 3, lead: "Harry Corbally" },
      },
      "app-factory": {
        name: "App Factory & Mobile",
        short: "App factory & mobile",
        icons: ["power-apps"],
        lifecycle: ["build", "run"],
        what: "An industrialised app-delivery capability on Power Apps and Dataverse - model-driven and canvas apps, including offline-capable mobile for people working in the field.",
        value: [
          { t: "Business outcome", b: "A steady stream of apps retiring manual work, each built on the same data foundation so they compound instead of colliding." },
          { t: "Speed & commercial shape", b: "First apps in 6-8 weeks; run as a managed factory from ~€25k/month.", indicative: true },
          { t: "Why EY", b: "EY's data and assurance teams keep the estate coherent as it scales - the thing that breaks when a pure-play just keeps shipping." },
        ],
        relevant: "Any organisation with a long backlog of small internal apps can get them built to one standard, on one data foundation, instead of one-off and disconnected.",
        pod: { n: 4, lead: "Harry Corbally" },
      },
      "data-foundation": {
        name: "Governed Data Foundation",
        short: "Data foundation",
        icons: ["dataverse", "fabric"],
        lifecycle: ["build", "run"],
        what: "Each client's own governed data foundation - an isolated Dataverse environment, with Microsoft Fabric, giving that client one trusted source for every app and report.",
        value: [
          { t: "Business outcome", b: "Apps and analytics built once on trusted data, so the next solution is weeks not months and the numbers reconcile." },
          { t: "Speed & commercial shape", b: "Foundations in 8-10 weeks; from ~€160k.", indicative: true },
          { t: "Why EY", b: "EY designs each client a separate, governed Dataverse - data residency, isolation and lineage a regulator will accept - never a shared store." },
        ],
        relevant: "Any organisation about to build several apps or reports can start from one governed data foundation instead of a new silo for each one.",
        pod: { n: 3, lead: "Harry Corbally" },
      },
      "insight-reporting": {
        name: "Insight & Reporting",
        short: "Insight & reporting",
        icons: ["power-bi"],
        lifecycle: ["build"],
        what: "Governed reporting and analytics on Power BI, secured by role, with drill-through to the underlying detail.",
        value: [
          { t: "Business outcome", b: "Leadership sees the same trusted figures, with drill-through to the detail, instead of arguing about whose spreadsheet is right." },
          { t: "Speed & commercial shape", b: "A first governed dashboard in 6-8 weeks; from ~€95k.", indicative: true },
          { t: "Why EY", b: "EY's Data & AI and Assurance practices stand behind the model, so the numbers hold up when they leave the room." },
        ],
        relevant: "Any organisation reporting from several disconnected spreadsheets can move to one governed model, with the same figures for everyone who needs them.",
        pod: { n: 3, lead: "Donal Cahill" },
      },
      "c4e": {
        name: "Centre for Enablement (C4E)",
        short: "Centre for Enablement",
        icons: ["power-platform", "purview"],
        lifecycle: ["advise", "build"],
        what: "A Centre for Enablement that lets a client's own people build on Power Platform safely - standards, guardrails, reuse and governance with Purview.",
        value: [
          { t: "Business outcome", b: "Hundreds of citizen developers shipping without a shadow-IT mess - one governed platform instead of a thousand unmanaged apps." },
          { t: "Speed & commercial shape", b: "Stood up in 12 weeks at ~€285k, then it pays for itself as delivery moves in-house.", indicative: true },
          { t: "Why EY", b: "EY sets the governance a board will sign off - Cyber, Data Protection and Risk in the room - not just a tenant with the settings turned on." },
        ],
        relevant: "Any organisation with citizen developers already building apps informally can get the guardrails to let that continue safely, instead of shutting it down.",
        pod: { n: 3, lead: "Harry Corbally" },
      },
      "portfolio": {
        name: "Portfolio & Project Management",
        short: "Portfolio management",
        icons: ["d365-project-ops"],
        lifecycle: ["advise", "build", "run"],
        what: "Portfolio and project management across a large programme - plans, resources and reporting, delivered with our TPG PowerPPM accelerator.",
        value: [
          { t: "Business outcome", b: "One live view of every project, spend and risk, so the programme is steered on facts rather than status decks." },
          { t: "Speed & commercial shape", b: "Stood up in 8-10 weeks; run as a service from ~€20k/month.", indicative: true },
          { t: "Why EY", b: "EY brings the programme-delivery muscle and TPG the tooling depth - governance a national programme can be run on, and assured." },
        ],
        relevant: "Any organisation running a large, multi-year programme can get one live view of progress, spend and risk instead of status decks built by hand.",
        pod: { n: 6, lead: "Donal Cahill" },
      },
      "field-service": {
        name: "Field Service & Scheduling",
        short: "Field service",
        icons: ["d365-field-service"],
        lifecycle: ["build", "run"],
        what: "Scheduling, mobile work orders and asset history for field crews on Dynamics 365 Field Service - online and offline.",
        value: [
          { t: "Business outcome", b: "More jobs done right first time, because the engineer arrives with the history, the parts and the next step already in hand." },
          { t: "Speed & commercial shape", b: "Live in 10-12 weeks; from ~€200k depending on fleet size.", indicative: true },
          { t: "Why EY", b: "EY wraps the workforce change and safety process around the rollout - the reason field programmes stick instead of stalling at go-live." },
        ],
        relevant: "Any organisation with crews working from paper schedules can move to guided, mobile work orders that hold up offline in the field.",
        pod: { n: 4, lead: "Gerry Reid" },
      },
      "predictive-maintenance": {
        name: "Asset & Predictive Maintenance",
        short: "Predictive maintenance",
        icons: ["azure-ai", "dataverse"],
        lifecycle: ["advise", "build"],
        what: "Predictive maintenance - asset data and Azure AI flagging failures before they happen, feeding work straight into the field schedule.",
        value: [
          { t: "Business outcome", b: "Fewer unplanned outages, because the asset tells you it is about to fail while you can still plan the fix." },
          { t: "Speed & commercial shape", b: "A first predictive model in 10-12 weeks; from ~€150k.", indicative: true },
          { t: "Why EY", b: "EY's engineers and data scientists build models the business trusts and can defend - not a black box nobody will act on." },
        ],
        relevant: "Any organisation running critical physical assets can move from reactive repairs to planned ones, with a model its own engineers can defend.",
        pod: { n: 3, lead: "Gerry Reid" },
      },
      "knowledge-collab": {
        name: "Knowledge & Collaboration",
        short: "Knowledge & collaboration",
        icons: ["sharepoint", "teams"],
        lifecycle: ["build"],
        what: "One governed source of what agents may say, with escalation and swarming where the specialists already work.",
        value: [
          { t: "Business outcome", b: "Consistency of answer, which in an exposed service matters as much as speed." },
          { t: "Speed & commercial shape", b: "A governed knowledge base in 4-6 weeks; from ~€55k.", indicative: true },
          { t: "Why EY", b: "EY connects document handling into the case lifecycle, so records, retention and audit trails hold up under scrutiny." },
        ],
        relevant: "Any organisation where the wrong answer is expensive needs one governed source of truth for its front line, not a shared drive.",
        pod: { n: 2, lead: "Terry Maguire" },
      },
      "managed-run": {
        name: "Managed Service & 24/7 Run",
        short: "Managed service",
        icons: ["azure", "m365"],
        lifecycle: ["advise", "build", "run"],
        what: "A managed service - we run the platform in production: monitoring, releases, support and continuous improvement.",
        value: [
          { t: "Business outcome", b: "The service stays up and keeps getting better, with one accountable team instead of a hand-off to a support queue that never met the build." },
          { t: "Speed & commercial shape", b: "Onboarded in 4-6 weeks; from ~€15k/month by scope.", indicative: true },
          { t: "Why EY", b: "Advise, build and run under one EY roof - the same firm that designed it keeps it alive, with the SLAs a critical service demands." },
        ],
        relevant: "Any organisation worried about what happens after go-live can hand run-the-service to the same team that designed and built it.",
        pod: { n: 4, lead: "Gerry Reid" },
      },
    },

    /* Each client is a DISTINCT landmark. `kind` selects its architecture
       from LANDMARKS in landmarks.js. `solutions` are ids into the library
       above, revealed as rooms when you step into the building. */
    clients: [
      {
        id: "doj",
        kind: "courthouse",
        name: "Department of Justice",
        short: "DOJ",
        sector: "Justice · National",
        tone: "#B58BE8",
        pos: [0, -14.8],
        logo: "doj",
        tagline: "Modernising immigration services citizens depend on",
        challenge: "Immigration Service Delivery ran a helpdesk on a single communication channel. Daily query volume could not be supported by one channel and a small team, large volumes of data sat in on-premises systems, and 900+ appointments were booked each day with no customer-facing scheduling.",
        outcome: "A secure self-service portal now lets applicants apply, book, pay and track status online, backed by case management and automation that remove manual hand-offs behind the scenes. Self-service addresses the majority of queries using the same number of agents.",
        eyDiff: "EY paired Power Platform delivery with public-service accessibility standards, real-time identity verification and change management, so the portal is one a department can defend at committee, not just demo.",
        stats: [
          { v: "100,000+", l: "Managed service cases processed" },
          { v: "€25m", l: "Modernisation investment" },
          { v: "900+", l: "Appointments booked daily" },
        ],
        collab: "BizApps · Technology Delivery · Cybersecurity · EY SMRs",
        solutions: ["self-service", "contact-centre", "agent-copilot", "customer-service", "process-automation", "enterprise-integration"],
        journey: [
          { sid: "self-service", t: "An applicant needs to renew a permission. Before, that meant one phone line." },
          { sid: "contact-centre", t: "Anything the portal cannot settle routes into the Digital Contact Centre with full context." },
          { sid: "agent-copilot", t: "A Copilot agent answers the routine follow-ups instantly, day or night." },
          { sid: "customer-service", t: "A case opens with an owner and an SLA, so nothing sits unassigned." },
          { sid: "process-automation", t: "Automation moves the work between portal and back office without re-keying." },
          { sid: "enterprise-integration", t: "The records stay in the on-premises systems that hold them, reached rather than replaced." },
        ],
        related: ["hse"],
      },
      {
        id: "hse",
        kind: "hospital",
        name: "Health Service Executive",
        short: "HSE",
        sector: "Health · National",
        tone: "#F5769A",
        pos: [-14.8, 0],
        logo: "hse",
        tagline: "National-scale citizen response",
        challenge: "Following a ransomware attack, a national health service organisation needed to notify every citizen whose data had been breached - across varied risk levels, a wide stakeholder set, strict legal and regulatory requirements, and intense public scrutiny, while protecting the service itself from social engineering.",
        outcome: "The cloud digital contact centre was provisioned, delivered and operated over a 2.5 year period, engaging with over 200,000 affected individuals. At peak it ran almost 100 full and part-time agents. The service met its three core requirements: efficiency, transparency and security.",
        eyDiff: "EY ran this for real, with Cyber, Data Protection, Law and Change in the same team from day one. A pure-play contact-centre vendor cannot staff that combination.",
        stats: [
          { v: "250,000+", l: "People contacted" },
          { v: "~100", l: "Agents at peak" },
          { v: "2.5 yrs", l: "Operated in production" },
        ],
        collab: "Technology Delivery · BizApps · Cybersecurity · Systems Engineering · QA",
        solutions: ["contact-centre", "identity-trust", "self-service", "customer-service", "knowledge-collab", "managed-run"],
        journey: [
          { sid: "identity-trust", t: "A citizen asks whether their data was breached. Identity is assured before anything is disclosed." },
          { sid: "contact-centre", t: "They reach a contact centre built for this scale, not a queue borrowed from elsewhere." },
          { sid: "knowledge-collab", t: "The agent answers from one governed source, so answers stay consistent across 100 people." },
          { sid: "customer-service", t: "A defined path to resolution runs from identification through to response." },
          { sid: "self-service", t: "Anyone who prefers to self-serve can track their own request instead of holding." },
          { sid: "managed-run", t: "EY operated the service for 2.5 years, not just delivered it." },
        ],
        related: ["doj", "cso"],
      },
      {
        id: "cso",
        kind: "observatory",
        name: "Central Statistics Office",
        short: "CSO",
        sector: "Statistics · National",
        tone: "#4FA8E8",
        pos: [22.2, -7.4],
        logo: "cso",
        tagline: "Delivering Census 2027 as a national programme",
        challenge: "The CSO intends to digitise all future censuses. Census 2027 will primarily be digital, with most householders completing online. The enumerator role has shifted from door-to-door collection to handling non-response, and the barrier to a first digital census had to be lowered for every household in the country.",
        outcome: "A responsive portal, an offline-capable field app and an omnichannel contact centre run on one governed data foundation, with programme reporting giving leadership a live view instead of status decks. EY is delivery partner and managed service provider with 24/7 support through pilots, testing and go-live.",
        eyDiff: "EY brings the programme-delivery muscle and TPG the tooling depth - governance a national statistics programme can be run on, and assured.",
        stats: [
          { v: "20,000+", l: "Homes in the portal pilot" },
          { v: "24/7", l: "Managed service coverage" },
          { v: "Multi-yr", l: "National programme" },
        ],
        collab: "BizApps · Cloud · Cybersecurity · Digital Assurance · EY SMRs",
        solutions: ["self-service", "app-factory", "contact-centre", "portfolio", "data-foundation", "managed-run"],
        journey: [
          { sid: "self-service", t: "A household opens the census online. For most of the country, a first." },
          { sid: "app-factory", t: "Where nobody responds, a Field Support Officer picks it up on an app that works offline." },
          { sid: "contact-centre", t: "Citizen, officer and recruitment queries all land in one omnichannel centre." },
          { sid: "data-foundation", t: "Every channel writes to the same governed foundation, inside the CSO's own tenant." },
          { sid: "portfolio", t: "Programme leadership sees progress, spend and risk live rather than in status decks." },
          { sid: "managed-run", t: "EY runs it 24/7 through pilots, testing and go-live." },
        ],
        related: ["hse"],
      },
      {
        id: "kerry",
        kind: "plant",
        name: "Kerry Group",
        short: "Kerry",
        sector: "Food & Beverage · Global",
        tone: "#5BC9A8",
        logo: "kerry",
        pos: [-7.4, 22.2],
        tagline: "Scaling low-code safely across a global business",
        challenge: "Capital investment ran across SAP and manual reconciliation, while Power Platform adoption was growing faster than the governance around it. Reporting could not answer the questions leadership was already asking of the legacy estate.",
        outcome: "A Centre for Enablement set the guardrails, SAP integration automated financial data flows for 800+ users and eliminated manual reconciliation, and 30+ Power BI reports delivered insight beyond legacy system capability. Globally recognised across the group.",
        eyDiff: "EY set the guardrails that let hundreds of makers keep shipping safely instead of being shut down, and deleted the manual reconciliation step rather than automating it.",
        stats: [
          { v: "800+", l: "Users on integrated flows" },
          { v: "30+", l: "Production Power BI reports" },
          { v: "5", l: "Governed project stages" },
        ],
        collab: "BizApps · Data & Analytics · Managed Services",
        solutions: ["c4e", "enterprise-integration", "app-factory", "process-automation", "insight-reporting", "managed-run"],
        journey: [
          { sid: "c4e", t: "Business people are already building apps. A Centre for Enablement sets the guardrails." },
          { sid: "app-factory", t: "App delivery becomes a factory, every app built to the same standard." },
          { sid: "enterprise-integration", t: "SAP integration automates the financial flows for 800+ users." },
          { sid: "process-automation", t: "Approvals are systemised across five governed project stages." },
          { sid: "insight-reporting", t: "30+ production reports answer what the legacy estate never could." },
          { sid: "managed-run", t: "Managed services and continuous improvement sustain it after go-live." },
        ],
        related: ["cso"],
      },
      {
        id: "utility",
        kind: "powerstation",
        name: "EirGrid",
        short: "EirGrid",
        sector: "Energy & Utilities · National",
        tone: "#00A88F",
        pos: [14.8, 14.8],
        logo: "eirgrid",
        tagline: "Running field operations at national scale",
        challenge: "Field crews worked from paper schedules and asset maintenance was reactive, with unplanned outages absorbing the capacity that should have been planned work.",
        outcome: "Field Service scheduling with offline mobile work orders, plus predictive maintenance feeding straight into the schedule, so crews arrive prepared and failures are caught while there is still time to plan the fix.",
        eyDiff: "EY's engineers and data scientists build maintenance models the client's own engineers can interrogate and defend, not a black box nobody will act on.",
        stats: [
          { v: "Offline", l: "Full field capability" },
          { v: "Proactive", l: "Maintenance posture" },
          { v: "Assured", l: "Model governance" },
        ],
        collab: "BizApps · Engineering · Data Science",
        solutions: ["field-service", "predictive-maintenance", "process-automation", "app-factory", "data-foundation", "insight-reporting"],
        journey: [
          { sid: "predictive-maintenance", t: "An asset starts showing the pattern that precedes a failure." },
          { sid: "process-automation", t: "Automation turns that prediction into a scheduled job, not a report nobody reads." },
          { sid: "field-service", t: "Scheduling picks the right technician by skill, location and availability." },
          { sid: "app-factory", t: "The crew gets a guided work order with history and parts, offline capable." },
          { sid: "data-foundation", t: "The asset register updates, feeding the next maintenance cycle." },
          { sid: "insight-reporting", t: "First-time-fix and utilisation show whether the operating model really changed." },
        ],
        related: ["kerry"],
      },
    ],

    core: {
      name: "EY",
      sub: "Microsoft AI Business Applications",
      body: "EY sits at the centre of the city. Each landmark around it is a separate client in its own isolated Microsoft tenant with its own governed Dataverse - they are not joined to one another. What they share is the standard EY brings to all of them: environment strategy, identity, DLP, lifecycle and Responsible AI controls.",
    },
  },
  capability: {
    kicker: "What we do",
    title: "We connect experiences, data and processes to deliver measurable value",
    columns: [
      { title: "Know & engage customers", tone: "#FFE600", items: [
        "Create a more complete view of the customer",
        "Connect customer data across systems and interactions",
        "Improve marketing journey orchestration",
        "Personalise engagement across the lifecycle"] },
      { title: "Serve customers intelligently", tone: "#FF9831", items: [
        "Modernise customer service and case management",
        "Create digital and omnichannel contact centres",
        "Enable portals, self-service and conversational experiences",
        "Support agents with Copilot, knowledge and real-time context"] },
      { title: "Transform operations", tone: "#87D3F2", items: [
        "Digitise manual and fragmented business processes",
        "Enable intelligent field service and mobile operations",
        "Build low-code applications and workflow automation",
        "Improve visibility through data, reporting and insights"] },
      { title: "Scale innovation safely", tone: "#B39BE8", items: [
        "Establish Power Platform governance and C4E",
        "Implement environment, security and ALM controls",
        "Support responsible adoption of Copilot and agents",
        "Measure adoption, performance and business value"] },
    ],
  },

  /* ------------------------------------------------------------- offerings */
  offerings: {
    kicker: "Our offerings",
    title: "Four things we sell, and can prove",
    items: [
      { name: "Customer Service & Digital Contact Centre", icon: "d365-contact-center", tone: "#FFE600",
        contact: "Terry Maguire", email: "terry.maguire@ie.ey.com", client: "doj",
        body: "Omnichannel engagement, case management, knowledge, SLAs, IVR and AI-powered agent assist - voice, email, chat, SMS, social and virtual agents from one desktop." },
      { name: "Project Portfolio Management", icon: "d365-project-ops", tone: "#87D3F2",
        contact: "Harry Corbally", email: "harry.corbally@ie.ey.com", client: "cso",
        body: "Portfolio, programme and project functions under one solution on the TPG PowerPPM accelerator - resourcing, budget, demand management and live portfolio reporting." },
      { name: "Field Service", icon: "d365-field-service", tone: "#7DDBB0",
        contact: "Gerry Reid", email: "gerry.reid@ie.ey.com", client: "utility",
        body: "Work order management, scheduling optimisation, offline mobile enablement, asset history, preventative maintenance and customer self-service portals." },
      { name: "C4E & Power Factory", icon: "power-platform", tone: "#B39BE8",
        contact: "Harry Corbally", email: "harry.corbally@ie.ey.com", client: "kerry",
        body: "Platform governance, UX design system, accelerators, ALM, change management, training and DLP - proprietary EY tools that turn scattered low-code into governed scale." },
    ],
  },

  /* ----------------------------------------------------------------- scale */
  scale: {
    kicker: "How big we are",
    title: "Milestones",
    milestones: [
      { v: "250,000+", l: "people contacted for a major national outreach programme for a national healthcare provider" },
      { v: "100,000+", l: "managed service processing cases supporting the national service for Irish Immigration" },
      { v: "20,000+", l: "homes responding to the online portal for a major national statistical agency census pilot" },
      { v: "250,000+", l: "active customers in a major public sector contact centre" },
    ],
    why: [
      { t: "Certified across the stack", b: "Certified professionals across Dynamics 365, Power Platform, Azure and DevOps." },
      { t: "Global reach, local expertise", b: "Delivery spanning Ireland, Poland, Mexico and India." },
      { t: "Accelerated by design", b: "EY wavespace and GenAI tools accelerate design, user stories and MVP delivery." },
      { t: "Built with Microsoft", b: "Industry-specific solutions infused with AI and automation, built alongside Microsoft." },
    ],
    clients: {
      title: "Our top managed clients",
      groups: [
        /* `logo` is the key into window.ICONS. A name without one renders as a
           text chip, so the list never waits on an asset that does not exist. */
        { sector: "Health services", names: [
          { n: "HSE", logo: "hse" },
          { n: "Tusla", logo: "tusla" },
          { n: "HIQA", logo: "hiqa" },
          { n: "Children's Health Ireland", logo: "chi" },
        ] },
        { sector: "Public", names: [
          { n: "Department of Justice", logo: "doj" },
          { n: "EirGrid", logo: "eirgrid" },
          { n: "Central Statistics Office", logo: "cso" },
        ] },
        { sector: "Private food & beverage", names: [
          { n: "Kerry Group", logo: "kerry" },
        ] },
      ],
    },
  },

  /* ------------------------------------------------------------------ team */
  team: {
    kicker: "The team",
    title: "BizApps leadership",
    lede: "40+ specialists and growing, from analyst to director, within Technology Consulting under the Microsoft & Cloud Services Group.",
    people: [
      { name: "Terry Maguire", role: "Partner", title: "BizApps Lead \u00b7 Tenders and Ops Call Cover", email: "Terry.Maguire@ie.ey.com", tone: "#FFE600", photo: "assets/team/terry-maguire.jpg" },
      { name: "Harry Corbally", role: "Director", title: "BD and Marketing Lead", email: "Harry.Corbally@ie.ey.com", tone: "#FF9831", photo: "assets/team/harry-corbally.jpg" },
      { name: "Donal Cahill", role: "Director", title: "Finance Lead", email: "Donal.Cahill@ie.ey.com", tone: "#87D3F2", photo: "assets/team/donal-cahill.jpg" },
      { name: "Gerry Reid", role: "Director", title: "L&D Lead", email: "Gerry.Reid@ie.ey.com", tone: "#7DDBB0", photo: "assets/team/gerry-reid.jpg" },
      { name: "Balamurugan Pillai", role: "Senior Manager", title: "HR and Recruitment Lead", email: "Balamurugan.V.Pillai@ie.ey.com", tone: "#B39BE8", photo: "assets/team/balamurugan-pillai.jpg" },
    ],
  },

  close: {
    kicker: "The proposition",
    title: "Connect the journey. Then improve it continuously with data and AI.",
    body: "The objective is not to deploy isolated applications. It is to create a connected experience across every relevant customer and operational touchpoint, and to keep improving it once it is live.",
    cta: "Talk to the BizApps team",
    email: "Terry.Maguire@ie.ey.com",
    disclaimer: "Internal and client-facing capability overview. Microsoft, EY and client marks are the property of their respective owners and are used to identify the technology stack and delivered engagements. Client references are drawn from delivered EY Ireland engagements; confirm approval status before external use.",
  },
};

/* ============================================================================
 *  BRIEFS - the short form.
 *  ---------------------------------------------------------------------------
 *  The Engagement Index was carrying four dense paragraphs per client and
 *  reading like a case study nobody finishes. These are the same engagements
 *  compressed to what somebody actually takes away: one line on the problem,
 *  one on the result, and three before/after pairs the diagram draws.
 *
 *  Nothing new is asserted here. Every line is a compression of the challenge,
 *  outcome and eyDiff text already in window.BIZ.city.clients, which stays the
 *  source of truth and is still one click away behind "the full account".
 * ========================================================================== */
window.BIZ.briefs = {
  doj: {
    problem: "A national immigration service running its entire query volume through one communication channel.",
    result: "Self-service now handles the majority of queries with the same number of agents.",
    pairs: [
      ["One phone line for every query", "Apply, pay and track online at any hour"],
      ["900+ appointments a day, booked for the applicant", "Applicants book their own appointment"],
      ["Records locked inside on-premises systems", "Those records reached in place, not migrated"],
    ],
  },
  hse: {
    problem: "Every citizen whose data was exposed in a ransomware attack had to be told, under regulatory and public scrutiny.",
    result: "A contact centre EY built and then operated for two and a half years, reaching over 250,000 people.",
    pairs: [
      ["No route to contact 250,000 affected people", "One omnichannel service, operated for 2.5 years"],
      ["Disclosure with no identity assurance in front of it", "Identity assured before anything is disclosed"],
      ["~100 agents with no single source of answer", "One governed knowledge base behind every answer"],
    ],
  },
  cso: {
    problem: "The first primarily digital census in the country, with the barrier lowered for every household.",
    result: "A portal, an offline field app and an omnichannel centre on one governed foundation, run 24/7 by EY.",
    pairs: [
      ["A census collected door to door", "A census completed online by most households"],
      ["Enumerators calling on every address", "Field officers handling non-response only, offline capable"],
      ["A programme steered on hand-built status decks", "Progress, spend and risk visible live"],
    ],
  },
  kerry: {
    problem: "Low-code adoption growing faster than the governance around it, on top of manual financial reconciliation.",
    result: "A Centre for Enablement, automated SAP flows for 800+ users and 30+ production reports.",
    pairs: [
      ["Capital investment reconciled by hand across SAP", "Financial data flowing automatically for 800+ users"],
      ["Makers building faster than governance could follow", "A Centre for Enablement setting the guardrails"],
      ["Reporting that could not answer the question asked", "30+ reports beyond what the legacy estate offered"],
    ],
  },
  utility: {
    problem: "Field crews working from paper schedules, with unplanned outages absorbing the capacity meant for planned work.",
    result: "Guided mobile work orders plus predictive maintenance feeding straight into the schedule.",
    pairs: [
      ["Crews working from paper schedules", "Guided mobile work orders that hold up offline"],
      ["Maintenance reactive, outages unplanned", "Failures flagged while there is still time to plan"],
      ["A predictive model nobody would act on", "Models the client's own engineers can interrogate"],
    ],
  },
};

/* ============================================================================
 *  PROPOSITIONS - what we sell that the portfolio cannot yet prove.
 *  ---------------------------------------------------------------------------
 *  Recommendation 8. The asset under-represents the unit it now sits inside:
 *  Studio+ consolidates design, sales, marketing and customer-experience
 *  technology, and there is no marketing, sales or customer-insight story
 *  anywhere in the five engagements. The d365-sales product entry proves it -
 *  it is the only one in the dictionary carrying an empty proof array.
 *
 *  These are deliberately NOT city landmarks and NOT engagements. The city
 *  opens on a promise - "every landmark is a real client engagement EY has
 *  delivered" - and that promise is one of the strongest things the asset has.
 *  Putting an aspiration on the skyline beside HSE and CSO would spend it.
 *
 *  So they live here, named as propositions, with no invented statistics and
 *  no invented client. The honest version of the coverage gap is more useful
 *  to a partner than a filled one: it says where the next credential needs to
 *  come from.
 * ========================================================================== */
window.BIZ.propositions = {
  kicker: "03 · Where we are investing",
  title: "Two propositions the portfolio cannot yet prove.",
  lede: "Shown separately from delivered work, on purpose. These are the plays we are taking to market where the credential is still to come - which is also where the next one needs to land.",
  items: [
    {
      id: "customer-growth",
      name: "Connected Customer Growth",
      tone: "#FF9831",
      trigger: "Disconnected marketing, sales and service; fragmented customer data; weak conversion or retention.",
      response: "Connect insights, marketing, sales and service so engagement stays consistent across the lifecycle and the pipeline reflects what actually happened.",
      icons: ["d365-sales", "dataverse", "fabric", "power-bi"],
      /* The honest statement of the gap, drawn from the content model itself:
         d365-sales is the only product in the dictionary with no proof. */
      gap: "No delivered credential in this portfolio. Every other capability shown here is in production somewhere.",
      fit: "The Customer & Growth half of the Studio+ proposition, and the half the five engagements do not speak to.",
    },
    {
      id: "agentic",
      name: "Agentic Enterprise",
      tone: "#B39BE8",
      trigger: "AI pilots that do not reach production, uncontrolled low-code activity and no evidence of measurable value.",
      response: "Copilot Studio agents and automation taken past the pilot, with the C4E governance, DLP and lifecycle controls that let them scale safely.",
      icons: ["copilot", "azure-ai", "power-platform", "purview"],
      gap: "Agent work is delivered inside wider engagements rather than as a proposition in its own right. The credential exists; the story does not.",
      fit: "Aligns to the agentic enterprise campaign mobilising separately, and to the FY27 AI plan each competency has been asked to set out.",
    },
  ],
};
