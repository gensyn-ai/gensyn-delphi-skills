/** Shared Ink components: panels, tables, sparklines, gauges, badges, chrome. */
import { Box, Text } from "ink";
import React from "react";
import { bar, probColor, sparkline, STATUS_NAMES, statusColor } from "./format.js";

export const ACCENT = "#7c5cff"; // delphi-ish violet

export function Panel({
  title,
  color = "cyan",
  children,
  flexGrow,
  width,
  minHeight,
}: {
  title: string;
  color?: string;
  children: React.ReactNode;
  flexGrow?: number;
  width?: number | string;
  minHeight?: number;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      flexGrow={flexGrow}
      width={width as any}
      minHeight={minHeight}
    >
      <Text bold color={color}>
        {title}
      </Text>
      {children}
    </Box>
  );
}

/** A fixed-width table cell that truncates rather than wrapping. */
export function Cell({
  w,
  children,
  color,
  bold,
  dim,
  inverse,
  align = "left",
}: {
  w: number;
  children: React.ReactNode;
  color?: string;
  bold?: boolean;
  dim?: boolean;
  inverse?: boolean;
  align?: "left" | "right";
}) {
  return (
    <Box width={w} justifyContent={align === "right" ? "flex-end" : "flex-start"}>
      <Text color={color} bold={bold} dimColor={dim} inverse={inverse} wrap="truncate">
        {children}
      </Text>
    </Box>
  );
}

/** A flexible cell that grows to fill remaining row width and truncates. */
export function FlexCell({
  children,
  color,
  bold,
  dim,
  inverse,
}: {
  children: React.ReactNode;
  color?: string;
  bold?: boolean;
  dim?: boolean;
  inverse?: boolean;
}) {
  return (
    <Box flexGrow={1} flexBasis={0} minWidth={0}>
      <Text color={color} bold={bold} dimColor={dim} inverse={inverse} wrap="truncate">
        {children}
      </Text>
    </Box>
  );
}

export function Sparkline({ values, color = "cyan", width }: { values: number[]; color?: string; width?: number }) {
  return <Text color={color}>{sparkline(values, width)}</Text>;
}

export function Gauge({ value, width = 12, color }: { value: number; width?: number; color?: string }) {
  return <Text color={color ?? probColor(value)}>{bar(value, width)}</Text>;
}

export function Badge({ status }: { status?: string }) {
  return (
    <Text color={statusColor(status)} bold>
      {STATUS_NAMES[status ?? ""] ?? status ?? "—"}
    </Text>
  );
}

/** A label: value stat used in Overview cards. */
export function Stat({
  label,
  value,
  color = "white",
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <Box justifyContent="space-between">
      <Text dimColor wrap="truncate">{label}</Text>
      <Text color={color} bold wrap="truncate">
        {value}
      </Text>
    </Box>
  );
}

export const PAGES: { key: string; label: string; name: string }[] = [
  { key: "1", label: "Overview", name: "overview" },
  { key: "2", label: "Portfolio", name: "portfolio" },
  { key: "3", label: "My Activity", name: "activity" },
  { key: "4", label: "Markets", name: "markets" },
];

export function MenuBar({ current }: { current: string }) {
  return (
    <Box>
      <Text bold color={ACCENT}>
        ◆ AGENT TUI
      </Text>
      <Text>{"  "}</Text>
      {PAGES.map((p) => (
        <Text key={p.name}>
          {p.name === current ? (
            <Text inverse bold>
              {" " + p.key + " " + p.label + " "}
            </Text>
          ) : (
            <Text>
              <Text dimColor>{" " + p.key + " "}</Text>
              {p.label}
            </Text>
          )}
          <Text dimColor>{" │"}</Text>
        </Text>
      ))}
    </Box>
  );
}

export function StatusBar({
  network,
  updatedAgo,
  marketCount,
  positionCount,
  refreshing,
  errors,
  clock,
}: {
  network: string;
  updatedAgo: string;
  marketCount: number;
  positionCount: number;
  refreshing: boolean;
  errors: string[];
  clock: string;
}) {
  return (
    <Box>
      <Text color={refreshing ? "yellow" : "green"}>{refreshing ? "◌ syncing" : "● live"}</Text>
      <Text dimColor>{"  "}</Text>
      <Text color="cyan">{network}</Text>
      <Text dimColor>{"  mkts "}</Text>
      <Text>{marketCount}</Text>
      <Text dimColor>{"  pos "}</Text>
      <Text>{positionCount}</Text>
      <Text dimColor>{"  upd "}</Text>
      <Text>{updatedAgo}</Text>
      {errors.length > 0 && <Text color="red">{"  ⚠ " + errors.join(" | ")}</Text>}
      <Box flexGrow={1} justifyContent="flex-end">
        <Text dimColor>{"q quit · r refresh   "}</Text>
        <Text dimColor>{clock}</Text>
      </Box>
    </Box>
  );
}
