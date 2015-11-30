#!/bin/bash

#
# A script to install the Kalabox build and dev dependencies on linux
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
#

# Set some things in the environment for us to use
SUDO_PASSWORD='kalabox'

#
# Gather information about the system and state
#
# Let's first try to get our system
if [ -f /etc/os-release ]; then
  source /etc/os-release
  : ${FLAVOR:=$ID_LIKE}
  : ${FLAVOR:=$ID}
# Some OS do not implement /etc/os-release yet so lets do this in case
# they dont
elif [ -f /etc/arch-release ]; then
  ID_LIKE="arch"
elif [ -f /etc/gentoo-release ]; then
  ID_LIKE="gentoo"
elif [ -f /etc/fedora-release ]; then
  ID_LIKE="fedora"
elif [ -f /etc/redhat-release ]; then
  ID_LIKE="redhat"
elif [ -f /etc/debian_version ]; then
  ID_LIKE="debian"
else
  ID_LIKE="whoknows"
fi

# Print flavor info
echo "Mmmmm this ${FLAVOR} flavor is so delcious~"

#
# Update our systems to the latest and greatest
#
if [ "${FLAVOR}" == "debian" ]; then

  echo "${SUDO_PASSWORD}" | \
    sudo -S apt-get -y update && \
    sudo -S apt-get -y upgrade

elif [ "${FLAVOR}" == "fedora" ]; then

  echo "${SUDO_PASSWORD}" | \
    sudo -S dnf -y check-update && \
    sudo -S dnf -y update

fi

#
# Install our build essentials like make, gcc and their ilk
#
if [ "${FLAVOR}" == "debian" ]; then

  echo "${SUDO_PASSWORD}" | \
    sudo -S apt-get -y --force-yes install build-essential

elif [ "${FLAVOR}" == "fedora" ]; then

  echo "${SUDO_PASSWORD}" | \
    sudo -S dnf -y install make automake gcc gcc-c++ kernel-devel

fi

#
# Grab some core packages like curl and git
#
if [ "${FLAVOR}" == "debian" ]; then

  echo "${SUDO_PASSWORD}" | \
    sudo -S apt-get -y --force-yes install git-core curl

elif [ "${FLAVOR}" == "fedora" ]; then

  echo "${SUDO_PASSWORD}" | \
    sudo -S dnf -y install git-core curl

fi

#
# Install STABLE NODEJS and JXCORE
#

# Node source script

# Install nodejs via package manager
if [ "${FLAVOR}" == "debian" ]; then

  echo "${SUDO_PASSWORD}" | sudo -S true
  curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
  echo "${SUDO_PASSWORD}" | sudo apt-get -y install nodejs

elif [ "${FLAVOR}" == "fedora" ]; then

  echo "${SUDO_PASSWORD}" | sudo -S true
  curl -sL https://rpm.nodesource.com/setup_4.x | sudo -E bash -
  echo "${SUDO_PASSWORD}" | sudo dnf -y install nodejs

fi

# Install JXcore via script
echo "${SUDO_PASSWORD}" | sudo -S true
curl http://jxcore.com/xil.sh | sudo bash
