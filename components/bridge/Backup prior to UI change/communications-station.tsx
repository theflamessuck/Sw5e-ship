"use client"

import { useState, useMemo } from "react"
import { CombatResources } from "./combat-resources"
import { StationModifications } from "./ship-modifications"
import { ShipStats } from "./ship-stats"
import { type ShipConfig } from "./ship-setup"
import { type Modification } from "./ship-modifications"
import type { ManifestMember, ShipCompartmentId } from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"
import { 
  Radio, 
  Zap, 
  ShieldAlert, 
  Cpu, 
  Terminal, 
  Sparkles, 
  AlertTriangle, 
  Users, 
  AlertOctagon,
  CheckCircle2,
  Clock,
  UserMinus
} from "lucide-react"

interface CommunicationsStationProps {
  availablePowerDice?: number
  maxPowerDice?: number
  powerDieType?: string
  onConsumePowerDice?: (amount: number) => boolean
  impressMod?: number
  interfereMod?: number
  menaceMod?: number
  swindleMod?: number
  shipConfig?: ShipConfig
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
  stationPools?: Record<string, number>
  onUpdateStationPools?: React.Dispatch<React.SetStateAction<Record<string, number>>>
  sharedPoolDice?: number
  onUpdateSharedPool?: React.Dispatch<React.SetStateAction<number>>
  standingByUsed?: boolean
  onUseStandingBy?: () => void
  leafOnTheWindUsed?: boolean
  onUseLeafOnTheWind?: () => void
  versatileTransportUsed?: number
  onUpdateVersatileTransportUsed?: (count: number | ((prev: number) => number)) => void
  bestShipInVerseUsed?: boolean
  onUpdateBestShipInVerseUsed?: (used: boolean | ((prev: boolean) => boolean)) => void
  systemDamageLevel?: number
  isDisabled?: boolean
  // Manifest & Turn Integration
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
}

