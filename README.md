# gnome-sunrise-indicator
## Testing
In one terminal, `Xephyr :1 -screen 800x600`.
In the other, `DISPLAY=:1 dbus-run-session -- gnome-shell --x11`.