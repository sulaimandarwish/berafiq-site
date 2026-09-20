// Apply editable site copy from content.js
(function applyEditableContent(){
  const C=window.BERAFIQ_CONTENT;
  if(!C) return;
  const txt=(selector,value)=>{const el=document.querySelector(selector);if(el&&value!==undefined)el.textContent=value};
  const html=(selector,value)=>{const el=document.querySelector(selector);if(el&&value!==undefined)el.innerHTML=value};

  txt(".topbar",C.topbar);
  document.querySelectorAll(".brand small").forEach(el=>el.textContent=C.brand?.tagline||el.textContent);

  const nav=document.querySelectorAll(".links a");
  if(nav.length>=4){nav[0].textContent=C.nav.capabilities;nav[1].textContent=C.nav.how;nav[2].textContent=C.nav.industries;nav[3].textContent=C.nav.quality}
  txt(".nav > .btn",C.nav.quote);

  const eyebrow=document.querySelector(".eyebrow");
  if(eyebrow) eyebrow.innerHTML="<span></span> "+C.hero.eyebrow;
  html("#hero-title",C.hero.titleBefore+" <em>"+C.hero.titleEmphasis+"</em>");
  txt(".arabic",C.hero.arabic);
  txt("#hero-lede",C.hero.description);
  const heroBtns=document.querySelectorAll(".hero-actions .btn");
  if(heroBtns[0]) heroBtns[0].textContent=C.hero.primaryButton;
  if(heroBtns[1]) heroBtns[1].textContent=C.hero.secondaryButton;
  document.querySelectorAll(".proof > div").forEach((el,i)=>{const x=C.hero.proof?.[i];if(x){txt(".proof > div:nth-child("+(i+1)+") strong",x.title);txt(".proof > div:nth-child("+(i+1)+") span",x.text)}});

  txt(".quote-head small",C.quote.label); txt(".quote-head h2",C.quote.title); txt(".quote-head .secure",C.quote.secure);
  txt(".dropzone strong",C.quote.uploadTitle); txt(".dropzone > span",C.quote.uploadSubtitle); txt(".dropzone > small",C.quote.uploadFormats);
  txt("#rfqForm .btn.full",C.quote.submitButton); txt(".form-note",C.quote.note);

  const roleStrip=document.querySelector(".role-strip");
  if(roleStrip&&Array.isArray(C.builtFor)){
    roleStrip.innerHTML="<span>BUILT FOR</span>"+C.builtFor.map((x,i)=>"<b>"+x+"</b>"+(i<C.builtFor.length-1?"<i></i>":"")).join("");
  }

  const cap=document.querySelector("#capabilities");
  if(cap){
    txt("#capabilities .section-head small",C.capabilities.label);txt("#capabilities .section-head h2",C.capabilities.title);txt("#capabilities .section-head p",C.capabilities.intro);
    cap.querySelectorAll(".cards article").forEach((el,i)=>{const x=C.capabilities.cards?.[i];if(x){const h=el.querySelector("h3"),p=el.querySelector("p");if(h)h.textContent=x.title;if(p)p.textContent=x.text}})
  }

  txt("#how .section-head small",C.how.label);txt("#how .section-head h2",C.how.title);
  document.querySelectorAll("#how .steps article").forEach((el,i)=>{const x=C.how.steps?.[i];if(x){const h=el.querySelector("h3"),p=el.querySelector("p");if(h)h.textContent=x.title;if(p)p.textContent=x.text}});

  txt("#quality small",C.quality.label);txt("#quality h2",C.quality.title);txt("#quality p",C.quality.text);
  const ul=document.querySelector("#quality ul");if(ul&&C.quality.bullets)ul.innerHTML=C.quality.bullets.map(x=>"<li>"+x+"</li>").join("");

  txt("#industries .section-head small",C.industries.label);txt("#industries .section-head h2",C.industries.title);txt("#industries .section-head p",C.industries.intro);
  const industryGrid=document.querySelector(".industry-grid");if(industryGrid&&C.industries.items)industryGrid.innerHTML=C.industries.items.map(x=>"<span>"+x+"</span>").join("");

  txt(".saudi-section small",C.saudi.label);txt(".saudi-section h2",C.saudi.title);txt(".saudi-section p",C.saudi.text);txt(".saudi-mark span",C.saudi.arabic);txt(".saudi-mark small",C.saudi.english);

  txt(".cta small",C.cta.label);html(".cta h2",C.cta.titleLine1+"<br>"+C.cta.titleLine2);txt(".cta .btn",C.cta.button);

  txt("#successOverlay .success-card > small",C.success.label);txt("#successOverlay h2",C.success.title);
  const ps=document.querySelectorAll("#successOverlay .success-card > p");if(ps[0])ps[0].textContent=C.success.line1;if(ps[1])ps[1].innerHTML=C.success.line2+' <strong id="successEmail"></strong>.';
  txt("#successClose",C.success.button);

  const footerInfo=document.querySelector("footer > div:not(.brand)");
  if(footerInfo){
    const b=footerInfo.querySelector("b"),a=footerInfo.querySelector("a");
    if(b)b.textContent=C.company.location;
    if(a){a.textContent=C.company.email;a.href="mailto:"+C.company.email}
  }
  const fp=document.querySelector("footer > p");if(fp)fp.innerHTML='© <span id="year"></span> '+C.company.footerText;
})();

