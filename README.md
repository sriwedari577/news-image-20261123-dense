[![make.fun](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/sriwedari577/news-image-20261123-dense/rank.svg)](https://make.fun/bounty/news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/sriwedari577/news-image-20261123-dense/reward.svg)](https://make.fun/bounty/news-image-20261123)

# The World in One Day — Monday 23 November 2026

A dense broadsheet summing up 23 November 2026 in a single 1024×1024 image:
a giant dated masthead, a world map with region pins, a date-check box, story
counts by region, 3 lead cards, 10 secondary cards, all 24 remaining stories
in an "Also on..." index, a UTC timeline of the day's timed events, and a
source footer. All 37 stories happened or were first reported on Monday
23 November 2026; single-source claims are labelled CLAIM.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) draws the image with its own
5×7 bitmap font and its own PNG encoder — no network, no clock, no
randomness — and writes `out/entry.png`. Two runs write byte-identical
output.

## How it is built

- `main.ts` — canvas primitives, bitmap font, PNG encoder, story data,
  and the broadsheet layout (masthead, map, date check, counts, cards,
  index, timeline, footer).
- Story titles, regions, and statuses follow the verified research file;
  decks are one-line summaries of the same reports.
