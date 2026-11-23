// THE WORLD IN ONE DAY — Monday 23 November 2026.
// A dense broadsheet drawn from scratch: own PNG encoder, own 5x7 bitmap
// font, own layout. No network, no clock, no randomness. Deterministic.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------- palette ----------
const PAPER = [247, 243, 232];
const CARD = [255, 253, 245];
const INK = [26, 26, 26];
const GREY = [110, 105, 92];
const RULE = [26, 26, 26];
const RED = [176, 32, 32];
const BLUE = [31, 78, 121];
const GREEN = [30, 107, 52];
const OCEAN = [214, 228, 232];
const LAND = [232, 220, 192];
const PALE = [238, 232, 214];

// ---------- canvas ----------
const px = new Uint8Array(W * H * 3);
function fill(c: number[]) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}
function rect(x: number, y: number, w: number, h: number, c: number[]) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let j = y0; j < y1; j++)
    for (let i = x0; i < x1; i++) {
      const k = (j * W + i) * 3;
      px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
    }
}
function hline(x: number, y: number, w: number, c: number[], t = 1) {
  rect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, c: number[], t = 1) {
  rect(x, y, t, h, c);
}
function box(x: number, y: number, w: number, h: number, c: number[], t = 1) {
  hline(x, y, w, c, t); hline(x, y + h - t, w, c, t);
  vline(x, y, h, c, t); vline(x + w - t, y, h, c, t);
}
function dot(cx: number, cy: number, r: number, c: number[]) {
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      if (i * i + j * j <= r * r) {
        const x = cx + i, y = cy + j;
        if (x >= 0 && x < W && y >= 0 && y < H) {
          const k = (y * W + x) * 3;
          px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
        }
      }
    }
}

// ---------- 5x7 bitmap font, drawn from scratch ----------
// Each glyph: 7 rows of 5 bits, written as strings, '#' = ink.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
};

