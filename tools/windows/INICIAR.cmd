@echo off
rem Windows no ejecuta un .ps1 con doble clic y la directiva de ejecucion lo
rem bloquea. Este lanzador existe solo para eso: el trabajo esta en el .ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INICIAR.ps1"
