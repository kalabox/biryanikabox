@ECHO OFF
CLS

REM
REM A script to install the Kalabox build and dev dependencies on win32
REM
REM You need to run this script first aka right after you boot up a clean
REM machine
REM

REM
REM Some assumptions:
REM
REM  This script assumes you are logged in as a sudouser with this constitution
REM  u: kalabox
REM  p: kalabox
REM
REM It also assumed you have disabled UAC so we can run things non-interactively
REM

PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0build_deps_win32.ps1'";

PAUSE
