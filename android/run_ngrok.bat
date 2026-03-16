@echo off
set "NGROK_URL=birdless-unalarming-delpha.ngrok-free.dev"
set "PORT=80"
set "TOKEN=3B0ioILh8EyOn9jpjeQTKUphOck_4NmwVNHMngo8DfRtU3x7k"

echo Adding Ngrok authtoken...
ngrok config add-authtoken %TOKEN%

if %errorlevel%==0 (
    echo Authtoken added successfully!
) else (
    echo Failed to add authtoken. Please check your token or Ngrok installation.
    pause
    exit /b
)

echo Starting Ngrok tunnel...
ngrok http --url=%NGROK_URL% %PORT%

pause