#!/bin/bash

# uninstall ted
launchctl unload /Users/ted/src/kalabox-ted/scripts/startup/ted.plist

# install ted
launchctl load /Users/ted/src/kalabox-ted/scripts/startup/ted.plist

# check to make sure ted is installed
launchctl list | grep ted-server
