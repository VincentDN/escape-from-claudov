# Brief: P5, music and atmosphere

Read `docs/briefs/COMMON.md` first, then section P5 of `docs/plans/2026-11-14-polish-pass.md` (the specification) and the
owner's answers (music: archive tracks). The real code is in your worktree.

You own: `src/09g-music.js`, `src/05c-ambiance.js`, new `src/efc/46-efc-music.js`, new `assets/music/`, the music part of
`build.py`, `NOTICE.md` and a new `assets/music/credits.json`, `tools/dev/efc/test-music.mjs`. Another worker is changing the
weapon and handling sounds (`src/05-audio.js`, `src/05a-sfx.js`, `assets/sfx/`, `tools/build_sfx.py`): do not touch those.
Do not touch `shell.html` (owned by the menu worker): build any control from JS.

Requirements
1. **Find the tracks** in archives that state their terms on the track's own page: OpenGameArt (CC0 or CC BY), Freesound (CC0),
   Free Music Archive (CC0 or CC BY), Wikimedia Commons, incompetech (CC BY). Register: dark ambient, low drones, sparse guitar
   or synth, industrial texture, cold harbour. Never use search-engine results as a source, never anything from an existing
   game's soundtrack, nothing marked non-commercial or no-derivatives. Check that outbound network access works here first; if a
   host is blocked, say which and use the ones that work. For every file record: title, author, source page URL, licence as the
   page states it, date fetched. If a page's terms are unclear, do not ship the file: copy it to
   `outbound/rights-review/<source>/` with a `rights-review-sheet.csv` (source page, the rights statement the source makes, why
   it is unclear, blank reviewer / decision / date / notes columns) for the owner.
2. **What to deliver**: one menu theme (2 to 4 minutes, loops), three quiet raid beds that rotate with long gaps of plain
   ambience between them, short stings for extraction started, extracted, killed, and the late extract opening. Convert to mp3
   or ogg at a sensible bitrate; total under 12 MB; loudness normalised so beds sit well under gunfire.
3. **Playback** through the engine's music path so the existing music volume setting and mute apply (read `src/09g-music.js`
   and how `build.py` ships the menu music beside the page). Beds start a little after insertion, duck under gunfire if the
   engine has a ducking bus, and stop on raid end. Loops must not click.
4. **Harbour ambience for Claudov**: distant ship horn, chains, gulls, wind in rigging, water against the quay, from CC0
   sources, layered at low level into the map's ambience through `src/05c-ambiance.js`.
5. **Credits**: `assets/music/credits.json` in the same shape as `assets/sfx/credits.json`, a section in `NOTICE.md`, and the
   credits screen text if you can add it without editing `shell.html` (otherwise list the exact lines for the menu worker).
6. **Test** `tools/dev/efc/test-music.mjs`: every track decodes, loop points do not jump (compare the first and last 50 ms),
   peak below 0 dBFS, the menu theme starts in the menu and a bed starts within 60 game seconds of a raid start, stings fire on
   their events (record calls), everything obeys music volume 0, and the game runs with `assets/music/` missing.
   You cannot hear: say plainly that the choice of tracks is by description and metadata, and list each track with one line on
   why it fits so the owner can audition them.
