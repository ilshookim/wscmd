npm run build-all

mkdir release
cd release

cp ../wscmd-macos wscmd
zip wscmd-macos.zip wscmd
rm wscmd

cp ../wscmd-linux wscmd
zip wscmd-linux.zip wscmd
rm wscmd

cp ../wscmd-win.exe wscmd.exe
zip wscmd-win.zip wscmd.exe
rm wscmd.exe

ls -lh