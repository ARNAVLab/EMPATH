# Mentor meeting notes: Dr. Jhala, Oct 6 2026

Compute
- Use open models: Qwen or DeepSeek. Jhala runs gpt-oss-20b (OpenAI open-weight).
- VCL: GPU images available (Ubuntu 24 + NVIDIA L40S 48GB; Ubuntu 22 + RTX 2080 Ti 11GB). He can open multiple VCL reservations for parallel experiments.
- Fallbacks: a lab gaming PC he can book; NCSU ARC cluster node; Hazel cluster.

Design decisions
- Stubbornness is part of personality. Do not change it (the original paper's authors want personality left as is). Emotion must not override personality prompts.
- Decision #1: how emotion is represented to the agent: (a) prompt description, (b) label, (c) valence/arousal/dominance vector. Or try all three and compare.
- Use the same set of generated discussion points, add emotion labels to them (hold content fixed, vary emotion).
- Define the instruction given to each agent.
- Define the output: visualization after each turn? an emoji sequence?
- Define the analysis.
- Long term: emotion-tuned (fine-tuned) models, combined with personality, compare results.

Repo
- Fork Nitish's repo into the same org (later).

Action: create a shared doc covering emotion representation, prompts, labels, VAD, instructions, outputs, visualization, analysis.
