# Mentor meeting notes: Dr. Jhala, Sep 18 2026
Decisions and directives, cleaned up.

1. VAD representation. Track each agent's emotion in Valence-Arousal-Dominance
   space alongside the discrete label. Plot VAD trajectories per turn per agent.
   Mapping (label+intensity -> VAD): anger = (-V, +A, +D); anxiety = (-V, +A, -D);
   enthusiasm = (+V, +A, +D); calm = (~0V, -A, ~0D). Intensity scales the vector.

2. Emotion avatars in the chat UI (tech demo). Avatar color driven by VAD with a
   defensible mapping: valence -> hue (red negative to warm/green positive),
   arousal -> saturation/brightness, dominance -> optional size/posture cue.
   "Red face = high arousal negative" is the canonical example. Needs citations
   from color-emotion psychology literature; craft the mapping as an argument.

3. Study sequence (replaces single-study design):
   - Study 1: EMOTION ONLY. No personality prompts. Agents differ in assigned
     emotion and in emotion regulation (maps to our decay/gain constants:
     high regulation = fast decay + low gain). Establish emotion's solo effect.
   - Study 2: literature bridge. Psychology findings connecting personality and
     emotion (neuroticism <-> negative affect, extraversion <-> positive affect,
     Gross emotion regulation; MBTI-Big Five bridge via Furnham, already cited
     in base paper).
   - Study 3: PERSONALITY x EMOTION combined (the original EMPATH design).

4. The experiment is a 3D matrix ("the cube"):
   - Axis A: emotion configuration (label, regulation level, ON/OFF/etc.)
   - Axis B: topic type (completely neutral/objective vs emotionally charged)
   - Axis C: starting state (agents enter happy/excited vs angry/in disagreement)
   Also: initial-state path dependence is itself a question (does entering angry
   change the endpoint, not just the path?).

5. Logistics: consider a VM for overnight Ollama runs (Mac + caffeinate works
   now; ask about lab GPU machine).

Implications for existing docs:
- EMOTION_MODEL.md: add VAD vector to state + logging; regulation parameter
  formalized as (lambda, gamma) presets; initial emotional state as a condition.
- RESEARCH_PLAN.md: restructure conditions into Study 1 / Study 3 grids; add
  starting-state axis; topic set needs an "emotionally charged" topic beyond the
  original three types (discuss candidates with Dr. Jhala).
- Tech demo = the avatar chat UI + VAD trajectory panel.
