"""STEP geometry measurements. No toolpath or collision verification."""
import math  # Use mathematical operations and finite-number checks.
from collections import Counter  # Count surfaces by their geometric type.
from OCP.STEPControl import STEPControl_Reader  # Import the native STEP file reader.
from OCP.IFSelect import IFSelect_RetDone  # Import the successful-read status constant.
from OCP.TopAbs import TopAbs_SOLID, TopAbs_FACE  # Identify solid bodies and faces during traversal.
from OCP.TopExp import TopExp_Explorer  # Walk the topological entities in the imported model.
from OCP.TopoDS import TopoDS  # Convert generic topology objects to specific face objects.
from OCP.BRepCheck import BRepCheck_Analyzer  # Check whether the imported solid has valid topology.
from OCP.BRepGProp import BRepGProp  # Calculate exact boundary-representation volume and area.
from OCP.GProp import GProp_GProps  # Hold calculated volume or area properties.
from OCP.Bnd import Bnd_OBB  # Represent an oriented bounding box.
from OCP.BRepBndLib import BRepBndLib  # Calculate the bounding box of a solid.
from OCP.BRepAdaptor import BRepAdaptor_Surface  # Read the analytic geometry underlying each face.
from OCP.GeomAbs import GeomAbs_Plane, GeomAbs_Cylinder  # Identify planar and cylindrical surface types.


def vector(v):  # Convert an Open Cascade vector to plain Python numbers.
    return [v.X(), v.Y(), v.Z()]  # Return the three direction or position components.


def parallel(a, b):  # Test whether two unit axes are parallel in either sense.
    return abs(sum(x*y for x, y in zip(a, b))) > math.cos(math.radians(2))  # Allow two degrees of angular difference; sign does not matter.


