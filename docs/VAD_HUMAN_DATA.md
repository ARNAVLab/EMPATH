# VAD values from human data

Sources
- NRC VAD Lexicon (Mohammad, 2018): about 20,000 English words, human ratings via
  best-worst scaling, scale 0 to 1. https://saifmohammad.com/WebPages/nrc-vad.html
- Warriner, Kuperman and Brysbaert (2013): 13,915 English lemmas, about 20 human
  ratings per word, scale 1 to 9.
Rescaled to -1..1: NRC x -> 2x - 1; Warriner x -> (x - 5) / 4.

| Word | NRC V | NRC A | NRC D | Warriner V | Warriner A | Warriner D |
| --- | --- | --- | --- | --- | --- | --- |
| angry | 0.12 | 0.83 | 0.60 | 2.53 | 6.20 | 4.11 |
| furious | 0.06 | 0.95 | 0.60 | 2.57 | 6.09 | 3.89 |
| anxious | 0.28 | 0.88 | 0.43 | 3.80 | 6.20 | 4.15 |
| nervous | 0.23 | 0.82 | 0.21 | 3.56 | 5.51 | 4.02 |
| enthusiastic | 0.89 | 0.87 | 0.85 | 7.55 | 5.90 | 6.21 |
| excited | 0.91 | 0.93 | 0.71 | 8.11 | 6.43 | 7.33 |
| calm | 0.88 | 0.10 | 0.28 | 6.89 | 1.67 | 7.44 |
| relaxed | 0.86 | 0.09 | 0.38 | 7.25 | 2.49 | 7.09 |
| happy | 1.00 | 0.73 | 0.77 | 8.47 | 6.05 | 7.21 |
| sad | 0.23 | 0.33 | 0.15 | 2.10 | 3.49 | 3.84 |
| proud | 0.91 | 0.70 | 0.87 | 7.00 | 5.55 | 7.09 |
| bored | 0.15 | 0.17 | 0.20 | 2.95 | 3.65 | 4.96 |

Our four emotions, NRC adjective form rescaled to -1..1, vs current hand-set anchors
| Emotion | Human V | Human A | Human D | Current anchor (V, A, D) |
| --- | --- | --- | --- | --- |
| Anger (angry) | -0.76 | +0.66 | +0.20 | -0.7, +0.8, +0.6 |
| Anxiety (anxious) | -0.44 | +0.76 | -0.14 | -0.6, +0.7, -0.6 |
| Enthusiasm (enthusiastic) | +0.78 | +0.74 | +0.70 | +0.8, +0.7, +0.5 |
| Calm (calm) | +0.76 | -0.80 | -0.44 | 0.0, -0.5, 0.0 |

Notes
- Valence and arousal agree in sign across both datasets for all four words.
- Dominance is the weakest dimension: NRC and Warriner disagree in sign for
  angry and calm.
- Human data puts calm as clearly pleasant (our anchor had it neutral) and shows a
  smaller dominance gap between anger and anxiety than our anchors assumed.
- Lexicons rate words, not felt states; they are a reference point, not ground truth.
