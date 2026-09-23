# EMPATH Source Library
From Rehan's NotebookLM notebook "Cognitive Appraisal and Emotion Modeling in
Social Simulations" (Sep 2026). Role of each source in the paper noted.

## Foundational emotion theory (grounds the emotion model, Sec 2 of paper)
- Bourgais et al., "Emotion Modeling in Social Simulation: A Survey," JASSS 21(2), 2018. https://www.jasss.org/21/2/5.html
  Compares Smith & Lazarus appraisal-coping vs OCC across social sims. Use: taxonomy + justify appraisal choice.
- Scherer, "Emotions are emergent processes: they require a dynamic computational architecture," Phil Trans R Soc B, 2009. https://pmc.ncbi.nlm.nih.gov/articles/PMC2781886/
  Component Process Model: sequential appraisal checks. Use: theoretical basis for our appraisal dimensions and DYNAMIC emotion (decay/update), argues emotion must be computed as a process, exactly our ON vs FROZEN contrast.
- Pfiffelmann, "Appraisal Theory of Emotion" (overview, 2023). https://www.jean-pfiffelmann.com/appraisal-theory-of-emotion/
  History: Arnold -> Lazarus -> Scherer. Use: intro citations.

## Computational emotion models for virtual agents (closest architecture precedents)
- Marsella & Gratch, "EMA: A model of emotional dynamics" (appraisal dynamics), Cognitive Systems Research, 2009. https://www.stacymarsella.org/publications/pdf/N_Emcsr_Marsella.pdf
  THE precedent for appraisal dynamics over time. Our differentiator: EMA is symbolic/rule-based over a causal interpretation; EMPATH does LLM-driven appraisal in open-ended multi-agent discourse.
- Mascarenhas et al., "FAtiMA Toolkit," arXiv 2103.03020, 2021.
  OCC-based agent architecture toolkit. Use: related work; shows demand for reusable emotion-agent tooling (our open-source release mirrors this).
- "Intelligent Agents with Emotional Intelligence: Current Trends, Challenges, and Future Prospects," arXiv 2511.20657, Nov 2025.
  Survey BDI->LLM transition. Use: positions EMPATH in the current wave.

## Human-agent emotion interaction (motivates contagion mechanism)
- "The Effect of Empathic Expression Levels in Virtual Human Interaction: A Controlled Experiment," arXiv 2512.20221, Dec 2025 (n=70).
  Use: controlled-experiment design precedent for expression-level manipulation.
- Paiva et al., "Empathy in virtual agents and robots: A survey," ACM TiiS, 2017. https://researchportal.ulisboa.pt/en/publications/empathy-in-virtual-agents-and-robots-a-survey/
  Use: empathy/contagion definitions.
- "Empathic Responses of Behavioral-Synchronization in Human-Agent Interaction," CMC 71(2), 2022. https://www.techscience.com/cmc/v71n2/45877/html
  Primitive emotional contagion (chameleon effect). Use: grounds our contagion term (c coefficient).

## LLMs and emotion (feasibility + evaluation methodology)
- "Large Language Models have Chain-of-Affective (LLMs-CoA)," arXiv 2512.12283, Dec 2025.
  Multi-turn longitudinal emotional evaluation of LLMs. Use: closest methodology for tracking emotion across turns; compare metrics.
- "AI with Emotions: Exploring Emotional Expressions in Large Language Models," arXiv 2504.14706, NAACL NLP4DH 2025.
  GPT/Gemini/Llama3 can express specified emotional states measurably. Use: feasibility evidence for our manipulation check; note Llama3 is evaluated (supports our Ollama dev setup).
- "MME-Emotion" benchmark, arXiv 2508.09210, ICLR 2026.
  Emotional intelligence benchmark. Use: related work on emotion evaluation.

## Also in notebook
- NotebookLM research report "Emotional Appraisal in Humans and Virtual Agents" (synthesis note, content mirrored above).
- Base paper: Talekar & Jhala ACS 2025 (this folder).
