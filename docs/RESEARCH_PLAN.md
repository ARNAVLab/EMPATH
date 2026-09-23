# EMPATH Research Plan
Emotion-Modulated Personality Agents in Threaded Discourse
Rehan Mohammed, mentor Dr. Arnav Jhala, CSC 499 Fall 2026
Goal: a publishable paper, not just a course deliverable.

## Research questions
- RQ1: Does layering a dynamic emotional state on fixed-personality LLM agents change opinion dynamics (convergence, polarization, persuasion) relative to a personality-only baseline?
- RQ2: Which emotional states matter, and how do they interact with personality traits? (e.g., does anger make high-agreeableness agents fold or dig in?)
- RQ3: Does emotion spread between agents (emotional contagion), and does contagion mediate opinion change?

RQ3 is the strongest paper wedge: emotion as a persuasion channel and contagion as a mechanism. Nobody nearby has done a controlled personality-only vs personality+emotion comparison in threaded opinion discourse.

## Base paper (what we reproduce and extend)
Talekar & Jhala, "Multi-turn Opinion Dynamics Simulation," ACS 2025 (pp. 162-177).
PDF in this folder. Key facts:
- Primary model Gemini 1.5 Flash, validated with GPT-4 (repo now defaults to gpt-4.1-mini).
- 4-agent cohorts, weighted MBTI sampling, 6 rounds, judge scores each message -1..1.
- Four flexibility tiers: Highly Rigid {INTJ,ENTJ,ISTJ,ESTJ}, Moderately Rigid {ENFJ,ISFJ,ISTP,ESTP}, Moderately Flexible {INFJ,INTP,ESFJ,ISFP}, Highly Flexible {ENFP,ENTP,INFP,ESFP}.
Baseline reproduction targets (qualitative, since our model differs):
1. Universal facts: rapid convergence toward strong agreement.
2. Debated assertions: stabilize around neutrality/moderate positions.
3. Controversial: polarization toward opposite extremes.
4. Flexibility ordering in opinion deltas: Highly Flexible >> Highly Rigid.
Known paper-vs-code discrepancy TO RESOLVE with Nitish: Algorithm 1 says the judge
score UPDATES the agent's opinion (a_i.opinion <- score), but the current repo keeps
opinion_strength static in the prompt and only logs judge scores. Ask which version
produced the paper's results before reproducing.
Paper's own caveats we improve on: single-model dependence, prompt-specific results,
no repeated seeds reported, judge = same model as generation.

## Positioning (closest prior work, to cite and differentiate)
- Emergent emotional contagion among LLM agents in crowd simulation (arXiv 2607.25140): contagion in crowds, not opinion discourse, no personality baseline.
- Personality and emotion in multi-agent software teams (arXiv 2607.05659): task performance, not opinion dynamics.
- Opinion dynamics via LLM dialog simulation (arXiv 2602.12583) and language-driven opinion dynamics (arXiv 2502.19098): opinion dynamics but no dynamic emotion layer.
- Big Five personality LLM agent studies (arXiv 2402.01765, 2503.15497): personality only.
- DEBATE benchmark (arXiv 2510.25110, Oct 2025): 36k human messages, 708 groups. Finds LLM agent groups OVER-CONVERGE and over-moderate vs humans. No emotion. USE AS MOTIVATION: missing affect is a candidate cause of over-convergence; EMPATH tests whether emotion dynamics slow convergence / sustain polarization, i.e. more human-like dynamics.
- Emotional Cognitive Modeling Framework (arXiv 2510.13195): emotion-desire-behavior loop in timestep economic sims; no conversation, no opinion dynamics, no personality.
- E-STEER mechanistic emotion study (arXiv 2604.00005): hidden-state emotion steering in single models; no multi-agent discourse.
Our gap (checked again 2026-09-17, still open): dynamic appraisal-based emotion x personality x opinion dynamics in threaded multi-agent discourse, with FROZEN/RANDOM ablations and contagion measurement. Nobody occupies the intersection.
Novelty sharpeners: (1) frame vs DEBATE's over-convergence finding, directional realism claim; (2) contagion-mediates-persuasion is an untested mechanism claim; (3) LLM-as-appraiser over raw dialogue (vs EMA's symbolic rules) is an architectural first; (4) the ablation design isolating appraisal from emotion wording is itself a methods contribution.

