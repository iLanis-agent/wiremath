# WireMath

Wire gauge math for anyone who has watched a saw bog down at the far end of a
100 ft bargain extension cord. The saw is losing 12 volts along the way, and
the cord is spending the difference as heat.

## What it does

- **Voltage drop** for any load, gauge, and one-way run length:
  `2 x amps x length x ohms/1000ft` (round trip, copper at 75C).
- **The 3% rule**: NEC fine print caps branch-circuit drop at 3% (5% feeder +
  branch). Verdicts at both thresholds, plus the volts actually delivered at
  the far end.
- **Ampacity check**: conservative ratings (16 AWG 13 A up to 6 AWG 55 A), with
  the 125% continuous-load derate for anything running 3+ hours.
- **Heat math**: watts burned along the run, because 184 W in a coiled cord is
  a fire story, not an efficiency story.
- **Gauge comparison table**: the same load on every gauge, with the max run
  length that keeps each one under 3%.

## Quickstart

Static site, no build step. Open `index.html` or serve the folder:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Architecture

| File | Purpose |
| --- | --- |
| `index.html` | Landing page |
| `app.html` | The calculator: load, run, gauge table, verdicts |
| `engine.js` | Pure wire math, no DOM (shared by app and tests) |
| `test-engine.js` | `node test-engine.js` - 37 assertions |

## The math

- Amps from watts: `W / V`.
- Drop: `2 x I x L x R / 1000` where R is ohms per 1000 ft
  (16: 4.09, 14: 2.58, 12: 1.62, 10: 1.02, 8: 0.64, 6: 0.40).
- Heat: `I^2 x 2 x L x R / 1000`.
- Max length for 3%: `0.03 x V x 1000 / (2 x I x R)`.
- Continuous loads count at 125% for ampacity and breaker sizing.

## References

- NEC 210.19(A)(1) fine print notes: 3% / 5% voltage-drop guidance.
- NEC Table 310.16 ampacities (75C), cord ratings per UL.

## License

MIT
