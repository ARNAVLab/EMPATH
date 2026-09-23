# EMPATH Emotion Model Specification (draft v1)

To review with Dr. Jhala before implementation. Everything here layers on top of
the existing framework without changing baseline behavior (emotion code is
gated behind a condition flag).

## 1. Emotional state

Each agent i carries a state E_i(t) = (e, s) where:
- e in {anger, anxiety, enthusiasm, calm}  (categorical emotion)
- s in [0, 1]  (intensity; calm is defined as s = 0 regardless of label)

Rationale: discrete categories are judgeable by an LLM classifier (needed for
the manipulation check) and map cleanly to appraisal theory. A dimensional
(valence/arousal) variant can be a follow-up ablation if time allows.

Initial state: calm (s = 0) for all agents unless the condition assigns one
(FROZEN condition seeds a fixed emotion per agent).

## 2. Appraisal update (the core contribution)

After agent i hears a new message m from agent j, an appraisal step runs
BEFORE agent i generates its reply. The appraisal is an LLM call with a
structured output, evaluating m from agent i's perspective:

- goal_congruence in [-1, 1]: does m support or attack i's stated opinion?
  (Scherer CPM: goal conduciveness check)
- targetedness in [0, 1]: is m directed at i personally vs the group?
  (CPM: agency/attribution check)
- certainty in [0, 1]: how confident/forceful is m?
  (CPM: coping potential / power check, inverted)

Theory anchors (see SOURCES.md): dimensions map onto Scherer's Component
Process Model appraisal checks; the dynamic-update-vs-static contrast (ON vs
FROZEN) operationalizes Scherer's claim that emotion is a process, not a
state. Closest computational precedent is Marsella & Gratch's EMA (symbolic
appraisal dynamics); EMPATH's difference is LLM-driven appraisal in open-ended
multi-agent discourse. Contagion term grounded in primitive emotional
contagion / behavioral synchronization literature.

Mapping (deterministic given appraisal outputs, from appraisal theory):
- congruence < -0.3 and targetedness high  -> anger
- congruence < -0.3 and certainty high but not targeted -> anxiety
- congruence > 0.3 -> enthusiasm
- otherwise -> decay toward calm

Intensity update: s' = clip(lambda * s + gamma * |congruence| * certainty, 0, 1)
- lambda = decay factor (default 0.7): emotions fade without reinforcement
- gamma = gain (default 0.5): how fast emotions build
Both are config constants, logged per run, and tunable in pilots.

Emotional contagion term (RQ3): if the SPEAKER's expressed emotion (judged
from their message) matches high intensity, add delta = c * s_speaker to the
listener's intensity for the same emotion family, c = contagion coefficient
(default 0.2, set c = 0 as an ablation to isolate contagion from appraisal).

## 3. Expression: how emotion modulates generation

The agent's system prompt gains an emotion block:
"Your current emotional state is {emotion} at intensity {s}. Express this the
way YOUR personality would." plus a per-personality expression hint, e.g.:
- anger + Thinking types: colder, clipped, more absolute claims
- anger + Feeling types: hurt, moralizing, appeals to values
- anxiety + introverts: hedging, withdrawal, shorter replies
- enthusiasm + extraverts: expansive, recruiting others to the view

16 MBTI x 4 emotions = 64 short expression hints (one line each), stored in
config, written once, reviewed by hand.

## 4. Conditions

- OFF: baseline; no emotion code runs (current behavior, byte-identical prompts)
- ON: full model (appraisal + decay + contagion)
- FROZEN: emotion assigned at t=0, never updated (tests "static mood" vs dynamics)
- RANDOM: emotion and intensity resampled uniformly each turn (tests whether
  coherent updates matter or any emotional variation moves opinions)

## 5. Logging (added to each message object in the JSON log)

emotion: {label, intensity, appraisal: {congruence, targetedness, certainty},
expressed_label (from manipulation-check classifier), contagion_delta}

## 6. Manipulation check

A separate classifier call labels each generated message with the emotion it
actually expresses. Report agreement between assigned state and expressed
label per condition. If agreement is low in pilots, strengthen the expression
hints before running the grid.

## 7. Open questions for Dr. Jhala

1. Keep MBTI (inherited from base) or map to Big Five for the paper? MBTI is
   scientifically weaker; reviewers may object. Option: keep MBTI for
   continuity, discuss as limitation, or add trait-level analysis (E/I, T/F).
2. Should opinion_strength update dynamically from judge scores too? In the
   base framework it is static in the prompt. Adding it changes the baseline;
   proposal says reproduce baseline first. Suggest: keep static for the main
   study, note as future work.
3. Is 24 messages enough for emotion dynamics to matter? May need 36-48 for
   the ON condition. Pilot will tell.
4. Appraisal model = generation model, or judge model? (cost vs consistency)

## Addendum (Sep 18 2026 meeting, Dr. Jhala)
- State gains a VAD vector (valence, arousal, dominance in [-1,1]) computed from
  label+intensity: anger (-0.7,+0.8,+0.6), anxiety (-0.6,+0.7,-0.6),
  enthusiasm (+0.8,+0.7,+0.5), calm (0,-0.5,0), each scaled by intensity s.
  Logged per turn; drives avatar color in the demo UI and the VAD trajectory plots.
- Emotion regulation formalized: regulation level r in {low, high} sets
  (lambda, gamma): high = (0.5, 0.3) fast recovery; low = (0.85, 0.7) emotions
  linger and build. In Study 1 (emotion-only), r replaces personality as the
  agent-differentiating trait.
- New condition axis: initial emotional state (enter calm vs enthusiastic vs
  angry at s=0.7). Tests path dependence of group outcomes.
- Study sequence: Study 1 emotion-only (no personality prompts) -> Study 3
  personality x emotion. OFF stays byte-identical to baseline throughout.
