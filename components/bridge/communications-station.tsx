"use client"

import { useState, useMemo, useEffect } from "react"
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
  UserMinus,
  X,
  Maximize2,
  Minimize2,
  Layers,
  Bookmark,
  Volume2,
  VolumeX,
  Activity,
  MessageSquare,
  ShieldCheck,
  Dices,
  RotateCcw
} from "lucide-react"

// --- FLAT AVIONICS SOUND SYNTHESIZER & HAPTICS (NO ASSETS REQUIRED) ---
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  return audioCtx
}

function playFlatGlassClick() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === "suspended") ctx.resume()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(1800, now)
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.012)

    gain.gain.setValueAtTime(0.035, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.012)
  } catch {}
}

function playSubtleEngage() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === "suspended") ctx.resume()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "triangle"
    osc.frequency.setValueAtTime(520, now)
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.04)

    gain.gain.setValueAtTime(0.04, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  } catch {}
}

function triggerTactilePulse(type: "tap" | "heavy" = "tap") {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "tap") navigator.vibrate(10)
      else navigator.vibrate([15, 20, 15])
    } catch {}
  }
}

export type CommunicationsCardId =
  | "commsLink"
  | "powerDice"
  | "electronicWarfare"
  | "interfere"
  | "broadcast"
  | "yachtProtocols"
  | "mods"
  | "ship_stats"

interface CustomPreset {
  id: string
  name: string
  activeCards: CommunicationsCardId[]
}