function textW(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}
function drawText(x: number, y: number, s: string, sc: number, c: number[]) {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch] ?? GLYPHS["?"];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "1") rect(cx + col * sc, y + r * sc, sc, sc, c);
    cx += 6 * sc;
  }
}
function drawCentered(cx: number, y: number, s: string, sc: number, c: number[]) {
  drawText(cx - Math.floor(textW(s, sc) / 2), y, s, sc, c);
}
// Greedy word wrap to maxW pixels at scale sc. Returns lines.
function wrap(s: string, sc: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textW(t, sc) <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- PNG encoder (own code, zlib from stdlib) ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  crc.copy(out, 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- story data ----------
// Titles, regions and statuses exactly as in the research file.
type Story = { n: number; title: string; region: string; status: string; deck: string; time: string };
const STORIES: Story[] = [
  { n: 1, title: "NATO HOLDS EMERGENCY TALKS ON POLAND MISSILES", region: "EROPA", status: "REPORTED", deck: "MEETS IN BRUSSELS AFTER 3 MISSILES ENTERED POLAND.", time: "" },
  { n: 2, title: "DYMER TOLL RISES TO 11; DAY OF MOURNING DECLARED", region: "UKRAINA", status: "CONFIRMED", deck: "11TH BODY FOUND MONDAY. KYIV DECLARES MOURNING.", time: "05:20" },
  { n: 3, title: "INDONESIA CONFIRMS 24 DEAD IN FACTORY FIRE", region: "ASIA TENGGARA", status: "CONFIRMED", deck: "JAKARTA CONFIRMS 24 DEAD IN CIKANDE FIRE. 30 STILL MISSING.", time: "" },
  { n: 4, title: "MODI OFFERS FLOOD-HIT NEPAL $1.6BN AID PACKAGE", region: "ASIA SELATAN", status: "CONFIRMED", deck: "AID FOR FLOODS; DELHI TALKS.", time: "" },
  { n: 5, title: "TAIWAN SHORT-SELLING BAN TAKES EFFECT MONDAY", region: "ASIA TIMUR", status: "CONFIRMED", deck: "TAIEX FELL 17.5% IN A WEEK.", time: "" },
  { n: 6, title: "COP31 BLAME GAME BEGINS AS ISLANDS DESPAIR", region: "IKLIM", status: "REPORTED", deck: "ISLAND NATIONS VOICE DESPAIR", time: "" },
  { n: 7, title: "ZELENSKYY CLAIMS UKRAINE SANK RUSSIAN CORVETTE", region: "TIMUR TENGAH", status: "CLAIM", deck: "UNVERIFIED CLAIM.", time: "" },
  { n: 8, title: "SEOUL MINISTER QUITS OVER EXAM CHAOS", region: "ASIA TIMUR", status: "CONFIRMED", deck: "RESIGNS AFTER AI CHEATING SCANDAL.", time: "00:20" },
  { n: 9, title: "BANGLADESH VOWS TO JAIL HASINA IF SHE RETURNS", region: "ASIA SELATAN", status: "REPORTED", deck: "HASINA IN EXILE IN INDIA.", time: "" },
  { n: 10, title: "CONGO HALTS COBALT EXPORTS TO LIFT PRICES", region: "AFRIKA", status: "REPORTED", deck: "EXPORTS PAUSED FROM NOV 30.", time: "" },
  { n: 11, title: "FRENCH DOWNTURN DEEPENS TO SIX-MONTH LOW", region: "EROPA", status: "CONFIRMED", deck: "PMI 46.2, SIX-MONTH LOW.", time: "08:18" },
  { n: 12, title: "GERMAN GROWTH HITS FASTEST PACE SINCE 2022", region: "EROPA", status: "CONFIRMED", deck: "PMI 55.0; EUROZONE 51.7.", time: "08:30" },
  { n: 13, title: "VIETNAM BREAKS GROUND ON RARE EARTH PLANT", region: "ASIA TENGGARA", status: "REPORTED", deck: "RARE EARTHS PLANT IN HAIPHONG.", time: "09:13" },
  { n: 14, title: "PRABOWO TO NAME TWO VP CANDIDATES MONDAY", region: "ASIA TENGGARA", status: "REPORTED", deck: "", time: "" },
  { n: 15, title: "GRAVES REVEAL HIDDEN SCALE OF EBOLA DISASTER", region: "AFRIKA", status: "REPORTED", deck: "", time: "" },
  { n: 16, title: "WALL STREET FUTURES REBOUND AFTER AI SELLOFF", region: "AMERIKA UTARA", status: "REPORTED", deck: "", time: "07:29" },
  { n: 17, title: "SENSEX PLUNGES 1,484 POINTS AS BANKS SLIDE", region: "ASIA SELATAN", status: "CONFIRMED", deck: "", time: "10:00" },
  { n: 18, title: "MAGNITUDE 6.5 QUAKE STRIKES VANUATU REGION", region: "OSEANIA", status: "CONFIRMED", deck: "", time: "02:40" },
  { n: 19, title: "MAGNITUDE 5.4 QUAKE HITS BANDA SEA", region: "ASIA TENGGARA", status: "CONFIRMED", deck: "", time: "06:36" },
  { n: 20, title: "MAGNITUDE 4.8 QUAKE NEAR TUAL, MALUKU", region: "ASIA TENGGARA", status: "CONFIRMED", deck: "", time: "02:46" },
  { n: 21, title: "BELGIAN AIRSPACE SHUT BY NATIONAL STRIKE", region: "EROPA", status: "CONFIRMED", deck: "", time: "06:00" },
  { n: 22, title: "OXFAM: TOXIC CONTAMINATION ACROSS 99% OF GAZA", region: "TIMUR TENGAH", status: "REPORTED", deck: "", time: "" },
  { n: 23, title: "BURNHAM DEFENDS EU DEAL BEFORE MPS IN COMMONS", region: "EROPA", status: "REPORTED", deck: "", time: "15:30" },
  { n: 24, title: "NATO BELIEVES RUSSIA READY TO LAUNCH SPACE NUKE", region: "EROPA", status: "REPORTED", deck: "", time: "" },
  { n: 25, title: "HOUTHI MEDIA: 10 DEAD IN SAUDI STRIKE ON HODEIDAH", region: "TIMUR TENGAH", status: "CLAIM", deck: "", time: "08:34" },
  { n: 26, title: "AUSTRALIA CLOSE TO SOLOMON ISLANDS TREATY", region: "OSEANIA", status: "REPORTED", deck: "", time: "" },
  { n: 27, title: "DENMARK PUSHES EU-WIDE VISA CURBS ON RUSSIANS", region: "EROPA", status: "REPORTED", deck: "", time: "" },
  { n: 28, title: "KOSPI SINKS TO TEN-MONTH LOW AS CHIPS SLUMP", region: "ASIA TIMUR", status: "CONFIRMED", deck: "", time: "" },
  { n: 29, title: "DRONE DEBRIS FALLS ON KYIV SCHOOL GROUNDS", region: "UKRAINA", status: "REPORTED", deck: "", time: "08:30" },
  { n: 30, title: "SEOUL RESHUFFLES CABINET, NAMES WOMAN SPY CHIEF", region: "ASIA TIMUR", status: "CONFIRMED", deck: "", time: "09:05" },
  { n: 31, title: "KREMLIN ACCUSES UKRAINE OF BALTIC TERRORISM", region: "EROPA", status: "REPORTED", deck: "", time: "" },
  { n: 32, title: "IRAN VOWS TO FIGHT US NAVAL BLOCKADE", region: "TIMUR TENGAH", status: "REPORTED", deck: "", time: "" },
  { n: 33, title: "ZELENSKYY URGES FOUR-WAY TALKS 'TOMORROW'", region: "EROPA", status: "REPORTED", deck: "", time: "11:31" },
  { n: 34, title: "COPPER BRIEFLY FALLS BELOW $12,000 A TONNE", region: "PASAR", status: "CONFIRMED", deck: "", time: "03:40" },
  { n: 35, title: "GOLD AND SILVER REBOUND AFTER WEEKLY ROUT", region: "PASAR", status: "CONFIRMED", deck: "", time: "" },
  { n: 36, title: "NASA SPOTLIGHTS ARCTIC SATELLITE LASER SYSTEM", region: "SAINS", status: "REPORTED", deck: "", time: "05:05" },
  { n: 37, title: "UN AND US CONDEMN KHARTOUM DRONE STRIKES", region: "AFRIKA", status: "REPORTED", deck: "", time: "" },
];

function statusColor(s: string): number[] {
  return s === "CONFIRMED" ? GREEN : s === "CLAIM" ? RED : BLUE;
}

// ---------- world map ----------
// Coarse equirectangular land grid, drawn by hand: 60 cols x 22 rows,
// lon -180..180, lat 75N..60S. '#' = land.
const MAP_ROWS = [
  "............................................................",
  "....######......####........................................",
  "....########...#####....###..##############################..",
  "....#########...####...#####.###############################.",
  ".....########....###...######..############################..",
  "......######.....##....######...######..############........",
  ".......####...........#######....#####..##########..........",
  ".......####...........########....####...########...........",
  "........###............########....###....######............",
  ".........##.............#######....###.....#####............",
  ".........##..............######....###......###.............",
  "..........##.............######....###......##......##......",
  "..........###.............#####.....##......##..............",
  "...........###............####......##......###.............",
  "............###............###..............####.............",
  "............###............###...............###.............",
  ".............##...............................##.............",
  ".............##............................................",
  "..............#............................................",
  "............................................................",
  "............................................................",
  "............................................................",
];
// Pins: [code, lon, lat, label dx, label dy]
const PINS: [string, number, number, number, number][] = [
  ["NA", -100, 40, 6, -4], ["EU", 10, 50, 6, -10], ["UA", 32, 49, -20, -4],
  ["ME", 45, 30, 6, 5], ["AF", 20, 5, 6, -4], ["SA", 78, 21, 6, -10],
  ["EA", 120, 32, 6, -4], ["SEA", 105, 5, 6, 5], ["OC", 140, -25, 6, -4],
];
function drawMap(x0: number, y0: number, w: number, h: number) {
  rect(x0, y0, w, h, OCEAN);
  const cw = w / 60, ch = h / 22;
  for (let r = 0; r < 22; r++)
    for (let c = 0; c < 60; c++)
      if (MAP_ROWS[r][c] === "#")
        rect(Math.round(x0 + c * cw), Math.round(y0 + r * ch), Math.ceil(cw), Math.ceil(ch), LAND);
  box(x0, y0, w, h, INK, 2);
  for (const [code, lon, lat, dx, dy] of PINS) {
    const pxm = x0 + ((lon + 180) / 360) * w;
    const pym = y0 + ((75 - lat) / 135) * h;
    dot(Math.round(pxm), Math.round(pym), 4, RED);
    drawText(Math.round(pxm) + dx, Math.round(pym) + dy, code, 1, RED);
  }
}

// ---------- masthead ----------
function drawMasthead() {
  hline(24, 8, 976, INK, 3);
  drawCentered(512, 16, "THE WORLD IN ONE DAY", 3, INK);
  drawCentered(512, 44, "MONDAY 23 NOVEMBER 2026", 6, INK);
  hline(24, 94, 976, INK, 2);
  drawCentered(512, 100, "37 STORIES - EVERY ONE HAPPENED OR FIRST REPORTED TODAY", 2, RED);
}

// ---------- top row: map + date check + region counts ----------
function drawTopRow() {
  const y0 = 122;
  drawMap(24, y0, 300, 112);
  drawText(24, y0 + 118, "NA AMERICA EU EUROPE UA UKRAINE ME MIDEAST", 1, GREY);
  drawText(24, y0 + 128, "AF AFRICA SA S.ASIA EA E.ASIA SEA SE.ASIA OC OCEAN", 1, GREY);

  // DATE CHECK box
  const bx = 340, bw = 320;
  box(bx, y0, bw, 140, INK, 2);
  rect(bx + 2, y0 + 2, bw - 4, 22, INK);
  drawText(bx + 10, y0 + 7, "DATE CHECK", 2, PAPER);
  const lines = wrap("EVERY STORY HERE HAPPENED OR WAS FIRST REPORTED ON MONDAY 23 NOVEMBER 2026.", 2, bw - 20);
  let ly = y0 + 32;
  for (const ln of lines) { drawText(bx + 10, ly, ln, 2, INK); ly += 17; }
  hline(bx + 10, ly + 2, bw - 20, GREY, 1);
  drawText(bx + 10, ly + 8, "SUNDAY STORIES ARE NOT HERE.", 2, RED);
  drawText(bx + 10, ly + 26, "37 STORIES VERIFIED AGAINST", 1, GREY);
  drawText(bx + 10, ly + 36, "REPORTS DATED 23 NOVEMBER 2026.", 1, GREY);

  // Region counts
  const cx = 676, cw2 = 324;
  box(cx, y0, cw2, 140, INK, 2);
  rect(cx + 2, y0 + 2, cw2 - 4, 22, INK);
  drawText(cx + 10, y0 + 7, "STORIES BY REGION", 2, PAPER);
  const counts: [string, number][] = [
    ["EROPA", 9], ["UKRAINA", 2], ["TIMUR TENGAH", 4], ["AFRIKA", 3],
    ["ASIA SELATAN", 3], ["ASIA TIMUR", 4], ["ASIA TENGGARA", 5],
    ["OSEANIA", 2], ["AMERIKA UTARA", 1], ["PASAR", 2],
    ["SAINS", 1], ["IKLIM", 1],
  ];
  let cy = y0 + 32;
  for (let i = 0; i < counts.length; i += 2) {
    const a = counts[i], b = counts[i + 1];
    drawText(cx + 10, cy, a[0] + " " + a[1], 1, INK);
    if (b) drawText(cx + 172, cy, b[0] + " " + b[1], 1, INK);
    cy += 12;
  }
  drawText(cx + 10, y0 + 122, "TOTAL 37", 2, RED);
}

// ---------- main cards (1-3) ----------
function drawMainCard(s: Story, x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, CARD);
  box(x, y, w, h, INK, 2);
  // number block + status
  rect(x + 2, y + 2, 44, 30, RED);
  drawText(x + 8, y + 9, String(s.n), 3, PAPER);
  const sc = statusColor(s.status);
  const tag = s.status === "CLAIM" ? "CLAIM - UNVERIFIED" : s.status;
  drawText(x + 54, y + 12, tag, 2, sc);
  drawText(x + 54, y + 28, s.region, 1, GREY);
  hline(x + 10, y + 40, w - 20, GREY, 1);
  // title, scale 3
  const tlines = wrap(s.title, 3, w - 20);
  let ty = y + 50;
  for (const ln of tlines) { drawText(x + 10, ty, ln, 3, INK); ty += 23; }
  // body, scale 2
  const blines = wrap(s.deck, 2, w - 20);
  ty += 4;
  for (const ln of blines) { drawText(x + 10, ty, ln, 2, INK); ty += 16; }
}

// ---------- secondary cards (4-13) ----------
function drawSecondCard(s: Story, x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, CARD);
  box(x, y, w, h, INK, 1);
  const sc = statusColor(s.status);
  const numW = textW(String(s.n), 2);
  drawText(x + 8, y + 7, String(s.n), 2, RED);
  drawText(x + 14 + numW, y + 9, s.status, 1, sc);
  drawText(x + 14 + numW, y + 19, s.region, 1, GREY);
  const tlines = wrap(s.title, 2, w - 16);
  let ty = y + 30;
  for (const ln of tlines) { drawText(x + 8, ty, ln, 2, INK); ty += 16; }
  if (s.deck) {
    const dlines = wrap(s.deck, 1, w - 16);
    for (const ln of dlines) {
      if (ty + 7 > y + h - 4) break;
      drawText(x + 8, ty, ln, 1, GREY); ty += 10;
    }
  }
}

