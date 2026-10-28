# EMPATH rough notes

## Aug 28 - Sep 18
- read proposal + base paper (Talekar & Jhala, ACS 2025)
- base code = Next.js + LangGraph, 4 MBTI agents, 24 msgs, judge scores -1..1
- wrote research plan, emotion spec, sources, study guide
- found: base code never updates opinion in prompt (paper says it does) -> open q
- Jhala mtg 9/18: add VAD, emoji avatars, emotion-only study first, 3D matrix

## Sep 23 - Sep 24
- swappable model backend + batch runner
- moved runs to VCL (no GPU), llama 3B -> too weak, 24 min/debate
- 7 debates on 3B: didn't match paper

## Oct 6 - Oct 9
- Jhala mtg 10/6: use open models (gpt-oss / qwen), stubbornness stays in personality, decide emotion format (label / VAD / description)
- repo moved to ARNAVLab/EMPATH, only Rehan as author
- design doc + project plan (Google Doc)
- VCL L40S GPU image, setup script, auto-save script
- Study 0 (baseline) on gpt-oss: 24 debates, ~3.4 min each
- built emotion layer (appraisal, VAD, 3 formats, emotion check)

## Oct 10 - Oct 12
- Study 0 result: partial match (universal ok, others blurry)
- found: agents ignore assigned side ~50%, debates turn into planning by end
- emotion test debate: works, 88% emotion check match
- pilot 1 (6 debates): emotion ON -> faster full agreement ("snowball")
- gemini: 1.5 flash gone, free tier rate limits -> 0 debates saved
- fixes: anger via coping, no maxing out at 1.0, debate-rules flag

## Oct 26 - Oct 28
- Jhala comment: VAD values from human data -> NRC + Warriner lexicons, docs/VAD_HUMAN_DATA.md
- calm is pleasant in human data, anger vs anxiety close on dominance
- Oct 28: VCL session, cloned fixed code, token saved -> starting pilot 2
