# Open-source slicing and CAM: integration status and next implementation

## What V2 actually uses today

- occt-import-js 0.0.23 reads STEP geometry: https://github.com/kovacsv/occt-import-js .
- Our mesh measurement and cost formulas estimate CNC/printing budgets.
- No real printing slicer or CNC toolpath engine is integrated yet.
- Laser, plasma, waterjet, wire EDM and sinker EDM are reviewed RFQ routes, not automatic estimators.
- The customer sees prices and a short estimate disclaimer; calculation details and times stay private to the UI implementation (the browser source itself is public).

## Candidate engines and official sources

| Tool | Intended role | Official source | Status here |
| --- | --- | --- | --- |
| Kiri:Moto | Browser FDM/SLA slicing; CAM and laser toolpaths | https://github.com/GridSpace/grid-apps | Evaluated documentation; not integrated |
| Kiri Engine API | Load/parse STL, configure device/process, slice, prepare, export | https://docs.grid.space/kiri-moto/engine-apis/ | Candidate API for the zero-hosting-cost FDM implementation |
| PrusaSlicer | Printer-profile-based slicing through command line | https://github.com/prusa3d/PrusaSlicer | Alternative for a local/server worker |
| CuraEngine | FDM model-to-G-code engine | https://github.com/Ultimaker/CuraEngine | Alternative requiring an execution service and machine settings |
| FreeCAD CAM | CNC jobs, tools, operations and G-code | https://github.com/FreeCAD/FreeCAD | Candidate for an isolated CNC worker |
| FreeCAD CAM docs | Job/operation workflow | https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/CAM_Workbench.md | Reference |
| CAMotics | Three-axis G-code simulation | https://github.com/CauldronDevelopmentLLC/CAMotics | Optional verification stage, not an automatic quoting engine |
| PyCAM | Three-axis toolpath generation | https://github.com/SebKuzminsky/pycam | Alternative to evaluate for limited milling jobs |

Kiri exposes browser APIs: https://docs.grid.space/kiri-moto/apis/ . Its browser
engine is the first candidate for keeping GitHub Pages and avoiding a paid service.
PrusaSlicer/FreeCAD require a desktop or server process in their usual native forms;
GitHub Pages cannot execute those native programs. Running a shop-owned machine is
possible but still requires availability, request isolation, maintenance and power.
Do not send customer geometry to public issue trackers or public CI artifacts.

## Automatic FDM flow to implement

1. Convert the already-parsed STEP mesh (or validated STL) to an STL buffer in mm.
2. Select an owner-configured printer + material profile, not a customer-entered guess.
3. Validate model dimensions against that printer's build volume and allowed profile.
4. Run the pinned open-source engine in a worker; generate walls, infill, supports and travel.
5. Read extrusion amount and predicted duration from the engine/export. Include profile ID/version and mesh hash internally.
6. Apply actual filament, machine, labour, failure, minimum-order and margin settings to the sliced result.
7. Display only the price range. On failure, unknown profile or unsupported geometry, request a reviewed quote rather than silently calling a volume formula a slicer result.

Required starting profile: actual printer model/build volume, nozzle, layer height,
wall count, acceleration/speed limits, filament, support strategy and orientation.
Validate against desktop slicing of the same files/profile plus real prints. Verify
that quantity, support-heavy parts, thin walls, travel and failed imports behave
correctly before enabling customer prices. Pin/version the engine and retain its
license notices. Shipping a library is not sufficient proof of price accuracy.

A slicer predicts machine work and material; it cannot know file repair, operator
setup, unloading, washing/curing, procurement, shipping or supplier minimum charges.
Those need separate measured business inputs. Resin/powder need their own build
packing, support, cure/powder and machine profiles, not FDM extrusion assumptions.

## Other manufacturing processes

- CNC: define stock, orientation/setups, clamps, tools and feasible operations before
  generating paths. A valid STEP file alone does not specify these. Limit initial
  automation to a known job family (for example simple 3-axis plates); escalate
  inaccessible features or unrecognised operations. Toolpath time does not establish
  collision-free manufacturing, five-axis feasibility, machine acceleration or setup labour.
- Laser/plasma/waterjet: validate planar contours/units, sheet thickness, cut length,
  pierce count, kerf, lead-ins, rapid moves and nesting. Use machine/material/thickness
  cut charts; include consumables, scrap and operator setup. The three processes do
  not share one universal speed or price-per-length formula.
- Wire EDM: conductive stock, thickness, contour area/length, taper, threading/start
  holes, rough/skim passes and machine technology tables.
- Sinker EDM: electrode design/manufacture, cavity removal, electrodes/wear, finish,
  orbital strategy and setup; no evaluated universal open-source quoting engine.

The new RFQ fields collect plate/workpiece thickness for cutting/wire EDM and
whether the sinker EDM electrode is supplied or must be manufactured. Listed EDM
materials exclude the nonconductive POM and printing polymers. Exact availability
and process suitability remain subject to supplier review.
