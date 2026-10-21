export type GalacticRegion =
  | "Deep Core"
  | "Core Worlds"
  | "Colonies"
  | "Inner Rim Territories"
  | "Expansion Region"
  | "Mid Rim Territories"
  | "Outer Rim Territories"
  | "Wild Space"
  | "Unknown Regions"
  | "Extragalactic"

export interface PlanetRecord {
  name: string
  region: GalacticRegion | string
  sector: string
  system: string
  inhabitants: string
  capitalCity: string
  gridCoordinates: string
}

export interface TravelDuration {
  isUnknown: boolean
  baseHours: number | null
  totalHours: number | null
  days: number | null
  weeks: number | null
  displayHours: string
  displayDays: string
  displayWeeks: string
  combinedDisplay: string
}

/**
 * Baseline travel times (in hours) between Galactic Regions at Hyperdrive Class 1.
 * Sourced directly from Helper Tables for SW5e App - Trav times.csv.
 * Extragalactic routes or undefined corridors yield null ("Unknown").
 */
export const TRAVEL_TIME_MATRIX: Record<GalacticRegion, Record<GalacticRegion, number | null>> = {
  "Deep Core": {
    "Deep Core": 12,
    "Core Worlds": 18,
    "Colonies": 24,
    "Inner Rim Territories": 48,
    "Expansion Region": 72,
    "Mid Rim Territories": 96,
    "Outer Rim Territories": 120,
    "Wild Space": 144,
    "Unknown Regions": 168,
    "Extragalactic": null,
  },
  "Core Worlds": {
    "Deep Core": 24,
    "Core Worlds": 6,
    "Colonies": 24,
    "Inner Rim Territories": 36,
    "Expansion Region": 60,
    "Mid Rim Territories": 84,
    "Outer Rim Territories": 96,
    "Wild Space": 120,
    "Unknown Regions": 144,
    "Extragalactic": null,
  },
  "Colonies": {
    "Deep Core": 48,
    "Core Worlds": 24,
    "Colonies": 12,
    "Inner Rim Territories": 24,
    "Expansion Region": 48,
    "Mid Rim Territories": 72,
    "Outer Rim Territories": 96,
    "Wild Space": 120,
    "Unknown Regions": 96,
    "Extragalactic": null,
  },
  "Inner Rim Territories": {
    "Deep Core": 72,
    "Core Worlds": 36,
    "Colonies": 24,
    "Inner Rim Territories": 18,
    "Expansion Region": 24,
    "Mid Rim Territories": 48,
    "Outer Rim Territories": 72,
    "Wild Space": 96,
    "Unknown Regions": 72,
    "Extragalactic": null,
  },
  "Expansion Region": {
    "Deep Core": 96,
    "Core Worlds": 60,
    "Colonies": 48,
    "Inner Rim Territories": 24,
    "Expansion Region": 24,
    "Mid Rim Territories": 24,
    "Outer Rim Territories": 48,
    "Wild Space": 72,
    "Unknown Regions": 96,
    "Extragalactic": null,
  },
  "Mid Rim Territories": {
    "Deep Core": 120,
    "Core Worlds": 84,
    "Colonies": 72,
    "Inner Rim Territories": 48,
    "Expansion Region": 24,
    "Mid Rim Territories": 36,
    "Outer Rim Territories": 24,
    "Wild Space": 48,
    "Unknown Regions": 72,
    "Extragalactic": null,
  },
  "Outer Rim Territories": {
    "Deep Core": 144,
    "Core Worlds": 96,
    "Colonies": 96,
    "Inner Rim Territories": 72,
    "Expansion Region": 48,
    "Mid Rim Territories": 24,
    "Outer Rim Territories": 48,
    "Wild Space": 24,
    "Unknown Regions": 60,
    "Extragalactic": null,
  },
  "Wild Space": {
    "Deep Core": 168,
    "Core Worlds": 120,
    "Colonies": 120,
    "Inner Rim Territories": 96,
    "Expansion Region": 72,
    "Mid Rim Territories": 48,
    "Outer Rim Territories": 24,
    "Wild Space": 12,
    "Unknown Regions": 120,
    "Extragalactic": null,
  },
  "Unknown Regions": {
    "Deep Core": 192,
    "Core Worlds": 144,
    "Colonies": 96,
    "Inner Rim Territories": 72,
    "Expansion Region": 60,
    "Mid Rim Territories": 72,
    "Outer Rim Territories": 96,
    "Wild Space": 120,
    "Unknown Regions": 48,
    "Extragalactic": null,
  },
  "Extragalactic": {
    "Deep Core": null,
    "Core Worlds": null,
    "Colonies": null,
    "Inner Rim Territories": null,
    "Expansion Region": null,
    "Mid Rim Territories": null,
    "Outer Rim Territories": null,
    "Wild Space": null,
    "Unknown Regions": null,
    "Extragalactic": null,
  },
}

/**
 * Calculates transit time between regions based on hyperdrive class multiplier.
 * Returns concurrent breakdowns in hours, days, and weeks.
 */
export function calculateTravelTime(
  originRegion: string,
  destRegion: string,
  hyperdriveClass: number = 1.0
): TravelDuration {
  const origin = originRegion as GalacticRegion
  const dest = destRegion as GalacticRegion

  const baseHours = TRAVEL_TIME_MATRIX[origin]?.[dest] ?? null

  if (baseHours === null || baseHours === undefined || hyperdriveClass <= 0) {
    return {
      isUnknown: true,
      baseHours: null,
      totalHours: null,
      days: null,
      weeks: null,
      displayHours: "Unknown",
      displayDays: "Unknown",
      displayWeeks: "Unknown",
      combinedDisplay: "Unknown Duration (Unmapped Corridor)",
    }
  }

  const totalHours = Math.round(baseHours * hyperdriveClass * 10) / 10
  const days = Math.round((totalHours / 24) * 10) / 10
  const weeks = Math.round((days / 7) * 100) / 100

  return {
    isUnknown: false,
    baseHours,
    totalHours,
    days,
    weeks,
    displayHours: `${totalHours} hrs`,
    displayDays: `${days} days`,
    displayWeeks: `${weeks} wks`,
    combinedDisplay: `${totalHours} Hours (${days} Days / ${weeks} Weeks)`,
  }
}

/**
 * Finds all other recorded planets sharing the exact same star system.
 */
export function getPlanetsInSystem(currentPlanet: PlanetRecord, allPlanets: PlanetRecord[]): PlanetRecord[] {
  if (!currentPlanet.system || currentPlanet.system.toLowerCase() === "unknown") return []
  return allPlanets.filter(
    (p) =>
      p.system.toLowerCase() === currentPlanet.system.toLowerCase() &&
      p.name.toLowerCase() !== currentPlanet.name.toLowerCase()
  )
}

/**
 * Finds all other recorded planets sharing the exact same administrative sector.
 */
export function getPlanetsInSector(currentPlanet: PlanetRecord, allPlanets: PlanetRecord[]): PlanetRecord[] {
  if (!currentPlanet.sector || currentPlanet.sector.toLowerCase() === "unknown") return []
  return allPlanets.filter(
    (p) =>
      p.sector.toLowerCase() === currentPlanet.sector.toLowerCase() &&
      p.name.toLowerCase() !== currentPlanet.name.toLowerCase()
  )
}