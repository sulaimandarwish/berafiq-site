const assert = require('node:assert/strict'); // Fail clearly when a customer-flow expectation is broken.
const fs = require('node:fs'); // Read the real site markup and script under test.
const path = require('node:path'); // Resolve repository paths from this test folder.
const {JSDOM} = require('jsdom'); // Exercise DOM behaviour without calling any email service.
const root = path.resolve(__dirname, '..'); // Locate the repository root.
const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {url:'http://localhost:8000', runScripts:'outside-only'}); // Build the actual page DOM without executing external scripts.
const w = dom.window; // Access the isolated browser-like window.
w.BERAFIQ_ESTIMATOR = {enabled:true, apiBase:''}; // Enable same-origin local estimation.
const form = w.document.getElementById('rfqForm'); // Reuse the site's real form structure.
const get = id => w.document.getElementById(id); // Look up a test target by its ID.
const change = (name, value) => { form.elements.namedItem(name).value = value; form.dispatchEvent(new w.Event('input', {bubbles:true})); }; // Mimic requirement edits and invalidate old results.
Object.defineProperty(get('fileInput'), 'files', {value:[{name:'part.step',size:100}], configurable:true}); // Supply a synthetic selected file without customer data.
let requests = 0; // Count whether unsupported inputs reach the API.
w.fetch = async () => { requests++; return {ok:true, json:async () => ({unit_price_sar:65.58,total_price_sar:655.83,quantity:10,setup_minutes:60,cycle_minutes:15.34,production_hours:3.72,machine_candidate:'3-axis candidate — access unverified',demo:true})}; }; // Provide a deterministic client-safe API result.
w.eval(fs.readFileSync(path.join(root, 'estimator.js'), 'utf8')); // Execute the actual estimator integration.
const tick = () => new Promise(resolve => setTimeout(resolve, 10)); // Let asynchronous click handlers settle.
(async () => { // Run sequential UI cases with explicit assertions.
  change('process', 'CNC Machining'); // Select a supported process.
  change('material', 'Aluminium'); // Select the supported material family.
  change('quantity', '10'); // Set the fixture quantity.
  get('estimateAssumptions').checked = true; // Acknowledge the disclosed estimate scope.
  get('estimateButton').click(); await tick(); // Request the synthetic estimate.
  assert.equal(requests, 1); // Confirm the request was issued once.
  assert.equal(get('estimateResult').hidden, false); // Confirm a successful result is visible.
  assert.match(get('estimatePrice').textContent, /65\.58/); // Confirm the unit price is rendered.
  assert.match(get('estimateCalibration').textContent, /illustrative/); // Keep prototype-rate status visible.
  assert.ok(get('estimateSummary').value); // A valid result can accompany an eventual user-submitted RFQ.
  change('quantity', '20'); // Simulate an order edit after the estimate.
  assert.equal(get('estimateResult').hidden, true); // Ensure the old price disappears.
  assert.equal(get('estimateSummary').value, ''); // Ensure stale data cannot accompany the updated RFQ.
  change('tolerance_required', 'yes'); // Request a requirement outside the time model.
  get('estimateButton').click(); await tick(); // Attempt an unsupported estimate.
  assert.match(get('estimateMessage').textContent, /tolerances/); // Explain the rejection to the customer.
  assert.equal(requests, 1); // Unsupported input should not consume a backend job.
  change('tolerance_required', 'no'); // Restore the supported requirement.
  w.fetch = async () => { throw new w.TypeError('offline'); }; // Simulate an unavailable API.
  get('estimateButton').click(); await tick(); // Try again while the service is down.
  assert.match(get('estimateMessage').textContent, /unavailable/); // Show an actionable fallback.
  assert.equal(form.querySelector('button[type=submit]').disabled, false); // Keep the normal RFQ action enabled.
  assert.equal(form.action, 'https://formsubmit.co/hello@berafiq.com'); // Preserve the existing recipient and submission route.
  let finish; w.fetch = () => new Promise(resolve => { finish=resolve; }); // Create a delayed request to test stale-response handling.
  get('estimateButton').click(); await tick(); // Begin the delayed job.
  change('quantity', '30'); // Change requirements before the response arrives.
  finish({ok:true,json:async()=>({unit_price_sar:1,total_price_sar:1,quantity:1,setup_minutes:1,cycle_minutes:1,production_hours:1})}); await tick(); // Return the obsolete price.
  assert.equal(get('estimateResult').hidden, true); // The obsolete response must not be displayed.
  console.log('PASS UI: estimate result, demo label, input invalidation, tolerance rejection, unavailable fallback, unchanged RFQ, stale-response rejection.'); // Record completed checks.
  w.close(); // Release DOM timers and resources.
})().catch(error => { console.error(error); w.close(); process.exitCode=1; }); // Fail the test command if any assertion breaks.
