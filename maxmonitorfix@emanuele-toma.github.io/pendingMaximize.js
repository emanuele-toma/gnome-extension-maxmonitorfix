import GLib from 'gi://GLib';

export class PendingMaximize {
    constructor(window, fallbackMs, onFinished) {
        this._window = window;
        this._onFinished = onFinished;
        this._idleId = 0;
        this._sizeId = window.connect('size-changed', () => this._request());
        this._unmanagedId = window.connect('unmanaged', () => this.cancel());
        this._fallbackId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, fallbackMs, () => {
            this._fallbackId = 0;
            this._request();
            return GLib.SOURCE_REMOVE;
        });
    }

    cancel() {
        const window = this._window;
        if (!window)
            return;
        this._window = null;
        this._removeSource('_fallbackId');
        this._removeSource('_idleId');
        window.disconnect(this._sizeId);
        window.disconnect(this._unmanagedId);
        this._onFinished();
    }

    flush() {
        const window = this._window;
        if (!window)
            return;
        this.cancel();
        window.maximize();
    }

    _request() {
        if (this._idleId)
            return;
        this._removeSource('_fallbackId');
        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._idleId = 0;
            this.flush();
            return GLib.SOURCE_REMOVE;
        });
    }

    _removeSource(field) {
        if (!this[field])
            return;
        GLib.source_remove(this[field]);
        this[field] = 0;
    }
}
