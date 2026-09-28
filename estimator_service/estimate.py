"""Explicit, uncalibrated engineering budget model; all time values in minutes."""
import math  # Use mathematical operations and finite-number checks.


def estimate(g, p, quantity):  # Calculate times and prices from geometry g, parameters p and quantity.
    if not g['estimate_allowed']:  # Respect route rejection from the geometry analysis.
        raise ValueError('; '.join(g['unsupported_reasons']))  # Return all reasons instead of calculating an unsupported price.
    if not isinstance(quantity, int) or quantity < 1:  # Require a positive integer batch size.
        raise ValueError('Quantity must be a positive integer.')  # Explain invalid batch sizes.
    for key, value in p.items():  # Validate every numeric configuration value.
        if isinstance(value, (int, float)) and (not math.isfinite(value) or value < 0):  # Reject negative numbers, infinity and NaN.
            raise ValueError(f'{key} must be a finite non-negative number.')  # Name the setting that needs correction.
    for key in ('density_kg_mm3', 'mrr_mm3_min', 'finish_feed_mm_min', 'finish_stepover_mm'):  # Select settings that must be strictly positive.
        if p[key] <= 0:  # Avoid zero density or division by zero.
            raise ValueError(f'{key} must be greater than zero.')  # Tell the user which setting must be positive.
    if not 0 <= p['margin_fraction'] < 1 or not 0 <= p['sensitivity_fraction'] < 1:  # Check fractions used to compute selling price and sensitivity bounds.
        raise ValueError('Margin and sensitivity fractions must be between 0 and 1 (exclusive of 1).')  # Reject 100-percent margin and invalid bounds.
    if not 0 <= p['finish_surface_fraction'] <= 1:  # Ensure finishing-area coverage is a fraction of the total surface.
        raise ValueError('Finish surface fraction must be between 0 and 1.')  # Reject invalid finishing coverage.
    dims = [x+2*p['stock_allowance_each_side_mm'] for x in g['dimensions_mm']]  # Add stock allowance to both sides of each box dimension.
    if max(dims) > p['max_stock_dimension_mm']:  # Apply the configured simple stock-size limit.
        raise ValueError('Stock exceeds the configured starter size limit.')  # Decline oversized workpieces.
    blank_volume = math.prod(dims)  # Multiply stock dimensions to obtain cubic millimetres.
    removed = max(0, blank_volume-g['volume_mm3'])  # Subtract finished volume from stock volume.
    rough = removed/p['mrr_mm3_min']  # Estimate roughing minutes using the effective removal rate.
    # Finishing is surface traversal; its small stock allowance is ignored.
    finish = g['surface_area_mm2']*p['finish_surface_fraction']/p['finish_stepover_mm']/p['finish_feed_mm_min']  # Approximate finishing path length from covered area and stepover, then divide by feed.
    setups = g['assumed_setups']  # Use the geometry-stage setup allowance.
    handling = setups*p['handling_min_per_setup_per_part']  # Charge one handling allowance per setup per part.
    machine_cycle = rough+finish+handling+p['tool_and_rapid_allowance_min_part']  # Sum machine occupancy per part, including load/unload allowances.
    inspection = p['inspection_min_part']  # Keep off-machine inspection separate from machining time.
    setup = setups*p['setup_min_each']  # Charge setup time once per orientation for the whole batch.
    programming = p['programming_min_batch']  # Charge programming once per batch.
    blank_kg = blank_volume*p['density_kg_mm3']  # Convert stock volume to kilograms.
    rows = {  # Build the batch cost breakdown before margin and freight.
        'Material and blank cutting': quantity*(blank_kg*p['material_sar_kg']+p['blank_cut_sar']),  # Multiply stock and blank-cutting cost by part count.
        'Programming': programming/60*p['programming_cost_sar_hour'],  # Convert programming minutes to hours and apply the cost rate.
        'Setup': setup/60*p['setup_cost_sar_hour'],  # Convert total batch setup minutes to cost.
        'Machining and handling': quantity*machine_cycle/60*p['machine_cost_sar_hour'],  # Charge repeated machine occupancy at the production cost rate.
        'Inspection': quantity*inspection/60*p['inspection_cost_sar_hour'],  # Charge inspection separately, avoiding duplicate machine time.
        'Consumables': quantity*p['consumables_sar_part'],  # Add per-part tool-wear and consumable allowance.
        'External finishing': quantity*p['external_finish_sar_part'],  # Add configured outside-process charges; default is zero.
    }  # Finish this result dictionary.
    cost = sum(rows.values())  # Sum manufacturing cost before selling margin.
    allowance = cost*p['overestimate_fraction']  # Add a configurable cost contingency before profit.
    adjusted_cost = cost+allowance  # Calculate the cost basis including the overestimation allowance.
    target_price = adjusted_cost/(1-p['margin_fraction'])  # Gross margin is a share of selling price, not a markup on cost.
    profit = target_price-adjusted_cost  # Show modeled profit separately from the contingency allowance.
    minimum_uplift = max(0, p['minimum_order_sar']-target_price)  # Show any minimum-order adjustment separately.
    price = target_price+minimum_uplift+p['delivery_sar_batch']  # Apply margin and minimum order, then pass through delivery without margin.
    swing = p['sensitivity_fraction']  # Read the illustrative sensitivity fraction.
    return {  # Build a plain dictionary that can be exported as JSON.
        'quantity': quantity, 'assumed_setups': setups, 'stock_dimensions_mm': dims,  # Return order quantity, setup allowance and stock dimensions.
        'blank_kg': blank_kg, 'removed_volume_mm3': removed,  # Expose material mass and removal volume for checking.
        'programming_min_batch': programming, 'setup_min_batch': setup,  # Return separate batch programming and setup times.
        'roughing_min_part': rough, 'finishing_min_part': finish,  # Expose calculated cutting-time components.
        'handling_min_part': handling, 'machine_cycle_min_part': machine_cycle,  # Return handling and total machine occupancy per part.
        'inspection_min_part': inspection,  # Return inspection time outside machine cycle.
        'production_min_batch': setup+quantity*(machine_cycle+inspection),  # Calculate sequential production work including setup but excluding programming.
        'total_work_min_batch': programming+setup+quantity*(machine_cycle+inspection),  # Include programming in the total modeled work time.
        'overestimate_fraction': p['overestimate_fraction'], 'overestimate_sar_batch': allowance,  # Export the allowance percentage and its batch amount.
        'adjusted_cost_sar_batch': adjusted_cost, 'profit_margin_fraction': p['margin_fraction'],  # Keep the adjusted basis and target margin with the result.
        'profit_sar_batch': profit, 'minimum_uplift_sar_batch': minimum_uplift,  # Distinguish target profit from minimum-charge uplift.
        'delivery_sar_batch': p['delivery_sar_batch'],  # Expose pass-through delivery as its own line.
        'cost_rows_sar_batch': rows, 'cost_sar_batch': cost,  # Return both detailed and total manufacturing costs.
        'price_sar_batch': price, 'price_sar_unit': price/quantity,  # Return selling price for the order and per part.
        'sensitivity_low_sar_unit': price/quantity*(1-swing),  # Calculate a user-defined lower sensitivity scenario.
        'sensitivity_high_sar_unit': price/quantity*(1+swing),  # Calculate a user-defined upper sensitivity scenario.
        'status': 'UNCALIBRATED BUDGET ONLY',  # Label every result as unvalidated regardless of input profile name.
        'range_note': 'User-set sensitivity band; NOT statistical confidence or a validated prediction interval.',  # Prevent misinterpretation of sensitivity as accuracy.
        'time_note': 'Sequential work estimate; excludes queues, shifts and external-process lead times.',  # Distinguish processing work from calendar delivery time.
        'price_note': 'Internal-cost rates plus margin. Tax excluded; external finishing and freight only as entered.'  # State rate basis and price exclusions.
    }  # Finish this result dictionary.
