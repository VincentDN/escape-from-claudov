"""Family "partisan": weapon handling foley, casings, ricochets, fly-bys and the L96 shot, taken from the owner's other project,
Partisan Project (packs 'handling' and 'ballistics'). Escape From Claudov polish pass, package P2 (docs/audio-events.md).

Sources:
- assets/audio/foley/ of Partisan Project: 42 recorded handling takes in seven categories (click, clunk, ratchet, slide, hit,
  handle, long), six per category. Supplied by the project owner, checked and cleared by the owner for this public repository
  (NOTICE.md; decision D1 of docs/plans/2026-11-14-polish-pass.md). No upstream source is recorded for them.
- assets/audio/shooter/ of Partisan Project: Freesound, CC0 only. Its manifest.json lists the author, title and source page of
  every take; the credits below copy them.

Where the files come from: the local Partisan checkout when it is there (env PARTISAN_DIR, else a sibling folder named
partisan-project next to this repository or one of its parents), else the copy fetched by `--fetch` into
assets_src/sfx/src/partisan/ from the published Partisan site (FILES).

Processing (all mono 48 kHz, see common.py):
- high-pass 50 Hz (handling) or 35 Hz (shots), low-pass 16 kHz;
- start: transient takes (click, clunk, hit) start 6 ms before their peak, so the decisive click lands where the game fires the
  event (the reload choreography in src/06d-reload.js triggers each sound at the instant the part seats); gesture takes
  (handle, slide, long, ratchet) start at their onset;
- length capped per category with a fade-out, 2 ms fade-in;
- level: the active part (envelope above -26 dB under the peak) is brought to the same RMS for every take of a pack, and a
  look-ahead limiter keeps the peak at -1 dBFS, so the takes of a pack sit together (the game doses each event, MECH_GAIN).
The Partisan shooter files with peaks over 0 dBFS (fly-by 3, ricochets 2 and 3, shells 2) are fixed by that same step.

Usage: python3 tools/build_sfx.py --build --famille partisan, then python3 tools/build_sfx.py --paquet handling,ballistics."""
import json, os, pathlib
import numpy as np
import common as C
from common import SR

FAMILY = 'partisan'
SITE = 'https://vincentdn.github.io/partisan-project/'

FOLEY = {
    'click': ['bolt-0042_94s.wav', 'bolt-0065_15s.wav', 'revolver-0435_23s.wav', 'bolt-0039_83s.wav', 'pump-0164_97s.wav', 'sar-0500_12s.wav'],
    'clunk': ['bolt-0125_61s.wav', 'bolt-0076_36s.wav', 'pump-0157_58s.wav', 'revolver-0413_02s.wav', 'revolver-0398_20s.wav', 'bolt-0129_86s.wav'],
    'ratchet': ['pump-0138_38s.wav', 'bow-0232_15s.wav', 'bow-0208_12s.wav', 'bolt-0058_78s.wav', 'bolt-0060_64s.wav', 'sar-0532_41s.wav'],
    'slide': ['bolt-0083_05s.wav', 'bolt-0068_16s.wav', 'bolt-0074_49s.wav', 'bolt-0025_12s.wav', 'pump-0167_72s.wav', 'sar-0494_73s.wav'],
    'hit': ['bolt-0075_79s.wav', 'bolt-0039_37s.wav', 'bolt-0043_31s.wav', 'bolt-0029_02s.wav', 'sapistol-0280_34s.wav', 'pump-0142_41s.wav'],
    'handle': ['sar-0494_00s.wav', 'sar-0505_05s.wav', 'sar-0504_10s.wav', 'sar-0499_49s.wav', 'sar-0527_74s.wav', 'sar-0554_24s.wav'],
    'long': ['bolt-0034_58s.wav', 'bolt-0069_49s.wav', 'bolt-0019_58s.wav', 'bolt-0052_26s.wav', 'sar-0495_80s.wav', 'sar-0552_84s.wav'],
}
# category -> (transient take: start just before the peak, maximum length in s)
SHAPE = {'click': (True, 0.25), 'clunk': (True, 0.3), 'hit': (True, 0.35), 'handle': (False, 0.4), 'slide': (False, 0.4),
         'ratchet': (False, 0.6), 'long': (False, 0.8)}

