@echo off
title Publish a Constable Hoagie update
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\publish.ps1"
