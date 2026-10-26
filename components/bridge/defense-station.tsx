"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ShieldAlert, ShieldCheck, Users, CheckCircle2, Clock, UserMinus } from "lucide-react"
import { CombatResources } from "./combat-resources"
import { StationModifications, Modification } from "./ship-modifications"
import { ShipStats } from "./ship-stats"
import { type ShipConfig } from "./ship-setup"
import { SHIP_SIZE_RULES, SHIP_TYPE_RULES, SHIP_TIER_PROGRESSION, ShipSize } from "@/lib/ship-rules"
import type { ManifestMember, ShipCompartmentId } from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"

export interface ActiveStatus {
  id: string
  title: string
  effect: string
  duration: string
  level?: number
}

const getBaseDiceBySize = (size?: string): number => {
  switch (size?.toLowerCase()) {
    case "tiny": return 1
    case "small": return 3
    case "medium": return 4
    case "large": return 7
    case "huge": return 10
    case "gargantuan": return 15
    default: return 3
  }
}

const getFeedbackDieBySize = (size?: string): string => {
  switch (size?.toLowerCase()) {
    case "tiny": return "1d4"
    case "small": return "1d6"
    case "medium": return "1d8"
    case "large": return "1d10"
    case "huge": return "1d12"
    case "gargantuan": return "1d20"
    default: return "1d6"
  }
}

const SYSTEM_DAMAGE_LEVEL_DEFINITIONS: Record<number, { title: string; effect: string }> = {
  0: {
    title: "Nominal Operations (Level 0)",
    effect: "All ship systems operating within normal parameters. No penalties active."
  },
  1: {
    title: "Level 1 Damage",
    effect: "Disadvantage on ability checks utilizing ship systems."
  },
  2: {
    title: "Level 2 Damage",
    effect: "Disadvantage on ability checks; +1 Slowed Level applied."
  },
  3: {
    title: "Level 3 Damage",
    effect: "Disadvantage on Attack Rolls and Saving Throws (plus prior level penalties)."
  },
  4: {
    title: "Level 4 Damage",
    effect: "Hit point maximum, Shield Point maximum, and Shield Regeneration rate halved."
  },
  5: {
    title: "Level 5 Damage",
    effect: "Ship becomes permanently 'Used' (breakdown risks active, resale value halved)."
  },
  6: {
    title: "Level 6: Catastrophic Power Failure",
    effect: "All primary systems fail. Total blackout. Vessel is disabled and inoperable."
  }
}

const SHIP_STATUS_OPTIONS = [
  { 
    id: "blinded", 
    title: "BLINDED", 
    defaultEffect: "A blinded ship can't see and automatically fails any ability check that relies on sight or the ship's sensors. Attack rolls against the ship have advantage, and the ship's attack rolls have disadvantage." 
  },
  { 
    id: "disabled", 
    title: "DISABLED", 
    defaultEffect: "A disabled ship can't communicate with external sources more than 1,000 feet away. A disabled ship can't take actions or reactions. A disabled ship has 4 slowed levels." 
  },
  { 
    id: "ionized", 
    title: "IONIZED", 
    defaultEffect: "An ionized starship has disadvantage on attack rolls and ability checks." 
  },
  { 
    id: "invisible", 
    title: "INVISIBLE", 
    defaultEffect: "An invisible starship is impossible to see without the aid of powers or a special sense. For the purpose of hiding, the starship is heavily obscured. The starship's location can be detected by any noise it makes or any tracks it leaves. Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage." 
  },
  { 
    id: "shocked", 
    title: "SHOCKED", 
    defaultEffect: "A shocked starship can't take reactions. On its turn, a shocked starship can take either an action or a bonus action, but not both." 
  },
  { 
    id: "slowed", 
    hasLevels: true,
    title: "SLOWED", 
    defaultEffect: "Some abilities, effects, and hazards can lead to a special condition called slowed. Slowed is measured in four levels. An effect can give a ship one or more levels of slowed, as specified in the effect's description.",
    levels: {
      1: "Speed reduced by 150 feet",
      2: "Speed reduced by 250 feet",
      3: "Speed reduced by 300 feet",
      4: "Speed reduced to 0, and can't benefit from any bonus to speed"
    }
  },
  { 
    id: "stalled", 
    title: "STALLED", 
    defaultEffect: "A stalled ship is disabled. Any active features controlled by the ship, such as a Tractor Beam or Gravity Well Projector, automatically end. The ship automatically fails Strength and Dexterity saving throws. Attack rolls against the ship have advantage." 
  },
  { 
    id: "stunned", 
    title: "STUNNED", 
    defaultEffect: "A stunned ship has 4 slowed levels. The ship automatically fails Strength and Dexterity saving throws. Attack rolls against the ship have advantage." 
  },
  { 
    id: "tractored", 
    title: "TRACTORED", 
    defaultEffect: "A tractored ship has 4 slowed levels. The condition ends if the tractoring ship is disabled. The condition also ends if an effect removes the tractored ship from the reach of the tractoring ship or effect." 
  },
  { 
    id: "used", 
    title: "USED", 
    defaultEffect: "A used starship's value is reduced by half. When a deployed crew member on a used starship rolls a 1 on an ability check, attack roll, or saving throw, they must make a destruction saving throw. If the roll is 10 or higher, they succeed. On a failure, the ship suffers 1 level of system damage." 
  },
]

interface DefenseStationProps {
  onHullChange?: (current: number, max: number, ac: number) => void
  onShieldChange?: (current: number, max: number, temp: number) => void
  availablePowerDice?: number
  maxPowerDice?: number
  powerDieType?: string
  onConsumePowerDice?: (amount: number) => boolean | void
  shipConfig?: ShipConfig
  spentHullDice?: number
  onSpentHullDiceChange?: (spent: number) => void
  spentShieldDice?: number
  onSpentShieldDiceChange?: React.Dispatch<React.SetStateAction<number>> | ((spent: number | ((prev: number) => number)) => void)
  installedMods?: Modification[]
  onRemoveMod?: (instanceId: string) => void
  stationPools?: Record<string, number>
  onUpdateStationPools?: React.Dispatch<React.SetStateAction<Record<string, number>>>
  sharedPoolDice?: number
  onUpdateSharedPool?: React.Dispatch<React.SetStateAction<number>>
  damageReduction: number
  currentShields?: number
  maxShields?: number
  tempShields?: number
  standingByUsed?: boolean
  onUseStandingBy?: () => void
  systemDamageLevel?: number
  onUpdateSystemDamageLevel?: (level: number | ((prev: number) => number)) => void
  statuses?: ActiveStatus[]
  onAddStatus?: (status: ActiveStatus) => void
  onRemoveStatus?: (statusId: string) => void
  manifest?: ManifestMember[]
  onAssignCrew?: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn?: (memberId: string) => void
}