## Emotion model (design to confirm with Dr. Jhala)
- State: discrete emotion in {anger, anxiety, enthusiasm, calm} plus intensity in [0,1]. Grounded in appraisal theory (Scherer/Lazarus); contagion mechanics from Hatfield et al.
- Update: after each turn, an appraisal step evaluates the last message against the agent's goals/opinion (goal-congruence, agency, certainty) and outputs new emotion + intensity. Decay toward calm at rate d per turn so emotions do not saturate.
- Modulation: the emotion state is injected into the agent's generation prompt as behavioral guidance conditioned on personality (personality determines HOW an emotion expresses, e.g., anger + high agreeableness = withdrawal vs anger + low agreeableness = attack).
- Keep the update rules explicit and loggable so runs are reproducible and the mechanism is inspectable.

## Experimental design
Conditions (fully crossed where budget allows):
1. Emotion layer: OFF (baseline) / ON / two ablations: FROZEN (initial emotion never updates) and RANDOM (emotion updates randomly). Ablations prove the appraisal rules, not mere emotion words, drive effects.
2. Topic type: universal / debatable / controversial (reuse base framework's topics).
3. Personality composition: homogeneous vs mixed profiles (reuse base framework's profiles).
- N seeds per cell: at least 10 runs; fixed generation model and temperature; judging model DIFFERENT from generation model to avoid self-preference bias.

## Metrics
- Opinion strength per agent per turn (LLM judge, existing pipeline).
- Convergence: turns to stable group opinion; final opinion variance (polarization).
- Persuasion events: sign flips / crossings of opinion threshold.
- Emotion trajectory per agent; manipulation check: does generated text actually express the assigned emotion (separate classifier judge)? Without this the reviewers will not believe the manipulation.
- Contagion: lagged cross-correlation of emotion states between agents; contagion coefficient per pair.
- Judge reliability: re-judge a 10% sample twice + human spot check (Rehan) on a subsample; report agreement.

## Analysis
- Mixed-effects models (or two-way ANOVA) with condition and topic type as factors, run as random effect; bootstrap CIs on convergence/polarization deltas. Report effect sizes, not just p-values.

## Publication targets (discuss with Dr. Jhala)
- AIIDE 2027 (Jhala's community; the base paper's references are AIIDE-heavy and it frames NPC/narrative applications)
- ACS 2027 (where the base paper was published; natural venue for the follow-up)
- AAMAS 2027 full paper or extended abstract (deadline ~Oct 2026 is likely too early for full results; check exact date)
- IVA 2027 (virtual agents + emotion, strong fit)
- Fallback/first shot: a workshop paper (e.g., social simulation or affective computing workshop) from the midterm results, then the full venue.

## Timeline (maps to proposal)
- Now-8/31: base repo reproduced, lit review notes
- 9/14: emotion model spec finalized with mentor
- 9/28: emotion + appraisal integrated
- 10/13: pilot runs, fix judge reliability
- 11/2: full experiment grid
- 11/9: analysis
- 11/23: writeup (Thanksgiving buffer)
- 12/7: open-source release, report, demo, poster

## Risks (from proposal, plus mitigations)
- Emotion/personality confound in text: manipulation-check classifier + FROZEN/RANDOM ablations isolate the update mechanism.
- Judge noise: separate judge model, repeated judging, reliability reporting.
- Emotion drift over long chats: decay term + intensity caps; log everything.
- API cost: estimate cost per run after pilot; trim grid before scaling.

## Immediate blockers
1. PersonalityConvSim repo is private (404 unauthenticated). Need ZIP or access.
2. Which LLM API + key/budget for experiments (the grid is hundreds of runs).

## Restructure per Sep 18 mentor meeting (see MEETING_2026-09-18_jhala.md)
Study 1 (emotion-only): no personality prompts. Factors: emotion condition
(OFF/ON/FROZEN/RANDOM) x regulation (high/low) x topic (neutral vs charged) x
initial state (calm/enthusiastic/angry). Agents identical except emotion config.
Study 2 (lit bridge): personality-emotion psychology review, no new sims.
Study 3 (personality x emotion): original design, now informed by Study 1 effect
sizes to trim the grid. New measurements: VAD trajectory per agent per turn;
path-dependence analysis (initial state -> final group opinion). Tech demo:
avatar chat UI, VAD-to-color mapping with citations.
