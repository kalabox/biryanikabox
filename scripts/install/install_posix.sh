#!/bin/bash

#
# A script to install kalabox on darwin and linux
#
# You need to run this script after you install the build dependencies via
# build_deps_linux.sh and before you run any tests
#

#
# Some assumptions:
#
#  This script assumes you are logged in as a sudouser with this constitution
#  u: kalabox
#  p: kalabox
#

# Source profile
. ~/.profile

# Set some things in the environment for us to use
SUDO_PASSWORD='kalabox'
DEFAULT_BRANCH='v0.10'

# Parse a branch|tag|hash argument for the core Kalabox project
# assume DEV_BRANCH if empty
if [ -z "$1" ]; then
  WORKING_BRANCH=$DEFAULT_BRANCH
else
  WORKING_BRANCH=$1
fi

# Checkout the kalabox project
cd $HOME
git clone https://github.com/kalabox/kalabox.git
cd kalabox
git checkout $WORKING_BRANCH

# Install the backends
echo "Intalling Kalabox from commit ${WORKING_BRANCH}..."
echo "With the following backends and apps..."
if [ -f $HOME/.kalabox/development.json ]; then
  cat $HOME/.kalabox/development.json
else
  cat $HOME/kalabox/development.json
fi
npm install

# Symlink the binary
if [ ! -f /usr/local/bin/kbox ]; then
echo "${SUDO_PASSWORD}" | \
  sudo -S ln -s $HOME/kalabox/bin/kbox.js /usr/local/bin/kbox
fi
