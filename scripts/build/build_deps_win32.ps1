#!/
#
# MCFLY YOU BOJO! YOU KNOW HOVERBOARDS DON'T FLOAT ON WATER!
# UNLESS YOU'VE GOT POWER!!!!.... shell
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
#
# It also assumed you have disabled UAC so we can run things non-interactively
#

# Get some ENV things
$temp_dir = $env:TMP

# Set metadatas
$git_url = "https://github.com/git-for-windows/git/releases/download/v2.6.3.windows.1/Git-2.6.3-64-bit.exe"
$git_dest = "$temp_dir\git-installer.exe"
$git_bin = "C:\Program Files\Git\bin"
$git_bin_alt = "C:\Users\kalabox\AppData\Local\Programs\Git\bin"

$node_url = "https://nodejs.org/dist/v4.2.2/node-v4.2.2-x86.msi"
$node_dest = "$temp_dir\node-installer.msi"

$jx_url = "https://jxcore.s3.amazonaws.com/0307/jx_winsetup.zip"
$jx_dest = "$temp_dir\jx_winsetup.zip"
$jx_installer = "$temp_dir\jx_winsetup\JXcore_setup.exe"

# Unzip helper
function Unzip($file, $destination)
{
  Write-Output "Unzipping $file to $destination..."
  $shell = new-object -com shell.application
  if (!(Test-Path "$file"))
  {
      throw "$file does not exist"
  }
  New-Item -ItemType Directory -Force -Path $destination -WarningAction SilentlyContinue
  $shell.namespace($destination).copyhere($shell.namespace("$file").items())
  Write-Output "Unzip complete."
}

# Download helper
function Download($url, $destination)
{
  $webclient = New-Object System.Net.WebClient
  Write-Output "Downloading $url to $destination..."
  $webclient.DownloadFile($url, $destination)
  Write-Output "Downloaded."
}

# Install helper
function InstallExe($file)
{
  Write-Output "Installing $file..."
  #Start-Process -Wait $file $arguments
  $arguments = '/SP /SILENT /VERYSILENT /SUPRESSMSGBOXES /NOCANCEL /NOREBOOT /NORESTART /CLOSEAPPLICATIONS'
  Start-Process -Wait $file $arguments
  Write-Output "Installed with $file"
}

# Install helper
function InstallMsi($file)
{
  Write-Output "Installing $file..."
  #Start-Process -Wait $file $arguments
  Start-Process -FilePath "$env:systemroot\system32\msiexec.exe" -ArgumentList "/i `"$file`" /qn /passive" -Wait
  Write-Output "Installed with $file"
}

# Install helper
function UpdatePath($location)
{
  if ((Test-Path "$location"))
  {
    Write-Output "Adding git to our PATH..."
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";" + $location, [EnvironmentVariableTarget]::User)
    Write-Output "Added."
  }
}

# Download The things we need
Write-Output "Grabbing the files we need..."
Download -Url $git_url -Destination $git_dest
Download -Url $node_url -Destination $node_dest
Download -Url $jx_url -Destination $jx_dest

# Do some needed unpacking
Write-Output "Unpacking..."
Unzip -File $jx_dest -Destination $temp_dir

# Do all the Installing
Write-Output "Installing packages..."
InstallExe -File $git_dest
InstallMsi -File $node_dest
InstallExe -File $jx_installer

# Add git to our cmd Path
UpdatePath -Location $git_bin
UpdatePath -Location $git_bin_alt

# Get Kalabox into DEV mode
Write-Output "Setting Kalabox to dev mode"
[Environment]::SetEnvironmentVariable("KALABOX_DEV", "true", [EnvironmentVariableTarget]::User)

# All Done!
Write-Output "Installation of dependencies complete!"
