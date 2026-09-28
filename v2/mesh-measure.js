/* Mesh measurements for STEP tessellations and closed STL files; not a manufacturing feature recogniser. */
(function(root) { // Share measurements between the browser worker and regression tests.
  function measure(mesh, scale=1) { // Accept flat vertex coordinates and triangle indices.
    const p=mesh.positions, idx=mesh.indices; // Read the common internal mesh format.
    if(!p?.length||!idx?.length||idx.length%3||p.length%3||idx.length>600000) throw Error('Empty, malformed or overly detailed mesh. Export a simpler single-part model.'); // Bound worker memory and traversal cost.
    const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity]; // Initialise coordinate extents.
    for(let i=0;i<p.length;i++) { const v=p[i]*scale; if(!Number.isFinite(v)) throw Error('The model contains invalid coordinates.'); min[i%3]=Math.min(min[i%3],v); max[i%3]=Math.max(max[i%3],v); } // Measure file-aligned extents after unit conversion.
    const center=min.map((v,i)=>(v+max[i])/2), dims=min.map((v,i)=>max[i]-v); // Use a local origin to improve volume precision.
    const epsilon=Math.max(1e-6,Math.max(...dims)*1e-8); // Weld identical tessellation vertices within a small scale-aware tolerance.
    const ids=new Map(), vertices=[], mapped=[]; // Map per-face duplicate coordinates to common topological vertices.
    for(let i=0;i<p.length;i+=3) { // Process each original vertex.
      const v=[p[i]*scale,p[i+1]*scale,p[i+2]*scale]; // Convert the vertex to millimetres.
      const key=v.map(x=>Math.round(x/epsilon)).join(','); // Build a deterministic welding key.
      if(!ids.has(key)) { ids.set(key,vertices.length); vertices.push(v.map((x,j)=>x-center[j])); } // Store a shifted unique vertex.
      mapped.push(ids.get(key)); // Remember which unique vertex this original vertex represents.
    } // Finish vertex welding.
    const parents=vertices.map((_,i)=>i); // Track connected shells so assemblies are not priced as one part.
    function find(i){while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;} // Resolve a welded vertex component with path compression.
    const used=new Set(); // Track only vertices belonging to non-degenerate triangles.
    const edges=new Map(); let volume=0, area=0; // Accumulate oriented volume, surface area and edge connectivity.
    for(let i=0;i<idx.length;i+=3) { // Process every triangle once.
      const raw=[idx[i],idx[i+1],idx[i+2]]; // Read triangle vertex indices.
      if(!raw.every(n=>Number.isInteger(n)&&n>=0&&n<mapped.length)) throw Error('The mesh contains invalid triangle indices.'); // Reject invalid array references.
      const tri=raw.map(n=>mapped[n]); // Resolve welded topology.
      if(new Set(tri).size<3) continue; // Ignore collapsed zero-area triangles.
      parents[find(tri[1])]=find(tri[0]);parents[find(tri[2])]=find(tri[0]);tri.forEach(n=>used.add(n)); // Join the triangle into its connected shell.
      const [a,b,c]=tri.map(n=>vertices[n]); // Read shifted triangle coordinates.
      const u=b.map((x,j)=>x-a[j]), v=c.map((x,j)=>x-a[j]); // Build two triangle edges.
      const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]; // Compute the area-normal vector.
      area+=Math.hypot(...cross)/2; // Add triangle surface area in mm².
      volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6; // Add signed tetrahedron volume in mm³.
      for(let e=0;e<3;e++) { const x=tri[e],y=tri[(e+1)%3],key=Math.min(x,y)+','+Math.max(x,y),item=edges.get(key)||[0,0]; item[0]++;item[1]+=x<y?1:-1;edges.set(key,item); } // Count shared edges and opposite winding.
    } // Finish triangle traversal.
    if([...edges.values()].some(([count,balance])=>count!==2||balance!==0)) throw Error('The model is open, non-manifold or inconsistently oriented. Export a closed solid STL/STEP and try again.'); // Avoid inventing volume for open surfaces.
    if(new Set([...used].map(find)).size!==1) throw Error('Multiple disconnected shells are outside this estimate model. Export a single connected solid.'); // Reject assemblies and enclosed multi-shell cavities.
    volume=Math.abs(volume); // Accept an entirely reversed but consistently wound shell.
    if(volume<=0||area<=0||dims.some(x=>x<=0)) throw Error('The model has no measurable solid volume.'); // Reject zero-volume geometry.
    return {volume,area,dims}; // Return measurements rather than claiming machining accessibility.
  } // End mesh measurements.
  function stl(buffer, scale=1) { // Parse binary or ASCII STL without a paid library.
    const view=new DataView(buffer), positions=[],indices=[]; // Prepare the common mesh representation.
    const n=buffer.byteLength>=84?view.getUint32(80,true):0; // Read binary triangle count only when the header exists.
    if(n>0&&84+n*50===buffer.byteLength) { // Detect binary STL by exact record length, not the optional solid header text.
      if(n>200000) throw Error('STL exceeds 200,000 triangles; export a lighter mesh.'); // Reject overly large models before allocating arrays.
      for(let t=0;t<n;t++) for(let v=0;v<3;v++) { const offset=84+t*50+12+v*12;indices.push(positions.length/3);for(let j=0;j<3;j++)positions.push(view.getFloat32(offset+j*4,true)); } // Extract triangle vertices; normals are derived from winding.
    } else { // Try standard ASCII STL.
      const text=new TextDecoder().decode(buffer); // Decode the textual representation.
      if(!/^\s*solid\b/i.test(text)) throw Error('This is not a recognised STL file.'); // Avoid treating arbitrary drawings as geometry.
      const pattern=/\bvertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;let hit; // Match signed decimal/scientific vertex coordinates.
      while((hit=pattern.exec(text))) { indices.push(positions.length/3);positions.push(Number(hit[1]),Number(hit[2]),Number(hit[3]));if(indices.length>600000)throw Error('STL exceeds 200,000 triangles.'); } // Parse bounded ASCII coordinates.
    } // Finish format detection.
    return measure({positions,indices},scale); // Require closed topology and use the explicitly selected STL units.
  } // End STL parsing.
  root.BerafiqMesh={measure,stl}; // Expose the two geometry entry points.
  if(typeof module!=='undefined')module.exports=root.BerafiqMesh; // Enable Node verification against known solids.
})(typeof self!=='undefined'?self:globalThis); // Select the available global object.
