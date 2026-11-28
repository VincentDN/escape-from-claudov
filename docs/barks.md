# Raid combat bark voice script

The captions carry the English meaning. Perform the radio lines in the invented syllables below.
Read the cue first, then the short group marker. Stress the first syllable of the cue and leave a small gap before the marker.
Keep each line short enough for the warning word to be recognizable before the announced action.

## Sound rules

- Use open vowels `a`, `e`, `i`, `o`, and `u`. The syllable starts are short consonants or clusters such as `v`, `sh`, `zh`,
  `kr`, `d`, `r`, `t`, `m`, and `n`. Use `sh` as in “ship” and `zh` as in “measure”. Most cue words have two
  syllables and end in a short consonant.
- `vekar` and `vekri` announce a contact. `tavor` and `tavri` announce a flank, followed by `sen` for left or `dor` for right.
- `zhevik` always announces a grenade. `karo/kari` means frag, `shen/shek` means flash, and `moru/mora` means smoke.
  Put these words first so all three grenade types are easy to recognize.
- The last syllable identifies the speaker's style. Wardens use `ta/ren`, Scavengers use `ka/lek`, and specials use `tho/vek`.
  These markers carry no gameplay meaning.

## Recording plan

There are 15 cues, three voice groups, and four distinct lines per cue and group, for **180 planned generations** at one generation per take.
Use the filenames below with the recording extension. The five sample entries are included in the 180. Approve the sample style
before recording the batch.

| Sample file stem | Line | Cue |
| --- | --- | --- |
| `bark_w_spot_1` | vekar ta | Contact |
| `bark_w_frag_1` | zhevik karo ta | Frag |
| `bark_s_flank_left_2` | tavri sen lek | Left flank |
| `bark_s_lost_1` | neshu ka | Lost sight |
| `bark_x_help_1` | rakum tho | Help |

## Wardens

Crisp and even, like a short radio report.

| Cue | Meaning | Take 1 | Take 2 | Take 3 | Take 4 |
| --- | --- | --- | --- | --- | --- |
| `spot` | Saw a target | `bark_w_spot_1` vekar ta | `bark_w_spot_2` vekri ren | `bark_w_spot_3` vekar ren | `bark_w_spot_4` vekri ta |
| `lost` | Lost sight | `bark_w_lost_1` neshu ta | `bark_w_lost_2` nelak ren | `bark_w_lost_3` neshu ren | `bark_w_lost_4` nelak ta |
| `flank_left` | Moving around the left | `bark_w_flank_left_1` tavor sen ta | `bark_w_flank_left_2` tavri sen ren | `bark_w_flank_left_3` tavor sen ren | `bark_w_flank_left_4` tavri sen ta |
| `flank_right` | Moving around the right | `bark_w_flank_right_1` tavor dor ta | `bark_w_flank_right_2` tavri dor ren | `bark_w_flank_right_3` tavor dor ren | `bark_w_flank_right_4` tavri dor ta |
| `frag` | Throwing a frag | `bark_w_frag_1` zhevik karo ta | `bark_w_frag_2` zhevik kari ren | `bark_w_frag_3` zhevik karo ren | `bark_w_frag_4` zhevik kari ta |
| `flash` | Throwing a flash | `bark_w_flash_1` zhevik shen ta | `bark_w_flash_2` zhevik shek ren | `bark_w_flash_3` zhevik shen ren | `bark_w_flash_4` zhevik shek ta |
| `smoke` | Throwing smoke | `bark_w_smoke_1` zhevik moru ta | `bark_w_smoke_2` zhevik mora ren | `bark_w_smoke_3` zhevik moru ren | `bark_w_smoke_4` zhevik mora ta |
| `suppress` | Giving covering fire | `bark_w_suppress_1` kravel ta | `bark_w_suppress_2` kravri ren | `bark_w_suppress_3` kravel ren | `bark_w_suppress_4` kravri ta |
| `reload` | Reloading | `bark_w_reload_1` neraku ta | `bark_w_reload_2` neraki ren | `bark_w_reload_3` neraku ren | `bark_w_reload_4` neraki ta |
| `move_up` | Advancing | `bark_w_move_up_1` sovek ta | `bark_w_move_up_2` sovri ren | `bark_w_move_up_3` sovek ren | `bark_w_move_up_4` sovri ta |
| `fall_back` | Withdrawing | `bark_w_fall_back_1` darosh ta | `bark_w_fall_back_2` darok ren | `bark_w_fall_back_3` darosh ren | `bark_w_fall_back_4` darok ta |
| `help` | Calling for help | `bark_w_help_1` rakum ta | `bark_w_help_2` rakri ren | `bark_w_help_3` rakum ren | `bark_w_help_4` rakri ta |
| `man_down` | Teammate down | `bark_w_man_down_1` mavren ta | `bark_w_man_down_2` mavrek ren | `bark_w_man_down_3` mavren ren | `bark_w_man_down_4` mavrek ta |
| `search` | Searching the area | `bark_w_search_1` shavor ta | `bark_w_search_2` shavri ren | `bark_w_search_3` shavor ren | `bark_w_search_4` shavri ta |
| `all_clear` | Area clear | `bark_w_all_clear_1` loren ta | `bark_w_all_clear_2` lorek ren | `bark_w_all_clear_3` loren ren | `bark_w_all_clear_4` lorek ta |

