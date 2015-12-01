#!/bin/bash

#
# A script to install kalabox
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

#
# @todo:
#
# We need a better way to pull down the correct version of kalabox
# and its backends and apps.
#
# For the main kalabox project I think we can just take an argument in
# this script with a branch|tag|hash to checkout.
#
# For the subprojects I think we want a kalabox.json override file
# in ~/.kalabox that has something like
#
# {
#   "devImages": true,
#   "services": "kalabox-services-kalabox@0.10.6",
#   "engine": "kalabox-engine-docker@https://github.com/kalabox/kalabox-engine-docker/tarball/v0.10",
#   "apps": [
#     'kalabox-app-pantheon@0.10.8'
#   ]
# }
#

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
echo "Intalling Kalabox from commit ${WORKING_BRANCH}..."
if [ -f $HOME/.kalabox/kalabox.json ]; then
  echo "With the following backends and apps..."
  cat $HOME/.kalabox/kalabox.json
else
  echo "With the stable backends and apps..."
fi
cd $HOME
git clone https://github.com/kalabox/kalabox.git
cd kalabox
git checkout $WORKING_BRANCH

# npm install
# @todo: do we want different variants of this a la npm install --production?
npm install

# Symlink the binary
if [ ! -f /usr/local/bin/kbox ]; then
echo "${SUDO_PASSWORD}" | \
  sudo -S ln -s $HOME/kalabox/bin/kbox.js /usr/local/bin/kbox
fi
