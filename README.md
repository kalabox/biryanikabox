# biryanikabox

A testing platform for Kalabox

### Some assumptions:

This framework assumes you are logged in as a sudouser with this constitution.

  u: kalabox
  p: kalabox

On Windows you need UAC turned off.

### Install build dependencies on Linux

```
curl -sL https://raw.githubusercontent.com/pirog/biryanikabox/master/scripts/build/build_deps_linux.sh | bash
```

### Install build dependencies on OSX

NOTE: Debian users will need to have sudo and curl installed.

```
curl -sL https://raw.githubusercontent.com/pirog/biryanikabox/master/scripts/build/build_deps_darwin.sh | bash
```

### Install build dependencies on Windows

Download these two files to the same directory

1. https://raw.githubusercontent.com/pirog/biryanikabox/master/scripts/build/build_deps_win32.bat
2. https://raw.githubusercontent.com/pirog/biryanikabox/master/scripts/build/build_deps_win32.ps1

```
cd /path/to/scripts
build_deps_win32.bat
```

You will also want to add the oracle cert. As an admin

```
certutil -addstore "TrustedPublisher" "C:\Users\kalabox\Desktop\oracle.cer"
```
