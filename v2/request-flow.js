/* Two-stage RFQ: navigating to configuration never sends files or email. */
(() => { // Keep navigation isolated from the uploader and estimator.
  const form=document.getElementById('rfqForm'),get=id=>document.getElementById(id); // Resolve the shared form.
  const first=get('requestStage1'),second=get('requestStage2'),status=get('formStatus'); // Locate the two stages and feedback.
  function options(){ // Keep tolerance choices compatible with manufacturing process.
    const process=form.elements.process.value, sheet=process==='Sheet Metal & Fabrication'; // Identify the requested production route.
    const cutting=['Laser Cutting','Plasma Cutting','Waterjet Cutting'].includes(process),wire=process==='Wire EDM',sinker=process==='Sinker EDM',edm=wire||sinker; // Keep cutting and EDM requirements distinct.
    const stock=sheet||cutting||wire; // Plate thickness is relevant to cutting and wire EDM.
    const mode=process==='CNC Machining'?'cnc':process==='3D Printing — Polymer / Resin'?'print':sheet||cutting?'sheet':null; // Route materials without claiming a cutting estimator exists.
    for(const option of form.elements.material.options){const profile=window.BerafiqModel.materials[option.value];const incompatible=profile&&(edm?!(profile.mode==='sheet'||profile.mode==='cnc'&&option.value!=='Acetal POM-C'):mode&&profile.mode!==mode);option.disabled=!!incompatible;option.hidden=option.disabled;} // EDM accepts listed conductive metals; unknown grades remain requestable for review.
    if(form.elements.material.selectedOptions[0]?.disabled)form.elements.material.value=''; // Clear an incompatible material when switching process.
    get('sheetThicknessField').hidden=!stock;get('sheetNotice').hidden=!(stock||sinker);get('sheetThickness').disabled=!stock;get('sheetThickness').required=stock; // Send thickness only for the applicable process.
    get('stockThicknessLabel').textContent=wire?'Workpiece thickness (mm)':'Sheet / plate thickness (mm)'; // Label the same stock dimension accurately.
    get('edmElectrodeField').hidden=!sinker;get('edmElectrode').disabled=!sinker;get('edmElectrode').required=sinker; // Electrode preparation is a separate sinker-EDM requirement.
    get('sheetNotice').textContent=sinker?'Upload the cavity model and a dimensioned drawing. Electrode design, finish and tolerances will be reviewed for your quote.':wire?'Upload your profile and drawing, including workpiece thickness, tolerances and any taper or start-hole requirements. A reviewed quote is required.':cutting?'Upload a DXF or dimensioned drawing with material, thickness and edge-finish requirements. Grade, thickness and machine suitability will be confirmed in a reviewed quote.':'Sheet metal is quoted after review of thickness, cutting, bends, finish and inspection. For galvanized stock, include the coating designation in your drawing or notes.'; // Show customer requirements instead of costing internals.
    const cnc=form.elements.process.value==='CNC Machining',select=get('toleranceSelect'); // Numeric tolerance presets apply only to CNC.
    select.querySelectorAll('[data-cnc]').forEach(o=>{o.hidden=!cnc;o.disabled=!cnc;}); // Hide unsupported precision choices.
    if(!cnc&&!['standard','custom'].includes(select.value))select.value='standard'; // Remove an obsolete CNC choice after changing process.
    select.options[0].textContent=cnc?'Standard CNC — ±0.127 mm (assumed)':'Process standard — supplier confirmation'; // Avoid promising one tolerance across additive processes.
    get('toleranceHelp').textContent=select.value==='custom'?'Custom fits, GD&T or tighter requirements: describe them in notes or attach a drawing. Reviewed quote required.':cnc?'Selected tolerance is a requested linear-dimensional target. Feature suitability requires confirmation.':sheet?'Sheet thickness, cut dimensions and bend tolerances are reviewed against your drawing. No universal numeric tolerance is promised.':'Process tolerance depends on material, geometry and equipment. No universal numeric tolerance is promised.'; // Explain scope before pricing.
    const choice=get('inspectionSelect').value; // Read the chosen post-production checks.
    get('coverageLabel').hidden=!['formal','cmm'].includes(choice); // Show scope only for priced reports.
    if(!['formal','cmm'].includes(choice))get('inspectionCoverage').value='first'; // Keep hidden scope at its default.
    get('inspectionHelp').textContent=({standard:'Included visual and basic dimensional checks; no formal report.',formal:'Dimensional report on up to 10 agreed dimensions per inspected part. First article checks one part; every-part coverage checks the full quantity.',cmm:'CMM report on up to 10 agreed dimensions per inspected part. Probing access and suitability require review.',custom:'NDT, special tests or a custom inspection plan require review. Describe the checks in notes; an automatic total is unavailable.'})[choice]; // State actual budget scope without claiming Geomiq certifications.
  } // Finish option descriptions.
  function next(){ // Validate only the first-stage requirements.
    if(!get('fileInput').files.length){status.textContent='Please upload a CAD file or drawing.';return;} // Give a visible file error instead of focusing a hidden input.
    for(const control of first.querySelectorAll('select,input:not([type=file])'))if(!control.reportValidity())return; // Validate material, quantity and timing before advancing.
    first.hidden=true;second.hidden=false;second.disabled=false; // Keep first-stage inputs enabled so they remain in the final RFQ.
    get('requestProgress').textContent='Step 2 of 2 · Configure, estimate & send';status.textContent=''; // Clearly mark navigation, not submission.
    options();window.dispatchEvent(new Event('berafiq:files-changed'));get('stage2Title').focus(); // Put keyboard users at the new stage heading.
  } // Finish forward navigation.
  get('requestNext').addEventListener('click',next); // The first request click never submits the form.
  get('requestBack').addEventListener('click',()=>{second.hidden=true;second.disabled=true;first.hidden=false;get('requestProgress').textContent='Step 1 of 2 · Files & requirements';get('requestNext').focus();}); // Preserve all entered values while revisiting files.
  form.addEventListener('submit',event=>{if(second.hidden){event.preventDefault();next();}else if(!get('fileInput').files.length){event.preventDefault();get('requestBack').click();status.textContent='Please upload a CAD file or drawing.';}},true); // Catch Enter-key submission before the existing sender runs.
  form.addEventListener('change',options);options(); // Refresh help and compatibility before the estimator recalculates.
})(); // Initialise the two-stage flow.
