"""Local integration server; use a managed reverse proxy and isolation before public deployment."""
import json # Encode API responses and read server-owned configuration.
import os # Read the optional deployment configuration.
import subprocess # Isolate native STEP analysis from the web server.
import sys # Use the same Python interpreter for each worker.
import tempfile # Delete uploaded STEP files after each request completes.
import threading # Limit simultaneous CAD jobs.
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer # Serve the existing site and a small local API.
from pathlib import Path # Locate the website and estimator files.
from urllib.parse import urlparse, parse_qs # Parse the endpoint and bounded order settings.

HERE = Path(__file__).resolve().parent # Locate the estimator service code.
ROOT = HERE.parent # Locate the existing site files.
PROFILE = Path(os.environ.get('BERAFIQ_RATES_FILE', HERE / 'rates.example.json')).resolve() # Keep actual rates outside public static files.
HOST = os.environ.get('BERAFIQ_HOST', '127.0.0.1') # Default to local access only.
PORT = int(os.environ.get('BERAFIQ_PORT', '8000')) # Choose a configurable local port.
ORIGINS = {f'http://localhost:{PORT}', f'http://127.0.0.1:{PORT}'} | set(filter(None, os.environ.get('BERAFIQ_ALLOWED_ORIGINS', '').split(','))) # Allow only explicitly configured browser origins.
SLOTS = threading.BoundedSemaphore(2) # Permit at most two CAD child processes at once.
PUBLIC = {'index.html','styles.css','app.js','content.js','config.js','journey.js','journey.css','estimator.js','estimator.css','estimator-config.js'} # Explicitly exclude Python and rate files from local static serving.

