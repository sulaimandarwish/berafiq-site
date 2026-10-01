/* Editable browser budget model. All rates are illustrative, NOT verified Saudi market prices. */
(function(root) { // Export the same calculation code to browsers, workers and Node tests.
  'use strict'; // Catch accidental undeclared variables.
  const pricing = {margin:0.20, allowance:0, machineSARHour:100, setupSARHour:100, programmingSARHour:80, inspectionSARHour:60}; // Public example business settings; browser code cannot keep margins secret.
  const materials = {}; // Index every specific material option by its exact form label.
  function cnc(name, grade, density, sarKg, mrr, feed) { materials[name]={mode:'cnc',grade,density,sarKg,mrr,feed}; } // Density is kg/litre; MRR is mm³/min; feed is mm/min.
  cnc('Aluminium 6061-T6','Aluminium 6061-T6',2.70,25,6000,800); // Illustrative aluminium machining baseline.
  cnc('Carbon steel AISI 1018','1018 carbon steel',7.85,12,2500,400); // Illustrative mild-steel baseline.
  cnc('Stainless steel AISI 304','304 stainless steel',8.00,30,1200,250); // Illustrative stainless baseline.
  cnc('Tool steel P20 — pre-hardened','P20 pre-hardened tool steel',7.80,35,900,200); // Assumes machinable pre-hard stock, not hardened-tool grinding.
  cnc('Titanium Grade 5 — Ti-6Al-4V','Ti-6Al-4V titanium',4.43,180,450,140); // Illustrative titanium baseline.
  cnc('Nickel alloy Inconel 718','Inconel 718',8.19,240,220,100); // Illustrative nickel-alloy baseline.
  cnc('Acetal POM-C','Acetal POM-C',1.41,35,8000,1000); // Generic plastic is explicitly mapped to this declared grade.
  cnc('Aluminium 7075-T6','Aluminium 7075-T6',2.81,42,5000,700); // Separate illustrative high-strength aluminium stock and machining assumptions.
  cnc('Aluminium 6082-T6','Aluminium 6082-T6',2.70,28,5800,780); // Separate illustrative 6082 stock profile; availability needs confirmation.
  cnc('Carbon steel AISI 1045','AISI 1045 carbon steel',7.85,14,2100,350); // Assumes unhardened stock; heat treatment is excluded.
  cnc('Alloy steel AISI 4140 — annealed','AISI 4140 alloy steel, annealed',7.85,22,1700,300); // Explicitly excludes hardened 4140 and additional heat treatment.
  cnc('Stainless steel AISI 316L','AISI 316L stainless steel',8.00,38,1000,220); // Separate illustrative stock price and slower removal assumptions.
  function print(name, grade, density, sarKg, technology, flow, hourly, layer) { materials[name]={mode:'print',grade,density,sarKg,technology,flow,hourly,layer}; } // Add a polymer/resin process with explicit example throughput.
  print('PLA','PLA',1.24,80,'FDM',8,20,0.20); // FDM flow is effective extrusion in mm³/s.
  print('PETG','PETG',1.27,90,'FDM',7,20,0.20); // PETG flow and material price assumption.
  print('ABS','ABS',1.04,85,'FDM',7,24,0.20); // Enclosed-printer ABS assumption.
  print('ASA','ASA',1.07,110,'FDM',7,24,0.20); // Enclosed-printer ASA assumption.
  print('TPU 95A — filament','TPU 95A filament',1.21,150,'FDM',3,25,0.20); // Flexible filament uses lower effective flow.
  print('Polycarbonate (PC)','PC',1.20,160,'FDM',5,30,0.20); // High-temperature PC printing assumption.
  print('Nylon PA6 — filament','PA6 filament',1.14,170,'FDM',5,30,0.20); // Dry-filament PA assumption.
  print('Nylon PA6-CF — filament','PA6-CF filament; fibre loading and brand subject to confirmation',1.20,260,'FDM',4,35,0.20); // Abrasive filament and specialist printer allowance.
  print('PEEK — filament','PEEK',1.30,1800,'FDM',2,90,0.20); // Requires a compatible high-temperature printer; no availability guarantee.
  print('PA12 Nylon','PA12 powder',1.01,280,'SLS',2,90,0.10); // SLS flow is assumed fused volume in cm³/min, not filament flow.
  print('PA11 Nylon','PA11 powder',1.03,320,'SLS',2,90,0.10); // Representative SLS, not an automatic SLS/MJF supplier choice.
  print('TPU powder','TPU powder',1.10,450,'SLS',1.5,100,0.10); // Flexible powder baseline.
  print('Standard resin','standard resin',1.10,160,'SLA',0.10,40,0.05); // SLA flow stores an assumed minute-per-layer cycle.
  print('Tough / ABS-like resin','tough resin',1.12,260,'SLA',0.12,45,0.05); // Includes conservative exposure/lift time per layer.
  print('Engineering resin','engineering resin',1.15,450,'SLA',0.12,50,0.05); // Exact resin grade still needs supplier confirmation.
  print('High-temperature resin','high-temperature resin',1.15,650,'SLA',0.15,55,0.05); // Heat-resistant resin baseline.
  print('Flexible resin','flexible resin',1.10,450,'SLA',0.15,50,0.05); // Flexible resin baseline.
  materials['Sheet aluminium 5052-H32']={mode:'sheet',grade:'Sheet aluminium 5052-H32'}; // Named RFQ-only sheet grade; no invented machining or sheet price.
  materials['Sheet aluminium 6061-T6']={mode:'sheet',grade:'Sheet aluminium 6061-T6'}; // Named RFQ-only sheet grade; no invented machining or sheet price.
  materials['Sheet steel DC01 — cold rolled']={mode:'sheet',grade:'Sheet steel DC01 — cold rolled'}; // Named RFQ-only sheet grade; no invented machining or sheet price.
  materials['Sheet galvanized steel ASTM A653 CS Type B']={mode:'sheet',grade:'Sheet galvanized steel ASTM A653 CS Type B'}; // Named RFQ-only sheet grade; no invented machining or sheet price.
  materials['Sheet stainless steel 304 — 2B']={mode:'sheet',grade:'Sheet stainless steel 304 — 2B'}; // Named RFQ-only sheet grade; no invented machining or sheet price.
  materials['Sheet stainless steel 316L — 2B']={mode:'sheet',grade:'Sheet stainless steel 316L — 2B'}; // Named RFQ-only sheet grade; no invented machining or sheet price.
  materials['Sheet copper C110']={mode:'sheet',grade:'Sheet copper C110'}; // Named RFQ-only sheet grade; no invented machining or sheet price.
  materials['Sheet brass C260']={mode:'sheet',grade:'Sheet brass C260'}; // Named RFQ-only sheet grade; no invented machining or sheet price.
  function calculate(g, input) { // Price one measured part using explicit manufacturing settings.
    const m=materials[input.material]; // Resolve a specific material profile.
    if(!m) throw Error('Choose a specific material; an unknown material cannot be priced.'); // Handle Not sure / other explicitly.
    const isPrint=input.process==='3D Printing — Polymer / Resin'; // Use the exact existing printing process option.
    if(input.process!=='CNC Machining' && !isPrint) throw Error('Automatic estimates support CNC machining and polymer/resin 3D printing. Please request a quote for this process.'); // Preserve manual RFQs for other services.
    if((isPrint?'print':'cnc')!==m.mode) throw Error('This material does not match the selected process. Select a compatible material or request a quote.'); // Avoid applying resin prices to metal machining.
    const q=Number(input.quantity); // Read order quantity.
    if(!Number.isInteger(q)||q<1||q>10000) throw Error('Enter a whole-number quantity between 1 and 10,000.'); // Validate batch size.
    if(!Number.isFinite(g.volume)||g.volume<=0||!Number.isFinite(g.area)||g.area<=0||g.dims.length!==3||!g.dims.every(x=>Number.isFinite(x)&&x>0)) throw Error('The geometry measurements are invalid.'); // Reject impossible or corrupt mesh properties.
    if(Math.max(...g.dims)>1000) throw Error('The part exceeds the 1,000 mm estimate limit. Please confirm units or request a quote.'); // Catch oversized models and common STL scale errors.
    let materialCost, cycle, setup, programming, inspection, route, notes, printMass=0; // Declare the output components used by both processes.
    if(m.mode==='cnc') { // Apply the volume/surface milling budget model.
      const stock=g.dims.map(x=>x+4).reduce((a,b)=>a*b,1); // Add 2 mm stock allowance on every side of the axis-aligned box.
      materialCost=stock/1e6*m.density*m.sarKg+5; // Buy the raw blank, including removed material and SAR 5 cutting allowance.
      cycle=Math.max(0,stock-g.volume)/m.mrr+g.area*0.5/1/m.feed+4; // Approximate roughing, finishing and handling/tool-change time.
      setup=60; programming=30; inspection=1; // Assume two 30-minute batch setups and separate programming/inspection.
      route='Milling budget model · machine axes need confirmation'; // Mesh geometry does not prove 3-axis, turning or 5-axis suitability.
      notes='Assumes two setups, 2 mm stock allowance per side and ordinary as-machined finish. No toolpath, fixture or axis-access verification; not a turning quote.'; // State the CNC model limits.
    } else { // Apply material-specific additive manufacturing assumptions.
      const volumeCM=g.volume/1000; // Convert mm³ to cm³ for material calculations.
      const support=Number(input.support??20)/100; // Use a declared support/waste allowance, not inferred support geometry.
      if(!Number.isFinite(support)||support<0||support>1) throw Error('Support/waste allowance must be 0–100%.'); // Bound this user-supplied assumption.
      let usedCM; // Track charged feedstock volume.
      if(m.technology==='FDM') { // Estimate extrusion from walls and infill.
        const infill=Number(input.infill??20)/100; // Read requested infill fraction.
        if(!Number.isFinite(infill)||infill<0||infill>1) throw Error('Infill must be 0–100%.'); // Reject invalid percentages.
        const shell=Math.min(volumeCM,g.area*1.2/1000); // Approximate a 1.2 mm shell; cap it at the solid volume.
        usedCM=(shell+(volumeCM-shell)*infill)*(1+support); // Add infill and the explicit support/waste allowance.
        cycle=usedCM*1000/m.flow/60*1.4; // Convert deposited volume to minutes with a motion/retraction factor.
      } else if(m.technology==='SLA') { // Use a layer-based resin printing estimate.
        usedCM=volumeCM*(1+support); // Assume a solid resin part plus supports/waste.
        cycle=Math.ceil(g.dims[2]/m.layer)*m.flow; // Estimate exposure/lift cycles using the file's Z orientation.
      } else { // Use a rough powder-process model.
        usedCM=volumeCM*1.25; // Charge fused volume plus 25% powder handling/refresh allowance.
        cycle=Math.ceil(g.dims[2]/m.layer)*0.08+volumeCM/m.flow; // Add layer spreading and approximate scan time.
      } // Finish the chosen additive process model.
      printMass=usedCM*m.density; // Density kg/litre is numerically equal to grams/cm³.
      materialCost=printMass/1000*m.sarKg; // Convert estimated feedstock mass to material cost.
      setup=m.technology==='SLS'?60:20; programming=10; inspection=m.technology==='FDM'?5:15; // Separate batch preparation and per-part cleanup allowances.
      route=m.technology+' 3D printing · orientation as uploaded'; // Report the actual assumed printing technology.
      notes=`${m.technology}: layer ${m.layer} mm; ${m.technology==='FDM'?'1.2 mm shell, '+(input.infill??20)+'% infill; ':''}${m.technology==='SLS'?'25% powder allowance':(input.support??20)+'% support/waste allowance'}. No slicing, nesting or support generation. Quantity assumes sequential parts, not shared build packing.`; // Expose the print-time assumptions.
    } // Finish process-specific calculations.
    const tolerance=input.tolerance||'standard', inspectionOption=input.inspection||'standard', coverage=input.coverage||'first'; // Read optional customer quality selections.
    const multipliers={'standard':1,'0.05':1.15,'0.025':1.35,'0.01':1.7,'0.005':2.2}; // Editable machining-time factors, not verified supplier prices or capability guarantees.
    if(!(tolerance in multipliers)||!['standard','formal','cmm'].includes(inspectionOption))throw Error('Custom tolerances or inspection need a reviewed quote; no automatic total is available.'); // Avoid pricing undefined quality work.
    if(m.mode!=='cnc'&&tolerance!=='standard')throw Error('Numeric CNC tolerances do not apply to 3D printing. Choose process standard or custom review.'); // Keep process requirements compatible.
    if(!['first','all'].includes(coverage))throw Error('Choose a valid inspection coverage.'); // Prevent unrecognised sampling rules.
    const machiningExtraMinutes=cycle*(multipliers[tolerance]-1); // Add precision work only to CNC machine time.
    cycle+=machiningExtraMinutes; // Include precision work in displayed runtime.
    const checkedParts=coverage==='all'?q:1; // Explicit first-article or every-part scope, not an implied ISO sampling plan.
    const inspectionMinutes=inspectionOption==='formal'?30+10*checkedParts:inspectionOption==='cmm'?60+20*checkedParts:0; // Editable batch preparation and per-part report allowances.
    const inspectionExtra=inspectionMinutes/60*(inspectionOption==='cmm'?180:pricing.inspectionSARHour); // CMM uses an illustrative SAR 180/hour rate; formal reports use inspection labour.
    const machineRate=m.mode==='cnc'?pricing.machineSARHour:m.hourly; // Apply the relevant machine cost per hour.
    const materialTotal=materialCost*q; // Purchase material for the full order.
    const setupCost=setup/60*pricing.setupSARHour+programming/60*pricing.programmingSARHour; // Amortise fixed preparation over the batch.
    const productionCost=q*(cycle/60*machineRate+inspection/60*pricing.inspectionSARHour+2); // Add machine occupancy, cleanup/inspection and consumables.
    const base=materialTotal+setupCost+productionCost+inspectionExtra; // Sum costs before allowance and gross margin.
    const total=base*(1+pricing.allowance)/(1-pricing.margin); // Apply owner-controlled contingency and profit margin in that order.
    return {unit:total/q,total,quantity:q,setup,programming,cycle,productionHours:(setup+programming+q*(cycle+inspection)+inspectionMinutes)/60,tolerance,inspectionOption,coverage,toleranceExtraSAR:q*machiningExtraMinutes/60*machineRate*(1+pricing.allowance)/(1-pricing.margin),inspectionExtraSAR:inspectionExtra*(1+pricing.allowance)/(1-pricing.margin),route,grade:m.grade,notes,printMass,volumeCM:g.volume/1000,dims:g.dims,materialTotal,setupCost,productionCost,allowance:base*pricing.allowance,profit:total-base*(1+pricing.allowance)}; // Return detailed values; UI displays only customer-facing fields.
  } // End price calculation.
  root.BerafiqModel={materials,pricing,calculate}; // Make the model available to page code and tests.
  if(typeof module!=='undefined') module.exports=root.BerafiqModel; // Support dependency-free Node regression tests.
})(typeof self!=='undefined'?self:globalThis); // Select the browser/worker global or Node global.
