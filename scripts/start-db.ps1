# Starts the local portable MariaDB for BoonHRM development (port 3307).
# Run this in its own terminal; leave it open while developing.
$bin  = "C:\Users\Advait\mariadb-portable\mariadb-12.3.2-winx64\bin"
$data = "C:\Users\Advait\mariadb-data"
& "$bin\mariadbd.exe" --no-defaults --datadir=$data --port=3307 --bind-address=127.0.0.1 --console
