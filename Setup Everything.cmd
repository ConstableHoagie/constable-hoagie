@echo off
title Constable Hoagie - Setup Everything
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\setup_all.ps1" %*
