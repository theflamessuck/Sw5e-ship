"use client"

import { useState, useEffect } from "react"
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

type DrawerSectionId = "stations" | "utility" | "setup" | "active_pcs"

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
    return "Turret"
  }
  if (typeof loc === "string" && loc.startsWith("suite-")) {
    const suiteId = loc.replace("suite-", "")
    const foundSuite = installedSuites.find((s) => s.id === suiteId)
    if (foundSuite) {
      return `Suite: ${foundSuite.name}`
    }
    const suiteName = suiteId.replace(/[-_]/g, " ")
    return `Suite: ${suiteName.charAt(0).toUpperCase() + suiteName.slice(1)}`
  }
  switch (loc) {
    case "helm":
      return "Helm"
    case "engineering":
      return "Engineering"
    case "communications":
      return "Comms"
    case "defense":
      return "Defense"
    case "sensors":
      return "Sensors"
    case "weapons":
      return "Weapons"
    case "crew_quarters":
      return "Quarters"
    case "passenger_lounge":
      return "Lounge"
    case "cargo_bay":
      return "Cargo Bay"
    case "medical_bay":
      return "Med Bay"
    default:
      return String(loc).replace("_", " ")
  }
}

export function StationSidebar({
  active,
  onSelect,
  isBlackout = false,
  manifest = [],
  installedSuites = [],
}: {
  active: Station
  onSelect: (station: Station) => void
  isBlackout?: boolean
  manifest?: ManifestMember[]
  installedSuites?: InstalledSuite[]
}) {
  const getSectionForStation = (stationId: Station): DrawerSectionId => {
    if (PRIMARY_STATIONS.some((s) => s.id === stationId)) return "stations"
    if (UTILITY_STATIONS.some((s) => s.id === stationId)) return "utility"
    if (SETUP_STATIONS.some((s) => s.id === stationId)) return "setup"
    return "stations"
  }

  // Allow null so that all sections can be minimized
  const [expandedSection, setExpandedSection] = useState<DrawerSectionId | null>(() =>
    getSectionForStation(active)
  )

  useEffect(() => {
    if (active !== "GM Station") {
      setExpandedSection(getSectionForStation(active))
    }
  }, [active])

  // Toggle open or closed on press
  const toggleSection = (section: DrawerSectionId) => {
    setExpandedSection((prev) => (prev === section ? null : section))
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
          "group relative flex items-center gap-2.5 rounded-sm border px-2.5 py-1.5 text-left transition-colors cursor-pointer w-full",
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
        <span className="hidden text-xs font-bold tracking-wider lg:inline truncate">
          {isBlackout ? `${id.toUpperCase()} [OFF]` : id.toUpperCase()}
        </span>
        <span className="text-xs font-bold tracking-widest lg:hidden">
          {code}
        </span>
      </button>
    )
  }

  return (
    <aside className="shrink-0 lg:w-56 flex flex-col gap-2 font-mono">
      <nav
        aria-label="Bridge stations"
        className={`flex shrink-0 flex-row gap-2 overflow-x-auto rounded-md border p-1.5 lg:flex-col lg:overflow-visible transition-colors ${
          isBlackout
            ? "border-red-500/60 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            : "border-bridge-border bg-bridge-panel"
        }`}
      >
        {/* DRAWER 1: STATIONS */}
        <div className="flex flex-col rounded border border-bridge-border/60 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("stations")}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-white/5 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {expandedSection === "stations" ? (
                <ChevronDown className="h-3 w-3 text-cyan-neon" />
              ) : (
                <ChevronRight className="h-3 w-3 text-slate-500" />
              )}
              <span
                className={`text-[10px] tracking-[0.2em] font-extrabold uppercase ${
                  isBlackout
                    ? "text-red-400 animate-pulse"
                    : expandedSection === "stations"
                    ? "text-cyan-neon text-glow-cyan"
                    : "text-slate-300"
                }`}
              >
                Stations
              </span>
            </div>
            {expandedSection !== "stations" && PRIMARY_STATIONS.some((s) => s.id === active) && (
              <span className="text-[8px] font-bold text-cyan-neon bg-cyan-neon/10 px-1 py-0.2 rounded border border-cyan-neon/30">
                ACTIVE
              </span>
            )}
          </button>

          {expandedSection === "stations" && (
            <div className="p-1 flex flex-col gap-0.5 border-t border-bridge-border/40 bg-black/20">
              {PRIMARY_STATIONS.map(renderStationButton)}
            </div>
          )}
        </div>

        {/* DRAWER 2: UTILITY */}
        <div className="flex flex-col rounded border border-bridge-border/60 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("utility")}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-white/5 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {expandedSection === "utility" ? (
                <ChevronDown className="h-3 w-3 text-cyan-neon" />
              ) : (
                <ChevronRight className="h-3 w-3 text-slate-500" />
              )}
              <span
                className={`text-[10px] tracking-[0.2em] font-extrabold uppercase ${
                  expandedSection === "utility"
                    ? "text-cyan-neon text-glow-cyan"
                    : "text-slate-300"
                }`}
              >
                Utility
              </span>
            </div>
            {expandedSection !== "utility" && UTILITY_STATIONS.some((s) => s.id === active) && (
              <span className="text-[8px] font-bold text-cyan-neon bg-cyan-neon/10 px-1 py-0.2 rounded border border-cyan-neon/30">
                ACTIVE
              </span>
            )}
          </button>

          {expandedSection === "utility" && (
            <div className="p-1 flex flex-col gap-0.5 border-t border-bridge-border/40 bg-black/20">
              {UTILITY_STATIONS.map(renderStationButton)}
            </div>
          )}
        </div>

        {/* DRAWER 3: SETUP */}
        <div className="flex flex-col rounded border border-bridge-border/60 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("setup")}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-white/5 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {expandedSection === "setup" ? (
                <ChevronDown className="h-3 w-3 text-amber-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-slate-500" />
              )}
              <span
                className={`text-[10px] tracking-[0.2em] font-extrabold uppercase ${
                  expandedSection === "setup"
                    ? "text-amber-400"
                    : "text-slate-300"
                }`}
              >
                Setup
              </span>
            </div>
            {expandedSection !== "setup" && SETUP_STATIONS.some((s) => s.id === active) && (
              <span className="text-[8px] font-bold text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                ACTIVE
              </span>
            )}
          </button>

          {expandedSection === "setup" && (
            <div className="p-1 flex flex-col gap-0.5 border-t border-bridge-border/40 bg-black/20">
              {SETUP_STATIONS.map(renderStationButton)}
            </div>
          )}
        </div>

        {/* DRAWER 4: ACTIVE PCS */}
        <div className="flex flex-col rounded border border-bridge-border/60 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("active_pcs")}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-white/5 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {expandedSection === "active_pcs" ? (
                <ChevronDown className="h-3 w-3 text-cyan-neon" />
              ) : (
                <ChevronRight className="h-3 w-3 text-slate-500" />
              )}
              <span
                className={`text-[10px] tracking-[0.2em] font-extrabold uppercase ${
                  expandedSection === "active_pcs"
                    ? "text-cyan-neon text-glow-cyan"
                    : "text-slate-300"
                }`}
              >
                Active PCs
              </span>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground font-mono">
              {playerCharacters.length} Crew
            </span>
          </button>

          {expandedSection === "active_pcs" && (
            <div className="p-1.5 flex flex-col gap-1 border-t border-bridge-border/40 bg-black/20 max-h-56 overflow-y-auto">
              {playerCharacters.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-1 text-center">
                  No active PCs in manifest
                </p>
              ) : (
                playerCharacters.map((pc) => {
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
                        <span className="font-bold text-[10px] truncate max-w-[95px]">
                          {pc.name}
                        </span>
                        <span className="text-[8px] font-mono text-cyan-300/80 truncate">
                          @ {locationLabel}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {hasTakenTurn ? (
                          <span className="flex items-center gap-0.5 text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1 py-0.5 rounded">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Done
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1 py-0.5 rounded animate-pulse">
                            <Clock className="h-2.5 w-2.5" /> Wait
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* STANDALONE GM STATION ACCESS */}
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
                "group relative flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-left transition-colors cursor-pointer w-full mt-1",
                isActive
                  ? "border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400/90 hover:bg-amber-500/15 hover:text-amber-300",
              ].join(" ")}
            >
              <ShieldAlert
                className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0"
                strokeWidth={2}
              />
              <span className="text-[10px] font-bold tracking-widest uppercase flex-1 truncate">
                GM Station
              </span>
              <Lock className="h-3 w-3 text-amber-400/70 shrink-0" />
            </button>
          )
        })()}
      </nav>
    </aside>
  )
}