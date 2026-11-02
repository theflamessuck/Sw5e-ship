"use client"

import { useState } from "react"
import {
  Wrench,
  Activity,
  Radio,
  Cpu,
  Crosshair,
  ShieldHalf,
  Zap,
  Radar,
  Package,
  Coins,
  ShieldAlert,
  Lock,
  Rocket,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  UserCheck,
  Layers,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import type { ManifestMember, ShipCompartmentId } from "./bridge-dashboard"
import type { InstalledSuite } from "./ship-modifications"

export type Station =
  | "Ship Setup"
  | "Crew"
  | "Ship Modifications"
  | "Engineering"
  | "Communications"
  | "Navcomputer"
  | "Weapons"
  | "Defense"
  | "Engines"
  | "Sensors"
  | "Cargo"
  | "Finance"
  | "Suites"
  | "GM Station"
  | "Codex"

interface StationItem {
  id: Station
  icon: LucideIcon
  code: string
}

type DrawerId = "stations" | "utility" | "setup" | "active_pcs"

// 1. Primary Operating Stations
const PRIMARY_STATIONS: StationItem[] = [
  { id: "Engines", icon: Zap, code: "ENG" },
  { id: "Engineering", icon: Activity, code: "PWR" },
  { id: "Communications", icon: Radio, code: "COM" },
  { id: "Weapons", icon: Crosshair, code: "WPN" },
  { id: "Defense", icon: ShieldHalf, code: "DEF" },
  { id: "Sensors", icon: Radar, code: "SNR" },
]

// 2. Logistics & Utility
const UTILITY_STATIONS: StationItem[] = [
  { id: "Navcomputer", icon: Cpu, code: "NAV" },
  { id: "Suites", icon: Layers, code: "STE" },
  { id: "Cargo", icon: Package, code: "CRG" },
  { id: "Finance", icon: Coins, code: "FIN" },
  { id: "Codex", icon: BookOpen, code: "CDX" },
]

// 3. Setup & Configuration
const SETUP_STATIONS: StationItem[] = [
  { id: "Ship Setup", icon: Rocket, code: "SYS" },
  { id: "Crew", icon: Users, code: "CRW" },
  { id: "Ship Modifications", icon: Wrench, code: "MOD" },
]

function formatCompartmentName(
  loc: ShipCompartmentId,
  installedSuites: InstalledSuite[] = []
): string {
  if (typeof loc === "string" && loc.startsWith("turret-")) {
    return "Turret";
  }
  if (typeof loc === "string" && loc.startsWith("suite-")) {
    const suiteId = loc.replace("suite-", "");
    const foundSuite = installedSuites.find((s) => s.id === suiteId);
    if (foundSuite) {
      return `Suite: ${foundSuite.name}`;
    }
    const suiteName = suiteId.replace(/[-_]/g, " ");
    return `Suite: ${suiteName.charAt(0).toUpperCase() + suiteName.slice(1)}`;
  }
  switch (loc) {
    case "helm":
      return "Helm";
    case "engineering":
      return "Engineering";
    case "communications":
      return "Comms";
    case "defense":
      return "Defense";
    case "sensors":
      return "Sensors";
    case "weapons":
      return "Weapons";
    case "crew_quarters":
      return "Quarters";
    case "passenger_lounge":
      return "Lounge";
    case "cargo_bay":
      return "Cargo Bay";
    case "medical_bay":
      return "Med Bay";
    default:
      return String(loc).replace("_", " ");
  }
}

export function StationSidebar({
  active,
  onSelect,
  isBlackout = false,
  manifest = [],
  installedSuites = [],
  onToggleTurn,
}: {
  active: Station
  onSelect: (station: Station) => void
  isBlackout?: boolean
  manifest?: ManifestMember[]
  installedSuites?: InstalledSuite[]
  onToggleTurn?: (id: string) => void
}) {
  // Determine initial open drawer based on active station
  const getInitialDrawer = (): DrawerId => {
    if (PRIMARY_STATIONS.some((s) => s.id === active)) return "stations"
    if (UTILITY_STATIONS.some((s) => s.id === active)) return "utility"
    if (SETUP_STATIONS.some((s) => s.id === active)) return "setup"
    return "stations"
  }

  const [openDrawer, setOpenDrawer] = useState<DrawerId | null>(getInitialDrawer())

  const toggleDrawer = (drawerId: DrawerId) => {
    setOpenDrawer((prev) => (prev === drawerId ? null : drawerId))
  }

  const handleStationClick = (id: Station) => {
    if (id === "GM Station") {
      const isUnlocked = sessionStorage.getItem("gm_station_unlocked") === "true"
      if (isUnlocked) {
        onSelect(id)
      } else {
        const password = prompt("ENTER GAME MASTER SECURITY CLEARANCE CODE:")
        if (password === "0000") {
          sessionStorage.setItem("gm_station_unlocked", "true")
          onSelect(id)
        } else if (password !== null) {
          alert("ACCESS DENIED: INVALID SECURITY CODE.")
        }
      }
    } else {
      if (isBlackout) {
        alert(
          "CRITICAL HARDWARE FAULT: Main power bus offline. All bridge consoles are disabled. Access GM Station for manual override."
        )
        return
      }
      onSelect(id)
    }
  }

  const playerCharacters = manifest.filter(
    (m) => m.isPlayer !== false && !m.isPassenger
  )

  const isStationCrewed = (stationId: Station): boolean => {
    switch (stationId) {
      case "Engines":
        return manifest.some((m) => m.location === "helm" && !m.isPassenger)
      case "Engineering":
        return manifest.some((m) => m.location === "engineering" && !m.isPassenger)
      case "Communications":
        return manifest.some((m) => m.location === "communications" && !m.isPassenger)
      case "Weapons":
        return manifest.some(
          (m) => (m.location === "weapons" || m.location.startsWith("turret-")) && !m.isPassenger
        )
      case "Defense":
        return manifest.some((m) => m.location === "defense" && !m.isPassenger)
      case "Sensors":
        return manifest.some((m) => m.location === "sensors" && !m.isPassenger)
      case "Suites":
        return manifest.some(
          (m) => typeof m.location === "string" && m.location.startsWith("suite-") && !m.isPassenger
        )
      default:
        return false
    }
  }

  const renderStationButton = ({ id, icon: Icon, code }: StationItem) => {
    const isActive = id === active
    const hasCrew = isStationCrewed(id)

    return (
      <button
        key={id}
        type="button"
        onClick={() => handleStationClick(id)}
        aria-current={isActive ? "page" : undefined}
        disabled={isBlackout}
        className={[
          "group relative flex w-full items-center gap-2.5 rounded-sm border px-2.5 py-1.5 text-left transition-colors cursor-pointer",
          isBlackout
            ? "border-red-500/20 bg-black/40 text-red-500/50 cursor-not-allowed opacity-50"
            : isActive
            ? "glow-cyan border-cyan-neon/60 bg-cyan-neon/10 text-cyan-neon"
            : "border-transparent text-muted-foreground hover:border-cyan-neon/25 hover:bg-cyan-neon/5 hover:text-cyan-neon/80",
        ].join(" ")}
      >
        {isActive && !isBlackout && (
          <span
            className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-cyan-neon"
            aria-hidden="true"
          />
        )}
        <Icon
          className={
            isBlackout
              ? "h-3.5 w-3.5 text-red-500/50"
              : hasCrew
              ? "h-3.5 w-3.5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]"
              : isActive
              ? "text-glow-cyan h-3.5 w-3.5"
              : "h-3.5 w-3.5"
          }
          strokeWidth={2}
        />
        <span className="hidden text-xs font-bold tracking-wider lg:inline">
          {isBlackout ? `${id.toUpperCase()} [OFFLINE]` : id.toUpperCase()}
        </span>
        <span className="text-xs font-bold tracking-widest lg:hidden">
          {code}
        </span>
      </button>
    )
  }

  const activeCount = playerCharacters.length
  const pendingCount = playerCharacters.filter((p) => !p.hasTakenTurnThisRound).length

  return (
    <aside className="shrink-0 lg:w-56 flex flex-col gap-3 font-mono">
      <nav
        aria-label="Bridge stations"
        className={`flex flex-col gap-2 rounded-md border p-2 transition-colors ${
          isBlackout
            ? "border-red-500/60 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            : "border-bridge-border bg-bridge-panel"
        }`}
      >
        {/* DRAWER 1: STATIONS */}
        <div className="flex flex-col rounded border border-neutral-800/80 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleDrawer("stations")}
            className="flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-900/60 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              {openDrawer === "stations" ? (
                <ChevronDown className="h-3.5 w-3.5 text-cyan-neon" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span
                className={`text-[10px] tracking-[0.25em] font-extrabold uppercase ${
                  isBlackout
                    ? "text-red-400 animate-pulse"
                    : "text-cyan-neon text-glow-cyan"
                }`}
              >
                // STATIONS
              </span>
            </div>
            <span className="hidden lg:inline text-[8px] text-muted-foreground/60 uppercase">OPERATIONS</span>
          </button>

          {openDrawer === "stations" && (
            <div className="flex flex-col gap-1 p-2 pt-1 border-t border-neutral-800/60 bg-black/20 animate-in fade-in-50 duration-150">
              {PRIMARY_STATIONS.map(renderStationButton)}
            </div>
          )}
        </div>

        {/* DRAWER 2: UTILITY */}
        <div className="flex flex-col rounded border border-neutral-800/80 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleDrawer("utility")}
            className="flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-900/60 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              {openDrawer === "utility" ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-slate-300">
                // UTILITY
              </span>
            </div>
            <span className="hidden lg:inline text-[8px] text-muted-foreground/60 uppercase">LOGISTICS</span>
          </button>

          {openDrawer === "utility" && (
            <div className="flex flex-col gap-1 p-2 pt-1 border-t border-neutral-800/60 bg-black/20 animate-in fade-in-50 duration-150">
              {UTILITY_STATIONS.map(renderStationButton)}
            </div>
          )}
        </div>

        {/* DRAWER 3: SET-UP */}
        <div className="flex flex-col rounded border border-neutral-800/80 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleDrawer("setup")}
            className="flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-900/60 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              {openDrawer === "setup" ? (
                <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-amber-400">
                // SET-UP
              </span>
            </div>
            <span className="hidden lg:inline text-[8px] text-muted-foreground/60 uppercase">CONFIG</span>
          </button>

          {openDrawer === "setup" && (
            <div className="flex flex-col gap-1 p-2 pt-1 border-t border-neutral-800/60 bg-black/20 animate-in fade-in-50 duration-150">
              {SETUP_STATIONS.map(renderStationButton)}
            </div>
          )}
        </div>

        {/* DRAWER 4: ACTIVE PCS */}
        <div className="flex flex-col rounded border border-neutral-800/80 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleDrawer("active_pcs")}
            className="flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-900/60 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              {openDrawer === "active_pcs" ? (
                <ChevronDown className="h-3.5 w-3.5 text-cyan-neon" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <UserCheck className="h-3.5 w-3.5 text-cyan-neon" />
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-cyan-neon">
                // ACTIVE PCS
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {pendingCount > 0 && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold animate-pulse">
                  {pendingCount} Pnd
                </span>
              )}
              <span className="text-[9px] text-muted-foreground/70 font-bold">
                {activeCount} Crew
              </span>
            </div>
          </button>

          {openDrawer === "active_pcs" && (
            <div className="flex flex-col gap-1.5 p-2 pt-1.5 border-t border-neutral-800/60 bg-black/20 animate-in fade-in-50 duration-150">
              {playerCharacters.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-2 text-center">
                  No player characters registered
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {playerCharacters.map((pc) => {
                    const locationLabel = formatCompartmentName(pc.location, installedSuites)
                    const hasTakenTurn = pc.hasTakenTurnThisRound

                    return (
                      <div
                        key={pc.id}
                        className={`flex items-center justify-between rounded p-1.5 border text-xs transition ${
                          hasTakenTurn
                            ? "bg-slate-950/40 border-slate-800 text-slate-400"
                            : "bg-black/60 border-cyan-500/30 text-slate-100"
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="font-bold text-[11px] truncate max-w-[100px] lg:max-w-[110px]">
                            {pc.name}
                          </span>
                          <span className="text-[9px] font-mono text-cyan-300/80 truncate">
                            @ {locationLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onToggleTurn?.(pc.id)}
                          className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded transition cursor-pointer shrink-0 ${
                            hasTakenTurn
                              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                              : "text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 animate-pulse"
                          }`}
                          title="Click to toggle turn status"
                        >
                          {hasTakenTurn ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Done
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              Wait
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* GM STATION OVERRIDE BUTTON */}
        {(() => {
          const id: Station = "GM Station"
          const isActive = id === active
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleStationClick(id)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group relative flex items-center gap-2.5 rounded-sm border px-2.5 py-1.5 text-left transition-colors mt-1 cursor-pointer",
                isActive
                  ? "border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400/90 hover:bg-amber-500/15 hover:text-amber-300",
              ].join(" ")}
            >
              {isActive && (
                <span
                  className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-amber-400"
                  aria-hidden="true"
                />
              )}
              <ShieldAlert
                className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0"
                strokeWidth={2}
              />
              <span className="hidden text-xs font-bold tracking-widest lg:inline flex-1">
                GM STATION
              </span>
              <span className="text-xs font-bold tracking-widest lg:hidden flex-1">
                GM
              </span>
              <Lock className="h-3 w-3 text-amber-400/70 shrink-0" />
            </button>
          )
        })()}
      </nav>
    </aside>
  )
}