/* Automatic browser estimates; customer files are not sent to an estimation server. */
(() => { // Keep all interface state isolated from the existing RFQ code.
  const config=window.BERAFIQ_ESTIMATOR||{}, model=window.BerafiqModel; // Load the feature flag and material/pricing model.
  const panel=document.getElementById('estimatePanel'); // Locate the optional estimator.
  if(!panel||!config.enabled||!model)return; // Leave RFQ intake intact if estimation is disabled.
  panel.hidden=false; // Reveal the estimator after its scripts are ready.
  const form=document.getElementById('rfqForm'), input=document.getElementById('fileInput'); // Reuse existing requirements and files.
  const $=id=>document.getElementById(id), field=name=>form.elements.namedItem(name)?.value||''; // Provide short safe element and field lookups.
  const button=$('estimateButton'), message=$('estimateMessage'), output=$('estimateResult'), summary=$('estimateSummary'); // Keep output targets together.
  let worker, cancelRead, revision=0, cachedFile, cachedScale, cachedGeometry; // Track cancellable work and reusable geometry measurements.
  const money=value=>new Intl.NumberFormat('en-SA',{style:'currency',currency:'SAR',maximumFractionDigits:0}).format(value); // Avoid false decimal precision in a rough customer estimate.
  function requirements() { // Reflect the selected material's manufacturing assumptions before calculation.
    const m=model.materials[field('material')]; // Resolve the declared material option.
    $('estimateProfile').textContent=m ? `Assumed grade: ${m.grade}. ${m.mode==='print'?'Technology: '+m.technology+'.':'CNC milling budget model.'} Example rates only; confirm the actual grade in your quote.` : 'Choose a specific material to see the estimation assumptions.'; // Make generic-to-specific material mappings visible.
    $('printSettings').hidden=!(m?.mode==='print'); // Show additive options only for printing materials.
    $('infillSetting').hidden=m?.technology!=='FDM'; // Infill applies only to the extrusion model.
    $('supportSetting').hidden=m?.technology==='SLS'; // Powder model has its own fixed refresh allowance.
    $('estimateInfill').disabled=m?.technology!=='FDM';$('estimateSupport').disabled=!(m?.mode==='print'&&m.technology!=='SLS'); // Exclude hidden print controls from RFQ form validation.
    $('stlSetting').hidden=!(input.files.length===1&&/\.stl$/i.test(input.files[0].name)); // Require explicit units for STL only.
  } // End contextual requirements.
  function reset() { // Invalidate estimates after any input change.
    revision++; cancelRead?.(); cancelRead=null; worker?.terminate(); worker=null; // Cancel expensive geometry processing and obsolete responses.
    output.hidden=true;summary.value='';message.textContent=''; // Remove stale prices and RFQ attachments.
    button.disabled=false;button.textContent='Calculate budget estimate'; // Restore the action for new requirements.
    requirements(); // Refresh visible material and print assumptions.
  } // End invalidation.
  form.addEventListener('input',reset);form.addEventListener('change',reset); // Cover form entry, radio buttons and select controls.
  window.addEventListener('berafiq:files-changed',reset); // Cover drag/drop and file removals from the existing uploader.
  requirements(); // Initialise conditional controls.
  function readGeometry(file,scale) { // Read supported geometry off the main UI thread.
    if(cachedFile===file&&cachedScale===scale&&cachedGeometry)return Promise.resolve(cachedGeometry); // Reuse the mesh for changed material or quantity.
    return new Promise(async(resolve,reject)=>{ // Wrap worker completion in an awaitable operation.
      let active;let timer; // Keep per-request handles independent of later clicks.
      try { // Catch file reads and worker startup errors as well as parse errors.
        const requestRevision=revision, buffer=await file.arrayBuffer(); // Read the selected file locally.
        if(requestRevision!==revision){reject(Error('Cancelled'));return;} // Ignore a file whose requirements changed during reading.
        active=new Worker('estimate-worker.js?v=3');worker=active; // Start a fresh worker with a bounded lifetime.
        cancelRead=()=>{clearTimeout(timer);active.terminate();reject(Error('Cancelled'));}; // Cancel and settle the previous request when inputs change.
        timer=setTimeout(()=>{active.terminate();reject(Error('The model took too long to analyse. Export a simpler model or request a quote.'));},90000); // Stop stalled imports without freezing the page.
        active.onmessage=({data})=>{clearTimeout(timer);active.terminate();worker=null;if(data.error){reject(Error(data.error));return;}cachedFile=file;cachedScale=scale;cachedGeometry=data.geometry;resolve(data.geometry);}; // Cache only successful measurements.
        active.onerror=()=>{clearTimeout(timer);active.terminate();worker=null;reject(Error('The CAD reader failed to start. Refresh the page or try a closed STL file.'));}; // Handle browser worker or module failures.
        active.postMessage({buffer,extension:file.name.split('.').pop().toLowerCase(),scale},[buffer]); // Transfer bytes to the worker without uploading them.
      } catch(error) {clearTimeout(timer);active?.terminate();reject(error);} // Clean up failed startup.
    }); // Finish geometry promise.
  } // End worker adapter.
  button.addEventListener('click',async()=>{ // Calculate only on explicit customer action.
    reset(); const current=revision, files=[...input.files], m=model.materials[field('material')]; // Capture the order being priced.
    const info={material:field('material'),process:field('process'),quantity:Number(field('quantity')),infill:Number($('estimateInfill').value),support:Number($('estimateSupport').value)}; // Capture all cost-driving requirements.
    if(files.length!==1||!(/\.(step|stp|stl)$/i.test(files[0].name))){message.textContent='For an estimate, select one STEP/STP or closed STL model. PDF, images and other drawings can still be sent for a quote.';return;} // Require measurable 3D geometry.
    if(files[0].size>10*1024*1024){message.textContent='Use a model up to 10 MB for browser estimation.';return;} // Bound local processing effort.
    if(!m){message.textContent='Select a specific material. “Not sure / other” needs a confirmed quote.';return;} // Do not invent a price for unknown material.
    if(field('tolerance_required')==='yes'){message.textContent='Specified tolerances require review. Please request a manufacturing quote.';return;} // Avoid pricing unmodelled quality requirements.
    if(!$('estimateAssumptions').checked){message.textContent='Please confirm the estimate assumptions.';return;} // Require acknowledgement of uncalibrated rates and process limits.
    try {model.calculate({volume:1,area:6,dims:[1,1,1]},info);}catch(error){message.textContent=error.message;return;} // Validate material/process/quantity settings before expensive geometry analysis.
    const scale=Number($('estimateUnits').value); // Apply declared STL units; STEP imports its own units.
    button.disabled=true;button.textContent='Calculating…';message.textContent='Reading geometry in your browser. The STEP reader may take a moment to download on first use.'; // Explain the real work occurring.
    try { // Handle parse failures and unsupported geometry without breaking RFQ intake.
      const g=await readGeometry(files[0],scale); // Analyse the current model locally.
      if(current!==revision)return; // Discard a result after requirements changed.
      const r=model.calculate(g,info); // Apply process-specific material, time, allowance and profit rules.
      $('estimatePrice').textContent=money(r.unit)+' / part'; // Display the customer selling estimate.
      $('estimateTotal').textContent=money(r.total)+' for '+r.quantity+' parts'; // Show full batch amount.
      $('estimateMachine').textContent=r.route; // Report a process assumption rather than a verified machine-axis claim.
      $('estimateSetup').textContent=r.setup.toFixed(0)+' min / batch'; // Distinguish setup from per-part runtime.
      $('estimateCycle').textContent=r.cycle.toFixed(1)+' min / part'; // Show approximate machine or printing time.
      $('estimateProduction').textContent=r.productionHours.toFixed(2)+' hours of work'; // Avoid implying a promised delivery date.
      $('estimateCalibration').textContent='Uncalibrated budget estimate using illustrative rates—not a supplier quote or a slicer/CAM result.'; // Display the accuracy limitation with every price.
      $('estimateGeometry').textContent=g.dims.map(x=>x.toFixed(1)).join(' × ')+' mm · '+(g.volume/1000).toFixed(2)+' cm³'; // Let customers spot unit or scale mistakes.
      $('estimateDetails').textContent=r.grade+'. '+r.notes+(m.mode==='print'?' Approximate feedstock: '+r.printMass.toFixed(1)+' g.':''); // Explain the assumptions behind this result.
      summary.value=JSON.stringify({status:'budget-estimate',version:'browser-3',material:r.grade,process:r.route,quantity:r.quantity,unitSAR:Math.round(r.unit),totalSAR:Math.round(r.total),setupMinutes:r.setup,cycleMinutes:r.cycle,notes:r.notes,notice:'Illustrative estimate only. Tax, delivery, urgency, special tolerances and additional requirements excluded.'}); // Attach only customer-facing fields to a later customer-submitted RFQ.
      output.hidden=false;message.textContent='Estimate ready. Request a confirmed quote below for final price and delivery.'; // Complete the customer flow.
    }catch(error){if(current===revision)message.textContent=error.message||'Unable to estimate this model. Please request a quote.';} // Show a useful failure reason.
    finally{if(current===revision){button.disabled=false;button.textContent='Calculate budget estimate';}} // Restore the calculate action for the current order.
  }); // End estimation action.
})(); // Initialise V2 estimation only.
