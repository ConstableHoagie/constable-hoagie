@echo off
title Put Constable Hoagie online (private)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\share_online.ps1" %*
