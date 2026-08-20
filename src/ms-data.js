/* ============================================================================
 *  POWER PLATFORM LANDSCAPE · CONTENT   (edit this file only)
 *  ---------------------------------------------------------------------------
 *  grid coords [gx, gy] place a node on the isometric plane (origin = centre).
 *  `layer`  -> colour + legend group.  `h` -> building height (tiles).
 *  Swap the placeholder solutions for your real Power Platform projects.
 * ========================================================================== */
window.SHOWCASE = {

  brand: { name: "BIZZAPPS", tagline: "Business solutions on the Microsoft Power Platform" },

  aggregate: [
    { label: "Solutions shipped", value: 8,   suffix: ""   },
    { label: "Clients served",    value: 9,   suffix: ""   },
    { label: "Hours saved / yr",  value: 182, suffix: "K"  },
    { label: "Avg. delivery",     value: 6,   suffix: " wk" },
  ],

  /* the five layers of the platform (colours + legend) */
  layers: [
    { id: "data",    name: "Data",        color: "#8A5CD1" },
    { id: "apps",    name: "Apps",        color: "#C4399B" },
    { id: "auto",    name: "Automation",  color: "#2E7AD1" },
    { id: "insight", name: "Insights",    color: "#E2A310" },
    { id: "exp",     name: "Experiences", color: "#12A5A5" },
  ],

  /* ---- Microsoft platform building blocks (each shows its product logo) ---- */
  services: {
    dataverse:     { name: "Dataverse",      logo: "dataverse",  layer: "data",    pos: [0, 0],       h: 2.5, size: 1.5, hero: true,
      blurb: "The secure, governed data foundation every solution is built on." },
    powerapps:     { name: "Power Apps",     logo: "powerapps",  layer: "apps",    pos: [-2.1, -0.7], h: 0.7, size: 1.15,
      blurb: "Low-code canvas & model-driven apps for web and mobile." },
    dynamics:      { name: "Dynamics 365",   logo: "dynamics",   layer: "apps",    pos: [-2.7, 1.1],  h: 0.7, size: 1.15,
      blurb: "First-party CRM/ERP apps extended to fit the business." },
    powerautomate: { name: "Power Automate", logo: "powerautomate", layer: "auto", pos: [-0.7, -2.1], h: 0.7, size: 1.15,
      blurb: "Cloud flows and RPA that remove the manual steps." },
    copilot:       { name: "Copilot Studio", logo: "copilot",    layer: "auto",    pos: [1.1, -2.7],  h: 0.7, size: 1.15,
      blurb: "Custom AI copilots and agents grounded in your data." },
    powerbi:       { name: "Power BI",       logo: "powerbi",    layer: "insight", pos: [2.1, -0.7],  h: 0.7, size: 1.15,
      blurb: "Governed dashboards and embedded analytics." },
    azure:         { name: "Azure",          logo: "azure",      layer: "insight", pos: [2.7, 1.1],   h: 0.7, size: 1.15,
      blurb: "Scalable cloud services, integration and AI behind the scenes." },
    powerpages:    { name: "Power Pages",    logo: "powerpages", layer: "exp",     pos: [0.7, 2.1],   h: 0.7, size: 1.15,
      blurb: "Secure external-facing websites and portals." },
    sharepoint:    { name: "SharePoint",     logo: "sharepoint", layer: "exp",     pos: [-1.1, 2.7],  h: 0.7, size: 1.15,
      blurb: "Documents, content and collaboration." },
    teams:         { name: "Teams",          logo: "teams",      layer: "exp",     pos: [-2.8, 2.9],  h: 0.7, size: 1.15,
      blurb: "Solutions delivered where people already work." },
  },

  /* ---- the business solutions we delivered (taller buildings) ---- */
  apps: [
    { id:"field", name:"Field Service Companion", client:"Utilities provider", layer:"apps",
      pos:[-4.6,-2.2], h:2.1, size:1.25, year:2025,
      uses:["powerapps","dataverse","powerautomate"],
      summary:"A mobile-first app that guides engineers through every site visit offline, captures assets and photos, and syncs the moment they reconnect.",
      features:["Offline mobile app","Guided inspections","Asset capture","Auto work-order sync"],
      metrics:[{label:"Admin time",value:-64,suffix:"%"},{label:"First-time fix",value:22,suffix:"%"},{label:"Engineers",value:640,suffix:""}] },

    { id:"approvals", name:"Approvals Hub", client:"Financial services group", layer:"auto",
      pos:[-2.4,-4.6], h:1.8, size:1.2, year:2024,
      uses:["powerautomate","teams","dataverse"],
      summary:"Every approval — spend, contracts, access — routed, tracked and actioned inside Teams, with a full audit trail replacing scattered email chains.",
      features:["Policy-based routing","Approve in Teams","SLA reminders","Audit trail"],
      metrics:[{label:"Cycle time",value:-71,suffix:"%"},{label:"Approvals/mo",value:38,suffix:"K"}] },

    { id:"exec", name:"Executive Insights", client:"Board & leadership", layer:"insight",
      pos:[2.4,-4.6], h:2.0, size:1.2, year:2025,
      uses:["powerbi","dataverse","azure"],
      summary:"A single governed dashboard uniting finance, operations and sales, with drill-through and a natural-language Q&A copilot for the leadership team.",
      features:["Unified KPIs","Drill-through","Natural-language Q&A","Row-level security"],
      metrics:[{label:"Report prep",value:-80,suffix:"%"},{label:"Data sources",value:14,suffix:""}] },

    { id:"portal", name:"Customer Portal", client:"Insurance broker", layer:"exp",
      pos:[4.6,-2.0], h:1.7, size:1.2, year:2024,
      uses:["powerpages","dataverse","powerautomate"],
      summary:"A branded self-service portal where 40k customers manage policies, upload documents and track claims — cutting the call-centre load sharply.",
      features:["Self-service policies","Secure document upload","Claim tracking","SSO"],
      metrics:[{label:"Call volume",value:-46,suffix:"%"},{label:"Customers",value:40,suffix:"K"}] },

    { id:"onboard", name:"Onboarding Studio", client:"Enterprise · 8k staff", layer:"apps",
      pos:[4.9,1.2], h:1.6, size:1.2, year:2024,
      uses:["powerapps","sharepoint","powerautomate"],
      summary:"New-joiner journeys that provision accounts, assign kit and walk people through week one — orchestrated end-to-end with zero manual handoffs.",
      features:["Joiner workflows","Auto provisioning","Task checklists","e-Signatures"],
      metrics:[{label:"Setup time",value:-75,suffix:"%"},{label:"Joiners/yr",value:3200,suffix:""}] },

    { id:"servicedesk", name:"Service Desk 365", client:"Managed services firm", layer:"apps",
      pos:[2.3,4.7], h:1.9, size:1.2, year:2025,
      uses:["dynamics","copilot","dataverse"],
      summary:"A model-driven service desk where an AI copilot deflects routine tickets, drafts replies and surfaces the next best action for every agent.",
      features:["Model-driven CRM","AI deflection","Suggested replies","Knowledge base"],
      metrics:[{label:"Deflected",value:41,suffix:"%"},{label:"Handle time",value:-33,suffix:"%"}] },

    { id:"inspect", name:"Inspection Capture", client:"Manufacturer · 300 sites", layer:"insight",
      pos:[-2.2,4.7], h:1.7, size:1.2, year:2023,
      uses:["powerapps","dataverse","powerbi"],
      summary:"Tablet-based quality inspections that flow straight into live compliance dashboards, so plant managers see issues the moment they happen.",
      features:["Tablet inspections","Photo evidence","Live compliance BI","Alerts"],
      metrics:[{label:"Paper forms",value:-100,suffix:"%"},{label:"Sites",value:300,suffix:""}] },

    { id:"contract", name:"Contract Intelligence", client:"Legal & procurement", layer:"auto",
      pos:[-4.8,1.4], h:1.8, size:1.2, year:2025,
      uses:["copilot","azure","dataverse"],
      summary:"An AI service that reads incoming contracts, extracts key clauses and obligations, and routes anything risky to the right reviewer automatically.",
      features:["Clause extraction","Obligation tracking","Risk routing","Human-in-the-loop"],
      metrics:[{label:"Review time",value:-68,suffix:"%"},{label:"Docs/mo",value:12,suffix:"K"}] },
  ],
};
