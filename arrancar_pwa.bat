@echo off
OCP enciende los motores del SGIPAS
color 0A
echo ===================================================
echo INICIANDO EL ENTORNO DE DESARROLLO SGIPAS
echo ===================================================
echo.
echo Levantando servidor local en el puerto 8000...
echo.

:: Ruta estandar de Chrome
set chromePath="C:\Program Files\Google\Chrome\Application\chrome.exe"

:: Abre Chrome en la dirección local
start "" %chromePath% http://localhost:8000

:: Ejecuta el servidor de Python
python -m http.server 8000