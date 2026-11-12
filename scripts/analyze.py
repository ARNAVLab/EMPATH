"""Summarize EMPATH debate logs.

  python3 scripts/analyze.py results/pilot2 [results/study2 ...] [--plots DIR]

Per condition (meta.label): debates, final opinion mean and spread, how far
agents moved from their start, how often they argued their assigned side,
emotion-check match rate, and share of list-style (bullet/number) messages.
With --probe or self-update runs, also the agents' own private answers
(belief). Also prints one emoji line per emotion debate.
"""
import json, glob, os, re, sys, statistics as st
from collections import defaultdict

EMOJI = {"anger": "😠", "anxiety": "😰", "enthusiasm": "😄", "calm": "😐", None: "·"}
LIST_RE = re.compile(r"\n\s*(\d+\.|[-*•]\s|\|)")


def load(dirs):
    runs = []
    for d in dirs:
        for f in sorted(glob.glob(os.path.join(d, "*.json"))):
            j = json.load(open(f))
            if "messages" in j:
                j["_file"] = f
                runs.append(j)
    return runs


def summarize(run):
    side = {c["name"]: c["opinion_strength"] for c in run["characters"]}
    msgs = [m for m in run["messages"] if m.get("role") and m.get("values", {}).get("opinion") is not None]
    finals = {k: v[-1]["y"] for k, v in run["chartData"].items()}
    r1 = msgs[: len(side)]
    emo = [m["emotion"] for m in msgs if m.get("emotion")]
    checked = [e for e in emo if e.get("expressed")]
    bel = run.get("beliefData") or {}
    bfin = {k: v[-1]["y"] for k, v in bel.items() if v}
    return {
        "bfinals": list(bfin.values()),
        "bspread": st.pstdev(bfin.values()) if bfin else None,
        "bmove": st.mean(abs(bfin[k] - side[k]) for k in side if k in bfin) if bfin else None,
        "finals": list(finals.values()),
        "spread": st.pstdev(finals.values()),
        "move": st.mean(abs(finals[k] - side[k]) for k in side if k in finals),
        "same_sign": len({(v > 0) - (v < 0) for v in finals.values()}) == 1,
        "r1_hold": sum(m["values"]["opinion"] * side[m["role"]] > 0 for m in r1) / max(1, len(r1)),
        "all_hold": sum(m["values"]["opinion"] * side[m["role"]] > 0 for m in msgs) / max(1, len(msgs)),
        "lists": sum(bool(LIST_RE.search(str(m.get("content", "")))) for m in msgs) / max(1, len(msgs)),
        "match": (sum(e["label"] == e["expressed"] for e in checked), len(checked)),
        "emoji": "".join(EMOJI.get(e["label"], "?") for e in emo),
    }


def pct(x):
    return f"{round(100 * x)}%"


def main():
    args = sys.argv[1:]
    plots = None
    if "--plots" in args:
        i = args.index("--plots")
        plots = args[i + 1]
        args = args[:i] + args[i + 2 :]
    runs = load(args)
    by = defaultdict(list)
    for r in runs:
        m = r["meta"]
        key = (m.get("label") or m.get("condition", "?"), m.get("topic_type", "?"))
        by[key].append((r, summarize(r)))

    print("| condition | topic | n | final mean | spread | moved | all same side | round-1 side held | side held | lists | emotion check | belief final | belief spread | belief moved |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for (label, topic), rs in sorted(by.items()):
        s = [x[1] for x in rs]
        b = [x for x in s if x["bfinals"]]
        hits = sum(x["match"][0] for x in s)
        tot = sum(x["match"][1] for x in s)
        print(
            f"| {label} | {topic} | {len(s)} | {st.mean(v for x in s for v in x['finals']):+.2f} | "
            f"{st.mean(x['spread'] for x in s):.2f} | {st.mean(x['move'] for x in s):.2f} | "
            f"{sum(x['same_sign'] for x in s)}/{len(s)} | {pct(st.mean(x['r1_hold'] for x in s))} | "
            f"{pct(st.mean(x['all_hold'] for x in s))} | {pct(st.mean(x['lists'] for x in s))} | "
            f"{f'{hits}/{tot} ({pct(hits / tot)})' if tot else '-'} | "
            + (
                f"{st.mean(v for x in b for v in x['bfinals']):+.2f} | {st.mean(x['bspread'] for x in b):.2f} | {st.mean(x['bmove'] for x in b):.2f} |"
                if b
                else "- | - | - |"
            )
        )

    print("\nEmotion per turn (😠 anger 😰 anxiety 😄 enthusiasm 😐 calm):")
    for (label, topic), rs in sorted(by.items()):
        for r, x in rs:
            if x["emoji"]:
                print(f"  {label} {topic} g{r['meta'].get('run_index', r['meta'].get('group_index'))}: {x['emoji']}")

    if plots:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        os.makedirs(plots, exist_ok=True)
        for (label, topic), rs in sorted(by.items()):
            fig, ax = plt.subplots(figsize=(6, 3.5))
            for r, _ in rs:
                for name, pts in r["chartData"].items():
                    ax.plot([p["x"] for p in pts], [p["y"] for p in pts], color="#4a6fa5", alpha=0.35, lw=1.2)
            ax.set_ylim(-1.1, 1.1)
            ax.axhline(0, color="#999", lw=0.8)
            ax.set_xlabel("round")
            ax.set_ylabel("opinion")
            ax.set_title(f"{label} | {topic} | n={len(rs)}", fontsize=10)
            fig.tight_layout()
            fig.savefig(os.path.join(plots, f"{label}_{topic}.png"), dpi=150)
            plt.close(fig)
        print(f"\nPlots saved to {plots}")


if __name__ == "__main__":
    main()
