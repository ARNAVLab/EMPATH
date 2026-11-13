# notes

## aug 28 - sep 18
- proposal + base paper (talekar/jhala acs 2025)
- base code: nextjs + langgraph, 4 mbti agents, 24 msgs, judge -1..1
- research plan, emotion spec, sources, study guide
- code never updates opinion in prompt?? paper says it does. ask jhala
- mtg 9/18: VAD, emoji avatars, emotion only first, 3d matrix

## sep 23 - 24
- model swap + batch runner
- vcl no gpu, llama 3b trash, 24 min/debate
- 7 debates on 3b, nothing like paper

## oct 6 - 9
- mtg 10/6: open models (gpt-oss/qwen), stubbornness = personality dont touch, pick emotion format
- repo -> ARNAVLab/EMPATH, only me as author
- design doc + plan (gdoc)
- vcl L40S, setup script, autopush script
- study 0 gpt-oss 24 debates ~3.4 min each
- emotion layer built (appraisal, vad, 3 formats, emotion check)

## oct 10 - 12
- study 0 partial match. universal ok rest blurry
- agents ignore assigned side like half the time, end turns into planning lists
- emotion test debate works, 88% check match
- pilot 1 (6): emotion on -> everyone agrees faster, snowball
- gemini dead end. 1.5 gone, free tier 429s, 0 saved
- fixes: anger via coping, no maxing at 1.0, debate rules flag

## oct 26 - 28
- jhala comment: vad from human data -> nrc + warriner, docs/VAD_HUMAN_DATA.md
- calm = pleasant in human data, anger/anxiety close on dominance
- 10/28 vcl, cloned, token saved
- pilot2 try 1 failed npm not found (forgot source bashrc)
- rerun w/ nvm inside job, running now. 3 off vs 3 on angry, ubi, debate rules
- check: ls results/pilot2 | wc -l -> want 6
- while pilot2 runs: built study 1 script (scripts/run_rep.mts, npm run rep). 1 agent, 1 attack msg, 1 reply. label vs vad vs description vs none, 4 emotions x low/high. judge rates emotion + vad + opinion. 352 replies, resumes if cut off
- tested w/ fake model, works
- study 2 launcher ready (scripts/study2.sh). off/on/frozen x ubi/food x angry/excited, 8 each = 80 debates, skips done cells
- pilot2 done 6/6 ~4 min each
- sides held ~100% (was 50%) but opinions frozen. OFF 0 movement, angry 1/3 moved
- anger sticks whole debate now, coping rule works
- emo check 44% (was 76%), anxiety basically never shows
- no emotion = essay bullet lists, anger = way less
- cause: stance sentence uses start opinion forever (same paper vs code thing)
- added --update-opinion flag: judge score -> agent opinion next turn (paper alg 1). tested w/ fake model ok. study2.sh takes UO=1
- next: pilot3 = pilot2 + update opinion

## nov 6
- checked github: nothing new since 10/28 push. no pilot3, no study1 results
- either never started on vcl or vcl wiped before autopush. rerun
- ~3.5 wks to report (nov 30)
- deadline moved: finish next week
- skip pilot3, just run study2 w/ UO=1. first cells (ubi off + angry) = pilot3 anyway, check those first
- study3 launcher (scripts/study3.sh): same 8 mbti groups every condition (groups-file), off / on calm / on angry, 24 debates
- --skip + --groups-file flags in run_batch, tested fake model ok
- scripts/analyze.py: table per condition + emoji line per debate + opinion plots
- vcl_setup: ollama 4 parallel so study1 + study2 share gpu

## nov 10
- still nothing run since 10/28. need results this week
- made it 1 command on vcl: bash scripts/go.sh -> setup, github login check, runs everything in background, pushes every 20 min
- order: calibration (4 prompt setups, no emotion, ubi, 3 each) + study 1 at same time -> auto pick setup + format (scripts/choose.py, baseline debates only) -> study 2 (80) + study 3 (24) at same time
- pick rule: sides held >=75% round 1, then movement closest to 0.5 (not frozen, not everyone flipping)
- new soft rules option (says where u stand, no "defend it")
- vad anchors now from NRC human data (angry/anxious/enthusiastic). calm stays neutral resting state
- fixed confound: high/low regulation was same as side. now each side has 1 high 1 low
- ollama ctx 16k (default might cut long debates), 4 parallel
- logs go to results/logs so can debug from github
- tested whole pipeline w/ fake model, works
- L40S both taken tonight. booked 2 slots: wed 11/11 11:45am (2h) + thu 11/12 1:15am (10h)
- slot 1 = calibration + study 1 + start of study 2/3. slot 2 = rest (resumes from github)
- at each slot start: ssh in, password, paste 1 line (key + github login). rest runs remote