const tolRadios=document.querySelectorAll('input[name="tolerance_required"]');
const tolDetails=document.getElementById("toleranceDetails");
const tolInput=document.getElementById("toleranceValues");
function updateToleranceUI(){
  const required=[...tolRadios].find(r=>r.checked)?.value==="yes";
  tolDetails.hidden=!required;
  tolInput.required=required;
  if(!required) tolInput.value="";
}
tolRadios.forEach(r=>r.addEventListener("change",updateToleranceUI));
updateToleranceUI();
const input=document.getElementById("fileInput");
const list=document.getElementById("fileList");
const drop=document.getElementById("dropzone");
const form=document.getElementById("rfqForm");
const status=document.getElementById("formStatus");
let files=[];

document.getElementById("year").textContent=new Date().getFullYear();

const fmt=b=>b>1048576?(b/1048576).toFixed(1)+" MB":(b/1024).toFixed(0)+" KB";

function totalBytes(){return files.reduce((n,f)=>n+f.size,0)}

function render(){
  list.innerHTML="";
  files.forEach((f,i)=>{
    const d=document.createElement("div");
    d.className="file-item";
    d.innerHTML="<span><b>"+f.name+"</b> · "+fmt(f.size)+"</span><button type=button>Remove</button>";
    d.querySelector("button").onclick=()=>{files.splice(i,1);syncInput();render()};
    list.appendChild(d);
  });
  if(files.length){
    const t=document.createElement("div");
    t.className="file-item";
    t.innerHTML="<span>Total attachments</span><b>"+fmt(totalBytes())+" / 10 MB</b>";
    list.appendChild(t);
  }
}

function syncInput(){
  const dt=new DataTransfer();
  files.forEach(f=>dt.items.add(f));
  input.files=dt.files;
}

function add(incoming){
  const next=[...files,...incoming];
  const total=next.reduce((n,f)=>n+f.size,0);
  if(total>10*1024*1024){
    status.textContent="Attachments must be 10 MB or less in total. Please remove a file or send larger files separately to hello@berafiq.com.";
    return;
  }
  files=next;
  syncInput();
  render();
  status.textContent="";
}

input.addEventListener("change",e=>{
  const incoming=[...e.target.files];
  files=[];
  add(incoming);
});

["dragenter","dragover"].forEach(x=>drop.addEventListener(x,e=>{
  e.preventDefault();
  drop.classList.add("drag");
}));
["dragleave","drop"].forEach(x=>drop.addEventListener(x,e=>{
  e.preventDefault();
  drop.classList.remove("drag");
}));
drop.addEventListener("drop",e=>add(e.dataTransfer.files));

form.addEventListener("submit",e=>{
  if(!files.length){
    e.preventDefault();
    status.textContent="Please upload at least one CAD file or drawing.";
    return;
  }
  if(totalBytes()>10*1024*1024){
    e.preventDefault();
    status.textContent="Attachments must be 10 MB or less in total.";
    return;
  }
  status.textContent="Sending your RFQ…";
  const btn=form.querySelector("button[type=submit]");
  btn.disabled=true;
  btn.textContent="Sending…";
});
