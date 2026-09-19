/*
  BeRafiq editable website content
  --------------------------------
  Change the text inside the quotes below, commit the file,
  and GitHub Pages will redeploy automatically.

  Avoid changing the property names on the left.
*/
window.BERAFIQ_CONTENT = {
  topbar: "Saudi manufacturing network in development · Confidential RFQ intake",
  eyebrow: "SAUDI MANUFACTURING · RIYADH",

  hero: {
    headlineHtml: "From drawing to <em>delivered part.</em>",
    arabicLine: "تصنيع محلي. تنفيذ أسرع.",
    description: "Upload your drawing, quantity and required date. BeRafiq is being built to connect industrial demand with qualified Saudi manufacturing capacity — through one managed route from RFQ to delivery.",
    primaryButton: "Upload a drawing ↗",
    secondaryButton: "See how it works"
  },

  proof: [
    { title: "3D + 2D", text: "STEP · STP · STL · DXF · DWG · PDF" },
    { title: "Managed RFQ", text: "One request, matched capability" },
    { title: "Saudi-focused", text: "Built around local capacity" }
  ],

  quote: {
    title: "Start with your files.",
    uploadTitle: "Drop CAD or drawings here",
    uploadSubtitle: "or click to choose files",
    submitButton: "Request manufacturing quote →"
  },

  capabilities: {
    heading: "From urgent one-offs to repeat production.",
    intro: "Start with CNC machining and critical industrial parts, then expand the network around proven customer demand.",
    items: [
      { title: "CNC Milling", text: "3-axis, 4-axis and 5-axis capability routing for prototypes, replacement parts and production components." },
      { title: "CNC Turning", text: "Shafts, sleeves, bushings, threaded components and rotating-equipment requirements." },
      { title: "Urgent Parts", text: "Priority capacity matching when the normal supplier cannot meet the required date." },
      { title: "Prototype & R&D", text: "Low-volume parts, fixtures and test components for engineering teams, startups and research." },
      { title: "Reverse Engineering", text: "Support for obsolete or difficult replacement parts where the physical component already exists." },
      { title: "Inspection & QA", text: "Drawing-led inspection requirements, dimensional reporting and supplier quality coordination." }
    ]
  },

  howItWorks: {
    heading: "One request. One managed route.",
    steps: [
      { title: "Upload", text: "Send the 3D model, drawing, quantity, material and delivery requirement." },
      { title: "Match", text: "BeRafiq identifies suitable Saudi manufacturing capability and capacity." },
      { title: "Quote", text: "You receive one commercial response rather than chasing multiple workshops." },
      { title: "Manufacture", text: "Production, quality coordination and delivery are managed through one point of contact." }
    ]
  },

  quality: {
    heading: "Industrial drawings deserve industrial-grade care.",
    description: "BeRafiq is designed around controlled file access, qualified suppliers, traceable RFQs and clear inspection requirements.",
    bullets: [
      "Private customer file storage",
      "Supplier access only when required",
      "Material and inspection requirements captured at RFQ stage",
      "RFQ references for every request"
    ]
  },

  industries: {
    heading: "Built around Saudi industrial demand.",
    intro: "Focused initially on sectors where speed, capability and downtime matter.",
    items: [
      "MRO & maintenance",
      "Pumps & valves",
      "Oilfield services",
      "Industrial manufacturing",
      "Robotics & hardware",
      "Universities & R&D"
    ]
  },

  saudi: {
    heading: "Built in Saudi Arabia for the next generation of Saudi industry.",
    description: "BeRafiq's long-term aim is to make qualified local manufacturing easier to discover, access and manage — supporting localization, supplier utilization and faster industrial execution.",
    arabic: "رفيقك في التصنيع",
    english: "Your manufacturing companion."
  },

  cta: {
    headingHtml: "Send the requirement.<br>We’ll handle the route.",
    button: "Request a quote →"
  },

  contact: {
    location: "Riyadh, Saudi Arabia",
    email: "hello@berafiq.com"
  },

  success: {
    heading: "Thank you. We’ll respond as soon as possible.",
    message: "Your manufacturing request has been received."
  }
};

(function applyBerafiqContent(){
  const c = window.BERAFIQ_CONTENT;
  const text = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && value !== undefined) el.textContent = value;
  };
  const html = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && value !== undefined) el.innerHTML = value;
  };

  text(".topbar", c.topbar);
  const eyebrow = document.querySelector(".eyebrow");
  if (eyebrow) eyebrow.innerHTML = "<span></span> " + c.eyebrow;

  html("#hero-title", c.hero.headlineHtml);
  text(".hero .arabic", c.hero.arabicLine);
  text("#hero-lede", c.hero.description);
  text(".hero-actions .btn:not(.ghost)", c.hero.primaryButton);
  text(".hero-actions .btn.ghost", c.hero.secondaryButton);

  document.querySelectorAll(".proof > div").forEach((el, i) => {
    const item = c.proof[i];
    if (!item) return;
    text(".proof > div:nth-child("+(i+1)+") strong", item.title);
    text(".proof > div:nth-child("+(i+1)+") span", item.text);
  });

  text("#quote .quote-head h2", c.quote.title);
  text("#dropzone strong", c.quote.uploadTitle);
  text("#dropzone > span", c.quote.uploadSubtitle);
  text("#rfqForm button[type='submit']", c.quote.submitButton);

  text("#capabilities .section-head h2", c.capabilities.heading);
  text("#capabilities .section-head > p", c.capabilities.intro);
  document.querySelectorAll("#capabilities .cards article").forEach((el, i) => {
    const item = c.capabilities.items[i];
    if (!item) return;
    const h = el.querySelector("h3"), p = el.querySelector("p");
    if (h) h.textContent = item.title;
    if (p) p.textContent = item.text;
  });

  text("#how .section-head h2", c.howItWorks.heading);
  document.querySelectorAll("#how .steps article").forEach((el, i) => {
    const item = c.howItWorks.steps[i];
    if (!item) return;
    const h = el.querySelector("h3"), p = el.querySelector("p");
    if (h) h.textContent = item.title;
    if (p) p.textContent = item.text;
  });

  text("#quality h2", c.quality.heading);
  text("#quality > div:first-child > p", c.quality.description);
  const qualityList = document.querySelector("#quality ul");
  if (qualityList) qualityList.innerHTML = c.quality.bullets.map(x => "<li>"+x+"</li>").join("");

  text("#industries .section-head h2", c.industries.heading);
  text("#industries .section-head > p", c.industries.intro);
  document.querySelectorAll("#industries .industry-grid span").forEach((el, i) => {
    if (c.industries.items[i] !== undefined) el.textContent = c.industries.items[i];
  });

  text(".saudi-section h2", c.saudi.heading);
  text(".saudi-section > div:first-child > p", c.saudi.description);
  text(".saudi-mark span", c.saudi.arabic);
  text(".saudi-mark small", c.saudi.english);

  html(".cta h2", c.cta.headingHtml);
  text(".cta .btn", c.cta.button);

  const footerInfo = document.querySelector("footer > div:not(.brand)");
  if (footerInfo) {
    const b = footerInfo.querySelector("b");
    const a = footerInfo.querySelector("a");
    if (b) b.textContent = c.contact.location;
    if (a) {
      a.textContent = c.contact.email;
      a.href = "mailto:" + c.contact.email;
    }
  }

  text("#successOverlay h2", c.success.heading);
  text("#successOverlay .success-card > p", c.success.message);
})();