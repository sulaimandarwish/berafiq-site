# Reversible customer estimate integration

This adds an optional budget-estimate panel to the existing RFQ form. It does not
replace the email submission, alter its recipient, collect payment or confirm an
order. The existing estimator's geometry.py and estimate.py are reused unchanged.

## Preview before publishing

Use 64-bit Python 3.12, then double-click START_ESTIMATE_PREVIEW.bat on Windows.
Open http://localhost:8000 . The preview displays the actual website and runs its
STEP API locally. Windows launcher execution has not been tested in this environment.

Alternatively, from the repository root:

```bash
python3.12 -m venv .estimate-venv
.estimate-venv/bin/python -m pip install -r estimator_service/requirements.txt
.estimate-venv/bin/python estimator_service/server.py
```

Select one STEP file, CNC Machining, Aluminium, a positive quantity and no
specified tolerance. Confirm the assumptions and click Calculate budget estimate.
The local service uses illustrative rates and the result explicitly says so.
Do not click the normal RFQ submit button during preview unless you intend to
send a real request to the site's existing email submission provider.

## What the customer sees

- Estimated SAR per part and batch total.
- Preliminary machine candidate, setup time, machine cycle and production work.
- Repeated wording: **Budget estimate — not a confirmed quote**.
- Material/finish assumptions, exclusions and a confirmed-quote next step.
- No internal cost rates, profit percentage or contingency amount in the response.

The calculation still includes material cost, overestimate_fraction and
margin_fraction from the server-owned profile. Example: SAR 100 cost + 10%
allowance, at 20% margin, gives SAR 137.50 before delivery/tax.
The included profile is public illustrative data, not private business pricing.

The supported web scope excludes delivery and outside finishing; those fields
must remain zero in the service profile. Requirements in notes, urgency, threads,
tight tolerances and drawing-specific requirements are not priced. The customer
explicitly acknowledges these exclusions. Complex geometry is either declined
by the existing filters or remains a preliminary candidate, not verified machining.

## How to edit

- `estimator.js`: client validations, request and result display.
- `estimator.css`: scoped visual styling.
- `estimator-config.js`: public endpoint and reversible enable/disable switch.
- `estimator_service/geometry.py`: original commented geometry model.
- `estimator_service/estimate.py`: original commented time and pricing formulas.
- `estimator_service/worker.py`: whitelist of fields returned to customers.
- `estimator_service/server.py`: upload checks, isolated worker and local preview.
- `estimator_service/rates.example.json`: illustrative settings only.

Every added Python/JavaScript code line has explanatory comments. JSON does not
allow comments; the original starter's guide documents the pricing parameters.

## GitHub Pages limitation and later activation

GitHub Pages serves the site but cannot run Python/Open Cascade. This branch is
therefore a working local integration, not a deployed estimate backend.
If no API endpoint is configured on Pages, the panel clearly says estimates are
not available yet and leaves the RFQ route available. It never makes up a price.

Before live activation:

1. Validate the rates and geometry/time limitations against actual shop data.
2. Store a reviewed rate profile OUTSIDE the public web root and repository;
   set BERAFIQ_RATES_FILE to its absolute path and rates_validated to true.
   Changing the flag alone does not establish accuracy.
3. Deploy the Python service behind HTTPS with container memory/CPU limits,
   upload limits, rate limiting and monitoring. The included server defaults to
   localhost and is a development integration, not a hardened public server.
4. Set BERAFIQ_ALLOWED_ORIGINS=https://sulaimandarwish.github.io (origin only).
   Set BERAFIQ_HOST/BERAFIQ_PORT to your host's requirements. Origin checks are
   browser integration controls, not authentication or abuse protection.
5. Set apiBase in estimator-config.js to the HTTPS service base URL. The frontend
   calls POST /api/estimate. Test supported, unsupported, timeout and stale-input cases.
6. Review and merge the pull request only after deciding to activate it.

The API accepts a raw application/octet-stream STEP body, maximum 10 MB, with
quantity, material=aluminium-6061 and tolerance=standard query parameters.
Files are temporary and removed after analysis; two processing slots and a
45-second worker timeout bound local workload. Public hosting still needs OS-level
memory limits and request rate limiting. No customer files are committed to GitHub.

## Reversibility

- Work is on a separate branch and draft PR; main and the live Pages site are unchanged.
- Before merge: close the PR to discard the proposal.
- After merge: use GitHub's Revert on the PR to remove the integration.
- Quick UI disable: set enabled:false in estimator-config.js. The ordinary RFQ
  form continues to work. Disable the backend separately if retiring the service.
- The existing Pages workflow deploys only main pushes (or an explicit manual run).

No website deployment, backend hosting purchase or email submission was performed
while preparing this change.

## Verification

Run `python -m unittest discover -s tests -p "test_*.py" -v` after installing the
CAD dependency. For interface logic, run `npm install --prefix tests`, then
`npm test --prefix tests`. Tests run locally and never submit the RFQ email form.

Completed in this environment: real STEP API parity with the original model;
invalid file/quantity/material/origin rejection; private static-path exclusion;
DOM checks for customer notices, stale-result invalidation, tolerance rejection,
service failure fallback and preservation of the RFQ recipient. JavaScript syntax
and Python compilation passed. Browser visual QA could not run because the
Chromium download failed; mobile appearance needs review before merge.

The Pages workflow now stages only public site assets instead of publishing the
entire repository, so the Python service and test sources are not copied to Pages.