## Scavengers

Clipped and hurried, with a short tail.

| Cue | Meaning | Take 1 | Take 2 | Take 3 | Take 4 |
| --- | --- | --- | --- | --- | --- |
| `spot` | Saw a target | `bark_s_spot_1` vekar ka | `bark_s_spot_2` vekri lek | `bark_s_spot_3` vekar lek | `bark_s_spot_4` vekri ka |
| `lost` | Lost sight | `bark_s_lost_1` neshu ka | `bark_s_lost_2` nelak lek | `bark_s_lost_3` neshu lek | `bark_s_lost_4` nelak ka |
| `flank_left` | Moving around the left | `bark_s_flank_left_1` tavor sen ka | `bark_s_flank_left_2` tavri sen lek | `bark_s_flank_left_3` tavor sen lek | `bark_s_flank_left_4` tavri sen ka |
| `flank_right` | Moving around the right | `bark_s_flank_right_1` tavor dor ka | `bark_s_flank_right_2` tavri dor lek | `bark_s_flank_right_3` tavor dor lek | `bark_s_flank_right_4` tavri dor ka |
| `frag` | Throwing a frag | `bark_s_frag_1` zhevik karo ka | `bark_s_frag_2` zhevik kari lek | `bark_s_frag_3` zhevik karo lek | `bark_s_frag_4` zhevik kari ka |
| `flash` | Throwing a flash | `bark_s_flash_1` zhevik shen ka | `bark_s_flash_2` zhevik shek lek | `bark_s_flash_3` zhevik shen lek | `bark_s_flash_4` zhevik shek ka |
| `smoke` | Throwing smoke | `bark_s_smoke_1` zhevik moru ka | `bark_s_smoke_2` zhevik mora lek | `bark_s_smoke_3` zhevik moru lek | `bark_s_smoke_4` zhevik mora ka |
| `suppress` | Giving covering fire | `bark_s_suppress_1` kravel ka | `bark_s_suppress_2` kravri lek | `bark_s_suppress_3` kravel lek | `bark_s_suppress_4` kravri ka |
| `reload` | Reloading | `bark_s_reload_1` neraku ka | `bark_s_reload_2` neraki lek | `bark_s_reload_3` neraku lek | `bark_s_reload_4` neraki ka |
| `move_up` | Advancing | `bark_s_move_up_1` sovek ka | `bark_s_move_up_2` sovri lek | `bark_s_move_up_3` sovek lek | `bark_s_move_up_4` sovri ka |
| `fall_back` | Withdrawing | `bark_s_fall_back_1` darosh ka | `bark_s_fall_back_2` darok lek | `bark_s_fall_back_3` darosh lek | `bark_s_fall_back_4` darok ka |
| `help` | Calling for help | `bark_s_help_1` rakum ka | `bark_s_help_2` rakri lek | `bark_s_help_3` rakum lek | `bark_s_help_4` rakri ka |
| `man_down` | Teammate down | `bark_s_man_down_1` mavren ka | `bark_s_man_down_2` mavrek lek | `bark_s_man_down_3` mavren lek | `bark_s_man_down_4` mavrek ka |
| `search` | Searching the area | `bark_s_search_1` shavor ka | `bark_s_search_2` shavri lek | `bark_s_search_3` shavor lek | `bark_s_search_4` shavri ka |
| `all_clear` | Area clear | `bark_s_all_clear_1` loren ka | `bark_s_all_clear_2` lorek lek | `bark_s_all_clear_3` loren lek | `bark_s_all_clear_4` lorek ka |

