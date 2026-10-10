# Study 0: baseline reproduction (gpt-oss-20b, Oct 9 2026)

24 debates (8 personality groups x 3 topics), original framework, no emotion.
Generation and judge: gpt-oss-20b via Ollama on VCL L40S. Judge temperature 0.
Runtime: 204 s per debate on average, 82 min total. Judge parse failures: 0/576.
Character breaks: 0 (the 3B model broke character in 4 of 7 runs).

| Paper's pattern | Our result | Verdict |
| --- | --- | --- |
| Universal topic converges to agreement | Mean final opinion 0.89, mean final variance 0.07 | Pass |
| Debatable topic settles near neutral | Mean final 0.26, but runs split both ways (variance 0.47) | Partial |
| Controversial topic polarizes to extremes | Every run drifted negative (mean -0.53); none went positive | Partial |
| Flexible types move more than rigid types | Mean change: HighFlex 0.29, ModFlex 0.38, ModRigid 0.32, HighRigid 0.25 | Weak |

Notes
- gpt-oss shows a stance bias against the controversial statement (colonize
  other planets instead of fixing Earth): groups converge against it rather than
  splitting. Akbar et al. (2026) report similar per-model stance biases.
- The debatable topic (UBI) keeps real disagreement going, which makes it a
  better "charged" topic for testing whether emotion affects polarization.
- The flexibility ordering is weak with n = 12 to 33 agents per tier; only the
  most rigid tier moves least.