// ---------- ALSO ON list (14-37) ----------
function drawAlsoList() {
  const y0 = 708;
  drawText(24, y0, "ALSO ON MONDAY 23 NOVEMBER 2026", 2, INK);
  drawText(700, y0, "24 MORE STORIES", 2, RED);
  hline(24, y0 + 18, 976, INK, 2);
  const items = STORIES.slice(13);
  const colW = 480, gap = 16;
  for (let i = 0; i < items.length; i++) {
    const s = items[i];
    const col = Math.floor(i / 12), row = i % 12;
    const x = 24 + col * (colW + gap);
    const y = y0 + 26 + row * 13;
    const line = String(s.n) + ". " + s.title + " (" + s.region + ") [" + s.status + "]";
    drawText(x, y, line, 1, INK);
  }
}

// ---------- timeline strip ----------
function drawTimeline() {
  const y0 = 898;
  drawText(24, y0, "MONDAY ON THE CLOCK - ALL TIMES UTC", 2, INK);
  hline(24, y0 + 18, 976, INK, 1);
  const ax = 40, axW = 944, ay = y0 + 34;
  hline(ax, ay, axW, INK, 2);
  const timed = STORIES.filter((s) => s.time).slice().sort((a, b) => (a.time < b.time ? -1 : 1));
  const toMin = (t: string) => {
    const p = t.split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  };
  for (let i = 0; i < timed.length; i++) {
    const s = timed[i];
    const fx = ax + (toMin(s.time) / 960) * axW;
    dot(Math.round(fx), ay, 4, RED);
  }
  for (const [lab, hh] of [["00:00", 0], ["04:00", 240], ["08:00", 480], ["12:00", 720], ["16:00", 960]] as [string, number][]) {
    const fx = ax + (hh / 960) * axW;
    vline(Math.round(fx), ay - 4, 8, INK, 1);
    drawText(Math.round(fx) - 14, ay + 8, lab, 1, GREY);
  }
  const labels = [
    "00:20 #8 SEOUL QUITS", "02:40 #18 VANUATU 6.5",
    "02:46 #20 TUAL 4.8", "03:40 #34 COPPER <$12K",
    "05:05 #36 NASA LASER", "05:20 #2 DYMER 11",
    "06:00 #21 BELGIUM SHUT", "06:36 #19 BANDA 5.4",
    "07:29 #16 WALL ST REBOUND", "08:18 #11 FRENCH PMI",
    "08:30 #12 GERMAN PMI", "08:30 #29 KYIV DEBRIS",
    "08:34 #25 HODEIDAH CLAIM", "09:05 #30 SEOUL RESHUFFLE",
    "09:13 #13 VIETNAM PLANT", "10:00 #17 SENSEX -1,484",
    "11:31 #33 TALKS CALL", "15:30 #23 BURNHAM STATEMENT",
  ];
  for (let r = 0; r < 3; r++) {
    let lx = 24;
    const row = labels.slice(r * 6, r * 6 + 6);
    let ly = ay + 24 + r * 12;
    for (const lab of row) {
      drawText(lx, ly, lab, 1, INK);
      lx += textW(lab, 1) + 18;
    }
  }
}

