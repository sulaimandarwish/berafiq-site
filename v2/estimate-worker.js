/* STEP/STL files stay in this browser worker; only the pinned CAD library is downloaded. */
importScripts('mesh-measure.js'); // Load our commented geometry measurement functions.
let engine; // Reuse the CAD module within a worker instance.
async function loadCAD() { // Initialise a pinned Open Cascade WebAssembly importer.
  const sources=['https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/','https://unpkg.com/occt-import-js@0.0.23/dist/']; // Keep both CDN fallbacks pinned to the same release.
  for(const base of sources) { // Try the alternate host only if loading fails.
    try { importScripts(base+'occt-import-js.js'); return await occtimportjs({locateFile:name=>base+name}); } catch(error) { /* Retry the same pinned version from the alternate CDN. */ } // Download executable library bytes, never CAD data.
  } // Exhaust the available hosts.
  throw Error('The CAD reader could not load. Check your connection or use a closed STL file.'); // Provide an actionable error without a fake estimate.
} // End CAD module loading.
self.onmessage=async ({data})=>{ // Receive a transferable file buffer from the page.
  try { // Return a controlled result or error to the page.
    let geometry; // Hold the measured shape.
    if(data.extension==='stl') { geometry=BerafiqMesh.stl(data.buffer,data.scale); } // STL units come from the visible customer selector.
    else { // Read STEP using declared file units.
      engine=engine||await loadCAD(); // Download the importer only for STEP input.
      const result=engine.ReadStepFile(new Uint8Array(data.buffer),{linearUnit:'millimeter',linearDeflectionType:'absolute_value',linearDeflection:0.02,angularDeflection:0.25}); // Tessellate at explicit millimetre tolerances.
      if(!result.success||result.meshes.length!==1) throw Error('Upload one solid part, not an assembly or an empty STEP file.'); // Keep estimates scoped to a single mesh part.
      const mesh=result.meshes[0]; // Read the imported tessellation.
      geometry=BerafiqMesh.measure({positions:mesh.attributes.position.array,indices:mesh.index.array}); // Calculate approximate volume and area from closed triangles.
    } // Finish supported file handling.
    self.postMessage({geometry}); // Return measurements; no CAD file upload is performed.
  } catch(error) { self.postMessage({error:error.message||'Could not read this model.'}); } // Preserve a useful reason for unsupported input.
}; // End worker message handling.