## nov 11
- missed the 11:45am L40S slot (mac was off)
- L40S full till 1:15am. grabbed RTX 2080 Ti vcl now -> 12:45am (152.7.176.243)
- remote key works, code pushed from vcl (0441051), setup ok
- 2080 ti only 11gb so model is 32% cpu, slower. ollama 1 parallel, 16k ctx
- running calibration only here (4 setups x 3, no emotion, ubi). study 1 + rest on L40S tonight
- vcl kills machine ~15 min after last ssh connection drops (prob what killed oct 28 run). need a live ssh from the mac the whole time
- mac changed network -> vcl firewall refused me till Connect clicked again
- 2080 ti speed: ~2.6 requests/min w/ 4 debates at once. 12 calibration debates ~3.7h
- debates hit 9k+ tokens by late rounds. old runs at default ctx prob got cut. 16k now
- BIG: late round prompts hit 16-19k tokens. over the limit ollama cuts the FRONT = agent loses its system prompt (side, rules, emotion). saw it happen at 16k
- so old runs (study 0, pilots, default ctx) prob lost the system prompt in later rounds. could explain planning drift + everyone agreeing. need to rerun study 0 at 32k to check
- ctx now 32k, saved in run meta (context_length). killed + restarted calibration at 4:08pm, 0 debates lost
- dont pkill -f a pattern thats in the same ssh command, kills itself
- calibration done 12/12 (2080 ti, 32k ctx, 0 cutoffs)
  - original prompt + update: everyone flips to +1 right away (side held r1 67%)
  - soft rules: frozen 0 movement. soft+update / strict+update: 0.17 moved, basically frozen
  - judge score is basically always +1 or -1 (800 token essays), no in-between -> bad measure for small shifts
- vcl does NOT reclaim when i disconnect (ran 2h+ w/ no connection). false alarm
- new: private belief check before each turn (agent asked where it stands, -1..1, not shown to others). saved as values.belief / beliefData
- new: --update-opinion self = agent's own answer becomes its opinion (instead of judge)
- new: brief rules = soft + 120 word limit
- tested fake model ok, pushed (e014326)
- 7:51pm started calibration round 2 on 2080 ti: strict/soft/brief w/ self update, 3 each
- self-update round (1 debate each strict/soft/brief): beliefs ALSO stuck at +1/-1. agent just repeats the stance line in its prompt
- so: stance line in prompt = locked. no stance line = everyone flips to agree. no middle yet
- new "open" check: tell agent where it stood BEFORE this turn (past tense, no "defend it"), ask where it stands now, can move either way. pushed c603ab6
- 9:11pm running brief-open + soft-open, 3 each, on 2080 ti. killed the rest of the stuck self runs
- open check WORKS. 3 debates each, no emotion, ubi:
  - brief-open: belief moved 0.39, spread 0.65, r1 side held 92%, ~640 chars/msg
  - soft-open: moved 0.58, spread 0.59, r1 92%, ~2900 chars/msg
  - pro side softens toward middle, anti side mostly holds (jordan never moves in brief)
  - soft-open had 2 big flips (-1 -> +0.7)
- pick = brief + self update + open check. rule now: sides held >=75%, movement 0.25-0.75, then shortest msgs. changed rule after seeing data (baseline only, no emotion runs) -> say so in paper
- study 1 switched to brief rules too, old 6 replies deleted
- pushed db1b55e. study 1 running on 2080 ti till 12:45am, L40S finishes it
- L40S plan: N=12 study 2, study 3, then study 0 rerun at 32k

## nov 12
- 12:40am saved 2080 ti work. study 1 at 130/352 replies (brief rules)
- 1:16am L40S came up (152.7.176.102). sent ssh + paste steps. nobody logged in all night -> 10h slot wasted, 0 runs on L40S
- vcl web login also expired overnight, cant book next slot till logged in again
- done so far: calibration 18 debates, setup picked (brief + open check + self update), 32k ctx fix, study 1 37%
- not done: rest of study 1, study 2, study 3, study 0 rerun at 32k
- next: log into vcl, book L40S at a time im awake, ssh + paste once, then it all runs (~6h)
- mac repo is behind github (code was pushed from vcl). before next mac commit: git fetch + reset to origin/main (keep NOTES.md)
- 2:15pm back. turned on public key login in vcl settings + added run key -> no more pasting keys, machines let the run in automatically
- booked: 2080 ti now -> 12:30am (152.7.176.244), L40S tonight 11:45pm -> 9:45am fri
- typed github token once on the 2080 ti. tonight it gets copied to the L40S so it can push
- study 1 resumed on 2080 ti (130 done, 222 left, ~2h)
- tonight runs w/o me at laptop. mac stays on, lid open, plugged in, claude app open
- cant keep laptop on at night -> new plan: start everything while laptop is on, machines run + push alone after
- vcl allows only 2 machines at once. cancelled tonights L40S, booked 2nd 2080 ti (152.7.176.243), both till 12:30am
- github login copied from machine A to B (not opened)
- format locked = description (study 1 at 132 replies: description 64% match, label 45%, vad 26%; anger 10/12 vs 4/12 vs 0/12; anxiety bad everywhere)
- machine A: finish study 1 then study 2 neutral topic (food). machine B: study 2 ubi. 6 debates per condition first then 8, 10, 12 if time
- study 3 + top ups + study 0 rerun -> L40S fri 9am-7pm (booked). need laptop open ~15 min at 9am, no typing
- vcl limit = 2 reservations at once, cant shorten one. reshuffled: A 2080 ti till 12:30am, B 2080 ti (152.7.176.245) till 10:45pm, L40S tonight 11:45pm-7:45am, L40S fri 9am backup
- laptop dropped ~2:55pm before B was set up. back 3:08pm, B set up + started 3:13pm (study 2 ubi)
- A at 213/352 study 1 replies, then study 2 food topic
- both push alone every 10 min. tonight 11:30pm: open laptop, L40S does the rest