export function CommunicationsStation({
  availablePowerDice = 4,
  maxPowerDice = 4,
  powerDieType,
  onConsumePowerDice = () => false,
  impressMod,
  interfereMod,
  menaceMod,
  swindleMod,
  shipConfig,
  installedMods = [],
  onRemoveMod,
  stationPools = {
    engines: 0,
    communications: 0,
    weapons: 0,
    sensors: 0,
    defense: 0,
  },
  onUpdateStationPools,
  sharedPoolDice = 0,
  onUpdateSharedPool,
  standingByUsed = false,
  onUseStandingBy,
  leafOnTheWindUsed = false,
  onUseLeafOnTheWind,
  versatileTransportUsed,
  onUpdateVersatileTransportUsed,
  bestShipInVerseUsed,
  onUpdateBestShipInVerseUsed,
  systemDamageLevel = 0,
  isDisabled = false,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
}: CommunicationsStationProps) {
  // --- CREW ASSIGNMENT EXTRACTION ---
  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "communications" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "communications" && !m.isPassenger)
  }, [manifest])

  const commsOfficer = assignedCrew[0] || null
  const commsSupport = assignedCrew.slice(1)

  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const tierUses = Math.max(1, shipTier)
  const proficiencyBonus = shipConfig?.proficiencyBonus ?? 2

  const rawCharisma = (shipConfig as any)?.stats?.charisma ?? 10
  const chaMod = Math.floor((rawCharisma - 10) / 2)

  const rawStrength = (shipConfig as any)?.stats?.strength ?? 10
  const strMod = Math.floor((rawStrength - 10) / 2)

  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const currentStationDice = stationPools["communications"] ?? 0

  const effectiveMax = isDirect ? maxPowerDice : (isDistributed ? 2 : 1)
  const effectiveAvailable = isDirect ? availablePowerDice : currentStationDice

  const isScrambler = shipConfig?.roleSpecialization === "Scrambler"
  const isYachtSpec = shipConfig?.roleSpecialization === "Yacht"
  const isYachtMastery = shipConfig?.roleMastery === "Yacht"

  const hasElectricalDischargers = installedMods.some((m) => m.name.toUpperCase().includes("ELECTRICAL DISCHARGERS"))
  const hasEMPDevice = installedMods.some((m) => m.name.toUpperCase().includes("EMP DEVICE"))
  const commsSuppressorMod = installedMods.find((m) => m.name.toUpperCase().includes("COMMUNICATIONS SUPPRESSOR"))
  const scramblerMod = installedMods.find((m) => m.name.toUpperCase().includes("ELECTROMAGNETIC SCRAMBLER"))
  const shipSlicerMod = installedMods.find((m) => m.name.toUpperCase().includes("SHIP SLICER"))

  const hasCommsPremium = installedMods.some((m) => m.name.toUpperCase().includes("COMMUNICATIONS PACKAGE, PREMIUM"))
  const hasCommsPrototype = installedMods.some((m) => m.name.toUpperCase().includes("COMMUNICATIONS PACKAGE, PROTOTYPE"))
  const hasCommsRenowned = installedMods.some((m) => m.name.toUpperCase().includes("COMMUNICATIONS PACKAGE, RENOWNED"))

  const [dischargerUses, setDischargerUses] = useState<number>(0)
  const [empUses, setEmpUses] = useState<number>(0)
  const [scramblerUses, setScramblerUses] = useState<number>(0)
  const [slicerUses, setSlicerUses] = useState<number>(0)
  const [tacticalFeedback, setTacticalFeedback] = useState<string | null>(null)

  const handleCustomConsume = (amount: number = 1) => {
    if (isDirect) {
      return onConsumePowerDice(amount)
    }

    if (currentStationDice >= amount) {
      if (onUpdateStationPools) {
        onUpdateStationPools((prev) => ({
          ...prev,
          communications: Math.max(0, (prev["communications"] ?? 0) - amount),
        }))
      }
      return true
    } else if (isHubAndSpoke && sharedPoolDice >= amount) {
      if (onUpdateSharedPool) {
        onUpdateSharedPool((prev) => Math.max(0, prev - amount))
      }
      return true
    }

    return false
  }

  const canSpendStation = effectiveAvailable > 0
  const canSpendShared = isHubAndSpoke && sharedPoolDice > 0

  const handleTriggerElectricalDischarge = () => {
    if (dischargerUses >= tierUses) return
    setDischargerUses((prev) => prev + 1)
    const dc = 8 + proficiencyBonus + strMod
    const diceCount = Math.max(1, shipTier)
    setTacticalFeedback(`Electrical Dischargers Fired: Emitted burst within 50 ft. Each ship must succeed on DC ${dc} Dexterity save or take ${diceCount}d6 lightning damage!`)
  }

  const handleTriggerEMP = () => {
    if (empUses >= tierUses) return
    setEmpUses((prev) => prev + 1)
    const dc = 8 + proficiencyBonus + strMod
    setTacticalFeedback(`EMP Pulse Triggered: All ships within 100 ft must make a DC ${dc} Constitution save or become STUNNED for 1 minute! (Your ship fails initial save, has advantage on recovery).`)
  }

  const handleTriggerScrambler = () => {
    if (scramblerUses >= tierUses || !scramblerMod) return
    setScramblerUses((prev) => prev + 1)
    const dc = 8 + proficiencyBonus + chaMod
    setTacticalFeedback(`${scramblerMod.name} Activated: Target(s) must succeed on a DC ${dc} Wisdom saving throw! (${scramblerMod.description})`)
  }

  const handleTriggerShipSlicer = () => {
    if (slicerUses >= tierUses || !shipSlicerMod) return
    setSlicerUses((prev) => prev + 1)
    const dc = 8 + proficiencyBonus + chaMod
    setTacticalFeedback(`${shipSlicerMod.name} Executed: Target must make a DC ${dc} Intelligence saving throw! (${shipSlicerMod.description})`)
  }

  return (
    <div className="flex flex-col gap-6 w-full font-mono">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-bridge-border pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-glow-cyan text-lg font-bold tracking-[0.15em] text-cyan-neon">
            SUB-SPACE &amp; INTERNAL COMMUNICATIONS
          </h2>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // COMMS &amp; ELECTRONIC WARFARE
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isDisabled && (
            <span className="rounded border border-red-500/80 bg-red-950/60 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              ⚠️ COMMS DISABLED (&lt; 1,000 FT ONLY)
            </span>
          )}

          {hasCommsRenowned ? (
            <span className="rounded border border-purple-400/60 bg-purple-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-purple-300">
              BROADCAST: GALAXY-WIDE
            </span>
          ) : hasCommsPrototype ? (
            <span className="rounded border border-cyan-400/60 bg-cyan-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
              BROADCAST: TERRITORY-WIDE (ENCRYPTED)
            </span>
          ) : hasCommsPremium ? (
            <span className="rounded border border-cyan-400/60 bg-cyan-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
              BROADCAST: SECTOR-WIDE
            </span>
          ) : null}

          {isScrambler && (
            <span className="rounded border border-cyan-400/60 bg-cyan-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-cyan-300">
              SCRAMBLER SPEC (INTERFERE AS BONUS ACTION)
            </span>
          )}
          {isYachtSpec && (
            <span className="rounded border border-amber-400/60 bg-amber-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-amber-300">
              YACHT SPEC (GUESTS DISADV ON INT/WIS)
            </span>
          )}
          {isYachtMastery && (
            <span className="rounded border border-emerald-400/60 bg-emerald-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-emerald-300">
              YACHT MASTERY (ADV ON VISUAL CHA CHECKS)
            </span>
          )}
          <span className="rounded-sm border border-cyan-neon/50 bg-cyan-neon/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-cyan-neon">
            COMMS: {isDisabled ? "RESTRICTED" : "SECURE"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STATION CREW ASSIGNMENT & COMBAT TURN HUD */}
      {/* ========================================================================= */}
      <div className="rounded-md border border-cyan-neon/40 bg-black/40 p-3 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Assigned Personnel Cards */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-neon uppercase tracking-wider">
              <Users className="h-4 w-4 text-cyan-neon" />
              <span>Assigned Personnel:</span>
            </div>

            {assignedCrew.length === 0 ? (
              <span className="text-xs text-slate-500 italic bg-slate-900/60 border border-slate-800 px-3 py-1 rounded">
                Console Uncrewed — Select personnel to assign
              </span>
            ) : (
              assignedCrew.map((member, idx) => {
                const isLead = idx === 0
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs transition ${
                      member.hasTakenTurnThisRound
                        ? "bg-slate-900/60 border-slate-800 text-slate-400"
                        : "bg-slate-950 border-cyan-500/40 text-slate-100"
                    }`}
                  >
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                        isLead
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-sky-500/20 text-sky-400 border-sky-500/40"
                      }`}
                    >
                      {isLead ? "Comms Officer" : "Support"}
                    </span>

                    <span className="font-bold text-xs">{member.name}</span>

                    {/* Turn Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleTurn && onToggleTurn(member.id)}
                      className={`p-0.5 rounded transition ${
                        member.hasTakenTurnThisRound
                          ? "text-emerald-400 hover:text-emerald-300"
                          : "text-amber-400 hover:text-amber-300"
                      }`}
                      title={member.hasTakenTurnThisRound ? "Turn Taken" : "Turn Pending"}
                    >
                      {member.hasTakenTurnThisRound ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </button>

                    {/* Vacate / Return to Quarters */}
                    <button
                      type="button"
                      onClick={() => onAssignCrew && onAssignCrew(member.id, "crew_quarters")}
                      className="text-slate-500 hover:text-rose-400 transition ml-1"
                      title="Vacate Station (Return to Quarters)"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Pull Selector: Bring Crew to Comms */}
          {availablePersonnel.length > 0 && onAssignCrew && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                Deploy to Console:
              </span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onAssignCrew(e.target.value, "communications")
                  }
                }}
                className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon"
              >
                <option value="" disabled>
                  + Assign Crew Member...
                </option>
                {availablePersonnel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({getCrewRole(p, manifest)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* DISABLED OVERRIDE BANNER */}
      {isDisabled && (
        <section className="rounded-md border-2 border-red-500 bg-red-950/70 p-4 shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-center gap-3 text-center animate-pulse font-mono">
          <AlertOctagon className="w-6 h-6 text-red-400 shrink-0" />
          <span className="text-xs font-black uppercase tracking-widest text-red-200">
            ⛔ COMMS RESTRICTED: DISABLED SHIP CANNOT COMMUNICATE WITH EXTERNAL SOURCES BEYOND 1,000 FEET
          </span>
        </section>
      )}

      {/* 1. SHIP STATS & COMBAT RESOURCES */}
      <div className="grid gap-4 grid-cols-1 w-full">
        <ShipStats shipConfig={shipConfig} systemDamageLevel={systemDamageLevel} />
        <div className="flex flex-col rounded-md border border-bridge-border bg-bridge-panel p-4 gap-4 w-full">
          <CombatResources 
            availablePowerDice={effectiveAvailable}
            maxPowerDice={effectiveMax}
            powerDieType={powerDieType}
            onConsumePowerDice={handleCustomConsume}
            standingByUsed={standingByUsed}
            onUseStandingBy={onUseStandingBy}
            leafOnTheWindUsed={leafOnTheWindUsed}
            onUseLeafOnTheWind={onUseLeafOnTheWind}
            versatileTransportUsed={versatileTransportUsed}
            onUpdateVersatileTransportUsed={onUpdateVersatileTransportUsed}
            bestShipInVerseUsed={bestShipInVerseUsed}
            onUpdateBestShipInVerseUsed={onUpdateBestShipInVerseUsed}
            shipTier={shipConfig?.tier ?? 0}
            shipSize={shipConfig?.size}
          />
          
          {isHubAndSpoke && (
            <div className="flex flex-col gap-3 pt-3 border-t border-bridge-border/60 w-full">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 font-bold tracking-wider uppercase">Shared Reactor Pool</span>
                <span className="font-bold text-amber-400">{sharedPoolDice} / 2</span>
              </div>
              <div className="flex items-center gap-1.5 w-full">
                {Array.from({ length: 2 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-3 flex-1 rounded-sm inline-block ${
                      i < sharedPoolDice 
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                        : "bg-black/80 border border-bridge-border"
                    }`}
                  />
                ))}
              </div>

              {!canSpendStation && canSpendShared && (
                <button
                  onClick={() => handleCustomConsume(1)}
                  className="w-full mt-1 rounded bg-amber-500/20 border border-amber-400/60 py-2 text-xs font-bold tracking-wider text-amber-300 hover:bg-amber-500/30 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.2)] cursor-pointer"
                >
                  CONSUME SHARED REACTOR DIE ({sharedPoolDice} REMAINING)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* YACHT DIPLOMATIC BENEFITS DISPLAY */}
      {(isYachtSpec || isYachtMastery) && (
        <section className="rounded-md border border-amber-500/40 bg-black/40 p-4 shadow-[0_0_15px_rgba(251,191,36,0.1)] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
            <h3 className="text-xs font-bold tracking-[0.2em] text-amber-400 flex items-center gap-2 uppercase">
              <Users className="h-4 w-4" />
              Yacht Diplomatic Protocols
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isYachtSpec && (
              <div className="p-3 bg-black/60 rounded border border-amber-500/40 flex flex-col gap-1.5">
                <span className="text-xs font-bold text-amber-300 uppercase">Recreational Hosting (Spec)</span>
                <p className="text-[10px] text-slate-300 leading-relaxed font-mono">
                  While hosting guests on your ship, they have disadvantage on Intelligence and Wisdom checks.
                </p>
              </div>
            )}
            {isYachtMastery && (
              <div className="p-3 bg-black/60 rounded border border-emerald-500/40 flex flex-col gap-1.5">
                <span className="text-xs font-bold text-emerald-300 uppercase">Visual Diplomacy (Mastery)</span>
                <p className="text-[10px] text-slate-300 leading-relaxed font-mono">
                  You have advantage on Charisma checks made against those who can see your ship.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. TACTICAL ELECTRONIC WARFARE & SLICER MODULES */}
      {(hasElectricalDischargers || hasEMPDevice || scramblerMod || shipSlicerMod || commsSuppressorMod) && (
        <section className="rounded-md border border-cyan-neon/50 bg-bridge-panel p-4 flex flex-col gap-3 shadow-[0_0_15px_rgba(0,255,255,0.06)] font-mono">
          <div className="flex items-center justify-between border-b border-bridge-border pb-2">
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon flex items-center gap-2 uppercase">
              <Radio className="h-4 w-4 text-cyan-neon animate-pulse" />
              Tactical Slicer &amp; Electronic Warfare Modules
            </h3>
            <span className="text-[10px] text-muted-foreground">
              OFFENSIVE COMMS &amp; EMP SUITE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hasElectricalDischargers && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Electrical Dischargers
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-amber-950/40 text-amber-300 border-amber-500/40 font-bold">
                      {tierUses - dischargerUses} / {tierUses} (RECHARGE)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Action: Discharge 50-ft burst. DC {8 + proficiencyBonus + strMod} Dex save or take {Math.max(1, shipTier)}d6 lightning damage.
                  </p>
                </div>
                <button
                  disabled={dischargerUses >= tierUses}
                  onClick={handleTriggerElectricalDischarge}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    dischargerUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30"
                  }`}
                >
                  ⚡ Fire Electrical Burst ({Math.max(1, shipTier)}d6)
                </button>
              </div>
            )}

            {hasEMPDevice && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> EMP Device
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-rose-950/40 text-rose-300 border-rose-500/40 font-bold">
                      {tierUses - empUses} / {tierUses} (RECHARGE)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Action: 100-ft EMP blast. DC {8 + proficiencyBonus + strMod} Con save or stunned for 1 minute.
                  </p>
                </div>
                <button
                  disabled={empUses >= tierUses}
                  onClick={handleTriggerEMP}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    empUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30"
                  }`}
                >
                  Trigger EMP Wave
                </button>
              </div>
            )}

            {scramblerMod && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-neon uppercase flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-neon" /> {scramblerMod.name}
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-cyan-950/40 text-cyan-300 border-cyan-500/40 font-bold">
                      {tierUses - scramblerUses} / {tierUses} (RECHARGE)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed truncate" title={scramblerMod.description}>
                    DC {8 + proficiencyBonus + chaMod} Wis save. {scramblerMod.description}
                  </p>
                </div>
                <button
                  disabled={scramblerUses >= tierUses}
                  onClick={handleTriggerScrambler}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    scramblerUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                  }`}
                >
                  Activate Scrambler Pulse
                </button>
              </div>
            )}

            {shipSlicerMod && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-300 uppercase flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-300" /> {shipSlicerMod.name}
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-purple-950/40 text-purple-300 border-purple-500/40 font-bold">
                      {tierUses - slicerUses} / {tierUses} (RECHARGE)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed truncate" title={shipSlicerMod.description}>
                    DC {8 + proficiencyBonus + chaMod} Int save. {shipSlicerMod.description}
                  </p>
                </div>
                <button
                  disabled={slicerUses >= tierUses}
                  onClick={handleTriggerShipSlicer}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    slicerUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-purple-500/20 border-purple-400 text-purple-300 hover:bg-purple-500/30 shadow-[0_0_8px_rgba(192,132,252,0.25)]"
                  }`}
                >
                  Execute Slicer Protocol
                </button>
              </div>
            )}

            {commsSuppressorMod && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-neon" /> Comms Suppressor
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-black/60 text-emerald-400 border-bridge-border font-bold">
                      ACTIVE SYSTEM
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Action: Suppress communications within 1 mile. DC {8 + (interfereMod ?? 0)} Wisdom save.
                  </p>
                </div>
                <div className="p-1.5 rounded bg-black/60 border border-bridge-border/40 text-[9px] font-mono text-cyan-300 text-center">
                  DC {8 + (interfereMod ?? 0)} Wisdom Save
                </div>
              </div>
            )}
          </div>

          {tacticalFeedback && (
            <div className="p-2 rounded bg-black/60 border border-bridge-border/60 text-xs font-mono text-cyan-neon">
              {tacticalFeedback}
            </div>
          )}
        </section>
      )}

      {/* 3. CREW COMMUNICATIONS & ELECTRONIC WARFARE ACTIONS */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <div className="flex items-center justify-between border-b border-bridge-border/60 pb-2 mb-3">
          <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
            Electronic Warfare &amp; Communications Actions
          </h3>
          <span className="text-[10px] text-muted-foreground font-mono">
            CHARISMA SYSTEM INTERFACES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          {/* INTERFERE ACTION */}
          <div className="bg-black/40 border border-bridge-border/60 p-3 rounded flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-cyan-neon text-sm">INTERFERE</h4>
                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  isScrambler
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.3)] animate-pulse"
                    : "bg-black/60 text-muted-foreground border-bridge-border"
                }`}>
                  {isScrambler ? "BONUS ACTION (SCRAMBLER SPEC)" : "STANDARD ACTION"}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                You can attempt to interfere with another creature within 1,000 feet, in the attempt of a task. When you take the Interfere action, you make a Charisma (Interfere) check contested by the target’s Wisdom (Scan) check. If you succeed, the subject has disadvantage on the next ability check or attack roll it makes before the start of your next turn. The Interfere action can be taken multiple times on a ship’s turn.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-bridge-border/40 pt-2 text-[10px]">
              <span className="text-muted-foreground">Skill Modifier:</span>
              <span className="font-bold text-amber-300">
                {interfereMod !== undefined ? (interfereMod >= 0 ? `+${interfereMod}` : `${interfereMod}`) : "+0"}
              </span>
            </div>
          </div>

          {/* SWINDLE / MENACE ACTION */}
          <div className="bg-black/40 border border-bridge-border/60 p-3 rounded flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-cyan-neon text-sm">TRANSMIT / HULL-HAIL</h4>
                <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 text-muted-foreground border border-bridge-border">
                  STANDARD ACTION
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isDisabled
                  ? "Local range restricted to 1,000 ft while vessel is Disabled. Broadcast deceptive transponder codes, demand unconditional surrender, or hail external vessels."
                  : "Broadcast deceptive transponder codes, demand unconditional surrender, or impersonate imperial authorities via broad-band holonet channels."}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-bridge-border/40 pt-2 text-[10px]">
              <span className="text-muted-foreground">Impress / Menace Mod:</span>
              <span className="font-bold text-cyan-neon">
                {menaceMod !== undefined ? (menaceMod >= 0 ? `+${menaceMod}` : `${menaceMod}`) : "+0"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INSTALLED STATION MODIFICATIONS */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <h3 className="mb-3 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1">
          Installed Station Modifications
        </h3>
        <StationModifications 
          station="Communications" 
          installedMods={installedMods} 
          onRemoveMod={onRemoveMod} 
        />
      </section>
    </div>
  )
}