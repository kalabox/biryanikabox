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

# Move to a tmp dir and download the git package
cd /tmp
curl -LO http://sourceforge.net/projects/git-osx-installer/files/git-2.6.2-intel-universal-mavericks.dmg

# Mount the git DMG
hdiutil attach git-2.6.2-intel-universal-mavericks.dmg

# Install the git package
echo "${SUDO_PASSWORD}" | \
  sudo -S installer -pkg "/Volumes/Git 2.6.2 Mavericks Intel Universal/git-2.6.2-intel-universal-mavericks.pkg" -target /

# Create alias to workaround xcode
echo "alias git=\"/usr/local/git/bin/git\"" > ~/.profile
source ~/.profile

# Move to tmp and download the node package
cd /tmp
curl -LO https://nodejs.org/dist/v4.2.2/node-v4.2.2.pkg

# Install the node package
echo "${SUDO_PASSWORD}" | \
  sudo -S installer -pkg "/tmp/node-v4.2.2.pkg" -target /

# Install JXCORE
echo "${SUDO_PASSWORD}" | sudo -S true
curl http://jxcore.com/xil.sh | sudo bash


