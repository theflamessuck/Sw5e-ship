"use client"

import { useEffect, useState } from "react"
import type { JourneyData } from "./navcomputer-station"
import type { ActiveStatus } from "./defense-station"
import { Swords, RadioTower } from "lucide-react"

interface HeaderBarProps {
  shipName?: string
  shipModel?: string
  currentDay?: number
  activeJourney?: (JourneyData & { startedOnDay?: number }) | null
  totalShields?: { current: number; max: number; temp?: number }
  totalHull?: { current: number; max: number }
  systemDamageLevel?: number
  shipStatuses?: ActiveStatus[]
  isUsedCondition?: boolean
  // Combat additions
  isInCombat?: boolean
  combatRound?: number
  activeTurnShip?: string
  nextTurnShip?: string
}

export function HeaderBar({ 
  shipName = 'Zeta Shuttle "Crucible"',
  shipModel = 'TAC-BRIDGE',
  currentDay = 42, 
  activeJourney,
  totalShields = { current: 25, max: 25, temp: 0 },
  totalHull = { current: 40, max: 40 },
  systemDamageLevel = 0,
  shipStatuses = [],
  isUsedCondition = false,
  isInCombat = false,
  combatRound = 1,
  activeTurnShip,
  nextTurnShip,
}: HeaderBarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLevel4Damage = systemDamageLevel >= 4
  const tempShields = totalShields.temp || 0
  const maxShields = totalShields.max || 1

  const tempShieldPct = Math.max(0, Math.min(100, (tempShields / maxShields) * 100))
  const regularShieldPct = Math.max(0, Math.min(100 - tempShieldPct, (totalShields.current / maxShields) * 100))
  const totalEffectivePercent = regularShieldPct + tempShieldPct
  const isDepleted = totalShields.current === 0 && tempShields === 0

  const hullPercent = totalHull.max > 0 ? Math.max(0, Math.min(100, Math.round((totalHull.current / totalHull.max) * 100))) : 0

  const getShieldColor = (pct: number) => {
    if (pct === 0) return "bg-red-600 animate-pulse"
    if (pct <= 25) return "bg-red-500"
    if (pct <= 50) return "bg-amber-400"
    return "bg-cyan-neon"
  }

  const getHullColor = (pct: number) => {
    if (pct === 0) return "bg-red-600 animate-pulse"
    if (pct <= 25) return "bg-red-500"
    if (pct <= 50) return "bg-amber-400"
    return "bg-emerald-400"
  }

  // Active condition flags for critical global notices
  const isDisabled = shipStatuses.some((s) => s.title.toLowerCase().includes("disabled"))
  const isShocked = shipStatuses.some((s) => s.title.toLowerCase().includes("shocked"))
  const hasUsedCondition = isUsedCondition || shipStatuses.some((s) => s.title.toLowerCase().includes("used"))

  return (
    <header 
      className={`flex flex-col gap-2 rounded-md border px-3 sm:px-5 py-2.5 transition-colors duration-500 overflow-hidden ${
        isInCombat
          ? "border-red-500 bg-red-950/20 shadow-[0_0_25px_rgba(239,68,68,0.25)]"
          : "border-cyan-neon/40 bg-bridge-panel glow-cyan"
      }`}
    >
      {/* Main Top Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 min-w-0">
        {/* Left: Ship Title */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <span
            className={`inline-block h-6 w-6 shrink-0 rotate-45 border-2 transition-colors ${
              isInCombat ? "border-red-500 bg-red-500/20 animate-pulse" : "border-cyan-neon/80"
            }`}
            aria-hidden="true"
          />
          <div className="leading-tight min-w-0">
            <h1 
              className={`text-sm font-bold tracking-[0.2em] sm:text-base transition-colors truncate ${
                isInCombat ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "text-glow-cyan text-cyan-neon"
              }`}
            >
              {shipName.toUpperCase()}
            </h1>
            <p className={`text-[10px] tracking-[0.35em] sm:text-xs truncate ${isInCombat ? "text-red-400/60" : "text-cyan-neon/50"}`}>
              {`// ${shipModel.toUpperCase()}`}
            </p>
          </div>
        </div>

        {/* Center: Global Gauges & Turn HUD (Fluid and contained) */}
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 min-w-0 max-w-xl w-full bg-black/40 px-3 py-1.5 rounded border border-bridge-border/60">
          {/* Sliders Row */}
          <div className="flex items-center justify-between gap-4 w-full min-w-0">
            {/* Shields Slider */}
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className={`font-bold truncate ${isDepleted ? "text-red-400 animate-pulse" : isLevel4Damage ? "text-red-400 font-extrabold" : tempShields > 0 ? "text-white font-extrabold" : regularShieldPct <= 50 ? "text-amber-300" : "text-cyan-neon"}`}>
                  {isDepleted ? "⚠️ DEPLETED" : isLevel4Damage ? "⚠️ 50% SHIELDS" : tempShields > 0 ? "⚡ TEMP" : "SHIELDS"}
                </span>
                <span className="text-slate-200 font-bold shrink-0 ml-1">
                  {totalShields.current}{tempShields > 0 ? `+${tempShields}` : ""}/{isLevel4Damage ? `${Math.floor(totalShields.max / 2)}` : totalShields.max}
                </span>
              </div>
              <div className="relative h-2 w-full bg-slate-900 rounded-sm overflow-hidden border border-cyan-neon/40 flex">
                <div
                  className={`h-full transition-all duration-300 ${getShieldColor(totalEffectivePercent)}`}
                  style={{ width: `${regularShieldPct}%` }}
                  title={`Standard Shields: ${totalShields.current}/${totalShields.max}`}
                />
                {tempShields > 0 && (
                  <div
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${tempShieldPct}%`,
                      backgroundColor: "#ffffff",
                      boxShadow: "0 0 8px #ffffff, 0 0 3px #00ffff",
                      borderLeft: "1px solid #00ffff"
                    }}
                    title={`Temporary Shields: +${tempShields} SP`}
                  />
                )}
                {isLevel4Damage && (
                  <div
                    className="absolute right-0 top-0 bottom-0 pointer-events-none"
                    style={{
                      width: "50%",
                      background: "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.4) 3px, rgba(0, 0, 0, 0.8) 3px, rgba(0, 0, 0, 0.8) 6px)",
                      borderLeft: "1px solid #ef4444"
                    }}
                  />
                )}
              </div>
            </div>

            <div className="h-6 w-[1px] bg-bridge-border/60 shrink-0" />

            {/* Hull HP Slider */}
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className={`font-bold truncate ${hullPercent === 0 ? "text-red-500 animate-pulse" : isLevel4Damage ? "text-red-400 font-extrabold" : hullPercent <= 50 ? "text-amber-300" : "text-emerald-400"}`}>
                  {hullPercent === 0 ? "🚨 BREACH" : isLevel4Damage ? "⚠️ 50% HULL" : "HULL"}
                </span>
                <span className="text-slate-200 font-bold shrink-0 ml-1">
                  {totalHull.current}/{isLevel4Damage ? `${Math.floor(totalHull.max / 2)}` : totalHull.max}
                </span>
              </div>
              <div className="relative h-2 w-full bg-slate-900 rounded-sm overflow-hidden border border-emerald-500/40 flex">
                <div
                  className={`h-full transition-all ${getHullColor(hullPercent)}`}
                  style={{ width: `${hullPercent}%` }}
                />
                {isLevel4Damage && (
                  <div
                    className="absolute right-0 top-0 bottom-0 pointer-events-none"
                    style={{
                      width: "50%",
                      background: "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.4) 3px, rgba(0, 0, 0, 0.8) 3px, rgba(0, 0, 0, 0.8) 6px)",
                      borderLeft: "1px solid #ef4444"
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Dedicated Combat Turn Ticker with strictly truncated names */}
          {isInCombat && (
            <div className="flex items-center justify-between w-full pt-1 border-t border-red-500/30 text-xs font-mono min-w-0 gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[8px] text-muted-foreground uppercase tracking-widest shrink-0">ACTIVE:</span>
                <span className={`font-bold truncate text-[11px] ${activeTurnShip?.toLowerCase().includes("player") ? "text-cyan-300" : "text-amber-300"}`}>
                  {activeTurnShip || "Round Concluded"}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                <span className="text-[8px] text-muted-foreground uppercase tracking-widest shrink-0">ON DECK:</span>
                <span className="text-slate-300 font-bold truncate text-[11px] text-right">
                  {nextTurnShip || "—"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Campaign Time & Status Badge (Locked against flex shrink) */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between lg:justify-end w-full lg:w-auto">
          <div className="text-right leading-tight shrink-0">
            <p className="text-[9px] tracking-[0.25em] text-muted-foreground/70">
              CAMPAIGN TIME
            </p>
            <p className="text-glow-amber font-bold tabular-nums tracking-widest text-amber-300 font-mono text-xs sm:text-sm">
              DAY {mounted ? currentDay : 42}
            </p>
          </div>
          <StatusBadge 
            active={!!activeJourney} 
            systemDamageLevel={systemDamageLevel} 
            isInCombat={isInCombat}
            combatRound={combatRound}
          />
        </div>
      </div>

      {/* Secondary Row: Active Conditions & Critical Notices */}
      {(shipStatuses.length > 0 || hasUsedCondition || isDisabled || isShocked) && (
        <div className="pt-1.5 border-t border-bridge-border/40 flex flex-wrap items-center gap-1.5 font-mono text-[9px]">
          <span className="text-muted-foreground uppercase tracking-widest mr-1 text-[8px]">
            ACTIVE CONDITIONS:
          </span>

          {isDisabled && (
            <span className="px-2 py-0.5 rounded border border-red-500/80 bg-red-950/60 text-red-300 font-bold animate-pulse">
              🚨 DISABLED (NO ACTIONS / REACTIONS)
            </span>
          )}

          {isShocked && (
            <span className="px-2 py-0.5 rounded border border-amber-500/80 bg-amber-950/60 text-amber-300 font-bold">
              ⚡ SHOCKED (ACTION OR BONUS ACTION ONLY)
            </span>
          )}

          {hasUsedCondition && (
            <span className="px-2 py-0.5 rounded border border-amber-500/60 bg-amber-950/40 text-amber-300" title="Natural 1 on check/attack/save requires DC 10 Destruction Save or take 1 System Damage">
              ⚠️ USED VESSEL (NAT 1 TRIGGERS DESTRUCTION SAVE)
            </span>
          )}

          {shipStatuses.map((st) => {
            const lowerTitle = st.title.toLowerCase()
            if (lowerTitle.includes("disabled") || lowerTitle.includes("shocked") || lowerTitle.includes("used")) {
              return null
            }
            return (
              <span
                key={st.id}
                title={st.effect}
                className="px-2 py-0.5 rounded border border-cyan-500/50 bg-cyan-950/40 text-cyan-300"
              >
                {st.title} {st.duration ? `(${st.duration})` : ""}
              </span>
            )
          })}
        </div>
      )}
    </header>
  )
}

function StatusBadge({ 
  active, 
  systemDamageLevel = 0, 
  isInCombat = false,
  combatRound = 1 
}: { 
  active: boolean
  systemDamageLevel?: number
  isInCombat?: boolean
  combatRound?: number 
}) {
  const hasDamage = systemDamageLevel > 0

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* 1. Combat Alert Badge */}
      {isInCombat && (
        <div className="flex items-center gap-1.5 rounded-sm border border-red-500 bg-red-950/80 px-2.5 py-1 sm:px-3 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)] shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-80" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] font-black tracking-[0.12em] text-red-200 sm:text-xs font-mono uppercase flex items-center gap-1 whitespace-nowrap">
            <Swords className="h-3 w-3 text-red-400 shrink-0" />
            STATUS: COMBAT (R{combatRound})
          </span>
        </div>
      )}

      {/* 2. System Damage Badge */}
      {hasDamage && !isInCombat && (
        <div className="flex items-center gap-1.5 rounded-sm border border-red-500/80 bg-red-950/60 px-2.5 py-1 sm:px-3 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)] shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] font-bold tracking-[0.12em] text-red-300 sm:text-xs font-mono whitespace-nowrap">
            STATUS: SYSTEM DAMAGE LVL {systemDamageLevel}
          </span>
        </div>
      )}

      {/* 3. FTL Transit Badge */}
      {active && !isInCombat && (
        <div className="flex items-center gap-1.5 rounded-sm border border-purple-500/60 bg-purple-500/15 px-2.5 py-1 sm:px-3 shadow-[0_0_10px_rgba(168,85,247,0.4)] animate-pulse shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-purple-300 sm:text-xs whitespace-nowrap">
            FTL TRANSIT
          </span>
        </div>
      )}

      {/* 4. Nominal Standby Badge */}
      {!hasDamage && !active && !isInCombat && (
        <div className="flex items-center gap-2 rounded-sm border border-emerald-500/50 bg-emerald-500/5 px-2.5 py-1 sm:px-3 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 sm:text-xs whitespace-nowrap">
            STATUS: NOMINAL
          </span>
        </div>
      )}
    </div>
  )
}