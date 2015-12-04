#!/bin/bash

#
# A script to install the Kalabox build and dev dependencies on darwin
#
# You need to run this script first aka right after you boot up a clean
# machine
#

#
# Some assumptions:
#
#  This script assumes you are logged in as a sudouser with this constitution
#  u: kalabox
#  p: kalabox

# Set some things in the environment for us to use
SUDO_PASSWORD="kalabox"

# Get TCUTIL to help us manage accessability things
cd /tmp
curl -O https://raw.githubusercontent.com/kalabox/tccutil/master/tccutil.py
echo "${SUDO_PASSWORD}" | sudo -S \
  mkdir -p /usr/local/bin
echo "${SUDO_PASSWORD}" | sudo -S \
  mv tccutil.py /usr/local/bin/tccutil.py
echo "${SUDO_PASSWORD}" | sudo -S \
  chmod +x /usr/local/bin/tccutil.py

# White list the needed apps
echo "${SUDO_PASSWORD}" | sudo -S \
  tccutil.py --insert /usr/bin/osascript
echo "${SUDO_PASSWORD}" | sudo -S \
  tccutil.py --insert com.apple.Terminal
echo "${SUDO_PASSWORD}" | sudo -S \
  tccutil.py --enable com.apple.Terminal

# Install the command line tools
xcode-select --install
sleep 5
osascript <<EOD
  tell application "System Events"
    tell process "Install Command Line Developer Tools"
      keystroke return
      click button "Agree" of window "License Agreement"
    end tell
  end tell
EOD

# Wait until we have installed command line tools
osascript <<EOD
  tell application "Finder"
    repeat
      if exists "/Library/Developer/CommandLineTools/usr/bin/git" as POSIX file then
        exit repeat
      else
        delay 0.5
      end if
    end repeat
  end tell
EOD

# Small delay to wait for below window to show up
sleep 10

# Close out the command tools install
osascript <<EOD
  tell application "System Events"
    tell process "Install Command Line Developer Tools"
      click button "Done" of window 1
    end tell
  end tell
EOD

# Move to tmp and download the node package
cd /tmp
curl -LO https://nodejs.org/dist/v4.2.2/node-v4.2.2.pkg

# Install the node package
echo "${SUDO_PASSWORD}" | \
  sudo -S installer -pkg "/tmp/node-v4.2.2.pkg" -target /

# Install JXCORE
echo "${SUDO_PASSWORD}" | sudo -S true
curl http://jxcore.com/xil.sh | sudo bash

# Add our devmode ENV
echo "export KALABOX_DEV=true" > ~/.profile
source ~/.profile
