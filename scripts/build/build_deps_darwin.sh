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
MAJOR_MAC_VERSION=$(sw_vers -productVersion | awk -F '.' '{print $1 "." $2}')
CLI_MOUNT="Command Line Developer Tools"

# Get the correct meta
if [ "${MAJOR_MAC_VERSION}" == "10.9" ]; then
  CLI_BASE_NAME=command_line_tools_for_os_x_mavericks_late_july_2014.dmg
  CLI_PACKAGE="Command Line Tools (OS X 10.9).pkg"
elif [ "${MAJOR_MAC_VERSION}" == "10.10" ]; then
  CLI_BASE_NAME=Command_Line_Tools_OS_X_10.10_for_Xcode_7.2.dmg
  CLI_PACKAGE="Command Line Tools (OS X 10.10).pkg"
elif [ "${MAJOR_MAC_VERSION}" == "10.11" ]; then
  CLI_BASE_NAME=Command_Line_Tools_OS_X_10.11_for_Xcode_7.2.dmg
  CLI_PACKAGE="Command Line Tools (OS X 10.10).pkg"
fi

# Make sure /usr/local/bin exists
echo "${SUDO_PASSWORD}" | \
  sudo -S mkdir -p /usr/local/bin

# Move to tmp and download needed packages
CLI_DOWNLOAD_URL=https://s3-us-west-1.amazonaws.com/kb-testing-assets/deps/${CLI_BASE_NAME}
cd /tmp
curl -LO https://nodejs.org/dist/v4.2.2/node-v4.2.2.pkg
curl -LO $CLI_DOWNLOAD_URL

# Mount the command line tools
hdiutil attach "/tmp/${CLI_BASE_NAME}"

# Install the CLI Package
echo "${SUDO_PASSWORD}" | \
  sudo -S installer -pkg "/Volumes/${CLI_MOUNT}/${CLI_PACKAGE}" -target /

# DISSSSSMOUNT
hdiutil detach "/Volumes/${CLI_MOUNT}"

# Install the node package
echo "${SUDO_PASSWORD}" | \
  sudo -S installer -pkg "/tmp/node-v4.2.2.pkg" -target /

# Install JXCORE
echo "${SUDO_PASSWORD}" | sudo -S true
curl http://jxcore.com/xil.sh | sudo bash

# Add our devmode ENV
echo "export KALABOX_DEV=true" > $HOME/.profile

