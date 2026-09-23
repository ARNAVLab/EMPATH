# EMPATH Study Guide
What we are building, every method and algorithm involved, and what to read.

## 1. The project in one paragraph
The base framework (Talekar & Jhala 2025) puts 4 LLM agents with fixed MBTI
personalities in a round-robin debate; a judge LLM scores every message from
-1 (opposes topic) to +1 (supports). They showed topic type and personality
flexibility shape group opinion. EMPATH adds the thing their agents lack: a
dynamic emotional state that updates every turn based on what the agent just
heard, and modulates how it argues. We then measure whether (and how) emotion
changes opinion dynamics, with ablations that isolate the mechanism. That
comparison is the paper.

## 2. The base algorithm (what exists today)
Per simulation:
1. Sample 4 MBTI personalities (weighted by population prevalence), build
   characters, alternate initial opinions +1/-1, shuffle order.
2. LangGraph cycle A->B->C->D->A... Each turn: build prompt (name, profession,
   personality paragraph, INITIAL opinion strength, full conversation history),
   generate reply, judge scores reply, log {message, score, turn}. Stop at 24
   messages (6 rounds).
3. Analysis: average opinion per turn, per topic type; opinion delta per
   personality (turn6 - turn1); heatmaps and participation charts.
Known quirk: the prompt's opinion_strength never updates from judge scores
(paper's Algorithm 1 implies it should; code doesn't). Open question for Nitish.

## 3. The EMPATH additions (what we build)
State per agent i: E_i = (label in {anger, anxiety, enthusiasm, calm},
intensity s in [0,1]).

APPRAISAL (runs before agent i replies, on the message m it just heard).
One structured LLM call rates m from i's perspective:
- congruence c in [-1,1]: does m support i's position? (Lazarus primary
  appraisal / Scherer goal-conduciveness)
- targetedness t in [0,1]: is m aimed at i personally? (OCC agency: separates
  anger from anxiety)
- certainty k in [0,1]: how forceful/confident is m? (Scherer coping potential)

EMOTION RULE (deterministic given appraisal output):
- c < -0.3 and t high  -> anger
- c < -0.3 and k high, not targeted -> anxiety
- c > 0.3 -> enthusiasm
- else decay toward calm
Intensity: s' = clip(lambda*s + gamma*|c|*k, 0, 1), lambda=0.7 decay, gamma=0.5 gain.
CONTAGION: s' += contagion_c * s_speaker (same emotion family), contagion_c=0.2.
All constants logged per run and tuned in pilots.

EXPRESSION: the emotion (label + intensity) is injected into the generation
prompt with a per-personality hint (anger expresses differently in an INTJ vs
an ENFP). 64 hints total (16 MBTI x 4 emotions).

CONDITIONS (independent variable):
- OFF: baseline, no emotion code (byte-identical to base framework)
- ON: full model above
- FROZEN: initial emotion, never updates (is DYNAMICS necessary, or does any
  emotion label do?)
- RANDOM: emotion resampled randomly each turn (are COHERENT updates
  necessary, or does any variation do?)
If ON differs from OFF but also from FROZEN and RANDOM, the appraisal
mechanism itself matters. That is the publishable claim.

## 4. Measurements (dependent variables)
- Opinion trajectory: judge score per agent per turn (existing pipeline).
- Convergence: turns until group opinion variance stops shrinking; final
  variance = polarization.
- Persuasion events: count of agents crossing 0 (side switches).
- Emotion trajectory: (label, s) per agent per turn.
- Contagion: lagged cross-correlation between agents' intensity series; a
  contagion coefficient per pair. RQ3 = does contagion predict persuasion?
- Manipulation check: separate classifier labels each message's EXPRESSED
  emotion; report agreement with assigned state. Proves the manipulation is
  real, reviewers demand this.
- Judge reliability: re-judge a sample, report agreement; judge model !=
  generation model, temperature 0.

## 5. Statistics
Grid: 4 conditions x 3 topic types x N groups, >=10 seeds per cell.
Two-way ANOVA (or mixed-effects model with run as random effect) on
convergence time and final polarization; bootstrap CIs on deltas; effect
sizes (eta squared / Cohen's d), not just p-values.

## 6. Reading order (13 sources, triaged)
READ PROPERLY (4):
1. Talekar & Jhala 2025 (the base paper, in this folder). You must know it
   cold: Algorithm 1, the 4 flexibility tiers, Figs 6-9, its limitations
   paragraph. ~1 hour.
2. Pfiffelmann, Appraisal Theory of Emotion (the web overview). Easiest
   entry; Arnold -> Lazarus -> Scherer in plain language. ~20 min.
3. Scherer 2009 "Emotions are emergent processes" (PMC). Read the intro and
   the CPM description; skim the neuroscience. This is our core theory
   citation: emotion as process, not state. ~45 min.
4. Marsella & Gratch EMA paper. Read Sections on appraisal dynamics and the
   architecture; skim the evaluation. Closest computational ancestor; know
   how we differ (symbolic rules over a causal model vs LLM appraisal over
   raw dialogue). ~45 min.
SKIM (3):
5. JASSS 2018 Emotion Modeling in Social Simulation survey: read the
   framework-comparison sections (Lazarus vs OCC), skip the simulation zoo.
6. FAtiMA Toolkit paper: intro + architecture figure. It is cite-and-move-on.
7. LLMs-CoA (2512.12283): methods section only, for multi-turn emotion
   evaluation ideas worth borrowing.
CITE ONLY, read abstracts (6):
8. Intelligent Agents with Emotional Intelligence survey (2511.20657)
9. AI with Emotions (2504.14706), one useful fact: Llama3 can express
   specified emotions measurably, which validates our dev model choice
10. MME-Emotion benchmark (2508.09210)
11. Empathic Expression Levels experiment (2512.20221)
12. Paiva empathy survey (2017)
13. Behavioral-synchronization/contagion paper (2022), grounds the contagion
    coefficient; skim its contagion definition.

## 7. Vocabulary you should be able to use in a meeting
Appraisal (evaluation of an event's relevance to MY goals, which produces
emotion); primary/secondary appraisal (does it matter / can I cope); OCC
(appraisal decision tree: event-consequences vs agent-actions vs objects;
anger = blameworthy other-agent action harming my goals); CPM (emotion as a
sequence of appraisal checks, continuously recomputed); emotional contagion
(catching emotion from an interaction partner); manipulation check
(experimental proof your treatment actually happened); ablation (removing one
mechanism to show it carried the effect).
