@echo off
rem Work from the repository folder, even when launched by double-click.
cd /d "%~dp0"
rem Create a private Python 3.12 environment only if one does not exist.
if not exist .estimate-venv\Scripts\python.exe py -3.12 -m venv .estimate-venv
if errorlevel 1 goto fail
rem Install the free CAD dependency for the local service.
.estimate-venv\Scripts\python.exe -m pip install -r estimator_service\requirements.txt
if errorlevel 1 goto fail
rem Serve this exact website and the estimate API together on localhost:8000.
.estimate-venv\Scripts\python.exe estimator_service\server.py
goto end
:fail
echo Install 64-bit Python 3.12 and check your internet connection, then try again.
pause
:end
