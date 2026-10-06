# Maximized Window Monitor Fix

GNOME Shell extension that works around a Mutter bug on Wayland: a window moved to another monitor with the "Move window to monitor" shortcut jumps back to its original monitor as soon as focus changes. In practice this was seen on maximized windows.

Developed and tested on GNOME Shell 50.1 (Ubuntu 26.04), Wayland.

## The problem

You maximize a window and press the shortcut that moves it to the monitor on the left or right. It appears on the other screen, then jumps back when you click it or focus another window and return.

This is tracked upstream as [mutter#4494](https://gitlab.gnome.org/GNOME/mutter/-/issues/4494) and on Ubuntu as bug 2156820 (libmutter 50.1). A proposed fix, [merge request !4852](https://gitlab.gnome.org/GNOME/mutter/-/merge_requests/4852), was still open when this was written.

## How it works

The extension takes over GNOME's `move-to-monitor-left` and `move-to-monitor-right` shortcuts and registers its own, `maxmonitorfix-move-left` and `maxmonitorfix-move-right`, on the same key combinations. If registering one of them fails, that native shortcut is left untouched. For a maximized window it unmaximizes, moves it to the neighbor monitor and maximizes it again. Other windows get the normal move.

The original shortcut values are saved in the extension's internal state and restored exactly when the extension is disabled, including the case where a shortcut was still at its default.

## Shortcuts

The extension uses whatever is set for "Move window to monitor on the left/right" under Settings > Keyboard > Shortcuts > Windows. If you changed them, your choice is used.

While the extension is enabled, a shortcut you set there is picked up immediately. The Settings panel shows those two shortcuts as disabled in the meantime, because the extension holds the native ones. Disabling a shortcut through that panel while the extension is enabled is not supported.

## Recovery

While the extension is enabled, GNOME's two native shortcuts are emptied and the extension handles them. They are restored when the extension is disabled. If the extension is removed or stops loading while it was enabled (for example after a GNOME upgrade marks it out of date), restore them by hand:

```
gsettings reset org.gnome.desktop.wm.keybindings move-to-monitor-left
gsettings reset org.gnome.desktop.wm.keybindings move-to-monitor-right
```

If you had set custom shortcuts, set them again under Settings > Keyboard > Shortcuts > Windows.

## Install from source

```
git clone https://github.com/emanuele-toma/gnome-extension-maxmonitorfix
cd gnome-extension-maxmonitorfix
gnome-extensions pack maxmonitorfix@emanuele-toma.github.io \
    --extra-source=shortcutBackup.js --extra-source=pendingMaximize.js --force
gnome-extensions install maxmonitorfix@emanuele-toma.github.io.shell-extension.zip --force
```

Log out and back in, then run `gnome-extensions enable maxmonitorfix@emanuele-toma.github.io`.

## Tests

`tests/run.sh` runs the shortcut backup logic and the pending re-maximize logic (with a fake window object) against an in-memory settings backend, so it does not touch your real settings. It needs `gjs` and `glib-compile-schemas`. The code that talks to the running shell (`extension.js`) is not covered by the tests.

## Limitations

- The target is the neighbor monitor in the pressed direction. If no monitor sits in that direction, nothing happens.
- Only maximized, non-fullscreen windows get the unmaximize and re-maximize treatment. Other windows get the normal move, and tiled windows are untested.
- Only GNOME Shell 50 is listed as supported. Newer releases need the version added to `metadata.json` after testing.
- The re-maximize step waits for the window to report its new size. If that never happens, a 250 ms fallback re-maximizes it anyway.
- The window handling has only been tried on one machine.

## When to remove it

Disable the extension once your Mutter release contains a fix for mutter#4494.

## License

GPL-2.0-or-later
