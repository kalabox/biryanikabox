#!/bin/sh
#
# Basic script to start up a VM run a script against it and then
# stop the VM
#

# Make sure VMRUN is in the path
export PATH=$PATH:"/Applications/VMware Fusion.app/Contents/Library"

# Fill these out to do the stuff
VM=
VMUSER=
VMPASS=
OUTSCRIPT=
INSCRIPT=

# Start up the VM
echo "STARTING VM: vmrun -T fusion start \"${VM}\" gui"
vmrun -T fusion start "${VM}" gui

# Exec a script inside the VM
echo "COPYING SCRIPT TO VM: vmrun -gu $VMUSER -gp $VMPASS -T fusion CopyFileFromHostToGuest \"${VM}\" \"${OUTSCRIPT}\" \"${INSCRIPT}\""
vmrun -gu $VMUSER -gp $VMPASS -T fusion CopyFileFromHostToGuest "${VM}" "${OUTSCRIPT}" "${INSCRIPT}"
echo "RUNNING SCRIPT: vmrun -T fusion -gu $VMUSER -gp $VMPASS runScriptInGuest \"${VM}\" \"/bin/bash\" \"${INSCRIPT}\""
vmrun -gu $VMUSER -gp $VMPASS -T fusion runScriptInGuest "${VM}" "/bin/bash" "${INSCRIPT}"

# Shut down the VM
echo "RUNNING: vmrun -T fusion stop \"${VM}\" soft"
vmrun -T fusion stop "${VM}" soft
