# gnome-sunrise-indicator
## Testing
Shell extensions are only reloaded when the whole shell is reloaded. So, for development purposes, it's best to start a nested instance of GNOME Shell, which you can easily stop and start:
* In one terminal, run `Xephyr :1 -screen 800x600`.
* In another, run `DISPLAY=:1 dbus-run-session -- gnome-shell --x11`.

(make sure to install the extension first!)