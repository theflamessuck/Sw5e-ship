"use client"

import { useState, useMemo } from "react"
import { ShipStats } from "./ship-stats"
import { CombatResources } from "./combat-resources"
import { StationModifications, type Modification } from "./ship-modifications"
import { 
  Radio, 
  Trash2, 
  ShieldAlert, 
  Eye, 
  Flame, 
  Bug, 
  ZapOff, 
  Compass, 
  ShieldMinus, 
  AlertOctagon, 
  EyeOff, 
  Users, 
  CheckCircle2, 
  Clock, 
  UserMinus 
} from "lucide-react"
import type { SensorContact } from "./gm-station"
import type { ShipConfig } from "./ship-setup"
import type { ManifestMember, ShipCompartmentId } from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"

interface SensorsStationProps {
  availablePowerDice?: number
  maxPowerDice?: number
  powerDieType?: string
  onConsumePowerDice?: (amount?: number) => boolean | void
  contacts?: SensorContact[]
  onUpdateContact?: (id: string, updates: Partial<SensorContact>) => void
  onRemoveContact?: (id: string) => void
  sensorSkillMod?: number
  probeSkillMod?: number
  shipConfig?: ShipConfig
  proficiencyBonus?: number
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
  isBlinded?: boolean
  // Manifest & Turn Integration
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
}

