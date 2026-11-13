// Stand-in for the PeerJS `Peer` class over BroadcastChannel: two same-origin pages of one browser context can host and join lobbies.
// Injected before the game's scripts by tools/dev/efc/net2.mjs (window.Peer). Only the subset the game uses (src/09c-net.js):
//   new Peer([id], opts); peer.on('open' | 'connection' | 'error' | 'close' | 'disconnected'); peer.connect(id, opts) -> DataConnection;
//   peer.destroy(); peer.reconnect(); peer.id / open / destroyed / disconnected.
//   DataConnection: send(data), close(), on('open' | 'data' | 'close' | 'error'); open, peer (the remote id), reliable, serialization.
// Messages are JSON round-tripped (PeerJS 'json' serialization) and always delivered asynchronously, like a network.
// window.FAKEPEER_STATS counts sent and received data messages; window.FAKEPEER_DROP = true drops outgoing data (to simulate a dead link).
(function () {
  const BUS = 'efc-fakepeer-v1', ABC = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const stats = (window.FAKEPEER_STATS = { sent: 0, recv: 0 });
  const rnd = (n) => { let s = ''; for (let i = 0; i < n; i++) s += ABC[Math.floor(Math.random() * ABC.length)]; return s; };
  class Emitter {
    constructor() { this._ev = {}; }
    on(ev, fn) { (this._ev[ev] || (this._ev[ev] = [])).push(fn); return this; }
    off(ev, fn) { const L = this._ev[ev]; if (L) this._ev[ev] = fn ? L.filter((f) => f !== fn) : []; return this; }
    emit(ev, ...a) { for (const fn of (this._ev[ev] || []).slice()) { try { fn(...a); } catch (e) { console.error('[fakepeer] ' + ev + ' listener', e); } } }
  }
  class FakeConn extends Emitter {
    constructor(peer, remote, cid, opts) {
      super();
      Object.assign(this, { _p: peer, peer: remote, connectionId: cid, open: false, reliable: !!(opts && opts.reliable), serialization: (opts && opts.serialization) || 'json', metadata: opts && opts.metadata, label: cid, peerConnection: null });
    }
    _ready() { if (this._closed || this._up) return; this._up = true; this.open = true; this.emit('open'); }
    send(d) {
      if (!this.open) return;
      if (window.FAKEPEER_DROP) return;
      stats.sent++;
      this._p._post({ k: 'data', to: this.peer, from: this._p.id, cid: this.connectionId, d: JSON.stringify(d) });
    }
    close() {
      if (this._closed) return;
      this._p._post({ k: 'close', to: this.peer, from: this._p.id, cid: this.connectionId });
      this._end();
    }
    _end() {
      if (this._closed) return;
      this._closed = true; this.open = false; this._p._conns.delete(this.connectionId);
      setTimeout(() => this.emit('close'), 0);
    }
  }
  class FakePeer extends Emitter {
    constructor(id, opts) {
      super();
      if (id && typeof id === 'object') { opts = id; id = undefined; }
      this.options = opts || {};
      this.id = typeof id === 'string' && id ? id : rnd(16);
      this.open = false; this.destroyed = false; this.disconnected = false; this._conns = new Map(); this._wait = new Map();
      this._ch = new BroadcastChannel(BUS);
      this._ch.onmessage = (e) => this._in(e.data);
      // the signalling server refuses an id another live peer holds: ask, open if nobody answers quickly
      this._post({ k: 'who', id: this.id, from: this._nonce = rnd(8) });
      this._openT = setTimeout(() => { if (this.destroyed) return; this.open = true; this.emit('open', this.id); }, 60);
    }
    _post(m) { if (!this.destroyed) this._ch.postMessage(m); }
    _in(m) {
      if (this.destroyed || !m || typeof m !== 'object') return;
      if (m.k === 'who') { if (m.id === this.id && this.open) this._post({ k: 'taken', id: this.id, to: m.from }); return; }
      if (m.k === 'taken') {
        if (m.to === this._nonce && !this.open) { clearTimeout(this._openT); this._err('unavailable-id', 'ID "' + this.id + '" is taken'); }
        return;
      }
      if (m.to !== this.id) return;
      if (m.k === 'conn') { // a remote peer connects to me
        if (!this.open) return;
        const c = new FakeConn(this, m.from, m.cid, m.opts);
        this._conns.set(m.cid, c);
        this._post({ k: 'accept', to: m.from, from: this.id, cid: m.cid });
        this.emit('connection', c);
        setTimeout(() => c._ready(), 0);
      } else if (m.k === 'accept') {
        const c = this._wait.get(m.cid); if (!c) return;
        this._wait.delete(m.cid); clearTimeout(c._timer);
        this._conns.set(m.cid, c);
        c._ready();
      } else if (m.k === 'data') {
        const c = this._conns.get(m.cid); if (!c || c._closed) return;
        c._ready(); // data can overtake the open timer: the channel opens first
        let d; try { d = JSON.parse(m.d); } catch (e) { return; }
        stats.recv++;
        c.emit('data', d);
      } else if (m.k === 'close') {
        const c = this._conns.get(m.cid) || this._wait.get(m.cid); if (c) { this._wait.delete(m.cid); c._end(); }
      }
    }
    _err(type, msg) { const e = new Error(msg || type); e.type = type; setTimeout(() => this.emit('error', e), 0); }
    connect(id, opts) {
      const cid = 'dc_' + rnd(12), c = new FakeConn(this, String(id), cid, opts);
      if (this.destroyed || !this.open) { this._err('disconnected', 'peer is not open'); return c; }
      this._wait.set(cid, c);
      this._post({ k: 'conn', to: String(id), from: this.id, cid, opts: { reliable: !!(opts && opts.reliable), serialization: (opts && opts.serialization) || 'json' } });
      c._timer = setTimeout(() => { if (this._wait.get(cid) === c) { this._wait.delete(cid); this._err('peer-unavailable', 'Could not connect to peer ' + id); } }, 3000);
      return c;
    }
    reconnect() { if (!this.destroyed) { this.disconnected = false; this.open = true; } }
    disconnect() { if (!this.destroyed) { this.disconnected = true; this.open = false; setTimeout(() => this.emit('disconnected', this.id), 0); } }
    destroy() {
      if (this.destroyed) return;
      for (const c of [...this._conns.values()]) c.close();
      for (const c of this._wait.values()) clearTimeout(c._timer);
      this._wait.clear(); clearTimeout(this._openT);
      this.destroyed = true; this.open = false; this.disconnected = true;
      try { this._ch.close(); } catch (e) { /* already closed */ }
      setTimeout(() => this.emit('close'), 0);
    }
  }
  window.Peer = FakePeer;
  window.FakePeer = FakePeer;
})();
