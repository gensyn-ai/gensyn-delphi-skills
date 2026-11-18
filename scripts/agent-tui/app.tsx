/** App shell: holds the snapshot + navigation state, polls the SDK on an
 * interval, routes key input, and frames every screen with the menu + status
 * bars. Read-only — no signing path is wired. */
import { Box, Text, useApp, useInput, useStdin } from "ink";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { fetchSnapshot, type LoadProgress, type MarketRow, type Snapshot } from "./data.js";
import { readAgentEdges, type AgentEdge } from "./edges.js";
import { readAgentEvents, type AgentEvent } from "./events.js";
import { ago } from "./format.js";
import { Activity, Markets, MarketDetail, Overview, Portfolio } from "./screens.js";
import { Gauge, MenuBar, PAGES, StatusBar } from "./ui.js";

const REFRESH_MS = 8000;

export function App({
  wallet,
  network,
  once,
  initialScreen = "overview",
}: {
  wallet: string;
  network: string;
  once?: boolean;
  initialScreen?: string;
}) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [edges, setEdges] = useState<AgentEdge[]>([]);
  const [screen, setScreen] = useState(initialScreen);
  const [selMarkets, setSelMarkets] = useState(0);
  const [selPositions, setSelPositions] = useState(0);
  const [selActivity, setSelActivity] = useState(0);
  const [detail, setDetail] = useState<MarketRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const inFlight = useRef(false);

  // Guarded setters: the events/edges files are re-read on every 1s tick, but
  // reading always yields a fresh array reference. Updating state unconditionally
  // would re-render the whole tree once a second and — when the frame is taller
  // than the terminal — flicker. Only commit when the content signature (length +
  // serialised newest entry) actually changed, so an unchanged file is a no-op re-render.
  const setEventsIfChanged = useCallback((next: AgentEvent[]) => {
    setEvents((prev) => (sig(prev) === sig(next) ? prev : next));
  }, []);
  const setEdgesIfChanged = useCallback((next: AgentEdge[]) => {
    setEdges((prev) => (sig(prev) === sig(next) ? prev : next));
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    setEventsIfChanged(readAgentEvents());
    setEdgesIfChanged(readAgentEdges());
    try {
      // Progress only drives the cold-start screen (rendered while snap is null);
      // it still fires on background refreshes but isn't shown then.
      setSnap(await fetchSnapshot(wallet, network, setProgress));
    } catch (e: any) {
      setSnap((s) => s ?? ({ wallet, network, ts: Date.now(), markets: [], marketById: new Map(), positions: [], trades: [], totalValue: 0, totalCost: 0, unmarked: 0, realised: 0, unrealised: 0, mtm: 0, bought: 0, sold: 0, equityCurve: [], hourlyActivity: [], errors: ["fatal: " + String(e?.message ?? e)] } as Snapshot));
    } finally {
      setRefreshing(false);
      inFlight.current = false;
    }
  }, [wallet, network]);

  useEffect(() => {
    void refresh();
    if (once) return;
    const dataTimer = setInterval(() => void refresh(), REFRESH_MS);
    // Tail the local log/edge files every second so the reasoning stream and Edge
    // View stay live between data refreshes. The guarded setters make this a no-op
    // re-render unless the file content actually changed. The wall clock ticks
    // independently inside <Clock/> so it never re-renders this tree.
    const tailTimer = setInterval(() => {
      setEventsIfChanged(readAgentEvents());
      setEdgesIfChanged(readAgentEdges());
    }, 1000);
    return () => {
      clearInterval(dataTimer);
      clearInterval(tailTimer);
    };
  }, [refresh, once, setEventsIfChanged, setEdgesIfChanged]);

  useEffect(() => {
    if (once && snap) {
      const t = setTimeout(() => exit(), 50);
      return () => clearTimeout(t);
    }
  }, [once, snap, exit]);

  useInput(
    (input, key) => {
      if (input === "q") return exit();
      if (input === "r") return void refresh();

      // Page keys work from anywhere, including the market detail view — switch
      // screens and drop any open detail in one keystroke.
      const page = PAGES.find((p) => p.key === input);
      if (page) {
        setDetail(null);
        setScreen(page.name);
        return;
      }

      // Left/right arrows cycle between tabs (wrapping), also from anywhere —
      // mirror the number-key behaviour and drop any open detail.
      if (key.leftArrow || key.rightArrow) {
        const dir = key.rightArrow ? 1 : -1;
        const idx = PAGES.findIndex((p) => p.name === screen);
        const next = PAGES[(idx + dir + PAGES.length) % PAGES.length];
        setDetail(null);
        setScreen(next.name);
        return;
      }

      if (detail) {
        if (key.return || key.escape) setDetail(null);
        return;
      }

      if (!snap) return;
      const delta = key.upArrow ? -1 : key.downArrow ? 1 : 0;
      if (delta !== 0) {
        if (screen === "markets") setSelMarkets((i) => clamp(i + delta, snap.markets.length));
        else if (screen === "portfolio") setSelPositions((i) => clamp(i + delta, snap.positions.length));
        else if (screen === "activity") setSelActivity((i) => clamp(i + delta, snap.trades.length));
        return;
      }
      if (key.return) {
        if (screen === "markets" && snap.markets[selMarkets]) setDetail(snap.markets[selMarkets]);
        else if (screen === "portfolio" && snap.positions[selPositions]) {
          const m = snap.marketById.get(snap.positions[selPositions].market.toLowerCase());
          if (m) setDetail(m);
        } else if (screen === "activity" && snap.trades[selActivity]) {
          const m = snap.marketById.get(snap.trades[selActivity].market.toLowerCase());
          if (m) setDetail(m);
        }
      }
    },
    { isActive: !once && isRawModeSupported },
  );

  if (!snap) {
    const pct = progress ? progress.done / progress.total : 0;
    return (
      <Box padding={1} flexDirection="column">
        <Box>
          <Text color="yellow">◌ </Text>
          <Text>loading Delphi snapshot…</Text>
        </Box>
        <Box marginTop={1}>
          <Gauge value={pct} width={24} color="yellow" />
          <Text dimColor>
            {progress ? `  ${progress.done}/${progress.total} · ${progress.label}` : "  starting…"}
          </Text>
        </Box>
      </Box>
    );
  }

  let body: React.ReactNode;
  if (detail) body = <MarketDetail snap={snap} market={detail} />;
  else if (screen === "markets") body = <Markets snap={snap} selected={selMarkets} />;
  else if (screen === "portfolio") body = <Portfolio snap={snap} selected={selPositions} />;
  else if (screen === "activity") body = <Activity snap={snap} selected={selActivity} />;
  else body = <Overview snap={snap} events={events} edges={edges} />;

  return (
    <Box flexDirection="column">
      <MenuBar current={screen} />
      <Box flexDirection="column">{body}</Box>
      <StatusBar
        network={snap.network}
        updatedAgo={ago(snap.ts)}
        marketCount={snap.markets.length}
        positionCount={snap.positions.length}
        refreshing={refreshing}
        errors={snap.errors}
      />
    </Box>
  );
}

const clamp = (i: number, len: number) => (len <= 0 ? 0 : Math.max(0, Math.min(len - 1, i)));

/** Cheap content signature for append-only event/edge arrays. Equal signature ⇒
 * nothing new to render, so the guarded setters can skip the update and avoid a
 * full-tree re-render.
 *
 * We key on `length` plus the *content* of the newest entry rather than just its
 * `ts`: once a session exceeds the read cap (`readAgentEvents(300)` /
 * `readAgentEdges(500)`) `length` saturates, so a `ts`-only tail would collide on
 * two same-millisecond appends (e.g. a rapid THINK→BUY pair) and hide the second
 * one. Serialising the newest entry distinguishes those, since the sliding window
 * makes it the freshly appended line. */
const sig = (arr: { ts: number }[]): string =>
  arr.length + ":" + (arr.length ? JSON.stringify(arr[arr.length - 1]) : "0");