export function SensorsStation({
  availablePowerDice = 4,
  maxPowerDice = 4,
  powerDieType,
  onConsumePowerDice = () => false,
  contacts = [],
  onUpdateContact,
  onRemoveContact,
  sensorSkillMod,
  probeSkillMod,
  shipConfig,
  proficiencyBonus = 2,
  installedMods = [],
  onRemoveMod = () => {},
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
  isBlinded = false,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
}: SensorsStationProps) {
  // --- CREW ASSIGNMENT EXTRACTION ---
  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "sensors" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "sensors" && !m.isPassenger)
  }, [manifest])

  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const tierUses = Math.max(1, shipTier)

  // Scan States & Mastery Choice workflow
  const [activeScan, setActiveScan] = useState(false)
  const [scanDice, setScanDice] = useState<[number, number]>([10, 10])
  const [scanState, setScanState] = useState<"idle" | "choice" | "reroll_preview" | "manual" | "done">("idle")
  const [scanRerollLabel, setScanRerollLabel] = useState<string>("")
  const [manualScanInput, setManualScanInput] = useState<string>("")
  const [lastRollResult, setLastRollResult] = useState<{
    roll: number
    total: number
    discoveredCount: number
    tierUsed: string
  } | null>(null)

  // Probe States & Mastery Choice workflow
  const [activeProbe, setActiveProbe] = useState(false)
  const [probeDice, setProbeDice] = useState<[number, number]>([10, 10])
  const [probeState, setProbeState] = useState<"idle" | "choice" | "reroll_preview" | "done">("idle")
  const [rerollActionLabel, setRerollActionLabel] = useState<string>("")
  const [probeFinalResult, setProbeFinalResult] = useState<{
    roll: number
    total: number
    tierUsed: string
  } | null>(null)

  // Clear Contact Warning State
  const [clearingContactId, setClearingContactId] = useState<string | null>(null)

  // --- SENSORS MODIFICATIONS DETECTION ---
  const hasScannerPremium = installedMods.some((m) => m.name.toUpperCase().includes("SCANNER, PREMIUM"))
  const hasScannerPrototype = installedMods.some((m) => m.name.toUpperCase().includes("SCANNER, PROTOTYPE"))
  const hasScannerRenowned = installedMods.some((m) => m.name.toUpperCase().includes("SCANNER, RENOWNED"))
  const hasFlarePods = installedMods.some((m) => m.name.toUpperCase().includes("FLARE PODS"))
  const hasBuzzDroids = installedMods.some((m) => m.name.toUpperCase().includes("BUZZ DROID CLOUD"))
  const hasSensorDampener = installedMods.some((m) => m.name.toUpperCase().includes("SENSOR DAMPENER"))
  const hasShieldDisruptor = installedMods.some((m) => m.name.toUpperCase().includes("SHIELD DISRUPTOR"))
  const hasThreatTracker = installedMods.some((m) => m.name.toUpperCase().includes("THREAT TRACKER"))
  const hasStealthDevice = installedMods.some((m) => m.name.toUpperCase().includes("STEALTH DEVICE"))
  const hasActiveCamouflage = installedMods.some((m) => m.name.toUpperCase().includes("ACTIVE CAMOUFLAGE"))
  const hasCloakingDevice = installedMods.some((m) => m.name.toUpperCase().includes("CLOAKING DEVICE"))

  // --- TACTICAL SENSOR CHARGE TRACKERS ---
  const [flareUses, setFlareUses] = useState<number>(0)
  const [buzzUses, setBuzzUses] = useState<number>(0)
  const [dampenerUses, setDampenerUses] = useState<number>(0)
  const [disruptorUses, setDisruptorUses] = useState<number>(0)
  const [threatTrackerUses, setThreatTrackerUses] = useState<number>(0)
  const [stealthActive, setStealthActive] = useState<boolean>(false)
  const [tacticalFeedback, setTacticalFeedback] = useState<string | null>(null)

  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const currentStationDice = stationPools["sensors"] ?? (isHubAndSpoke ? 1 : isDistributed ? 2 : availablePowerDice)

  const effectiveMax = isDirect ? maxPowerDice : (isDistributed ? 2 : 1)
  const rawEffectiveAvailable = isDirect ? availablePowerDice : currentStationDice
  const effectiveAvailable = Math.min(rawEffectiveAvailable, effectiveMax)

  const handleCustomConsume = (amount: number = 1) => {
    if (isDirect) {
      return onConsumePowerDice?.(amount)
    }

    if (currentStationDice >= amount) {
      if (onUpdateStationPools) {
        onUpdateStationPools((prev) => ({
          ...prev,
          sensors: Math.max(0, (prev["sensors"] ?? (isHubAndSpoke ? 1 : 2)) - amount),
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

  const configAny = shipConfig as any

  const rawWisdom = 
    configAny?.attributes?.Wisdom ?? 
    configAny?.attributes?.wisdom ?? 
    configAny?.stats?.Wisdom ?? 
    configAny?.stats?.wisdom ?? 
    configAny?.Wisdom ?? 
    configAny?.wisdom ?? 
    10
  const wisMod = rawWisdom <= 5 && rawWisdom >= -5 ? rawWisdom : Math.floor((rawWisdom - 10) / 2)

  const rawIntelligence = 
    configAny?.attributes?.Intelligence ?? 
    configAny?.attributes?.intelligence ?? 
    configAny?.stats?.Intelligence ?? 
    configAny?.stats?.intelligence ?? 
    configAny?.Intelligence ?? 
    configAny?.intelligence ?? 
    10
  const intMod = rawIntelligence <= 5 && rawIntelligence >= -5 ? rawIntelligence : Math.floor((rawIntelligence - 10) / 2)

  const rawCharisma = 
    configAny?.attributes?.Charisma ?? 
    configAny?.attributes?.charisma ?? 
    configAny?.stats?.Charisma ?? 
    configAny?.stats?.charisma ?? 
    configAny?.Charisma ?? 
    configAny?.charisma ?? 
    10
  const chaMod = rawCharisma <= 5 && rawCharisma >= -5 ? rawCharisma : Math.floor((rawCharisma - 10) / 2)

  const profBonus = proficiencyBonus ?? 2

  const isScout = shipConfig?.roleSpecialization === "Scout"
  const scoutBonus = isScout ? 1 : 0

  const interfereBonus = (shipConfig?.skills?.interfere ?? (chaMod + profBonus)) + (shipConfig?.roleMastery === "Scrambler" ? 2 : 0)

  const rawScanTier = shipConfig?.skillTiers?.scan || configAny?.skillTiers?.scan || ""
  const normalizedScanTier = String(rawScanTier).toLowerCase().trim()

  const isGrandMasteryScan = normalizedScanTier === "grand-mastery" || normalizedScanTier === "gm" || normalizedScanTier === "3"
  const isHighMasteryScan = normalizedScanTier === "high-mastery" || normalizedScanTier === "hm" || normalizedScanTier === "2"
  const isMasteryScan = isGrandMasteryScan || isHighMasteryScan || normalizedScanTier === "mastery" || normalizedScanTier === "m" || normalizedScanTier === "1" || normalizedScanTier === "true"

  let scanMasteryBadge = ""
  if (isGrandMasteryScan) {
    scanMasteryBadge = "GM"
  } else if (isHighMasteryScan) {
    scanMasteryBadge = "HM"
  } else if (isMasteryScan) {
    scanMasteryBadge = "M"
  }

  const rawProbeTier = shipConfig?.skillTiers?.probe || configAny?.skillTiers?.probe || ""
  const normalizedProbeTier = String(rawProbeTier).toLowerCase().trim()

  const isGrandMasteryProbe = normalizedProbeTier === "grand-mastery" || normalizedProbeTier === "gm" || normalizedProbeTier === "3"
  const isHighMasteryProbe = normalizedProbeTier === "high-mastery" || normalizedProbeTier === "hm" || normalizedProbeTier === "2"
  const isMasteryProbe = isGrandMasteryProbe || isHighMasteryProbe || normalizedProbeTier === "mastery" || normalizedProbeTier === "m" || normalizedProbeTier === "1" || normalizedProbeTier === "true"

  let probeMasteryBadge = ""
  if (isGrandMasteryProbe) {
    probeMasteryBadge = "GM"
  } else if (isHighMasteryProbe) {
    probeMasteryBadge = "HM"
  } else if (isMasteryProbe) {
    probeMasteryBadge = "M"
  }

  const baseScanSkill = shipConfig?.skills?.scan ?? sensorSkillMod ?? (wisMod + profBonus)
  const calculatedScanSkill = baseScanSkill + scoutBonus

  const baseProbeSkill = shipConfig?.skills?.probe ?? probeSkillMod ?? (intMod + profBonus)
  const calculatedProbeSkill = baseProbeSkill + scoutBonus

  const handleInitiateActiveScan = () => {
    if (activeScan || isBlinded) return

    setActiveScan(true)
    const roll1 = Math.floor(Math.random() * 20) + 1
    const roll2 = Math.floor(Math.random() * 20) + 1

    setTimeout(() => {
      setActiveScan(false)
      setScanDice([roll1, roll2])

      if (hasScannerRenowned || isGrandMasteryScan || isHighMasteryScan) {
        setScanState("choice")
      } else if (isMasteryScan) {
        const bestRoll = Math.max(roll1, roll2)
        applyScanFinalResult(bestRoll, "Mastery (2d20 Take Highest)")
      } else {
        applyScanFinalResult(roll1, "Standard (1d20)")
      }
    }, 1000)
  }

  const applyScanFinalResult = (finalRoll: number, tierUsed: string) => {
    const total = finalRoll + calculatedScanSkill

    let discoveredCount = 0
    contacts.forEach((contact) => {
      if (!contact.isRevealed && total >= contact.scanDc) {
        if (onUpdateContact) {
          onUpdateContact(contact.id, { isRevealed: true })
        }
        discoveredCount++
      }
    })

    setLastRollResult({
      roll: finalRoll,
      total,
      discoveredCount,
      tierUsed,
    })
    setScanState("done")
  }

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isBlinded) return
    const parsedTotal = parseInt(manualScanInput, 10)
    if (isNaN(parsedTotal)) return

    const derivedRoll = Math.max(1, Math.min(20, parsedTotal - calculatedScanSkill))

    let discoveredCount = 0
    contacts.forEach((contact) => {
      if (!contact.isRevealed && parsedTotal >= contact.scanDc) {
        if (onUpdateContact) {
          onUpdateContact(contact.id, { isRevealed: true })
        }
        discoveredCount++
      }
    })

    setLastRollResult({
      roll: derivedRoll,
      total: parsedTotal,
      discoveredCount,
      tierUsed: "Manual Physical Dice Roll",
    })
    setManualScanInput("")
    setScanState("done")
  }

  const handleHighMasteryScanRerollLowest = () => {
    const [d1, d2] = scanDice
    const lowestIndex = d1 <= d2 ? 0 : 1
    const newRoll = Math.floor(Math.random() * 20) + 1
    const updatedDice: [number, number] = lowestIndex === 0 ? [newRoll, d2] : [d1, newRoll]

    setScanDice(updatedDice)
    setScanRerollLabel("High Mastery (HM - Rerolled Lowest Die)")
    setScanState("reroll_preview")
  }

  const handleGrandMasteryScanRerollSpecific = (targetIndex: number, label: string) => {
    const [d1, d2] = scanDice
    const newRoll = Math.floor(Math.random() * 20) + 1
    const updatedDice: [number, number] = targetIndex === 0 ? [newRoll, d2] : [d1, newRoll]

    setScanDice(updatedDice)
    setScanRerollLabel(label)
    setScanState("reroll_preview")
  }

  const handleGrandMasteryScanRerollBoth = () => {
    const newRoll1 = Math.floor(Math.random() * 20) + 1
    const newRoll2 = Math.floor(Math.random() * 20) + 1
    setScanDice([newRoll1, newRoll2])
    setScanRerollLabel("Grand Mastery (GM - Rerolled Both Dice)")
    setScanState("reroll_preview")
  }

  const handleKeepCurrentScanDice = (tierLabel: string) => {
    const [d1, d2] = scanDice
    const bestRoll = (isMasteryScan || hasScannerRenowned) ? Math.max(d1, d2) : d1
    applyScanFinalResult(bestRoll, tierLabel)
  }

  const handleFinalizeScanReroll = () => {
    const [d1, d2] = scanDice
    const bestRoll = Math.max(d1, d2)
    applyScanFinalResult(bestRoll, scanRerollLabel)
  }

  const handleLaunchProbe = () => {
    if (activeProbe || isBlinded) return

    setActiveProbe(true)
    const roll1 = Math.floor(Math.random() * 20) + 1
    const roll2 = Math.floor(Math.random() * 20) + 1

    setTimeout(() => {
      setActiveProbe(false)
      setProbeDice([roll1, roll2])

      if (hasScannerRenowned || isGrandMasteryProbe || isHighMasteryProbe) {
        setProbeState("choice")
      } else if (isMasteryProbe) {
        const bestRoll = Math.max(roll1, roll2)
        setProbeFinalResult({
          roll: bestRoll,
          total: bestRoll + calculatedProbeSkill,
          tierUsed: "Mastery (2d20 Take Highest)",
        })
        setProbeState("done")
      } else {
        setProbeFinalResult({
          roll: roll1,
          total: roll1 + calculatedProbeSkill,
          tierUsed: "Standard (1d20)",
        })
        setProbeState("done")
      }
    }, 1000)
  }

  const handleHighMasteryRerollLowest = () => {
    const [d1, d2] = probeDice
    const lowestIndex = d1 <= d2 ? 0 : 1
    const newRoll = Math.floor(Math.random() * 20) + 1
    const updatedDice: [number, number] = lowestIndex === 0 ? [newRoll, d2] : [d1, newRoll]

    setProbeDice(updatedDice)
    setRerollActionLabel("High Mastery (HM - Rerolled Lowest Die)")
    setProbeState("reroll_preview")
  }

  const handleGrandMasteryRerollSpecific = (targetIndex: number, label: string) => {
    const [d1, d2] = probeDice
    const newRoll = Math.floor(Math.random() * 20) + 1
    const updatedDice: [number, number] = targetIndex === 0 ? [newRoll, d2] : [d1, newRoll]

    setProbeDice(updatedDice)
    setRerollActionLabel(label)
    setProbeState("reroll_preview")
  }

  const handleGrandMasteryRerollBoth = () => {
    const newRoll1 = Math.floor(Math.random() * 20) + 1
    const newRoll2 = Math.floor(Math.random() * 20) + 1
    setProbeDice([newRoll1, newRoll2])
    setRerollActionLabel("Grand Mastery (GM - Rerolled Both Dice)")
    setProbeState("reroll_preview")
  }

  const handleKeepCurrentDice = (tierLabel: string) => {
    const [d1, d2] = probeDice
    const bestRoll = (isMasteryProbe || hasScannerRenowned) ? Math.max(d1, d2) : d1
    setProbeFinalResult({
      roll: bestRoll,
      total: bestRoll + calculatedProbeSkill,
      tierUsed: tierLabel,
    })
    setProbeState("done")
  }

  const handleFinalizeReroll = () => {
    const [d1, d2] = probeDice
    const bestRoll = Math.max(d1, d2)
    setProbeFinalResult({
      roll: bestRoll,
      total: bestRoll + calculatedProbeSkill,
      tierUsed: rerollActionLabel,
    })
    setProbeState("done")
  }

  const handleTriggerFlares = () => {
    if (flareUses >= tierUses) return
    setFlareUses((prev) => prev + 1)
    setTacticalFeedback("Countermeasure Flares Deployed: Advantage granted on Dexterity saving throw against triggering attack or missile!")
  }

  const handleDeployBuzzDroids = () => {
    if (buzzUses >= tierUses) return
    setBuzzUses((prev) => prev + 1)
    setTacticalFeedback("Buzz Droid Cloud Deployed: 200-ft sphere created within 1,500 ft. Area is difficult terrain; deals 2d4 kinetic hull damage per 50 ft travelled!")
  }

  const handleTriggerSensorDampener = () => {
    if (dampenerUses >= tierUses) return
    setDampenerUses((prev) => prev + 1)
    const dc = 8 + interfereBonus
    setTacticalFeedback(`Sensor Dampener Engaged: Target within 1,000 ft must succeed on a DC ${dc} Wisdom saving throw or be blinded for 1 minute!`)
  }

  const handleTriggerShieldDisruptor = () => {
    if (disruptorUses >= tierUses) return
    setDisruptorUses((prev) => prev + 1)
    setTacticalFeedback(`Shield Disruptor Activated: Make Charisma (Interfere) check (+${interfereBonus}) contested by target's Constitution (Regulate) check. On failure, target shield capacity & regen rate are halved for 1 minute!`)
  }

  const handleTriggerThreatTracker = () => {
    const maxUses = Math.max(1, wisMod)
    if (threatTrackerUses >= maxUses) return
    setThreatTrackerUses((prev) => prev + 1)
    setTacticalFeedback(`Threat Tracker Activated: Substituted Wisdom saving throw for Dexterity saving throw (${maxUses - (threatTrackerUses + 1)} uses remaining)!`)
  }

  const handleToggleStealth = () => {
    const nextState = !stealthActive
    setStealthActive(nextState)
    if (nextState) {
      if (hasCloakingDevice) {
        setTacticalFeedback("Cloaking Device Active: Vessel is INVISIBLE. Advantage on Dexterity (Hide) checks!")
      } else if (hasActiveCamouflage) {
        setTacticalFeedback("Active Camouflage Active: Scanner penalties removed. No mishap roll before hyperspace!")
      } else {
        setTacticalFeedback("Stealth Mode Active: Advantage on Hide checks relying on scanners. Disadvantage on Scan/Probe checks!")
      }
    } else {
      setTacticalFeedback("Stealth Mode Deactivated: Normal sensor signatures restored.")
    }
  }

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bridge-border pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-glow-cyan text-lg font-bold tracking-[0.1em] text-cyan-neon">
            SENSOR ARRAY &amp; SCANNER CONTROL
          </h2>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60">
            {shipConfig?.name?.toUpperCase() || "VESSEL"} // LONG-RANGE DETECTION
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isBlinded && (
            <span className="rounded border border-red-500/80 bg-red-950/60 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-red-300 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              ⚠️ SENSORS OFFLINE: BLINDED
            </span>
          )}
          {hasScannerPremium && (
            <span className="rounded border border-cyan-400/50 bg-cyan-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-cyan-300">
              RADAR: BLINDSIGHT (1,000 FT)
            </span>
          )}
          {hasScannerRenowned && (
            <span className="rounded border border-purple-400/50 bg-purple-950/40 px-2.5 py-1 text-[9px] font-mono font-bold text-purple-300">
              RADAR: TRUESIGHT (1,000 FT) &amp; ADV ON SCANS
            </span>
          )}
          {isScout && (
            <span className="rounded border border-amber-400/50 bg-amber-950/40 px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider text-amber-300">
              SCOUT SPECIALIZATION (+1 SCAN / PROBE)
            </span>
          )}
          <span className={`rounded-sm border px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase font-mono ${
            isBlinded
              ? "border-red-500/80 bg-red-950/60 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"
              : "border-cyan-neon/50 bg-cyan-neon/10 text-cyan-neon text-glow-cyan"
          }`}>
            ARRAY: {isBlinded ? "BLINDED (LOCKED)" : "ONLINE"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STATION CREW ASSIGNMENT & COMBAT TURN HUD */}
      {/* ========================================================================= */}
      <div className="rounded-md border border-cyan-neon/40 bg-black/40 p-3 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Assigned Sensors Personnel Cards */}
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
                      {isLead ? "Sensor Officer" : "Support"}
                    </span>

                    <span className="font-bold text-xs">{member.name}</span>

                    {/* Turn Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleTurn && onToggleTurn(member.id)}
                      className={`p-0.5 rounded transition cursor-pointer ${
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
                      className="text-slate-500 hover:text-rose-400 transition ml-1 cursor-pointer"
                      title="Vacate Station (Return to Quarters)"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Pull Selector: Bring Crew to Sensors */}
          {availablePersonnel.length > 0 && onAssignCrew && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                Deploy to Console:
              </span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onAssignCrew(e.target.value, "sensors")
                  }
                }}
                className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-cyan-300 focus:outline-none focus:border-cyan-neon cursor-pointer"
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

      {/* 1. CORE SHIP STATS & COMBAT RESOURCES */}
      <div className="grid gap-4 grid-cols-1 w-full">
        <ShipStats shipConfig={shipConfig} proficiencyBonus={proficiencyBonus} systemDamageLevel={systemDamageLevel} />
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

      {/* BLINDED OVERRIDE HERO BANNER */}
      {isBlinded && (
        <section className="rounded-md border-2 border-red-500 bg-red-950/80 p-4 shadow-[0_0_25px_rgba(239,68,68,0.4)] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left animate-pulse font-mono">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-red-200 block">
                🚨 SENSORS INOPERABLE // SHIP IS BLINDED
              </span>
              <p className="text-[10px] text-red-300/80 mt-0.5 leading-snug">
                The starship can&apos;t see and automatically fails any ability check that relies on sight or the ship&apos;s sensors. Attack rolls against the ship have advantage, and the ship&apos;s attack rolls have disadvantage. All active sweep arrays and sensor probe deployment tubes are locked.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold text-red-300 uppercase px-2 py-1 rounded border border-red-500/60 bg-black/60 shrink-0">
            CLEAR ON DEFENSE CONSOLE
          </span>
        </section>
      )}

      {/* 2. ACTIVE TACTICAL SENSOR COUNTERMEASURES & SYSTEMS */}
      {(hasFlarePods || hasBuzzDroids || hasSensorDampener || hasShieldDisruptor || hasThreatTracker || hasStealthDevice) && (
        <section className="rounded-md border border-cyan-neon/50 bg-bridge-panel p-4 flex flex-col gap-3 shadow-[0_0_15px_rgba(0,255,255,0.06)] font-mono">
          <div className="flex items-center justify-between border-b border-bridge-border pb-2">
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon flex items-center gap-2 uppercase">
              <Radio className="h-4 w-4 text-cyan-neon animate-pulse" />
              Active Tactical Sensor Modules &amp; Countermeasures
            </h3>
            <span className="text-[10px] text-muted-foreground">
              TACTICAL ELECTRONIC WARFARE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hasFlarePods && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> Flare Pods
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-amber-950/40 text-amber-300 border-amber-500/40 font-bold">
                      {tierUses - flareUses} / {tierUses} (REFIT)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Reaction: Grant advantage or a reroll on a Dexterity saving throw against incoming attacks or missile fire.
                  </p>
                </div>
                <button
                  disabled={flareUses >= tierUses}
                  onClick={handleTriggerFlares}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    flareUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_8px_rgba(251,191,36,0.25)]"
                  }`}
                >
                  ⚡ Fire Countermeasure Flares
                </button>
              </div>
            )}

            {hasBuzzDroids && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5 text-rose-400" /> Buzz Droid Cloud
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-rose-950/40 text-rose-300 border-rose-500/40 font-bold">
                      {tierUses - buzzUses} / {tierUses} (REFIT)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Action: Deploy a 200-ft sphere hazard at a point within 1,500 ft. Deals 2d4 kinetic damage directly to hull per 50 ft.
                  </p>
                </div>
                <button
                  disabled={buzzUses >= tierUses}
                  onClick={handleDeployBuzzDroids}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    buzzUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30"
                  }`}
                >
                  Deploy Buzz Droid Cloud
                </button>
              </div>
            )}

            {hasSensorDampener && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-neon uppercase flex items-center gap-1.5">
                      <ZapOff className="w-3.5 h-3.5 text-cyan-neon" /> Sensor Dampener
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-cyan-950/40 text-cyan-300 border-cyan-500/40 font-bold">
                      {tierUses - dampenerUses} / {tierUses} (RECHARGE)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Action: Target ship within 1,000 ft must make a Wisdom save (DC {8 + interfereBonus}) or be blinded for 1 minute.
                  </p>
                </div>
                <button
                  disabled={dampenerUses >= tierUses}
                  onClick={handleTriggerSensorDampener}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    dampenerUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                  }`}
                >
                  ⚡ Engage Sensor Dampener
                </button>
              </div>
            )}

            {hasShieldDisruptor && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                      <ShieldMinus className="w-3.5 h-3.5 text-cyan-300" /> Shield Disruptor
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-cyan-950/40 text-cyan-300 border-cyan-500/40 font-bold">
                      {tierUses - disruptorUses} / {tierUses} (RECHARGE)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Action: Contested Charisma (Interfere +{interfereBonus}) vs Con (Regulate) to halve target shield capacity and regen for 1 min.
                  </p>
                </div>
                <button
                  disabled={disruptorUses >= tierUses}
                  onClick={handleTriggerShieldDisruptor}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    disruptorUses >= tierUses
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                  }`}
                >
                  Trigger Shield Disruptor
                </button>
              </div>
            )}

            {hasThreatTracker && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-100 uppercase flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-cyan-neon" /> Threat Tracker
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border bg-black/60 text-slate-300 border-bridge-border font-bold">
                      {Math.max(1, wisMod) - threatTrackerUses} / {Math.max(1, wisMod)} (RECHARGE)
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Reaction: Substitute ship Wisdom save for a Dexterity saving throw.
                  </p>
                </div>
                <button
                  disabled={threatTrackerUses >= Math.max(1, wisMod)}
                  onClick={handleTriggerThreatTracker}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    threatTrackerUses >= Math.max(1, wisMod)
                      ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-cyan-500/20 border-cyan-neon text-cyan-neon hover:bg-cyan-500/30"
                  }`}
                >
                  ⚡ Swap to Wisdom Save
                </button>
              </div>
            )}

            {(hasStealthDevice || hasActiveCamouflage || hasCloakingDevice) && (
              <div className="p-3 rounded border border-bridge-border/60 bg-black/40 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-300 uppercase flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-purple-300" />
                      {hasCloakingDevice ? "Cloaking Device" : hasActiveCamouflage ? "Active Camouflage" : "Stealth Device"}
                    </span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border font-bold uppercase ${
                      stealthActive ? "bg-purple-500/30 text-purple-200 border-purple-400 animate-pulse" : "bg-black/60 text-slate-400 border-bridge-border"
                    }`}>
                      {stealthActive ? "CLOAKED" : "OFFLINE"}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Action: Toggle stealth grid. Advantage on Hide checks against scanners.
                  </p>
                </div>
                <button
                  onClick={handleToggleStealth}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                    stealthActive
                      ? "bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(192,132,252,0.4)]"
                      : "bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
                  }`}
                >
                  {stealthActive ? "Deactivate Stealth Grid" : "Engage Stealth Grid"}
                </button>
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

      {/* 3. SENSORS & ACTIVE SWEEP DIAGNOSTICS */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <h3 className="mb-4 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1">
          Sensors &amp; Active Sweep Diagnostics
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-4">
            
            {/* Active Sensor Sweep Card */}
            <div className={`rounded-md border p-4 flex flex-col gap-4 transition-all ${
              isBlinded 
                ? "border-red-500/60 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                : "border-bridge-border/80 bg-black/40"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`relative flex h-12 w-12 items-center justify-center rounded-full border ${
                    isBlinded ? "border-red-500/60 bg-red-950/40" : "border-cyan-neon/40 bg-cyan-neon/5"
                  }`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`h-full w-[1px] ${isBlinded ? "bg-red-500/30" : "bg-cyan-neon/20"}`}></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`h-[1px] w-full ${isBlinded ? "bg-red-500/30" : "bg-cyan-neon/20"}`}></div>
                    </div>
                    
                    <div className={`h-2 w-2 rounded-full ${
                      isBlinded 
                        ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-ping" 
                        : "bg-cyan-neon shadow-[0_0_6px_rgba(0,240,255,0.8)]"
                    }`}></div>

                    {activeScan && !isBlinded && (
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-neon animate-ping opacity-75"></div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold tracking-wider uppercase ${isBlinded ? "text-red-400" : "text-cyan-neon"}`}>
                        {isBlinded ? "OPTICAL & RADAR SWEEP [OFFLINE]" : "Active Sensor Sweep"}
                      </span>
                      {isMasteryScan && scanMasteryBadge && !isBlinded && (
                        <span className="rounded bg-cyan-500/20 border border-cyan-400/50 px-1.5 py-0.2 text-[9px] font-mono font-bold text-cyan-300">
                          {scanMasteryBadge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {isBlinded ? (
                        <span className="text-red-300/80 font-bold">Blind state: Automatic failure on scan checks</span>
                      ) : (
                        <>Roll: <strong>d20 + {calculatedScanSkill}</strong> (Wis Mod + Prof{isScout ? " + Scout" : ""})</>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isBlinded && (
                    <button
                      onClick={() => setScanState(scanState === "manual" ? "idle" : "manual")}
                      className="rounded px-3 py-2 text-[11px] font-bold bg-black/60 text-cyan-neon border border-cyan-neon/40 hover:bg-cyan-neon/10 transition-all cursor-pointer"
                      title="Enter physical dice total manually"
                    >
                      {scanState === "manual" ? "Cancel Manual" : "Manual Total"}
                    </button>
                  )}
                  <button
                    onClick={handleInitiateActiveScan}
                    disabled={isBlinded || activeScan || scanState === "choice" || scanState === "reroll_preview" || scanState === "manual"}
                    className={`rounded px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-all border ${
                      isBlinded
                        ? "bg-red-950/60 border-red-500/60 text-red-400 cursor-not-allowed opacity-60"
                        : "bg-cyan-neon/10 text-cyan-neon border-cyan-neon/40 hover:bg-cyan-neon/20 shadow-[0_0_10px_rgba(0,240,255,0.15)] cursor-pointer"
                    }`}
                  >
                    {isBlinded ? "SENSORS OFFLINE (BLINDED)" : activeScan ? "SWEEPING..." : "INITIATE ACTIVE SCAN"}
                  </button>
                </div>
              </div>

              {isMasteryScan && !isBlinded && (
                <div className="text-[10px] font-mono text-slate-300 bg-cyan-950/20 border border-cyan-neon/20 rounded p-2">
                  <span className="text-cyan-400 font-semibold block">Scan Skill Mastery Rules:</span>
                  <span className="text-muted-foreground block mt-0.5">
                    • <strong>Mastery (M):</strong> Roll 2d20, choose highest. Passive +5.
                  </span>
                  <span className="text-muted-foreground block">
                    • <strong>High Mastery (HM):</strong> Roll 2d20 (choose highest), can reroll lowest die. Passive +10.
                  </span>
                  <span className="text-muted-foreground block">
                    • <strong>Grand Mastery (GM):</strong> Roll 2d20 (choose highest), can reroll either or both dice. Passive +15.
                  </span>
                </div>
              )}

              {scanState === "manual" && !isBlinded && (
                <form onSubmit={handleManualScanSubmit} className="rounded border border-cyan-neon/50 bg-cyan-neon/10 p-3.5 text-xs flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-cyan-neon/30 pb-2">
                    <span className="font-bold text-cyan-neon uppercase tracking-wider">
                      Manual Scan Total Entry
                    </span>
                    <span className="text-muted-foreground text-[11px]">Enter total roll including modifiers:</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={manualScanInput}
                      onChange={(e) => setManualScanInput(e.target.value)}
                      placeholder={`e.g. 18 (Skill Mod: +${calculatedScanSkill})`}
                      className="flex-1 rounded bg-black/80 border border-cyan-neon/40 px-3 py-2 text-cyan-neon font-mono text-xs focus:outline-none focus:border-cyan-neon"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!manualScanInput.trim()}
                      className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-4 py-2 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 disabled:opacity-50 transition-colors cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                    >
                      Apply Total
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground italic">
                    Entering your physical dice total automatically checks revealed sector contacts against their scan DCs.
                  </span>
                </form>
              )}

              {scanState === "choice" && !isBlinded && (isMasteryScan || hasScannerRenowned) && (
                <div className="rounded border border-cyan-neon/50 bg-cyan-neon/10 p-3.5 text-xs flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-cyan-neon/30 pb-2">
                    <span className="font-bold text-cyan-neon uppercase tracking-wider">
                      {isGrandMasteryScan ? "Grand Mastery Active Scan (GM)" : isHighMasteryScan ? "High Mastery Active Scan (HM)" : "Scanner Advantage (Renowned)"}
                    </span>
                    <span className="text-muted-foreground text-[11px]">Review Rolled Dice Values:</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className="rounded bg-black/60 border border-cyan-neon/40 px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Die 1</span>
                      <span className="text-lg font-bold text-cyan-neon font-mono">{scanDice[0]}</span>
                    </div>
                    <div className="rounded bg-black/60 border border-cyan-neon/40 px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Die 2</span>
                      <span className="text-lg font-bold text-cyan-neon font-mono">{scanDice[1]}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end pt-1">
                    {isHighMasteryScan && (
                      <button
                        onClick={handleHighMasteryScanRerollLowest}
                        className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-3 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 transition-colors cursor-pointer"
                      >
                        Reroll Lowest Die
                      </button>
                    )}
                    {isGrandMasteryScan && (
                      <>
                        <button
                          onClick={() => handleGrandMasteryScanRerollSpecific(0, "Grand Mastery (GM - Rerolled Die 1)")}
                          className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-3 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 transition-colors cursor-pointer"
                        >
                          Reroll Die 1 ({scanDice[0]})
                        </button>
                        <button
                          onClick={() => handleGrandMasteryScanRerollSpecific(1, "Grand Mastery (GM - Rerolled Die 2)")}
                          className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-3 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 transition-colors cursor-pointer"
                        >
                          Reroll Die 2 ({scanDice[1]})
                        </button>
                        <button
                          onClick={handleGrandMasteryScanRerollBoth}
                          className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-3 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 transition-colors cursor-pointer"
                        >
                          Reroll Both Dice
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleKeepCurrentScanDice(isGrandMasteryScan ? "Grand Mastery (GM - Kept Roll)" : isHighMasteryScan ? "High Mastery (HM - Kept Roll)" : "Advantage (Renowned Scanner)")}
                      className="rounded bg-amber-400/20 border border-amber-400/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/30 transition-colors cursor-pointer"
                    >
                      Keep &amp; Finalize ({Math.max(scanDice[0], scanDice[1])})
                    </button>
                  </div>
                </div>
              )}

              {scanState === "reroll_preview" && !isBlinded && (isMasteryScan || hasScannerRenowned) && (
                <div className="rounded border border-cyan-neon/50 bg-cyan-neon/10 p-3.5 text-xs flex flex-col gap-3 animate-pulse">
                  <div className="flex justify-between items-center border-b border-cyan-neon/30 pb-2">
                    <span className="font-bold text-cyan-neon uppercase tracking-wider">
                      Reroll Preview ({scanRerollLabel})
                    </span>
                    <span className="text-muted-foreground text-[11px]">Updated Dice Values:</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className="rounded bg-black/60 border border-cyan-neon/40 px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Die 1</span>
                      <span className="text-lg font-bold text-cyan-neon font-mono">{scanDice[0]}</span>
                    </div>
                    <div className="rounded bg-black/60 border border-cyan-neon/40 px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Die 2</span>
                      <span className="text-lg font-bold text-cyan-neon font-mono">{scanDice[1]}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-muted-foreground italic">
                      Highest Resulting Die: <strong className="text-cyan-neon font-mono text-xs">{Math.max(scanDice[0], scanDice[1])}</strong>
                    </span>
                    <button
                      onClick={handleFinalizeScanReroll}
                      className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-4 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/35 transition-colors cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                    >
                      Finalize Reroll ({Math.max(scanDice[0], scanDice[1])} + {calculatedScanSkill})
                    </button>
                  </div>
                </div>
              )}

              {scanState === "done" && lastRollResult && !isBlinded && (
                <div className="rounded border border-cyan-neon/30 bg-cyan-neon/5 p-3 text-xs flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Scan Roll Result:</span>
                    <span className="font-bold text-cyan-neon font-mono">
                      {lastRollResult.tierUsed === "Manual Physical Dice Roll" 
                        ? `Manual Total = ${lastRollResult.total}`
                        : `d20 (${lastRollResult.roll}) + ${calculatedScanSkill} = ${lastRollResult.total}`}
                    </span>
                  </div>
                  {(isMasteryScan || hasScannerRenowned) && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Resolution Tier:</span>
                      <span className="font-bold text-amber-300">{lastRollResult.tierUsed}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Contacts Uncovered:</span>
                    <span className="font-bold text-amber-300">
                      {lastRollResult.discoveredCount > 0 
                        ? `${lastRollResult.discoveredCount} new signal(s) identified!` 
                        : "No new signals met threshold criteria."}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-cyan-neon/20">
                    <span className="text-[10px] text-muted-foreground/80 italic">
                      Active scan completed successfully.
                    </span>
                    <button
                      onClick={() => setScanState("idle")}
                      className="text-[10px] text-cyan-neon underline hover:text-cyan-300 cursor-pointer"
                    >
                      Reset Scan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Launch Probe Card */}
            <div className={`rounded-md border p-4 flex flex-col gap-4 transition-all ${
              isBlinded 
                ? "border-red-500/60 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                : "border-bridge-border/80 bg-black/40"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`relative flex h-12 w-12 items-center justify-center rounded-full border ${
                    isBlinded ? "border-red-500/60 bg-red-950/40" : "border-amber-400/40 bg-amber-400/5"
                  }`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`h-full w-[1px] ${isBlinded ? "bg-red-500/30" : "bg-amber-400/20"}`}></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`h-[1px] w-full ${isBlinded ? "bg-red-500/30" : "bg-amber-400/20"}`}></div>
                    </div>
                    
                    <div className={`h-2 w-2 rounded-full ${
                      isBlinded 
                        ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-ping" 
                        : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                    }`}></div>

                    {activeProbe && !isBlinded && (
                      <div className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-75"></div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold tracking-wider uppercase ${isBlinded ? "text-red-400" : "text-amber-400"}`}>
                        {isBlinded ? "PROBE LAUNCH TUBE [LOCKED]" : "Launch Sensor Probe"}
                      </span>
                      {isMasteryProbe && probeMasteryBadge && !isBlinded && (
                        <span className="rounded bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300">
                          {probeMasteryBadge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {isBlinded ? (
                        <span className="text-red-300/80 font-bold">Probe telemetry offline: Ship blinded</span>
                      ) : (
                        <>Roll: <strong>d20 + {calculatedProbeSkill}</strong> (Int Mod + Prof{isScout ? " + Scout" : ""})</>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLaunchProbe}
                  disabled={isBlinded || activeProbe || probeState === "choice" || probeState === "reroll_preview"}
                  className={`rounded px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-all border ${
                    isBlinded
                      ? "bg-red-950/60 border-red-500/60 text-red-400 cursor-not-allowed opacity-60"
                      : "bg-amber-400/10 text-amber-400 border border-amber-400/40 hover:bg-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.15)] cursor-pointer"
                  }`}
                >
                  {isBlinded ? "PROBE LAUNCH LOCKED" : activeProbe ? "DEPLOYING..." : "LAUNCH PROBE"}
                </button>
              </div>

              {isMasteryProbe && !isBlinded && (
                <div className="text-[10px] font-mono text-slate-300 bg-amber-950/20 border border-amber-400/20 rounded p-2">
                  <span className="text-amber-400 font-semibold block">Probe Skill Mastery Rules:</span>
                  <span className="text-muted-foreground block mt-0.5">
                    • <strong>Mastery (M):</strong> Roll 2d20, choose highest.
                  </span>
                  <span className="text-muted-foreground block">
                    • <strong>High Mastery (HM):</strong> Roll 2d20 (choose highest), can reroll lowest die.
                  </span>
                  <span className="text-muted-foreground block">
                    • <strong>Grand Mastery (GM):</strong> Roll 2d20 (choose highest), can reroll either or both dice.
                  </span>
                </div>
              )}

              {probeState === "choice" && !isBlinded && (isMasteryProbe || hasScannerRenowned) && (
                <div className="rounded border border-amber-400/50 bg-amber-400/10 p-3.5 text-xs flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-amber-400/30 pb-2">
                    <span className="font-bold text-amber-300 uppercase tracking-wider">
                      {isGrandMasteryProbe ? "Grand Mastery Probe Roll (GM)" : isHighMasteryProbe ? "High Mastery Probe Roll (HM)" : "Scanner Advantage (Renowned)"}
                    </span>
                    <span className="text-muted-foreground text-[11px]">Review Rolled Dice Values:</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className="rounded bg-black/60 border border-amber-400/40 px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Die 1</span>
                      <span className="text-lg font-bold text-amber-300 font-mono">{probeDice[0]}</span>
                    </div>
                    <div className="rounded bg-black/60 border border-amber-400/40 px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Die 2</span>
                      <span className="text-lg font-bold text-amber-300 font-mono">{probeDice[1]}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end pt-1">
                    {isHighMasteryProbe && (
                      <button
                        onClick={handleHighMasteryRerollLowest}
                        className="rounded bg-amber-500/20 border border-amber-400/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                      >
                        Reroll Lowest Die
                      </button>
                    )}
                    {isGrandMasteryProbe && (
                      <>
                        <button
                          onClick={() => handleGrandMasteryRerollSpecific(0, "Grand Mastery (GM - Rerolled Die 1)")}
                          className="rounded bg-amber-500/20 border border-amber-400/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                        >
                          Reroll Die 1 ({probeDice[0]})
                        </button>
                        <button
                          onClick={() => handleGrandMasteryRerollSpecific(1, "Grand Mastery (GM - Rerolled Die 2)")}
                          className="rounded bg-amber-500/20 border border-amber-400/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                        >
                          Reroll Die 2 ({probeDice[1]})
                        </button>
                        <button
                          onClick={handleGrandMasteryRerollBoth}
                          className="rounded bg-amber-500/20 border border-amber-400/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                        >
                          Reroll Both Dice
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleKeepCurrentDice(isGrandMasteryProbe ? "Grand Mastery (GM - Kept Roll)" : isHighMasteryProbe ? "High Mastery (HM - Kept Roll)" : "Advantage (Renowned Scanner)")}
                      className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-3 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 transition-colors cursor-pointer"
                    >
                      Keep &amp; Finalize ({Math.max(probeDice[0], probeDice[1])})
                    </button>
                  </div>
                </div>
              )}

              {probeState === "reroll_preview" && !isBlinded && (isMasteryProbe || hasScannerRenowned) && (
                <div className="rounded border border-cyan-neon/50 bg-cyan-neon/10 p-3.5 text-xs flex flex-col gap-3 animate-pulse">
                  <div className="flex justify-between items-center border-b border-cyan-neon/30 pb-2">
                    <span className="font-bold text-cyan-neon uppercase tracking-wider">
                      Reroll Preview ({rerollActionLabel})
                    </span>
                    <span className="text-muted-foreground text-[11px]">Updated Dice Values:</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className="rounded bg-black/60 border border-cyan-neon/40 px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Die 1</span>
                      <span className="text-lg font-bold text-cyan-neon font-mono">{probeDice[0]}</span>
                    </div>
                    <div className="rounded bg-black/60 border border-cyan-neon/40 px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Die 2</span>
                      <span className="text-lg font-bold text-cyan-neon font-mono">{probeDice[1]}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-muted-foreground italic">
                      Highest Resulting Die: <strong className="text-cyan-neon font-mono text-xs">{Math.max(probeDice[0], probeDice[1])}</strong>
                    </span>
                    <button
                      onClick={handleFinalizeReroll}
                      className="rounded bg-cyan-neon/20 border border-cyan-neon/60 px-4 py-1.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/35 transition-colors cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                    >
                      Finalize Reroll ({Math.max(probeDice[0], probeDice[1])} + {calculatedProbeSkill})
                    </button>
                  </div>
                </div>
              )}

              {probeState === "done" && probeFinalResult && !isBlinded && (
                <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Probe Deployment Result:</span>
                    <span className="font-bold text-amber-400 font-mono">
                      d20 ({probeFinalResult.roll}) + {calculatedProbeSkill} = {probeFinalResult.total}
                    </span>
                  </div>
                  {(isMasteryProbe || hasScannerRenowned) && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Resolution Tier:</span>
                      <span className="font-bold text-cyan-neon">{probeFinalResult.tierUsed}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-amber-400/20">
                    <span className="text-[10px] text-muted-foreground/80 italic">
                      Probe active in sector. Awaiting GM explanation.
                    </span>
                    <button
                      onClick={() => setProbeState("idle")}
                      className="text-[10px] text-amber-400 underline hover:text-amber-300 cursor-pointer"
                    >
                      Reset Probe
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: DETECTED SECTOR CONTACTS */}
          <div className={`flex flex-col gap-3 rounded-md border p-4 h-full transition-all ${
            isBlinded
              ? "border-red-500/60 bg-red-950/20"
              : "border-bridge-border/80 bg-black/40"
          }`}>
            <div className="flex items-center justify-between border-b border-bridge-border/60 pb-2">
              <span className={`text-xs font-bold tracking-wider uppercase flex items-center gap-2 ${
                isBlinded ? "text-red-400" : "text-cyan-neon"
              }`}>
                <span className={`h-2 w-2 rounded-full ${isBlinded ? "bg-red-500 animate-ping" : "bg-cyan-neon shadow-[0_0_6px_#00ffff]"}`} />
                {isBlinded ? "RADAR SIGNATURES JAMMED / BLINDED" : `Detected Sector Contacts (${contacts.filter(c => c.isRevealed).length})`}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                TELEMETRY RADAR
              </span>
            </div>
            
            {isBlinded ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-red-500/40 rounded bg-black/40">
                <AlertOctagon className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                <p className="text-xs font-mono font-bold text-red-300">
                  TACTICAL FEED SCRAMBLED // BLINDED
                </p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                  All active radar contacts are obscured. Clear the Blinded condition from the Defense station to re-establish tracking.
                </p>
              </div>
            ) : contacts.filter(c => c.isRevealed).length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-bridge-border/40 rounded bg-black/20">
                <Radio className="w-8 h-8 text-muted-foreground/40 mb-2 animate-pulse" />
                <p className="text-xs font-mono text-muted-foreground/80">
                  No contacts discovered in active range.
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  Run an Active Sensor Sweep or deploy a Probe to ping hidden sector anomalies.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {contacts.filter(c => c.isRevealed).map((contact) => (
                  <div key={contact.id} className="rounded border border-cyan-neon/40 bg-cyan-neon/5 p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-cyan-neon text-xs font-mono">{contact.name}</div>
                        <div className="text-[10px] text-muted-foreground flex gap-3 mt-0.5 font-mono">
                          <span>Type: <strong className="text-amber-300">{contact.classification}</strong></span>
                          <span>Range: <strong className="text-amber-300">{contact.distance}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-cyan-neon/10 border border-cyan-neon/30 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-neon">
                          DC {contact.scanDc}
                        </span>
                        {onRemoveContact && (
                          <button
                            onClick={() => setClearingContactId(contact.id)}
                            className="p-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Clear contact from sensors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {clearingContactId === contact.id && (
                      <div className="rounded bg-red-950/40 border border-red-500/50 p-2.5 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-red-200 font-medium">
                          Clear <strong className="text-white">{contact.name}</strong> from sensors?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setClearingContactId(null)}
                            className="rounded px-2.5 py-1 bg-black/60 border border-bridge-border text-muted-foreground hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              onRemoveContact?.(contact.id)
                              setClearingContactId(null)
                            }}
                            className="rounded px-2.5 py-1 bg-red-600 border border-red-500 text-white font-bold hover:bg-red-500 transition-colors cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. INSTALLED STATION MODIFICATIONS */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <h3 className="mb-3 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1">
          Installed Station Modifications
        </h3>
        <StationModifications 
          station="Sensors" 
          installedMods={installedMods} 
          onRemoveMod={onRemoveMod} 
        />
      </section>
    </div>
  )
}