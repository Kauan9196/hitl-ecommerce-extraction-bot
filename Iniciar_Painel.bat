@echo off
echo Starting Offer Integration Hub...
echo.
echo ========================================================
echo Keep this terminal window open while using the panel!
echo The panel will run on a local port for API testing.
echo ========================================================
echo.
start http://localhost:8000
python -m http.server 8000
