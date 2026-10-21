import { SHIP_SIZE_RULES, type ShipSize } from "./ship-rules"

export interface RefitCalculationInput {
  shipSize: ShipSize
  missingHullDice: number
  maxHullPoints: number
  hasSystemFailure: boolean
  isUsedCondition: boolean
  attemptOverhaul: boolean
}

export interface RefitCalculationResult {
  hullRefitCost: number
  systemRepairCost: number
  overhaulCost: number
  totalCost: number
  downtime: string
}

export function calculateRefitCosts(input: RefitCalculationInput): RefitCalculationResult {
  const rule = SHIP_SIZE_RULES[input.shipSize?.toLowerCase() as ShipSize] || SHIP_SIZE_RULES.medium
  const modifier = rule.modifier

  // 1. Hull Dice Refit: 100 credits × Missing Hull Dice × Size Modifier
  const hullRefitCost = 100 * Math.max(0, input.missingHullDice) * modifier

  // 2. Primary Systems Repair: 10 credits × Max Hull Points × Size Modifier
  const systemRepairCost = input.hasSystemFailure 
    ? 10 * input.maxHullPoints * modifier 
    : 0

  // 3. "Used" Condition Overhaul: Same formula as system repair
  const overhaulCost = (input.isUsedCondition && input.attemptOverhaul)
    ? 10 * input.maxHullPoints * modifier 
    : 0

  const totalCost = hullRefitCost + systemRepairCost + overhaulCost

  return {
    hullRefitCost,
    systemRepairCost,
    overhaulCost,
    totalCost,
    downtime: rule.downtime,
  }
}