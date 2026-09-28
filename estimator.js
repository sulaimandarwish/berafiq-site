/* Optional budget estimate: never submits the RFQ or emails files. */
(() => { // Keep estimator variables separate from the existing site scripts.
  const config = window.BERAFIQ_ESTIMATOR || {}; // Read only the public endpoint and feature switch.
  const panel = document.getElementById('estimatePanel'); // Find the added estimate card.
  if (!panel || !config.enabled) return; // Leave normal RFQ intake available when disabled.
  panel.hidden = false; // Reveal the optional estimator when JavaScript is ready.
  const form = document.getElementById('rfqForm'); // Reuse existing manufacturing requirements.
  const input = document.getElementById('fileInput'); // Use files already selected in the RFQ.
  const button = document.getElementById('estimateButton'); // Estimate without submitting the form.
  const message = document.getElementById('estimateMessage'); // Announce progress and errors.
  const result = document.getElementById('estimateResult'); // Hold client-facing results only.
  const summary = document.getElementById('estimateSummary'); // Include a valid estimate in a later RFQ submission.
  const consent = document.getElementById('estimateAssumptions'); // Require the limited material/finish scope to be acknowledged.
  let controller; // Track an in-flight request so changed inputs cancel it.
  let revision = 0; // Prevent old responses from replacing newer inputs.
  const money = value => new Intl.NumberFormat('en-SA', {style:'currency', currency:'SAR'}).format(value); // Format customer prices consistently.
  const field = name => form.elements.namedItem(name)?.value || ''; // Read current order settings.
  function reset() { // Invalidate the estimate when any order information changes.
    revision++; // Mark outstanding results obsolete.
    controller?.abort(); // Stop waiting on an obsolete request.
    result.hidden = true; // Remove the old price rather than showing a stale quote.
    summary.value = ''; // Prevent stale estimates being emailed with a different order.
    message.textContent = ''; // Clear the previous status.
    button.disabled = false; // Permit a fresh estimate.
    button.textContent = 'Calculate budget estimate'; // Restore the ordinary button label.
  } // End input invalidation.
  form.addEventListener('input', reset); // Invalidate on typed or selected changes.
  form.addEventListener('change', reset); // Cover browser-specific select/file events.
  window.addEventListener('berafiq:files-changed', reset); // Cover drag/drop and removal in the existing uploader.
  button.addEventListener('click', async () => { // Request an estimate only after the customer chooses this action.
    reset(); // Clear the prior result before validating.
    const selected = [...input.files]; // Read the synchronised input list.
    const quantity = Number(field('quantity')); // Convert quantity to a number.
    if (selected.length !== 1 || !/\.(step|stp)$/i.test(selected[0].name)) { message.textContent = 'For an estimate, select exactly one STEP/STP part. Other drawings can still be sent for a confirmed quote.'; return; } // Restrict geometry input to the supported format.
    if (selected[0].size > 10 * 1024 * 1024) { message.textContent = 'The estimate supports STEP files up to 10 MB.'; return; } // Match the backend and current RFQ upload limit.
    if (field('process') !== 'CNC Machining' || field('material') !== 'Aluminium') { message.textContent = 'Instant estimation currently supports CNC machining in aluminium 6061 only. Please request a quote for other options.'; return; } // Do not apply aluminium milling rates to another material/process.
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) { message.textContent = 'Enter a quantity from 1 to 10,000.'; return; } // Bound the calculation before sending.
    if (field('tolerance_required') !== 'no') { message.textContent = 'Specified tolerances need a confirmed quote; no automatic price is available.'; return; } // Avoid pricing requirements absent from the model.
    if (!consent.checked) { message.textContent = 'Please confirm the estimate assumptions below.'; return; } // Make assumptions explicit before transfer.
    const base = (config.apiBase || '').replace(/\/$/, ''); // Allow same-origin local preview or a deployed HTTPS service.
    if (!base && !['localhost','127.0.0.1'].includes(location.hostname)) { message.textContent = 'Instant estimates are not available yet. You can still request a manufacturing quote below.'; return; } // GitHub Pages cannot execute the Python service.
    const params = new URLSearchParams({quantity:String(quantity), material:'aluminium-6061', tolerance:'standard'}); // Send only the supported engineering inputs.
    const requestRevision = revision; // Capture the current version of the order.
    controller = new AbortController(); // Allow cancellation on input changes or timeout.
    const timer = setTimeout(() => controller.abort(), 55000); // Bound the wait presented to the customer.
    button.disabled = true; // Prevent duplicate requests while processing.
    button.textContent = 'Calculating…'; // Show progress on the initiating button.
    message.textContent = 'Analysing your STEP part. This may take up to 45 seconds.'; // Set a realistic expectation.
    try { // Handle supported results, unavailable service and failed analysis explicitly.
      const response = await fetch(base + '/api/estimate?' + params, {method:'POST', headers:{'Content-Type':'application/octet-stream'}, body:selected[0], signal:controller.signal}); // Send the file to the configured estimation service, not the email service.
      const data = await response.json(); // Read the structured result.
      if (requestRevision !== revision) return; // Discard responses for changed requirements.
      if (!response.ok) throw new Error(data.message || 'No automatic estimate is available for this part.'); // Show meaningful unsupported/service errors.
      const keys = ['unit_price_sar','total_price_sar','setup_minutes','cycle_minutes','production_hours','quantity']; // Validate the response values used in the UI.
      if (!keys.every(k => Number.isFinite(data[k]) && data[k] >= 0)) throw new Error('The estimate response was incomplete. Please request a quote.'); // Never show undefined or invalid prices.
      document.getElementById('estimatePrice').textContent = money(data.unit_price_sar) + ' / part'; // Display customer selling price, not internal margins.
      document.getElementById('estimateTotal').textContent = money(data.total_price_sar) + ' for ' + data.quantity + ' parts'; // Display the full batch estimate.
      document.getElementById('estimateMachine').textContent = data.machine_candidate; // Keep the candidate wording instead of guaranteeing an axis choice.
      document.getElementById('estimateSetup').textContent = data.setup_minutes.toFixed(1) + ' min / batch'; // Identify setup as a batch allowance.
      document.getElementById('estimateCycle').textContent = data.cycle_minutes.toFixed(1) + ' min / part'; // Identify recurring cycle time.
      document.getElementById('estimateProduction').textContent = data.production_hours.toFixed(2) + ' hours of work'; // Do not call work hours a delivery promise.
      document.getElementById('estimateCalibration').textContent = data.demo ? 'Prototype estimate using illustrative rates; not validated Saudi supplier pricing.' : 'Budget estimate based on the configured rates; final price requires confirmation.'; // Surface uncalibrated status to the customer.
      summary.value = JSON.stringify(data); // Attach only client-safe summary data if the customer later submits the RFQ.
      result.hidden = false; // Reveal the completed estimate.
      message.textContent = 'Estimate ready. Request a confirmed manufacturing quote below when you are ready.'; // Preserve the existing confirmation route.
    } catch (error) { // Recover without disabling the ordinary RFQ form.
      if (requestRevision === revision) message.textContent = error.name === 'AbortError' ? 'Estimation timed out. Please request a manufacturing quote.' : (error instanceof TypeError ? 'The estimate service is unavailable. Please request a manufacturing quote below.' : error.message); // Use a useful service error without claiming a price.
    } finally { // Always release request state.
      clearTimeout(timer); // Cancel the pending timeout.
      if (requestRevision === revision) { button.disabled = false; button.textContent = 'Calculate budget estimate'; } // Restore controls only for the latest request.
    } // End request handling.
  }); // End estimate-button listener.
})(); // Initialise this optional feature.
