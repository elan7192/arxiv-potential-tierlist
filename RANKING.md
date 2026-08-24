# Future-potential ranking

This corpus ranks papers by **room for further development**, not citation prestige or venue quality.

Formula is deterministic keyword / metadata heuristics. No per-paper LLM. The website can show these weights as-is.

Collected date used for recency: **2026-08-23** (UTC). Re-run `rank.py` after a later harvest to refresh scores.

## Output fields

| field | meaning |
| --- | --- |
| `potential_score` | 0–100 float, higher = more future runway |
| `potential_tier` | S ≥ 80, A ≥ 68, B ≥ 52, C ≥ 38, D < 38 |
| `potential_reasons` | 1–3 tags from a fixed vocabulary |
| `recency_boost` | 0–30 contribution from publication date |
| `openness_boost` | 0–15 unfinished / preprint / workshop signal |
| `generality_boost` | 0–20 general-method keyword signal |

## Score

```
score = clamp(0, 100,
    38
    + recency_boost          # 0..30
    + generality_boost       # 0..20
    + openness_boost         # 0..15
    + early_field_boost      # 0..12
    + novelty_boost          # 0..8
    - saturation_penalty     # 0..28
)
```

### Recency (logistic, last 18 months strongest)

Let `age_days` be days from `published` to 2026-08-23.

```
recency_boost = 30 / (1 + exp((age_days - 400) / 140))
```

- ~0–6 months: ~27–30
- ~18 months (`age_days`≈547): ~11
- ~4+ years: approaches 0

Missing date → `recency_boost = 8`.

### Generality

Title + abstract (lowercased) matched against:

`foundation, foundational, general-purpose, general , unified, framework, scalable, scale-up, open-ended, benchmark, self-supervised, world model, world-model, agent, reasoning, alignment, interpretability, theoretical, generalization, bounds, sample-efficient, sample efficiency, continual, transfer learning, transfer, foundation model, pretrain, pre-train, open problems, open-ended`

Each distinct hit is +4, capped at **20**.

### Openness / unfinished

Additive, capped at **15**:

- no `journal_ref`: +7
- comment matches workshop / preprint / under review / preliminary / submitted / draft / poster / extended abstract: +5
- comment or id looks like first version (`v1` only, or no later-version note): +3

`openness_boost` is true-ish when this component is ≥ 7.

### Early-field category boost (0–12)

Primary category in  
`cs.AI, cs.LG, cs.CL, cs.RO, cs.NE, cs.CY, eess.AS` or any `q-bio.*`: **+12**

Else if any secondary category is in that set: **+6**

### Novelty (feeds tags, small score)

Title/abstract match `we propose`, `we introduce`, `novel`, `new method`, `a new`: **+8** (once).

### Saturation penalties (sum, cap 28)

- `survey` / `a review` / `literature review` unless also `open problem(s)`: **−12**
- `replication` / `reproduce the` / `reproducing`: **−8**
- `slightly`: **−3**
- `empirical study of` / `an empirical study`: **−8**
- `case study`: **−6**
- has `journal_ref` **and** `age_days > 1095` (3 years): **−10**
- application-narrow markers (`for [specific product]`, `in healthcare billing`, etc. light): title starts with domain-application pattern `a case of`: **−4**

## Tiers (S = highest future runway)

| tier | score | intended meaning |
| --- | --- | --- |
| S | ≥ 80 | recent, general, still open / preprint-like |
| A | ≥ 68 | strong runway |
| B | ≥ 52 | mixed or mid-age methods |
| C | ≥ 38 | narrower or aging |
| D | < 38 | likely saturated / incremental / old journal |

## Reason tags (1–3, highest-signal first)

Vocabulary: `open_problem`, `new_method`, `early_field`, `scalable`, `theoretical_foundation`, `tooling`, `dataset`, `incremental`, `likely_saturated`

Assignment rules (tag added if condition holds), then truncated to 3:

1. `open_problem` — open problem(s) / unsolved / future work / challenge set
2. `new_method` — propose / introduce / novel / new method / framework we
3. `early_field` — early-field boost > 0
4. `scalable` — scalable / scale / large-scale / foundation model
5. `theoretical_foundation` — theorem / bound(s) / theoretical / proof / sample-efficient
6. `tooling` — toolkit / library / software / benchmark suite / open source tool
7. `dataset` — dataset / corpus / benchmark (if not already tooling-only)
8. `incremental` — case study / slightly / empirical study / incremental
9. `likely_saturated` — survey penalty or (journal + age>3y and recency_boost < 5)

## Files

- `papers.jsonl` / `papers.csv` — raw harvested metadata
- `papers_ranked.jsonl` — same objects + ranking fields
- `top100.json` — 100 highest `potential_score` (tie-break: recency, then id)
- `stats.json` — counts including tier histogram after rank
- `rank.py` — re-run anytime: `python3 rank.py`

## What this is not

Not a quality or correctness ranking. A famous 2017 Transformer paper will score lower than a 2026 preprint on open-ended agents. That is intentional.
