"""Prepare recorded weapon Foley and encode it with the game sound builder."""

import argparse
from pathlib import Path
import re
import sys

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_sfx import encode_pack
import common


PACK = 'weapon_foley'
SR = common.SR
TARGET_RMS = -17.0


def active_rms(samples):
    window = round(SR * 0.005)
    envelope = np.convolve(np.abs(samples), np.ones(window) / window, 'same')
    active = samples[envelope > envelope.max() * 0.05]
    return np.sqrt(np.mean(active ** 2))


def level(samples):
    samples = samples * (10 ** (TARGET_RMS / 20) / active_rms(samples))
    # Isolated peaks can prevent a cue from matching the bank's active RMS.
    # Apply a smooth knee only to cues that would exceed the peak ceiling.
    ceiling = 10 ** (-1.5 / 20)
    if common.peak(samples) <= ceiling:
        return samples
    knee = 0.4
    excess = np.maximum(0, np.abs(samples) - knee)
    limited = np.minimum(np.abs(samples), knee) + excess / (1 + excess / (ceiling - knee))
    return np.copysign(limited, samples)


def prepare(path, start_ms, end_ms, gain_db=0):
    samples = common.ff(common.load(path), 'highpass=f=65,lowpass=f=15000')
    start, end = (round(ms * SR / 1000) for ms in (start_ms, end_ms))
    if not 0 <= start < end <= len(samples) or end - start < round(SR * 0.02):
        raise ValueError(f'{path}: invalid source window {start_ms}–{end_ms} ms')
    samples = samples[start:end]
    if not common.peak(samples):
        raise ValueError(f'{path}: silent source window')
    attack = common.onset(samples, common.db(0.5))
    lead = round(SR * 0.006)
    if attack >= lead:
        samples = samples[attack - lead:]
    else:
        samples = np.pad(samples, (lead - attack, 0))
    samples = common.fade(samples, fin=0.001, fout=0.012)
    return level(samples) * 10 ** (gain_db / 20)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--take', action='append', nargs=3, required=True, metavar=('FILE', 'START_MS', 'END_MS'))
    parser.add_argument('--gain-db', action='append', nargs=2, default=[], metavar=('TAKE_ID', 'DB'))
    args = parser.parse_args()
    adjustments = {name: float(value) for name, value in args.gain_db}
    masters = {}
    for filename, start_ms, end_ms in args.take:
        path = Path(filename)
        if not re.fullmatch(r'wf_(rifle|smg|pistol|sniper|shotgun)_[a-z_]+_0[1-4]', path.stem) or path.stem in masters:
            parser.error(f'invalid or duplicate shot-list filename: {path.name}')
        masters[path.stem] = prepare(path, float(start_ms), float(end_ms), adjustments.get(path.stem, 0))
    if adjustments.keys() - masters.keys():
        parser.error('gain adjustment names must match the supplied takes')
    for name, samples in masters.items():
        common.save_master(PACK, name, samples)
    encode_pack(PACK, garder=True)


if __name__ == '__main__':
    main()