# Freesound takes from Partisan's assets/audio/shooter/manifest.json: bank, file, Freesound id, author, title, max length (s)
SHOOTER = [
    ('pt_ric', 'ricochet/ricochet-1.mp3', 30932, 'aust_paul', 'bullet ricochet.wav', 1.0),
    ('pt_ric', 'ricochet/ricochet-2.mp3', 392975, 'morganpurkis', 'Ricochet 2.wav', 0.8),
    ('pt_ric', 'ricochet/ricochet-3.mp3', 345413, 'Artmasterrich', 'Bullet_Ricochet_01', 0.7),
    ('pt_flyby', 'flyby/flyby-1.mp3', 855248, 'qubodup', 'Real Bullet Flyby Sound', 0.2),
    ('pt_flyby', 'flyby/flyby-2.mp3', 386854, 'morganpurkis', 'Bullet Crack.wav', 0.4),
    ('pt_flyby', 'flyby/flyby-3.mp3', 505238, 'Daleonfire', 'Whizzby', 0.9),
    ('g_pt_sniper_pov', 'shot-sniper/shot-sniper-1.mp3', 433858, 'LilMati', 'Rifle Gun Shot 01.wav', 1.6),
    ('g_pt_sniper_pov', 'shot-sniper/shot-sniper-2.mp3', 484036, 'LilMati', 'Rifle Gun Shot 02.wav', 1.6),
    ('g_pt_sniper_pov', 'shot-sniper/shot-sniper-4.mp3', 563015, 'florianreichelt', 'a loud gunshot in the woods', 1.8),
    # casings landing on a hard wooden floor (single throws of a few cases; the engine's f_brass stays for concrete and metal)
    ('f_casing_wood', 'shells/shells-1.mp3', 370805, 'LilMati', 'Bullet Shell Thrown On Table.wav', 0.45),
    ('f_casing_wood', 'shells/shells-2.mp3', 371199, 'LilMati', 'Bullet Shells Thrown In Basket.wav', 0.35),
]
PACK_OF = lambda bank: 'handling' if bank.startswith(('hf_', 'f_casing')) else 'ballistics'

SOURCES = {
    'partisan-foley': {
        'nom': 'Partisan Project handling bank (assets/audio/foley/, 42 takes: click, clunk, ratchet, slide, hit, handle, long)',
        'auteur': 'Supplied by the project owner (Vincent De Nil)',
        'licence': 'Cleared by the owner for this public repository',
        'url': SITE + 'assets/audio/foley/manifest.json',
        'preuve': "Partisan Project shared/mech.js and docs/adr/0009-foley-restored.md: « checked and cleared by the owner »; "
                  "owner decision D1 (docs/plans/2026-11-14-polish-pass.md): « D1 foley: cleared for the public repo »",
    },
}
for _b, _f, _id, _a, _t, _d in SHOOTER:
    SOURCES[f'fs-{_id}'] = {
        'nom': f'« {_t} » (freesound {_id})', 'auteur': _a, 'licence': 'CC0 1.0', 'url': f'https://freesound.org/s/{_id}/',
        'preuve': "Partisan Project assets/audio/shooter/manifest.json: « source: Freesound, CC0 only », entry "
                  f"{_f} (id {_id}, author {_a})",
    }

FILES = {}
for _c, _l in FOLEY.items():
    for _n in _l: FILES[f'partisan/foley/{_c}/{_n}'] = SITE + f'assets/audio/foley/{_c}/{_n}'
for _b, _f, *_ in SHOOTER: FILES[f'partisan/shooter/{_f}'] = SITE + f'assets/audio/shooter/{_f}'


def partisan_dir():
    """The local Partisan checkout, or None"""
    env = os.environ.get('PARTISAN_DIR')
    if env and pathlib.Path(env, 'assets/audio').is_dir(): return pathlib.Path(env)
    for p in [C.ROOT] + list(C.ROOT.parents):
        q = p.parent / 'partisan-project'
        if (q / 'assets/audio').is_dir(): return q
    return None


