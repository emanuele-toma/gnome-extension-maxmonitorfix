import Gio from 'gi://Gio';
import system from 'system';

import {
    backupShortcuts,
    backedUpAccelerators,
    adoptNativeChange,
    restoreShortcuts,
    disableShortcuts,
} from '../maxmonitorfix@emanuele-toma.github.io/shortcutBackup.js';

const LEFT = 'move-to-monitor-left';
const RIGHT = 'move-to-monitor-right';
const KEYS = [LEFT, RIGHT];

const wm = new Gio.Settings({schema_id: 'org.gnome.desktop.wm.keybindings'});
const state = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.maxmonitorfix.state'});

let failures = 0;

function check(name, condition) {
    print(`${condition ? 'PASS' : 'FAIL'} ${name}`);
    if (!condition)
        failures++;
}

function cycle() {
    backupShortcuts(wm, state, KEYS);
    disableShortcuts(wm, KEYS);
}

function isBackupEmpty() {
    return Object.keys(state.get_value('saved-native').recursiveUnpack()).length === 0;
}

wm.set_strv(LEFT, ['<Shift><Super>Page_Up']);
wm.set_strv(RIGHT, ['<Shift><Super>Page_Down']);
cycle();
check('shortcuts are disabled after backup', wm.get_strv(LEFT).length === 0 && wm.get_strv(RIGHT).length === 0);
check('backed up accelerator is the user value', backedUpAccelerators(wm, state, RIGHT)[0] === '<Shift><Super>Page_Down');
restoreShortcuts(wm, state);
check('explicit values are restored', wm.get_strv(LEFT)[0] === '<Shift><Super>Page_Up' && wm.get_strv(RIGHT)[0] === '<Shift><Super>Page_Down');
check('backup is cleared after restore', isBackupEmpty());

wm.reset(LEFT);
wm.reset(RIGHT);
const defaultLeft = wm.get_strv(LEFT);
cycle();
check('default shortcut is backed up as the schema default', backedUpAccelerators(wm, state, LEFT).join() === defaultLeft.join());
restoreShortcuts(wm, state);
check('default shortcut is restored as default', wm.get_user_value(LEFT) === null && wm.get_strv(LEFT).join() === defaultLeft.join());

wm.set_strv(LEFT, []);
cycle();
restoreShortcuts(wm, state);
check('explicitly disabled shortcut stays disabled', wm.get_user_value(LEFT) !== null && wm.get_strv(LEFT).length === 0);

wm.set_strv(LEFT, ['<Super>a']);
cycle();
backupShortcuts(wm, state, KEYS);
restoreShortcuts(wm, state);
check('second backup does not overwrite the first', wm.get_strv(LEFT)[0] === '<Super>a');

restoreShortcuts(wm, state);
check('restore without a backup changes nothing', wm.get_strv(LEFT)[0] === '<Super>a');

wm.set_strv(RIGHT, ['<Shift><Super>Page_Down']);
cycle();
check('adopt ignores an empty native value', adoptNativeChange(wm, state, RIGHT) === false);
wm.set_strv(RIGHT, ['<Super>F5']);
check('adopt reports a new native value', adoptNativeChange(wm, state, RIGHT) === true);
check('adopt disables the native shortcut again', wm.get_strv(RIGHT).length === 0);
check('adopted accelerator is returned', backedUpAccelerators(wm, state, RIGHT)[0] === '<Super>F5');
check('adopt keeps the other key', backedUpAccelerators(wm, state, LEFT)[0] === '<Super>a');
restoreShortcuts(wm, state);
check('restore applies the adopted accelerator', wm.get_strv(RIGHT)[0] === '<Super>F5');

wm.set_strv(RIGHT, ['<Super>F5']);
cycle();
wm.reset(RIGHT);
check('adopt reports a reset to default', adoptNativeChange(wm, state, RIGHT) === true);
restoreShortcuts(wm, state);
check('a reset made while enabled is restored as default', wm.get_user_value(RIGHT) === null);

system.exit(failures);
