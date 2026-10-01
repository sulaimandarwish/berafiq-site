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
processes, custom tolerances/checks and unsupported models need a reviewed quote.
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
Tax, shipping, urgency, finishing and unmodelled special requirements are excluded. Selected preset tolerance and inspection allowances are included.

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

## Two-stage configuration (October 2026)

Request quote now advances from files/process/material/quantity/timing to a second
stage containing tolerance, inspection, estimation and contact details. Only Send
RFQ submits to FormSubmit. Back preserves values. `request-flow.js` controls this.

CNC offers an assumed ±0.127 mm standard, ±0.05, ±0.025, ±0.01 and ±0.005 mm
requested targets, plus custom review. These are linear tolerance requests, not
verified manufacturability or GD&T compliance. Printing uses process-standard
or custom review; CNC precision choices are unavailable for printing.

Inspection choices: included standard checks (no report), dimensional report,
CMM report or custom review. Report scope is up to 10 agreed dimensions, on one
first article or every part. No ISO sampling plan or accreditation is claimed.
Attach a dimensioned PDF to define critical features; the estimator can use one
STEP/STL model alongside supporting files. Drawing requirements are not parsed.

Editable illustrative machining-time multipliers in `estimate-model.js` are
1 / 1.15 / 1.35 / 1.7 / 2.2 for standard through tightest CNC tolerance.
Dimensional reports add 30 minutes per batch plus 10 minutes per inspected part
at the inspection labour rate. CMM reports add 60 minutes plus 20 minutes per
inspected part at SAR 180/hour. Existing basic checks remain included. Margin and
contingency apply to these costs. The UI shows selling-price additions already
included in the total; do not add them twice. Work hours include programming and
extra inspection. After the first estimate, changing options refreshes the result
using cached geometry. Custom options clear the old price and require review.

Reference for option structure, not rates or capabilities:
https://geomiq.com/quality-assurance/
https://geomiq.com/cnc-machining/
BeRafiq's rates, report scope and tolerance factors are independent assumptions.
