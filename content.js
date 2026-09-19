/*
  BeRafiq website content
  =======================
  Change the text between quotes below.
  Commit this file in GitHub and the live site will update automatically.

  You normally do NOT need to edit index.html.
*/

window.BERAFIQ_CONTENT = {
  topbar: "Saudi manufacturing network in development · Confidential RFQ intake",

  heroTitle: "From drawing to <em>delivered part.</em>",
  heroArabic: "تصنيع محلي. تنفيذ أسرع.",
  heroDescription: "Upload your drawing, quantity and required date. BeRafiq is being built to connect industrial demand with qualified Saudi manufacturing capacity — through one managed route from RFQ to delivery.",

  quoteHeading: "Start with your files.",

  capabilitiesHeading: "From urgent one-offs to repeat production.",
  capabilitiesIntro: "Start with CNC machining and critical industrial parts, then expand the network around proven customer demand.",

  capabilities: [
    ["CNC Milling", "3-axis, 4-axis and 5-axis capability routing for prototypes, replacement parts and production components."],
    ["CNC Turning", "Shafts, sleeves, bushings, threaded components and rotating-equipment requirements."],
    ["Urgent Parts", "Priority capacity matching when the normal supplier cannot meet the required date."],
    ["Prototype & R&D", "Low-volume parts, fixtures and test components for engineering teams, startups and research."],
    ["Reverse Engineering", "Support for obsolete or difficult replacement parts where the physical component already exists."],
    ["Inspection & QA", "Drawing-led inspection requirements, dimensional reporting and supplier quality coordination."]
  ],

  howHeading: "One request. One managed route.",

  qualityHeading: "Industrial drawings deserve industrial-grade care.",
  qualityBody: "BeRafiq is designed around controlled file access, qualified suppliers, traceable RFQs and clear inspection requirements.",

  industriesHeading: "Built around Saudi industrial demand.",
  industriesBody: "Focused initially on sectors where speed, capability and downtime matter.",

  saudiHeading: "Built in Saudi Arabia for the next generation of Saudi industry.",
  saudiBody: "BeRafiq's long-term aim is to make qualified local manufacturing easier to discover, access and manage — supporting localization, supplier utilization and faster industrial execution.",
  saudiArabic: "رفيقك في التصنيع",
  saudiTagline: "Your manufacturing companion.",

  ctaHeading: "Send the requirement.<br>We’ll handle the route.",

  location: "Riyadh, Saudi Arabia",
  contactEmail: "hello@berafiq.com",

  successHeading: "Thank you. We’ll respond as soon as possible.",
  successBody: "Your manufacturing request has been received."
};

(function () {
  const c = window.BERAFIQ_CONTENT || {};
  const one = (selector) => document.querySelector(selector);
  const setText = (selector, value) => {
    const el = one(selector);
    if (el && value !== undefined) el.textContent = value;
  };
  const setHTML = (selector, value) => {
    const el = one(selector);
    if (el && value !== undefined) el.innerHTML = value;
  };

  setText(".topbar", c.topbar);
  setHTML("#hero-title", c.heroTitle);
  setText(".hero .arabic", c.heroArabic);
  setText("#hero-lede", c.heroDescription);
  setText(".quote-head h2", c.quoteHeading);

  setText("#capabilities .section-head h2", c.capabilitiesHeading);
  setText("#capabilities .section-head > p", c.capabilitiesIntro);

  const cards = document.querySelectorAll("#capabilities .cards article");
  (c.capabilities || []).forEach((item, i) => {
    if (!cards[i]) return;
    const h = cards[i].querySelector("h3");
    const p = cards[i].querySelector("p");
    if (h) h.textContent = item[0];
    if (p) p.textContent = item[1];
  });

  setText("#how .section-head h2", c.howHeading);
  setText("#quality h2", c.qualityHeading);
  setText("#quality > div:first-child > p", c.qualityBody);

  setText("#industries .section-head h2", c.industriesHeading);
  setText("#industries .section-head > p", c.industriesBody);

  setText(".saudi-section h2", c.saudiHeading);
  setText(".saudi-section > div:first-child > p", c.saudiBody);
  setText(".saudi-mark span", c.saudiArabic);
  setText(".saudi-mark small", c.saudiTagline);

  setHTML(".cta h2", c.ctaHeading);

  setText("footer > div:nth-child(2) b", c.location);
  const email = one("footer > div:nth-child(2) a");
  if (email && c.contactEmail) {
    email.textContent = c.contactEmail;
    email.href = "mailto:" + c.contactEmail;
  }

  setText(".success-card h2", c.successHeading);
  const successParagraph = one(".success-card h2 + p");
  if (successParagraph && c.successBody) successParagraph.textContent = c.successBody;
})();
