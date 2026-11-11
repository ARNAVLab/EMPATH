"""Pick the debate setup and emotion format for Studies 2 and 3.

Setup: from the calibration debates (emotion OFF only). A setup is eligible
if agents argue their assigned side in round 1 at least 75% of the time. Among
eligible setups, take the one whose average opinion movement is closest to
0.5, i.e. furthest from both "nobody moves" (0) and "everyone ends on one
side" (about 1), so emotion can push the outcome either way.

Format: from Study 1. The format whose replies most often show the emotion
that was set (expressed == target). Ties go to label.

Writes results/calibration/choice.json and choice.env.
"""
import glob, json, os, statistics as st
from collections import defaultdict

ORDER = ["cal-strict-uo", "cal-soft-uo", "cal-soft", "cal-none-uo"]
FLAGS = {
    "cal-strict-uo": ("strict", "1"),
    "cal-soft-uo": ("soft", "1"),
    "cal-soft": ("soft", ""),
    "cal-none-uo": ("none", "1"),
}


def setup_stats():
    by = defaultdict(list)
    for f in glob.glob("results/calibration/*.json"):
        if os.path.basename(f) == "choice.json":
            continue
        j = json.load(open(f))
        if "messages" not in j:
            continue
        side = {c["name"]: c["opinion_strength"] for c in j["characters"]}
        msgs = [m for m in j["messages"] if m.get("role") and m.get("values", {}).get("opinion") is not None]
        if len(msgs) < len(side):
            continue
        finals = {k: v[-1]["y"] for k, v in j["chartData"].items()}
        r1 = msgs[: len(side)]
        by[j["meta"]["label"]].append(
            {
                "r1_hold": sum(m["values"]["opinion"] * side[m["role"]] > 0 for m in r1) / len(r1),
                "moved": st.mean(abs(finals[k] - side[k]) for k in side if k in finals),
                "spread": st.pstdev(finals.values()),
            }
        )
    return {
        k: {m: round(st.mean(x[m] for x in v), 3) for m in ("r1_hold", "moved", "spread")} | {"n": len(v)}
        for k, v in by.items()
    }


def format_stats():
    rows = []
    for f in glob.glob("results/study1/*.jsonl"):
        rows += [json.loads(l) for l in open(f) if l.strip()]
    out = {}
    for fmt in ("label", "vad", "description"):
        r = [x for x in rows if x.get("format") == fmt]
        if r:
            out[fmt] = {"n": len(r), "match": round(sum(x["expressed"] == x["target_label"] for x in r) / len(r), 3)}
    return out


def main():
    setups = setup_stats()
    formats = format_stats()

    pick = "cal-strict-uo"
    if setups:
        have = [k for k in ORDER if k in setups]
        ok = [k for k in have if setups[k]["r1_hold"] >= 0.75]
        if ok:
            pick = min(ok, key=lambda k: (abs(setups[k]["moved"] - 0.5), ORDER.index(k)))
        elif have:
            pick = max(have, key=lambda k: (setups[k]["r1_hold"], -ORDER.index(k)))
    rules, uo = FLAGS[pick]

    fmt = "label"
    if formats:
        fmt = max(formats, key=lambda k: (formats[k]["match"], k == "label"))

    os.makedirs("results/calibration", exist_ok=True)
    choice = {"setup": pick, "rules": rules, "update_opinion": bool(uo), "format": fmt, "setups": setups, "formats": formats}
    json.dump(choice, open("results/calibration/choice.json", "w"), indent=2)
    open("results/calibration/choice.env", "w").write(f"RULES={rules}\nUO={uo}\nFORMAT={fmt}\n")
    print(json.dumps(choice, indent=2))


if __name__ == "__main__":
    main()
