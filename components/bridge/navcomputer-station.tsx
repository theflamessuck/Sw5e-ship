"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Panel } from "./panel"
import { StationModifications, Modification } from "./ship-modifications"
import { PLANETS_DATA } from "@/lib/planets-data"
import {
  calculateTravelTime,
  getPlanetsInSystem,
  getPlanetsInSector,
  type PlanetRecord,
  type GalacticRegion,
} from "@/lib/travel-matrix"
import { Rocket, Clock, CheckCircle2, Navigation, Compass } from "lucide-react"

export interface JourneyData {
  origin: string
  originRegion?: string
  destination: string
  destinationRegion?: string
  laneName: string
  startDay: number
  totalDays: number
  elapsedDays?: number
}

interface NavcomputerStationProps {
  astrogationAdvantage?: "advantage" | "disadvantage" | "normal"
  astrogationSkillMod?: number
  currentDay?: number
  lastAstrogationSyncDay?: number
  activeJourney?: JourneyData | null
  onBackToEngines?: () => void
  onStartJourney?: (journey: JourneyData) => void
  onCancelJourney?: () => void
  onArriveAtDestination?: () => void
  onEmergencyDropOut?: (region: string) => void
  currentLocationPlanet?: string
  onUpdateCurrentLocationPlanet?: (planetName: string) => void
  targetDestinationPlanet?: string
  onUpdateTargetDestinationPlanet?: (planetName: string) => void
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
}

const ALL_REGIONS: GalacticRegion[] = [
  "Deep Core",
  "Core Worlds",
  "Colonies",
  "Inner Rim Territories",
  "Expansion Region",
  "Mid Rim Territories",
  "Outer Rim Territories",
  "Wild Space",
  "Unknown Regions",
  "Extragalactic",
]

