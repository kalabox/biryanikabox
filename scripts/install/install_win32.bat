@ECHO OFF
CLS

REM
REM A script to install the Kalabox on win32
REM
REM You need to run this script first aka right after you install the build
REM dependencies but before you run tests.
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

REM Some helpful things
SET DEFAULT_BRANCH=v0.10
SET OLDDIR=%~dp0
ECHO %OLDDIR%

REM Define the correct branch/commit/tag
REM and then get the codes
IF "%1"=="" (
  SET WORKING_BRANCH=%DEFAULT_BRANCH%
) ELSE (
  SET WORKING_BRANCH=%1
)
CD %USERPROFILE%
git clone https://github.com/kalabox/kalabox.git
CD kalabox
git checkout %WORKING_BRANCH%

REM Figure out what we are installing
ECHO "Intalling Kalabox from commit %WORKING_BRANCH%..."
ECHO "With the following backends and apps:"
IF EXIST "%USERPROFILE%\.kalabox\development.json" (
  TYPE %USERPROFILE%\.kalabox\development.json
) ELSE (
  TYPE %USERPROFILE%\kalabox\development.json
)
npm install

REM Get kbox working better
setx Path "%Path%;%USERPROFILE%\kalabox\bin"

CD %OLDDIR%

PAUSE
