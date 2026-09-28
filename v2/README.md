# BeRafiq V2 browser estimator

V1: https://sulaimandarwish.github.io/berafiq-site/
V2: https://sulaimandarwish.github.io/berafiq-site/v2/

Only files under `v2/` change. V1 and the Pages workflow stay unchanged.
The previous panel depended on an unavailable Python API. This version measures
models and calculates budget estimates in the browser without a paid backend.

## Using it

Choose CNC Machining or 3D Printing — Polymer / Resin, a compatible specific
material and quantity. Select one STEP/STP or closed STL file up to 10 MB,
confirm the assumptions and click Calculate budget estimate. For STL, choose
its units; STEP carries units. FDM exposes infill and support allowances.
All 24 specific dropdown materials have profiles. Not sure / other, other
processes, specified tolerances and unsupported models need a reviewed quote.
The separate RFQ button sends a real request through the existing FormSubmit route.

## Read these files first

- `estimate-model.js`: material profiles, machine rates, setup/cycle formulas,
  profit margin and overestimation allowance. Edit these assumptions here.
- `estimator.js`: form validation, file analysis, result display and invalidation.
- `estimate-worker.js` and `mesh-measure.js`: STEP import and mesh measurement.
- `estimator-config.js`: set enabled to false to disable the panel.

New calculation code includes explanatory line comments. The default gross
profit margin is 20% and overestimation allowance is 0%. Selling price is
`base cost × (1 + allowance) / (1 - margin)`. These settings are public JavaScript;
keeping commercial rates private requires a server implementation later.

## Assumptions and limits

All prices are illustrative, unvalidated SAR inputs, not a Saudi supplier database.
Generic materials map to visible assumed grades. Calibrate against actual
supplier quotes, machine logs and invoices before relying on prices commercially.
Tax, shipping, urgency, finishing and special requirements are excluded.

CNC uses an axis-aligned stock box plus allowance, material-dependent removal
rates and an area-based finishing approximation. Setup is a fixed starting
assumption, not inferred workholding. Machine axes, accessibility, tooling,
collisions and manufacturability are not verified. The UI says axes need confirmation.

FDM uses shell/infill/support volume and assumed extrusion flow; SLA uses layer
count and exposure-cycle assumptions; SLS uses a layer/volume model with powder
allowance. These are budget models, not slicer results. Original file orientation
sets build height. No automatic orientation optimisation or machine build-envelope
check is performed. Batch times assume sequential parts without nesting.

STEP uses tessellation, so volume and area are approximate. The reader accepts a
single connected, consistently wound closed mesh; assemblies, open surfaces,
multiple shells and models over 200,000 triangles are rejected. This may reject
otherwise valid parts with enclosed cavities. Mesh checks do not prove freedom
from self-intersections or manufacturing suitability. Dimensions above 1 metre
are outside the current scope. Production hours are work estimates, not delivery.

## Privacy and dependencies

Estimation keeps model bytes in the browser. STEP loads pinned occt-import-js
0.0.23 JavaScript and WASM from jsDelivr, falling back to unpkg. Those hosts see
normal asset requests; model bytes are not uploaded to them. Initial STEP use
requires internet access and downloads about 7.6 MB of WASM. STL parsing is local.
The dependency is MIT licensed: https://github.com/kovacsv/occt-import-js .
Submitting the RFQ separately sends form data and attachments via FormSubmit.

## Tests and rollback

In `v2/tests`, run `npm install` then `npm test`. Optionally set STEP_FIXTURE to
an absolute path to a known valid STEP file to include the actual WASM importer.
Tests exercise all 24 material UI paths, CNC/FDM/SLA/SLS, known cube measurements,
ASCII/binary STL, inch conversion, open-mesh rejection, compatibility, infill/support,
stale-result clearing and the unchanged RFQ destination without submitting it.
STEP WASM was also tested with an 80 × 50 × 12 mm plate with a through hole.
DOM and worker transport are emulated; full visual browser QA remains outstanding
because Chromium could not launch in the execution environment.

Revert this V2 fix commit to restore the prior V2, or disable the estimator flag.
Deleting only `v2/` removes V2 without changing V1. Do not merge the earlier draft
PR #1 merely to enable estimation: it modifies root V1 files.
