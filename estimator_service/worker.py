import json # Read server-owned rates and emit structured results.
import sys # Receive the temporary file, rate profile and quantity from the service.
from pathlib import Path # Read the selected rate profile.
from geometry import analyse_step # Reuse the original STEP engine unchanged.
from estimate import estimate # Reuse the original pricing formula unchanged.

def run(path, profile, quantity): # Execute one bounded child-process job.
    params = json.loads(Path(profile).read_text()) # Load rates only from the server filesystem.
    if params.get('delivery_sar_batch', 0) or params.get('external_finish_sar_part', 0): # Keep the API consistent with its disclosed exclusions.
        raise ValueError('The web rate profile must exclude delivery and external finishing.') # Reject a mismatched service profile.
    geometry = analyse_step(path) # Extract measurements and the preliminary machining candidate.
    result = estimate(geometry, params, int(quantity)) # Include material, allowance and margin in the customer price.
    return { # Whitelist customer-safe response fields; omit internal margins and cost rates.
        'status': 'estimate', # Explicitly distinguish this from a confirmed quotation.
        'model_version': '0.2', # Identify the calculation model for later comparison.
        'demo': not params.get('rates_validated', False), # Declare whether the rates are illustrative.
        'quantity': result['quantity'], # Return the number of parts priced.
        'unit_price_sar': round(result['price_sar_unit'], 2), # Return customer price per part.
        'total_price_sar': round(result['price_sar_batch'], 2), # Return customer batch price.
        'setup_minutes': round(result['setup_min_batch'], 2), # Report assumed batch setup time.
        'cycle_minutes': round(result['machine_cycle_min_part'], 2), # Report recurring machine/handling time.
        'production_hours': round(result['production_min_batch']/60, 3), # Report processing work, not calendar lead time.
        'machine_candidate': geometry['machine_candidate'], # Preserve the unverified candidate label.
        'assumptions': 'Aluminium 6061; ordinary as-machined finish; no specified tight tolerances. Setup and accessibility are approximate.', # Declare the limited scope.
        'notice': 'Budget estimate only, not a confirmed quote. Tax, delivery, special finishes, urgency and additional drawing/notes requirements are excluded. Final price and delivery require confirmation.', # Keep the estimate qualification in exported RFQ data.
    } # Finish the public result.

if __name__ == '__main__': # Run only when invoked as the isolated worker.
    try: # Convert expected unsupported geometry into an actionable result.
        response = run(sys.argv[1], sys.argv[2], sys.argv[3]) # Run one estimate from the command-line arguments.
    except ValueError as exc: # Catch rejected geometry or invalid supported inputs.
        response = {'error': str(exc)} # Give the parent a controlled explanation.
    except Exception: # Do not expose internal tracebacks or paths to customers.
        response = {'error': 'This part could not be analysed. Please request a manufacturing quote.'} # Use a safe general failure message.
    print('BERAFIQ_RESULT=' + json.dumps(response)) # Prefix the JSON because native CAD libraries can write their own stdout messages.
