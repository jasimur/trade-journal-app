import React, { useState, useEffect, useMemo } from "react";
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
  Mail,
  Lock,
  Zap,
  Flame,
  Trophy,
  Shield,
  TrendingDown,
  Calendar,
  Sparkles,
  ImagePlus,
  Link2,
  Loader2,
  Star,
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
import { auth, db, storage } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

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
  pnl: "",
  note: "",
  noteImportant: false,
  approach: "",
  entryModel: "",
  proofLink: "",
  screenshotUrl: "",
  source: "",
  sourceOther: "",
});

const emptyPlanForm = () => ({
  datetime: nowUTC6Input(),
  coin: "",
  direction: "long",
  note: "",
});

export default function TradeJournal() {
  const [trades, setTrades] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      setLoaded(false);
      setTrades([]);
      setPlans([]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      if (authReady && !user) setLoaded(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [tradesSnap, plansSnap] = await Promise.all([
          getDocs(collection(db, "users", user.uid, "trades")),
          getDocs(collection(db, "users", user.uid, "plans")),
        ]);
        const loadedTrades = tradesSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        loadedTrades.sort(
          (a, b) => new Date(b.datetime) - new Date(a.datetime)
        );
        const loadedPlans = plansSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        loadedPlans.sort(
          (a, b) => new Date(b.datetime) - new Date(a.datetime)
        );
        if (!cancelled) {
          setTrades(loadedTrades);
          setPlans(loadedPlans);
        }
      } catch (e) {
        console.error("Failed to load journal", e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  async function persist(next) {
    if (!user) return;
    setTrades(next);
    try {
      const existing = new Set(next.map((trade) => trade.id));
      const snapshot = await getDocs(
        collection(db, "users", user.uid, "trades")
      );

      await Promise.all(
        snapshot.docs
          .filter((item) => !existing.has(item.id))
          .map((item) => deleteDoc(item.ref))
      );

      await Promise.all(
        next.map((trade) =>
          setDoc(doc(db, "users", user.uid, "trades", trade.id), trade)
        )
      );
    } catch (e) {
      console.error("Failed to save journal", e);
      setFormError("Could not save to Firebase. Please try again.");
    }
  }

  async function persistPlans(next) {
    if (!user) return;
    setPlans(next);
    try {
      const existing = new Set(next.map((plan) => plan.id));
      const snapshot = await getDocs(
        collection(db, "users", user.uid, "plans")
      );

      await Promise.all(
        snapshot.docs
          .filter((item) => !existing.has(item.id))
          .map((item) => deleteDoc(item.ref))
      );

      await Promise.all(
        next.map((plan) =>
          setDoc(doc(db, "users", user.uid, "plans", plan.id), plan)
        )
      );
    } catch (e) {
      console.error("Failed to save plans", e);
      setPlanFormError("Could not save to Firebase. Please try again.");
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      await signInWithEmailAndPassword(
        auth,
        loginEmail.trim(),
        loginPassword
      );
      setLoginPassword("");
    } catch (e) {
      setLoginError("Login failed. Check your email and password.");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleScreenshotChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setFormError("");
  }

  async function removeScreenshot() {
    if (form.screenshotUrl) {
      try {
        await deleteObject(storageRef(storage, form.screenshotUrl));
      } catch (e) {
        // best-effort — file may already be gone, or URL wasn't a storage ref
      }
    }
    setScreenshotFile(null);
    setScreenshotPreview("");
    setForm((f) => ({ ...f, screenshotUrl: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const coin = form.coin.trim().toUpperCase();
    if (!coin || !form.datetime || form.entry === "" || form.exit === "" || form.margin === "" || form.pnl === "") {
      setFormError("Fill in every field to log the trade.");
      return;
    }
    const entryNum = parseFloat(form.entry);
    const exitNum = parseFloat(form.exit);
    const marginNum = parseFloat(form.margin);
    const pnlNum = parseFloat(form.pnl);
    if ([entryNum, exitNum, marginNum, pnlNum].some((n) => Number.isNaN(n))) {
      setFormError("Price, margin and PNL need to be numbers.");
      return;
    }

    const tradeId = editingId || uid();
    let screenshotUrl = form.screenshotUrl;

    if (screenshotFile) {
      setUploadingShot(true);
      try {
        const path = `trade-screenshots/${user.uid}/${tradeId}.${fileExt(screenshotFile.name)}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, screenshotFile);
        screenshotUrl = await getDownloadURL(fileRef);
      } catch (e) {
        console.error("Screenshot upload failed", e);
        setUploadingShot(false);
        setFormError("Screenshot upload failed. Check Firebase Storage setup and try again.");
        return;
      }
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
      pnl: String(t.pnl),
      note: t.note || "",
      noteImportant: Boolean(t.noteImportant),
      approach: t.approach || "",
      entryModel: t.entryModel || "",
      proofLink: t.proofLink || "",
      screenshotUrl: t.screenshotUrl || "",
      source: t.source || "",
      sourceOther: t.sourceOther || "",
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

  function toggleSingle(field, value) {
    setForm((f) => ({ ...f, [field]: f[field] === value ? "" : value }));
  }

  function requestDelete(id) {
    setPendingDeleteId(id);
  }
  function confirmDelete(id) {
    const target = trades.find((t) => t.id === id);
    persist(trades.filter((t) => t.id !== id));
    if (target && target.screenshotUrl) {
      deleteObject(storageRef(storage, target.screenshotUrl)).catch(() => {});
    }
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
    return { total, totalPnl, totalMargin, wins, losses, winRate, avgPnl };
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
    return { total, totalPnl, totalMargin, wins, losses, winRate, avgPnl };
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

  const marginVal = parseFloat(form.margin);
  const pnlVal = parseFloat(form.pnl);
  const roiPreview =
    !Number.isNaN(marginVal) && marginVal !== 0 && !Number.isNaN(pnlVal)
      ? (pnlVal / marginVal) * 100
      : null;

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "weekly", label: "Weekly" },
    { id: "coins", label: "Coins" },
    { id: "longshort", label: "Long / Short" },
    { id: "confirm", label: "Setup Stats" },
    { id: "chart", label: "Chart" },
    { id: "log", label: "Log" },
    { id: "plans", label: "Entry Plans" },
  ];

  if (!authReady) {
    return (
      <div className="tj-app tj-loading">
        <style>{css}</style>
        <span className="tj-mono">Connecting to Firebase…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="tj-app tj-auth-screen">
        <style>{css}</style>

        {/* Ambient backdrop: night sky, drifting embers, distant waves */}
        <div className="tj-auth-bg" aria-hidden="true">
          <div className="tj-auth-glow tj-auth-glow-a" />
          <div className="tj-auth-glow tj-auth-glow-b" />
          <div className="tj-auth-stars" />
          <div className="tj-auth-embers">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="tj-ember"
                style={{
                  left: `${(i * 71 + 9) % 100}%`,
                  animationDelay: `${(i % 7) * 0.85}s`,
                  animationDuration: `${8 + (i % 5)}s`,
                  "--c":
                    i % 3 === 0
                      ? "var(--accent)"
                      : i % 3 === 1
                      ? "var(--mana)"
                      : "var(--pos)",
                }}
              />
            ))}
          </div>
          <div className="tj-auth-waves">
            <svg className="tj-wave tj-wave-back" viewBox="0 0 2400 200" preserveAspectRatio="none">
              <path d="M0,110 C150,60 300,150 450,110 C600,70 750,150 900,110 C1050,70 1200,150 1350,110 C1500,70 1650,150 1800,110 C1950,70 2100,150 2250,110 L2400,110 L2400,200 L0,200 Z" />
            </svg>
            <svg className="tj-wave tj-wave-front" viewBox="0 0 2400 200" preserveAspectRatio="none">
              <path d="M0,140 C180,90 320,170 500,140 C680,110 820,180 1000,140 C1180,100 1320,170 1500,140 C1680,110 1820,180 2000,140 C2180,100 2320,170 2400,150 L2400,200 L0,200 Z" />
            </svg>
          </div>
        </div>

        <div className="tj-auth-stage">
          <div className="tj-auth-panel">
            {/* Summoning circle behind the terminal */}
            <svg className="tj-auth-circle" viewBox="0 0 400 400" aria-hidden="true">
              <defs>
                <radialGradient id="tjAuthGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--mana)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--mana)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="200" cy="200" r="150" fill="url(#tjAuthGlow)" />
              <g className="tj-circle-ring tj-circle-ring-outer">
                <circle cx="200" cy="200" r="178" fill="none" stroke="var(--mana)" strokeWidth="1" strokeDasharray="1 9" opacity="0.55" />
              </g>
              <g className="tj-circle-ring tj-circle-ring-mid">
                <circle cx="200" cy="200" r="148" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="20 14" opacity="0.4" />
                <rect x="-6" y="-6" width="12" height="12" transform="translate(200,22) rotate(45)" fill="var(--accent)" opacity="0.6" />
                <rect x="-6" y="-6" width="12" height="12" transform="translate(378,200) rotate(45)" fill="var(--accent)" opacity="0.6" />
                <rect x="-6" y="-6" width="12" height="12" transform="translate(200,378) rotate(45)" fill="var(--accent)" opacity="0.6" />
                <rect x="-6" y="-6" width="12" height="12" transform="translate(22,200) rotate(45)" fill="var(--accent)" opacity="0.6" />
              </g>
              <g className="tj-circle-ring tj-circle-ring-inner">
                <circle cx="200" cy="200" r="118" fill="none" stroke="var(--mana)" strokeWidth="1" opacity="0.5" />
              </g>
              <g className="tj-circle-spark">
                <circle cx="200" cy="22" r="3.5" fill="var(--accent)" />
              </g>
            </svg>

            <form className="tj-auth-card" onSubmit={handleLogin}>
              <span className="tj-auth-corner tj-auth-corner-tl" />
              <span className="tj-auth-corner tj-auth-corner-tr" />
              <span className="tj-auth-corner tj-auth-corner-bl" />
              <span className="tj-auth-corner tj-auth-corner-br" />

              <div className="tj-auth-eyebrow tj-mono">
                <span className="tj-auth-eyebrow-dot" />
                Trader Guild · Access Terminal
              </div>

              <h1 className="tj-display tj-auth-title">Trade Journal</h1>
              <p className="tj-auth-tagline">
                Chart the seas, hunt the gains, and level up every trade.
              </p>

              <label className="tj-auth-field">
                <span className="tj-auth-label">
                  <Mail size={13} strokeWidth={2.2} />
                  Email
                </span>
                <div className="tj-auth-input-wrap">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@guild.com"
                    required
                  />
                  <span className="tj-auth-input-glow" />
                </div>
              </label>

              <label className="tj-auth-field">
                <span className="tj-auth-label">
                  <Lock size={13} strokeWidth={2.2} />
                  Password
                </span>
                <div className="tj-auth-input-wrap">
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                  />
                  <span className="tj-auth-input-glow" />
                </div>
              </label>

              {loginError && (
                <div className="tj-auth-error" role="alert">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                    <path d="M12 3 L22 20 L2 20 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <line x1="12" y1="9" x2="12" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="12" cy="17" r="1" fill="currentColor" />
                  </svg>
                  {loginError}
                </div>
              )}

              <button type="submit" className="tj-auth-btn" disabled={loggingIn}>
                <span className="tj-auth-btn-shine" />
                {loggingIn ? (
                  <span className="tj-auth-btn-content">
                    <span className="tj-auth-spinner" />
                    Opening the gate…
                  </span>
                ) : (
                  <span className="tj-auth-btn-content">
                    <Zap size={16} strokeWidth={2.4} />
                    Enter the Guild
                  </span>
                )}
              </button>

              <p className="tj-auth-footnote">Your journal, secured &amp; synced.</p>
            </form>
          </div>

          <div
            className={`tj-auth-slime ${loggingIn ? "tj-auth-slime-cheer" : ""} ${
              loginError ? "tj-auth-slime-sad" : ""
            }`}
            aria-hidden="true"
          >
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
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="tj-app tj-loading">
        <style>{css}</style>
        <span className="tj-mono">Loading journal…</span>
      </div>
    );
  }

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
          <button
            type="button"
            className="tj-link-btn tj-muted"
            onClick={() => signOut(auth)}
          >
            Sign out
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
            <span>Margin</span>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={form.margin}
              onChange={(e) => setForm({ ...form, margin: e.target.value })}
              required
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
            <span>ROI</span>
            <span
              className={`tj-mono tj-roi-preview ${
                roiPreview > 0 ? "pos" : roiPreview < 0 ? "neg" : ""
              }`}
            >
              {roiPreview === null ? "—" : fmtPct(roiPreview)}
            </span>
          </div>

          <label className="tj-field tj-field-note">
            <span>
              Note <em className="tj-optional">optional</em>
            </span>
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

function DashboardView({ stats, filteredStats, rank, milestoneHit, insights, isFiltered, rangeLabel }) {
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
            {(t.approach || t.entryModel || t.proofLink || t.source) && (
              <div className="tj-log-tags">
                {t.source && (
                  <span className="tj-tag tj-tag-source">
                    {t.source === "others" ? (t.sourceOther || "Others") : SOURCE_LABELS[t.source] || t.source}
                  </span>
                )}
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
            </div>
          </div>
        </div>

        <label className="tj-field tj-field-note" style={{ marginTop: 14 }}>
          <span>Note</span>
          <textarea
            rows={3}
            placeholder="What's the plan, and why — level, context, the trigger you're waiting for"
            value={planForm.note}
            onChange={(e) => setPlanForm({ ...planForm, note: e.target.value })}
          />
        </label>

        <div className="tj-ticket-actions">
          {planFormError && <span className="tj-form-error">{planFormError}</span>}
          {editingPlanId && (
            <button type="button" className="tj-btn-secondary" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
          <button type="submit" className="tj-btn-primary">
            {editingPlanId ? "Update plan" : "Save plan"}
          </button>
        </div>
      </form>

      {plans.length === 0 ? (
        <EmptyState text="No entry plans yet — jot one down above before you pull the trigger." />
      ) : (
        <div className="tj-log">
          {plans.map((p) => (
            <div key={p.id} className="tj-log-row">
              <div className="tj-log-main">
                <span className={`tj-dir-dot tj-dir-dot-${p.direction}`} title={p.direction}></span>
                <span className="tj-mono tj-log-coin">{p.coin}</span>
                <span className="tj-mono tj-log-date">
                  {new Date(p.datetime).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="tj-log-actions">
                  <button className="tj-icon-btn" onClick={() => onEdit(p)} aria-label="Edit plan">
                    <Pencil size={14} />
                  </button>
                  {pendingDeleteId === p.id ? (
                    <>
                      <button className="tj-icon-btn tj-confirm" onClick={() => onConfirmDelete(p.id)}>
                        Delete?
                      </button>
                      <button className="tj-icon-btn" onClick={onCancelDelete} aria-label="Cancel delete">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button className="tj-icon-btn" onClick={() => onDelete(p.id)} aria-label="Delete plan">
                      <Trash2 size={14} />
                    </button>
                  )}
                </span>
              </div>
              {p.note && <div className="tj-log-note">{p.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmationView({ approachStats, entryModelStats, sourceStats }) {
  const hasApproach = approachStats.strong.total + approachStats.weak.total > 0;
  const hasEntryModel = entryModelStats.some((m) => m.total > 0);
  const hasSource = sourceStats.some((s) => s.total > 0);

  if (!hasApproach && !hasEntryModel && !hasSource) {
    return <EmptyState text="Log a few trades with Approach, Entry model or Source filled in to see a win-rate breakdown here." />;
  }

  const Row = ({ label, s }) => (
    <tr>
      <td>{label}</td>
      <td className="tj-mono">{s.total}</td>
      <td className="tj-mono">{fmtPct(s.winRate)}</td>
      <td className={`tj-mono ${s.pnl > 0 ? "pos" : s.pnl < 0 ? "neg" : ""}`}>{fmtMoney(s.pnl)}</td>
    </tr>
  );

  return (
    <div>
      <h3 className="tj-section-title">By approach</h3>
      {!hasApproach ? (
        <EmptyState text="No approach logged yet." />
      ) : (
        <table className="tj-table">
          <thead><tr><th>Approach</th><th>Trades</th><th>Win rate</th><th>PNL</th></tr></thead>
          <tbody>
            {approachStats.strong.total > 0 && <Row label="Strong" s={approachStats.strong} />}
            {approachStats.weak.total > 0 && <Row label="Weak" s={approachStats.weak} />}
          </tbody>
        </table>
      )}

      <h3 className="tj-section-title">By entry model</h3>
      {!hasEntryModel ? (
        <EmptyState text="No entry model logged yet." />
      ) : (
        <table className="tj-table">
          <thead><tr><th>Model</th><th>Trades</th><th>Win rate</th><th>PNL</th></tr></thead>
          <tbody>
            {entryModelStats.filter((m) => m.total > 0).map((m) => (
              <Row key={m.id} label={m.label} s={m} />
            ))}
          </tbody>
        </table>
      )}

      <h3 className="tj-section-title">By source</h3>
      {!hasSource ? (
        <EmptyState text="No source logged yet." />
      ) : (
        <table className="tj-table">
          <thead><tr><th>Source</th><th>Trades</th><th>Win rate</th><th>PNL</th></tr></thead>
          <tbody>
            {sourceStats.filter((s) => s.total > 0).map((s) => (
              <Row key={s.id} label={s.label} s={s} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.tj-app {
  --bg: #12141A;
  --surface: #1A1E27;
  --surface-2: #20242F;
  --border: #2A2F3A;
  --text: #ECEEF1;
  --text-muted: #8891A3;
  --accent: #E8A33D;
  --long: #E8A33D;
  --short: #2FB8AC;
  --pos: #3ECF8E;
  --neg: #F2545B;
  --mana: #7C6CFF;
  --mana-soft: rgba(124, 108, 255, 0.35);

  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  min-height: 100%;
  padding: 24px 20px 60px;
  border-radius: 12px;
}
.tj-app * { box-sizing: border-box; }
.tj-app.tj-loading { display:flex; align-items:center; justify-content:center; min-height:200px; color: var(--text-muted); }

.tj-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.tj-display { font-family: 'Space Grotesk', sans-serif; }

.tj-app :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.pos { color: var(--pos); }
.neg { color: var(--neg); }

.tj-btn-primary:disabled { opacity: .6; cursor: wait; }

/* ===================== Auth screen — anime-inspired ===================== */

.tj-app.tj-auth-screen {
  --mana: #7C6CFF;
  --mana-soft: rgba(124, 108, 255, 0.35);
  --ink: #070912;
  position: relative;
  overflow: hidden;
  padding: 0;
  border-radius: 22px;
  background: radial-gradient(120% 90% at 50% -10%, #1b2044 0%, var(--ink) 55%), var(--ink);
}

/* --- Backdrop layers --- */
.tj-auth-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }

.tj-auth-glow { position: absolute; width: 420px; height: 420px; border-radius: 50%; filter: blur(80px); opacity: 0.32; animation: tjGlowDrift 15s ease-in-out infinite alternate; }
.tj-auth-glow-a { background: var(--mana); top: -140px; left: -120px; }
.tj-auth-glow-b { background: var(--accent); bottom: -160px; right: -120px; animation-duration: 18s; animation-delay: -4s; }
@keyframes tjGlowDrift { from { transform: translate(0,0) scale(1); } to { transform: translate(28px,18px) scale(1.12); } }

.tj-auth-stars {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1.5px 1.5px at 20% 30%, rgba(255,255,255,0.55) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 65% 15%, rgba(255,255,255,0.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 80% 55%, rgba(255,255,255,0.5) 50%, transparent 100%),
    radial-gradient(1px 1px at 35% 70%, rgba(255,255,255,0.35) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 50% 40%, rgba(255,255,255,0.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.3) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 10% 85%, rgba(255,255,255,0.4) 50%, transparent 100%);
  animation: tjTwinkle 5s ease-in-out infinite alternate;
}
@keyframes tjTwinkle { from { opacity: 0.5; } to { opacity: 1; } }

.tj-auth-embers { position: absolute; inset: 0; }
.tj-ember {
  position: absolute; bottom: -10px; width: 4px; height: 4px; border-radius: 50%;
  background: var(--c); box-shadow: 0 0 6px var(--c);
  opacity: 0; animation-name: tjEmberRise; animation-timing-function: ease-in; animation-iteration-count: infinite;
}
@keyframes tjEmberRise {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 0.85; }
  90% { opacity: 0.5; }
  100% { transform: translateY(-360px) translateX(14px); opacity: 0; }
}

.tj-auth-waves { position: absolute; left: 0; right: 0; bottom: 0; height: 150px; overflow: hidden; }
.tj-wave { position: absolute; bottom: 0; left: 0; width: 200%; height: 100%; }
.tj-wave-back { opacity: 0.16; animation: tjWaveDrift 22s linear infinite; }
.tj-wave-back path { fill: var(--mana); }
.tj-wave-front { opacity: 0.22; animation: tjWaveDrift 14s linear infinite reverse; }
.tj-wave-front path { fill: var(--accent); }
@keyframes tjWaveDrift { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* --- Stage / layout --- */
.tj-auth-stage {
  position: relative; z-index: 1; min-height: 640px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 22px; padding: 56px 20px 44px;
}

.tj-auth-panel { position: relative; width: min(420px, 100%); display: flex; align-items: center; justify-content: center; }

/* --- Summoning circle --- */
.tj-auth-circle {
  position: absolute; top: 50%; left: 50%; width: 150%; height: 150%;
  transform: translate(-50%,-50%); z-index: 0; pointer-events: none;
  animation: tjCircleFadeIn 1s ease-out both;
}
@keyframes tjCircleFadeIn { from { opacity: 0; transform: translate(-50%,-50%) scale(0.85); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
.tj-circle-ring, .tj-circle-spark { transform-box: fill-box; transform-origin: 50% 50%; }
.tj-circle-ring-mid { animation: tjRotateCW 46s linear infinite; }
.tj-circle-ring-inner { animation: tjRotateCCW 60s linear infinite; }
.tj-circle-spark { animation: tjRotateCW 7s linear infinite; }
@keyframes tjRotateCW { to { transform: rotate(360deg); } }
@keyframes tjRotateCCW { to { transform: rotate(-360deg); } }

/* --- Card / "system window" --- */
.tj-auth-card {
  position: relative; z-index: 1; width: 100%;
  display: flex; flex-direction: column; gap: 14px;
  padding: 34px 30px 28px;
  background: transparent;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,108,255,0.14);
  animation: tjCardRise 0.8s cubic-bezier(.2,.9,.25,1) 0.15s both, tjBreathe 5s ease-in-out 1s infinite;
}
.tj-auth-card::before {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(165deg, rgba(26,30,45,0.92), rgba(14,16,26,0.94));
  border: 1px solid var(--mana-soft);
  clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
@keyframes tjCardRise { from { opacity: 0; transform: translateY(26px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes tjBreathe {
  0%, 100% { box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,108,255,0.14); }
  50% { box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(124,108,255,0.24); }
}

.tj-auth-corner { position: absolute; width: 18px; height: 18px; opacity: 0.85; animation: tjCornerPulse 3.2s ease-in-out infinite; pointer-events: none; }
.tj-auth-corner-tl { top: 10px; left: 10px; border-top: 2px solid var(--mana); border-left: 2px solid var(--mana); }
.tj-auth-corner-tr { top: 10px; right: 10px; border-top: 2px solid var(--mana); border-right: 2px solid var(--mana); animation-delay: 0.4s; }
.tj-auth-corner-bl { bottom: 10px; left: 10px; border-bottom: 2px solid var(--accent); border-left: 2px solid var(--accent); animation-delay: 0.8s; }
.tj-auth-corner-br { bottom: 10px; right: 10px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); animation-delay: 1.2s; }
@keyframes tjCornerPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

.tj-auth-eyebrow {
  display: inline-flex; align-items: center; gap: 7px; align-self: flex-start;
  font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mana);
}
.tj-auth-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pos); box-shadow: 0 0 8px var(--pos); animation: tjTwinkle 1.6s ease-in-out infinite; }

.tj-auth-title {
  margin: 2px 0 0; font-size: clamp(24px, 5vw, 30px); font-weight: 700; letter-spacing: -0.01em;
  background: linear-gradient(90deg, var(--text) 0%, var(--accent) 45%, var(--mana) 70%, var(--text) 100%);
  background-size: 240% auto;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: tjTitleShimmer 6s linear infinite;
}
@keyframes tjTitleShimmer { to { background-position: -240% center; } }

.tj-auth-tagline { margin: 0 0 6px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }

.tj-auth-field { display: flex; flex-direction: column; gap: 6px; }
.tj-auth-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
.tj-auth-label svg { color: var(--mana); }
.tj-auth-input-wrap { position: relative; }
.tj-auth-input-wrap input {
  width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border);
  border-radius: 9px; padding: 11px 13px; color: var(--text); font-size: 14px;
  font-family: 'IBM Plex Mono', monospace; transition: border-color .2s, box-shadow .2s, background .2s;
}
.tj-auth-input-wrap input::placeholder { color: rgba(136,145,163,0.55); }
.tj-auth-input-wrap input:focus {
  outline: none; border-color: var(--mana); background: rgba(124,108,255,0.06);
  box-shadow: 0 0 0 3px rgba(124,108,255,0.14), 0 0 20px rgba(124,108,255,0.2);
}
.tj-auth-input-glow {
  position: absolute; left: 10%; right: 10%; bottom: -1px; height: 2px;
  background: linear-gradient(90deg, transparent, var(--mana), transparent);
  transform: scaleX(0); transform-origin: center; transition: transform .3s ease;
}
.tj-auth-input-wrap input:focus ~ .tj-auth-input-glow { transform: scaleX(1); }

.tj-auth-error {
  display: flex; align-items: center; gap: 7px; color: var(--neg);
  background: rgba(242,84,91,0.1); border: 1px solid rgba(242,84,91,0.35);
  border-radius: 8px; padding: 8px 11px; font-size: 12.5px;
  animation: tjErrorIn .4s ease;
}
@keyframes tjErrorIn {
  0% { opacity: 0; }
  20% { opacity: 1; transform: translateX(-6px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

.tj-auth-btn {
  position: relative; overflow: hidden; margin-top: 4px; border: none; border-radius: 10px;
  padding: 13px 18px; font-size: 14.5px; font-weight: 700; letter-spacing: 0.01em; cursor: pointer;
  color: #191305; background: linear-gradient(135deg, var(--accent), #f4c869 45%, var(--mana));
  box-shadow: 0 8px 24px rgba(232,163,61,0.25), 0 0 0 1px rgba(255,255,255,0.06) inset;
  transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
}
.tj-auth-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(232,163,61,0.32), 0 0 24px rgba(124,108,255,0.25); }
.tj-auth-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
.tj-auth-btn:disabled { cursor: wait; opacity: 0.9; }
.tj-auth-btn-content { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
.tj-auth-btn-shine {
  position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.55), transparent);
  transform: skewX(-20deg); transition: left .6s ease;
}
.tj-auth-btn:hover:not(:disabled) .tj-auth-btn-shine { left: 130%; }
.tj-auth-spinner {
  width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(25,19,5,0.25);
  border-top-color: #191305; animation: tjSpin .7s linear infinite;
}
@keyframes tjSpin { to { transform: rotate(360deg); } }

.tj-auth-footnote { margin: 2px 0 0; text-align: center; font-size: 11px; color: var(--text-muted); opacity: 0.7; }

/* --- Slime companion --- */
.tj-auth-slime { width: clamp(58px, 16vw, 78px); animation: tjSlimeBounce 2.6s ease-in-out infinite; }
.tj-auth-slime svg { width: 100%; height: auto; display: block; }
.tj-slime-shadow { fill: rgba(0,0,0,0.35); }
.tj-slime-body { fill: var(--pos); }
.tj-slime-shine { fill: rgba(255,255,255,0.35); }
.tj-slime-blush { fill: rgba(232,163,61,0.45); }
.tj-slime-eyes { transform-box: fill-box; transform-origin: 50% 50%; animation: tjSlimeBlink 4.5s ease-in-out infinite; }
@keyframes tjSlimeBounce {
  0%, 100% { transform: translateY(0); }
  45%, 60% { transform: translateY(-9px); }
}
@keyframes tjSlimeBlink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.15); }
}
.tj-auth-slime-cheer { animation: tjSlimeCheer 0.6s ease-in-out infinite; }
@keyframes tjSlimeCheer {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-14px) rotate(-6deg); }
}
.tj-auth-slime-sad { animation: tjSlimeSad 1.6s ease-in-out; }
@keyframes tjSlimeSad {
  0% { transform: translateY(0) scaleY(1) rotate(0deg); }
  30% { transform: translateY(4px) scaleY(0.85) rotate(-3deg); }
  60% { transform: translateY(2px) scaleY(0.92) rotate(2deg); }
  100% { transform: translateY(0) scaleY(1) rotate(0deg); }
}

@media (max-width: 640px) {
  .tj-auth-stage { min-height: 600px; padding: 44px 16px 34px; gap: 18px; }
  .tj-auth-card { padding: 26px 20px 22px; }
  .tj-auth-glow { width: 280px; height: 280px; filter: blur(60px); }
  .tj-auth-waves { height: 100px; }
}
@media (max-width: 420px) {
  .tj-auth-stage { min-height: 560px; }
  .tj-ember:nth-child(n+9) { display: none; }
}

/* Header */
.tj-header { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
.tj-title { font-size: 26px; font-weight:700; margin:0; letter-spacing: -0.01em; }
.tj-subtitle { color: var(--text-muted); font-size: 13px; margin:4px 0 0; }
.tj-link-btn { background:none; border:none; color: var(--text-muted); font-size:12px; cursor:pointer; padding:4px 2px; text-decoration:underline; text-underline-offset:3px; }
.tj-link-btn:hover { color: var(--text); }

/* Date range filter */
.tj-filter-bar {
  display:flex; align-items:center; gap:12px; flex-wrap:wrap;
  background: var(--surface); border:1px solid var(--border); border-radius:12px;
  padding: 12px 14px; margin-bottom: 20px;
}
.tj-filter-presets { display:flex; gap:6px; flex-wrap:wrap; }
.tj-filter-chip {
  background: var(--surface-2); border:1px solid var(--border); color: var(--text-muted);
  font-size:12px; font-weight:600; padding:6px 12px; border-radius:999px; cursor:pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tj-filter-chip:hover { color: var(--text); }
.tj-filter-chip.active { background: rgba(124,108,255,0.16); border-color: var(--mana); color: var(--mana); }
.tj-filter-dates { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.tj-filter-date-field {
  display:flex; align-items:center; gap:6px; background: var(--surface-2); border:1px solid var(--border);
  border-radius:8px; padding:6px 10px; color: var(--text-muted);
}
.tj-filter-date-field input {
  background:none; border:none; color: var(--text); font-size:13px; font-family:'IBM Plex Mono', monospace;
  outline:none; width: 128px; max-width: 100%;
}
.tj-filter-date-field svg { color: var(--mana); flex-shrink:0; }
.tj-filter-arrow { color: var(--text-muted); font-size:12px; }
.tj-filter-clear {
  background:none; border:1px solid var(--border); color: var(--text-muted); border-radius:8px;
  width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;
}
.tj-filter-clear:hover { color: var(--neg); border-color: var(--neg); }
.tj-filter-count { margin-left:auto; color: var(--text-muted); font-size:12px; white-space:nowrap; }

@media (max-width: 640px) {
  .tj-filter-bar { flex-direction:column; align-items:stretch; }
  .tj-filter-count { margin-left:0; }
  .tj-filter-date-field { flex:1; }
  .tj-filter-date-field input { width: 100%; }
}

/* Trader rank card */
.tj-rank-card {
  position: relative; overflow:hidden;
  display:flex; align-items:center; gap:16px;
  background: linear-gradient(135deg, rgba(124,108,255,0.09), rgba(232,163,61,0.05));
  border:1px solid var(--mana-soft); border-radius:14px; padding:16px 18px; margin-bottom:20px;
}
.tj-rank-card::before {
  content:""; position:absolute; top:-45%; right:-8%; width:180px; height:180px; border-radius:50%;
  background: radial-gradient(circle, var(--mana-soft), transparent 70%); pointer-events:none;
}
.tj-rank-badge { position:relative; width:64px; height:64px; flex-shrink:0; z-index:1; }
.tj-rank-ring { width:100%; height:100%; transform: rotate(-90deg); }
.tj-rank-ring-bg { fill:none; stroke: var(--border); stroke-width:5; }
.tj-rank-ring-fg { fill:none; stroke: var(--mana); stroke-width:5; stroke-linecap:round; transition: stroke-dashoffset 0.6s ease; }
.tj-rank-level { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; }
.tj-rank-info { display:flex; flex-direction:column; gap:5px; min-width:0; flex:1; position:relative; z-index:1; }
.tj-rank-eyebrow { display:flex; align-items:center; gap:5px; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color: var(--mana); }
.tj-rank-title { font-size:18px; font-weight:700; }
.tj-rank-progress-track { height:6px; background: var(--surface-2); border-radius:999px; overflow:hidden; }
.tj-rank-progress-fill { height:100%; background: linear-gradient(90deg, var(--mana), var(--accent)); border-radius:999px; transition: width 0.5s ease; }
.tj-rank-next { font-size:11.5px; color: var(--text-muted); }
.tj-rank-milestone { border-color: var(--accent); animation: tjMilestonePulse 1.8s ease-in-out infinite; }
.tj-rank-milestone .tj-rank-next { color: var(--accent); font-weight:600; }
@keyframes tjMilestonePulse {
  0%, 100% { box-shadow: 0 0 0 rgba(232,163,61,0); }
  50% { box-shadow: 0 0 24px rgba(232,163,61,0.35); }
}
@media (max-width: 480px) {
  .tj-rank-card { flex-direction:column; align-items:flex-start; }
}

/* Weekly / Monthly period toggle */
.tj-period-toggle {
  display:inline-flex; gap:4px; background: var(--surface-2); border:1px solid var(--border);
  border-radius:10px; padding:3px; margin-bottom:16px;
}
.tj-period-btn { background:none; border:none; color: var(--text-muted); font-size:13px; font-weight:600; padding:7px 16px; border-radius:8px; cursor:pointer; }
.tj-period-btn.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,0.2); }

/* Ticket */
.tj-ticket {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px 16px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}
.tj-ticket-stub {
  display:flex; justify-content:space-between; align-items:center;
  padding-bottom: 12px; margin-bottom: 14px;
  border-bottom: 1px dashed var(--border);
  color: var(--accent);
  font-size: 12px; letter-spacing: 0.06em;
}
.tj-ticket-date { color: var(--text-muted); }
.tj-ticket-fields {
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 14px;
  align-items:end;
}
.tj-field { display:flex; flex-direction:column; gap:6px; font-size:12px; color: var(--text-muted); }
.tj-field-note { grid-column: 1 / -1; }
.tj-field input, .tj-field select, .tj-field textarea {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 10px;
  color: var(--text);
  font-size: 14px;
  font-family: 'IBM Plex Mono', monospace;
  width: 100%;
}
.tj-field textarea { font-family: 'Inter', sans-serif; resize: vertical; min-height: 60px; }
.tj-field select { appearance:none; -webkit-appearance:none; cursor:pointer; }
.tj-field-note input { font-family: 'Inter', sans-serif; }
.tj-field input:focus, .tj-field select:focus, .tj-field textarea:focus { border-color: var(--accent); outline:none; }
.tj-optional { font-style:normal; color: var(--text-muted); font-size:10px; text-transform:uppercase; letter-spacing:0.05em; margin-left:4px; }

.tj-dir-toggle { display:flex; gap:6px; }
.tj-dir-btn {
  flex:1; padding:9px 8px; border-radius:8px; border:1px solid var(--border);
  background: var(--surface-2); color: var(--text-muted); font-size:13px; font-weight:600; cursor:pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tj-dir-btn.tj-dir-long.active { background: rgba(232,163,61,0.15); border-color: var(--long); color: var(--long); }
.tj-dir-btn.tj-dir-short.active { background: rgba(47,184,172,0.15); border-color: var(--short); color: var(--short); }

/* Setup & confirmation block */
.tj-setup-block { margin-top:18px; padding-top:16px; border-top:1px dashed var(--border); }
.tj-setup-label {
  display:block; font-size:12px; color: var(--mana); text-transform:uppercase;
  letter-spacing:0.06em; margin-bottom:12px; font-weight:600; font-family:'Space Grotesk', sans-serif;
}
.tj-setup-sublabel { display:block; font-size:12px; color: var(--text-muted); margin:14px 0 8px; }
.tj-setup-grid {
  display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:14px;
}
.tj-opt-toggle { display:flex; gap:6px; flex-wrap:wrap; }
.tj-opt-btn {
  flex:1; min-width:70px; padding:9px 8px; border-radius:8px; border:1px solid var(--border);
  background: var(--surface-2); color: var(--text-muted); font-size:12.5px; font-weight:600; cursor:pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
}
.tj-opt-btn.active { background: rgba(124,108,255,0.16); border-color: var(--mana); color: var(--mana); }
.tj-opt-btn:active { transform: scale(0.94); }
.tj-source-other { margin-top: 8px; }

/* Ticket mascot */
.tj-ticket-mascot {
  position:absolute; top:14px; right:18px; display:flex; flex-direction:row-reverse;
  align-items:center; gap:8px; max-width:56%; z-index:2; pointer-events:none;
}
.tj-ticket-slime { width:36px; flex:none; animation: tjSlimeBounce 2.6s ease-in-out infinite; }
.tj-ticket-slime svg { width:100%; height:auto; display:block; }
.tj-ticket-speech {
  background: var(--surface-2); border:1px solid var(--border); border-radius:10px;
  padding:6px 11px; font-size:11px; color: var(--text-muted); line-height:1.4;
  max-width:210px; text-align:right;
}
@media (max-width:640px) {
  .tj-ticket-mascot { position:static; justify-content:flex-end; margin-bottom:10px; max-width:100%; }
  .tj-ticket-speech { text-align:left; }
}

/* Ticket celebration: confetti + XP toast on submit */
.tj-ticket-celebrate {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  pointer-events:none; z-index:6;
}
.tj-confetti-burst { position:absolute; left:50%; top:42%; width:0; height:0; }
.tj-confetti-piece {
  position:absolute; width:7px; height:7px; border-radius:2px; left:0; top:0;
  animation: tjConfettiBurst 0.9s ease-out forwards;
}
@keyframes tjConfettiBurst {
  0% { transform: translate(0,0) rotate(0deg); opacity:1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(220deg); opacity:0; }
}
.tj-xp-toast {
  position:relative; background: var(--surface); border:1px solid var(--accent);
  color: var(--accent); font-family:'Space Grotesk', sans-serif; font-weight:700; font-size:13px;
  padding:10px 18px; border-radius:30px; display:flex; align-items:center; gap:8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  animation: tjToastPop 1.6s ease forwards;
}
@keyframes tjToastPop {
  0% { transform: scale(0.7) translateY(8px); opacity:0; }
  15% { transform: scale(1.05) translateY(0); opacity:1; }
  25% { transform: scale(1) translateY(0); opacity:1; }
  80% { transform: scale(1) translateY(0); opacity:1; }
  100% { transform: scale(0.96) translateY(-6px); opacity:0; }
}

/* Proof: screenshot link + upload */
.tj-proof-row { display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-top:14px; }
.tj-input-icon-wrap { position:relative; display:flex; align-items:center; }
.tj-input-icon-wrap svg { position:absolute; left:10px; color: var(--text-muted); pointer-events:none; }
.tj-input-icon-wrap input { padding-left:32px; }
.tj-shot-upload {
  display:flex; align-items:center; justify-content:center; gap:8px;
  border:1.5px dashed var(--border); border-radius:8px; padding:12px; cursor:pointer;
  color: var(--text-muted); font-size:13px; transition: border-color .15s, color .15s;
  min-height:44px;
}
.tj-shot-upload:hover { border-color: var(--mana); color: var(--mana); }
.tj-shot-preview { position:relative; width:100%; max-width:220px; border-radius:8px; overflow:hidden; border:1px solid var(--border); }
.tj-shot-preview img { display:block; width:100%; height:96px; object-fit:cover; }
.tj-shot-remove {
  position:absolute; top:5px; right:5px; background:rgba(18,20,26,0.75); border:none; color:#fff;
  width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;
}
.tj-shot-remove:hover { background:rgba(242,84,91,0.85); }
.tj-shot-uploading { position:absolute; inset:0; background:rgba(18,20,26,0.6); display:flex; align-items:center; justify-content:center; color:#fff; }
.tj-spin { animation: tjSpin 0.9s linear infinite; }
@keyframes tjSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
@media (max-width: 520px) {
  .tj-proof-row { grid-template-columns: 1fr; }
}

/* Log row tags */
.tj-log-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; padding-top:8px; border-top:1px dashed var(--border); }
.tj-tag { font-size:11px; padding:3px 9px; border-radius:20px; background: var(--surface-2); border:1px solid var(--border); color: var(--text-muted); }
.tj-tag-approach-strong { color: var(--pos); border-color: rgba(62,207,142,0.35); }
.tj-tag-approach-weak { color: var(--neg); border-color: rgba(242,84,91,0.35); }
.tj-tag-model { color: var(--mana); border-color: rgba(124,108,255,0.35); }
.tj-tag-link { color: var(--mana); border-color: rgba(124,108,255,0.35); cursor:pointer; text-decoration:none; }
.tj-tag-source { color: var(--text); border-color: var(--border); font-weight:600; }
.tj-log-shot { display:block; width:72px; height:52px; border-radius:6px; object-fit:cover; border:1px solid var(--border); margin-top:8px; cursor:pointer; }

@media (max-width: 480px) {
  .tj-opt-btn { min-width:60px; }
}

.tj-field-roi { justify-content:flex-end; }
.tj-roi-preview { font-size:16px; font-weight:600; padding:9px 0; }

.tj-ticket-actions { display:flex; justify-content:flex-end; align-items:center; gap:12px; margin-top:16px; }
.tj-form-error { color: var(--neg); font-size:12px; margin-right:auto; }
.tj-btn-primary, .tj-btn-secondary {
  border-radius:8px; padding:10px 18px; font-size:14px; font-weight:600; cursor:pointer; border:1px solid transparent;
  transition: opacity 0.15s;
}
.tj-btn-primary { background: var(--accent); color:#191305; }
.tj-btn-primary:hover { opacity:0.9; }
.tj-btn-secondary { background:transparent; border-color: var(--border); color: var(--text-muted); }
.tj-btn-secondary:hover { color: var(--text); }

/* Tabs */
.tj-tabs { display:flex; gap:4px; overflow-x:auto; border-bottom:1px solid var(--border); margin-bottom:20px; }
.tj-tab {
  background:none; border:none; color: var(--text-muted); padding:10px 14px; font-size:13px; font-weight:500;
  cursor:pointer; white-space:nowrap; border-bottom:2px solid transparent; margin-bottom:-1px;
}
.tj-tab.active { color: var(--text); border-bottom-color: var(--accent); }
.tj-tab:hover { color: var(--text); }

/* Hero + stat cards */
.tj-hero { display:flex; flex-direction:column; gap:6px; margin-bottom:18px; }
.tj-hero-label { color: var(--text-muted); font-size:13px; }
.tj-hero-value { font-size:42px; font-weight:600; line-height:1; }
.tj-stat-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px; }
.tj-card { background: var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; }
.tj-card-label { color: var(--text-muted); font-size:12px; display:flex; align-items:center; gap:6px; }
.tj-card-icon { color: var(--mana); flex-shrink:0; }
.tj-card-value { font-size:20px; font-weight:600; }

.tj-section-title { font-size:14px; color: var(--text-muted); margin: 26px 0 10px; font-weight:500; }
.tj-empty { color: var(--text-muted); font-size:14px; padding: 18px 0; }

/* Table */
.tj-table { width:100%; border-collapse: collapse; font-size:13px; }
.tj-table th { text-align:left; color: var(--text-muted); font-weight:500; padding:8px 10px; border-bottom:1px solid var(--border); font-size:12px; }
.tj-table td { padding:10px 10px; border-bottom:1px solid var(--border); }
.tj-table tr:last-child td { border-bottom:none; }
.tj-coin-badge { font-weight:600; letter-spacing:0.03em; }

/* Long / short cards */
.tj-ls-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px; }
.tj-dir-card { gap:10px; }
.tj-dir-card-label { font-size:15px; font-weight:700; font-family:'Space Grotesk', sans-serif; }
.tj-dir-card-long .tj-dir-card-label { color: var(--long); }
.tj-dir-card-short .tj-dir-card-label { color: var(--short); }
.tj-dir-card-row { display:flex; justify-content:space-between; font-size:13px; color: var(--text-muted); }
.tj-dir-card-row .tj-mono { color: var(--text); }

/* Chart */
.tj-chart-wrap { background: var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 12px 6px; }

/* Log */
.tj-log { display:flex; flex-direction:column; gap:8px; }
.tj-log-toolbar { display:flex; justify-content:flex-end; margin-bottom:4px; }
.tj-important-toggle {
  display:flex; align-items:center; gap:6px; font-family:'Space Grotesk', sans-serif; font-weight:600;
  font-size:12.5px; padding:7px 13px; border-radius:20px; border:1px solid var(--border);
  background: var(--surface-2); color: var(--text-muted); cursor:pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tj-important-toggle:hover { border-color: var(--accent); color: var(--accent); }
.tj-important-toggle.active { background: rgba(232,163,61,0.16); border-color: var(--accent); color: var(--accent); }
.tj-log-row { background: var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 12px; }
.tj-log-main { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:13px; }
.tj-dir-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.tj-dir-dot-long { background: var(--long); }
.tj-dir-dot-short { background: var(--short); }
.tj-log-coin { font-weight:600; min-width:44px; }
.tj-log-date { color: var(--text-muted); min-width:120px; }
.tj-log-prices { color: var(--text-muted); }
.tj-log-margin { color: var(--text-muted); }
.tj-log-roi { color: var(--text-muted); }
.tj-log-pnl { font-weight:600; margin-left:auto; }
.tj-log-actions { display:flex; gap:4px; }
.tj-icon-btn {
  background:none; border:1px solid transparent; color: var(--text-muted); padding:5px 7px; border-radius:6px;
  cursor:pointer; display:flex; align-items:center; font-size:12px;
}
.tj-icon-btn:hover { color: var(--text); border-color: var(--border); }
.tj-icon-btn.tj-confirm { color: var(--neg); font-family:'Inter',sans-serif; }
.tj-log-note { color: var(--text-muted); font-size:12px; margin-top:6px; padding-top:6px; border-top:1px dashed var(--border); }
.tj-log-note-important {
  color: var(--text); background: rgba(232,163,61,0.08); border: 1px solid rgba(232,163,61,0.3);
  border-top: 1px solid rgba(232,163,61,0.3); border-radius:8px; padding:8px 10px; margin-top:8px;
}
.tj-log-note-star { color: var(--accent); display:inline; vertical-align:-1px; margin-right:5px; }

.tj-note-row { display:flex; gap:8px; align-items:center; }
.tj-note-row input { flex:1; }
.tj-note-star {
  flex:none; width:38px; height:38px; border-radius:8px; border:1px solid var(--border);
  background: var(--surface-2); color: var(--text-muted); display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
}
.tj-note-star:hover { border-color: var(--accent); color: var(--accent); }
.tj-note-star.active { background: rgba(232,163,61,0.18); border-color: var(--accent); color: var(--accent); }
.tj-note-star:active { transform: scale(0.9); }

@media (max-width: 640px) {
  .tj-hero-value { font-size:32px; }
  .tj-log-pnl { margin-left:0; }
  .tj-log-actions { margin-left:auto; }
}

@media (prefers-reduced-motion: reduce) {
  .tj-app * { transition: none !important; animation: none !important; }
}
`;