const DEFAULT_PRESETS: CustomPreset[] = [
  { id: "ew", name: "Electronic Warfare", activeCards: ["electronicWarfare", "interfere", "powerDice"] },
  { id: "social", name: "Social & Comms", activeCards: ["commsLink", "broadcast", "yachtProtocols"] },
  { id: "combat", name: "Tactical Combat", activeCards: ["powerDice", "electronicWarfare", "interfere"] },
  { id: "all", name: "All Systems", activeCards: ["commsLink", "powerDice", "electronicWarfare", "interfere", "broadcast", "yachtProtocols", "mods", "ship_stats"] }
]

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
  versatileTransportUsed = 0,
  onUpdateVersatileTransportUsed,
  bestShipInVerseUsed = false,
  onUpdateBestShipInVerseUsed,
  systemDamageLevel = 0,
  isDisabled = false,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
}: CommunicationsStationProps) {
  // --- MFD MODULAR DECK STATE (PER-CLIENT PERSISTENCE) ---
  const [openCards, setOpenCards] = useState<CommunicationsCardId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sw5e_comms_open_cards")
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return ["electronicWarfare", "interfere", "powerDice"]
  })

  const [maximizedCard, setMaximizedCard] = useState<CommunicationsCardId | null>(null)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sw5e_comms_open_cards", JSON.stringify(openCards))
      } catch {}
    }
  }, [openCards])

  const toggleCard = (id: CommunicationsCardId) => {
    if (soundEnabled) {
      playFlatGlassClick()
      triggerTactilePulse("tap")
    }
    setOpenCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const applyPreset = (cards: CommunicationsCardId[]) => {
    if (soundEnabled) {
      playSubtleEngage()
      triggerTactilePulse("heavy")
    }
    setOpenCards(cards)
    setMaximizedCard(null)
  }

  const handleSaveCustomPreset = () => {
    const name = window.prompt("Enter name for this custom communications layout:", "Custom Comms Setup")
    if (!name) return
    if (typeof window !== "undefined") {
      try {
        const key = `sw5e_comms_preset_${Date.now()}`
        localStorage.setItem(key, JSON.stringify({ id: key, name, activeCards: openCards }))
        alert(`Preset '${name}' saved to this device!`)
      } catch {}
    }
  }

  // --- CREW ASSIGNMENT EXTRACTION ---
  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "communications" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "communications" && !m.isPassenger)
  }, [manifest])

  const commsMods = useMemo(() => {
    return installedMods.filter(
      (m) => m.station?.toLowerCase() === "communications"
    )
  }, [installedMods])

  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const shipSize = (shipConfig?.size || "small").toLowerCase()
  const isSmallOrTiny = shipSize === "small" || shipSize === "tiny"
  const isMedium = shipSize === "medium"
  const tierUses = Math.max(1, shipTier)
  const proficiencyBonus = shipConfig?.proficiencyBonus ?? 2

  const rawCharisma = (shipConfig as any)?.stats?.charisma ?? 10
  const chaMod = Math.floor((rawCharisma - 10) / 2)

  const rawStrength = (shipConfig as any)?.stats?.strength ?? 10
  const strMod = Math.floor((rawStrength - 10) / 2)

  const rawIntelligence = (shipConfig as any)?.stats?.intelligence ?? 10
  const intMod = Math.floor((rawIntelligence - 10) / 2)

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

  const hasVersatileTransport = isMedium && shipTier >= 3
  const versatileMax = 2 * shipTier
  const hasBestShip = isMedium && shipTier >= 5

  const [dischargerUses, setDischargerUses] = useState<number>(0)
  const [empUses, setEmpUses] = useState<number>(0)
  const [scramblerUses, setScramblerUses] = useState<number>(0)
  const [slicerUses, setSlicerUses] = useState<number>(0)
  const [tacticalFeedback, setTacticalFeedback] = useState<string | null>(null)
  const [interfereRollResult, setInterfereRollResult] = useState<string | null>(null)

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

    return onConsumePowerDice(amount)
  }

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
    const dc = 8 + proficiencyBonus + intMod
    setTacticalFeedback(`${shipSlicerMod.name} Executed: Target must make a DC ${dc} Intelligence saving throw! (${shipSlicerMod.description})`)
  }

  const handleRollInterfere = () => {
    const d20 = Math.floor(Math.random() * 20) + 1
    const mod = interfereMod ?? 0
    const total = d20 + mod
    setInterfereRollResult(`Interfere Check: d20 (${d20}) ${mod >= 0 ? `+ ${mod}` : `${mod}`} = ${total}`)
  }

  const handleResetEwUses = () => {
    setDischargerUses(0)
    setEmpUses(0)
    setScramblerUses(0)
    setSlicerUses(0)
    setTacticalFeedback("Tactical EW module charges reset.")
  }

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

  // RENDER DOCKED SNAPSHOT CARD TILE
  const renderSnapshotCard = (
    id: CommunicationsCardId,
    title: string,
    value: string,
    statusText: string,
    icon: React.ReactNode,
    accentColor: string
  ) => {
    const isOpen = openCards.includes(id)
    return (
      <button
        key={id}
        type="button"
        onClick={() => toggleCard(id)}
        className={`flex flex-col justify-between p-2.5 rounded border transition-all text-left relative overflow-hidden group cursor-pointer ${
          isOpen
            ? "bg-slate-950 border-cyan-neon shadow-[0_0_15px_rgba(0,255,255,0.18)]"
            : "bg-black/60 border-bridge-border/80 hover:border-cyan-neon/50 hover:bg-slate-950/80"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-cyan-neon flex items-center gap-1.5 truncate">
            {icon}
            {title}
          </span>
          <span
            className={`w-2 h-2 rounded-full transition-all shrink-0 ${
              isOpen
                ? "bg-cyan-neon shadow-[0_0_8px_#06b6d4] scale-125"
                : "bg-slate-700 group-hover:bg-cyan-neon/50"
            }`}
          />
        </div>

        <div className="my-1.5">
          <span className={`text-sm md:text-base font-bold font-mono tracking-tight block truncate ${accentColor}`}>
            {value}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest block truncate">
            {statusText}
          </span>
        </div>

        <div className="flex items-center justify-between w-full border-t border-bridge-border/30 pt-1 text-[8px] uppercase text-slate-500">
          <span>PANEL</span>
          <span className={isOpen ? "text-cyan-neon font-bold" : ""}>
            {isOpen ? "OPEN ▲" : "CLOSED ▼"}
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3.5 w-full font-mono">
      {/* 1. MASTER HEADER BAR */}
      <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-bridge-border pb-2.5 gap-2.5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-glow-cyan text-base md:text-lg font-bold tracking-[0.15em] text-cyan-neon flex items-center gap-2">
              <Radio className="h-5 w-5 text-cyan-neon" />
              SUB-SPACE &amp; INTERNAL COMMUNICATIONS
            </h2>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60 mt-0.5">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // COMMS &amp; ELECTRONIC WARFARE //{" "}
            <span className={isDisabled ? "text-red-400 font-bold animate-pulse" : "text-emerald-400 font-bold"}>
              {isDisabled ? "TRANSCEIVER RESTRICTED (<1000 FT)" : "NETWORK SECURE"}
            </span>
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {isDisabled && (
            <span className="rounded border border-red-500/80 bg-red-950/60 px-2.5 py-0.5 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              ⚠️ DISABLED (&lt; 1,000 FT ONLY)
            </span>
          )}

          {hasCommsRenowned ? (
            <span className="rounded border border-purple-400/60 bg-purple-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-purple-300">
              GALAXY-WIDE LINK
            </span>
          ) : hasCommsPrototype ? (
            <span className="rounded border border-cyan-400/60 bg-cyan-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
              TERRITORY (ENCRYPTED)
            </span>
          ) : hasCommsPremium ? (
            <span className="rounded border border-cyan-400/60 bg-cyan-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
              SECTOR-WIDE
            </span>
          ) : null}

          {isScrambler && (
            <span className="rounded border border-cyan-400/60 bg-cyan-950/40 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
              SCRAMBLER SPEC
            </span>
          )}

          <span className="rounded-sm border border-cyan-neon/50 bg-cyan-neon/10 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-cyan-neon">
            COMMS: {isDisabled ? "RESTRICTED" : "SECURE"}
          </span>
        </div>
      </header>

      {/* 2. PRESET WORKSPACE SELECTOR & AUDIO/HAPTIC MUTE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-black/60 border border-bridge-border text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-neon" /> Presets:
          </span>
          {DEFAULT_PRESETS.map((p) => {
            const isMatch =
              p.activeCards.length === openCards.length &&
              p.activeCards.every((c) => openCards.includes(c))
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.activeCards)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition border cursor-pointer ${
                  isMatch
                    ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon shadow-[0_0_8px_rgba(0,255,255,0.3)]"
                    : "bg-black/40 border-bridge-border/60 text-slate-400 hover:text-white"
                }`}
              >
                {p.name}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => applyPreset([])}
            disabled={openCards.length === 0}
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-700 bg-black/40 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Collapse all open drawers"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleSaveCustomPreset}
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer"
            title="Save current layout to local browser"
          >
            <Bookmark className="w-3 h-3" /> Save View
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSoundEnabled((prev) => !prev)
              triggerTactilePulse("tap")
            }}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase cursor-pointer transition ${
              soundEnabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-slate-800 bg-slate-900 text-slate-500"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? "Audio & Haptics ON" : "Muted"}</span>
          </button>
        </div>
      </div>

      {/* 3. PERSISTENT CREW ROSTER HUD */}
      <div className="rounded border border-cyan-neon/40 bg-black/40 px-3 py-1.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-[0_0_12px_rgba(0,255,255,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-bold text-cyan-neon uppercase tracking-wider mr-1">
            <Users className="h-3.5 w-3.5" />
            <span>Manned Communications:</span>
          </div>

          {assignedCrew.length === 0 ? (
            <span className="text-xs text-amber-300 italic px-2 py-0.5 border border-amber-500/30 bg-amber-950/20 rounded">
              Console Uncrewed — Assign Comms Officer
            </span>
          ) : (
            assignedCrew.map((member, idx) => {
              const isLead = idx === 0
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs ${
                    member.hasTakenTurnThisRound
                      ? "bg-slate-900/60 border-slate-800 text-slate-400"
                      : "bg-slate-950 border-cyan-500/40 text-slate-100"
                  }`}
                >
                  <span
                    className={`text-[8px] font-bold px-1 rounded border uppercase ${
                      isLead
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-sky-500/20 text-sky-400 border-sky-500/40"
                    }`}
                  >
                    {isLead ? "Comms Officer" : "Support"}
                  </span>
                  <span className="font-bold text-xs">{member.name}</span>

                  <button
                    type="button"
                    onClick={() => onToggleTurn && onToggleTurn(member.id)}
                    className="cursor-pointer ml-0.5"
                    title={member.hasTakenTurnThisRound ? "Action Taken" : "Action Pending"}
                  >
                    {member.hasTakenTurnThisRound ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onAssignCrew && onAssignCrew(member.id, "crew_quarters")}
                    className="text-slate-500 hover:text-rose-400 transition ml-0.5 cursor-pointer"
                    title="Relieve from Station"
                  >
                    <UserMinus className="h-3 w-3" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {availablePersonnel.length > 0 && onAssignCrew && (
          <div className="flex items-center gap-1.5 self-end md:self-auto">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Deploy:</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) onAssignCrew(e.target.value, "communications")
              }}
              className="rounded bg-slate-950 border border-slate-700 px-2 py-0.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon cursor-pointer"
            >
              <option value="" disabled>+ Assign Crew...</option>
              {availablePersonnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({getCrewRole(p, manifest)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. TOP-DECK MODULAR SNAPSHOT TILES (8 UNIFORM TILES) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 w-full">
        {renderSnapshotCard(
          "commsLink",
          "Array Link",
          isDisabled ? "Restricted" : hasCommsRenowned ? "Galaxy-Wide" : hasCommsPrototype ? "Territory" : "Standard",
          isDisabled ? "< 1,000 Ft Cap" : "Broadband Online",
          <Radio className="w-3 h-3 text-cyan-neon" />,
          isDisabled ? "text-red-400" : "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "powerDice",
          "Comms Power",
          isDistributed ? `${currentStationDice}/2 Dice` : `${effectiveAvailable}/${effectiveMax} Dice`,
          isHubAndSpoke ? `${sharedPoolDice}/2 Shared` : powerCoupling.replace(" Power Coupling", ""),
          <Zap className="w-3 h-3 text-amber-400" />,
          "text-amber-300"
        )}

        {renderSnapshotCard(
          "electronicWarfare",
          "EW & Slicing",
          hasEMPDevice || hasElectricalDischargers || scramblerMod || shipSlicerMod ? "Active Grid" : "Passive",
          empUses > 0 || dischargerUses > 0 || scramblerUses > 0 || slicerUses > 0 ? "Modules Fired" : "Systems Ready",
          <Cpu className="w-3 h-3 text-purple-400" />,
          "text-purple-300"
        )}

        {renderSnapshotCard(
          "interfere",
          "Interfere",
          interfereMod !== undefined ? (interfereMod >= 0 ? `+${interfereMod}` : `${interfereMod}`) : "+0",
          isScrambler ? "Bonus Action" : "Standard Action",
          <ShieldAlert className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "broadcast",
          "Broadcast",
          menaceMod !== undefined ? (menaceMod >= 0 ? `+${menaceMod}` : `${menaceMod}`) : "+0",
          "Hail & Impress",
          <MessageSquare className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}

        {renderSnapshotCard(
          "yachtProtocols",
          "Diplomacy",
          isYachtMastery ? "Mastery Active" : isYachtSpec ? "Specialization" : "Standard",
          isYachtMastery ? "Advantage Visual" : isYachtSpec ? "Disadv Guests" : "Standard Channel",
          <Users className="w-3 h-3 text-amber-400" />,
          isYachtSpec || isYachtMastery ? "text-amber-300" : "text-slate-400"
        )}

        {renderSnapshotCard(
          "mods",
          "Hardware",
          `${commsMods.length} Mods`,
          "Comms Hardware",
          <Cpu className="w-3 h-3 text-purple-400" />,
          "text-purple-300"
        )}

        {renderSnapshotCard(
          "ship_stats",
          "Ship Stats",
          `AC ${shipConfig?.armorClass ?? 12}`,
          "Armor Class",
          <Activity className="w-3 h-3 text-cyan-neon" />,
          "text-cyan-neon"
        )}
      </section>

      {/* 5. EXPANDABLE DYNAMIC WORKSPACE GRID (RESPONSIVE 2-COLUMN) */}
      {openCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-bridge-border/60 rounded bg-black/40 text-center text-xs text-muted-foreground my-2">
          <Radio className="w-8 h-8 text-cyan-neon/30 mb-2 animate-pulse" />
          <p className="uppercase tracking-widest text-slate-300 font-bold">ALL COMMUNICATIONS PANELS COLLAPSED</p>
          <p className="text-[10px] mt-1 text-slate-500">Tap any status card above or choose an operational preset.</p>
        </div>
      ) : (
        <div
          className={`grid gap-3.5 transition-all duration-300 ${
            maximizedCard
              ? "grid-cols-1"
              : openCards.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 lg:grid-cols-2"
          }`}
        >
          {openCards.map((cardId) => {
            if (maximizedCard && maximizedCard !== cardId) return null
            const isMax = maximizedCard === cardId

            return (
              <div
                key={cardId}
                className="flex flex-col rounded-lg border border-cyan-neon/50 bg-bridge-panel p-3.5 shadow-[0_0_20px_rgba(0,255,255,0.06)] relative overflow-hidden transition-all duration-200"
              >
                {/* SUB-PANEL DRAWER HEADER */}
                <div className="flex items-center justify-between border-b border-bridge-border pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-cyan-neon shadow-[0_0_6px_#06b6d4]" />
                    <h3 className="text-xs font-bold tracking-widest uppercase text-cyan-neon">
                      {cardId === "commsLink" && "Sub-Space Array & Transmission Grid"}
                      {cardId === "powerDice" && "Communications Power Matrix"}
                      {cardId === "electronicWarfare" && "Tactical Slicer & EW Modules"}
                      {cardId === "interfere" && "Interference Warfare Protocols"}
                      {cardId === "broadcast" && "Hail & Social Broadcast Channels"}
                      {cardId === "yachtProtocols" && "Yacht Diplomatic Protocols"}
                      {cardId === "mods" && "Installed Communications Hardware"}
                      {cardId === "ship_stats" && "Ship Ability Scores & Statistics"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMaximizedCard((prev) => (prev === cardId ? null : cardId))}
                      className="p-1 rounded text-slate-400 hover:text-cyan-neon hover:bg-black/40 cursor-pointer"
                      title={isMax ? "Restore Multi-Window" : "Maximize to Full-Width"}
                    >
                      {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCard(cardId)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-black/40 cursor-pointer"
                      title="Collapse Panel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1. COMMS LINK WORKSPACE */}
                {cardId === "commsLink" && (
                  <div className="flex flex-col gap-3">
                    {isDisabled && (
                      <div className="p-2.5 rounded border border-red-500/80 bg-red-950/60 text-xs text-red-200 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                        <span>Vessel Disabled: High-gain transceiver offline. Local transmission range capped at 1,000 ft.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded border border-bridge-border bg-black/40">
                        <span className="text-[9px] text-muted-foreground uppercase block">Transmission Range</span>
                        <span className="font-bold text-cyan-neon font-mono">
                          {hasCommsRenowned ? "Galaxy-Wide Holonet" : hasCommsPrototype ? "Territory-Wide (Encrypted)" : hasCommsPremium ? "Sector-Wide Relay" : "Local System"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded border border-bridge-border bg-black/40">
                        <span className="text-[9px] text-muted-foreground uppercase block">Encryption Status</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {hasCommsPrototype ? "Mil-Spec Cipher (Active)" : "Standard Sub-Space"}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Primary transceiver coordinates sub-space traffic, encrypted diplomatic frequencies, emergency distress beacons, and remote override links.
                    </p>
                  </div>
                )}

                {/* 2. POWER MATRIX WORKSPACE */}
                {cardId === "powerDice" && (
                  <div className="flex flex-col gap-3">
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
                      <div className="flex flex-col gap-2 pt-2 border-t border-bridge-border/60 w-full">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-400 font-bold tracking-wider uppercase text-[10px]">Shared Reactor Pool</span>
                          <span className="font-bold text-amber-400 text-xs">{sharedPoolDice} / 2</span>
                        </div>
                        <div className="flex items-center gap-1.5 w-full">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-2.5 flex-1 rounded-xs inline-block ${
                                i < sharedPoolDice 
                                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                                  : "bg-black/80 border border-bridge-border"
                              }`}
                            />
                          ))}
                        </div>

                        {!canSpendStation && canSpendShared && (
                          <button
                            type="button"
                            onClick={() => handleCustomConsume(1)}
                            className="w-full mt-1 rounded bg-amber-500/20 border border-amber-400/60 py-1.5 text-xs font-bold tracking-wider text-amber-300 hover:bg-amber-500/30 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.2)] cursor-pointer"
                          >
                            CONSUME SHARED REACTOR DIE ({sharedPoolDice} REMAINING)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ELECTRONIC WARFARE WORKSPACE */}
                {cardId === "electronicWarfare" && (
                  <div className="flex flex-col gap-3">
                    {(hasElectricalDischargers || hasEMPDevice || scramblerMod || shipSlicerMod || commsSuppressorMod) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {hasElectricalDischargers && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-amber-400" /> Dischargers
                                </span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-amber-950/40 text-amber-300 border-amber-500/40 font-bold">
                                  {tierUses - dischargerUses}/{tierUses}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                50-ft burst: DC {8 + proficiencyBonus + strMod} Dex save or {Math.max(1, shipTier)}d6 lightning damage.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={dischargerUses >= tierUses}
                              onClick={handleTriggerElectricalDischarge}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border transition-all cursor-pointer ${
                                dischargerUses >= tierUses
                                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                                  : "bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30"
                              }`}
                            >
                              Fire Burst ({Math.max(1, shipTier)}d6)
                            </button>
                          </div>
                        )}

                        {hasEMPDevice && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" /> EMP Device
                                </span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-rose-950/40 text-rose-300 border-rose-500/40 font-bold">
                                  {tierUses - empUses}/{tierUses}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                100-ft EMP: DC {8 + proficiencyBonus + strMod} Con save or Stunned 1 min.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={empUses >= tierUses}
                              onClick={handleTriggerEMP}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border transition-all cursor-pointer ${
                                empUses >= tierUses
                                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                                  : "bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30"
                              }`}
                            >
                              Trigger EMP
                            </button>
                          </div>
                        )}

                        {scramblerMod && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold text-cyan-neon uppercase truncate">
                                  {scramblerMod.name}
                                </span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-cyan-950/40 text-cyan-300 border-cyan-500/40 font-bold">
                                  {tierUses - scramblerUses}/{tierUses}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed truncate" title={scramblerMod.description}>
                                DC {8 + proficiencyBonus + chaMod} Wis save.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={scramblerUses >= tierUses}
                              onClick={handleTriggerScrambler}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border transition-all cursor-pointer ${
                                scramblerUses >= tierUses
                                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                                  : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                              }`}
                            >
                              Activate Scrambler
                            </button>
                          </div>
                        )}

                        {shipSlicerMod && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold text-purple-300 uppercase truncate">
                                  {shipSlicerMod.name}
                                </span>
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded border bg-purple-950/40 text-purple-300 border-purple-500/40 font-bold">
                                  {tierUses - slicerUses}/{tierUses}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-relaxed truncate" title={shipSlicerMod.description}>
                                DC {8 + proficiencyBonus + intMod} Int save.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={slicerUses >= tierUses}
                              onClick={handleTriggerShipSlicer}
                              className={`w-full py-1 rounded text-[9px] font-bold uppercase border transition-all cursor-pointer ${
                                slicerUses >= tierUses
                                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                                  : "bg-purple-500/20 border-purple-400 text-purple-300 hover:bg-purple-500/30"
                              }`}
                            >
                              Execute Slicer
                            </button>
                          </div>
                        )}

                        {commsSuppressorMod && (
                          <div className="p-2.5 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-1.5">
                            <div>
                              <span className="text-xs font-bold text-slate-200 uppercase block">Suppressor</span>
                              <p className="text-[9px] text-muted-foreground leading-relaxed">
                                Suppress comms within 1 mile. DC {8 + (interfereMod ?? 0)} Wisdom save.
                              </p>
                            </div>
                            <div className="p-1 rounded bg-black/60 border border-bridge-border/40 text-[9px] text-cyan-300 text-center font-bold">
                              DC {8 + (interfereMod ?? 0)} Wis Save
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded border border-dashed border-bridge-border/60 text-center text-xs text-muted-foreground">
                        No tactical electronic warfare modules installed.
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-bridge-border/40">
                      <button
                        type="button"
                        onClick={handleResetEwUses}
                        className="px-2 py-0.5 rounded border border-bridge-border bg-slate-900 text-slate-400 hover:text-white text-[9px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset Charges
                      </button>

                      {tacticalFeedback && (
                        <span className="text-[10px] text-cyan-neon font-mono truncate max-w-xs">{tacticalFeedback}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. INTERFERE WORKSPACE */}
                {cardId === "interfere" && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-black/40 border border-bridge-border/60 p-3 rounded flex flex-col justify-between gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-neon text-sm uppercase">Interfere Check</span>
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          isScrambler
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 animate-pulse"
                            : "bg-black/60 text-muted-foreground border-bridge-border"
                        }`}>
                          {isScrambler ? "BONUS ACTION (SCRAMBLER)" : "STANDARD ACTION"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Contested Charisma (Interfere) check against target's Wisdom (Scan). On success, subject has disadvantage on its next ability check or attack roll before the start of your next turn.
                      </p>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-bridge-border/40 pt-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Modifier:</span>
                          <span className="font-bold text-amber-300 font-mono text-sm">
                            {interfereMod !== undefined ? (interfereMod >= 0 ? `+${interfereMod}` : `${interfereMod}`) : "+0"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRollInterfere}
                            className="px-3 py-1 rounded bg-cyan-neon/20 hover:bg-cyan-neon/30 border border-cyan-neon/60 text-cyan-neon text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                          >
                            <Dices className="w-3.5 h-3.5" /> Roll Interfere
                          </button>
                        </div>
                      </div>

                      {interfereRollResult && (
                        <div className="p-2 rounded bg-black/60 border border-cyan-neon/40 text-xs font-mono font-bold text-cyan-neon mt-1">
                          {interfereRollResult}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. BROADCAST WORKSPACE */}
                {cardId === "broadcast" && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-black/40 border border-bridge-border/60 p-3 rounded flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-neon text-sm uppercase">Transmit / Hull-Hail</span>
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 text-muted-foreground border border-bridge-border">
                          STANDARD ACTION
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {isDisabled
                          ? "Transmission restricted to 1,000 ft while disabled. Broadcast deceptive codes, demand surrender, or coordinate tactical comms."
                          : "Broadcast deceptive transponder codes, demand unconditional surrender, or hail external vessels across holonet channels."}
                      </p>
                      <div className="grid grid-cols-3 gap-2 border-t border-bridge-border/40 pt-2 text-xs">
                        <div>
                          <span className="text-[9px] text-muted-foreground block">Impress</span>
                          <span className="font-bold text-cyan-neon font-mono">
                            {impressMod !== undefined ? (impressMod >= 0 ? `+${impressMod}` : `${impressMod}`) : "+0"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block">Menace</span>
                          <span className="font-bold text-cyan-neon font-mono">
                            {menaceMod !== undefined ? (menaceMod >= 0 ? `+${menaceMod}` : `${menaceMod}`) : "+0"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block">Swindle</span>
                          <span className="font-bold text-cyan-neon font-mono">
                            {swindleMod !== undefined ? (swindleMod >= 0 ? `+${swindleMod}` : `${swindleMod}`) : "+0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. YACHT DIPLOMATIC WORKSPACE */}
                {cardId === "yachtProtocols" && (
                  <div className="flex flex-col gap-3">
                    {(isYachtSpec || isYachtMastery) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {isYachtSpec && (
                          <div className="p-3 bg-black/40 rounded border border-amber-500/40 flex flex-col gap-1">
                            <span className="font-bold text-amber-300 uppercase">Recreational Hosting (Spec)</span>
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                              While hosting guests, they have disadvantage on Intelligence and Wisdom checks.
                            </p>
                          </div>
                        )}
                        {isYachtMastery && (
                          <div className="p-3 bg-black/40 rounded border border-emerald-500/40 flex flex-col gap-1">
                            <span className="font-bold text-emerald-300 uppercase">Visual Diplomacy (Mastery)</span>
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                              Advantage on Charisma checks against those who can see your ship.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded border border-dashed border-bridge-border/60 text-center text-xs text-muted-foreground">
                        Standard diplomatic channel active. (No Yacht role specialization).
                      </div>
                    )}
                  </div>
                )}

                {/* 7. HARDWARE MODIFICATIONS WORKSPACE */}
                {cardId === "mods" && (
                  <div className="flex flex-col gap-2">
                    <StationModifications 
                      station="Communications" 
                      installedMods={installedMods} 
                      onRemoveMod={onRemoveMod} 
                    />
                  </div>
                )}

                {/* 8. SHIP ABILITY SCORES & STATISTICS WORKSPACE */}
                {cardId === "ship_stats" && (
                  <div className="flex flex-col gap-3">
                    <ShipStats shipConfig={shipConfig} systemDamageLevel={systemDamageLevel} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 6. CHASSIS TACTICAL SURGES & REACTIONS (ALWAYS READY TRAY AT BOTTOM) */}
      {shipTier >= 3 && (
        <section className="rounded-md border border-cyan-neon/40 bg-bridge-panel p-2.5 shadow-[0_0_12px_rgba(0,255,255,0.04)] flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-bridge-border/60 pb-1">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-cyan-neon uppercase flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-neon" />
              Chassis Tactical Surges (Tier {shipTier})
            </h3>
            <span className="text-[8px] font-mono text-muted-foreground">COMBAT ACTIONS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {isSmallOrTiny && shipTier >= 4 && (
              <button
                type="button"
                disabled={standingByUsed}
                onClick={onUseStandingBy}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  standingByUsed
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-cyan-neon/50 text-cyan-neon hover:bg-cyan-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Standing By</span>
                  <span>{standingByUsed ? "USED" : "READY"}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Reaction: +1 Extra Action</span>
              </button>
            )}

            {isSmallOrTiny && shipTier >= 5 && (
              <button
                type="button"
                disabled={leafOnTheWindUsed}
                onClick={onUseLeafOnTheWind}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  leafOnTheWindUsed
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Leaf on the Wind</span>
                  <span>{leafOnTheWindUsed ? "USED" : "READY"}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Reaction: Treat roll as Nat 20</span>
              </button>
            )}

            {isMedium && hasVersatileTransport && (
              <button
                type="button"
                disabled={versatileTransportUsed >= versatileMax}
                onClick={handleUseVersatileTransport}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  versatileTransportUsed >= versatileMax
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-cyan-400/50 text-cyan-300 hover:bg-cyan-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Versatile Transport</span>
                  <span>{versatileMax - versatileTransportUsed}/{versatileMax}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Reaction: Grant Advantage</span>
              </button>
            )}

            {isMedium && hasBestShip && (
              <button
                type="button"
                disabled={bestShipInVerseUsed}
                onClick={handleUseBestShip}
                className={`p-2 rounded border text-left transition cursor-pointer ${
                  bestShipInVerseUsed
                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-black/40 border-amber-400/50 text-amber-300 hover:bg-amber-950/40"
                }`}
              >
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Best Ship in 'Verse</span>
                  <span>{bestShipInVerseUsed ? "EXP" : "READY"}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Action: Gain Resistance</span>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}