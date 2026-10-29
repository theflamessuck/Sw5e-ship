"use client"

import { useState, useEffect } from "react"
import { Coins, TrendingUp, ShieldAlert, CreditCard, Wrench, CheckCircle2, ChevronUp, PlusCircle, RotateCcw, Landmark, Trash2, Filter, PackagePlus } from "lucide-react"

export type ShipSize = "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan"

export interface Transaction {
  id: string
  date: string
  description: string
  category: "Income" | "Expense" | "Maintenance" | "Payroll" | "Refit" | "Supplies" | "Debt"
  amount: number
  type: "credit" | "debit"
}

// Hardcoded upgrade cost map for Tiers 1 through 5
const TIER_UPGRADE_COSTS: Record<number, number> = {
  1: 7800,
  2: 155000,
  3: 594000,
  4: 1240000,
  5: 2300000,
}

// Ship Size Modifiers & Downtime Requirements
const SIZE_MODIFIERS: Record<ShipSize, number> = {
  tiny: 0.5,
  small: 1,
  medium: 2,
  large: 5,
  huge: 10,
  gargantuan: 100,
}

const SIZE_DOWNTIME: Record<ShipSize, string> = {
  tiny: "4 Hours",
  small: "8 Hours",
  medium: "1 Day (24 Hours)",
  large: "1 Week",
  huge: "1 Month",
  gargantuan: "4 Months",
}

interface PendingOrdnanceItem {
  name: string
  qty: number
  cost: number
}

interface FinanceStationProps {
  externalPendingRefit?: number
  installedMods?: Array<{ cost: number; name: string; [key: string]: any }>
  externalBaseShipCost?: number
  externalShipCost?: number
  externalPaidAmount?: number
  externalShipTier?: number
  transactions?: Transaction[]
  onAddTransaction?: (newTx: Omit<Transaction, "id">) => void
  onUpgradePurchased?: (newTier: number) => void
  onUpdateTier?: (newTier: number) => void
  onTierReverted?: (targetTier: number) => void
  currentDay?: number
  shipSize?: ShipSize
  maxHullDice?: number
  currentHullDice?: number
  spentHullDice?: number 
  maxHullPoints?: number
  isUsedCondition?: boolean
  onUpdateUsedCondition?: (used: boolean) => void
  onResetSpentHullDice?: () => void
  currentFuel?: number
  maxFuel?: number
  externalPendingCharts?: number
  pendingOrdnanceCost?: number
  pendingOrdnanceItems?: PendingOrdnanceItem[]
  onPaymentSettlement?: (chartsIncluded: boolean, ordnanceIncluded?: boolean) => void
}