export function NavcomputerStation({
  astrogationAdvantage = "normal",
  astrogationSkillMod = 8,
  currentDay = 42,
  lastAstrogationSyncDay = 0,
  activeJourney = null,
  onBackToEngines,
  onStartJourney,
  onCancelJourney,
  onArriveAtDestination,
  onEmergencyDropOut,
  currentLocationPlanet = "Corellia",
  onUpdateCurrentLocationPlanet,
  targetDestinationPlanet = "",
  onUpdateTargetDestinationPlanet,
  installedMods = [],
  onRemoveMod,
}: NavcomputerStationProps) {
  // -------------------------------------------------------------
  // 1. HYPERDRIVE DETECTION & CLASS EXTRACTION
  // -------------------------------------------------------------
  const installedHyperdrive = useMemo(() => {
    return installedMods?.find((mod) => {
      const name = mod?.name?.toLowerCase() || ""
      const type = (mod as any)?.type?.toLowerCase() || ""
      const category = (mod as any)?.category?.toLowerCase() || ""
      return (
        name.includes("hyperdrive") ||
        type.includes("hyperdrive") ||
        category.includes("hyperdrive")
      )
    })
  }, [installedMods])

  const installedBackupHyperdrive = useMemo(() => {
    return installedMods?.find((mod) =>
      mod?.name?.toLowerCase().includes("backup hyperdrive")
    )
  }, [installedMods])

  const hasPrimaryHyperdrive = Boolean(installedHyperdrive)
  const hasBackupHyperdrive = Boolean(installedBackupHyperdrive)
  const hasHyperdrive = hasPrimaryHyperdrive || hasBackupHyperdrive

  const primaryClass = useMemo(() => {
    if (!installedHyperdrive) return 1.0
    const match = installedHyperdrive.name.match(/class\s*([0-9]+(?:\.[0-9]+)?)/i)
    if (match) {
      return parseFloat(match[1])
    }
    return 1.0
  }, [installedHyperdrive])

  const [useBackupHyperdrive, setUseBackupHyperdrive] = useState<boolean>(false)
  const [activeHyperdriveClass, setActiveHyperdriveClass] = useState<number>(primaryClass)

  useEffect(() => {
    if (!hasBackupHyperdrive && useBackupHyperdrive) {
      setUseBackupHyperdrive(false)
    }
  }, [hasBackupHyperdrive, useBackupHyperdrive])

  useEffect(() => {
    if (useBackupHyperdrive && hasBackupHyperdrive) {
      setActiveHyperdriveClass(15.0)
    } else {
      setActiveHyperdriveClass(primaryClass)
    }
  }, [useBackupHyperdrive, hasBackupHyperdrive, primaryClass])

  // -------------------------------------------------------------
  // 2. PLANET SELECTION & ELEVATED STATE SYNC
  // -------------------------------------------------------------
  const [originSearch, setOriginSearch] = useState<string>(currentLocationPlanet)
  const [selectedOrigin, setSelectedOrigin] = useState<PlanetRecord | null>(() => {
    return (
      PLANETS_DATA.find((p) => p.name.toLowerCase() === currentLocationPlanet.toLowerCase()) ||
      PLANETS_DATA[0]
    )
  })
  const [isOriginDropdownOpen, setIsOriginDropdownOpen] = useState<boolean>(false)

  const [destSearch, setDestSearch] = useState<string>(targetDestinationPlanet)
  const [selectedDest, setSelectedDest] = useState<PlanetRecord | null>(() => {
    if (!targetDestinationPlanet) return null
    return (
      PLANETS_DATA.find((p) => p.name.toLowerCase() === targetDestinationPlanet.toLowerCase()) || null
    )
  })
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState<boolean>(false)

  const originInputRef = useRef<HTMLDivElement>(null)
  const destInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentLocationPlanet) {
      setOriginSearch(currentLocationPlanet)
      const found = PLANETS_DATA.find(
        (p) => p.name.toLowerCase() === currentLocationPlanet.toLowerCase()
      )
      if (found) setSelectedOrigin(found)
    }
  }, [currentLocationPlanet])

  useEffect(() => {
    setDestSearch(targetDestinationPlanet)
    if (targetDestinationPlanet) {
      const found = PLANETS_DATA.find(
        (p) => p.name.toLowerCase() === targetDestinationPlanet.toLowerCase()
      )
      setSelectedDest(found || null)
    } else {
      setSelectedDest(null)
    }
  }, [targetDestinationPlanet])

  const filteredOriginPlanets = useMemo(() => {
    if (!originSearch.trim()) return PLANETS_DATA.slice(0, 40)
    const q = originSearch.toLowerCase()
    return PLANETS_DATA.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 40)
  }, [originSearch])

  const filteredDestPlanets = useMemo(() => {
    if (!destSearch.trim()) return PLANETS_DATA.slice(0, 40)
    const q = destSearch.toLowerCase()
    return PLANETS_DATA.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 40)
  }, [destSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (originInputRef.current && !originInputRef.current.contains(e.target as Node)) {
        setIsOriginDropdownOpen(false)
      }
      if (destInputRef.current && !destInputRef.current.contains(e.target as Node)) {
        setIsDestDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // -------------------------------------------------------------
  // 3. INTRA-SYSTEM SUBLIGHT FLIGHT (1d12 HOURS REALSPACE)
  // -------------------------------------------------------------
  // Cache stores bidirectional planetary leg durations: e.g. "Corellia:Selonia" -> 5
  const [systemTransitCache, setSystemTransitCache] = useState<Record<string, number>>({})
  const [sublightArrivalLog, setSublightArrivalLog] = useState<string | null>(null)

  const isIntraSystemFlight = useMemo(() => {
    if (!selectedOrigin || !selectedDest) return false
    if (selectedOrigin.name.toLowerCase() === selectedDest.name.toLowerCase()) return false
    return (
      Boolean(selectedOrigin.system) &&
      Boolean(selectedDest.system) &&
      selectedOrigin.system.trim().toLowerCase() === selectedDest.system.trim().toLowerCase()
    )
  }, [selectedOrigin, selectedDest])

  // Get or roll the 1d12 sublight hours for this route
  const sublightDurationHours = useMemo(() => {
    if (!isIntraSystemFlight || !selectedOrigin || !selectedDest) return null

    const p1 = selectedOrigin.name.toLowerCase()
    const p2 = selectedDest.name.toLowerCase()
    const legKey = [p1, p2].sort().join(":")

    if (systemTransitCache[legKey]) {
      return systemTransitCache[legKey]
    }

    // Roll fresh 1d12
    const rolledHours = Math.floor(Math.random() * 12) + 1
    setSystemTransitCache((prev) => ({
      ...prev,
      [legKey]: rolledHours,
    }))
    return rolledHours
  }, [isIntraSystemFlight, selectedOrigin, selectedDest, systemTransitCache])

  const handleEngageSublightThrusters = () => {
    if (!selectedDest || !sublightDurationHours) return

    const destName = selectedDest.name
    const hours = sublightDurationHours

    // Update location directly
    onUpdateCurrentLocationPlanet?.(destName)
    onUpdateTargetDestinationPlanet?.("")
    setSelectedDest(null)
    setDestSearch("")

    setSublightArrivalLog(
      `Arrived at ${destName}! Sublight transit completed in ${hours} hour${hours > 1 ? "s" : ""} via realspace thrusters.`
    )

    setEquationsCompleted(0)
    setLastRollResult(null)
    setJumpResult(null)
  }

  // -------------------------------------------------------------
  // 4. SYSTEM & SECTOR DIRECTORY MODAL
  // -------------------------------------------------------------
  const [directoryModal, setDirectoryModal] = useState<{
    open: boolean
    title: string
    scope: "system" | "sector"
    planets: PlanetRecord[]
  }>({
    open: false,
    title: "",
    scope: "system",
    planets: [],
  })

  const handleOpenSystemDirectory = () => {
    if (!selectedOrigin) return
    const list = getPlanetsInSystem(selectedOrigin, PLANETS_DATA)
    setDirectoryModal({
      open: true,
      title: `Planets in ${selectedOrigin.system}`,
      scope: "system",
      planets: list,
    })
  }

  const handleOpenSectorDirectory = () => {
    if (!selectedOrigin) return
    const list = getPlanetsInSector(selectedOrigin, PLANETS_DATA)
    setDirectoryModal({
      open: true,
      title: `Planets in ${selectedOrigin.sector}`,
      scope: "sector",
      planets: list,
    })
  }

  const handleSelectFromDirectory = (planet: PlanetRecord) => {
    setSelectedDest(planet)
    setDestSearch(planet.name)
    onUpdateTargetDestinationPlanet?.(planet.name)
    setDirectoryModal((prev) => ({ ...prev, open: false }))
  }

  // -------------------------------------------------------------
  // 5. MID-TRIP REROUTE PROMPT (ASK DM REGION)
  // -------------------------------------------------------------
  const [rerouteModalOpen, setRerouteModalOpen] = useState<boolean>(false)
  const [selectedRerouteRegion, setSelectedRerouteRegion] = useState<GalacticRegion>("Outer Rim Territories")

  const handleConfirmReroute = () => {
    if (!selectedRerouteRegion) return

    if (onEmergencyDropOut) {
      onEmergencyDropOut(selectedRerouteRegion)
    } else {
      onCancelJourney?.()
      const syntheticOriginName = `Deep Space (${selectedRerouteRegion})`
      const deepSpaceRecord: PlanetRecord = {
        name: syntheticOriginName,
        region: selectedRerouteRegion,
        sector: "Transit Corridor",
        system: "Interstellar Space",
        inhabitants: "None",
        capitalCity: "None",
        gridCoordinates: "Unknown",
      }
      setSelectedOrigin(deepSpaceRecord)
      setOriginSearch(syntheticOriginName)
      onUpdateCurrentLocationPlanet?.(syntheticOriginName)
      setSelectedDest(null)
      setDestSearch("")
      onUpdateTargetDestinationPlanet?.("")
    }

    setRerouteModalOpen(false)
    setEquationsCompleted(0)
    setJumpResult({
      type: "success",
      message: `Emergency exit verified. Vessel positioned in ${selectedRerouteRegion}. Ready to plot new trajectory.`,
    })
  }

  // -------------------------------------------------------------
  // 6. CALCULATION & MATRIX DURATION
  // -------------------------------------------------------------
  const [modifierChoice, setModifierChoice] = useState<number>(0)
  const [equationsCompleted, setEquationsCompleted] = useState<number>(0)
  const targetEquations = 10

  const [customRollInput, setCustomRollInput] = useState<string>("")
  const [lastRollResult, setLastRollResult] = useState<{
    d20: number | null
    d20_rolls?: [number, number] | null
    rollType: "advantage" | "disadvantage" | "normal"
    skillMod: number
    parameterMod: number
    total: number
    successesGained: number
    tierLabel: string
  } | null>(null)

  const [jumpResult, setJumpResult] = useState<{
    type: "success" | "mishap" | "error"
    roll?: number
    mod?: number
    total?: number
    message: string
  } | null>(null)

  const totalAstrogationMod = astrogationSkillMod + modifierChoice

  const travelDuration = useMemo(() => {
    if (!selectedOrigin || !selectedDest || isIntraSystemFlight) return null

    const baseResult = calculateTravelTime(
      selectedOrigin.region,
      selectedDest.region,
      activeHyperdriveClass
    )

    if (baseResult.isUnknown || baseResult.totalHours === null) {
      return baseResult
    }

    let adjustedHours = baseResult.totalHours
    if (modifierChoice === -5) {
      adjustedHours = adjustedHours <= 24 ? Math.max(1, Math.floor(adjustedHours / 2)) : Math.max(1, adjustedHours - 24)
    } else if (modifierChoice === 5) {
      adjustedHours = adjustedHours * 2
    }

    adjustedHours = Math.round(adjustedHours * 10) / 10
    const days = Math.round((adjustedHours / 24) * 10) / 10
    const weeks = Math.round((days / 7) * 100) / 100

    return {
      isUnknown: false,
      baseHours: baseResult.baseHours,
      totalHours: adjustedHours,
      days,
      weeks,
      displayHours: `${adjustedHours} hrs`,
      displayDays: `${days} days`,
      displayWeeks: `${weeks} wks`,
      combinedDisplay: `${adjustedHours} Hours (${days} Days / ${weeks} Weeks)`,
    }
  }, [selectedOrigin, selectedDest, isIntraSystemFlight, activeHyperdriveClass, modifierChoice])

  // -------------------------------------------------------------
  // 7. ASTROGATION ROLL RESOLUTION
  // -------------------------------------------------------------
  const evaluateRoll = (total: number) => {
    if (total >= 30) return { successes: 5, label: "PERFECT (+5 Equations)" }
    if (total >= 26) return { successes: 4, label: "MASTERFUL (+4 Equations)" }
    if (total >= 21) return { successes: 3, label: "EXCELLENT (+3 Equations)" }
    if (total >= 16) return { successes: 2, label: "BREAKTHROUGH (+2 Equations)" }
    if (total >= 10) return { successes: 1, label: "ADEQUATE (+1 Equation)" }
    return { successes: 0, label: "FAILURE (0 Equations)" }
  }

  const handlePerformCheck = () => {
    if (!selectedOrigin || !selectedDest || isIntraSystemFlight) return

    let finalD20 = Math.floor(Math.random() * 20) + 1
    let rolledPair: [number, number] | null = null

    if (astrogationAdvantage === "advantage") {
      const rollA = Math.floor(Math.random() * 20) + 1
      const rollB = Math.floor(Math.random() * 20) + 1
      rolledPair = [rollA, rollB]
      finalD20 = Math.max(rollA, rollB)
    } else if (astrogationAdvantage === "disadvantage") {
      const rollA = Math.floor(Math.random() * 20) + 1
      const rollB = Math.floor(Math.random() * 20) + 1
      rolledPair = [rollA, rollB]
      finalD20 = Math.min(rollA, rollB)
    }

    const total = finalD20 + astrogationSkillMod + modifierChoice
    const evaluation = evaluateRoll(total)

    setLastRollResult({
      d20: finalD20,
      d20_rolls: rolledPair,
      rollType: astrogationAdvantage,
      skillMod: astrogationSkillMod,
      parameterMod: modifierChoice,
      total,
      successesGained: evaluation.successes,
      tierLabel: evaluation.label,
    })

    setEquationsCompleted((prev) => Math.min(targetEquations, prev + evaluation.successes))
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrigin || !selectedDest || isIntraSystemFlight) return

    const parsedTotal = parseInt(customRollInput, 10)
    if (!isNaN(parsedTotal)) {
      const evaluation = evaluateRoll(parsedTotal)

      setLastRollResult({
        d20: null,
        d20_rolls: null,
        rollType: astrogationAdvantage,
        skillMod: astrogationSkillMod,
        parameterMod: modifierChoice,
        total: parsedTotal,
        successesGained: evaluation.successes,
        tierLabel: evaluation.label,
      })

      setEquationsCompleted((prev) => Math.min(targetEquations, prev + evaluation.successes))
      setCustomRollInput("")
    }
  }

  const handleResetComputer = () => {
    setEquationsCompleted(0)
    setLastRollResult(null)
    setJumpResult(null)
  }

  // -------------------------------------------------------------
  // 8. ENGAGE HYPERDRIVE & ARRIVAL DROP-OUT
  // -------------------------------------------------------------
  const handleEngageHyperdrive = () => {
    if (!hasHyperdrive) {
      setJumpResult({
        type: "error",
        message: "Engagement Aborted: No functional hyperdrive module detected on this vessel. Install or repair hyperdrive before jumping.",
      })
      return
    }

    if (!selectedOrigin || !selectedDest) {
      setJumpResult({
        type: "error",
        message: "Engagement Aborted: Origin and Destination vectors must be established.",
      })
      return
    }

    if (equationsCompleted >= targetEquations) {
      setJumpResult({
        type: "success",
        message: `Hyperdrive jump sequence executed cleanly. Entering hyperspace vector: ${selectedOrigin.name} → ${selectedDest.name}.`,
      })

      if (onStartJourney) {
        const totalDays = travelDuration?.days ? Math.max(1, Math.ceil(travelDuration.days)) : 3
        onStartJourney({
          origin: selectedOrigin.name,
          originRegion: selectedOrigin.region,
          destination: selectedDest.name,
          destinationRegion: selectedDest.region,
          laneName: `${selectedOrigin.region} to ${selectedDest.region} Corridor`,
          startDay: currentDay,
          totalDays: totalDays,
        })
      }
    } else {
      const d20 = Math.floor(Math.random() * 20) + 1
      const total = d20 + equationsCompleted
      let message = ""

      if (total <= 2) {
        message = "Catastrophic failure: Hyperdrive rendered unusable until refitted."
      } else if (total <= 5) {
        message = "Debris collision: Hull takes 1/10 max HP damage; shields regenerate at half rate."
      } else if (total <= 8) {
        message = "Gravity warp: Ship's structural integrity strained. AC reduced by 2."
      } else if (total <= 11) {
        message = "Gravity field: Unexpected stress. Maneuver checks made with disadvantage."
      } else if (total <= 14) {
        message = "Supernova radiation: Computer systems overloaded. Intelligence checks have disadvantage."
      } else if (total <= 17) {
        message = "Dust cloud: Sensors clogged. Scan and Probe checks made with disadvantage."
      } else if (total <= 19) {
        message = "Dumped cargo alarm: DC 15 Constitution save required."
      } else {
        message = "Narrow escape! The ship suffers no adverse consequences despite incomplete calculations."
      }

      setJumpResult({
        type: "mishap",
        roll: d20,
        mod: equationsCompleted,
        total,
        message,
      })
    }
  }

  const handleArriveAndDropOut = () => {
    if (!activeJourney) return

    if (onArriveAtDestination) {
      onArriveAtDestination()
    } else {
      onCancelJourney?.()
      onUpdateCurrentLocationPlanet?.(activeJourney.destination)
      onUpdateTargetDestinationPlanet?.("")
    }

    setEquationsCompleted(0)
    setLastRollResult(null)
    setJumpResult({
      type: "success",
      message: `Re-entered realspace at ${activeJourney.destination}. Sublight drives engaged. Coordinates updated.`,
    })
  }

  const daysElapsed = activeJourney ? Math.max(0, currentDay - activeJourney.startDay) : 0
  const isArrived = activeJourney ? daysElapsed >= activeJourney.totalDays : false
  const progressPercent = activeJourney
    ? Math.min(100, Math.round((daysElapsed / activeJourney.totalDays) * 100))
    : 0

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-bridge-border pb-3 gap-3">
        <div>
          <h2 className="text-glow-cyan text-lg font-bold tracking-[0.15em] text-cyan-neon">
            NAVCOMPUTER &amp; ASTROGATION TERMINAL
          </h2>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground/60">
            HYPERSPACE ROUTING // 1,315 PLANETARY SYSTEMS // CAMPAIGN DAY: {currentDay}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasHyperdrive ? (
            <div className="flex items-center gap-2 rounded border border-emerald-500/50 bg-emerald-950/30 px-3 py-1 font-mono text-[9px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span className="font-bold uppercase tracking-wider">
                {useBackupHyperdrive
                  ? "BACKUP HYPERDRIVE (CLASS 15.0)"
                  : `${installedHyperdrive?.name || "PRIMARY HYPERDRIVE"} (CLASS ${activeHyperdriveClass})`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded border border-red-500/60 bg-red-950/40 px-3 py-1 font-mono text-[9px] text-red-300 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <span className="font-bold uppercase tracking-wider">NO HYPERDRIVE DETECTED</span>
            </div>
          )}

          {hasBackupHyperdrive && (
            <button
              type="button"
              onClick={() => setUseBackupHyperdrive((prev) => !prev)}
              className={`rounded px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider uppercase border transition-colors cursor-pointer ${
                useBackupHyperdrive
                  ? "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                  : "border-bridge-border bg-black/40 text-muted-foreground hover:text-cyan-neon"
              }`}
              title="Toggle between Primary installed drive and Emergency Class 15 Backup drive"
            >
              {useBackupHyperdrive ? "USING BACKUP (CLASS 15)" : "SWITCH TO BACKUP DRIVE"}
            </button>
          )}

          <div className="flex items-center gap-2 rounded border border-cyan-neon/60 bg-cyan-neon/10 px-3 py-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Astrogation Mod:</span>
            <span className="text-xs font-bold font-mono text-cyan-neon text-glow-cyan">
              {totalAstrogationMod >= 0 ? `+${totalAstrogationMod}` : totalAstrogationMod}
            </span>
          </div>

          <span
            className={`text-[9px] font-bold px-2.5 py-1 rounded border uppercase font-mono tracking-wider ${
              astrogationAdvantage === "advantage"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                : astrogationAdvantage === "disadvantage"
                ? "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse"
                : "bg-cyan-neon/10 text-cyan-neon border-cyan-neon/40"
            }`}
          >
            DATA: {astrogationAdvantage.toUpperCase()}
          </span>

          {onBackToEngines && (
            <button
              onClick={onBackToEngines}
              className="rounded border border-cyan-neon/40 bg-cyan-neon/10 px-3 py-1 text-[10px] font-bold text-cyan-neon hover:bg-cyan-neon/20 tracking-wider cursor-pointer"
            >
              &larr; ENGINES
            </button>
          )}
        </div>
      </div>

      {/* SUBLIGHT ARRIVAL BANNER */}
      {sublightArrivalLog && (
        <section className="rounded-md border border-emerald-500/60 bg-emerald-950/30 p-3 shadow-[0_0_15px_rgba(52,211,153,0.2)] flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2.5 text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{sublightArrivalLog}</span>
          </div>
          <button
            type="button"
            onClick={() => setSublightArrivalLog(null)}
            className="text-slate-400 hover:text-white uppercase font-bold text-[10px] cursor-pointer"
          >
            Dismiss
          </button>
        </section>
      )}

      {/* NO HYPERDRIVE WARNING */}
      {!hasHyperdrive && !isIntraSystemFlight && (
        <section className="rounded-md border border-red-500/60 bg-red-950/30 p-3.5 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-red-300">
              CRITICAL HARDWARE WARNING: HYPERDRIVE OFFLINE / NOT INSTALLED
            </h4>
          </div>
          <p className="mt-1.5 text-[11px] font-mono text-slate-300 leading-relaxed">
            This vessel is not currently fitted with an operational hyperdrive. Trajectory routes can still be simulated, but hyperdrive jump sequences cannot be engaged until a drive is installed.
          </p>
        </section>
      )}

      {/* ROUTE CALCULATOR & PLANET SELECTOR */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 border-b border-bridge-border/60 pb-2 gap-2">
          <div>
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
              Route Planner
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Select origin and destination planets to calculate region-to-region travel duration adjusted for hyperdrive class.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[9px]">
            <span className="text-muted-foreground uppercase">Flight Regime:</span>
            <span className={`rounded border px-2 py-0.5 font-bold uppercase ${
              isIntraSystemFlight
                ? "border-emerald-400/60 bg-emerald-950/40 text-emerald-300"
                : "border-amber-400/40 bg-amber-500/10 text-amber-300"
            }`}>
              {isIntraSystemFlight ? "Sublight (Intra-System)" : `Class ${activeHyperdriveClass} Hyperdrive`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ORIGIN SELECTION */}
          <div className="flex flex-col gap-2 rounded border border-bridge-border/60 bg-black/40 p-3" ref={originInputRef}>
            <div className="flex items-center justify-between border-b border-bridge-border/40 pb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-cyan-neon">1. Origin Planet</span>
              {selectedOrigin && (
                <span className="text-[9px] font-mono text-emerald-400 uppercase font-semibold">
                  Grid: {selectedOrigin.gridCoordinates}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={originSearch}
                onChange={(e) => {
                  setOriginSearch(e.target.value)
                  setIsOriginDropdownOpen(true)
                }}
                onFocus={() => setIsOriginDropdownOpen(true)}
                placeholder="Type origin planet..."
                className="w-full rounded border border-bridge-border bg-black px-3 py-1.5 text-xs font-mono text-cyan-neon focus:outline-none focus:border-cyan-neon"
              />
              {isOriginDropdownOpen && filteredOriginPlanets.length > 0 && (
                <ul className="absolute top-full left-0 z-50 mt-1 max-h-56 w-full overflow-y-auto rounded border border-cyan-neon/40 bg-black/95 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                  {filteredOriginPlanets.map((planet) => (
                    <li
                      key={`${planet.name}-${planet.system}`}
                      onClick={() => {
                        setSelectedOrigin(planet)
                        setOriginSearch(planet.name)
                        onUpdateCurrentLocationPlanet?.(planet.name)
                        setIsOriginDropdownOpen(false)
                      }}
                      className="cursor-pointer px-3 py-1.5 text-xs font-mono text-slate-200 hover:bg-cyan-neon/20 hover:text-cyan-neon transition-colors border-b border-bridge-border/20 last:border-none flex justify-between items-center"
                    >
                      <span className="font-bold">{planet.name}</span>
                      <span className="text-[10px] text-muted-foreground">{planet.region} ({planet.gridCoordinates})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedOrigin && (
              <div className="mt-1 flex flex-col gap-1 text-[10px] font-mono text-slate-300 bg-black/50 p-2.5 rounded border border-bridge-border/40">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block">Region</span>
                    <strong className="text-amber-300 font-bold">{selectedOrigin.region}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block">Sector</span>
                    <strong className="text-cyan-300 font-bold">{selectedOrigin.sector}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block">System</span>
                    <strong className="text-white font-bold">{selectedOrigin.system}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block">Inhabitants</span>
                    <strong className="text-slate-300 font-bold">{selectedOrigin.inhabitants}</strong>
                  </div>
                </div>

                <div className="flex gap-2 mt-2 pt-2 border-t border-bridge-border/30">
                  <button
                    type="button"
                    onClick={handleOpenSystemDirectory}
                    className="flex-1 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 transition-colors uppercase cursor-pointer"
                  >
                    Planets in System
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenSectorDirectory}
                    className="flex-1 py-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 text-[9px] font-bold text-cyan-neon hover:bg-cyan-neon/20 transition-colors uppercase cursor-pointer"
                  >
                    Planets in Sector
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DESTINATION SELECTION */}
          <div className="flex flex-col gap-2 rounded border border-bridge-border/60 bg-black/40 p-3" ref={destInputRef}>
            <div className="flex items-center justify-between border-b border-bridge-border/40 pb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-300">2. Destination Planet</span>
              {selectedDest && (
                <span className="text-[9px] font-mono text-emerald-400 uppercase font-semibold">
                  Grid: {selectedDest.gridCoordinates}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={destSearch}
                onChange={(e) => {
                  setDestSearch(e.target.value)
                  setIsDestDropdownOpen(true)
                }}
                onFocus={() => setIsDestDropdownOpen(true)}
                placeholder="Type destination planet..."
                className="w-full rounded border border-bridge-border bg-black px-3 py-1.5 text-xs font-mono text-cyan-neon focus:outline-none focus:border-cyan-neon"
              />
              {isDestDropdownOpen && filteredDestPlanets.length > 0 && (
                <ul className="absolute top-full left-0 z-50 mt-1 max-h-56 w-full overflow-y-auto rounded border border-cyan-neon/40 bg-black/95 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                  {filteredDestPlanets.map((planet) => (
                    <li
                      key={`${planet.name}-${planet.system}`}
                      onClick={() => {
                        setSelectedDest(planet)
                        setDestSearch(planet.name)
                        onUpdateTargetDestinationPlanet?.(planet.name)
                        setIsDestDropdownOpen(false)
                      }}
                      className="cursor-pointer px-3 py-1.5 text-xs font-mono text-slate-200 hover:bg-cyan-neon/20 hover:text-cyan-neon transition-colors border-b border-bridge-border/20 last:border-none flex justify-between items-center"
                    >
                      <span className="font-bold">{planet.name}</span>
                      <span className="text-[10px] text-muted-foreground">{planet.region} ({planet.gridCoordinates})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedDest ? (
              <div className="mt-1 flex flex-col gap-1 text-[10px] font-mono text-slate-300 bg-black/50 p-2.5 rounded border border-bridge-border/40">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block">Region</span>
                    <strong className="text-amber-300 font-bold">{selectedDest.region}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block">Sector</span>
                    <strong className="text-cyan-300 font-bold">{selectedDest.sector}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block">System</span>
                    <strong className={isIntraSystemFlight ? "text-emerald-400 font-bold" : "text-white font-bold"}>
                      {selectedDest.system} {isIntraSystemFlight ? "(SAME SYSTEM)" : ""}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block">Capital City</span>
                    <strong className="text-slate-300 font-bold">{selectedDest.capitalCity}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-center p-6 text-center text-xs font-mono text-muted-foreground/60 border border-dashed border-bridge-border/40 rounded">
                SELECT A DESTINATION TO VIEW VECTOR TELEMETRY
              </div>
            )}
          </div>
        </div>

        {/* INTRA-SYSTEM SUBLIGHT CALLOUT OR FTL DURATION BREAKDOWN */}
        {selectedOrigin && selectedDest && (
          isIntraSystemFlight ? (
            <div className="mt-4 p-4 rounded bg-emerald-950/30 border border-emerald-500/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 font-mono shadow-[0_0_15px_rgba(52,211,153,0.15)]">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5" />
                  Intra-System Realspace Transit ({selectedOrigin.system} System)
                </span>
                <span className="text-sm font-bold text-white">
                  {selectedOrigin.name} &rarr; {selectedDest.name}
                </span>
                <p className="text-[10px] text-slate-300 mt-1">
                  Planets share the same solar system. Hyperdrive is not required; sublight thrusters can be engaged directly.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[9px] text-muted-foreground uppercase block">Sublight Flight Time</span>
                  <span className="text-base font-bold text-emerald-300 flex items-center gap-1 font-mono">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    {sublightDurationHours} Hour{sublightDurationHours && sublightDurationHours > 1 ? "s" : ""}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleEngageSublightThrusters}
                  className="px-5 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(52,211,153,0.4)] flex items-center gap-2 cursor-pointer"
                >
                  <Rocket className="h-4 w-4" />
                  Engage Thrusters (Instant Arrival)
                </button>
              </div>
            </div>
          ) : travelDuration ? (
            <div className="mt-4 p-3.5 rounded bg-black/70 border border-cyan-neon/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 font-mono">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">
                  Calculated Transit Trajectory ({selectedOrigin.region} &rarr; {selectedDest.region})
                </span>
                <span className="text-sm font-bold text-cyan-neon">
                  {selectedOrigin.name} &rarr; {selectedDest.name}
                </span>
              </div>

              {travelDuration.isUnknown ? (
                <div className="text-red-400 font-bold text-sm">
                  ⚠️ UNMAPPED OR EXTRAGALACTIC CORRIDOR (DURATION UNKNOWN)
                </div>
              ) : (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Hours</span>
                    <span className="text-sm font-bold text-cyan-neon">{travelDuration.displayHours}</span>
                  </div>
                  <div className="flex flex-col text-right border-l border-bridge-border/40 pl-3">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Days</span>
                    <span className="text-sm font-bold text-amber-300">{travelDuration.displayDays}</span>
                  </div>
                  <div className="flex flex-col text-right border-l border-bridge-border/40 pl-3">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Weeks</span>
                    <span className="text-sm font-bold text-emerald-400">{travelDuration.displayWeeks}</span>
                  </div>
                </div>
              )}
            </div>
          ) : null
        )}
      </section>

      {/* ACTIVE HYPERSPACE TRANSIT STATUS */}
      {activeJourney && (
        <section
          className={`rounded-md border p-4 font-mono ${
            isArrived
              ? "bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_15px_rgba(52,211,153,0.2)]"
              : "bg-cyan-950/20 border-cyan-neon/60 shadow-[0_0_15px_rgba(0,255,255,0.2)]"
          }`}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3 pb-3 border-b border-bridge-border/60">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    isArrived ? "bg-emerald-400 animate-ping" : "bg-cyan-neon animate-pulse"
                  }`}
                />
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">
                  {isArrived ? "Destination Vector Reached — Standing By for Drop-Out" : "Active Hyperspace Transit Vector"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {activeJourney.origin} &rarr; {activeJourney.destination}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({activeJourney.originRegion} &rarr; {activeJourney.destinationRegion})
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {isArrived ? (
                <button
                  onClick={handleArriveAndDropOut}
                  className="rounded border border-emerald-400 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 tracking-wider shadow-[0_0_15px_rgba(52,211,153,0.4)] animate-pulse cursor-pointer"
                >
                  EXIT HYPERSPACE (ARRIVE AT {activeJourney.destination.toUpperCase()})
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setRerouteModalOpen(true)}
                    className="rounded border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/20 tracking-wider cursor-pointer"
                  >
                    REROUTE MID-FLIGHT
                  </button>
                  <button
                    onClick={() => setRerouteModalOpen(true)}
                    className="rounded border border-red-500/60 bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30 tracking-wider cursor-pointer"
                  >
                    EMERGENCY DROP-OUT
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end text-xs">
              <div>
                <span className="text-muted-foreground">Transit Progress: </span>
                <strong className="text-cyan-neon font-bold">{progressPercent}%</strong>
                <span className="text-muted-foreground ml-2">
                  (Day {daysElapsed} of {activeJourney.totalDays} days elapsed)
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Started Day: </span>
                <span className="text-white font-bold">{activeJourney.startDay}</span>
                <span className="text-muted-foreground ml-2">Current Day: </span>
                <span className="text-amber-300 font-bold">{currentDay}</span>
              </div>
            </div>

            <div className="h-3 w-full bg-black/60 rounded-sm overflow-hidden border border-bridge-border/80">
              <div
                className={`h-full transition-all duration-300 ${
                  isArrived
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                    : "bg-cyan-neon shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* EQUATION COMPLETION & ENGAGE HYPERDRIVE (ONLY FOR INTERSTELLAR FTL) */}
      {!isIntraSystemFlight ? (
        <Panel title="Astrogation Calculation Status" code="NAV // EXECUTION">
          <div className="flex flex-col gap-4 p-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Calculated Navigation Equations
                    </span>
                    <span className="text-2xl font-bold font-mono text-cyan-neon">
                      {equationsCompleted} / {targetEquations}{" "}
                      {equationsCompleted >= targetEquations ? "— READY FOR JUMP!" : ""}
                    </span>
                  </div>
                  <button
                    onClick={handleResetComputer}
                    className="rounded border border-bridge-border bg-black/40 px-3 py-1 text-[10px] text-muted-foreground hover:text-red-400 hover:border-red-500/40 cursor-pointer"
                  >
                    RESET COMPUTER
                  </button>
                </div>

                <div className="h-3 w-full bg-slate-900 rounded-sm overflow-hidden border border-bridge-border/50">
                  <div
                    className={`h-full transition-all duration-300 ${
                      equationsCompleted >= targetEquations
                        ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                        : "bg-cyan-neon shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                    }`}
                    style={{ width: `${Math.min(100, (equationsCompleted / targetEquations) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="w-full md:w-auto">
                <button
                  onClick={handleEngageHyperdrive}
                  disabled={!hasHyperdrive || !selectedOrigin || !selectedDest}
                  title={!hasHyperdrive ? "No hyperdrive installed on this vessel" : undefined}
                  className={`w-full md:w-auto px-6 py-3 rounded border font-bold text-xs tracking-wider shadow-lg transition-all cursor-pointer ${
                    !hasHyperdrive || !selectedOrigin || !selectedDest
                      ? "border-red-500/40 bg-red-950/20 text-red-400/60 cursor-not-allowed opacity-60"
                      : equationsCompleted >= targetEquations
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.4)] animate-pulse"
                      : "border-amber-400/60 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                  }`}
                >
                  {!hasHyperdrive
                    ? "ENGAGE HYPERDRIVE (NO DRIVE DETECTED)"
                    : equationsCompleted >= targetEquations
                    ? "ENGAGE HYPERDRIVE (OPTIMAL VECTOR)"
                    : "ENGAGE HYPERDRIVE (INCOMPLETE EQUATIONS)"}
                </button>
              </div>
            </div>

            {jumpResult && (
              <div
                className={`mt-3 p-3 rounded border font-mono text-xs flex flex-col gap-1 ${
                  jumpResult.type === "success"
                    ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                    : jumpResult.type === "error"
                    ? "bg-red-950/50 border-red-500/80 text-red-200"
                    : "bg-red-950/40 border-red-500/60 text-red-300"
                }`}
              >
                <div className="flex justify-between items-center font-bold">
                  <span className="uppercase tracking-wider">
                    {jumpResult.type === "success"
                      ? "Hyperdrive Jump: Execution Successful"
                      : jumpResult.type === "error"
                      ? "Astrogation Terminal Error"
                      : "Hyperdrive Mishap Detected"}
                  </span>
                  {jumpResult.roll !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      Roll (d20: {jumpResult.roll}) + Equations ({jumpResult.mod}) ={" "}
                      <strong className="text-white">{jumpResult.total}</strong>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/90 mt-1">{jumpResult.message}</p>
              </div>
            )}
          </div>
        </Panel>
      ) : null}

      {/* ROUTING PARAMETERS & ROLL SIMULATOR (ONLY FOR INTERSTELLAR FTL) */}
      {!isIntraSystemFlight && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase mb-2 border-b border-bridge-border/60 pb-1">
                Routing Parameter Adjustments
              </h3>
              <p className="text-[10px] text-muted-foreground mb-3">
                Apply tactical modifiers to hasten travel time or secure safer astrogation calculations.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setModifierChoice(-5)}
                  className={`rounded border p-2 text-left flex flex-col justify-between transition-colors cursor-pointer ${
                    modifierChoice === -5
                      ? "border-amber-400 bg-amber-400/10 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                      : "border-bridge-border bg-black/40 text-muted-foreground hover:text-cyan-neon"
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold">Fast Travel</span>
                  <span className="text-xs font-mono font-bold text-amber-300">-5 Roll / -24h Time</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModifierChoice(0)}
                  className={`rounded border p-2 text-left flex flex-col justify-between transition-colors cursor-pointer ${
                    modifierChoice === 0
                      ? "border-cyan-neon bg-cyan-neon/10 text-cyan-neon shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                      : "border-bridge-border bg-black/40 text-muted-foreground hover:text-cyan-neon"
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold">Standard</span>
                  <span className="text-xs font-mono font-bold text-cyan-neon">+0 Roll / Normal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModifierChoice(5)}
                  className={`rounded border p-2 text-left flex flex-col justify-between transition-colors cursor-pointer ${
                    modifierChoice === 5
                      ? "border-emerald-400 bg-emerald-400/10 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                      : "border-bridge-border bg-black/40 text-muted-foreground hover:text-cyan-neon"
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold">Safe Route</span>
                  <span className="text-xs font-mono font-bold text-emerald-300">+5 Roll / 2x Time</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-bridge-border/40 text-[10px] text-muted-foreground font-mono">
              Calculation: Base Skill ({astrogationSkillMod >= 0 ? `+${astrogationSkillMod}` : astrogationSkillMod}){" "}
              {modifierChoice !== 0 && (
                <span className={modifierChoice > 0 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {modifierChoice > 0 ? `+ Safe Route (${modifierChoice})` : `- Fast Travel (${Math.abs(modifierChoice)})`}
                </span>
              )}{" "}
              = <strong className="text-cyan-neon font-bold text-xs">{totalAstrogationMod >= 0 ? `+${totalAstrogationMod}` : totalAstrogationMod}</strong>
            </div>
          </div>

          <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-bridge-border/60 pb-1 mb-2">
                <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                  Astrogation Calculator
                </h3>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    astrogationAdvantage === "advantage"
                      ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                      : astrogationAdvantage === "disadvantage"
                      ? "border-red-500/60 bg-red-500/20 text-red-300 animate-pulse"
                      : "border-cyan-neon/40 bg-cyan-neon/10 text-cyan-neon"
                  }`}
                >
                  {astrogationAdvantage === "advantage"
                    ? "Data: Advantage"
                    : astrogationAdvantage === "disadvantage"
                    ? "Data: Disadvantage"
                    : "Data: Current"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">
                Chart sync state applies <strong>{astrogationAdvantage.toUpperCase()}</strong>. Total modifier: {totalAstrogationMod >= 0 ? `+${totalAstrogationMod}` : totalAstrogationMod}.
              </p>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={handlePerformCheck}
                  disabled={equationsCompleted >= targetEquations || !selectedOrigin || !selectedDest}
                  className="flex-1 rounded border border-cyan-neon/60 bg-cyan-neon/20 py-2.5 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 disabled:opacity-40 tracking-wider shadow-[0_0_10px_rgba(0,255,255,0.2)] cursor-pointer"
                >
                  {!selectedOrigin || !selectedDest
                    ? "SET DESTINATION TO PLOT EQUATIONS"
                    : `ROLL ASTROGATION CHECK (${
                        astrogationAdvantage === "advantage"
                          ? "ADVANTAGE"
                          : astrogationAdvantage === "disadvantage"
                          ? "DISADVANTAGE"
                          : "NORMAL"
                      } ${totalAstrogationMod >= 0 ? `+${totalAstrogationMod}` : totalAstrogationMod})`}
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="number"
                  placeholder={!selectedOrigin || !selectedDest ? "Select destination first..." : "Enter manual total..."}
                  value={customRollInput}
                  disabled={!selectedOrigin || !selectedDest}
                  onChange={(e) => setCustomRollInput(e.target.value)}
                  className="flex-1 rounded border border-bridge-border bg-black/50 px-3 py-1.5 text-xs text-cyan-neon font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-neon disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={equationsCompleted >= targetEquations || !selectedOrigin || !selectedDest}
                  className="rounded border border-bridge-border bg-slate-900 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-cyan-neon hover:border-cyan-neon/40 disabled:opacity-40 cursor-pointer"
                >
                  SUBMIT TOTAL
                </button>
              </form>

              {(!selectedOrigin || !selectedDest) && (
                <p className="mt-2 text-[10px] font-mono text-amber-300/80">
                  ⚠️ Select a Destination Planet in the route planner above before plotting astrogation equations.
                </p>
              )}
            </div>

            {lastRollResult && (
              <div className="mt-4 p-2.5 rounded bg-black/70 border border-cyan-neon/40 text-[11px] flex flex-col md:flex-row justify-between items-start md:items-center gap-2 font-mono">
                <div>
                  {lastRollResult.d20 !== null ? (
                    <span className="text-slate-300">
                      d20 (
                      {lastRollResult.d20_rolls ? (
                        <span className="text-white">
                          [{lastRollResult.d20_rolls[0]}, {lastRollResult.d20_rolls[1]}] &rarr; Kept{" "}
                          <strong className="text-cyan-300">{lastRollResult.d20}</strong>
                          <span className="text-[9px] text-muted-foreground ml-1">
                            ({lastRollResult.rollType})
                          </span>
                        </span>
                      ) : (
                        <strong className="text-white">{lastRollResult.d20}</strong>
                      )}
                      ) + Skill (<strong className="text-cyan-300">+{lastRollResult.skillMod}</strong>)
                      {lastRollResult.parameterMod > 0 && (
                        <span className="text-emerald-400 font-bold"> + Safe Route (+{lastRollResult.parameterMod})</span>
                      )}
                      {lastRollResult.parameterMod < 0 && (
                        <span className="text-amber-400 font-bold"> - Fast Travel ({Math.abs(lastRollResult.parameterMod)})</span>
                      )}
                      {" = "}
                      <strong className="text-cyan-neon text-sm font-bold">{lastRollResult.total}</strong>
                    </span>
                  ) : (
                    <span className="text-slate-300">
                      Manual Total Entered: <strong className="text-cyan-neon text-sm font-bold">{lastRollResult.total}</strong>
                    </span>
                  )}
                </div>
                <span className="rounded bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-xs font-bold text-amber-300">
                  {lastRollResult.tierLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SYSTEM / SECTOR DIRECTORY MODAL OVERLAY */}
      {directoryModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-cyan-neon/60 bg-black/95 p-5 shadow-[0_0_25px_rgba(0,255,255,0.25)]">
            <div className="flex items-center justify-between border-b border-bridge-border/60 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-cyan-neon uppercase tracking-wider">
                  {directoryModal.title}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Found {directoryModal.planets.length} recorded planetary bodies in this {directoryModal.scope}.
                </p>
              </div>
              <button
                onClick={() => setDirectoryModal((prev) => ({ ...prev, open: false }))}
                className="rounded border border-bridge-border px-2.5 py-1 text-xs text-muted-foreground hover:text-white cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {directoryModal.planets.length === 0 ? (
                <p className="py-8 text-center text-xs font-mono text-muted-foreground">
                  No other known planets cataloged in this {directoryModal.scope}.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {directoryModal.planets.map((planet) => (
                    <div
                      key={planet.name}
                      className="flex items-center justify-between rounded border border-bridge-border/60 bg-black/50 p-3 hover:border-cyan-neon/40 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-mono font-bold text-white">{planet.name}</span>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                          <span>Region: <strong className="text-amber-300">{planet.region}</strong></span>
                          <span>Grid: <strong className="text-emerald-400">{planet.gridCoordinates}</strong></span>
                          <span>Inhabitants: {planet.inhabitants}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectFromDirectory(planet)}
                        className="rounded border border-cyan-neon/60 bg-cyan-neon/10 px-3 py-1.5 text-xs font-mono font-bold text-cyan-neon hover:bg-cyan-neon/20 shadow-[0_0_8px_rgba(0,255,255,0.2)] cursor-pointer"
                      >
                        SET AS TARGET
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REROUTE / EMERGENCY DROP-OUT (ASK DM REGION) MODAL */}
      {rerouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="flex w-full max-w-md flex-col rounded-lg border border-red-500/80 bg-black/95 p-5 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
            <h3 className="text-sm font-mono font-bold text-red-400 uppercase tracking-wider mb-2">
              ⚠️ Emergency Drop-Out: Consult Game Master
            </h3>
            <p className="text-xs font-mono text-slate-300 leading-relaxed mb-4">
              Your starship has disengaged from hyperspace before reaching its destination ({daysElapsed} of {activeJourney?.totalDays ?? 1} days traveled). 
              Ask your GM what galactic region your vessel is currently occupying, then select it below:
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                Current Galactic Region
              </label>
              <select
                value={selectedRerouteRegion}
                onChange={(e) => setSelectedRerouteRegion(e.target.value as GalacticRegion)}
                className="rounded border border-red-500/60 bg-black px-3 py-2 text-xs font-mono text-red-300 focus:outline-none focus:border-red-400"
              >
                {ALL_REGIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-bridge-border/40">
              <button
                onClick={() => setRerouteModalOpen(false)}
                className="rounded border border-bridge-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-white cursor-pointer"
              >
                CANCEL (REMAIN IN FTL)
              </button>
              <button
                onClick={handleConfirmReroute}
                className="rounded border border-red-500 bg-red-500/20 px-4 py-1.5 text-xs font-mono font-bold text-red-300 hover:bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)] cursor-pointer"
              >
                CONFIRM DROP-OUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSTALLED STATION MODIFICATIONS (BOTTOM) */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <h3 className="mb-3 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1">
          Installed Station Modifications
        </h3>
        <StationModifications
          station="Navcomputer"
          installedMods={installedMods}
          onRemoveMod={onRemoveMod}
        />
      </section>
    </div>
  )
}