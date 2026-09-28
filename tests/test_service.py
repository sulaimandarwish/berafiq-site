import json # Read the response and illustrative server profile.
import os # Configure an isolated test port.
import subprocess # Start the actual local HTTP service for the integration check.
import sys # Reuse the active Python interpreter and installed CAD dependency.
import tempfile # Keep the generated STEP fixture out of the repository.
import unittest # Use the standard test runner.
import urllib.request # Call the actual local API.
import urllib.error # Inspect error status codes without failing prematurely.
from pathlib import Path # Resolve project and fixture paths.
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox # Generate a known non-customer solid.
from OCP.STEPControl import STEPControl_Writer, STEPControl_AsIs # Export the fixture as a real STEP file.

ROOT = Path(__file__).resolve().parents[1] # Locate the site repository.
sys.path.insert(0, str(ROOT/'estimator_service')) # Make the original engine importable for parity comparison.
from geometry import analyse_step # Compute reference measurements using the original engine.
from estimate import estimate # Compute reference price independently of the web adapter.

class ServiceTest(unittest.TestCase): # Check the adapter while keeping all traffic local.
    def test_http_estimate_and_rejections(self): # Verify a real STEP round trip plus important failure boundaries.
        env = {**os.environ, 'BERAFIQ_PORT':'8769', 'BERAFIQ_HOST':'127.0.0.1'} # Avoid exposing the test listener publicly.
        env['BERAFIQ_RATES_FILE'] = str(ROOT/'estimator_service/rates.example.json') # Ensure the test always uses public example rates.
        service = subprocess.Popen([sys.executable, str(ROOT/'estimator_service/server.py')], env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) # Start the actual API implementation.
        try: # Always stop the service after the assertions.
            self.assertIn(b'Local BeRafiq preview', service.stdout.readline()) # Wait for startup before sending requests.
            def request(path, data=None, headers=None): # Return both success and error responses for assertions.
                try: # Call only the local test service.
                    with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8769'+path, data=data, headers=headers or {}), timeout=50) as response: # Bound the test's network wait.
                        return response.status, response.read() # Return the completed response.
                except urllib.error.HTTPError as error: # Preserve HTTP failure status for expected rejections.
                    return error.code, error.read() # Return the rejected response without hiding it.
            with tempfile.TemporaryDirectory() as folder: # Clean up the synthetic STEP fixture afterwards.
                path = Path(folder)/'box.step' # Use a fixed private fixture path.
                writer = STEPControl_Writer() # Create the STEP exporter.
                writer.Transfer(BRepPrimAPI_MakeBox(80,50,12).Shape(), STEPControl_AsIs) # Export a simple rectangular solid.
                writer.Write(str(path)) # Write the STEP input used by both reference and API.
                profile = json.loads((ROOT/'estimator_service/rates.example.json').read_text()) # Read the same declared cost assumptions.
                reference = estimate(analyse_step(path), profile, 10) # Compute the expected quote using the original engine.
                body = path.read_bytes() # Read the exact STEP bytes for upload.
                headers = {'Content-Type':'application/octet-stream'} # Match the frontend upload protocol.
                endpoint = '/api/estimate?quantity=10&material=aluminium-6061&tolerance=standard' # Price a supported input.
                status, raw = request(endpoint, body, headers) # Run the real worker through HTTP.
                self.assertEqual(status, 200, raw) # Require a successful estimate.
                result = json.loads(raw) # Decode the customer-facing result.
                self.assertEqual(result['unit_price_sar'], round(reference['price_sar_unit'],2)) # Ensure the website uses the original pricing formula.
                self.assertTrue(result['demo']) # Never disguise example rates as calibrated prices.
                self.assertNotIn('margin_fraction', result) # Keep internal pricing settings out of client responses.
                self.assertEqual(request('/estimator_service/rates.example.json')[0],404) # Deny direct rate-file access through this server.
                self.assertEqual(request(endpoint.replace('quantity=10','quantity=0'), body, headers)[0],400) # Reject invalid quantities.
                self.assertEqual(request(endpoint.replace('aluminium-6061','steel'), body, headers)[0],400) # Reject unimplemented materials.
                self.assertEqual(request(endpoint, b'invalid', headers)[0],400) # Reject malformed file signatures.
                self.assertEqual(request(endpoint, body, {**headers,'Origin':'https://other.example'})[0],403) # Reject unconfigured browser origins.
        finally: # Release the local listener even after a failed assertion.
            service.terminate() # Ask the service process to stop.
            service.wait(timeout=5) # Reap the stopped process.
            service.stdout.close() # Release the captured startup output stream.

if __name__ == '__main__': # Permit direct execution as well as discovery.
    unittest.main() # Run the integration case.
