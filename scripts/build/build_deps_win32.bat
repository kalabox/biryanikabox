@ECHO OFF
CLS

REM
REM A script to install the Kalabox build and dev dependencies on win32
REM
REM You need to run this script first aka right after you boot up a clean
REM machine
REM

PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0build_deps_win32.ps1'";

PAUSE
