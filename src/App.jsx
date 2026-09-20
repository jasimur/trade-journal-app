import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Pencil,
  Trash2,
  X,
  Flame,
  Trophy,
  Shield,
  TrendingDown,
  TrendingUp,
  Calendar,
  Sparkles,
  ImagePlus,
  Link2,
  Loader2,
  Star,
  ClipboardPaste,
  ClipboardCheck,
  Brain,
  Target,
  Clock3,
  AlertTriangle,
} from "lucide-react";

const STORAGE_KEY = "trades";
const DEFAULT_COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"];

// ---- Setup taxonomy (optional fields on every trade) ----
const ENTRY_MODELS = [
  { id: "aggressive", label: "Aggressive" },
  { id: "balanced", label: "Balanced" },
  { id: "conservative", label: "Conservative" },
];
const ENTRY_MODEL_LABELS = Object.fromEntries(ENTRY_MODELS.map((m) => [m.id, m.label]));
const SOURCE_OPTIONS = [
  { id: "binance-killer", label: "Binance Killer" },
  { id: "gg-short", label: "GG-Short" },
  { id: "others", label: "Others" },
];
const SOURCE_LABELS = Object.fromEntries(SOURCE_OPTIONS.map((s) => [s.id, s.label]));

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function fileExt(name) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name || "");
  return m ? m[1].toLowerCase() : "png";
}

// ---- PREVIEW MODE: Firebase auth/storage swapped for in-memory demo data ----
function daysAgo(n, h, m) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildSeedTrades() {
  return [
    { id: "seed-1", datetime: daysAgo(12, 9, 20), coin: "BTC", direction: "long", entry: 60250, exit: 61100, margin: 500, pnl: 42.5, note: "Session low-এ absorption ধরেছিলাম, buyer initiative স্পষ্ট ছিল", noteImportant: true, approach: "strong", entryModel: "balanced", proofLink: "", screenshotUrl: "https://placehold.co/320x200/1A1E27/E8A33D?text=BTC+Chart", source: "gg-short", sourceOther: "" },
    { id: "seed-2", datetime: daysAgo(11, 14, 5), coin: "ETH", direction: "short", entry: 3400, exit: 3450, margin: 300, pnl: -27, note: "তাড়াহুড়ো করে ঢুকেছিলাম, retest-এর জন্য অপেক্ষা করিনি", noteImportant: true, approach: "weak", entryModel: "aggressive", proofLink: "https://example.com/chart-proof/eth-short", screenshotUrl: "", source: "binance-killer", sourceOther: "" },
    { id: "seed-3", datetime: daysAgo(9, 10, 40), coin: "SOL", direction: "long", entry: 148, exit: 152.4, margin: 200, pnl: 30, note: "Textbook setup — clean absorption then structure break", noteImportant: false, approach: "strong", entryModel: "balanced", proofLink: "", screenshotUrl: "https://placehold.co/320x200/1A1E27/3ECF8E?text=SOL+Chart", source: "gg-short", sourceOther: "" },
    { id: "seed-4", datetime: daysAgo(8, 16, 15), coin: "BTC", direction: "short", entry: 62000, exit: 61600, margin: 400, pnl: 16, note: "Sweep + reclaim পর pullback থেকে conservative entry", noteImportant: false, approach: "strong", entryModel: "conservative", proofLink: "", screenshotUrl: "", source: "", sourceOther: "" },
    { id: "seed-5", datetime: daysAgo(6, 11, 0), coin: "JUP", direction: "long", entry: 0.82, exit: 0.79, margin: 250, pnl: -18, note: "সাইজ বেশি নিয়ে ফেলেছিলাম, মাথা ঠান্ডা ছিল না", noteImportant: true, approach: "weak", entryModel: "aggressive", proofLink: "", screenshotUrl: "", source: "others", sourceOther: "Twitter call" },
    { id: "seed-6", datetime: daysAgo(5, 9, 50), coin: "ETH", direction: "long", entry: 3300, exit: 3410, margin: 350, pnl: 38.5, note: "Absorption-এর পর buyer imbalance স্পষ্ট ছিল", noteImportant: false, approach: "strong", entryModel: "balanced", proofLink: "https://example.com/chart-proof/eth-long", screenshotUrl: "", source: "gg-short", sourceOther: "" },
    { id: "seed-7", datetime: daysAgo(4, 13, 25), coin: "BNB", direction: "short", entry: 590, exit: 601, margin: 300, pnl: -22, note: "Weak approach ছিল, বুঝেও early ঢুকে গেছিলাম", noteImportant: true, approach: "weak", entryModel: "aggressive", proofLink: "", screenshotUrl: "", source: "binance-killer", sourceOther: "" },
    { id: "seed-8", datetime: daysAgo(2, 10, 5), coin: "BTC", direction: "long", entry: 63100, exit: 64050, margin: 500, pnl: 47.5, note: "Clean model B entry, full checklist মিলেছিল", noteImportant: false, approach: "strong", entryModel: "balanced", proofLink: "", screenshotUrl: "https://placehold.co/320x200/1A1E27/E8A33D?text=BTC+Chart+2", source: "gg-short", sourceOther: "" },
    { id: "seed-9", datetime: daysAgo(1, 15, 40), coin: "SOL", direction: "short", entry: 155, exit: 157, margin: 200, pnl: -13, note: "শুধু divergence দেখে ঢুকেছিলাম, structure shift confirm হয়নি", noteImportant: false, approach: "weak", entryModel: "aggressive", proofLink: "", screenshotUrl: "", source: "binance-killer", sourceOther: "" },
    { id: "seed-10", datetime: daysAgo(0, 9, 10), coin: "BTC", direction: "long", entry: 64200, exit: 64980, margin: 500, pnl: 39, note: "Sweep + reclaim + retest hold, conservative model", noteImportant: false, approach: "strong", entryModel: "conservative", proofLink: "", screenshotUrl: "", source: "gg-short", sourceOther: "" },
  ];
}

function buildSeedPlans() {
  return [
    { id: "plan-seed-1", datetime: nowUTC6Input(), coin: "BTC", direction: "long", note: "62,000 VPOC-এ retest হয়ে হোল্ড করলে long — গতকালের absorption zone, আগে থেকে shortlist করা।" },
    { id: "plan-seed-2", datetime: nowUTC6Input(), coin: "ETH", direction: "short", note: "3,450 resistance-এ rejection candle confirm হলে short — 4H-তে weak approach, বেশি expect করছি না, ছোট size।" },
  ];
}

function nowLocalInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function nowUTC6Input() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const d = new Date(utcMs + 6 * 60 * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtNum(n) {
  if (Number.isNaN(n)) return "—";
  if (Math.abs(n) < 1) return String(n);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function getWeekInfo(dateInput) {
  const d = new Date(dateInput);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const key = monday.toISOString().slice(0, 10);
  const label = `${monday.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${sunday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  return { key, monday, sunday, label };
}

function getMonthInfo(dateInput) {
  const d = new Date(dateInput);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const label = firstOfMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  return { key, firstOfMonth, label };
}

function toInputDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DATE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "month", label: "This month" },
];

const TRADES_PER_LEVEL = 5;
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];
const RANK_TIERS = [
  { level: 1, title: "Initiate Trader" },
  { level: 3, title: "Apprentice Trader" },
  { level: 6, title: "Rising Trader" },
  { level: 10, title: "Skilled Trader" },
  { level: 16, title: "Expert Trader" },
  { level: 24, title: "Veteran Trader" },
  { level: 34, title: "Master Trader" },
  { level: 46, title: "Elite Trader" },
  { level: 60, title: "Grandmaster Trader" },
];

function getTraderRank(totalTrades) {
  const level = Math.floor(totalTrades / TRADES_PER_LEVEL) + 1;
  let title = RANK_TIERS[0].title;
  for (const tier of RANK_TIERS) {
    if (level >= tier.level) title = tier.title;
  }
  const xpInLevel = totalTrades % TRADES_PER_LEVEL;
  const xpProgress = xpInLevel / TRADES_PER_LEVEL;
  const tradesToNext = TRADES_PER_LEVEL - xpInLevel;
  return { level, title, xpProgress, tradesToNext };
}

function ticketMoodFor(form) {
  const pnlNum = form.pnl === "" ? null : parseFloat(form.pnl);
  if (pnlNum !== null && !Number.isNaN(pnlNum)) {
    if (pnlNum > 0) {
      const lines = [
        "Nice! Mana's flowing your way.",
        "That's the good kind of green.",
        "Book it — that's a win.",
      ];
      return { state: "happy", line: lines[Math.abs(Math.round(pnlNum)) % lines.length] };
    }
    if (pnlNum < 0) {
      const lines = [
        "Log it anyway — that's how you level up.",
        "Ouch. Still worth writing down.",
        "Every guild member takes a hit sometime.",
      ];
      return { state: "sad", line: lines[Math.abs(Math.round(pnlNum)) % lines.length] };
    }
  }
  if (form.approach === "weak") {
    return { state: "sad", line: "Weak approach, huh? Stay sharp out there." };
  }
  if (form.approach === "strong") {
    return { state: "happy", line: "Strong approach — that's the way." };
  }
  if (form.coin) {
    return { state: "idle", line: `${form.direction === "long" ? "Long" : "Short"} ${form.coin}? Let's see it.` };
  }
  return { state: "idle", line: "Ready when you are, trader." };
}

function TicketMascot({ mood, line, celebrating }) {
  const moodClass = celebrating || mood === "happy" ? "tj-auth-slime-cheer" : mood === "sad" ? "tj-auth-slime-sad" : "";
  return (
    <div className="tj-ticket-mascot">
      <div className={`tj-ticket-slime ${moodClass}`} aria-hidden="true">
        <svg viewBox="0 0 120 96">
          <ellipse className="tj-slime-shadow" cx="60" cy="90" rx="34" ry="5" />
          <path
            className="tj-slime-body"
            d="M60,10 C82,10 100,32 100,54 C100,76 82,90 60,90 C38,90 20,76 20,54 C20,32 38,10 60,10 Z"
          />
          <ellipse className="tj-slime-shine" cx="42" cy="34" rx="9" ry="6" />
          <g className="tj-slime-eyes">
            <ellipse cx="48" cy="52" rx="4" ry="5.5" fill="#12141A" />
            <ellipse cx="74" cy="52" rx="4" ry="5.5" fill="#12141A" />
          </g>
          <path className="tj-slime-mouth" d="M52,64 Q61,70 70,64" stroke="#12141A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <ellipse cx="40" cy="60" rx="4.5" ry="3" className="tj-slime-blush" />
          <ellipse cx="82" cy="60" rx="4.5" ry="3" className="tj-slime-blush" />
        </svg>
      </div>
      <div className="tj-ticket-speech">{line}</div>
    </div>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 12 }).map((_, i) => {
    const angle = (360 / 12) * i + (Math.random() * 20 - 10);
    const dist = 55 + Math.random() * 40;
    const dx = Math.cos((angle * Math.PI) / 180) * dist;
    const dy = Math.sin((angle * Math.PI) / 180) * dist;
    const colors = ["var(--pos)", "var(--accent)", "var(--mana)", "var(--short)"];
    return (
      <span
        key={i}
        className="tj-confetti-piece"
        style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, background: colors[i % colors.length], animationDelay: `${i * 0.02}s` }}
      />
    );
  });
  return <div className="tj-confetti-burst">{pieces}</div>;
}

const emptyForm = () => ({
  datetime: nowLocalInput(),
  coin: "",
  direction: "long",
  entry: "",
  exit: "",
  margin: "",
  roi: "",
  pnl: "",
  note: "",
  noteImportant: false,
  approach: "",
  entryModel: "",
  proofLink: "",
  screenshotUrl: "",
  source: "",
  sourceOther: "",
  leverage: "",
  maxOi: "",
  closedVolume: "",
  duration: "",
  openedAt: "",
  closedAt: "",
  status: "",
  contract: "",
});

