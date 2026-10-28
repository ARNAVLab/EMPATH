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