def analyse_step(path):  # Read one STEP solid and return measurements and route hints.
    reader = STEPControl_Reader()  # Create a fresh importer for this file.
    if reader.ReadFile(str(path)) != IFSelect_RetDone:  # Stop if the native reader cannot parse the file.
        raise ValueError('The file could not be read as STEP.')  # Report an invalid or unreadable file.
    # STEP unit conversion: measurements below are millimetres.
    reader.SetSystemLengthUnit(1.0)  # Request a millimetre-based output model after reading file units.
    if reader.TransferRoots() < 1:  # Translate STEP entities into geometry and require at least one root.
        raise ValueError('No STEP geometry could be transferred.')  # Report a file with no usable transferred model.
    shape = reader.OneShape()  # Combine transferred roots into the top-level shape.
    solids = []  # Collect all solid bodies so assemblies can be rejected.
    e = TopExp_Explorer(shape, TopAbs_SOLID)  # Start traversal of solid bodies.
    while e.More():  # Continue until every entity in this traversal has been visited.
        solids.append(e.Current())  # Save this solid body.
        e.Next()  # Advance to the next topology entity.
    if len(solids) != 1:  # Require exactly one part for the starter estimator.
        raise ValueError(f'Only one solid part is supported; found {len(solids)}. Export one part, not an assembly.')  # Explain how to export a supported input.
    solid = solids[0]  # Use the single accepted solid.
    if not BRepCheck_Analyzer(solid).IsValid():  # Check topological validity before measuring.
        raise ValueError('Invalid solid. Repair or re-export the STEP model.')  # Decline invalid geometry rather than pricing corrupted measurements.
    vp, ap = GProp_GProps(), GProp_GProps()  # Allocate separate property objects for volume and surface area.
    BRepGProp.VolumeProperties_s(solid, vp)  # Integrate the solid volume in cubic millimetres.
    BRepGProp.SurfaceProperties_s(solid, ap)  # Integrate the surface area in square millimetres.
    volume = abs(vp.Mass())  # For unit-density volume properties, Mass is the measured volume.
    if volume <= 1e-9:  # Reject essentially zero-volume geometry.
        raise ValueError('Solid has no measurable volume.')  # Explain why no estimate is possible.
    box = Bnd_OBB()  # Create an empty oriented bounding box.
    BRepBndLib.AddOBB_s(solid, box, False, True, False)  # Compute a geometric OBB with optimisation; no extra shape-tolerance padding.
    dims = [2*box.XHSize(), 2*box.YHSize(), 2*box.ZHSize()]  # Convert the box half-lengths into full part dimensions.
    axes = [vector(box.XDirection()), vector(box.YDirection()), vector(box.ZDirection())]  # Retain the box directions as the reference machining frame.
    counts, directions, cylinders, plane_axes = Counter(), [], [], []  # Initialise surface counts, cylinder axes, cylinders and plane normals.
    e = TopExp_Explorer(solid, TopAbs_FACE)  # Start a separate traversal over faces.
    while e.More():  # Continue until every entity in this traversal has been visited.
        face = TopoDS.Face_s(e.Current())  # Cast the current topology object to a face.
        surf = BRepAdaptor_Surface(face)  # Expose its underlying analytic surface.
        kind = surf.GetType()  # Read whether the surface is planar, cylindrical or another type.
        if kind == GeomAbs_Plane:  # Handle planar surfaces.
            counts['planar'] += 1  # Increment the planar-face count.
            normal = vector(surf.Plane().Axis().Direction())  # Read the supporting plane normal, ignoring face-orientation sign.
            plane_axes.append(normal)  # Save this normal for the simple turning test.
        elif kind == GeomAbs_Cylinder:  # Handle cylindrical surfaces without assuming they are holes.
            counts['cylindrical'] += 1  # Increment the cylindrical-face count.
            cylinder = surf.Cylinder()  # Read the cylinder parameters.
            axis = vector(cylinder.Axis().Direction())  # Read the cylinder axis direction.
            cylinders.append({'axis': axis, 'origin': vector(cylinder.Location()),  # Store axis location to distinguish parallel from coaxial cylinders.
                              'radius_mm': cylinder.Radius()})  # Store the cylinder radius in millimetres.
            if not any(parallel(axis, d) for d in directions):  # Create a new direction group only if no existing group matches.
                directions.append(axis)  # Save a representative axis for this group.
        else:  # Handle the remaining case.
            counts['other'] += 1  # Count all remaining surface types as outside the starter model.
        e.Next()  # Advance to the next topology entity.
    # A deliberately narrow turning candidate rule: coaxial cylinders,
    # with every planar face perpendicular to their shared axis.
    turning = bool(cylinders) and not counts['other']  # Consider turning only for models containing cylinders and planes exclusively.
    if turning:  # Apply additional rotational-geometry checks.
        first = cylinders[0]  # Choose a reference cylindrical axis.
        for c in cylinders:  # Compare every cylinder to the reference.
            offset = [x-y for x, y in zip(c['origin'], first['origin'])]  # Measure separation of cylinder axis origins.
            along = sum(x*y for x, y in zip(offset, first['axis']))  # Project the separation along the reference axis.
            radial2 = max(0, sum(x*x for x in offset)-along*along)  # Calculate squared perpendicular separation, clamped against rounding error.
            turning &= parallel(c['axis'], first['axis']) and radial2 < 1e-6  # Require coaxial cylinders to within 0.001 mm.
        turning &= all(parallel(n, first['axis']) for n in plane_axes)  # Require planar faces to be perpendicular to the turning axis.
    oblique = any(not any(parallel(d, a) for a in axes) for d in directions)  # Detect cylinder directions not aligned with the bounding-box axes.
    reasons = []  # Collect reasons to decline the milling price model.
    if turning:  # Apply additional rotational-geometry checks.
        machine = 'Turning candidate — turning time model not implemented'  # Report turning without inventing a turning-time calculation.
        reasons.append('Rotational geometry: no milling price issued.')  # Prevent applying a milling price to this turning candidate.
    elif counts['other']:  # Decline advanced or unrecognised surfaces.
        machine = 'Unclassified — advanced surface analysis needed'  # Avoid inferring a five-axis requirement from surface type alone.
        reasons.append('Non-planar/non-cylindrical surfaces exceed this starter model.')  # Record why the price is unavailable.
    elif oblique:  # Decline angled cylinder features requiring a more detailed route.
        machine = 'Angled machining candidate — fixture or indexed route needed'  # Report alternatives rather than asserting a specific axis count.
        reasons.append('Oblique cylinder directions: indexed/fixture costs are not implemented.')  # Prevent unimplemented setup routes from receiving a price.
    else:  # Handle the remaining case.
        machine = '3-axis milling candidate — accessibility NOT verified'  # Identify only a preliminary milling candidate.
    setups = max(2, 2*len(directions))  # Use an explicit crude allowance; this is not a geometry-proven setup count.
    return {  # Build a plain dictionary that can be exported as JSON.
        'units': 'mm', 'dimensions_mm': dims, 'volume_mm3': volume,  # Return the measurement units, bounding dimensions and solid volume.
        'surface_area_mm2': ap.Mass(), 'face_counts': dict(counts),  # Return integrated area and recognised surface-type counts.
        'cylinder_axis_groups': len(directions), 'machine_candidate': machine,  # Return orientation-group count and provisional process label.
        'assumed_setups': setups,  # Expose the assumed number of setups.
        'setup_rule': 'Assume two setups, or two per distinct cylinder-axis group; NOT a computed minimum.',  # Make the setup heuristic transparent to the user.
        'estimate_allowed': not reasons, 'unsupported_reasons': reasons,  # Allow a rough milling estimate only when no implemented rejection applies.
        'limitations': [  # Include limits with every geometry result.
            'Cylindrical faces are not counted as holes: they can also be bosses or fillets.',  # Explain why no drilled-hole count is reported.
            'No tool/holder/fixture collision or accessibility verification.',  # State that the route is not proved manufacturable.
            'Stock uses a computed oriented bounding box plus allowance; stock availability is not checked.',  # Explain how the raw-stock estimate is constructed.
            'Tolerances, threads, thin walls, undercuts and deep features are not comprehensively detected.',  # List geometry and specification gaps.
            'Time model is volume/surface based; no CAM toolpaths or pocket recognition.',  # Describe the implemented model honestly.
        ]  # Close the limitations list.
    }  # Finish this result dictionary.
