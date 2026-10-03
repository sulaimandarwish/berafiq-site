const assert=require('node:assert/strict'); // Fail on incorrect prices, geometry or customer behaviour.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'); // Read the real application and run its worker logic in isolation.
const {JSDOM}=require('jsdom'); // Exercise the page DOM without sending RFQ emails.
const importer=require('occt-import-js'); // Run the actual pinned Open Cascade WASM importer.
const root=path.resolve(__dirname,'..'); // Locate the versioned website assets.
const model=require(path.join(root,'estimate-model.js')); // Load the same pricing engine as the page.
const meshTools=require(path.join(root,'mesh-measure.js')); // Load the same closed-mesh measurements as the worker.
const positions=[0,0,0,10,0,0,10,10,0,0,10,0,0,0,10,10,0,10,10,10,10,0,10,10]; // Define a 10 mm cube independently of the implementation.
const indices=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]; // Use consistently outward-facing triangles.
const cube=meshTools.measure({positions,indices}); // Measure the known solid.
assert.ok(Math.abs(cube.volume-1000)<1e-8);assert.ok(Math.abs(cube.area-600)<1e-8); // Check volume and area against analytic truth.
assert.throws(()=>meshTools.measure({positions,indices:indices.slice(3)}),/open|non-manifold/); // Reject an open surface instead of pricing its volume.
const binary=Buffer.alloc(84+12*50);binary.writeUInt32LE(12,80); // Construct a valid binary STL fixture.
for(let t=0;t<12;t++)for(let v=0;v<3;v++)for(let k=0;k<3;k++)binary.writeFloatLE(positions[indices[t*3+v]*3+k],84+t*50+12+v*12+k*4); // Fill its triangle records with the known cube.
const arrayBuffer=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength); // Return the exact buffer span, excluding Node pool bytes.
assert.ok(Math.abs(meshTools.stl(arrayBuffer(binary)).volume-1000)<1e-8); // Verify binary STL measurement.
assert.ok(Math.abs(meshTools.stl(arrayBuffer(binary),25.4).volume-1000*25.4**3)<0.001); // Verify explicit inch-to-mm conversion.
const ascii='solid cube\n'+Array.from({length:12},(_,t)=>'facet normal 0 0 0\nouter loop\n'+[0,1,2].map(v=>'vertex '+positions.slice(indices[t*3+v]*3,indices[t*3+v]*3+3).join(' ')).join('\n')+'\nendloop\nendfacet').join('\n')+'\nendsolid cube'; // Create a matching text STL fixture.
assert.ok(Math.abs(meshTools.stl(arrayBuffer(Buffer.from(ascii))).volume-1000)<1e-8); // Verify ASCII STL measurement.
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://sulaimandarwish.github.io/berafiq-site/v2/',runScripts:'outside-only'}); // Use the live site's path and origin.
const w=dom.window,doc=w.document,form=doc.getElementById('rfqForm'),get=id=>doc.getElementById(id); // Bind the real form and result targets.
const allMaterials=[...form.elements.material.options].map(o=>o.value).filter(x=>x&&x!=='Not sure / other');
const specific=allMaterials.filter(x=>model.materials[x]?.mode!=='sheet'); // Derive coverage from the actual dropdown, not a separate hardcoded count.
for(const material of specific){assert.ok(model.materials[material],material);const m=model.materials[material];const r=model.calculate(cube,{material,quantity:10,process:m.mode==='cnc'?'CNC Machining':'3D Printing — Polymer / Resin',infill:20,support:20});assert.ok(Number.isFinite(r.total)&&r.total>0,material);assert.ok(r.budgetLow>=r.total&&r.budgetHigh>=r.budgetLow&&r.planningTotal===r.budgetHigh,material);} // Check every specific listed material has a usable compatible model.
assert.throws(()=>model.calculate(cube,{material:'PLA',quantity:1,process:'CNC Machining'}),/does not match/); // Reject incompatible material/process selection.
assert.throws(()=>model.calculate(cube,{material:'Not sure / other',quantity:1,process:'CNC Machining'}),/specific material/); // Reject an unspecified material honestly.
const sample={material:'Aluminium 6061-T6',quantity:2,process:'CNC Machining'}; // Compare the same part with and without the new policy.
const conservative=model.calculate(cube,sample);const saved={...model.pricing};model.pricing.allowance=0;model.pricing.cncOrderAllowance=0;const prior=model.calculate(cube,sample);Object.assign(model.pricing,saved);assert.ok(conservative.budgetLow>=prior.total*1.4);assert.ok(conservative.budgetHigh>=conservative.total*1.2); // Higher budgets must preserve the declared allowance and headroom.
const low=model.calculate(cube,{material:'PLA',quantity:1,process:'3D Printing — Polymer / Resin',infill:0,support:0}); // Calculate an empty-infill FDM scenario.
const high=model.calculate(cube,{material:'PLA',quantity:1,process:'3D Printing — Polymer / Resin',infill:100,support:20}); // Calculate the corresponding solid/support scenario.
assert.ok(high.total>low.total&&high.cycle>low.cycle); // Ensure infill/support influence both time and price.
let importCount=0;const occt=importer(); // Initialise the actual importer once for STEP worker tests.
class LocalWorker { // Execute the real worker script with browser transport emulated.
  constructor(){this.terminated=false;} // Record cancellation state.
  terminate(){this.terminated=true;} // Ignore results after the UI cancels a request.
  async postMessage(data){ // Pass a real file buffer to the worker code.
    const context={Uint8Array,TextDecoder,DataView,console,postMessage:value=>{if(!this.terminated)this.onmessage?.({data:value});}}; // Provide the standard primitives used by the worker.
    context.self=context;context.importScripts=(url)=>{if(url==='mesh-measure.js')vm.runInContext(fs.readFileSync(path.join(root,url),'utf8'),context);else{importCount++;context.occtimportjs=()=>occt;}}; // Use the actual WASM module in place of CDN script transport.
    vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'estimate-worker.js'),'utf8'),context); // Execute the shipped worker implementation.
    try{await context.onmessage({data});}catch(error){this.onerror?.(error);} // Relay worker completion or failure.
  } // End message transport.
} // End worker adapter.
w.Worker=LocalWorker;w.BERAFIQ_ESTIMATOR={enabled:true};w.fetch=()=>{throw Error('Unexpected API upload');}; // Ensure the frontend needs no estimation server.
w.eval(fs.readFileSync(path.join(root,'estimate-model.js'),'utf8')); // Load the actual browser calculation model.
w.HTMLElement.prototype.scrollIntoView=function(){};w.eval(fs.readFileSync(path.join(root,'request-flow.js'),'utf8'));
w.eval(fs.readFileSync(path.join(root,'estimator.js'),'utf8')); // Load the actual browser UI logic.
const change=(name,value)=>{form.elements.namedItem(name).value=value;form.dispatchEvent(new w.Event('input',{bubbles:true}));}; // Trigger real invalidation when requirements change.
const file=(name,bytes)=>{Object.defineProperty(get('fileInput'),'files',{value:[{name,size:bytes.length,arrayBuffer:async()=>arrayBuffer(bytes)}],configurable:true});w.dispatchEvent(new w.Event('berafiq:files-changed'));}; // Simulate a user-selected file.
const wait=async()=>{for(let i=0;i<500;i++){if(!get('estimateButton').disabled)return;await new Promise(r=>setTimeout(r,10));}throw Error('UI never completed');}; // Bound asynchronous worker test time.
(async()=>{ // Run customer flow tests sequentially.
  file('cube.stl',binary);get('estimateAssumptions').checked=true;change('quantity','2'); // Start with an entirely local STL workflow.
  change('process','CNC Machining');change('material','Aluminium 6061-T6');change('lead_time','Flexible');get('requestNext').click();assert.equal(get('requestStage2').hidden,false);assert.equal(get('requestStage1').hidden,true); // First request advances without contact validation or sending.
  for(const material of specific){const m=model.materials[material];change('process',m.mode==='cnc'?'CNC Machining':'3D Printing — Polymer / Resin');change('material',material);get('estimateButton').click();await wait();assert.equal(get('estimateResult').hidden,false,material+': '+get('estimateMessage').textContent);assert.match(get('estimateCalibration').textContent,/Estimate only/);} // Test every material through the actual interface.
  assert.equal(importCount,0); // STL estimation should not download the STEP engine.
  const data=JSON.parse(get('estimateSummary').value);assert.equal(data.status,'budget-estimate');assert.ok(!('profit' in data));assert.equal(data.totalSAR,data.budgetHighSAR);assert.ok(!('setupMinutes' in data)&&!('cycleMinutes' in data)&&!('uncertaintyAllowancePercent' in data));assert.equal(get('estimateSetup'),null);assert.doesNotMatch(get('estimateResult').textContent,/40%|20%|hours of work|headroom|uncertainty allowance/i);assert.ok(data.budgetLowSAR<data.budgetHighSAR);assert.match(get('estimateTotal').textContent,/Plan for/);assert.match(get('estimateCalibration').textContent,/outside this range/); // Only attach client-safe estimate fields to a later RFQ.
  change('quantity','3');assert.equal(get('estimateResult').hidden,true);assert.equal(get('estimateSummary').value,''); // Old estimates must disappear after an order change.
  change('tolerance','custom');get('estimateButton').click();assert.match(get('estimateMessage').textContent,/reviewed quote/); // Keep unmodelled requirements on the confirmed-quote route.
  change('tolerance','standard'); // Restore the supported scope.
  if(process.env.STEP_FIXTURE){const bytes=fs.readFileSync(process.env.STEP_FIXTURE);file('demo.step',bytes);change('process','CNC Machining');change('material','Aluminium 6061-T6');get('estimateButton').click();await wait();assert.equal(get('estimateResult').hidden,false,get('estimateMessage').textContent);assert.ok(importCount>0);} // Exercise actual STEP WASM when a known local fixture is supplied.
  change('process','CNC Machining');change('material','Aluminium 6061-T6');get('estimateButton').click();await wait();const before=JSON.parse(get('estimateSummary').value).totalSAR;change('tolerance','0.025');change('inspection','cmm');get('estimateButton').click();await wait();assert.ok(JSON.parse(get('estimateSummary').value).totalSAR>before);assert.match(get('estimateOptions').textContent,/cmm/); // Price selections through the actual UI.
  const firstReport=JSON.parse(get('estimateSummary').value).totalSAR;change('inspection_coverage','all');form.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,250));await wait();assert.ok(JSON.parse(get('estimateSummary').value).totalSAR>firstReport); // Every-part inspection automatically raises a multi-part budget.
  change('inspection','custom');form.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,250));assert.equal(get('estimateResult').hidden,true);assert.equal(get('estimateSummary').value,'');assert.match(get('estimateMessage').textContent,/reviewed quote/); // Custom checks invalidate prices without blocking RFQ intake.
  change('inspection','standard');change('process','3D Printing — Polymer / Resin');form.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(form.elements.tolerance.value,'standard');assert.ok([...get('toleranceSelect').querySelectorAll('[data-cnc]')].every(o=>o.disabled)); // Never retain CNC tolerances for printing.
  change('process','CNC Machining');change('material','Aluminium 6061-T6');change('tolerance','0.025');form.dispatchEvent(new w.Event('change',{bubbles:true})); // Restore the requirement for back/next preservation.
  get('requestBack').click();assert.equal(get('requestStage2').hidden,true);get('requestNext').click();assert.equal(form.elements.tolerance.value,'0.025'); // Back/next preserves requirements.
  change('process','Sheet Metal & Fabrication');form.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(form.elements.material.value,''); // Clear the incompatible CNC grade.
  const sheets=allMaterials.filter(x=>model.materials[x]?.mode==='sheet');assert.equal(sheets.length,8); // Check all named sheet choices are registered.
  for(const material of sheets){change('material',material);get('estimateButton').click();assert.match(get('estimateMessage').textContent,/reviewed quote/);assert.equal(get('estimateSummary').value,'');} // Sheet materials must never receive fake CNC prices.
  assert.equal(get('sheetThickness').required,true);change('sheet_thickness','2 mm');assert.equal(new w.FormData(form).get('sheet_thickness'),'2 mm'); // Include thickness in the RFQ payload.
  assert.ok(![...form.elements.process.options].some(o=>/Urgent|Reverse Engineering/.test(o.value))); // Removed processes cannot be selected.
  change('process','CNC Machining');form.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(get('sheetThickness').disabled,true);assert.equal(form.elements.material.value,''); // Clear sheet-only state when returning to CNC.
  assert.equal(form.action,'https://formsubmit.co/hello@berafiq.com');assert.equal(form.querySelector('button[type=submit]').disabled,false); // Preserve the ordinary RFQ route without submitting it.
  console.log('PASS: 8 sheet grades, thickness payload, process filtering/removal, review-only sheet pricing; two-stage navigation, option pricing, automatic coverage refresh, custom review, process-specific tolerances; '+specific.length+' material UI flows, CNC/FDM/SLA/SLS, binary/ASCII STL, inch units, closed-mesh rejection, process compatibility, infill/support effects, stale-result clearing'+(process.env.STEP_FIXTURE?', real STEP WASM worker':'')+'.'); // Report only checks actually run.
  w.close(); // Clear timers and DOM resources.
})().catch(error=>{console.error(error);w.close();process.exitCode=1;}); // Surface any regression to the test runner.