// ---------- footer ----------
function drawFooter() {
  const y0 = 988;
  hline(24, y0, 976, INK, 2);
  drawText(24, y0 + 8, "SOURCES: REUTERS, NAMPA, OXFAM, NASA, S&P GLOBAL, BMKG, USGS, METMALAYSIA, NATIONAL MEDIA REPORTS DATED 23 NOVEMBER 2026.", 1, GREY);
  drawText(24, y0 + 18, "CLAIM LABELS MARK SINGLE-SOURCE CLAIMS NOT INDEPENDENTLY VERIFIED. DRAWN BY PROGRAM - NO NETWORK - NO PHOTOGRAPHS.", 1, GREY);
  drawText(24, y0 + 28, "THE WORLD IN ONE DAY - MONDAY 23 NOVEMBER 2026 - 37 STORIES.", 1, INK);
}

// ---------- main ----------
function main() {
  fill(PAPER);
  drawMasthead();
  drawTopRow();
  // main cards 1-3
  const mw = 320, mg = 8, my = 270, mh = 190;
  for (let i = 0; i < 3; i++)
    drawMainCard(STORIES[i], 24 + i * (mw + mg), my, mw, mh);
  // secondary cards 4-13, two rows of five
  const sw = 188, sg = 9, sh = 112;
  for (let i = 0; i < 10; i++) {
    const s = STORIES[3 + i];
    const col = i % 5, row = Math.floor(i / 5);
    drawSecondCard(s, 24 + col * (sw + sg), 468 + row * (sh + 8), sw, sh);
  }
  drawAlsoList();
  drawTimeline();
  drawFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outDir + "/entry.png", encodePNG());
}
main();