function parseBinancePositionHistory(raw) {
  const text = String(raw || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
  const valueAfter = (label) => {
    const match = text.match(new RegExp(`${label}\\s*\\n?\\s*([^\\n]+)`, "i"));
    return match ? match[1].trim() : "";
  };
  const cleanNumber = (value) => {
    const match = String(value || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? match[0] : "";
  };
  const dateToInput = (value) => {
    const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    return match ? `${match[3]}-${match[1]}-${match[2]}T${match[4]}:${match[5]}` : "";
  };
  const firstLine = text.split("\n").map((line) => line.trim()).filter(Boolean)[0] || "";
  const coinMatch = firstLine.match(/^([A-Z0-9]+?)(?:USDT|USD|BUSD)?\s*$/i);
  const coin = (coinMatch ? coinMatch[1] : firstLine.replace(/USDT$/i, "")).toUpperCase();
  const directionMatch = text.match(/\b(Cross|Isolated)\s+(Long|Short)\b/i);
  const openedRaw = text.match(/Opened\s*\n?\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i)?.[1] || "";
  const closedRaw = text.match(/Closed\s*\n?\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i)?.[1] || "";
  const roi = cleanNumber(valueAfter("ROI"));
  const pnl = cleanNumber(valueAfter("Realized PNL \\(USDT\\)"));
  const entry = cleanNumber(valueAfter("Entry Price"));
  const exit = cleanNumber(valueAfter("Avg\\. Close Price"));
  const closedVolume = cleanNumber(valueAfter("Closed Vol\\. \\([^\\n]+\\)"));
  const maxOi = cleanNumber(valueAfter("Max OI \\([^\\n]+\\)"));
  const leverage = cleanNumber(text.match(/(\d+(?:\.\d+)?)x/i)?.[1]);
  const duration = text.match(/\(Lasting\s+([^)]+)\)/i)?.[1] || "";
  const status = text.match(/\b(Open|Closed)\b(?=\s*\n|\s+\d{2}\/)/i)?.[1] || "";
  const openedAt = dateToInput(openedRaw);
  const closedAt = dateToInput(closedRaw);
  return {
    ...emptyForm(),
    coin,
    contract: firstLine,
    direction: directionMatch?.[2]?.toLowerCase() || "long",
    entry,
    exit,
    roi,
    pnl,
    margin: roi && pnl ? String((parseFloat(pnl) / (parseFloat(roi) / 100)).toFixed(2)) : "",
    datetime: closedAt || openedAt || nowLocalInput(),
    note: [
      leverage ? `${leverage}x leverage` : "",
      duration ? `lasting ${duration}` : "",
      closedVolume ? `closed ${closedVolume} ${coin}` : "",
      maxOi ? `max OI ${maxOi} ${coin}` : "",
    ].filter(Boolean).join(" · "),
    leverage,
    maxOi,
    closedVolume,
    duration,
    openedAt,
    closedAt,
    status,
    source: "others",
    sourceOther: "Binance Position History",
  };
}

const emptyPlanForm = () => ({
  datetime: nowUTC6Input(),
  coin: "",
  direction: "long",
  note: "",
});

export default function TradeJournal() {
  const [trades, setTrades] = useState(buildSeedTrades());
  const [plans, setPlans] = useState(buildSeedPlans());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "", preset: "all" });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [uploadingShot, setUploadingShot] = useState(false);
  const [celebration, setCelebration] = useState({ show: false, xp: 0, kind: "" });
  const [planForm, setPlanForm] = useState(emptyPlanForm());
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planFormError, setPlanFormError] = useState("");
  const [pendingDeletePlanId, setPendingDeletePlanId] = useState(null);
  const [binancePaste, setBinancePaste] = useState("");
  const [binanceImported, setBinanceImported] = useState(false);

  function persist(next) {
    setTrades(next);
  }

  function persistPlans(next) {
    setPlans(next);
  }

  function handleScreenshotChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setFormError("");
  }

  function removeScreenshot() {
    setScreenshotFile(null);
    setScreenshotPreview("");
    setForm((f) => ({ ...f, screenshotUrl: "" }));
  }

  function importBinanceTrade() {
    const parsed = parseBinancePositionHistory(binancePaste);
    if (!parsed.coin || !parsed.entry || !parsed.exit || !parsed.pnl || !parsed.roi) {
      setFormError("Binance text incomplete. Copy the full position-history block, including PNL, ROI, Entry Price and Avg. Close Price.");
      setBinanceImported(false);
      return;
    }
    setForm(parsed);
    setBinanceImported(true);
    setFormError("");
    setTimeout(() => setBinanceImported(false), 2200);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const coin = form.coin.trim().toUpperCase();
    if (!coin || !form.datetime || form.entry === "" || form.exit === "" || form.pnl === "") {
      setFormError("Fill in date, coin, entry/exit price and PNL to log the trade.");
      return;
    }
    const marginTyped = form.margin.trim() !== "" ? parseFloat(form.margin) : null;
    const roiTyped = form.roi.trim() !== "" ? parseFloat(form.roi) : null;
    if (marginTyped === null && roiTyped === null) {
      setFormError("Provide either Margin or ROI so the position size can be recorded.");
      return;
    }
    const entryNum = parseFloat(form.entry);
    const exitNum = parseFloat(form.exit);
    const pnlNum = parseFloat(form.pnl);
    let marginNum;
    if (marginTyped !== null && !Number.isNaN(marginTyped) && marginTyped !== 0) {
      marginNum = marginTyped;
    } else if (roiTyped !== null && !Number.isNaN(roiTyped) && roiTyped !== 0) {
      marginNum = pnlNum / (roiTyped / 100);
    } else {
      setFormError("Margin or ROI value looks invalid.");
      return;
    }
    if ([entryNum, exitNum, marginNum, pnlNum].some((n) => Number.isNaN(n))) {
      setFormError("Price, Margin/ROI and PNL need to be numbers.");
      return;
    }

    const tradeId = editingId || uid();
    let screenshotUrl = form.screenshotUrl;

    if (screenshotFile) {
      // Preview mode: no real Firebase Storage — just simulate an upload delay
      // and use the local object URL as a stand-in for the hosted download URL.
      setUploadingShot(true);
      await new Promise((res) => setTimeout(res, 500));
      screenshotUrl = screenshotPreview;
      setUploadingShot(false);
    }

    const tradeObj = {
      id: tradeId,
      datetime: form.datetime,
      coin,
      direction: form.direction,
      entry: entryNum,
      exit: exitNum,
      margin: marginNum,
      pnl: pnlNum,
      note: form.note.trim(),
      noteImportant: form.note.trim() ? form.noteImportant : false,
      approach: form.approach,
      entryModel: form.entryModel,
      proofLink: form.proofLink.trim(),
      screenshotUrl,
      source: form.source,
      sourceOther: form.source === "others" ? form.sourceOther.trim() : "",
      leverage: form.leverage ? parseFloat(form.leverage) : null,
      maxOi: form.maxOi ? parseFloat(form.maxOi) : null,
      closedVolume: form.closedVolume ? parseFloat(form.closedVolume) : null,
      duration: form.duration || "",
      openedAt: form.openedAt || "",
      closedAt: form.closedAt || "",
      status: form.status || "",
      contract: form.contract || "",
    };
    const wasEditing = Boolean(editingId);
    const xp = 10 + (form.approach ? 2 : 0) + (form.entryModel ? 2 : 0) + (form.source ? 2 : 0) + (form.proofLink.trim() || screenshotUrl ? 3 : 0);
    const next = editingId
      ? trades.map((t) => (t.id === editingId ? tradeObj : t))
      : [...trades, tradeObj];
    persist(next);
    setEditingId(null);
    setForm(emptyForm());
    setScreenshotFile(null);
    setScreenshotPreview("");
    setFormError("");
    setCelebration({ show: true, xp, kind: wasEditing ? "update" : "new" });
    setTimeout(() => setCelebration({ show: false, xp: 0, kind: "" }), 1600);
  }

  function startEdit(t) {
    setForm({
      datetime: t.datetime,
      coin: t.coin,
      direction: t.direction,
      entry: String(t.entry),
      exit: String(t.exit),
      margin: String(t.margin),
      roi: "",
      pnl: String(t.pnl),
      note: t.note || "",
      noteImportant: Boolean(t.noteImportant),
      approach: t.approach || "",
      entryModel: t.entryModel || "",
      proofLink: t.proofLink || "",
      screenshotUrl: t.screenshotUrl || "",
      source: t.source || "",
      sourceOther: t.sourceOther || "",
      leverage: t.leverage == null ? "" : String(t.leverage),
      maxOi: t.maxOi == null ? "" : String(t.maxOi),
      closedVolume: t.closedVolume == null ? "" : String(t.closedVolume),
      duration: t.duration || "",
      openedAt: t.openedAt || "",
      closedAt: t.closedAt || "",
      status: t.status || "",
      contract: t.contract || "",
    });
    setScreenshotFile(null);
    setScreenshotPreview(t.screenshotUrl || "");
    setEditingId(t.id);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setScreenshotFile(null);
    setScreenshotPreview("");
    setFormError("");
  }

  function openTradePlan() {
    setPlanForm({
      datetime: form.datetime || nowUTC6Input(),
      coin: form.coin || "",
      direction: form.direction || "long",
      note: form.note || "",
    });
    setEditingPlanId(null);
    setPlanFormError("");
    setActiveTab("plans");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSingle(field, value) {
    setForm((f) => ({ ...f, [field]: f[field] === value ? "" : value }));
  }

  function requestDelete(id) {
    setPendingDeleteId(id);
  }
  function confirmDelete(id) {
    persist(trades.filter((t) => t.id !== id));
    if (editingId === id) cancelEdit();
    setPendingDeleteId(null);
  }
  function cancelDelete() {
    setPendingDeleteId(null);
  }

  function handlePlanSubmit(e) {
    e.preventDefault();
    const coin = planForm.coin.trim().toUpperCase();
    if (!coin || !planForm.datetime || !planForm.note.trim()) {
      setPlanFormError("Fill in coin, date & time, and the note to save a plan.");
      return;
    }
    const planObj = {
      id: editingPlanId || uid(),
      datetime: planForm.datetime,
      coin,
      direction: planForm.direction,
      note: planForm.note.trim(),
    };
    const next = editingPlanId
      ? plans.map((p) => (p.id === editingPlanId ? planObj : p))
      : [planObj, ...plans];
    persistPlans(next);
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm());
    setPlanFormError("");
  }

  function startEditPlan(p) {
    setPlanForm({
      datetime: p.datetime,
      coin: p.coin,
      direction: p.direction,
      note: p.note || "",
    });
    setEditingPlanId(p.id);
    setPlanFormError("");
  }

  function cancelEditPlan() {
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm());
    setPlanFormError("");
  }

  function requestDeletePlan(id) {
    setPendingDeletePlanId(id);
  }
  function confirmDeletePlan(id) {
    persistPlans(plans.filter((p) => p.id !== id));
    if (editingPlanId === id) cancelEditPlan();
    setPendingDeletePlanId(null);
  }
  function cancelDeletePlan() {
    setPendingDeletePlanId(null);
  }


  const stats = useMemo(() => {
    const total = trades.length;
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const totalMargin = trades.reduce((s, t) => s + t.margin, 0);
    const wins = trades.filter((t) => t.pnl > 0).length;
    const losses = trades.filter((t) => t.pnl < 0).length;
    const winRate = total ? (wins / total) * 100 : 0;
    const avgPnl = total ? totalPnl / total : 0;
    const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const avgWin = wins ? grossProfit / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;
    return { total, totalPnl, totalMargin, wins, losses, winRate, avgPnl, avgWin, avgLoss, profitFactor };
  }, [trades]);

  // Date-range filter — applies to every analytics view below (dashboard,
  // weekly/monthly, coins, long/short, chart, log). It never touches the
  // underlying `trades` state or Firebase, so it can't lose or delete data.
  const filteredTrades = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return trades;
    const startTime = dateRange.start
      ? new Date(`${dateRange.start}T00:00:00`).getTime()
      : -Infinity;
    const endTime = dateRange.end
      ? new Date(`${dateRange.end}T23:59:59.999`).getTime()
      : Infinity;
    return trades.filter((t) => {
      const time = new Date(t.datetime).getTime();
      return time >= startTime && time <= endTime;
    });
  }, [trades, dateRange]);

  const isFiltered = Boolean(dateRange.start || dateRange.end);

  const rangeLabel = useMemo(() => {
    if (!isFiltered) return "All time";
    const fmt = (s) =>
      new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    if (dateRange.start && dateRange.end) return `${fmt(dateRange.start)} – ${fmt(dateRange.end)}`;
    if (dateRange.start) return `Since ${fmt(dateRange.start)}`;
    return `Until ${fmt(dateRange.end)}`;
  }, [dateRange, isFiltered]);

  function applyDatePreset(id) {
    const today = new Date();
    if (id === "all") {
      setDateRange({ start: "", end: "", preset: "all" });
      return;
    }
    if (id === "7d") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      setDateRange({ start: toInputDate(start), end: toInputDate(today), preset: "7d" });
      return;
    }
    if (id === "30d") {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      setDateRange({ start: toInputDate(start), end: toInputDate(today), preset: "30d" });
      return;
    }
    if (id === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({ start: toInputDate(start), end: toInputDate(today), preset: "month" });
      return;
    }
  }

  const filteredStats = useMemo(() => {
    const total = filteredTrades.length;
    const totalPnl = filteredTrades.reduce((s, t) => s + t.pnl, 0);
    const totalMargin = filteredTrades.reduce((s, t) => s + t.margin, 0);
    const wins = filteredTrades.filter((t) => t.pnl > 0).length;
    const losses = filteredTrades.filter((t) => t.pnl < 0).length;
    const winRate = total ? (wins / total) * 100 : 0;
    const avgPnl = total ? totalPnl / total : 0;
    const grossProfit = filteredTrades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(filteredTrades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const avgWin = wins ? grossProfit / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;
    return { total, totalPnl, totalMargin, wins, losses, winRate, avgPnl, avgWin, avgLoss, profitFactor };
  }, [filteredTrades]);

  const traderRank = useMemo(() => getTraderRank(stats.total), [stats.total]);
  const milestoneHit = MILESTONES.includes(stats.total);

  const insights = useMemo(() => {
    const chronological = [...filteredTrades].sort(
      (a, b) => new Date(a.datetime) - new Date(b.datetime)
    );

    let bestWinStreak = 0;
    let runWin = 0;
    chronological.forEach((t) => {
      if (t.pnl > 0) {
        runWin += 1;
        bestWinStreak = Math.max(bestWinStreak, runWin);
      } else if (t.pnl < 0) {
        runWin = 0;
      }
    });

    let currentStreakCount = 0;
    let currentStreakType = null;
    for (let i = chronological.length - 1; i >= 0; i--) {
      const type = chronological[i].pnl > 0 ? "win" : chronological[i].pnl < 0 ? "loss" : null;
      if (type === null) break;
      if (currentStreakType === null) currentStreakType = type;
      if (type !== currentStreakType) break;
      currentStreakCount += 1;
    }

    const grossProfit = chronological
      .filter((t) => t.pnl > 0)
      .reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(
      chronological.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0)
    );
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;

    let running = 0;
    let peak = 0;
    let maxDrawdown = 0;
    chronological.forEach((t) => {
      running += t.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    let best = null;
    let worst = null;
    chronological.forEach((t) => {
      if (!best || t.pnl > best.pnl) best = t;
      if (!worst || t.pnl < worst.pnl) worst = t;
    });

    return {
      bestWinStreak,
      currentStreakCount,
      currentStreakType,
      profitFactor,
      maxDrawdown,
      best,
      worst,
    };
  }, [filteredTrades]);

  const weeklyGroups = useMemo(() => {
    const map = new Map();
    filteredTrades.forEach((t) => {
      const { key, label, monday } = getWeekInfo(t.datetime);
      if (!map.has(key)) map.set(key, { key, label, monday, trades: [] });
      map.get(key).trades.push(t);
    });
    const arr = Array.from(map.values()).map((w) => {
      const total = w.trades.length;
      const pnl = w.trades.reduce((s, t) => s + t.pnl, 0);
      const margin = w.trades.reduce((s, t) => s + t.margin, 0);
      const wins = w.trades.filter((t) => t.pnl > 0).length;
      const winRate = total ? (wins / total) * 100 : 0;
      return { ...w, total, pnl, margin, winRate };
    });
    arr.sort((a, b) => b.monday.getTime() - a.monday.getTime());
    return arr;
  }, [filteredTrades]);

  const monthlyGroups = useMemo(() => {
    const map = new Map();
    filteredTrades.forEach((t) => {
      const { key, label, firstOfMonth } = getMonthInfo(t.datetime);
      if (!map.has(key)) map.set(key, { key, label, firstOfMonth, trades: [] });
      map.get(key).trades.push(t);
    });
    const arr = Array.from(map.values()).map((m) => {
      const total = m.trades.length;
      const pnl = m.trades.reduce((s, t) => s + t.pnl, 0);
      const margin = m.trades.reduce((s, t) => s + t.margin, 0);
      const wins = m.trades.filter((t) => t.pnl > 0).length;
      const winRate = total ? (wins / total) * 100 : 0;
      return { ...m, total, pnl, margin, winRate };
    });
    arr.sort((a, b) => b.firstOfMonth.getTime() - a.firstOfMonth.getTime());
    return arr;
  }, [filteredTrades]);

  const thisWeekKey = getWeekInfo(new Date()).key;
  const thisMonthKey = getMonthInfo(new Date()).key;

  const coinStats = useMemo(() => {
    const map = new Map();
    filteredTrades.forEach((t) => {
      if (!map.has(t.coin)) map.set(t.coin, { coin: t.coin, trades: [] });
      map.get(t.coin).trades.push(t);
    });
    const arr = Array.from(map.values()).map((c) => {
      const total = c.trades.length;
      const pnl = c.trades.reduce((s, t) => s + t.pnl, 0);
      const wins = c.trades.filter((t) => t.pnl > 0).length;
      const winRate = total ? (wins / total) * 100 : 0;
      return { coin: c.coin, total, pnl, winRate };
    });
    arr.sort((a, b) => b.pnl - a.pnl);
    return arr;
  }, [filteredTrades]);

  const directionStats = useMemo(() => {
    const build = (dir) => {
      const list = filteredTrades.filter((t) => t.direction === dir);
      const total = list.length;
      const pnl = list.reduce((s, t) => s + t.pnl, 0);
      const wins = list.filter((t) => t.pnl > 0).length;
      const winRate = total ? (wins / total) * 100 : 0;
      return { total, pnl, winRate };
    };
    return { long: build("long"), short: build("short") };
  }, [filteredTrades]);

  const approachStats = useMemo(() => {
    const build = (val) => {
      const list = filteredTrades.filter((t) => t.approach === val);
      const total = list.length;
      const pnl = list.reduce((s, t) => s + t.pnl, 0);
      const wins = list.filter((t) => t.pnl > 0).length;
      const winRate = total ? (wins / total) * 100 : 0;
      return { total, pnl, winRate };
    };
    return { strong: build("strong"), weak: build("weak") };
  }, [filteredTrades]);

  const entryModelStats = useMemo(() => {
    const build = (val) => {
      const list = filteredTrades.filter((t) => t.entryModel === val);
      const total = list.length;
      const pnl = list.reduce((s, t) => s + t.pnl, 0);
      const wins = list.filter((t) => t.pnl > 0).length;
      const winRate = total ? (wins / total) * 100 : 0;
      return { total, pnl, winRate };
    };
    return ENTRY_MODELS.map((m) => ({ id: m.id, label: m.label, ...build(m.id) }));
  }, [filteredTrades]);

  const sourceStats = useMemo(() => {
    const build = (val) => {
      const list = filteredTrades.filter((t) => t.source === val);
      const total = list.length;
      const pnl = list.reduce((s, t) => s + t.pnl, 0);
      const wins = list.filter((t) => t.pnl > 0).length;
      const winRate = total ? (wins / total) * 100 : 0;
      return { total, pnl, winRate };
    };
    return SOURCE_OPTIONS.map((s) => ({ id: s.id, label: s.label, ...build(s.id) }));
  }, [filteredTrades]);

  const reviewSignals = useMemo(() => {
    const strong = filteredTrades.filter((t) => t.approach === "strong");
    const weak = filteredTrades.filter((t) => t.approach === "weak");
    const highLeverage = filteredTrades.filter((t) => Number(t.leverage) >= 10);
    const groupBy = (items, key) => {
      const groups = new Map();
      items.forEach((t) => {
        const label = t[key] || "Unlabeled";
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(t);
      });
      return Array.from(groups.entries()).map(([label, rows]) => ({
        label,
        trades: rows.length,
        pnl: rows.reduce((s, t) => s + t.pnl, 0),
        winRate: rows.length ? (rows.filter((t) => t.pnl > 0).length / rows.length) * 100 : 0,
      })).sort((a, b) => b.pnl - a.pnl);
    };
    const models = groupBy(filteredTrades, "entryModel").filter((x) => x.label !== "Unlabeled");
    const bestModel = models[0];
    const focus = [];
    const strengths = [];
    if (strong.length && weak.length) {
      const strongPnl = strong.reduce((s, t) => s + t.pnl, 0);
      const weakPnl = weak.reduce((s, t) => s + t.pnl, 0);
      if (strongPnl > weakPnl) strengths.push(`Strong approach is outperforming weak approach by ${fmtMoney(strongPnl - weakPnl)}.`);
      if (weakPnl < 0) focus.push(`Weak-approach trades cost ${fmtMoney(Math.abs(weakPnl))}. Wait for confirmation before entering.`);
    }
    if (bestModel) strengths.push(`${ENTRY_MODEL_LABELS[bestModel.label] || bestModel.label} is your best tagged model at ${fmtPct(bestModel.winRate)} win rate.`);
    if (highLeverage.length) {
      const highLevPnl = highLeverage.reduce((s, t) => s + t.pnl, 0);
      focus.push(`${highLeverage.length} trade${highLeverage.length === 1 ? "" : "s"} used 10x+ leverage (${fmtMoney(highLevPnl)} net). Review whether size matched conviction.`);
    }
    if (!strengths.length) strengths.push("Tag your approach and entry model to unlock pattern-level coaching.");
    if (!focus.length) focus.push("No major risk flag yet. Keep logging the reason and rule adherence for every trade.");
    return { strengths, focus };
  }, [filteredTrades]);

  const chartData = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    let running = 0;
    return sorted.map((t, i) => {
      running += t.pnl;
      return {
        index: i + 1,
        date: new Date(t.datetime).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        cumulative: Math.round(running * 100) / 100,
      };
    });
  }, [filteredTrades]);

  const sortedTradesDesc = useMemo(
    () => [...filteredTrades].sort((a, b) => new Date(b.datetime) - new Date(a.datetime)),
    [filteredTrades]
  );

  // Coin autocomplete stays based on ALL trades (not the date filter) so the
  // ticket form keeps suggesting every coin you've ever traded.
  const coinOptions = useMemo(() => {
    const used = trades.map((t) => t.coin);
    return Array.from(new Set([...used, ...DEFAULT_COINS])).sort();
  }, [trades]);

  const marginTypedVal = form.margin.trim() !== "" ? parseFloat(form.margin) : null;
  const roiTypedVal = form.roi.trim() !== "" ? parseFloat(form.roi) : null;
  const pnlVal = parseFloat(form.pnl);
  let resolvedMargin = null;
  let resolvedRoi = null;
  if (marginTypedVal !== null && !Number.isNaN(marginTypedVal) && marginTypedVal !== 0) {
    resolvedMargin = marginTypedVal;
    resolvedRoi = !Number.isNaN(pnlVal) ? (pnlVal / marginTypedVal) * 100 : null;
  } else if (roiTypedVal !== null && !Number.isNaN(roiTypedVal) && roiTypedVal !== 0 && !Number.isNaN(pnlVal)) {
    resolvedRoi = roiTypedVal;
    resolvedMargin = pnlVal / (roiTypedVal / 100);
  }

  const tabs = [
    { id: "plans", label: "Trade plan" },
    { id: "dashboard", label: "Dashboard" },
    { id: "weekly", label: "Weekly" },
    { id: "coins", label: "Coins" },
    { id: "longshort", label: "Long / Short" },
    { id: "confirm", label: "Setup Stats" },
    { id: "chart", label: "Chart" },
    { id: "log", label: "Log" },
  ];

  const ticketMood = ticketMoodFor(form);

  return (
    <div className="tj-app">
      <style>{css}</style>

      <header className="tj-header">
        <div>
          <h1 className="tj-display tj-title">Trade Journal</h1>
          <p className="tj-subtitle tj-mono">
            {stats.total} trade{stats.total !== 1 ? "s" : ""} logged
          </p>
        </div>
        <div className="tj-header-actions">
          <span className="tj-tag tj-tag-level">Preview · demo data (not saved)</span>
          <button
            type="button"
            className="tj-link-btn tj-muted"
            onClick={() => { setTrades(buildSeedTrades()); setPlans(buildSeedPlans()); }}
          >
            Reset demo data
          </button>
        </div>
      </header>
      <form className="tj-ticket" onSubmit={handleSubmit}>
        <TicketMascot mood={ticketMood.state} line={ticketMood.line} celebrating={celebration.show} />
        {celebration.show && (
          <div className="tj-ticket-celebrate" aria-hidden="true">
            {celebration.kind === "new" && <ConfettiBurst />}
            <div className="tj-xp-toast">
              <Sparkles size={14} strokeWidth={2.4} />
              {celebration.kind === "new" ? `Trade logged · +${celebration.xp} XP` : "Trade updated"}
            </div>
          </div>
        )}
        <div className="tj-ticket-stub">
          <span className="tj-mono tj-ticket-num">
            {editingId ? "EDITING TICKET" : `№ ${String(stats.total + 1).padStart(4, "0")}`}
          </span>
          <span className="tj-mono tj-ticket-date">
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        <div className="tj-binance-import">
          <div className="tj-import-heading">
            <div>
              <strong><ClipboardPaste size={15} /> Quick import from Binance</strong>
              <span>Paste one closed position. The journal will extract the context that matters for review.</span>
            </div>
            {binanceImported && <span className="tj-import-success"><ClipboardCheck size={14} /> Fields filled</span>}
          </div>
          <textarea
            className="tj-import-textarea"
            value={binancePaste}
            onChange={(e) => setBinancePaste(e.target.value)}
            placeholder={"ATOMUSDT\nPerp\n15x\nCross Long\n…paste the full Binance position-history block"}
            aria-label="Paste Binance position history"
          />
          <div className="tj-import-actions">
            <button type="button" className="tj-btn-import" onClick={importBinanceTrade} disabled={!binancePaste.trim()}>
              <ClipboardPaste size={15} /> Parse &amp; fill trade
            </button>
            <span className="tj-import-hint">Prices · PNL · ROI · dates · leverage · volume · duration · Max OI</span>
          </div>
        </div>

        <div className="tj-ticket-fields">
          <label className="tj-field">
            <span>Date &amp; time</span>
            <input
              type="datetime-local"
              value={form.datetime}
              onChange={(e) => setForm({ ...form, datetime: e.target.value })}
              required
            />
          </label>

          <label className="tj-field">
            <span>Coin</span>
            <input
              list="tj-coins"
              placeholder="BTC"
              value={form.coin}
              onChange={(e) => setForm({ ...form, coin: e.target.value.toUpperCase() })}
              required
            />
            <datalist id="tj-coins">
              {coinOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <div className="tj-field">
            <span>Direction</span>
            <div className="tj-dir-toggle">
              <button
                type="button"
                className={`tj-dir-btn tj-dir-long ${form.direction === "long" ? "active" : ""}`}
                onClick={() => setForm({ ...form, direction: "long" })}
              >
                Long
              </button>
              <button
                type="button"
                className={`tj-dir-btn tj-dir-short ${form.direction === "short" ? "active" : ""}`}
                onClick={() => setForm({ ...form, direction: "short" })}
              >
                Short
              </button>
            </div>
          </div>

          <label className="tj-field">
            <span>Entry price</span>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={form.entry}
              onChange={(e) => setForm({ ...form, entry: e.target.value })}
              required
            />
          </label>

          <label className="tj-field">
            <span>Exit price</span>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={form.exit}
              onChange={(e) => setForm({ ...form, exit: e.target.value })}
              required
            />
          </label>

          <label className="tj-field">
            <span>
              Margin <em className="tj-optional">or ROI</em>
            </span>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={form.margin}
              onChange={(e) => setForm({ ...form, margin: e.target.value })}
            />
          </label>

          <label className="tj-field">
            <span>
              ROI % <em className="tj-optional">or Margin</em>
            </span>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="e.g. 8.5"
              value={form.roi}
              onChange={(e) => setForm({ ...form, roi: e.target.value })}
            />
          </label>

          <label className="tj-field">
            <span>PNL</span>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0.00"
              value={form.pnl}
              onChange={(e) => setForm({ ...form, pnl: e.target.value })}
              required
            />
          </label>

          <div className="tj-field tj-field-roi">
            <span>Will save</span>
            <span
              className={`tj-mono tj-roi-preview ${
                resolvedRoi > 0 ? "pos" : resolvedRoi < 0 ? "neg" : ""
              }`}
            >
              {resolvedMargin === null ? "—" : `${fmtMoney(resolvedMargin)} · ${fmtPct(resolvedRoi)}`}
            </span>
          </div>

          <label className="tj-field tj-field-note">
            <span>Note (optional)</span>
            <div className="tj-note-row">
              <input
                type="text"
                placeholder="Reason for the trade, or anything extra that happened"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <button
                type="button"
                className={`tj-note-star ${form.noteImportant ? "active" : ""}`}
                onClick={() => setForm({ ...form, noteImportant: !form.noteImportant })}
                aria-pressed={form.noteImportant}
                aria-label="Mark this note as important"
                title="Mark this note as important"
              >
                <Star size={16} strokeWidth={2.2} fill={form.noteImportant ? "currentColor" : "none"} />
              </button>
            </div>
          </label>
        </div>

        <div className="tj-setup-block">
          <span className="tj-setup-label">
            Setup <em className="tj-optional">optional</em>
          </span>
          <div className="tj-setup-grid">
            <div className="tj-field">
              <span>Approach</span>
              <div className="tj-opt-toggle">
                <button
                  type="button"
                  className={`tj-opt-btn ${form.approach === "strong" ? "active" : ""}`}
                  onClick={() => toggleSingle("approach", "strong")}
                >
                  Strong
                </button>
                <button
                  type="button"
                  className={`tj-opt-btn ${form.approach === "weak" ? "active" : ""}`}
                  onClick={() => toggleSingle("approach", "weak")}
                >
                  Weak
                </button>
              </div>
            </div>

            <div className="tj-field">
              <span>Entry model</span>
              <div className="tj-opt-toggle">
                {ENTRY_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`tj-opt-btn ${form.entryModel === m.id ? "active" : ""}`}
                    onClick={() => toggleSingle("entryModel", m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="tj-field">
              <span>Source</span>
              <div className="tj-opt-toggle">
                {SOURCE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`tj-opt-btn ${form.source === s.id ? "active" : ""}`}
                    onClick={() => toggleSingle("source", s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {form.source === "others" && (
                <input
                  type="text"
                  className="tj-source-other"
                  placeholder="Which source?"
                  value={form.sourceOther}
                  onChange={(e) => setForm({ ...form, sourceOther: e.target.value })}
                />
              )}
            </div>
          </div>

          <span className="tj-setup-sublabel">
            Proof <em className="tj-optional">optional</em>
          </span>
          <div className="tj-proof-row">
            <label className="tj-field tj-field-prooflink">
              <span>Screenshot link</span>
              <div className="tj-input-icon-wrap">
                <Link2 size={14} strokeWidth={2.2} />
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.proofLink}
                  onChange={(e) => setForm({ ...form, proofLink: e.target.value })}
                />
              </div>
            </label>

            <div className="tj-field tj-field-shot">
              <span>Screenshot upload (saved to Firebase)</span>
              {screenshotPreview ? (
                <div className="tj-shot-preview">
                  <img src={screenshotPreview} alt="Trade screenshot" />
                  {uploadingShot ? (
                    <div className="tj-shot-uploading">
                      <Loader2 size={16} className="tj-spin" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="tj-shot-remove"
                      onClick={removeScreenshot}
                      aria-label="Remove screenshot"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <label className="tj-shot-upload">
                  <ImagePlus size={16} strokeWidth={2.2} />
                  <span>Choose image</span>
                  <input type="file" accept="image/*" onChange={handleScreenshotChange} hidden />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="tj-ticket-actions">
          {formError && <span className="tj-form-error">{formError}</span>}
          <button type="button" className="tj-btn-plan" onClick={openTradePlan}>
            <Calendar size={14} strokeWidth={2.2} /> Trade plan
          </button>
          {editingId && (
            <button type="button" className="tj-btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
          <button type="submit" className="tj-btn-primary" disabled={uploadingShot}>
            {uploadingShot ? "Uploading…" : editingId ? "Update trade" : "Log trade"}
          </button>
        </div>
      </form>

      <div className="tj-filter-bar">
        <div className="tj-filter-presets">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`tj-filter-chip ${dateRange.preset === p.id ? "active" : ""}`}
              onClick={() => applyDatePreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="tj-filter-dates">
          <label className="tj-filter-date-field">
            <Calendar size={13} strokeWidth={2.2} />
            <input
              type="date"
              value={dateRange.start}
              max={dateRange.end || undefined}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value, preset: "custom" })
              }
              aria-label="Start date"
            />
          </label>
          <span className="tj-filter-arrow">→</span>
          <label className="tj-filter-date-field">
            <input
              type="date"
              value={dateRange.end}
              min={dateRange.start || undefined}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value, preset: "custom" })
              }
              aria-label="End date"
            />
          </label>
          {isFiltered && (
            <button
              type="button"
              className="tj-filter-clear"
              onClick={() => applyDatePreset("all")}
              aria-label="Clear date filter"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <span className="tj-filter-count tj-mono">
          {filteredTrades.length} of {trades.length} trade{trades.length !== 1 ? "s" : ""}
        </span>
      </div>

      <nav className="tj-tabs">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            className={`tj-tab ${activeTab === tb.id ? "active" : ""}`}
            onClick={() => setActiveTab(tb.id)}
          >
            {tb.label}
          </button>
        ))}
      </nav>

      <main className="tj-main">
        {activeTab === "dashboard" && (
          <DashboardView
            stats={stats}
            filteredStats={filteredStats}
            rank={traderRank}
            milestoneHit={milestoneHit}
            insights={insights}
            reviewSignals={reviewSignals}
            isFiltered={isFiltered}
            rangeLabel={rangeLabel}
          />
        )}
        {activeTab === "weekly" && (
          <PeriodView
            weeks={weeklyGroups}
            months={monthlyGroups}
            thisWeekKey={thisWeekKey}
            thisMonthKey={thisMonthKey}
          />
        )}
        {activeTab === "coins" && <CoinsView coins={coinStats} />}
        {activeTab === "longshort" && <LongShortView data={directionStats} />}
        {activeTab === "confirm" && (
          <ConfirmationView
            approachStats={approachStats}
            entryModelStats={entryModelStats}
            sourceStats={sourceStats}
          />
        )}
        {activeTab === "chart" && <ChartView data={chartData} />}
        {activeTab === "log" && (
          <LogView
            trades={sortedTradesDesc}
            onEdit={startEdit}
            onDelete={requestDelete}
            pendingDeleteId={pendingDeleteId}
            onConfirmDelete={confirmDelete}
            onCancelDelete={cancelDelete}
          />
        )}
        {activeTab === "plans" && (
          <PlansView
            coinOptions={coinOptions}
            planForm={planForm}
            setPlanForm={setPlanForm}
            editingPlanId={editingPlanId}
            planFormError={planFormError}
            onSubmit={handlePlanSubmit}
            onCancelEdit={cancelEditPlan}
            plans={plans}
            onEdit={startEditPlan}
            onDelete={requestDeletePlan}
            pendingDeleteId={pendingDeletePlanId}
            onConfirmDelete={confirmDeletePlan}
            onCancelDelete={cancelDeletePlan}
          />
        )}
      </main>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="tj-empty">{text || "No trades yet. Log your first trade above to start building your journal."}</p>;
}

function StatCard({ label, value, tone, icon: Icon }) {
  return (
    <div className="tj-card">
      <span className="tj-card-label">
        {Icon && <Icon size={13} strokeWidth={2.2} className="tj-card-icon" />}
        {label}
      </span>
      <span className={`tj-mono tj-card-value ${tone || ""}`}>{value}</span>
    </div>
  );
}

function RankBadge({ level, progress }) {
  const r = 27;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="tj-rank-badge">
      <svg viewBox="0 0 64 64" className="tj-rank-ring" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="tj-rank-ring-bg" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="tj-rank-ring-fg"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="tj-rank-level tj-mono">{level}</span>
    </div>
  );
}

function DashboardView({ stats, filteredStats, rank, milestoneHit, insights, reviewSignals, isFiltered, rangeLabel }) {
  const noDataAtAll = stats.total === 0;
  const noDataInRange = !noDataAtAll && filteredStats.total === 0;

  return (
    <div>
      <div className={`tj-rank-card ${milestoneHit ? "tj-rank-milestone" : ""}`}>
        <RankBadge level={rank.level} progress={rank.xpProgress} />
        <div className="tj-rank-info">
          <span className="tj-rank-eyebrow tj-mono">
            <Sparkles size={12} strokeWidth={2.2} />
            Trader rank · all-time
          </span>
          <span className="tj-rank-title tj-display">{rank.title}</span>
          <div className="tj-rank-progress-track">
            <div className="tj-rank-progress-fill" style={{ width: `${rank.xpProgress * 100}%` }} />
          </div>
          <span className="tj-rank-next">
            {milestoneHit
              ? `🎉 Milestone reached — ${stats.total} trades logged!`
              : `${rank.tradesToNext} more trade${rank.tradesToNext !== 1 ? "s" : ""} to level ${rank.level + 1}`}
          </span>
        </div>
      </div>

      <div className="tj-hero">
        <span className="tj-hero-label">Total PNL{isFiltered ? ` · ${rangeLabel}` : ""}</span>
        <span
          className={`tj-mono tj-hero-value ${
            filteredStats.totalPnl > 0 ? "pos" : filteredStats.totalPnl < 0 ? "neg" : ""
          }`}
        >
          {fmtMoney(filteredStats.totalPnl)}
        </span>
      </div>
      <div className="tj-stat-grid">
        <StatCard label="Total margin" value={fmtMoney(filteredStats.totalMargin)} />
        <StatCard label="Total trades" value={filteredStats.total} />
        <StatCard label="Winning trades" value={filteredStats.wins} tone="pos" />
        <StatCard label="Losing trades" value={filteredStats.losses} tone="neg" />
        <StatCard label="Win rate" value={fmtPct(filteredStats.winRate)} />
        <StatCard
          label="Avg PNL / trade"
          value={fmtMoney(filteredStats.avgPnl)}
          tone={filteredStats.avgPnl > 0 ? "pos" : filteredStats.avgPnl < 0 ? "neg" : ""}
        />
        <StatCard
          icon={Target}
          label="Profit factor"
          value={
            filteredStats.profitFactor === null
              ? "—"
              : filteredStats.profitFactor === Infinity
              ? "∞"
              : filteredStats.profitFactor.toFixed(2)
          }
          tone={filteredStats.profitFactor >= 1.5 ? "pos" : filteredStats.profitFactor !== null && filteredStats.profitFactor < 1 ? "neg" : ""}
        />
        <StatCard icon={TrendingUp} label="Avg winner" value={fmtMoney(filteredStats.avgWin)} tone="pos" />
        <StatCard icon={TrendingDown} label="Avg loser" value={fmtMoney(-Math.abs(filteredStats.avgLoss))} tone="neg" />
      </div>

      {!noDataAtAll && !noDataInRange && (
        <>
          <h3 className="tj-section-title">Trading insights{isFiltered ? ` · ${rangeLabel}` : ""}</h3>
          <div className="tj-stat-grid">
            <StatCard
              icon={Flame}
              label="Current streak"
              value={
                insights.currentStreakCount
                  ? `${insights.currentStreakCount}${insights.currentStreakType === "win" ? "W" : "L"}`
                  : "—"
              }
              tone={
                insights.currentStreakType === "win"
                  ? "pos"
                  : insights.currentStreakType === "loss"
                  ? "neg"
                  : ""
              }
            />
            <StatCard icon={Trophy} label="Best win streak" value={insights.bestWinStreak} tone="pos" />
            <StatCard
              icon={Shield}
              label="Profit factor"
              value={
                insights.profitFactor === null
                  ? "—"
                  : insights.profitFactor === Infinity
                  ? "∞"
                  : insights.profitFactor.toFixed(2)
              }
            />
            <StatCard
              icon={TrendingDown}
              label="Max drawdown"
              value={fmtMoney(-Math.abs(insights.maxDrawdown))}
              tone={insights.maxDrawdown > 0 ? "neg" : ""}
            />
            <StatCard
              icon={Trophy}
              label="Best trade"
              value={insights.best ? `${insights.best.coin} ${fmtMoney(insights.best.pnl)}` : "—"}
              tone="pos"
            />
            <StatCard
              icon={TrendingDown}
              label="Worst trade"
              value={insights.worst ? `${insights.worst.coin} ${fmtMoney(insights.worst.pnl)}` : "—"}
              tone="neg"
            />
          </div>
          <div className="tj-coach-grid">
            <div className="tj-coach-card tj-coach-strength">
              <div className="tj-coach-heading"><Brain size={15} /> What is working</div>
              {reviewSignals.strengths.map((line, index) => <p key={index}>{line}</p>)}
            </div>
            <div className="tj-coach-card tj-coach-focus">
              <div className="tj-coach-heading"><AlertTriangle size={15} /> What to improve</div>
              {reviewSignals.focus.map((line, index) => <p key={index}>{line}</p>)}
            </div>
          </div>
        </>
      )}

      {noDataAtAll && <EmptyState />}
      {noDataInRange && (
        <EmptyState text="No trades in this date range — try widening it or choosing “All time.”" />
      )}
    </div>
  );
}

function PeriodView({ weeks, months, thisWeekKey, thisMonthKey }) {
  const [mode, setMode] = useState("weekly");
  const isWeekly = mode === "weekly";
  const groups = isWeekly ? weeks : months;
  const currentKey = isWeekly ? thisWeekKey : thisMonthKey;
  const current = groups.find((g) => g.key === currentKey);
  const previous = groups.filter((g) => g.key !== currentKey);

  return (
    <div>
      <div className="tj-period-toggle">
        <button
          type="button"
          className={`tj-period-btn ${isWeekly ? "active" : ""}`}
          onClick={() => setMode("weekly")}
        >
          Weekly
        </button>
        <button
          type="button"
          className={`tj-period-btn ${!isWeekly ? "active" : ""}`}
          onClick={() => setMode("monthly")}
        >
          Monthly
        </button>
      </div>

      <div className="tj-hero tj-hero-week">
        <span className="tj-hero-label">
          {isWeekly ? "This week" : "This month"}
          {current ? ` · ${current.label}` : ""}
        </span>
        <span
          className={`tj-mono tj-hero-value ${
            current && current.pnl > 0 ? "pos" : current && current.pnl < 0 ? "neg" : ""
          }`}
        >
          {fmtMoney(current ? current.pnl : 0)}
        </span>
      </div>
      <div className="tj-stat-grid">
        <StatCard label={`Trades this ${isWeekly ? "week" : "month"}`} value={current ? current.total : 0} />
        <StatCard
          label={`${isWeekly ? "Weekly" : "Monthly"} margin`}
          value={fmtMoney(current ? current.margin : 0)}
        />
        <StatCard
          label={`${isWeekly ? "Weekly" : "Monthly"} win rate`}
          value={fmtPct(current ? current.winRate : 0)}
        />
      </div>
      <h3 className="tj-section-title">{isWeekly ? "Previous weeks" : "Previous months"}</h3>
      {previous.length === 0 ? (
        <EmptyState
          text={
            isWeekly
              ? "No previous weeks yet — keep logging to build a week-over-week view."
              : "No previous months yet — keep logging to build a month-over-month view."
          }
        />
      ) : (
        <table className="tj-table">
          <thead>
            <tr>
              <th>{isWeekly ? "Week" : "Month"}</th>
              <th>Trades</th>
              <th>PNL</th>
              <th>Win rate</th>
            </tr>
          </thead>
          <tbody>
            {previous.map((g) => (
              <tr key={g.key}>
                <td>{g.label}</td>
                <td className="tj-mono">{g.total}</td>
                <td className={`tj-mono ${g.pnl > 0 ? "pos" : g.pnl < 0 ? "neg" : ""}`}>{fmtMoney(g.pnl)}</td>
                <td className="tj-mono">{fmtPct(g.winRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CoinsView({ coins }) {
  if (coins.length === 0) return <EmptyState />;
  return (
    <table className="tj-table">
      <thead>
        <tr>
          <th>Coin</th>
          <th>Trades</th>
          <th>Total PNL</th>
          <th>Win rate</th>
        </tr>
      </thead>
      <tbody>
        {coins.map((c) => (
          <tr key={c.coin}>
            <td className="tj-mono tj-coin-badge">{c.coin}</td>
            <td className="tj-mono">{c.total}</td>
            <td className={`tj-mono ${c.pnl > 0 ? "pos" : c.pnl < 0 ? "neg" : ""}`}>{fmtMoney(c.pnl)}</td>
            <td className="tj-mono">{fmtPct(c.winRate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DirectionCard({ label, tone, stats }) {
  return (
    <div className={`tj-card tj-dir-card tj-dir-card-${tone}`}>
      <span className="tj-dir-card-label">{label}</span>
      <div className="tj-dir-card-row">
        <span>Trades</span>
        <span className="tj-mono">{stats.total}</span>
      </div>
      <div className="tj-dir-card-row">
        <span>PNL</span>
        <span className={`tj-mono ${stats.pnl > 0 ? "pos" : stats.pnl < 0 ? "neg" : ""}`}>
          {fmtMoney(stats.pnl)}
        </span>
      </div>
      <div className="tj-dir-card-row">
        <span>Win rate</span>
        <span className="tj-mono">{fmtPct(stats.winRate)}</span>
      </div>
    </div>
  );
}

function LongShortView({ data }) {
  const { long, short } = data;
  const total = long.total + short.total;
  if (total === 0) return <EmptyState />;
  return (
    <div className="tj-ls-grid">
      <DirectionCard label="Long" tone="long" stats={long} />
      <DirectionCard label="Short" tone="short" stats={short} />
    </div>
  );
}

function ChartView({ data }) {
  if (data.length < 2) {
    return <EmptyState text="Log at least two trades to see your cumulative PNL trend." />;
  }
  return (
    <div className="tj-chart-wrap">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2A2F3A" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="#8891A3" fontSize={12} tickLine={false} axisLine={{ stroke: "#2A2F3A" }} />
          <YAxis
            stroke="#8891A3"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(v) => fmtMoney(v)}
          />
          <Tooltip
            contentStyle={{
              background: "#1A1E27",
              border: "1px solid #2A2F3A",
              borderRadius: 8,
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12,
            }}
            labelStyle={{ color: "#8891A3" }}
            formatter={(v) => [fmtMoney(v), "Cumulative PNL"]}
          />
          <Line type="monotone" dataKey="cumulative" stroke="#E8A33D" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function LogView({ trades, onEdit, onDelete, pendingDeleteId, onConfirmDelete, onCancelDelete }) {
  const [importantOnly, setImportantOnly] = useState(false);
  if (trades.length === 0) return <EmptyState />;
  const visibleTrades = importantOnly ? trades.filter((t) => t.noteImportant) : trades;
  return (
    <div className="tj-log">
      <div className="tj-log-toolbar">
        <button
          type="button"
          className={`tj-important-toggle ${importantOnly ? "active" : ""}`}
          onClick={() => setImportantOnly((v) => !v)}
        >
          <Star size={13} strokeWidth={2.4} fill={importantOnly ? "currentColor" : "none"} />
          Important notes{importantOnly ? "" : " only"}
        </button>
      </div>
      {visibleTrades.length === 0 ? (
        <EmptyState text="No important notes marked yet — tap the ⭐ next to Note when logging a trade." />
      ) : (
        visibleTrades.map((t) => {
        const roi = t.margin ? (t.pnl / t.margin) * 100 : null;
        return (
          <div key={t.id} className="tj-log-row">
            <div className="tj-log-main">
              <span className={`tj-dir-dot tj-dir-dot-${t.direction}`} title={t.direction}></span>
              <span className="tj-mono tj-log-coin">{t.coin}</span>
              <span className="tj-mono tj-log-date">
                {new Date(t.datetime).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="tj-mono tj-log-prices">
                {fmtNum(t.entry)} → {fmtNum(t.exit)}
              </span>
              <span className="tj-mono tj-log-margin">margin {fmtMoney(t.margin)}</span>
              {roi !== null && (
                <span className={`tj-mono tj-log-roi ${roi > 0 ? "pos" : roi < 0 ? "neg" : ""}`}>
                  {fmtPct(roi)} ROI
                </span>
              )}
              <span className={`tj-mono tj-log-pnl ${t.pnl > 0 ? "pos" : t.pnl < 0 ? "neg" : ""}`}>
                {fmtMoney(t.pnl)}
              </span>
              <span className="tj-log-actions">
                <button className="tj-icon-btn" onClick={() => onEdit(t)} aria-label="Edit trade">
                  <Pencil size={14} />
                </button>
                {pendingDeleteId === t.id ? (
                  <>
                    <button className="tj-icon-btn tj-confirm" onClick={() => onConfirmDelete(t.id)}>
                      Delete?
                    </button>
                    <button className="tj-icon-btn" onClick={onCancelDelete} aria-label="Cancel delete">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button className="tj-icon-btn" onClick={() => onDelete(t.id)} aria-label="Delete trade">
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
            </div>
            {(t.approach || t.entryModel || t.proofLink || t.source || t.leverage || t.duration || t.closedVolume || t.maxOi || t.status) && (
              <div className="tj-log-tags">
                {t.source && (
                  <span className="tj-tag tj-tag-source">
                    {t.source === "others" ? (t.sourceOther || "Others") : SOURCE_LABELS[t.source] || t.source}
                  </span>
                )}
                {t.leverage && <span className="tj-tag tj-tag-source">{t.leverage}x</span>}
                {t.status && <span className="tj-tag">{t.status}</span>}
                {t.duration && <span className="tj-tag">lasting {t.duration}</span>}
                {t.closedVolume && <span className="tj-tag">closed {fmtNum(t.closedVolume)}</span>}
                {t.maxOi && <span className="tj-tag">max OI {fmtNum(t.maxOi)}</span>}
                {t.approach && (
                  <span className={`tj-tag tj-tag-approach-${t.approach}`}>
                    {t.approach === "strong" ? "Strong approach" : "Weak approach"}
                  </span>
                )}
                {t.entryModel && (
                  <span className="tj-tag tj-tag-model">{ENTRY_MODEL_LABELS[t.entryModel] || t.entryModel} entry</span>
                )}
                {t.proofLink && (
                  <a className="tj-tag tj-tag-link" href={t.proofLink} target="_blank" rel="noopener noreferrer">
                    <Link2 size={11} strokeWidth={2.2} style={{ display: "inline", verticalAlign: "-1px", marginRight: 3 }} />
                    Proof link
                  </a>
                )}
              </div>
            )}
            {t.screenshotUrl && (
              <a href={t.screenshotUrl} target="_blank" rel="noopener noreferrer">
                <img src={t.screenshotUrl} alt="Trade screenshot" className="tj-log-shot" />
              </a>
            )}
            {t.note && (
              <div className={`tj-log-note ${t.noteImportant ? "tj-log-note-important" : ""}`}>
                {t.noteImportant && <Star size={12} strokeWidth={2.4} fill="currentColor" className="tj-log-note-star" />}
                {t.note}
              </div>
            )}
          </div>
        );
        })
      )}
    </div>
  );
}

function PlansView({
  coinOptions,
  planForm,
  setPlanForm,
  editingPlanId,
  planFormError,
  onSubmit,
  onCancelEdit,
  plans,
  onEdit,
  onDelete,
  pendingDeleteId,
  onConfirmDelete,
  onCancelDelete,
}) {
  return (
    <div>
      <form className="tj-ticket" onSubmit={onSubmit}>
        <div className="tj-setup-grid">
          <label className="tj-field">
            <span>Date &amp; time (UTC+6)</span>
            <input
              type="datetime-local"
              value={planForm.datetime}
              onChange={(e) => setPlanForm({ ...planForm, datetime: e.target.value })}
              required
            />
          </label>

          <label className="tj-field">
            <span>Coin</span>
            <input
              list="tj-coins-plan"
              placeholder="BTC"
              value={planForm.coin}
              onChange={(e) => setPlanForm({ ...planForm, coin: e.target.value.toUpperCase() })}
              required
            />
            <datalist id="tj-coins-plan">
              {coinOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <div className="tj-field">
            <span>Direction</span>
            <div className="tj-dir-toggle">
              <button
                type="button"
                className={`tj-dir-btn tj-dir-long ${planForm.direction === "long" ? "active" : ""}`}
                onClick={() => setPlanForm({ ...planForm, direction: "long" })}
              >
                Long
              </button>
              <button
                type="button"
                className={`tj-dir-btn tj-dir-short ${planForm.direction === "short" ? "active" : ""}`}
                onClick={() => setPlanForm({ ...planForm, direction: "short" })}
              >
                Short
              </button>
              <button
                type="button"
                className={`tj-dir-btn tj-dir-think ${planForm.direction === "think" ? "active" : ""}`}
                onClick={() => setPlanForm({ ...planForm, direction: "think" })}
              >
                Think
              </button>
            </div>
          </div>
        </div>

        <label className="tj-field tj-field-note" style={{ marginTop: 14 }}>
          <span>Note</span>
          <textarea
            rows={3}