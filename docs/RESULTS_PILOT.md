# Emotion pilot (Oct 10 2026, gpt-oss-20b, VCL L40S)

Emotion-only agents (no personality; 2 high and 2 low regulation), UBI topic,
3 debates per condition, original prompt plus emotion line (label format).

| | Emotion off | Emotion on, start angry |
| --- | --- | --- |
| Final group opinion, mean of 3 | 0.82 | 0.99 |
| Final spread (variance), mean | 0.086 | 0.001 |
| Emotion check: expressed = assigned | n/a | 55/72 (76%) |
| First message on assigned side | 7/12 | 5/12 |

- Emotion on pushed groups to full agreement faster. Agents start angry, early
  agreement turns into enthusiasm, enthusiasm spreads, and all four agents
  are enthusiastic and pro-UBI by round 2 or 3.
- Confounds: agents ignore their assigned side about half the time, and anger
  vanished after the opening because of the targetedness rule. Both fixed for
  the next pilot (debate rules, coping-based anger rule).
- n = 3 per condition: a lead to test, not a result.
