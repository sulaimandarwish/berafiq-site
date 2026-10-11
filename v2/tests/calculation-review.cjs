const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'); // Use numeric identities and the real review interface.
const {JSDOM}=require('jsdom'); // Exercise user controls without sending data.
const root=path.resolve(__dirname,'..'),model=require(path.join(root,'estimate-model.js')); // Load production calculations.
const g={volume:1000,area:600,dims:[10,10,10]}; // Known analytic cube independent of mesh imports.
for(const [material,m] of Object.entries(model.materials)){ // Verify every supported process has a reconciled trace.
  if(m.mode==='sheet')continue; // Sheet and cutting quotes have no model yet.
  for(const quantity of [1,10]){ // Cover fixed and amortised costs.
    const r=model.calculate(g,{material,quantity,process:m.mode==='cnc'?'CNC Machining':'3D Printing — Polymer / Resin',inspection:'cmm',coverage:'all'}); // Include optional quality work.
    const value=label=>r.trace.find(s=>s.label===label).value; // Resolve named trace outputs.
    assert.ok(Math.abs(value('Underlying cost')-(r.materialTotal+r.setupCost+r.productionCost+value('Additional inspection cost')+r.orderAllowance))<1e-8); // Costs must reconcile without duplicated inspection.
    assert.equal(value('Upper planning budget'),r.planningTotal);assert.equal(value('Customer unit display'),Math.ceil(r.planningUnit)); // Display trace must match customer pricing.
    assert.equal(value('Gross profit before range'),r.profit);assert.equal(value('Estimated work time'),r.productionHours); // Verify profit and time explanations use actual engine values.
  } // Finish quantity scenarios.
} // Finish supported materials.
const dom=new JSDOM(fs.readFileSync(path.join(root,'calculation-review.html'),'utf8'),{url:'https://sulaimandarwish.github.io/berafiq-site/v2/calculation-review.html',runScripts:'outside-only'}); // Load the separate review page.
const w=dom.window,get=id=>w.document.getElementById(id); // Select actual controls.
w.eval(fs.readFileSync(path.join(root,'estimate-model.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'calculation-review.js'),'utf8')); // Run production scripts.
const change=(id,value)=>{get(id).value=value;get(id).dispatchEvent(new w.Event(['material','process'].includes(id)?'change':'input',{bubbles:true}));}; // Model user selections and live what-if edits.
assert.equal(get('result').hidden,false);let raw=JSON.parse(get('raw').textContent);assert.equal(raw.result.planningTotal,70); // Known current PLA example.
assert.ok(get('steps').children.length>20);assert.match(get('settings').textContent,/printPreparation/); // Expose detailed arithmetic and profiles.
change('allowance','0');change('margin','0');change('headroom','0');raw=JSON.parse(get('raw').textContent);assert.equal(raw.result.planningTotal,40); // Removing percentages changes the actual model and preserves upward batch rounding.
get('reset').click();assert.equal(JSON.parse(get('raw').textContent).result.planningTotal,70); // Restore all default pricing.
change('quantity','10');raw=JSON.parse(get('raw').textContent);assert.equal(raw.result.quantity,10);assert.equal(raw.result.planningUnit,raw.result.planningTotal/10); // Batch quantities propagate to the explanation.
change('margin','100');assert.equal(get('result').hidden,true);assert.match(get('status').textContent,/numeric inputs/); // Hide stale results on invalid rates.
get('reset').click();change('process','Wire EDM');assert.equal(get('result').hidden,true);assert.match(get('status').textContent,/no automatic cost model/); // No fabricated EDM breakdown.
change('process','CNC Machining');assert.equal(get('result').hidden,false);assert.ok(JSON.parse(get('raw').textContent).result.trace.some(s=>s.label==='Stock volume')); // Use the CNC branch after switching back.
assert.equal(w.document.querySelector('form'),null); // No email submission path exists in the review.
w.close();console.log('PASS: trace reconciliation across 29 profiles, owner what-if changes/reset, invalid-state clearing, review-only processes and customer rounding.'); // Summarise completed checks.
