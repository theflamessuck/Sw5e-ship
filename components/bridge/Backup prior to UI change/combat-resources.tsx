"use client"

import { Zap, Sparkles, CheckCircle2, Wind, Hexagon, ShieldAlert } from "lucide-react"
import { Panel } from "./panel"

const PROFICIENCY_BONUS = 2

interface CombatResourcesProps {
  availablePowerDice?: number
  maxPowerDice?: number
  powerDieType?: string
  onConsumePowerDice?: (amount: number) => boolean
  standingByUsed?: boolean
  onUseStandingBy?: () => void
  leafOnTheWindUsed?: boolean
  onUseLeafOnTheWind?: () => void
  versatileTransportUsed?: number
  onUpdateVersatileTransportUsed?: (count: number | ((prev: number) => number)) => void
  bestShipInVerseUsed?: boolean
  onUpdateBestShipInVerseUsed?: (used: boolean | ((prev: boolean) => boolean)) => void
  shipTier?: number
  shipSize?: string
}

export function CombatResources({
  availablePowerDice = 4,
  maxPowerDice = 4,
  powerDieType = "d6",
  onConsumePowerDice,
  standingByUsed = false,
  onUseStandingBy,
  leafOnTheWindUsed = false,
  onUseLeafOnTheWind,
  versatileTransportUsed = 0,
  onUpdateVersatileTransportUsed,
  bestShipInVerseUsed = false,
  onUpdateBestShipInVerseUsed,
  shipTier = 0,
  shipSize = "small",
}: CombatResourcesProps) {
  const currentDice = availablePowerDice ?? 4
  const maxDice = maxPowerDice ?? 4

  const handleActivate = () => {
    if (onConsumePowerDice) {
      onConsumePowerDice(1)
    }
  }

  const hasStandingBy = shipTier >= 4
  const hasLeafOnTheWind = shipTier >= 5

  const isMedium = shipSize.toLowerCase() === "medium"
  const hasVersatileTransport = isMedium && shipTier >= 3
  const versatileMax = 2 * shipTier
  const hasBestShip = isMedium && shipTier >= 5

  const handleUseVersatileTransport = () => {
    if (versatileTransportUsed >= versatileMax) return
    if (onUpdateVersatileTransportUsed) {
      onUpdateVersatileTransportUsed((prev) => Math.min(versatileMax, prev + 1))
    }
  }

  const handleUseBestShip = () => {
    if (bestShipInVerseUsed) return
    if (onUpdateBestShipInVerseUsed) {
      onUpdateBestShipInVerseUsed(true)
    }
  }

  const getGridCols = () => {
    let count = 2
    if (hasStandingBy) count += 1
    if (hasLeafOnTheWind) count += 1
    if (count === 4) return "sm:grid-cols-2 lg:grid-cols-4"
    if (count === 3) return "sm:grid-cols-3"
    return "sm:grid-cols-2"
  }

  return (
    <Panel title="Combat Resources" code="PROF // POWER // SURGE // PARAGON" className="lg:col-span-2">
      <div className={`grid gap-3 ${getGridCols()}`}>
        {/* Proficiency Bonus */}
        <div className="flex flex-col items-center justify-center gap-1 rounded-sm border border-bridge-border bg-bridge-panel/60 px-4 py-4 text-center">
          <span className="text-[9px] font-bold tracking-[0.2em] text-cyan-neon">
            PROFICIENCY BONUS
          </span>
          <span className="text-glow-cyan text-4xl font-bold leading-none text-cyan-neon">
            +{PROFICIENCY_BONUS}
          </span>
          <span className="text-[9px] tracking-[0.15em] text-muted-foreground/70">
            CHASSIS CORE
          </span>
        </div>

        {/* Power Die Allocation */}
        <div className="flex flex-col justify-between gap-2 rounded-sm border border-bridge-border bg-bridge-panel/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold tracking-[0.2em] text-amber-neon">
                POWER DIE
              </span>
              <span className="rounded bg-amber-neon/10 border border-amber-neon/30 px-1 py-0.5 text-[8px] font-mono font-bold text-amber-neon">
                {powerDieType}
              </span>
            </div>
            <span className="text-glow-amber text-lg font-bold leading-none text-amber-neon">
              {currentDice}/{maxDice}
            </span>
          </div>

          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: maxDice }).map((_, i) => (
              <span
                key={i}
                className={
                  "h-2 flex-1 rounded-sm border " +
                  (i < currentDice
                    ? "border-amber-neon bg-amber-neon/70 shadow-[0_0_8px_hsl(var(--amber-neon)/0.6)]"
                    : "border-bridge-border bg-transparent")
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleActivate}
            disabled={currentDice === 0}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-sm border border-amber-neon/50 bg-amber-neon/10 px-3 py-2 text-[10px] font-bold tracking-[0.2em] text-amber-neon transition-colors hover:bg-amber-neon/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Zap className="h-3.5 w-3.5" />
            {currentDice === 0 ? "DEPLETED" : "ACTIVATE POWER DIE"}
          </button>
        </div>

        {/* Tier 4 Standing By Surge Resource */}
        {hasStandingBy && (
          <div className="flex flex-col justify-between gap-2 rounded-sm border border-bridge-border bg-bridge-panel/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-[0.2em] text-cyan-neon flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-300" /> STANDING BY
              </span>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                standingByUsed
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
              }`}>
                {standingByUsed ? "EXPENDED" : "READY"}
              </span>
            </div>

            <p className="text-[9px] text-muted-foreground leading-tight">
              Push ship limits: crewmember takes 1 extra action on their turn (resets on recharge).
            </p>

            <button
              type="button"
              disabled={standingByUsed}
              onClick={onUseStandingBy}
              className={`flex items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-[0.15em] uppercase transition-all ${
                standingByUsed
                  ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                  : "border-cyan-neon/60 bg-cyan-neon/20 text-cyan-neon hover:bg-cyan-neon/30 shadow-[0_0_10px_rgba(0,255,255,0.2)] cursor-pointer"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {standingByUsed ? "USED (SHORT REST)" : "SURGE: EXTRA ACTION"}
            </button>
          </div>
        )}

        {/* Tier 5 A Leaf on the Wind Resource */}
        {hasLeafOnTheWind && (
          <div className="flex flex-col justify-between gap-2 rounded-sm border border-bridge-border bg-bridge-panel/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-[0.2em] text-emerald-400 flex items-center gap-1">
                <Wind className="w-3 h-3 text-emerald-400" /> LEAF ON THE WIND
              </span>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                leafOnTheWindUsed
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
              }`}>
                {leafOnTheWindUsed ? "EXPENDED" : "READY"}
              </span>
            </div>

            <p className="text-[9px] text-muted-foreground leading-tight">
              Reaction: Treat amount rolled on d20 as natural 20 for check, attack, or save (1/recharge).
            </p>

            <button
              type="button"
              disabled={leafOnTheWindUsed}
              onClick={onUseLeafOnTheWind}
              className={`flex items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-[10px] font-bold tracking-[0.15em] uppercase transition-all ${
                leafOnTheWindUsed
                  ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                  : "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-pointer"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {leafOnTheWindUsed ? "USED (SHORT REST)" : "TRIGGER NATURAL 20"}
            </button>
          </div>
        )}
      </div>

      {/* Medium Ship Spec Tiers (Versatile Transport & Best Ship) */}
      {(hasVersatileTransport || hasBestShip) && (
        <div className="mt-4 flex flex-col gap-3 border-t border-bridge-border/60 pt-4">
          <span className="text-[10px] font-mono text-cyan-neon uppercase tracking-wider block mb-1">
            Medium Chassis Features (Tier {shipTier})
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hasVersatileTransport && (
              <div className="flex flex-col gap-1.5 rounded border border-bridge-border/60 bg-black/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                    <Hexagon className="w-3.5 h-3.5" /> Versatile Transport
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 font-bold border border-cyan-400/40 bg-cyan-900/40 px-1.5 py-0.5 rounded">
                    {versatileMax - versatileTransportUsed} / {versatileMax} Uses (Refit)
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-snug">
                  Reaction: When a crewmember makes an ability check, attack roll, or save with the ship, gain advantage before the GM declares success/failure.
                </p>
                <div className="flex items-center gap-1 mt-1 mb-2">
                  {Array.from({ length: versatileMax }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 flex-1 rounded-sm transition-all ${
                        i < versatileMax - versatileTransportUsed
                          ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                          : "bg-slate-800 border border-bridge-border/50"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={versatileTransportUsed >= versatileMax}
                  onClick={handleUseVersatileTransport}
                  className={`py-2 rounded text-[9px] font-bold uppercase tracking-wider font-mono border transition-all ${
                    versatileTransportUsed >= versatileMax
                      ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                      : "border-cyan-500/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                  }`}
                >
                  Trigger Reaction (Advantage)
                </button>
              </div>
            )}

            {hasBestShip && (
              <div className="flex flex-col gap-1.5 rounded border border-bridge-border/60 bg-black/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold tracking-wider text-amber-300 uppercase flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Best Ship in the 'Verse
                  </span>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                    bestShipInVerseUsed ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}>
                    {bestShipInVerseUsed ? "EXPENDED" : "READY (RECHARGE)"}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-snug">
                  Action: Give the ship resistance to un-enhanced damage from ship weapons for 1 minute (ends early if disabled).
                </p>
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={bestShipInVerseUsed}
                  onClick={handleUseBestShip}
                  className={`mt-1 py-2 rounded text-[9px] font-bold uppercase tracking-wider font-mono border transition-all flex items-center justify-center gap-1.5 ${
                    bestShipInVerseUsed
                      ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                      : "border-amber-500/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 cursor-pointer shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {bestShipInVerseUsed ? "ACTIVE / EXPENDED" : "TRIGGER RESISTANCE"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}