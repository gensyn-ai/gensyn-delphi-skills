/** App shell: holds the snapshot + navigation state, polls the SDK on an
 * interval, routes key input, and frames every screen with the menu + status
 * bars. Read-only — no signing path is wired. */
import { Box, Text, useApp, useInput, useStdin } from "ink";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { fetchSnapshot, type LoadProgress, type MarketRow, type Snapshot } from "./data.js";
import { readAgentEdges, type AgentEdge } from "./edges.js";
import { readAgentEvents, type AgentEvent } from "./events.js";
import { ago, clockStr } from "./format.js";
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
  const [clock, setClock] = useState(clockStr());
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    setEvents(readAgentEvents());
    setEdges(readAgentEdges());
    try {
      // Progress only drives the cold-start screen (rendered while snap is null);
      // it still fires on background refreshes but isn't shown then.
      setSnap(await fetchSnapshot(wallet, network, setProgress));
    } catch (e: any) {
      setSnap((s) => s ?? ({ wallet, network, ts: Date.now(), markets: [], marketById: new Map(), positions: [], trades: [], totalValue: 0, totalCost: 0, realised: 0, unrealised: 0, mtm: 0, bought: 0, sold: 0, equityCurve: [], hourlyActivity: [], errors: ["fatal: " + String(e?.message ?? e)] } as Snapshot));
    } finally {
      setRefreshing(false);
      inFlight.current = false;
    }
  }, [wallet, network]);

  useEffect(() => {
    void refresh();
    if (once) return;
    const dataTimer = setInterval(() => void refresh(), REFRESH_MS);
    const clockTimer = setInterval(() => {
      setClock(clockStr());
      setEvents(readAgentEvents()); // cheap local read — keeps the reasoning stream live
      setEdges(readAgentEdges()); // cheap local read — keeps the Edge View live
    }, 1000);
    return () => {
      clearInterval(dataTimer);
      clearInterval(clockTimer);
    };
  }, [refresh, once]);

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
        clock={clock}
      />
    </Box>
  );
}

const clamp = (i: number, len: number) => (len <= 0 ? 0 : Math.max(0, Math.min(len - 1, i)));
