/* Public review tool: all pricing changes stay in the current page's memory. */
(() => { // Keep review state away from customer RFQ code.
  const model=window.BerafiqModel,$=id=>document.getElementById(id); // Use the same production model module.
  const defaults=JSON.parse(JSON.stringify({pricing:model.pricing,materials:model.materials})); // Snapshot settings for a true reset.
  let geometry,source,worker,revision=0,lastResult; // Track geometry and cancel obsolete file reads.
  const format=value=>typeof value==='number'?new Intl.NumberFormat('en-SA',{maximumFractionDigits:6}).format(value):String(value); // Format display only, without changing arithmetic.
  const money=value=>new Intl.NumberFormat('en-SA',{style:'currency',currency:'SAR',maximumFractionDigits:0}).format(value); // Match customer whole-SAR display.
  function clear(){ $('result').hidden=true;lastResult=null;$('status').textContent=''; } // Never leave a stale calculation downloadable.
  function materialChoices(){ // Populate the exact existing profile names for the route.
    const previous=$('material').value,process=$('process').value,mode=process==='CNC Machining'?'cnc':process==='3D Printing — Polymer / Resin'?'print':'sheet'; // Review-only routes still use explicit profiles.
    $('material').replaceChildren(); // Avoid leftover incompatible choices.
    for(const [name,m] of Object.entries(model.materials)){if(m.mode!==mode)continue;const o=document.createElement('option');o.value=name;o.textContent=name;$('material').append(o);} // Render names safely as text.
    if([...$('material').options].some(o=>o.value===previous))$('material').value=previous; // Preserve a still-compatible selection.
    else if(mode==='print')$('material').value='PLA'; // Start with an easy-to-check print example.
    loadRates(); // Set fields from the selected material and machine profile.
  } // Finish material selection.
  function loadRates(){ // Reflect current in-memory settings.
    const m=model.materials[$('material').value];$('materialRate').value=m?.sarKg??0;$('machineRate').value=m?.mode==='cnc'?model.pricing.machineSARHour:m?.hourly??0; // Sheet routes have no numeric cost assumptions.
    const fdm=m?.technology==='FDM';$('infill').disabled=!fdm;$('support').disabled=m?.mode!=='print'||m.technology==='SLS'; // Only applicable model settings can affect the part.
    $('tolerance').disabled=m?.mode!=='cnc';if(m?.mode!=='cnc')$('tolerance').value='standard'; // Numeric CNC tolerances do not transfer to printing.
  } // Finish rate refresh.
  function calculate(){ // Calculate and show the model's own trace, not a separate spreadsheet formula.
    clear();if(!geometry){$('status').textContent='Choose a file or use the demo cube.';return;} // Require current geometry.
    if(!['CNC Machining','3D Printing — Polymer / Resin'].includes($('process').value)){$('status').textContent='This process requires a reviewed quote. There is no automatic cost model to explain yet.';return;} // Avoid fake traces for new services.
    for(const el of document.querySelectorAll('input[type=number]'))if(el.id!=='cubeSide'&&!el.disabled&&!el.checkValidity()){$('status').textContent='Check the numeric inputs.';return;} // Validate owner what-if inputs.
    try { // Keep errors visible without retaining the previous total.
      const m=model.materials[$('material').value];m.sarKg=Number($('materialRate').value);if(m.mode==='cnc')model.pricing.machineSARHour=Number($('machineRate').value);else m.hourly=Number($('machineRate').value); // Apply rates only in this review instance.
      Object.assign(model.pricing,{margin:Number($('margin').value)/100,allowance:Number($('allowance').value)/100,rangeHeadroom:Number($('headroom').value)/100}); // Use the exact same percentage semantics as V2.
      const input={material:$('material').value,process:$('process').value,quantity:Number($('quantity').value),infill:Number($('infill').value),support:Number($('support').value),tolerance:$('tolerance').value,inspection:$('inspection').value,coverage:$('coverage').value}; // Gather all cost-driving requirements.
      const r=model.calculate(geometry,input); // Obtain production values and their instrumented calculation trace.
      lastResult={source,geometry,input,pricing:JSON.parse(JSON.stringify(model.pricing)),material:JSON.parse(JSON.stringify(m)),preparation:model.printPreparation,result:r}; // Preserve a reproducible snapshot for download.
      $('headline').textContent=money(r.planningTotal)+' / batch';$('range').textContent=money(r.budgetLow)+'–'+money(r.budgetHigh)+' · '+r.quantity+' parts · '+money(Math.ceil(r.planningUnit))+' per part as displayed to customers'; // Match the customer range and rounding.
      $('steps').replaceChildren();for(const step of r.trace){const tr=document.createElement('tr');for(const text of [step.label,step.formula,format(step.value)+' '+step.unit]){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('steps').append(tr);} // Render trace safely, including untrusted file-derived numbers.
      $('notes').textContent=r.notes+' All rates are illustrative. Geometry is measured; setup, machine productivity, labour and safety allowances are assumptions. No real slicer or CAM toolpath is used.'; // Distinguish measured inputs from business assumptions.
      $('settings').textContent=JSON.stringify({material:m,pricing:model.pricing,printPreparation:model.printPreparation},null,2);$('raw').textContent=JSON.stringify(lastResult,null,2); // Expose all used profiles and full precision results.
      $('result').hidden=false;$('status').textContent='Calculation ready. What-if changes are temporary and are not saved to the live site.'; // Complete the review flow.
    }catch(error){$('status').textContent=error.message;} // Show model validation and unsupported combination errors.
  } // Finish calculation.
  function cube(){ // Use analytically known geometry without pretending it came from a slicer.
    revision++;worker?.terminate();worker=null;clear();const side=Number($('cubeSide').value);if(!$('cubeSide').checkValidity()){$('status').textContent='Enter a cube side between 0.1 and 1,000 mm.';geometry=null;return;} // Cancel file processing if the source changes.
    geometry={volume:side**3,area:6*side**2,dims:[side,side,side]};source='Demo solid cube '+side+' mm';$('modelFile').value='';$('geometryInfo').textContent=source+' · analytic volume '+format(geometry.volume)+' mm³ · area '+format(geometry.area)+' mm²';calculate(); // Use exact cube volume and area.
  } // Finish example input.
  async function readFile(){ // Reuse the production STEP/STL worker and keep geometry local.
    const request=++revision;worker?.terminate();worker=null;geometry=null;clear();$('geometryInfo').textContent='';const file=$('modelFile').files[0];if(!file)return; // Remove stale results immediately.
    if(!/\.(step|stp|stl)$/i.test(file.name)||file.size>10*1024*1024){$('status').textContent='Choose one STEP/STP or closed STL file up to 10 MB.';return;} // Match production file limits.
    $('status').textContent='Reading model…';let timer; // Keep reading feedback and timeout state.
    try {const buffer=await file.arrayBuffer();if(request!==revision)return;const active=new Worker('estimate-worker.js?v=3');worker=active; // Use the same worker as customer estimation.
      timer=setTimeout(()=>{active.terminate();if(request===revision)$('status').textContent='Model analysis failed. Try a simpler model.';},90000); // Bound expensive imports.
      active.onmessage=({data})=>{clearTimeout(timer);active.terminate();if(request!==revision)return;worker=null;if(data.error){$('status').textContent=data.error;return;}geometry=data.geometry;source=file.name;$('geometryInfo').textContent=source+' · '+geometry.dims.map(format).join(' × ')+' mm · '+format(geometry.volume)+' mm³';calculate();}; // Price only the current successfully measured file.
      active.onerror=()=>{clearTimeout(timer);active.terminate();if(request===revision)$('status').textContent='Unable to load the CAD reader.';}; // Keep reader failures separate from estimates.
      active.postMessage({buffer,extension:file.name.split('.').pop().toLowerCase(),scale:Number($('units').value)},[buffer]); // Transfer model bytes to the local worker.
    }catch(error){clearTimeout(timer);if(request===revision)$('status').textContent=error.message;} // Surface file read or worker errors.
  } // Finish file input.
  $('process').addEventListener('change',()=>{materialChoices();calculate();});$('material').addEventListener('change',()=>{loadRates();calculate();}); // Keep rate fields coherent with process and grade.
  for(const id of ['quantity','infill','support','tolerance','inspection','coverage','materialRate','machineRate','margin','allowance','headroom'])$(id).addEventListener('input',calculate); // Refresh the full explanation after what-if edits.
  $('calculate').addEventListener('click',calculate);$('useCube').addEventListener('click',cube);$('modelFile').addEventListener('change',readFile);$('units').addEventListener('change',()=>{if($('modelFile').files.length)readFile();}); // Wire model source and explicit recalculation.
  $('reset').addEventListener('click',()=>{Object.assign(model.pricing,defaults.pricing);for(const [name,m] of Object.entries(defaults.materials))Object.assign(model.materials[name],m);$('margin').value=defaults.pricing.margin*100;$('allowance').value=defaults.pricing.allowance*100;$('headroom').value=defaults.pricing.rangeHeadroom*100;loadRates();calculate();}); // Restore pricing defaults without losing the uploaded model.
  $('download').addEventListener('click',()=>{if(!lastResult)return;const url=URL.createObjectURL(new Blob([JSON.stringify(lastResult,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='berafiq-calculation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}); // Export a local audit snapshot without sending data anywhere.
  $('margin').value=model.pricing.margin*100;$('allowance').value=model.pricing.allowance*100;$('headroom').value=model.pricing.rangeHeadroom*100;materialChoices();cube(); // Start with the same rates and a known PLA demo.
})(); // Initialise the separate review page.
