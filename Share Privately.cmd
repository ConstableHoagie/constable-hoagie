@echo off
title Share Constable Hoagie privately
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\share.ps1" %*