def src(rel):
    """Local Partisan file (assets/audio/<rel>) or the fetched copy"""
    base = partisan_dir()
    if base and (base / 'assets/audio' / rel).exists(): return base / 'assets/audio' / rel
    p = C.SRC / 'partisan' / rel
    if not p.exists(): raise SystemExit(f'partisan: {rel} missing (set PARTISAN_DIR or run --fetch --famille partisan)')
    return p


def active_rms(x):
    """RMS of the active part: envelope (5 ms) above -26 dB under the peak; the level the game's test checks too"""
    a = np.abs(x); env = np.convolve(a, np.ones(240) / 240, 'same')
    act = x[env > env.max() * 0.05]
    return float(np.sqrt(np.mean(act ** 2))) if len(act) else 0.0


def limit(y, ceil_db):
    lim = 10 ** ((ceil_db - 0.3) / 20)
    pad = np.zeros(int(0.01 * SR))  # the limiter's look-ahead delays the signal: pad, then drop the delay
    z = C.ff(np.concatenate([y * 0.5, pad]), f'alimiter=limit={lim * 0.5:.5f}:attack=0.5:release=40:level=disabled:asc=1')
    return z[int(0.005 * SR):][:len(y)] * 2.0


def level(x, target_db, ceil_db=-1.0):
    """Active RMS to target_db, then a look-ahead limiter holds the peak at ceil_db (only when needed); repeated a few times
    because limiting lowers the RMS again"""
    y = x
    for _ in range(5):
        r = active_rms(y)
        if r > 0: y = y * (10 ** (target_db / 20) / r)
        if C.peak(y) <= 10 ** (ceil_db / 20): break
        y = limit(y, ceil_db)
        if abs(C.db(active_rms(y)) - target_db) < 1.0: break
    return C.norm(y, ceil_db) if C.peak(y) > 10 ** (ceil_db / 20) else y


def shape(x, transient, maxlen, hp=50):
    x = C.ff(x, f'highpass=f={hp},lowpass=f=16000')
    if transient:
        e = np.convolve(np.abs(x), np.ones(48) / 48, 'same')
        x = x[max(0, int(np.argmax(e)) - int(0.006 * SR)):]
    else:
        x = C.trim(x, -40.0, pre=0.002)
    x = x[:C.tail_end(x, -50.0)]
    if len(x) > maxlen * SR: x = C.cut(x, maxlen, min(0.12, maxlen * 0.3))
    return C.fade(x, 0.002, min(0.04, len(x) / SR * 0.25))


def build():
    entries = []; out = {}
    for cat, names in FOLEY.items():
        tr, ml = SHAPE[cat]
        for i, n in enumerate(names, 1):
            x = shape(C.load(src(f'foley/{cat}/{n}')), tr, ml)
            out[f'hf_{cat}-{i}'] = x
            entries.append(C.credit(f'hf_{cat}-{i}', 'handling', 'partisan-foley', f'assets/audio/foley/{cat}/{n}',
                                    ('start 6 ms before the peak' if tr else 'start at the onset') + f', at most {ml} s, high-pass 50 Hz, '
                                    'level matched to the bank (active RMS), limiter at -1 dBFS'))
    count = {}
    for bank, f, fid, a, t, ml in SHOOTER:
        count[bank] = count.get(bank, 0) + 1; sid = f'{bank}-{count[bank]}'
        shot = bank.startswith('g_')
        x = shape(C.load(src(f'shooter/{f}')), False, ml, hp=35 if shot else 60)
        out[sid] = x
        entries.append(C.credit(sid, PACK_OF(bank), f'fs-{fid}', f'Partisan Project assets/audio/shooter/{f}',
                                f'start at the onset, at most {ml} s, high-pass {35 if shot else 60} Hz, level matched to the pack, limiter at -1 dBFS'))
    # level per pack: the median take of a pack sets the target, so no take moves far
    for pack in ('handling', 'ballistics'):
        ids = [k for k in out if PACK_OF(k) == pack]
        target = float(np.median([C.db(active_rms(C.norm(out[k], -1.0))) for k in ids]))
        for k in ids:
            y = level(out[k], target)
            C.save_master(pack, k, y)
            print(f'  {pack}/{k:22s} {len(y) / SR:5.2f} s  peak {C.db(C.peak(y)):6.2f}  active rms {C.db(active_rms(y)):6.2f} (target {target:.1f})')
    C.write_credits(FAMILY, entries)