## Specials

Low and measured, with a clear first word.

| Cue | Meaning | Take 1 | Take 2 | Take 3 | Take 4 |
| --- | --- | --- | --- | --- | --- |
| `spot` | Saw a target | `bark_x_spot_1` vekar tho | `bark_x_spot_2` vekri vek | `bark_x_spot_3` vekar vek | `bark_x_spot_4` vekri tho |
| `lost` | Lost sight | `bark_x_lost_1` neshu tho | `bark_x_lost_2` nelak vek | `bark_x_lost_3` neshu vek | `bark_x_lost_4` nelak tho |
| `flank_left` | Moving around the left | `bark_x_flank_left_1` tavor sen tho | `bark_x_flank_left_2` tavri sen vek | `bark_x_flank_left_3` tavor sen vek | `bark_x_flank_left_4` tavri sen tho |
| `flank_right` | Moving around the right | `bark_x_flank_right_1` tavor dor tho | `bark_x_flank_right_2` tavri dor vek | `bark_x_flank_right_3` tavor dor vek | `bark_x_flank_right_4` tavri dor tho |
| `frag` | Throwing a frag | `bark_x_frag_1` zhevik karo tho | `bark_x_frag_2` zhevik kari vek | `bark_x_frag_3` zhevik karo vek | `bark_x_frag_4` zhevik kari tho |
| `flash` | Throwing a flash | `bark_x_flash_1` zhevik shen tho | `bark_x_flash_2` zhevik shek vek | `bark_x_flash_3` zhevik shen vek | `bark_x_flash_4` zhevik shek tho |
| `smoke` | Throwing smoke | `bark_x_smoke_1` zhevik moru tho | `bark_x_smoke_2` zhevik mora vek | `bark_x_smoke_3` zhevik moru vek | `bark_x_smoke_4` zhevik mora tho |
| `suppress` | Giving covering fire | `bark_x_suppress_1` kravel tho | `bark_x_suppress_2` kravri vek | `bark_x_suppress_3` kravel vek | `bark_x_suppress_4` kravri tho |
| `reload` | Reloading | `bark_x_reload_1` neraku tho | `bark_x_reload_2` neraki vek | `bark_x_reload_3` neraku vek | `bark_x_reload_4` neraki tho |
| `move_up` | Advancing | `bark_x_move_up_1` sovek tho | `bark_x_move_up_2` sovri vek | `bark_x_move_up_3` sovek vek | `bark_x_move_up_4` sovri tho |
| `fall_back` | Withdrawing | `bark_x_fall_back_1` darosh tho | `bark_x_fall_back_2` darok vek | `bark_x_fall_back_3` darosh vek | `bark_x_fall_back_4` darok tho |
| `help` | Calling for help | `bark_x_help_1` rakum tho | `bark_x_help_2` rakri vek | `bark_x_help_3` rakum vek | `bark_x_help_4` rakri tho |
| `man_down` | Teammate down | `bark_x_man_down_1` mavren tho | `bark_x_man_down_2` mavrek vek | `bark_x_man_down_3` mavren vek | `bark_x_man_down_4` mavrek tho |
| `search` | Searching the area | `bark_x_search_1` shavor tho | `bark_x_search_2` shavri vek | `bark_x_search_3` shavor vek | `bark_x_search_4` shavri tho |
| `all_clear` | Area clear | `bark_x_all_clear_1` loren tho | `bark_x_all_clear_2` lorek vek | `bark_x_all_clear_3` loren vek | `bark_x_all_clear_4` lorek tho |

During combat, firing and reload warnings use their full lead even while ordinary chatter is on cooldown. Each hostile announces its own burst. Sustained fire shares the same warning.
