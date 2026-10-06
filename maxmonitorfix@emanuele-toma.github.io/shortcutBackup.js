import GLib from 'gi://GLib';

const SAVED_KEY = 'saved-native';

function readBackup(state) {
    return state.get_value(SAVED_KEY).recursiveUnpack();
}

function writeBackup(state, backup) {
    state.set_value(SAVED_KEY, new GLib.Variant('a{smas}', backup));
}

function userAccelerators(wm, key) {
    const userValue = wm.get_user_value(key);
    return userValue ? userValue.deepUnpack() : null;
}

export function backupShortcuts(wm, state, keys) {
    if (Object.keys(readBackup(state)).length > 0)
        return;
    const backup = {};
    keys.forEach(key => {
        backup[key] = userAccelerators(wm, key);
    });
    writeBackup(state, backup);
}

export function backedUpAccelerators(wm, state, key) {
    return readBackup(state)[key] ?? wm.get_default_value(key).deepUnpack();
}

export function adoptNativeChange(wm, state, key) {
    if (wm.get_strv(key).length === 0)
        return false;
    writeBackup(state, {...readBackup(state), [key]: userAccelerators(wm, key)});
    wm.set_strv(key, []);
    return true;
}

export function restoreShortcuts(wm, state) {
    Object.entries(readBackup(state)).forEach(([key, accelerators]) => {
        if (accelerators === null)
            wm.reset(key);
        else
            wm.set_strv(key, accelerators);
    });
    state.reset(SAVED_KEY);
}

export function disableShortcuts(wm, keys) {
    keys.forEach(key => wm.set_strv(key, []));
}
