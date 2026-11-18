# Claudov handling Foley

The runtime handling bank contains 44 ElevenLabs Sound Effects takes. It uses the existing seven six-take pools and the two wood casing cues. The four pilot takes are reused. The other 40 takes cost 680 credits. These are prompt-based replacements, with no numeric similarity rating assigned. The previous recording sources remain documented in the credits ledger for provenance. The committed MP3s and timing metadata are the replacement masters for the game. The Partisan sound builder describes the previous recordings.

## Unshipped references worth auditioning

The Partisan inbound weapon sounds archive lists 723 cuts. Excluding the 42 filenames in its shipped manifest leaves 681. The following candidates are based on the cue sheet's acoustic features and chapter labels. The proposed event mappings should be confirmed by ear before any use.

| Reference in `weapon-sounds/unshipped-cuts` | Proposed Claudov use | Reason to audition |
| --- | --- | --- |
| `long/bolt-0025_70s.wav` | L96 full bolt cycle | A 708 ms reference with room for distinct lift, travel and return sounds. |
| `slide/pump-0139_32s.wav` | Pump shotgun cycling | A 345 ms slide with 44.9 dB estimated SNR. Good starting point for a shotgun-specific action. |
| `click/sapistol-0318_00s.wav` | Service pistol slide release or control click | A 157 ms isolated pistol chapter click with 38.1 dB estimated SNR. |
| `clunk/sar-0540_00s.wav` | Hideout attachment seating | A short 96 ms low-end contact from the semi-auto rifle chapter's optic section. |
| `ratchet/sar-0492_83s.wav` | Workbench mount adjustment | A 401 ms ratchet for a deliberate adjustment gesture. |
| `handle/bolt-0075_05s.wav` | Quiet raid-start weapon check | An 84 ms handling cue for the hand settling onto the weapon. |

The archive is a reference for new Foley. The 181 UI-suspect cuts still need individual identification before use.

## CC0 handling additions

Six new cuts extend the long action and clunk pools, using the Partisan shooter manifest’s CC0 reload sources [674742](https://freesound.org/s/674742/), [815879](https://freesound.org/s/815879/), and [432141](https://freesound.org/s/432141/) in that order. The inbound references remain audition references.

| Take | Source | Source start |
| --- | --- | --- |
| `hf_clunk-7` | Reload recording 1 | 1.113 s |
| `hf_long-7` | Reload recording 1 | 0.221 s |
| `hf_clunk-8` | Reload recording 2 | 1.711 s |
| `hf_long-8` | Reload recording 2 | 0.053 s |
| `hf_clunk-9` | Reload recording 3 | 0.668 s |
| `hf_long-9` | Reload recording 3 | 0.001 s |