class Handler(SimpleHTTPRequestHandler): # Add the estimator endpoint to the static preview server.
    def __init__(self, *args, **kwargs): # Fix the static root independently of the current directory.
        super().__init__(*args, directory=str(ROOT), **kwargs) # Delegate normal HTTP handling to Python.

    def end_headers(self): # Add headers consistently to static and API responses.
        origin = self.headers.get('Origin', '') # Inspect the requesting website origin.
        if origin in ORIGINS: # Do not grant arbitrary sites browser access to this API.
            self.send_header('Access-Control-Allow-Origin', origin) # Permit the configured frontend origin.
            self.send_header('Vary', 'Origin') # Prevent incorrect reuse of an origin-specific response.
        self.send_header('X-Content-Type-Options', 'nosniff') # Require the declared response content type.
        super().end_headers() # Finish the HTTP headers.

    def send_json(self, status, value): # Send a bounded JSON result without exposing files.
        body = json.dumps(value).encode() # Convert the result to UTF-8 bytes.
        self.send_response(status) # Set the success or failure HTTP code.
        self.send_header('Content-Type', 'application/json') # Identify the payload as JSON.
        self.send_header('Content-Length', str(len(body))) # Supply an exact response length.
        self.send_header('Cache-Control', 'no-store') # Do not cache customer estimate responses in shared HTTP caches.
        self.end_headers() # Apply CORS and finish headers.
        self.wfile.write(body) # Send the body to the requester.

    def do_GET(self): # Serve only the allowlisted static website assets.
        name = urlparse(self.path).path.lstrip('/') or 'index.html' # Resolve the requested public path.
        if name not in PUBLIC: # Deny traversal, directory listings and source/rate downloads.
            self.send_error(404) # Do not reveal whether a private path exists.
            return # End this request.
        super().do_GET() # Serve the approved static asset.

    def do_HEAD(self): # Apply the same static allowlist to HEAD requests.
        name = urlparse(self.path).path.lstrip('/') or 'index.html' # Resolve the requested path.
        if name not in PUBLIC: # Deny private assets and arbitrary directories.
            self.send_error(404) # Return the same absence response as GET.
            return # End the request.
        super().do_HEAD() # Send headers for approved static files only.

    def do_OPTIONS(self): # Answer cross-origin preflight for a deployed frontend.
        if self.headers.get('Origin') not in ORIGINS or urlparse(self.path).path != '/api/estimate': # Limit preflight to the intended endpoint and origins.
            self.send_error(403) # Reject unapproved origins.
            return # End the request.
        self.send_response(204) # Indicate that the permitted preflight has no body.
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS') # Advertise the estimate method.
        self.send_header('Access-Control-Allow-Headers', 'Content-Type') # Permit the binary upload content type.
        self.end_headers() # Add the allowed-origin header.

    def do_POST(self): # Accept a single raw STEP upload with supported order settings.
        parsed = urlparse(self.path) # Separate endpoint path from query settings.
        if parsed.path != '/api/estimate': # Reject unrelated POSTs without forwarding emails.
            self.send_json(404, {'message':'Unknown endpoint.'}) # Return a structured missing-endpoint response.
            return # End the request.
        if self.headers.get('Origin') and self.headers['Origin'] not in ORIGINS: # Enforce the origin allowlist for browser requests.
            self.send_json(403, {'message':'This website origin is not enabled.'}) # Explain the blocked integration.
            return # End the request.
        try: # Validate all simple inputs before invoking the native parser.
            query = parse_qs(parsed.query) # Decode the requested settings.
            quantity = int(query.get('quantity', [''])[0]) # Require an integer batch size.
            size = int(self.headers.get('Content-Length', '0')) # Bound the incoming raw file size.
            if not 1 <= quantity <= 10000 or not 0 < size <= 10*1024*1024: # Apply quantity and upload-size limits.
                raise ValueError('Use quantity 1–10,000 and a STEP file up to 10 MB.') # Provide a actionable input error.
            if query.get('material') != ['aluminium-6061'] or query.get('tolerance') != ['standard']: # Do not accept arbitrary material profiles or unsupported tolerances.
                raise ValueError('Only aluminium 6061 with standard requirements is supported.') # Decline unsupported requirements explicitly.
            if self.headers.get_content_type() != 'application/octet-stream': # Require a raw binary STEP upload.
                raise ValueError('Send the STEP file as application/octet-stream.') # Explain the expected request format.
        except ValueError as exc: # Return validation errors before processing.
            self.send_json(400, {'message':str(exc)}) # Send the reason in JSON.
            return # End the request.
        if not SLOTS.acquire(blocking=False): # Avoid an unbounded queue of heavy geometry jobs.
            self.send_json(429, {'message':'The estimate service is busy. Please try again shortly.'}) # Let the customer retry later.
            return # End the request without reading a large body.
        try: # Always release the worker slot even after timeout or parse failure.
            self.connection.settimeout(15) # Bound the upload read time.
            body = self.rfile.read(size) # Read no more than the validated content length.
            if len(body) != size or b'ISO-10303-21' not in body[:4096].upper(): # Check completeness and STEP text signature.
                self.send_json(400, {'message':'The upload is not a supported STEP file.'}) # Reject malformed input early.
                return # Skip the CAD worker.
            with tempfile.TemporaryDirectory(prefix='berafiq-') as folder: # Ensure customer files are deleted after each job.
                path = Path(folder) / 'part.step' # Avoid using an untrusted filename on disk.
                path.write_bytes(body) # Write the private temporary STEP input.
                job = subprocess.run([sys.executable, str(HERE/'worker.py'), str(path), str(PROFILE), str(quantity)], capture_output=True, text=True, timeout=45) # Bound native processing in a separate process.
                lines = [line for line in job.stdout.splitlines() if line.startswith('BERAFIQ_RESULT=')] # Ignore native diagnostic chatter.
                if job.returncode or not lines: # Detect process crashes without exposing internal logs.
                    self.send_json(422, {'message':'Unable to analyse this part. Please request a manufacturing quote.'}) # Keep ordinary RFQ as the fallback.
                    return # Do not return an invented price.
                value = json.loads(lines[-1].split('=', 1)[1]) # Parse only the prefixed structured output.
                if 'error' in value: # Distinguish unsupported geometry from a valid estimate.
                    self.send_json(422, {'message':value['error']}) # Report the controlled rejection.
                else: # A valid estimate is available.
                    self.send_json(200, value) # Return only the public field whitelist.
        except subprocess.TimeoutExpired: # Handle unusually expensive CAD files.
            self.send_json(504, {'message':'Analysis exceeded the time limit. Please request a quote.'}) # Explain the timeout without promising a number.
        except Exception: # Handle unexpected upload or worker failures.
            self.send_json(503, {'message':'The estimate service could not complete this request.'}) # Do not leak server details.
        finally: # Release scarce worker capacity in every outcome.
            SLOTS.release() # Allow the next estimate to run.

if __name__ == '__main__': # Start only when explicitly launched.
    rates = json.loads(PROFILE.read_text()) # Confirm the rate file is readable before serving.
    if HOST not in ('127.0.0.1', 'localhost') and not rates.get('rates_validated', False): # Prevent exposing default demo rates through a non-local bind.
        raise SystemExit('Set a reviewed external BERAFIQ_RATES_FILE with rates_validated=true before non-local use.') # Require deliberate rate review before deployment.
    print(f'Local BeRafiq preview: http://{HOST}:{PORT} — Ctrl+C to stop', flush=True) # Give the user the preview address.
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever() # Run the local website and estimate API together.