export function DefenseStation({
  onHullChange,
  onShieldChange,
  availablePowerDice = 4,
  maxPowerDice = 5,
  powerDieType = "d8",
  onConsumePowerDice = () => false,
  shipConfig,
  spentHullDice = 0,
  onSpentHullDiceChange,
  spentShieldDice = 0,
  onSpentShieldDiceChange,
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
  damageReduction,
  currentShields,
  maxShields,
  tempShields,
  standingByUsed = false,
  onUseStandingBy,
  systemDamageLevel = 0,
  onUpdateSystemDamageLevel,
  statuses = [],
  onAddStatus,
  onRemoveStatus,
  manifest = [],
  onAssignCrew,
  onToggleTurn,
}: DefenseStationProps) {
  const isInitialMount = useRef(true)

  // --- CREW ASSIGNMENT EXTRACTION ---
  const assignedCrew = useMemo(() => {
    return manifest
      .filter((m) => m.location === "defense" && !m.isPassenger)
      .sort((a, b) => a.assignedOrder - b.assignedOrder)
  }, [manifest])

  const availablePersonnel = useMemo(() => {
    return manifest.filter((m) => m.location !== "defense" && !m.isPassenger)
  }, [manifest])

  const isAttackFighterMastery = shipConfig?.roleMastery === "Attack Fighter"
  const isNavigatorMastery = shipConfig?.roleMastery === "Navigator"

  const isMedium = (shipConfig?.size || "small").toLowerCase() === "medium"
  const shipTier = typeof shipConfig?.tier === "number" ? shipConfig.tier : 0
  const hasHoldTogether = isMedium && shipTier >= 3

  const isLevel4Damage = systemDamageLevel >= 4

  const hasFeedbackShield = installedMods.some((m) => m.name.toUpperCase().includes("FEEDBACK SHIELD"))
  const hasInvulnerabilityDrive = installedMods.some((m) => m.name.toUpperCase().includes("INVULNERABILITY DRIVE"))
  const hasInertialDampeners = installedMods.some((m) => m.name.toUpperCase().includes("INERTIAL DAMPENERS"))

  const [invulnerabilityRounds, setInvulnerabilityRounds] = useState<number>(0)
  const [invulnerabilityUsed, setInvulnerabilityUsed] = useState<boolean>(false)
  const [feedbackRollLog, setFeedbackRollLog] = useState<string | null>(null)

  const feedbackDie = getFeedbackDieBySize(shipConfig?.size)

  const handleTriggerFeedbackShield = () => {
    const maxVal = parseInt(feedbackDie.replace("1d", ""), 10) || 6
    const roll = Math.floor(Math.random() * maxVal) + 1
    setFeedbackRollLog(`Retaliation Triggered: ${roll} damage reflected back to attacker (${feedbackDie} roll, matching attack type).`)
  }

  const handleActivateInvulnerabilityDrive = () => {
    if (invulnerabilityUsed) return
    const rounds = Math.floor(Math.random() * 4) + 1
    setInvulnerabilityRounds(rounds)
    setInvulnerabilityUsed(true)
  }

  const handleEndInvulnerabilityDrive = () => {
    setInvulnerabilityRounds(0)
    handleRollDestructionSave()
  }

  const [currentShieldType, setCurrentShieldType] = useState(shipConfig?.shieldType || "Standard Energy Shield")

  useEffect(() => {
    if (shipConfig?.shieldType) {
      setCurrentShieldType(shipConfig.shieldType)
    }
  }, [shipConfig?.shieldType])

  let shieldCapCoeff = "1"
  let shieldRegenCoeff = "1"

  const normalizedShieldType = currentShieldType.toLowerCase()
  if (normalizedShieldType.includes("fortress")) {
    shieldCapCoeff = "3/2"
    shieldRegenCoeff = "2/3"
  } else if (normalizedShieldType.includes("quick-charge") || normalizedShieldType.includes("quick charge")) {
    shieldCapCoeff = "2/3"
    shieldRegenCoeff = "3/2"
  }
 
  const powerCoupling = shipConfig?.powerCoupling ?? shipConfig?.couplingType ?? "Direct Power Coupling"
  const isDistributed = powerCoupling.toLowerCase().includes("distributed")
  const isHubAndSpoke = powerCoupling.toLowerCase().includes("hub") || powerCoupling.toLowerCase().includes("spoke")
  const isDirect = !isDistributed && !isHubAndSpoke

  const currentStationDice = stationPools["defense"] ?? (isHubAndSpoke ? 1 : isDistributed ? 2 : availablePowerDice)
  const effectiveMax = isDirect ? maxPowerDice : (isDistributed ? 2 : 1)
  const effectiveAvailable = Math.min(effectiveMax, isDirect ? availablePowerDice : currentStationDice)

  const handleCustomConsume = (amount: number = 1) => {
    if (isDirect) {
      return onConsumePowerDice(amount)
    }

    if (currentStationDice >= amount) {
      if (onUpdateStationPools) {
        onUpdateStationPools((prev) => ({
          ...prev,
          defense: Math.max(0, (prev["defense"] ?? (isHubAndSpoke ? 1 : 2)) - amount),
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

  const sizeKey = ((shipConfig?.size || "small").toLowerCase()) as ShipSize
  const sizeRules = SHIP_SIZE_RULES[sizeKey] || SHIP_SIZE_RULES.small
  const roleRules = shipConfig?.shipType ? SHIP_TYPE_RULES[shipConfig.shipType] : null

  const rawDex = shipConfig?.stats?.dexterity ?? 10
  const dexTierBoost = shipConfig?.tierStatBoosts?.dexterity ?? 0
  const dexChassisMod = sizeRules.dexterityMod || 0
  const dexRoleMod = roleRules?.dexterityMod || 0
  const effectiveDexScore = rawDex + dexTierBoost + dexChassisMod + dexRoleMod
  const effectiveDexMod = Math.floor((effectiveDexScore - 10) / 2)

  const armorType = shipConfig?.armorType ?? "Lightweight Armor"
  const normalizedArmor = armorType.toLowerCase()

  let appliedDexMod = effectiveDexMod
  let dexLimitLabel = "Full DEX"
  if (normalizedArmor.includes("reinforced")) {
    appliedDexMod = 0
    dexLimitLabel = "No DEX (Reinforced)"
  } else if (normalizedArmor.includes("deflection")) {
    appliedDexMod = Math.min(2, effectiveDexMod)
    dexLimitLabel = "Max +2 DEX (Deflection)"
  }

  const tierACBonus = SHIP_TIER_PROGRESSION[sizeKey]?.[shipTier]?.acUpgrade ?? (shipTier >= 2 ? shipTier - 1 : 0)
  const modsACBonus = installedMods.reduce((sum, mod) => sum + ((mod as any).acBonus || 0), 0)
  const dynamicAC = (shipConfig as any)?.armorClass ?? (10 + appliedDexMod + tierACBonus + modsACBonus)

  const baseDiceCount = getBaseDiceBySize(shipConfig?.size)
  const tierDiceBonus = shipConfig?.tier ?? 0
  const calculatedTotalDice = baseDiceCount + tierDiceBonus

  const resistances = (shipConfig as any)?.damageResistances ?? {}
  const hullResistancesList: string[] = []
  if (resistances.hullEnergy) hullResistancesList.push("Energy (Ablative)")
  if (resistances.hullKinetic) hullResistancesList.push("Kinetic (Reactive)")
  if (resistances.rammingKinetic) hullResistancesList.push("Ramming Kinetic (Shock Absorbers)")
  if (isNavigatorMastery) hullResistancesList.push("Environmental Effects (Navigator Mastery)")

  const shieldResistancesList: string[] = []
  if (resistances.shieldsEnergy) shieldResistancesList.push("Energy (Reactive Compensator)")
  if (resistances.shieldsKinetic) shieldResistancesList.push("Kinetic (Absorptive)")

  const baseMaxHull = (shipConfig as any)?.hull?.max ?? shipConfig?.baseHull ?? (shipConfig as any)?.hullMax ?? 40
  const baseMaxShields = maxShields ?? (shipConfig as any)?.shields?.max ?? shipConfig?.maxShields ?? (shipConfig as any)?.shieldMax ?? 24

  const effectiveMaxHull = isLevel4Damage ? Math.floor(baseMaxHull / 2) : baseMaxHull
  const effectiveMaxShields = isLevel4Damage ? Math.floor(baseMaxShields / 2) : baseMaxShields

  const getInitialHull = () => {
    const current = (shipConfig as any)?.hull?.current ?? (shipConfig as any)?.currentHull ?? baseMaxHull
    const armorRating = (shipConfig as any)?.armorRating ?? (shipConfig as any)?.armor?.rating ?? 0
    const totalHD = (shipConfig as any)?.hull?.totalHD ?? (shipConfig as any)?.totalHitDice ?? calculatedTotalDice
    const hdType = (shipConfig as any)?.hull?.hdType ?? (shipConfig as any)?.hullDiceType ?? "d6"
    return { current: Math.min(effectiveMaxHull, current), max: baseMaxHull, ac: dynamicAC, armorType, armorRating, totalHD, hdType, resistances: hullResistancesList }
  }

  const getInitialShields = () => {
    const current = currentShields ?? (shipConfig as any)?.shields?.current ?? (shipConfig as any)?.currentShields ?? baseMaxShields
    const temp = tempShields ?? (shipConfig as any)?.shields?.temp ?? (shipConfig as any)?.tempShields ?? 0
    const totalSD = (shipConfig as any)?.shields?.totalSD ?? (shipConfig as any)?.totalShieldDice ?? calculatedTotalDice
    const sdType = (shipConfig as any)?.shields?.sdType ?? (shipConfig as any)?.shieldDieType ?? "d6"
    const shieldRegen = (shipConfig as any)?.shields?.regen ?? "1 Shield Die"
    const shieldTypeName = (shipConfig as any)?.shields?.typeName ?? shipConfig?.shieldType ?? "Standard Energy Shields"
    return { current: Math.min(effectiveMaxShields, current), max: baseMaxShields, temp, totalSD, sdType, shieldRegen, shieldTypeName, resistances: shieldResistancesList }
  }

  const [hull, setHull] = useState(getInitialHull)
  const [shipShields, setShipShields] = useState(getInitialShields)

  useEffect(() => {
    if (isLevel4Damage) {
      if (hull.current > effectiveMaxHull) {
        setHull((prev) => ({ ...prev, current: effectiveMaxHull }))
        onHullChange?.(effectiveMaxHull, baseMaxHull, dynamicAC)
      }
      if (shipShields.current > effectiveMaxShields) {
        setShipShields((prev) => ({ ...prev, current: effectiveMaxShields }))
        onShieldChange?.(effectiveMaxShields, baseMaxShields, shipShields.temp)
      }
    }
  }, [isLevel4Damage, effectiveMaxHull, effectiveMaxShields])

  useEffect(() => {
    if (currentShields !== undefined || maxShields !== undefined || tempShields !== undefined) {
      setShipShields((prev) => {
        const nextCurrent = currentShields !== undefined ? (isLevel4Damage ? Math.min(effectiveMaxShields, currentShields) : currentShields) : prev.current
        return {
          ...prev,
          current: nextCurrent,
          max: maxShields !== undefined ? maxShields : prev.max,
          temp: tempShields !== undefined ? tempShields : prev.temp,
        }
      })
    }
  }, [currentShields, maxShields, tempShields, isLevel4Damage, effectiveMaxShields])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    setHull((prev) => {
      if (prev.ac === dynamicAC) return prev
      onHullChange?.(prev.current, prev.max, dynamicAC)
      return { ...prev, ac: dynamicAC }
    })
  }, [dynamicAC])

  const [isAutoRegenActive, setIsAutoRegenActive] = useState<boolean>(false)
  const [regenThresholdPct, setRegenThresholdPct] = useState<number>(75)

  useEffect(() => {
    if (shipConfig) {
      setHull(getInitialHull())
      setShipShields(getInitialShields())
    }
  }, [shipConfig])

  const [destructionSaves, setDestructionSaves] = useState({
    successes: 0,
    failures: 0,
    isStable: false,
    lastRoll: null as number | null,
    lastResultText: "",
  })

  const strModifier = Math.floor((-10 + (shipConfig?.stats?.strength ?? (shipConfig as any)?.str ?? 10)) / 2)
  const boostCheckBonus = shipConfig?.skills?.boost ?? (strModifier + 2)
  const proficiencyBonus = boostCheckBonus - strModifier

  const [hasRegeneratedThisTurn, setHasRegeneratedThisTurn] = useState<boolean>(false)
  const [regenLog, setRegenLog] = useState<string>("")
  const [manualRollInput, setManualRollInput] = useState<string>("")

  const [selectedStatusId, setSelectedStatusId] = useState<string>("disabled")
  const [selectedSlowLevel, setSelectedSlowLevel] = useState<number>(1)
  const [customDuration, setCustomDuration] = useState<string>("1 Round")

  const handleAdjustTotalShields = (delta: number) => {
    if (invulnerabilityRounds > 0 && delta < 0) {
      alert("Invulnerability Drive is active! Ship is immune to all damage.")
      return
    }

    if (delta > 0) {
      const ceiling = isLevel4Damage ? effectiveMaxShields : shipShields.max
      const newCurrent = Math.min(ceiling, shipShields.current + delta)
      setShipShields((prev) => ({ ...prev, current: newCurrent }))
      onShieldChange?.(newCurrent, shipShields.max, shipShields.temp)
    } else {
      let damageRemaining = Math.abs(delta)
      let newTemp = shipShields.temp
      let newCurrent = shipShields.current

      if (newTemp > 0) {
        const absorbedByTemp = Math.min(newTemp, damageRemaining)
        newTemp -= absorbedByTemp
        damageRemaining -= absorbedByTemp
      }

      if (damageRemaining > 0 && newCurrent > 0) {
        const absorbedByCurrent = Math.min(newCurrent, damageRemaining)
        newCurrent -= absorbedByCurrent
        damageRemaining -= absorbedByCurrent
      }

      setShipShields((prev) => ({ ...prev, current: newCurrent, temp: newTemp }))
      onShieldChange?.(newCurrent, shipShields.max, newTemp)

      if (damageRemaining > 0) {
        handleAdjustHull(-damageRemaining)
      }
    }
  }

  const handleAdjustHull = (delta: number) => {
    if (invulnerabilityRounds > 0 && delta < 0) {
      alert("Invulnerability Drive is active! Ship is immune to all damage.")
      return
    }

    const incomingDamage = delta < 0
    const ceiling = isLevel4Damage ? effectiveMaxHull : hull.max
    const newCurrent = Math.max(0, Math.min(ceiling, hull.current + delta))

    if (hull.current === 0 && incomingDamage) {
      setDestructionSaves((ds) => ({ ...ds, isStable: false }))
    }

    setHull((prev) => ({ ...prev, current: newCurrent }))
    onHullChange?.(newCurrent, hull.max, dynamicAC)
  }

  const ceilingShieldMax = isLevel4Damage ? effectiveMaxShields : shipShields.max
  const missingShieldPoints = Math.max(0, ceilingShieldMax - shipShields.current)
  const targetDC = Math.max(10, Math.floor(missingShieldPoints / 2))

  const handleExecuteShieldRegeneration = (isManual: boolean, manualValue?: number) => {
    if (hasRegeneratedThisTurn) return

    const d20Roll = Math.floor(Math.random() * 20) + 1
    const totalCheck = d20Roll + boostCheckBonus
    const isSuccess = totalCheck >= targetDC

    let rawHealAmount = 0
    let rollDetails = ""

    if (isManual && manualValue !== undefined) {
      rawHealAmount = Math.max(1, manualValue)
      rollDetails = `Manual Shield Roll: +${rawHealAmount} SP`
    } else {
      const roll1 = Math.floor(Math.random() * 8) + 1
      if (!isSuccess) {
        const roll2 = Math.floor(Math.random() * 8) + 1
        rawHealAmount = Math.min(roll1, roll2)
        rollDetails = `Failed check (Rolled ${d20Roll}+${boostCheckBonus}=${totalCheck} vs DC ${targetDC}). Rolled d8 twice [${roll1}, ${roll2}], took lesser: +${rawHealAmount} SP`
      } else {
        rawHealAmount = roll1
        rollDetails = `Successful check (Rolled ${d20Roll}+${boostCheckBonus}=${totalCheck} vs DC ${targetDC}). Rolled d8 [${roll1}]: +${rawHealAmount} SP`
      }
    }

    const finalHealAmount = isLevel4Damage ? Math.max(1, Math.floor(rawHealAmount / 2)) : rawHealAmount
    if (isLevel4Damage) {
      rollDetails += ` -> Halved to +${finalHealAmount} SP (System Damage Lvl 4)`
    }

    const ceiling = isLevel4Damage ? effectiveMaxShields : shipShields.max
    const newCurrent = Math.min(ceiling, shipShields.current + finalHealAmount)

    setShipShields((prev) => ({ ...prev, current: newCurrent }))
    onShieldChange?.(newCurrent, shipShields.max, shipShields.temp)

    setHasRegeneratedThisTurn(true)
    setRegenLog(rollDetails)
    setManualRollInput("")
  }

  const handleResetRegenTurn = () => {
    setHasRegeneratedThisTurn(false)
    setRegenLog("")
  }

  const handleRollDestructionSave = () => {
    const roll = Math.floor(Math.random() * 20) + 1
    const isSuccess = roll >= 10

    setDestructionSaves((prev) => {
      const newSuccesses = isSuccess ? Math.min(3, prev.successes + 1) : prev.successes
      const newFailures = !isSuccess ? prev.failures + 1 : prev.failures
      const nowStable = newSuccesses >= 3

      return {
        ...prev,
        successes: newSuccesses,
        failures: newFailures,
        isStable: nowStable,
        lastRoll: roll,
        lastResultText: isSuccess 
          ? `Rolled ${roll}: SUCCESS! (${newSuccesses}/3)` 
          : `Rolled ${roll}: FAILURE! System damage incurred. (${newFailures} Failures)`,
      }
    })
  }

  const handleSetSuccessesCount = (count: number) => {
    setDestructionSaves((prev) => {
      const newSuccesses = prev.successes === count ? count - 1 : count
      const clampedSuccesses = Math.max(0, Math.min(3, newSuccesses))
      const nowStable = clampedSuccesses >= 3
      return {
        ...prev,
        successes: clampedSuccesses,
        isStable: nowStable,
        lastResultText: `Manually set successes to ${clampedSuccesses}/3`,
      }
    })
  }

  const handleSetFailuresCount = (count: number) => {
    setDestructionSaves((prev) => {
      const newFailures = prev.failures === count ? count - 1 : count
      const clampedFailures = Math.max(0, Math.min(3, newFailures))
      return {
        ...prev,
        failures: clampedFailures,
        lastResultText: `Manually set failures to ${clampedFailures}`,
      }
    })
  }

  const handleResetDestructionSaves = () => {
    setDestructionSaves({
      successes: 0,
      failures: 0,
      isStable: false,
      lastRoll: null,
      lastResultText: "",
    })
  }

  const handleAddStatusLocal = () => {
    const statusDef = SHIP_STATUS_OPTIONS.find((s) => s.id === selectedStatusId)
    if (!statusDef) return

    let effectText = statusDef.defaultEffect || ""
    let titleText = statusDef.title
    let levelVal: number | undefined = undefined

    if (statusDef.hasLevels && statusDef.levels) {
      levelVal = selectedSlowLevel
      const levelEffectText = statusDef.levels[selectedSlowLevel as keyof typeof statusDef.levels]
      effectText = `${statusDef.defaultEffect} [Level ${selectedSlowLevel}: ${levelEffectText}]`
      titleText = `SLOWED (LVL ${selectedSlowLevel})`
    }

    const timestamp = Date.now()
    const newStatusEntry: ActiveStatus = {
      id: `${timestamp}-${statusDef.id}`,
      title: titleText,
      effect: effectText,
      duration: customDuration || "Until Cleared",
      level: levelVal,
    }

    onAddStatus?.(newStatusEntry)

    if (statusDef.id === "disabled" || statusDef.id === "stunned" || statusDef.id === "tractored") {
      const hasSlowed4 = statuses.some((s) => s.title.includes("SLOWED") && s.level === 4)
      if (!hasSlowed4) {
        const slowedEntry: ActiveStatus = {
          id: `${timestamp}-slowed-auto`,
          title: "SLOWED (LVL 4)",
          effect: `Speed reduced to 0 ft (Source: ${statusDef.title} condition).`,
          duration: customDuration || "Until Cleared",
          level: 4,
        }
        onAddStatus?.(slowedEntry)
      }
    }
  }

  const handleRemoveStatusLocal = (statusId: string) => {
    const target = statuses.find((s) => s.id === statusId)
    onRemoveStatus?.(statusId)

    if (target && (target.id.includes("disabled") || target.title.includes("DISABLED") || target.id.includes("stunned") || target.title.includes("STUNNED") || target.id.includes("tractored") || target.title.includes("TRACTORED"))) {
      const autoSlowed = statuses.find((s) => s.id.includes("slowed-auto"))
      if (autoSlowed) {
        onRemoveStatus?.(autoSlowed.id)
      }
    }
  }

  const fullMaxShields = shipShields.max || 1
  const fullMaxHull = hull.max || 1

  const tempPercent = fullMaxShields > 0 ? Math.max(0, Math.min(100, (shipShields.temp / fullMaxShields) * 100)) : 0
  const regularPercent = fullMaxShields > 0 ? Math.max(0, Math.min(100 - tempPercent, (shipShields.current / fullMaxShields) * 100)) : 0
  const totalEffectivePercent = regularPercent + tempPercent

  const hullPercent = fullMaxHull > 0 ? Math.max(0, Math.min(100, (hull.current / fullMaxHull) * 100)) : 0

  const getBarColor = (pct: number) => {
    if (pct <= 0) return "bg-red-600 animate-pulse"
    if (pct <= 25) return "bg-red-500"
    if (pct <= 60) return "bg-amber-400"
    return "bg-cyan-neon"
  }

  const getHullBarColor = (pct: number) => {
    if (pct <= 0) return "bg-red-600 animate-pulse"
    if (pct <= 25) return "bg-red-500"
    if (pct <= 60) return "bg-amber-400"
    return "bg-emerald-500"
  }

  const currentSelectedStatusMeta = SHIP_STATUS_OPTIONS.find((s) => s.id === selectedStatusId)
  const currentDamageDefinition = SYSTEM_DAMAGE_LEVEL_DEFINITIONS[systemDamageLevel] || SYSTEM_DAMAGE_LEVEL_DEFINITIONS[0]

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* ========================================================================= */}
      {/* STATION CREW ASSIGNMENT & COMBAT TURN HUD */}
      {/* ========================================================================= */}
      <div className="rounded-md border border-cyan-neon/40 bg-black/40 p-3 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Assigned Defense Personnel Cards */}
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
                      {isLead ? "Defense Officer" : "Support"}
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

          {/* Quick Pull Selector: Bring Crew to Defense */}
          {availablePersonnel.length > 0 && onAssignCrew && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                Deploy to Console:
              </span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onAssignCrew(e.target.value, "defense")
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

      {/* 1. SHIP STATS & COMBAT RESOURCES */}
      <div className="grid gap-4 grid-cols-1 w-full">
        <ShipStats 
          shipConfig={shipConfig} 
          systemDamageLevel={systemDamageLevel} 
          statuses={statuses}
        />
        <div className="flex flex-col rounded-md border border-bridge-border bg-bridge-panel p-4 gap-4 w-full">
          <CombatResources 
            availablePowerDice={effectiveAvailable}
            maxPowerDice={effectiveMax}
            powerDieType={powerDieType}
            onConsumePowerDice={handleCustomConsume}
            standingByUsed={standingByUsed}
            onUseStandingBy={onUseStandingBy}
            shipTier={shipConfig?.tier ?? 0}
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

      {/* 2. ACTIVE TACTICAL DEFENSE CAPABILITIES */}
      {(hasFeedbackShield || hasInvulnerabilityDrive || hasInertialDampeners || isNavigatorMastery) && (
        <section className="rounded-md border border-cyan-neon/60 bg-bridge-panel p-4 shadow-[0_0_15px_rgba(0,255,255,0.08)] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-bridge-border/60 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-neon animate-pulse" />
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                Active Tactical Defense Modules
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">
              Reaction &amp; Protocol Triggers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hasFeedbackShield && (
              <div className="bg-black/50 p-3 rounded border border-cyan-neon/40 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-cyan-neon font-mono uppercase">
                      Feedback Shield
                    </span>
                    <span className="text-[9px] font-mono text-amber-300 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.2 rounded font-bold">
                      REACTION
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
                    When struck by a primary or secondary weapon, use your reaction to retaliate directly against the attacker, dealing <strong>{feedbackDie}</strong> damage of the same damage type.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={handleTriggerFeedbackShield}
                    className="w-full py-1.5 rounded border border-cyan-neon/60 bg-cyan-neon/20 hover:bg-cyan-neon/30 text-xs font-bold text-cyan-neon font-mono uppercase tracking-wider transition-all shadow-[0_0_8px_rgba(0,255,255,0.2)] cursor-pointer"
                  >
                    ⚡ Retaliate ({feedbackDie} Dmg)
                  </button>
                  {feedbackRollLog && (
                    <div className="text-[9px] font-mono text-amber-300 text-center bg-black/60 p-1 rounded border border-bridge-border/40">
                      {feedbackRollLog}
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasInvulnerabilityDrive && (
              <div className="bg-black/50 p-3 rounded border border-purple-500/40 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-purple-300 font-mono uppercase">
                      Invulnerability Drive
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase border ${
                      invulnerabilityRounds > 0
                        ? "bg-purple-500/30 text-purple-200 border-purple-400 animate-pulse"
                        : invulnerabilityUsed
                        ? "bg-slate-800 text-slate-500 border-slate-700"
                        : "bg-purple-950/40 text-purple-300 border-purple-500/40"
                    }`}>
                      {invulnerabilityRounds > 0 ? `${invulnerabilityRounds} RNDS ACTIVE` : invulnerabilityUsed ? "EXPENDED (REFIT)" : "1 USE READY"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
                    Render ship immune to all damage for 1d4 rounds. Flight speed is halved, turn speed is doubled. Requires Destruction Save upon expiration.
                  </p>
                </div>

                {invulnerabilityRounds > 0 ? (
                  <button
                    onClick={handleEndInvulnerabilityDrive}
                    className="w-full py-1.5 rounded border border-red-500/60 bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-300 font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    End Immunity &amp; Make Destruction Save
                  </button>
                ) : (
                  <button
                    disabled={invulnerabilityUsed}
                    onClick={handleActivateInvulnerabilityDrive}
                    className={`w-full py-1.5 rounded text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                      invulnerabilityUsed
                        ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-purple-500/20 border-purple-400 text-purple-300 hover:bg-purple-500/30 shadow-[0_0_10px_rgba(192,132,252,0.3)]"
                    }`}
                  >
                    {invulnerabilityUsed ? "EXPENDED (REFIT REQUIRED)" : "ENGAGE INVULNERABILITY DRIVE (1D4 RNDS)"}
                  </button>
                )}
              </div>
            )}

            {hasInertialDampeners && (
              <div className="bg-black/50 p-3 rounded border border-bridge-border/60 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-200 font-mono uppercase">
                      Inertial Dampeners
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">
                      PASSIVE GRID
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
                    Advantage on Concentration checks from external impacts. When taking the Evade action, ship ability checks and attacks no longer suffer disadvantage.
                  </p>
                </div>

                <div className="p-1.5 rounded bg-black/60 border border-bridge-border/40 text-[9px] font-mono text-cyan-300 text-center">
                  ✓ Evade Disadvantage Filter Active
                </div>
              </div>
            )}

            {isNavigatorMastery && (
              <div className="bg-black/50 p-3 rounded border border-amber-500/40 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-amber-300 font-mono uppercase">
                      Navigator Mastery Shielding
                    </span>
                    <span className="text-[9px] font-mono text-amber-300 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.2 rounded font-bold">
                      ENVIRONMENTAL
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed">
                    Resistance to damage from environmental hazards (radiation, stellar flares, nebulae, acid clouds). Advantage on saves vs environmental effects.
                  </p>
                </div>
                <div className="p-1.5 rounded bg-amber-950/40 border border-amber-500/30 text-[9px] font-mono text-amber-200 text-center">
                  ✓ Environmental Resistance Active
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. HULL INTEGRITY & SHIELD STATUS */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <div className="flex justify-between items-center mb-3 border-b border-bridge-border/60 pb-2">
          <div>
            <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
              Hull Integrity &amp; Shield Status
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Primary structural integrity, armor defense class, and operational energy shields.
            </p>
          </div>
        </div>

        {/* PROMINENT ARMOR & SHIELD VALUE BANNER */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gradient-to-r from-cyan-neon/25 via-cyan-neon/10 to-black/60 p-3.5 rounded border-2 border-cyan-neon/60 flex flex-col justify-between shadow-[0_0_15px_rgba(0,255,255,0.15)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-cyan-neon tracking-[0.2em] uppercase">
                Armor: {armorType.toUpperCase()}
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">Hull Plating Intact</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div 
                className="bg-black/60 p-2 rounded border border-cyan-neon/40 flex items-center gap-3"
                title={`AC Breakdown: Base 10 + ${dexLimitLabel} (${appliedDexMod >= 0 ? `+${appliedDexMod}` : appliedDexMod}) + Tier ${shipTier} (+${tierACBonus}) + Mods (+${modsACBonus}) = ${dynamicAC}`}
              >
                <div className="w-9 h-9 rounded bg-cyan-neon/20 border border-cyan-neon flex items-center justify-center text-cyan-neon font-mono font-black text-base shadow-[0_0_8px_rgba(0,255,255,0.4)]">
                  {dynamicAC}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono text-slate-100">AC</span>
                    {tierACBonus > 0 && (
                      <span className="text-[8px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/40">
                        +T{shipTier}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase block mt-0.5">
                    Base 10 + Dex + Tier
                  </span>
                </div>
              </div>

              <div className="bg-black/60 p-2 rounded border border-cyan-neon/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-cyan-neon/20 border border-cyan-neon flex items-center justify-center text-cyan-neon font-mono font-black text-base shadow-[0_0_8px_rgba(0,255,255,0.4)]">
                  {damageReduction}
                </div>
                <div>
                  <span className="text-xs font-bold font-mono text-slate-100 block">DR</span>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase block mt-0.5">
                    Damage Reduction
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[9px] font-mono text-cyan-300/90 space-y-0.5 bg-black/40 p-1.5 rounded border border-bridge-border/40">
              <p>
                • <strong>AC Formula:</strong> Base 10 + {appliedDexMod >= 0 ? `+${appliedDexMod}` : appliedDexMod} ({dexLimitLabel}) + {tierACBonus} (Tier {shipTier}) {modsACBonus > 0 ? `+ ${modsACBonus} (Mods)` : ""} = <strong>{dynamicAC}</strong>
              </p>
              <p>• If DR reduces incoming damage to 0, you take 1 damage instead.</p>
              {normalizedArmor.includes("reinforced") && (
                <p className="text-amber-400 font-bold">• ⚠️ Reinforced Armor: Stealth checks are made with disadvantage.</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-neon/25 via-cyan-neon/10 to-black/60 p-3.5 rounded border-2 border-cyan-neon/60 flex flex-col justify-between shadow-[0_0_15px_rgba(0,255,255,0.15)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-cyan-neon tracking-[0.2em] uppercase">
                Shield: {currentShieldType.toUpperCase()}
              </span>
              <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase">Energy Grid Active</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-black/60 p-2 rounded border border-cyan-neon/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-cyan-neon/20 border border-cyan-neon flex items-center justify-center text-cyan-neon font-mono font-black text-base shadow-[0_0_8px_rgba(0,255,255,0.4)]">
                  {shieldCapCoeff}
                </div>
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase block">Capacity</span>
                  <span className="text-xs font-bold font-mono text-slate-100 block">COEFFICIENT</span>
                </div>
              </div>

              <div className="bg-black/60 p-2 rounded border border-cyan-neon/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-cyan-neon/20 border border-cyan-neon flex items-center justify-center text-cyan-neon font-mono font-black text-base shadow-[0_0_8px_rgba(0,255,255,0.4)]">
                  {shieldRegenCoeff}
                </div>
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase block">Regeneration</span>
                  <span className="text-xs font-bold font-mono text-slate-100 block">RATE</span>
                </div>
              </div>
            </div>

            <div className="text-[9px] font-mono text-cyan-300/90 space-y-0.5 bg-black/40 p-1.5 rounded border border-bridge-border/40">
              <p>• Energy shields absorb incoming damage before structural hull integrity.</p>
              <p>• Temporary shields absorb impact first before base shields drain.</p>
              {isLevel4Damage && (
                <p className="text-red-400 font-bold">• ⚠️ System Damage Lvl 4: Shield Max &amp; Regen Rate are halved!</p>
              )}
              {isAttackFighterMastery && (
                <p className="text-cyan-300 font-bold">• ★ Attack Fighter Role Mastery: Auto Shield Regeneration rate is doubled!</p>
              )}
            </div>
          </div>
        </div>

        {/* Dual-Line Visual Telemetry Graph with Locked-Out Overlay */}
        <div className="mb-4 bg-black/60 p-3 rounded border border-bridge-border/60 space-y-3">
          <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase border-b border-bridge-border/40 pb-1.5">
            <span>Ship Defensive Status</span>
            <span className={shipShields.current === 0 && shipShields.temp === 0 && hull.current === 0 ? "text-red-400 font-bold animate-pulse" : (shipShields.current === 0 && shipShields.temp === 0) ? "text-red-400 animate-pulse" : isLevel4Damage ? "text-red-400 font-bold" : shipShields.temp > 0 ? "text-white font-bold" : "text-cyan-neon"}>
              {shipShields.current === 0 && shipShields.temp === 0 && hull.current === 0
                ? "CRITICAL BREACH"
                : isLevel4Damage
                ? "CAPACITY 50% LOCKED (LEVEL 4 DAMAGE)"
                : (shipShields.current === 0 && shipShields.temp === 0)
                ? "SHIELDS DOWN"
                : shipShields.temp > 0
                ? "TEMPORARY SHIELDS ACTIVE"
                : "Status Nominal"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className={`flex items-center gap-1.5 ${totalEffectivePercent === 0 ? "text-red-400 font-bold" : shipShields.temp > 0 ? "text-white font-bold" : regularPercent <= 60 ? "text-amber-400" : "text-cyan-neon"}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${totalEffectivePercent === 0 ? "bg-red-500 animate-ping" : shipShields.temp > 0 ? "bg-white shadow-[0_0_8px_#ffffff]" : regularPercent <= 60 ? "bg-amber-400" : "bg-cyan-neon"}`} /> SHIELDS
              </span>
              <span className="text-slate-200">
                {shipShields.current} / {isLevel4Damage ? `${effectiveMaxShields} (Base ${fullMaxShields})` : fullMaxShields} SP {shipShields.temp > 0 && <span className="text-white font-extrabold">(+{shipShields.temp} TEMP)</span>}
              </span>
            </div>
            
            <div className="relative h-2.5 w-full bg-slate-950 rounded-sm overflow-hidden border border-bridge-border/40 flex">
              <div
                className={`h-full transition-all duration-300 ${getBarColor(totalEffectivePercent)}`}
                style={{ width: `${regularPercent}%` }}
                title={`Base Shields: ${shipShields.current}/${fullMaxShields}`}
              />
              {shipShields.temp > 0 && (
                <div
                  className="h-full transition-all duration-300"
                  style={{ 
                    width: `${tempPercent}%`,
                    backgroundColor: "#ffffff",
                    boxShadow: "0 0 10px #ffffff, 0 0 4px #00ffff",
                    borderLeft: "2px solid #00ffff"
                  }}
                  title={`Temporary Shields: ${shipShields.temp} SP`}
                />
              )}
              {isLevel4Damage && (
                <div
                  className="absolute right-0 top-0 bottom-0 pointer-events-none"
                  style={{
                    width: "50%",
                    background: "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.4) 4px, rgba(0, 0, 0, 0.8) 4px, rgba(0, 0, 0, 0.8) 8px)",
                    borderLeft: "2px solid #ef4444"
                  }}
                  title="50% Capacity Locked Out (System Damage Level 4)"
                />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className={`flex items-center gap-1.5 ${hullPercent === 0 ? "text-red-500 font-bold" : hullPercent <= 60 ? "text-amber-400" : "text-emerald-400"}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${hullPercent === 0 ? "bg-red-600 animate-ping" : hullPercent <= 60 ? "bg-amber-400" : "bg-emerald-500"}`} /> HULL INTEGRITY
              </span>
              <span className="text-slate-200">
                {hull.current} / {isLevel4Damage ? `${effectiveMaxHull} (Base ${fullMaxHull})` : fullMaxHull} HP
              </span>
            </div>
            <div className="relative h-2.5 w-full bg-slate-950 rounded-sm overflow-hidden border border-bridge-border/40 flex">
              <div
                className={`h-full transition-all duration-300 ${getHullBarColor(hullPercent)}`}
                style={{ width: `${hullPercent}%` }}
              />
              {isLevel4Damage && (
                <div
                  className="absolute right-0 top-0 bottom-0 pointer-events-none"
                  style={{
                    width: "50%",
                    background: "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.4) 4px, rgba(0, 0, 0, 0.8) 4px, rgba(0, 0, 0, 0.8) 8px)",
                    borderLeft: "2px solid #ef4444"
                  }}
                  title="50% Capacity Locked Out (System Damage Level 4)"
                />
              )}
            </div>
          </div>
        </div>

        {/* DESTRUCTION SAVING THROW TRACKER */}
        {hull.current === 0 && (
          <div className="mb-4 bg-red-950/40 border-2 border-red-500/70 p-4 rounded space-y-3 shadow-[0_0_20px_rgba(255,0,0,0.2)] animate-pulse">
            <div className="flex justify-between items-center border-b border-red-500/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <h4 className="text-xs font-bold text-red-400 tracking-[0.2em] uppercase font-mono">
                  Destruction Saving Throw Protocol (0 HP)
                </h4>
              </div>
              <button
                onClick={handleResetDestructionSaves}
                className="text-[9px] font-mono text-slate-400 hover:text-slate-200 bg-black/40 px-2 py-0.5 rounded border border-bridge-border cursor-pointer"
              >
                Reset Trackers
              </button>
            </div>

            {hasHoldTogether && (
              <div className="bg-emerald-950/50 border border-emerald-500/50 p-2 rounded text-[11px] font-mono text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  ★ <strong>Hold Together Active (Tier 3 Feature):</strong> When your ship takes damage while at 0 hull points, it makes a Destruction saving throw instead of automatically failing!
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="bg-black/60 p-3 rounded border border-red-500/40 text-center">
                <span className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Vessel Status</span>
                <span className={`text-xs font-mono font-black tracking-wider ${destructionSaves.isStable ? "text-emerald-400" : "text-red-400"}`}>
                  {destructionSaves.isStable ? "STABLE (DISABLED)" : "CRITICAL / UNSTABLE"}
                </span>
                <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                  {destructionSaves.isStable ? "Stopped making saves" : "Roll 10+ to succeed"}
                </span>
              </div>

              <div className="space-y-2 bg-black/60 p-3 rounded border border-bridge-border/40">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-cyan-neon">Successes ({destructionSaves.successes}/3):</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={`succ-${num}`}
                        onClick={() => handleSetSuccessesCount(num)}
                        title="Click to manually toggle success count"
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors cursor-pointer ${
                          num <= destructionSaves.successes 
                            ? "bg-cyan-neon text-black border-cyan-300 shadow-[0_0_8px_rgba(0,255,255,0.5)]" 
                            : "bg-slate-900 text-slate-400 border border-bridge-border hover:border-cyan-neon/50"
                        }`}
                      >
                        {num <= destructionSaves.successes ? "✓" : num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono pt-1.5 border-t border-bridge-border/40">
                  <span className="text-red-400">Failures ({destructionSaves.failures}):</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={`fail-${num}`}
                        onClick={() => handleSetFailuresCount(num)}
                        title="Click to manually toggle failure count"
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors cursor-pointer ${
                          num <= destructionSaves.failures 
                            ? "bg-red-600 text-white border-red-400 shadow-[0_0_8px_rgba(255,0,0,0.5)]" 
                            : "bg-slate-900 text-slate-400 border border-bridge-border hover:border-red-500/50"
                        }`}
                      >
                        {num <= destructionSaves.failures ? "✕" : num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRollDestructionSave}
                  disabled={destructionSaves.isStable}
                  className="w-full rounded border border-red-500/60 bg-red-500/20 py-2 text-[10px] font-bold text-red-300 hover:bg-red-500/30 disabled:opacity-30 tracking-wider font-mono shadow-[0_0_10px_rgba(255,0,0,0.3)] cursor-pointer"
                >
                  🎲 ROLL DESTRUCTION SAVE (d20)
                </button>
                {destructionSaves.lastRoll !== null && (
                  <div className="text-[10px] font-mono text-center text-slate-200 bg-black/60 p-1.5 rounded border border-bridge-border/40">
                    {destructionSaves.lastResultText}
                  </div>
                )}
                {destructionSaves.lastRoll === null && (
                  <div className="text-[9px] font-mono text-center text-muted-foreground bg-black/40 p-1.5 rounded border border-bridge-border/40">
                    Tip: Click numbers directly to track physical dice rolls!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PRIMARY SHIELDS & REGENERATE ACTION */}
          <div className="bg-black/50 p-4 rounded border border-bridge-border/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-cyan-neon uppercase font-mono">Primary &amp; Temporary Shields</h4>
                <div className={`text-xs font-mono font-bold ${totalEffectivePercent === 0 ? "text-red-400" : shipShields.temp > 0 ? "text-white" : regularPercent <= 60 ? "text-amber-300" : "text-cyan-neon"}`}>
                  {shipShields.current} / {isLevel4Damage ? `${effectiveMaxShields} (Base ${fullMaxShields})` : fullMaxShields} SP {shipShields.temp > 0 && <span className="text-white font-extrabold">(+{shipShields.temp} Temp)</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-3">
                <button
                  onClick={() => handleAdjustTotalShields(-5)}
                  className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 font-mono cursor-pointer"
                  title="Damage: depletes Temp SP first, then regular SP, then overflows to Hull"
                >
                  -5 SP
                </button>
                <button
                  onClick={() => handleAdjustTotalShields(-1)}
                  className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 font-mono cursor-pointer"
                  title="Damage: depletes Temp SP first, then regular SP, then overflows to Hull"
                >
                  -1 SP
                </button>
                <button
                  onClick={() => handleAdjustTotalShields(1)}
                  className="flex-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 py-1 text-[10px] font-bold text-cyan-neon hover:bg-cyan-neon/20 font-mono cursor-pointer"
                  title="Recharge: heals regular SP up to max"
                >
                  +1 SP
                </button>
                <button
                  onClick={() => handleAdjustTotalShields(5)}
                  className="flex-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 py-1 text-[10px] font-bold text-cyan-neon hover:bg-cyan-neon/20 font-mono cursor-pointer"
                  title="Recharge: heals regular SP up to max"
                >
                  +5 SP
                </button>
              </div>

              {/* TEMPORARY SHIELDS TOGGLES */}
              <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded border border-bridge-border/40 mb-3 text-xs font-mono">
                <span className="text-[10px] text-white uppercase font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#00ffff]" />
                  Temporary SP: {shipShields.temp}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const newTemp = Math.max(0, shipShields.temp - 5)
                      setShipShields(prev => ({ ...prev, temp: newTemp }))
                      onShieldChange?.(shipShields.current, shipShields.max, newTemp)
                    }}
                    className="px-2 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => {
                      const newTemp = Math.max(0, shipShields.temp - 1)
                      setShipShields(prev => ({ ...prev, temp: newTemp }))
                      onShieldChange?.(shipShields.current, shipShields.max, newTemp)
                    }}
                    className="px-2 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => {
                      const newTemp = shipShields.temp + 1
                      setShipShields(prev => ({ ...prev, temp: newTemp }))
                      onShieldChange?.(shipShields.current, shipShields.max, newTemp)
                    }}
                    className="px-2 py-0.5 text-[9px] bg-cyan-950 hover:bg-cyan-900 border border-cyan-200/40 rounded text-white font-bold cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => {
                      const newTemp = shipShields.temp + 5
                      setShipShields(prev => ({ ...prev, temp: newTemp }))
                      onShieldChange?.(shipShields.current, shipShields.max, newTemp)
                    }}
                    className="px-2 py-0.5 text-[9px] bg-cyan-950 hover:bg-cyan-900 border border-cyan-200/40 rounded text-white font-bold cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* REGENERATE SHIELDS ACTION BLOCK */}
              <div className="my-3 bg-cyan-950/20 p-3 rounded border border-cyan-neon/40 space-y-2.5">
                <div className="flex justify-between items-center border-b border-cyan-neon/30 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-cyan-neon uppercase tracking-wider">
                      ⚡ Regenerate Shields (Action)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground">DC: <strong className="text-cyan-neon">{targetDC}</strong> (Missing: {missingShieldPoints})</span>
                    {hasRegeneratedThisTurn && (
                      <button
                        onClick={handleResetRegenTurn}
                        className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                        title="Reset once-per-turn limit"
                      >
                        Reset Turn
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono bg-black/40 px-2.5 py-1.5 rounded border border-bridge-border/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-200 font-bold uppercase">Boost</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-neon/20 text-cyan-neon border border-cyan-neon/40 font-bold">
                      P
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground">Str ({strModifier >= 0 ? `+${strModifier}` : strModifier}) + Prof (+{proficiencyBonus})</span>
                    <span className="font-bold text-cyan-neon text-xs">+{boostCheckBonus}</span>
                  </div>
                </div>

                {hasRegeneratedThisTurn ? (
                  <div className="bg-black/60 p-2 rounded border border-bridge-border/40 text-[10px] font-mono text-amber-300 text-center">
                    Action already taken this turn. {regenLog}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleExecuteShieldRegeneration(false)}
                        className="rounded border border-cyan-neon/60 bg-cyan-neon/20 py-1.5 text-[10px] font-bold text-cyan-neon hover:bg-cyan-neon/30 uppercase font-mono tracking-wide shadow-[0_0_8px_rgba(0,255,255,0.2)] cursor-pointer"
                      >
                        🎲 Auto Roll (d20 + {shipShields.sdType})
                      </button>

                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder={`Manual ${shipShields.sdType}`}
                          value={manualRollInput}
                          onChange={(e) => setManualRollInput(e.target.value)}
                          className="w-full bg-black border border-bridge-border text-[10px] font-mono text-slate-200 rounded px-1.5 py-1 text-center"
                        />
                        <button
                          onClick={() => {
                            const val = parseInt(manualRollInput, 10)
                            if (!isNaN(val)) handleExecuteShieldRegeneration(true, val)
                          }}
                          className="px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 uppercase font-mono cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground leading-tight">
                      *<strong>Two-part process:</strong> Strength (Boost) check vs DC {targetDC}. On success, roll Shield Die. On failure, roll twice and take lesser.{isLevel4Damage && " (All shield healing halved at Lvl 4 damage)."}
                    </p>
                  </div>
                )}
              </div>

              {/* AUTO SHIELD REGENERATION SECTION */}
              <div className="my-3 bg-black/60 p-3 rounded border border-bridge-border/60 space-y-3">
                <div className="flex items-center justify-between border-b border-bridge-border/40 pb-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-cyan-neon uppercase tracking-wider block">
                        Auto Shield Regeneration System
                      </span>
                      {isAttackFighterMastery && (
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold uppercase">
                          2X RATE (ATTACK FIGHTER)
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground block">
                      Continuous background recharge sequence {isLevel4Damage ? "— Halved at Lvl 4 damage" : ""}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setIsAutoRegenActive(true)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all tracking-wider cursor-pointer ${
                        isAutoRegenActive 
                          ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500 shadow-[0_0_10px_rgba(168,185,129,0.3)]" 
                          : "bg-slate-900 text-slate-400 border border-bridge-border hover:border-emerald-500/50"
                      }`}
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => setIsAutoRegenActive(false)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all tracking-wider cursor-pointer ${
                        !isAutoRegenActive 
                          ? "bg-red-500/30 text-red-300 border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                          : "bg-slate-900 text-slate-400 border border-bridge-border hover:border-red-500/50"
                      }`}
                    >
                      Deactivate
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-300">Activation Threshold:</span>
                    <span className="text-cyan-neon font-bold">{regenThresholdPct}% SP</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={regenThresholdPct}
                    onChange={(e) => setRegenThresholdPct(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-neon cursor-pointer bg-slate-900 h-1.5 rounded"
                  />
                </div>

                {isAutoRegenActive && (
                  <div className="bg-amber-950/40 border border-amber-500/50 p-2 rounded text-[9px] font-mono text-amber-300 leading-snug animate-pulse">
                    ⚠️ <strong>WARNING:</strong> Auto-Regeneration active below {regenThresholdPct}% SP. Consumes 1 shield die per cycle {isLevel4Damage ? "(halved at Lvl 4 damage)" : ""}.
                  </div>
                )}
              </div>

              {/* SHIELD DICE TRACKER */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-bridge-border/40 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Shield Dice ({shipShields.sdType})</span>
                  <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded border border-bridge-border/40">
                    <span>Spent: {spentShieldDice} / {shipShields.totalSD}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (onSpentShieldDiceChange) {
                            onSpentShieldDiceChange((prev: number) => Math.max(0, prev - 1))
                          }
                        }}
                        className="px-1.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => {
                          if (onSpentShieldDiceChange) {
                            onSpentShieldDiceChange((prev: number) => Math.min(shipShields.totalSD, prev + 1))
                          }
                        }}
                        className="px-1.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Shield Resistances</span>
                  <div className="bg-black/40 px-2.5 py-1.5 rounded border border-bridge-border/40 text-[10px] text-cyan-300 font-mono">
                    {shieldResistancesList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {shieldResistancesList.map((res, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/40 rounded">
                            {res}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Standard (No Resistances)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STRUCTURAL HULL */}
          <div className="bg-black/50 p-4 rounded border border-bridge-border/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-cyan-neon uppercase font-mono">Hull Integrity</h4>
                <span className={`text-xs font-mono font-bold ${hullPercent === 0 ? "text-red-500" : hullPercent <= 60 ? "text-amber-400" : "text-emerald-400"}`}>
                  {hull.current} / {isLevel4Damage ? `${effectiveMaxHull} (Base ${fullMaxHull})` : fullMaxHull} HP
                </span>
              </div>

              <div className="flex items-center gap-1.5 mb-4">
                <button
                  onClick={() => handleAdjustHull(-5)}
                  className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 font-mono cursor-pointer"
                  title="Direct Hull Damage (bypasses shields)"
                >
                  -5 HP
                </button>
                <button
                  onClick={() => handleAdjustHull(-1)}
                  className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 font-mono cursor-pointer"
                  title="Direct Hull Damage (bypasses shields)"
                >
                  -1 HP
                </button>
                <button
                  onClick={() => handleAdjustHull(1)}
                  className="flex-1 rounded border border-emerald-500/40 bg-emerald-500/10 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 font-mono cursor-pointer"
                >
                  +1 HP
                </button>
                <button
                  onClick={() => handleAdjustHull(5)}
                  className="flex-1 rounded border border-emerald-500/40 bg-emerald-500/10 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 font-mono cursor-pointer"
                >
                  +5 HP
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-bridge-border/40 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Hit Dice ({hull.hdType})</span>
                  <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded border border-bridge-border/40">
                    <span>Spent: {spentHullDice} / {hull.totalHD}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onSpentHullDiceChange?.(Math.max(0, spentHullDice - 1))}
                        className="px-1.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => onSpentHullDiceChange?.(Math.min(hull.totalHD, spentHullDice + 1))}
                        className="px-1.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Hull Resistances</span>
                  <div className="bg-black/40 px-2.5 py-1.5 rounded border border-bridge-border/40 text-[10px] text-emerald-300 font-mono">
                    {hullResistancesList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {hullResistancesList.map((res, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-500/40 rounded">
                            {res}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Standard (No Resistances)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SHIP SYSTEM DAMAGE (LEVELS 0-6) & ACTIVE STATUSES */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* REVISED SYSTEM DAMAGE LEVEL COUNTER */}
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-bridge-border/60 pb-1">
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                System Damage
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                systemDamageLevel === 0
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                  : systemDamageLevel <= 2
                  ? "border-amber-400 bg-amber-500/20 text-amber-300"
                  : "border-red-500 bg-red-500/20 text-red-300 animate-pulse"
              }`}>
                LEVEL {systemDamageLevel} / 6
              </span>
            </div>

            <div className="bg-black/50 p-4 rounded border border-bridge-border/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-mono font-bold text-white block">
                    {currentDamageDefinition.title}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Cumulative system breakdown condition
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateSystemDamageLevel?.((prev) => Math.max(0, prev - 1))}
                    disabled={systemDamageLevel <= 0}
                    className="w-9 h-9 rounded bg-black/60 border border-bridge-border text-base font-bold font-mono text-slate-200 hover:text-cyan-neon hover:border-cyan-neon disabled:opacity-30 cursor-pointer flex items-center justify-center"
                    title="Repair / Decrease system damage level"
                  >
                    -1
                  </button>
                  <div className="w-10 h-9 rounded bg-black border border-cyan-neon/40 flex items-center justify-center font-mono font-black text-lg text-cyan-neon">
                    {systemDamageLevel}
                  </div>
                  <button
                    onClick={() => onUpdateSystemDamageLevel?.((prev) => Math.min(6, prev + 1))}
                    disabled={systemDamageLevel >= 6}
                    className="w-9 h-9 rounded bg-black/60 border border-bridge-border text-base font-bold font-mono text-slate-200 hover:text-red-400 hover:border-red-500 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                    title="Incur / Increase system damage level"
                  >
                    +1
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded border text-[11px] font-mono leading-relaxed ${
                systemDamageLevel === 0
                  ? "bg-black/40 border-bridge-border/40 text-slate-300"
                  : systemDamageLevel <= 2
                  ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                  : "bg-red-950/40 border-red-500/60 text-red-200"
              }`}>
                {currentDamageDefinition.effect}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                  <span>L0 (Nominal)</span>
                  <span>L3 (Combat Penalties)</span>
                  <span>L6 (Blackout)</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((lvl) => (
                    <span
                      key={lvl}
                      onClick={() => onUpdateSystemDamageLevel?.(lvl === systemDamageLevel ? lvl - 1 : lvl)}
                      title={`Click to set Level ${lvl}`}
                      className={`h-2.5 rounded-sm cursor-pointer transition-all ${
                        lvl <= systemDamageLevel
                          ? lvl <= 2
                            ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                            : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"
                          : "bg-slate-900 border border-bridge-border/40 hover:border-cyan-neon/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[9px] font-mono text-muted-foreground italic border-t border-bridge-border/30 pt-2 mt-3">
            *Levels are cumulative. Incurring damage while at Level 6 renders the vessel inoperable until full shipyard refit.
          </div>
        </section>

        {/* SHIP STATUSES */}
        <section className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-bridge-border/60 pb-1">
              <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase">
                Active Statuses &amp; Modifiers
              </h3>
              <span className="text-[9px] font-mono text-muted-foreground">
                {statuses.length} Active Condition{statuses.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
              {statuses.length > 0 ? (
                statuses.map((st) => (
                  <div key={st.id} className="flex items-center justify-between bg-black/50 p-2.5 rounded border border-bridge-border/60">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 uppercase font-mono">{st.title}</span>
                        <span className="text-[9px] font-mono bg-bridge-border/40 px-1.5 py-0.5 rounded text-slate-300">
                          {st.duration}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-mono leading-tight">{st.effect}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveStatusLocal(st.id)}
                      className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[9px] font-bold text-red-400 hover:bg-red-500/20 uppercase shrink-0 ml-2 font-mono cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground font-mono py-4 text-center">No active status penalties or buffs.</p>
              )}
            </div>

            <div className="bg-black/40 p-3 rounded border border-bridge-border/60 space-y-2.5">
              <span className="text-[10px] font-mono text-cyan-neon uppercase block tracking-wider">
                Apply Ship Status / Condition
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selectedStatusId}
                  onChange={(e) => setSelectedStatusId(e.target.value)}
                  className="bg-black border border-bridge-border text-[10px] font-mono text-slate-200 rounded px-2 py-1.5 uppercase cursor-pointer"
                >
                  {SHIP_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="Duration (e.g., 1 Round)"
                  className="bg-black border border-bridge-border text-[10px] font-mono text-slate-200 rounded px-2 py-1.5"
                />
              </div>

              {currentSelectedStatusMeta && !currentSelectedStatusMeta.hasLevels && (
                <p className="text-[10px] font-mono text-slate-300 bg-black/60 p-2 rounded border border-bridge-border/40 leading-snug">
                  {currentSelectedStatusMeta.defaultEffect}
                </p>
              )}

              {currentSelectedStatusMeta?.hasLevels && (
                <div className="space-y-1.5 pt-1 border-t border-bridge-border/40">
                  <p className="text-[10px] font-mono text-slate-300 bg-black/60 p-2 rounded border border-bridge-border/40 leading-snug">
                    {currentSelectedStatusMeta.defaultEffect}
                  </p>
                  <div className="flex justify-between items-center text-[10px] font-mono text-amber-300 pt-1">
                    <span>Slowed Severity Level:</span>
                    <span className="text-slate-200 font-bold">Level {selectedSlowLevel}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedSlowLevel(lvl)}
                        className={`py-1 text-[10px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                          selectedSlowLevel === lvl
                            ? "bg-amber-400 text-black border-amber-300"
                            : "bg-black/50 text-slate-300 border-bridge-border hover:border-amber-400/50"
                        }`}
                      >
                        Lvl {lvl}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-cyan-neon italic pt-1">
                    Effect: {currentSelectedStatusMeta.levels?.[selectedSlowLevel as keyof typeof currentSelectedStatusMeta.levels]}
                  </p>
                </div>
              )}

              <button
                onClick={handleAddStatusLocal}
                className="w-full mt-1 rounded border border-cyan-neon/40 bg-cyan-neon/10 py-1.5 text-[10px] font-bold text-cyan-neon hover:bg-cyan-neon/20 uppercase font-mono tracking-wider cursor-pointer"
              >
                + Apply Status to Ship
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 5. INSTALLED STATION MODIFICATIONS */}
      <section className="rounded-md border border-bridge-border bg-bridge-panel p-4">
        <h3 className="mb-3 text-xs font-bold tracking-[0.2em] text-cyan-neon uppercase border-b border-bridge-border/60 pb-1">
          Installed Station Modifications
        </h3>
        <StationModifications 
          station="Defense" 
          installedMods={installedMods} 
          onRemoveMod={onRemoveMod} 
        />
      </section>
    </div>
  )
}