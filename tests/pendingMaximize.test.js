import GLib from 'gi://GLib';
import system from 'system';

import {PendingMaximize} from '../maxmonitorfix@emanuele-toma.github.io/pendingMaximize.js';

let failures = 0;

function check(name, condition) {
    print(`${condition ? 'PASS' : 'FAIL'} ${name}`);
    if (!condition)
        failures++;
}

class FakeWindow {
    constructor() {
        this.handlers = new Map();
        this.nextId = 1;
        this.maximizeCalls = 0;
    }

    connect(signal, handler) {
        const id = this.nextId++;
        this.handlers.set(id, {signal, handler});
        return id;
    }

    disconnect(id) {
        this.handlers.delete(id);
    }

    emit(signal) {
        [...this.handlers.values()]
            .filter(entry => entry.signal === signal)
            .forEach(entry => entry.handler());
    }

    maximize() {
        this.maximizeCalls++;
    }
}

function runFor(ms) {
    const loop = new GLib.MainLoop(null, false);
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        loop.quit();
        return GLib.SOURCE_REMOVE;
    });
    loop.run();
}

function start(fallbackMs) {
    const window = new FakeWindow();
    const state = {finished: 0};
    const pending = new PendingMaximize(window, fallbackMs, () => state.finished++);
    return {window, state, pending};
}

{
    const {window, state} = start(1000);
    window.emit('size-changed');
    window.emit('size-changed');
    runFor(50);
    check('size-changed maximizes exactly once', window.maximizeCalls === 1);
    check('size-changed finishes exactly once', state.finished === 1);
    check('size-changed leaves no handlers behind', window.handlers.size === 0);
}

{
    const {window, state} = start(30);
    runFor(120);
    check('fallback timer maximizes when no signal arrives', window.maximizeCalls === 1);
    check('fallback finishes exactly once', state.finished === 1);
    check('fallback leaves no handlers behind', window.handlers.size === 0);
}

{
    const {window, state} = start(30);
    window.emit('unmanaged');
    runFor(120);
    check('unmanaged cancels without maximizing', window.maximizeCalls === 0);
    check('unmanaged finishes exactly once', state.finished === 1);
    check('unmanaged leaves no handlers behind', window.handlers.size === 0);
}

{
    const {window, state} = start(30);
    window.emit('size-changed');
    window.emit('unmanaged');
    runFor(120);
    check('unmanaged during the idle step prevents the maximize', window.maximizeCalls === 0);
    check('unmanaged during the idle step finishes once', state.finished === 1);
}

{
    const {window, state, pending} = start(1000);
    pending.flush();
    check('flush maximizes immediately', window.maximizeCalls === 1);
    check('flush finishes exactly once', state.finished === 1);
    pending.flush();
    pending.cancel();
    runFor(30);
    check('flush and cancel are idempotent', window.maximizeCalls === 1 && state.finished === 1);
    check('flush leaves no handlers behind', window.handlers.size === 0);
}

{
    const {window, state, pending} = start(30);
    pending.cancel();
    pending.cancel();
    runFor(120);
    check('cancel never maximizes', window.maximizeCalls === 0);
    check('cancel finishes exactly once', state.finished === 1);
}

system.exit(failures);
