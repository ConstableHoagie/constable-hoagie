@echo off
title Constable Hoagie
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\hoagie.ps1" %*