export function FinanceStation({
  externalPendingRefit,
  installedMods = [],
  externalBaseShipCost,
  externalShipCost,
  externalPaidAmount,
  externalShipTier = 0,
  transactions = [],
  onAddTransaction,
  onUpgradePurchased,
  onUpdateTier,
  onTierReverted,
  currentDay = 42,
  shipSize = "medium",
  maxHullDice = 10,
  currentHullDice = 10,
  spentHullDice,
  maxHullPoints = 120,
  isUsedCondition = false,
  onUpdateUsedCondition,
  onResetSpentHullDice,
  currentFuel = 30,
  maxFuel = 30,
  externalPendingCharts = 0,
  pendingOrdnanceCost = 0,
  pendingOrdnanceItems = [],
  onPaymentSettlement,
}: FinanceStationProps) {

  // Financial State
  const credits = transactions.reduce((acc, tx) => tx.type === "credit" ? acc + tx.amount : acc - tx.amount, 0)

  // Track Voided Transaction IDs
  const [voidedTxIds, setVoidedTxIds] = useState<string[]>([])

  // Ledger Filter State
  const [filterDayFrom, setFilterDayFrom] = useState<string>("")
  const [filterDayTo, setFilterDayTo] = useState<string>("")

  // Upgrade Confirmation State
  const [isConfirmingUpgrade, setIsConfirmingUpgrade] = useState<boolean>(false)

  // Refit Interactive Options State
  const [repairSystemFailure, setRepairSystemFailure] = useState<boolean>(false)
  const [attemptOverhaul, setAttemptOverhaul] = useState<boolean>(false)

  // Asset Valuation & Debt Baseline
  const baseShipCost = externalShipCost !== undefined ? externalShipCost : externalBaseShipCost !== undefined ? externalBaseShipCost : undefined

  const totalModsCost = installedMods.reduce((sum, mod) => sum + mod.cost, 0)
  
  const initialPaidShip = externalPaidAmount !== undefined ? externalPaidAmount : externalShipCost !== undefined ? externalShipCost : externalBaseShipCost !== undefined ? externalBaseShipCost : undefined

  const [amountPaidShip, setAmountPaidShip] = useState<number | undefined>(initialPaidShip)

  useEffect(() => {
    if (externalPaidAmount !== undefined) {
      setAmountPaidShip(externalPaidAmount)
    } else if (externalShipCost !== undefined) {
      setAmountPaidShip(externalShipCost)
    } else if (externalBaseShipCost !== undefined) {
      setAmountPaidShip(externalBaseShipCost)
    }
  }, [externalPaidAmount, externalShipCost, externalBaseShipCost])
  
  const effectivePaidMods = totalModsCost
  const [debtPaymentAmount, setDebtPaymentAmount] = useState<string>("")

  const totalInvested = (typeof amountPaidShip === 'number' && !isNaN(amountPaidShip) ? amountPaidShip : 0) + effectivePaidMods
  const shipDebt = (typeof baseShipCost === 'number' && !isNaN(baseShipCost) && typeof amountPaidShip === 'number' && !isNaN(amountPaidShip)) ? baseShipCost - amountPaidShip : NaN
  const modsDebt = 0 
  const totalOutstanding = (!isNaN(shipDebt) ? shipDebt : 0) + modsDebt
  
  const rawShipValue = (typeof baseShipCost === 'number' && !isNaN(baseShipCost) ? baseShipCost : 0) + totalModsCost
  const finalShipValue = !isNaN(rawShipValue) ? (isUsedCondition ? rawShipValue / 2 : rawShipValue) : NaN
  const netEquity = !isNaN(finalShipValue) && !isNaN(totalOutstanding) ? finalShipValue - totalOutstanding : NaN

  // Dynamic Refit Calculations
  const normalizedSize = (shipSize || "medium").toLowerCase() as ShipSize
  const sizeModifier = SIZE_MODIFIERS[normalizedSize] ?? 2
  const requiredDowntime = SIZE_DOWNTIME[normalizedSize] ?? "1 Day (24 Hours)"

  // Baseline port refit service charge (100 cr * sizeModifier: 200 cr for Medium)
  const baseRefitFee = 100 * sizeModifier
  const effectiveSpentDice = spentHullDice !== undefined ? spentHullDice : Math.max(0, maxHullDice - currentHullDice)
  const calculatedHullRefit = 100 * effectiveSpentDice * sizeModifier
  const systemRepairCost = repairSystemFailure ? 10 * maxHullPoints * sizeModifier : 0
  const overhaulCost = (isUsedCondition && attemptOverhaul) ? 10 * maxHullPoints * sizeModifier : 0

  const calculatedTotalRefit = baseRefitFee + calculatedHullRefit + systemRepairCost + overhaulCost

  const pendingRefit = externalPendingRefit !== undefined && externalPendingRefit > 0 ? externalPendingRefit : calculatedTotalRefit
  
  const fuelCostPerUnit = 100
  const effectiveMaxFuel = maxFuel ?? 30
  const effectiveCurrentFuel = currentFuel ?? 30
  const fuelSpent = Math.max(0, effectiveMaxFuel - effectiveCurrentFuel)
  const pendingRefuel = fuelSpent * fuelCostPerUnit

  const [restockCreatures, setRestockCreatures] = useState<number>(5)
  const [restockDays, setRestockDays] = useState<number>(10)
  const restockCostRate = 10
  const pendingRestock = restockCreatures * restockDays * restockCostRate

  const [dockDays, setDockDays] = useState<number>(5)
  const dockingFeeRate = 20
  const pendingDocking = dockDays * dockingFeeRate

  const [includeCharts, setIncludeCharts] = useState<boolean>(true)
  const chartFeeRate = 150
  const baseChartFee = externalPendingCharts !== undefined && externalPendingCharts > 0 ? externalPendingCharts : chartFeeRate
  const pendingCharts = includeCharts ? baseChartFee : 0

  const totalPendingCosts = pendingRefit + pendingRefuel + pendingRestock + pendingDocking + pendingCharts + pendingOrdnanceCost

  // Custom Income State
  const [customDesc, setCustomDesc] = useState<string>("")
  const [customAmount, setCustomAmount] = useState<string>("")

  const handleReceiveIncome = (description: string, amount: number) => {
    if (amount <= 0) return
    if (onAddTransaction) {
      onAddTransaction({ date: `Day ${currentDay}`, description: description, category: "Income", amount: amount, type: "credit" })
    }
  }

  const handleCustomIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseFloat(customAmount)
    if (!customDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return
    handleReceiveIncome(customDesc.trim(), parsedAmount)
    setCustomDesc("")
    setCustomAmount("")
  }

  const handleCancelTransaction = (tx: Transaction) => {
    if (!onAddTransaction || voidedTxIds.includes(tx.id)) return
    setVoidedTxIds((prev) => [...prev, tx.id])
    const reversalType = tx.type === "credit" ? "debit" : "credit"
    const actionLabel = tx.type === "credit" ? "Retraction" : "Refund"
    onAddTransaction({ date: `Day ${currentDay}`, description: `[VOID] ${actionLabel}: ${tx.description}`, category: tx.category, amount: tx.amount, type: reversalType })
  }

  const handlePayDebt = (e: React.FormEvent) => {
    e.preventDefault()
    const payment = parseFloat(debtPaymentAmount)
    if (isNaN(payment) || payment <= 0) return

    if (credits < payment) {
      alert("Insufficient operational credits available to make this debt payment!")
      return
    }

    if (isNaN(totalOutstanding) || payment > totalOutstanding) {
      alert("Payment exceeds total remaining outstanding debt or debt baseline is uninitialized!")
      return
    }

    let remainingPayment = payment
    let newPaidShip = amountPaidShip || 0

    if (!isNaN(shipDebt) && shipDebt > 0) {
      const shipChunk = Math.min(shipDebt, remainingPayment)
      newPaidShip += shipChunk
      remainingPayment -= shipChunk
      setAmountPaidShip(newPaidShip)
    }

    if (onAddTransaction) {
      onAddTransaction({ date: `Day ${currentDay}`, description: `Principal Debt Paydown (${payment.toLocaleString()} CR)`, category: "Debt", amount: payment, type: "debit" })
    }

    setDebtPaymentAmount("")
  }

  const handleInitiateUpgrade = () => {
    if (externalShipTier >= 5) return

    const nextLevel = externalShipTier + 1
    const upgradeCost = TIER_UPGRADE_COSTS[nextLevel]

    if (credits < upgradeCost) {
      alert(`Insufficient funds! Upgrading to Tier ${nextLevel} requires ${upgradeCost.toLocaleString()} CR.`)
      return
    }

    setIsConfirmingUpgrade(true)
  }

  const handleConfirmUpgrade = () => {
    const nextLevel = externalShipTier + 1
    const upgradeCost = TIER_UPGRADE_COSTS[nextLevel]

    setIsConfirmingUpgrade(false)

    if (onAddTransaction) {
      onAddTransaction({
        date: `Day ${currentDay}`,
        description: `Ship Systems Upgrade: Advanced to Tier ${nextLevel}`,
        category: "Refit",
        amount: upgradeCost,
        type: "debit"
      })
    }

    if (onUpdateTier) {
      onUpdateTier(nextLevel)
    }

    if (onUpgradePurchased) {
      onUpgradePurchased(nextLevel)
    }
  }

  const handleCancelUpgrade = () => {
    setIsConfirmingUpgrade(false)
  }

  const handleRevertTier = () => {
    if (externalShipTier <= 0) return

    const currentTierCost = TIER_UPGRADE_COSTS[externalShipTier]
    const targetLevel = externalShipTier - 1

    setIsConfirmingUpgrade(false)

    if (onAddTransaction) {
      onAddTransaction({
        date: `Day ${currentDay}`,
        description: `Ship Systems Reversal: Rolled back from Tier ${externalShipTier} to Tier ${targetLevel}`,
        category: "Refit",
        amount: currentTierCost,
        type: "credit"
      })
    }

    if (onUpdateTier) {
      onUpdateTier(targetLevel)
    }

    if (onTierReverted) {
      onTierReverted(targetLevel)
    }
  }

  const handlePayServices = () => {
    if (totalPendingCosts < 0) return
    if (totalPendingCosts > 0 && credits < totalPendingCosts) {
      alert("Insufficient operational credits available to settle all services!")
      return
    }

    const settlementTimestamp = `Day ${currentDay}`
    const chartsWerePaid = includeCharts && pendingCharts > 0
    const ordnanceWasPaid = pendingOrdnanceCost > 0

    if (onAddTransaction) {
      if (pendingRefit > 0) onAddTransaction({ date: settlementTimestamp, description: `Port Services: Refit Cost (${requiredDowntime} downtime)`, category: "Refit", amount: pendingRefit, type: "debit", id: `${Date.now()}-1` } as any)
      if (pendingRefuel > 0) onAddTransaction({ date: settlementTimestamp, description: `Port Services: Refuel Cost (${fuelSpent} units)`, category: "Supplies", amount: pendingRefuel, type: "debit", id: `${Date.now()}-2` } as any)
      if (pendingRestock > 0) onAddTransaction({ date: settlementTimestamp, description: `Port Services: Restock Cost (${restockCreatures} creatures, ${restockDays} days)`, category: "Supplies", amount: pendingRestock, type: "debit", id: `${Date.now()}-3` } as any)
      if (pendingDocking > 0) onAddTransaction({ date: settlementTimestamp, description: `Port Services: Docking Fees (${dockDays} days)`, category: "Expense", amount: pendingDocking, type: "debit", id: `${Date.now()}-4` } as any)
      if (chartsWerePaid) onAddTransaction({ date: settlementTimestamp, description: `Port Services: Star Chart Fees & Astrogation Update`, category: "Supplies", amount: pendingCharts, type: "debit", id: `${Date.now()}-5` } as any)
      
      if (ordnanceWasPaid && pendingOrdnanceItems.length > 0) {
        const itemSummary = pendingOrdnanceItems.map((item) => `${item.qty}x ${item.name}`).join(", ")
        onAddTransaction({
          date: settlementTimestamp,
          description: `Port Services: Ordnance Requisition (${itemSummary})`,
          category: "Supplies",
          amount: pendingOrdnanceCost,
          type: "debit",
          id: `${Date.now()}-6`
        } as any)
      }

      if (pendingRefit === 0) {
        onAddTransaction({ date: settlementTimestamp, description: `Standard Maintenance & Refit Completed`, category: "Refit", amount: 0, type: "debit", id: `${Date.now()}-7` } as any)
      }
    }

    // Overhaul settlement removes "Used" condition upon payment
    if (isUsedCondition && attemptOverhaul) {
      onUpdateUsedCondition?.(false)
      setAttemptOverhaul(false)
    }

    onPaymentSettlement?.(chartsWerePaid, ordnanceWasPaid)

    if (effectiveSpentDice > 0 && onResetSpentHullDice) {
      onResetSpentHullDice()
    }

    setRestockDays(0)
    setDockDays(0)
    setIncludeCharts(false)
  }

  const filteredTransactions = transactions.filter((tx) => {
    const match = tx.date.match(/Day\s+(\d+)/i)
    if (!match) return true
    const txDay = parseInt(match[1], 10)

    if (filterDayFrom !== "" && txDay < parseInt(filterDayFrom, 10)) return false
    if (filterDayTo !== "" && txDay > parseInt(filterDayTo, 10)) return false
    return true
  })

  const nextTierCost = externalShipTier < 5 ? TIER_UPGRADE_COSTS[externalShipTier + 1] : 0
  const hasEnoughForUpgrade = externalShipTier < 5 && credits >= nextTierCost

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* Top Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-md border border-bridge-border bg-bridge-panel p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-cyan-neon" />
            <h2 className="text-glow-cyan text-sm font-bold tracking-[0.25em] text-cyan-neon">
              SHIP FINANCE & ACCOUNTS CONSOLE
            </h2>
          </div>
          <p className="text-xs tracking-wider text-muted-foreground/70 mt-1">
            ASSET VALUATION, LEDGER AUDITING, AND PORT SERVICE SETTLEMENTS
          </p>
        </div>
        
        {/* Available Credits Card */}
        <div className="flex items-center gap-4 rounded border border-cyan-neon/30 bg-cyan-neon/5 px-4 py-2">
          <div>
            <span className="text-[10px] tracking-widest text-muted-foreground block">AVAILABLE BALANCE</span>
            <span className="text-xl font-bold tracking-wider text-cyan-neon">
              {credits.toLocaleString()} <span className="text-xs font-normal">CR</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Asset Valuation & Service Queue */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        
        {/* Left Column: Asset & Equity Breakdown */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-md border border-bridge-border bg-bridge-panel p-4">
            <div className="flex items-center justify-between pb-3 border-b border-bridge-border mb-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-neon" />
                ASSET VALUATION & EQUITY MATRIX
              </h3>
              
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-[10px] font-bold tracking-widest rounded border font-mono ${
                    isUsedCondition 
                      ? "border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)] animate-pulse" 
                      : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  STATUS: {isUsedCondition ? "USED (-50% VALUE)" : "PRISTINE / NEW"}
                </span>

                {isUsedCondition && (
                  <button
                    onClick={() => onUpdateUsedCondition?.(false)}
                    title="GM / Shipyard Override: Clear Used condition back to Pristine"
                    className="px-2 py-1 text-[9px] font-bold rounded border border-bridge-border bg-black/40 text-muted-foreground hover:text-white cursor-pointer"
                  >
                    Reset to Pristine
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 font-mono">
              <div className="rounded border border-bridge-border p-3 bg-black/20">
                <span className="text-[10px] text-muted-foreground block mb-1">TOTAL SHIP COST</span>
                <span className="text-sm font-bold text-foreground">
                  {typeof baseShipCost === 'number' && !isNaN(baseShipCost) ? `${baseShipCost.toLocaleString()} CR` : "PROP ERROR"}
                </span>
                <div className="text-[9px] text-muted-foreground mt-1">
                  Paid: {typeof amountPaidShip === 'number' && !isNaN(amountPaidShip) ? `${amountPaidShip.toLocaleString()} CR` : "PROP ERROR"}
                </div>
              </div>
              <div className="rounded border border-bridge-border p-3 bg-black/20">
                <span className="text-[10px] text-muted-foreground block mb-1">INSTALLED MODS VALUE</span>
                <span className="text-sm font-bold text-cyan-neon">{totalModsCost.toLocaleString()} CR</span>
                <div className="text-[9px] text-muted-foreground mt-1">{installedMods.length} Active Mod(s)</div>
              </div>
              <div className="rounded border border-bridge-border p-3 bg-black/20">
                <span className="text-[10px] text-muted-foreground block mb-1">TOTAL SHIP VALUE</span>
                <span className={`text-sm font-bold ${isUsedCondition ? "text-amber-400" : "text-foreground"}`}>
                  {!isNaN(finalShipValue) ? `${finalShipValue.toLocaleString()} CR` : "PROP ERROR"}
                </span>
                <div className="text-[9px] text-muted-foreground mt-1">
                  {isUsedCondition ? "50% Used Penalty Active" : `Invested: ${totalInvested.toLocaleString()} CR`}
                </div>
              </div>
              <div className="rounded border border-bridge-border p-3 bg-black/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">VESSEL TIER</span>
                  <span className="text-sm font-bold text-amber-400">Tier {externalShipTier} / 5</span>
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  {externalShipTier < 5 ? `Next: ${nextTierCost.toLocaleString()} CR` : "Max Tier Reached"}
                </div>
              </div>
            </div>

            {/* Ship Level Upgrade Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded border border-cyan-neon/30 bg-cyan-neon/5 mb-6 font-mono">
              <div>
                <span className="text-xs font-bold text-cyan-neon block uppercase tracking-wider">
                  {externalShipTier < 5 ? `Upgrade to Tier ${externalShipTier + 1}` : "Maximum Vessel Tier Achieved"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {externalShipTier < 5 
                    ? `Required investment: ${nextTierCost.toLocaleString()} CR` 
                    : "All structural upgrade brackets fully unlocked."}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {externalShipTier > 0 && !isConfirmingUpgrade && (
                  <button
                    onClick={handleRevertTier}
                    title="Roll back ship tier and refund upgrade cost"
                    className="px-3 py-2 rounded border border-amber-500/50 bg-amber-500/10 text-xs font-bold text-amber-400 hover:bg-amber-500/20 uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Revert Tier
                  </button>
                )}

                {!isConfirmingUpgrade ? (
                  <button
                    onClick={handleInitiateUpgrade}
                    disabled={externalShipTier >= 5 || !hasEnoughForUpgrade}
                    className="flex-1 sm:flex-none px-4 py-2 rounded border border-cyan-neon/60 bg-cyan-neon/20 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 disabled:opacity-40 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ChevronUp className="h-4 w-4" />
                    {externalShipTier >= 5 ? "Max Tier" : `Level Up (${nextTierCost.toLocaleString()} CR)`}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[10px] text-amber-400 font-bold uppercase animate-pulse">Confirm?</span>
                    <button
                      onClick={handleConfirmUpgrade}
                      className="px-3 py-2 rounded border border-emerald-500/60 bg-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 uppercase cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      onClick={handleCancelUpgrade}
                      className="px-3 py-2 rounded border border-rose-500/60 bg-rose-500/20 text-xs font-bold text-rose-400 hover:bg-rose-500/30 uppercase cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Health Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
              <div className="flex items-center justify-between p-3 rounded border border-bridge-border bg-black/40">
                <div>
                  <span className="text-[10px] text-muted-foreground block">TOTAL OUTSTANDING DEBT</span>
                  <span className={`text-xs font-bold ${!isNaN(totalOutstanding) && totalOutstanding > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {!isNaN(totalOutstanding) ? `${totalOutstanding.toLocaleString()} CR` : "PROP ERROR"}
                  </span>
                </div>
                <ShieldAlert className={`h-5 w-5 ${!isNaN(totalOutstanding) && totalOutstanding > 0 ? "text-rose-400/60" : "text-emerald-400/60"}`} />
              </div>
              <div className="flex items-center justify-between p-3 rounded border border-bridge-border bg-black/40">
                <div>
                  <span className="text-[10px] text-muted-foreground block">NET VESSEL EQUITY</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {!isNaN(netEquity) ? `${netEquity.toLocaleString()} CR` : "PROP ERROR"}
                  </span>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-400/60" />
              </div>
            </div>
          </div>

          {/* Outstanding Debt Settlement Console */}
          <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-bridge-border mb-3">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Landmark className="h-4 w-4 text-rose-400" />
                PRINCIPAL DEBT SETTLEMENT
              </h3>
              <span className={`text-xs font-bold ${!isNaN(totalOutstanding) && totalOutstanding > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {!isNaN(totalOutstanding) ? `${totalOutstanding.toLocaleString()} CR REMAINING` : "PROP ERROR"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded border border-bridge-border bg-black/20">
                <span className="text-[11px] text-muted-foreground uppercase">Ship Principal Debt:</span>
                <span className={`font-bold ${!isNaN(shipDebt) && shipDebt > 0 ? "text-rose-400" : "text-foreground"}`}>
                  {!isNaN(shipDebt) ? `${shipDebt.toLocaleString()} CR` : "PROP ERROR"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded border border-bridge-border bg-black/20">
                <span className="text-[11px] text-muted-foreground uppercase">Modifications Value:</span>
                <span className="font-bold text-cyan-neon">
                  {totalModsCost.toLocaleString()} CR (Managed)
                </span>
              </div>
            </div>

            <form onSubmit={handlePayDebt} className="flex gap-2">
              <input
                type="number"
                min="1"
                max={!isNaN(totalOutstanding) ? String(totalOutstanding) : undefined}
                placeholder="Payment Amount (CR)..."
                value={debtPaymentAmount}
                onChange={(e) => setDebtPaymentAmount(e.target.value)}
                className="flex-1 bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-rose-500/50"
              />
              <button
                type="submit"
                disabled={isNaN(totalOutstanding) || totalOutstanding <= 0}
                className="px-4 py-1.5 rounded border border-rose-500/60 bg-rose-500/20 text-xs font-bold text-rose-400 hover:bg-rose-500/30 disabled:opacity-40 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Pay Principal
              </button>
            </form>
          </div>

          {/* Transaction Ledger */}
          <div className="rounded-md border border-bridge-border bg-bridge-panel p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bridge-border mb-3 gap-2">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-neon" />
                TRANSACTION LEDGER ({filteredTransactions.length} / {transactions.length})
              </h3>
              
              <div className="flex items-center gap-2 text-xs font-mono">
                <Filter className="h-3.5 w-3.5 text-cyan-neon" />
                <span className="text-[10px] text-muted-foreground uppercase">Days:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="From"
                  value={filterDayFrom}
                  onChange={(e) => setFilterDayFrom(e.target.value)}
                  className="w-16 bg-black border border-bridge-border text-[11px] text-center text-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-cyan-neon/50"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="To"
                  value={filterDayTo}
                  onChange={(e) => setFilterDayTo(e.target.value)}
                  className="w-16 bg-black border border-bridge-border text-[11px] text-center text-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-cyan-neon/50"
                />
                {(filterDayFrom || filterDayTo) && (
                  <button
                    onClick={() => { setFilterDayFrom(""); setFilterDayTo(""); }}
                    className="px-2 py-1 rounded border border-bridge-border bg-secondary text-[10px] text-secondary-foreground hover:bg-secondary/80 uppercase cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto overflow-x-auto font-mono pr-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-bridge-panel z-10 border-b border-bridge-border">
                  <tr className="text-muted-foreground/60 text-[10px] tracking-wider">
                    <th className="pb-2 pt-1">TIMESTAMP</th>
                    <th className="pb-2 pt-1">DESCRIPTION</th>
                    <th className="pb-2 pt-1">CATEGORY</th>
                    <th className="pb-2 pt-1 text-right">AMOUNT</th>
                    <th className="pb-2 pt-1 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bridge-border/40">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx, index) => {
                      const isAlreadyVoid = tx.description.startsWith("[VOID]") || voidedTxIds.includes(tx.id)
                      return (
                        <tr key={`${tx.id}-${index}`} className="hover:bg-cyan-neon/5 transition-colors text-[11px]">
                          <td className="py-2.5 text-muted-foreground">{tx.date}</td>
                          <td className={`py-2.5 font-medium ${isAlreadyVoid ? "text-muted-foreground italic" : "text-foreground"}`}>
                            {tx.description}
                          </td>
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] uppercase bg-secondary text-secondary-foreground">
                              {tx.category}
                            </span>
                          </td>
                          <td className={`py-2.5 text-right font-bold ${tx.type === "credit" ? "text-emerald-400" : "text-rose-400"}`}>
                            {tx.type === "credit" ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`} CR
                          </td>
                          <td className="py-2.5 text-right">
                            {!isAlreadyVoid && (
                              <button
                                onClick={() => handleCancelTransaction(tx)}
                                title="Void and reverse this transaction"
                                className="px-2 py-1 rounded border border-rose-500/40 bg-rose-500/10 text-[10px] font-bold text-rose-400 hover:bg-rose-500/20 uppercase tracking-widest transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                                Void
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                        No transactions found within the specified day range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Port Services Queue & Income Generation */}
        <div className="flex flex-col gap-4 font-mono">
          
          <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col">
            <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-cyan-neon" />
              PENDING PORT SERVICES
            </h3>

            <div className="flex flex-col gap-2.5 mb-4 text-xs">
              <div className="flex flex-col p-2.5 rounded border border-bridge-border bg-black/20 gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground uppercase text-[11px]">Refit Cost</p>
                    <span className="text-[9px] text-muted-foreground">Size: <span className="uppercase text-amber-300">{shipSize}</span> ({sizeModifier}x)</span>
                  </div>
                  <span className="font-bold text-cyan-300">{pendingRefit.toLocaleString()} CR</span>
                </div>

                <div className="text-[10px] text-muted-foreground border-t border-bridge-border/50 pt-2 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Required Downtime:</span>
                    <span className="text-purple-300 font-bold uppercase">{requiredDowntime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Port Refit Fee ({sizeModifier}x Size Mod):</span>
                    <span className="text-slate-200">{baseRefitFee.toLocaleString()} CR</span>
                  </div>
                  {effectiveSpentDice > 0 && (
                    <div className="flex justify-between">
                      <span>Hull Dice Repairs ({effectiveSpentDice} spent/missing dice):</span>
                      <span className="text-slate-200">{calculatedHullRefit.toLocaleString()} CR</span>
                    </div>
                  )}
                  {repairSystemFailure && (
                    <div className="flex justify-between">
                      <span>Primary System Repair:</span>
                      <span className="text-slate-200">{systemRepairCost.toLocaleString()} CR</span>
                    </div>
                  )}
                  {isUsedCondition && attemptOverhaul && (
                    <div className="flex justify-between">
                      <span>Used Overhaul (DC 30):</span>
                      <span className="text-slate-200">{overhaulCost.toLocaleString()} CR</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between pt-1 mt-1 border-t border-bridge-border/40 text-cyan-300">
                    <span>Refit Protocol:</span>
                    <span className="font-bold text-[9px] uppercase tracking-wider">Resets Chassis & Role Features</span>
                  </div>

                  <div className="pt-2 mt-1 border-t border-bridge-border/40 flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={repairSystemFailure} 
                        onChange={(e) => setRepairSystemFailure(e.target.checked)}
                        className="accent-cyan-500"
                      />
                      <span>Repair Primary System Failure</span>
                    </label>
                    {isUsedCondition && (
                      <label className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-300">
                        <input 
                          type="checkbox" 
                          checked={attemptOverhaul} 
                          onChange={(e) => setAttemptOverhaul(e.target.checked)}
                          className="accent-cyan-500"
                        />
                        <span>Attempt Overhaul (Remove "Used" Condition)</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded border border-bridge-border bg-black/20">
                <div>
                  <p className="font-medium text-foreground uppercase text-[11px]">Refuel Cost</p>
                  <span className="text-[9px] text-muted-foreground">
                    Fuel Spent: <span className="font-mono text-cyan-neon">{fuelSpent} Units</span> (@ ${fuelCostPerUnit}/unit)
                  </span>
                </div>
                <span className="font-bold text-slate-200">{pendingRefuel.toLocaleString()} CR</span>
              </div>

              <div className="flex flex-col p-2.5 rounded border border-bridge-border bg-black/20 gap-2 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground uppercase text-[11px] tracking-wider">Restock Cost</p>
                    <p className="text-[9px] text-muted-foreground whitespace-nowrap">10 CR / head / day</p>
                  </div>
                  <span className="font-bold text-cyan-neon text-xs shrink-0 whitespace-nowrap">
                    {pendingRestock.toLocaleString()} CR
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-bridge-border/40 pt-1.5 text-[10px] min-w-0">
                  <span className="text-[9px] text-muted-foreground uppercase shrink-0">Supplies:</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="0"
                      value={restockCreatures}
                      onChange={(e) => setRestockCreatures(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-8 bg-black border border-bridge-border text-[11px] text-center text-slate-200 rounded py-0.5 focus:outline-none focus:border-cyan-neon/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[9px] text-muted-foreground">head</span>
                    <span className="text-[9px] text-muted-foreground font-bold px-0.5">×</span>
                    <input
                      type="number"
                      min="0"
                      value={restockDays}
                      onChange={(e) => setRestockDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-8 bg-black border border-bridge-border text-[11px] text-center text-slate-200 rounded py-0.5 focus:outline-none focus:border-cyan-neon/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[9px] text-muted-foreground">days</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded border border-bridge-border bg-black/20">
                <div>
                  <p className="font-medium text-foreground uppercase text-[11px]">Docking Fees</p>
                  <span className="text-[9px] text-muted-foreground">20 CR / day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={dockDays}
                      onChange={(e) => setDockDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 bg-black border border-bridge-border text-[11px] text-center text-slate-200 rounded px-1.5 py-0.5"
                    />
                    <span className="text-[10px] text-muted-foreground">days</span>
                  </div>
                  <span className="font-bold text-cyan-neon w-16 text-right">{pendingDocking.toLocaleString()} CR</span>
                </div>
              </div>

              <div className="flex flex-col p-2.5 rounded border border-bridge-border bg-black/20 gap-2 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground uppercase text-[11px] tracking-wider">Star Chart Fees</p>
                    <p className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {includeCharts ? "Astrogation Fee" : "Astrogation Update Skipped"}
                    </p>
                  </div>
                  <span className={`font-bold text-xs shrink-0 whitespace-nowrap ${includeCharts ? "text-slate-200" : "text-muted-foreground line-through"}`}>
                    {pendingCharts.toLocaleString()} CR
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-bridge-border/40 pt-1.5 text-[10px] min-w-0">
                  <button
                    type="button"
                    onClick={() => setIncludeCharts(!includeCharts)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      includeCharts 
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" 
                        : "border-cyan-neon/40 bg-cyan-neon/10 text-cyan-neon hover:bg-cyan-neon/20"
                    }`}
                  >
                    {includeCharts ? "Skip Update" : "Include Update (150 CR)"}
                  </button>
                </div>
              </div>

              {pendingOrdnanceCost > 0 && (
                <div className="flex flex-col p-2.5 rounded border border-bridge-border bg-black/20 gap-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PackagePlus className="w-3.5 h-3.5 text-cyan-neon shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground uppercase text-[11px] tracking-wider truncate">
                          Ordnance Requisition
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {pendingOrdnanceItems.reduce((acc, it) => acc + it.qty, 0)} Warheads Pending
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-cyan-neon text-xs shrink-0 whitespace-nowrap">
                      {pendingOrdnanceCost.toLocaleString()} CR
                    </span>
                  </div>

                  <div className="border-t border-bridge-border/40 pt-1.5 space-y-1 text-[9px] font-mono text-slate-300">
                    {pendingOrdnanceItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="truncate pr-1 text-slate-300">
                          {item.qty}× {item.name}
                        </span>
                        <span className="text-amber-300 font-bold shrink-0">
                          {item.cost.toLocaleString()} CR
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-bridge-border pt-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase">Total Queue Due:</span>
                <span className="text-sm font-bold text-amber-400">{totalPendingCosts.toLocaleString()} CR</span>
              </div>
              <button
                onClick={handlePayServices}
                disabled={totalPendingCosts <= 0 && pendingRefit <= 0}
                className="w-full rounded border border-cyan-neon/60 bg-cyan-neon/20 py-2 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 disabled:opacity-40 uppercase tracking-widest transition-colors cursor-pointer"
              >
                {totalPendingCosts > 0 ? "Execute Payment Settlement" : "Execute Maintenance Refit (0 CR)"}
              </button>
            </div>
          </div>

          <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col">
            <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              INCOME & CONTRACTS DISPATCH
            </h3>

            <form onSubmit={handleCustomIncomeSubmit} className="flex flex-col gap-2.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Log Contract Payout</span>
              <input
                type="text"
                placeholder="Contract Description..."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                className="w-full bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Amount (CR)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1 bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded border border-emerald-500/60 bg-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Deposit
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  )
}