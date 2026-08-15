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
import { Pencil, Trash2, X } from "lucide-react";

const STORAGE_KEY = "trades";
const DEFAULT_COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
import { auth, db } from "./firebase";
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

function nowLocalInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
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

const emptyForm = () => ({
  datetime: nowLocalInput(),
  coin: "",
  direction: "long",
  entry: "",
  exit: "",
  margin: "",
  pnl: "",
  note: "",
});

export default function TradeJournal() {
  const [trades, setTrades] = useState([]);
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
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      setLoaded(false);
      setTrades([]);
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
        const snapshot = await getDocs(
          collection(db, "users", user.uid, "trades")
        );
        const loadedTrades = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        loadedTrades.sort(
          (a, b) => new Date(b.datetime) - new Date(a.datetime)
        );
        if (!cancelled) setTrades(loadedTrades);
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

  function handleSubmit(e) {
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
    const tradeObj = {
      id: editingId || uid(),
      datetime: form.datetime,
      coin,
      direction: form.direction,
      entry: entryNum,
      exit: exitNum,
      margin: marginNum,
      pnl: pnlNum,
      note: form.note.trim(),
    };
    const next = editingId
      ? trades.map((t) => (t.id === editingId ? tradeObj : t))
      : [...trades, tradeObj];
    persist(next);
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
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
    });
    setEditingId(t.id);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
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

  function handleReset() {
    persist([]);
    cancelEdit();
    setResetConfirm(false);
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

  const weeklyGroups = useMemo(() => {
    const map = new Map();
    trades.forEach((t) => {
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
  }, [trades]);

  const thisWeekKey = getWeekInfo(new Date()).key;

  const coinStats = useMemo(() => {
    const map = new Map();
    trades.forEach((t) => {
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
  }, [trades]);

  const directionStats = useMemo(() => {
    const build = (dir) => {
      const list = trades.filter((t) => t.direction === dir);
      const total = list.length;
      const pnl = list.reduce((s, t) => s + t.pnl, 0);
      const wins = list.filter((t) => t.pnl > 0).length;
      const winRate = total ? (wins / total) * 100 : 0;
      return { total, pnl, winRate };
    };
    return { long: build("long"), short: build("short") };
  }, [trades]);

  const chartData = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    let running = 0;
    return sorted.map((t, i) => {
      running += t.pnl;
      return {
        index: i + 1,
        date: new Date(t.datetime).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        cumulative: Math.round(running * 100) / 100,
      };
    });
  }, [trades]);

  const sortedTradesDesc = useMemo(
    () => [...trades].sort((a, b) => new Date(b.datetime) - new Date(a.datetime)),
    [trades]
  );

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
    { id: "chart", label: "Chart" },
    { id: "log", label: "Log" },
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
        <form className="tj-login-card" onSubmit={handleLogin}>
          <h1 className="tj-display tj-title">Trade Journal</h1>
          <p className="tj-subtitle">Sign in to access your journal.</p>

          <label className="tj-field">
            <span>Email</span>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="tj-field">
            <span>Password</span>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {loginError && <span className="tj-form-error">{loginError}</span>}

          <button type="submit" className="tj-btn-primary" disabled={loggingIn}>
            {loggingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
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
          {trades.length > 0 &&
            (resetConfirm ? (
              <span className="tj-reset-confirm">
                <button type="button" className="tj-link-btn tj-link-danger" onClick={handleReset}>
                  Confirm clear
                </button>
                <button type="button" className="tj-link-btn" onClick={() => setResetConfirm(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className="tj-link-btn tj-muted" onClick={() => setResetConfirm(true)}>
                Clear all data
              </button>
            ))}
        </div>
      </header>

      <form className="tj-ticket" onSubmit={handleSubmit}>
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
            <input
              type="text"
              placeholder="Reason for the trade"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
        </div>

        <div className="tj-ticket-actions">
          {formError && <span className="tj-form-error">{formError}</span>}
          {editingId && (
            <button type="button" className="tj-btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
          <button type="submit" className="tj-btn-primary">
            {editingId ? "Update trade" : "Log trade"}
          </button>
        </div>
      </form>

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
        {activeTab === "dashboard" && <DashboardView stats={stats} />}
        {activeTab === "weekly" && <WeeklyView weeks={weeklyGroups} thisWeekKey={thisWeekKey} />}
        {activeTab === "coins" && <CoinsView coins={coinStats} />}
        {activeTab === "longshort" && <LongShortView data={directionStats} />}
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
      </main>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="tj-empty">{text || "No trades yet. Log your first trade above to start building your journal."}</p>;
}

function StatCard({ label, value, tone }) {
  return (
    <div className="tj-card">
      <span className="tj-card-label">{label}</span>
      <span className={`tj-mono tj-card-value ${tone || ""}`}>{value}</span>
    </div>
  );
}

function DashboardView({ stats }) {
  return (
    <div>
      <div className="tj-hero">
        <span className="tj-hero-label">Total PNL</span>
        <span
          className={`tj-mono tj-hero-value ${
            stats.totalPnl > 0 ? "pos" : stats.totalPnl < 0 ? "neg" : ""
          }`}
        >
          {fmtMoney(stats.totalPnl)}
        </span>
      </div>
      <div className="tj-stat-grid">
        <StatCard label="Total margin" value={fmtMoney(stats.totalMargin)} />
        <StatCard label="Total trades" value={stats.total} />
        <StatCard label="Winning trades" value={stats.wins} tone="pos" />
        <StatCard label="Losing trades" value={stats.losses} tone="neg" />
        <StatCard label="Win rate" value={fmtPct(stats.winRate)} />
        <StatCard
          label="Avg PNL / trade"
          value={fmtMoney(stats.avgPnl)}
          tone={stats.avgPnl > 0 ? "pos" : stats.avgPnl < 0 ? "neg" : ""}
        />
      </div>
      {stats.total === 0 && <EmptyState />}
    </div>
  );
}

function WeeklyView({ weeks, thisWeekKey }) {
  const current = weeks.find((w) => w.key === thisWeekKey);
  const previous = weeks.filter((w) => w.key !== thisWeekKey);
  return (
    <div>
      <div className="tj-hero tj-hero-week">
        <span className="tj-hero-label">This week{current ? ` · ${current.label}` : ""}</span>
        <span
          className={`tj-mono tj-hero-value ${
            current && current.pnl > 0 ? "pos" : current && current.pnl < 0 ? "neg" : ""
          }`}
        >
          {fmtMoney(current ? current.pnl : 0)}
        </span>
      </div>
      <div className="tj-stat-grid">
        <StatCard label="Trades this week" value={current ? current.total : 0} />
        <StatCard label="Weekly margin" value={fmtMoney(current ? current.margin : 0)} />
        <StatCard label="Weekly win rate" value={fmtPct(current ? current.winRate : 0)} />
      </div>
      <h3 className="tj-section-title">Previous weeks</h3>
      {previous.length === 0 ? (
        <EmptyState text="No previous weeks yet — keep logging to build a week-over-week view." />
      ) : (
        <table className="tj-table">
          <thead>
            <tr>
              <th>Week</th>
              <th>Trades</th>
              <th>PNL</th>
              <th>Win rate</th>
            </tr>
          </thead>
          <tbody>
            {previous.map((w) => (
              <tr key={w.key}>
                <td>{w.label}</td>
                <td className="tj-mono">{w.total}</td>
                <td className={`tj-mono ${w.pnl > 0 ? "pos" : w.pnl < 0 ? "neg" : ""}`}>{fmtMoney(w.pnl)}</td>
                <td className="tj-mono">{fmtPct(w.winRate)}</td>
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
  if (trades.length === 0) return <EmptyState />;
  return (
    <div className="tj-log">
      {trades.map((t) => (
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
          {t.note && <div className="tj-log-note">{t.note}</div>}
        </div>
      ))}
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

.tj-auth-screen {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tj-login-card {
  width: min(380px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tj-login-card .tj-title { margin-bottom: 0; }
.tj-login-card .tj-subtitle { margin-top: -8px; margin-bottom: 6px; }
.tj-login-card .tj-btn-primary { margin-top: 4px; }
.tj-btn-primary:disabled { opacity: .6; cursor: wait; }

/* Header */
.tj-header { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
.tj-title { font-size: 26px; font-weight:700; margin:0; letter-spacing: -0.01em; }
.tj-subtitle { color: var(--text-muted); font-size: 13px; margin:4px 0 0; }
.tj-link-btn { background:none; border:none; color: var(--text-muted); font-size:12px; cursor:pointer; padding:4px 2px; text-decoration:underline; text-underline-offset:3px; }
.tj-link-btn:hover { color: var(--text); }
.tj-link-danger { color: var(--neg); }
.tj-reset-confirm { display:flex; gap:10px; }

/* Ticket */
.tj-ticket {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px 16px;
  margin-bottom: 20px;
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
.tj-field input {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 10px;
  color: var(--text);
  font-size: 14px;
  font-family: 'IBM Plex Mono', monospace;
  width: 100%;
}
.tj-field-note input { font-family: 'Inter', sans-serif; }
.tj-field input:focus { border-color: var(--accent); outline:none; }
.tj-optional { font-style:normal; color: var(--text-muted); font-size:10px; text-transform:uppercase; letter-spacing:0.05em; margin-left:4px; }

.tj-dir-toggle { display:flex; gap:6px; }
.tj-dir-btn {
  flex:1; padding:9px 8px; border-radius:8px; border:1px solid var(--border);
  background: var(--surface-2); color: var(--text-muted); font-size:13px; font-weight:600; cursor:pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tj-dir-btn.tj-dir-long.active { background: rgba(232,163,61,0.15); border-color: var(--long); color: var(--long); }
.tj-dir-btn.tj-dir-short.active { background: rgba(47,184,172,0.15); border-color: var(--short); color: var(--short); }

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
.tj-card-label { color: var(--text-muted); font-size:12px; }
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
.tj-log-row { background: var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 12px; }
.tj-log-main { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:13px; }
.tj-dir-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.tj-dir-dot-long { background: var(--long); }
.tj-dir-dot-short { background: var(--short); }
.tj-log-coin { font-weight:600; min-width:44px; }
.tj-log-date { color: var(--text-muted); min-width:120px; }
.tj-log-prices { color: var(--text-muted); }
.tj-log-margin { color: var(--text-muted); }
.tj-log-pnl { font-weight:600; margin-left:auto; }
.tj-log-actions { display:flex; gap:4px; }
.tj-icon-btn {
  background:none; border:1px solid transparent; color: var(--text-muted); padding:5px 7px; border-radius:6px;
  cursor:pointer; display:flex; align-items:center; font-size:12px;
}
.tj-icon-btn:hover { color: var(--text); border-color: var(--border); }
.tj-icon-btn.tj-confirm { color: var(--neg); font-family:'Inter',sans-serif; }
.tj-log-note { color: var(--text-muted); font-size:12px; margin-top:6px; padding-top:6px; border-top:1px dashed var(--border); }

@media (max-width: 640px) {
  .tj-hero-value { font-size:32px; }
  .tj-log-pnl { margin-left:0; }
  .tj-log-actions { margin-left:auto; }
}

@media (prefers-reduced-motion: reduce) {
  .tj-app * { transition: none !important; animation: none !important; }
}
`;
