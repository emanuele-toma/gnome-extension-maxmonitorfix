# Maximized Window Monitor Fix

Fixes the bug where a window you move to your other monitor with the keyboard shortcut jumps back to the first monitor as soon as you click on something else. It is a GNOME Shell extension for Wayland, written for Ubuntu 26.04 (GNOME 50), where this started happening after upgrading.

Developed and tested on GNOME Shell 50.1 (Ubuntu 26.04), Wayland.

## Does this affect you?

You are probably in the right place if any of this sounds familiar:

- You press `Super+Shift+Left` or `Super+Shift+Right` (or your own shortcut for "Move window one monitor to the left/right") and the window moves to the other screen, but snaps back to the original screen when you click another window or switch focus.
- Windows go to the second monitor and then "teleport", "bounce back" or "return" to the first one.
- Moving a window with the keyboard works for a moment, then undoes itself. Dragging it with the mouse works fine.
- It worked on your previous Ubuntu release and started after you upgraded to Ubuntu 26.04 (GNOME 50).
- It happens on a dual monitor setup (laptop plus external monitor, or two external monitors) and with maximized windows in particular.

If that matches, this extension is the workaround. Install it, log out and back in, and use the same shortcut as before.

It is not for you if windows move on their own without you pressing any shortcut (for example after waking from sleep or unplugging a monitor). That is a different problem.

## The problem

You maximize a window and press the shortcut that moves it to the monitor on the left or right. It appears on the other screen, then jumps back when you click it or focus another window and return.

This is tracked upstream as [mutter#4494](https://gitlab.gnome.org/GNOME/mutter/-/issues/4494) and on Ubuntu as bug 2156820 (libmutter 50.1). A proposed fix, [merge request !4852](https://gitlab.gnome.org/GNOME/mutter/-/merge_requests/4852), was still open when this was written.

## Questions people ask

**Why does the window jump back after I click on something?**
It is a bug in Mutter, GNOME's window manager. According to the proposed upstream fix, a window moved without the application's involvement can keep a stale position, which is applied again on the next state change such as a focus change. See the upstream issue above.

**Is it only Ubuntu 26.04?**
It was reported on Ubuntu 26.04 with libmutter 50.1. It likely affects other distributions shipping Mutter 50.x on Wayland, but this was only tested on Ubuntu 26.04.

**Does it affect X11 sessions?**
The reports and this extension are about Wayland. X11 was not tested.

**Does it only happen with maximized windows?**
In my testing, yes. The upstream issue describes it as affecting windows in general, so non-maximized windows may be affected for you. The extension moves those with the normal GNOME move and does not change how they behave.

**Can I keep my own shortcut?**
Yes. The extension uses whatever shortcut you set for moving windows between monitors, including custom ones such as `Super+Shift+Page Down`.

**How do I turn it off?**
`gnome-extensions disable maxmonitorfix@emanuele-toma.github.io` restores your original shortcuts. See Recovery below if something goes wrong.

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
