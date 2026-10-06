import Meta from 'gi://Meta';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {
    backupShortcuts,
    backedUpAccelerators,
    adoptNativeChange,
    restoreShortcuts,
    disableShortcuts,
} from './shortcutBackup.js';
import {PendingMaximize} from './pendingMaximize.js';

const WM_SCHEMA = 'org.gnome.desktop.wm.keybindings';
const BINDINGS = [
    {
        native: 'move-to-monitor-left',
        own: 'maxmonitorfix-move-left',
        direction: Meta.DisplayDirection.LEFT,
    },
    {
        native: 'move-to-monitor-right',
        own: 'maxmonitorfix-move-right',
        direction: Meta.DisplayDirection.RIGHT,
    },
];
const REMAXIMIZE_FALLBACK_MS = 250;

export default class MaxMonitorFix extends Extension {
    enable() {
        this._wm = new Gio.Settings({schema_id: WM_SCHEMA});
        this._settings = this.getSettings();
        this._state = this.getSettings(`${this.metadata['settings-schema']}.state`);
        this._pending = new Map();
        backupShortcuts(this._wm, this._state, BINDINGS.map(binding => binding.native));
        this._registered = BINDINGS.filter(binding => this._register(binding));
        disableShortcuts(this._wm, this._registered.map(binding => binding.native));
        this._nativeHandlerIds = this._registered.map(binding =>
            this._wm.connect(`changed::${binding.native}`, () => this._onNativeChanged(binding)));
    }

    disable() {
        this._nativeHandlerIds?.forEach(id => this._wm.disconnect(id));
        this._registered?.forEach(binding => {
            Main.wm.removeKeybinding(binding.own);
            this._settings.reset(binding.own);
        });
        [...(this._pending?.values() ?? [])].forEach(pending => pending.flush());
        if (this._wm && this._state)
            restoreShortcuts(this._wm, this._state);
        this._nativeHandlerIds = null;
        this._registered = null;
        this._pending = null;
        this._state = null;
        this._settings = null;
        this._wm = null;
    }

    _register(binding) {
        this._mirror(binding);
        const action = Main.wm.addKeybinding(
            binding.own,
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => this._moveFocusedWindow(binding.direction));
        return action !== Meta.KeyBindingAction.NONE;
    }

    _mirror(binding) {
        this._settings.set_strv(
            binding.own,
            backedUpAccelerators(this._wm, this._state, binding.native));
    }

    _onNativeChanged(binding) {
        if (adoptNativeChange(this._wm, this._state, binding.native))
            this._mirror(binding);
    }

    _moveFocusedWindow(direction) {
        const display = global.display;
        const window = display.focus_window;
        if (!window || !window.allows_move() || this._pending.has(window))
            return;
        const target = display.get_monitor_neighbor_index(window.get_monitor(), direction);
        if (target < 0)
            return;
        if (this._isMaximized(window))
            this._moveMaximized(window, target);
        else
            window.move_to_monitor(target);
    }

    _isMaximized(window) {
        return window.maximized_horizontally &&
            window.maximized_vertically &&
            !window.is_fullscreen();
    }

    _moveMaximized(window, target) {
        window.unmaximize();
        window.move_to_monitor(target);
        const pending = new PendingMaximize(
            window,
            REMAXIMIZE_FALLBACK_MS,
            () => this._pending.delete(window));
        this._pending.set(window, pending);
    }
}
