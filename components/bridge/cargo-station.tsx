"use client"

import { useState } from "react"
import { 
  Package, 
  Plus, 
  Trash2, 
  Boxes, 
  AlertTriangle, 
  X, 
  MinusCircle, 
  ShieldAlert, 
  Lock, 
  Anchor, 
  CheckCircle2,
  Utensils,
  Flame,
  Users
} from "lucide-react"
import type { Modification, InstalledSuite } from "./ship-modifications"
import type { ShipConfig } from "./ship-setup"
import type { ManifestMember } from "./bridge-dashboard"

interface CargoItem {
  id: string
  name: string
  category: string
  quantity: number
  weightTons: number
  valueCredits: number
  notes: string
}

interface CargoStationProps {
  installedMods?: Modification[]
  installedSuites?: InstalledSuite[]
  maxCapacityTons?: number
  shipConfig?: ShipConfig
  cargoRations?: number
  onUpdateRations?: (rations: number | ((prev: number) => number)) => void
  manifest?: ManifestMember[]
  currentDay?: number
}

export function CargoStation({
  installedMods = [],
  installedSuites = [],
  maxCapacityTons = 40,
  shipConfig,
  cargoRations = 60,
  onUpdateRations,
  manifest = [],
  currentDay = 1,
}: CargoStationProps) {
  const [cargo, setCargo] = useState<CargoItem[]>([
    { id: "1", name: "Spare Ship Parts", category: "Maintenance", quantity: 4, weightTons: 2, valueCredits: 1200, notes: "Class 3 hyperdrive couplings" },
    { id: "2", name: "Ration Packs (Bulk)", category: "Supplies", quantity: 20, weightTons: 1, valueCredits: 500, notes: "Standard Imperial rations" },
    { id: "3", name: "Tibanna Gas Canisters", category: "Fuel/Ammo", quantity: 10, weightTons: 5, valueCredits: 4500, notes: "Refined grade" },
  ])

  // Hidden Storage State
  const [hiddenCargo, setHiddenCargo] = useState<CargoItem[]>([])

  // Strict check: Only resolve true if the specific Hidden Storage suite or mod is installed
  const hasHiddenStorage = installedSuites.some((suite) => {
    if (!suite) return false
    const name = suite.name?.toLowerCase().trim() || ""
    const id = suite.id?.toLowerCase().trim() || ""
    return name === "hidden storage" || id.includes("hidden-storage") || id.includes("hidden_storage")
  }) || installedMods.some((mod) => {
    if (!mod) return false
    const name = mod.name?.toLowerCase().trim() || ""
    const id = mod.id?.toLowerCase().trim() || ""
    return name.includes("hidden storage") || id.includes("hidden-storage")
  })

  // Role Specialization & Mastery checks
  const isFreighterSpec = shipConfig?.roleSpecialization === "Freighter"
  const isFreighterMastery = shipConfig?.roleMastery === "Freighter"

  // Emergency Jettison States (Freighter Mastery)
  const [isJettisonOpen, setIsJettisonOpen] = useState<boolean>(false)
  const [selectedJettisonIds, setSelectedJettisonIds] = useState<Record<string, number>>({})
  const [jettisonFeedback, setJettisonFeedback] = useState<string | null>(null)

  // Standard Cargo calculations
  const usedCapacityTons = cargo.reduce((acc, item) => acc + item.weightTons, 0)
  const totalValueCredits = cargo.reduce((acc, item) => acc + item.valueCredits, 0)

  // Hidden Storage calculations
  const maxHiddenCapacityTons = maxCapacityTons / 2
  const usedHiddenCapacityTons = hiddenCargo.reduce((acc, item) => acc + item.weightTons, 0)
  const totalHiddenValueCredits = hiddenCargo.reduce((acc, item) => acc + item.valueCredits, 0)

  // Ration & Life Support Calculations
  const totalPersonnel = manifest.length
  const dailyBurnRate = totalPersonnel
  const daysOfRationsRemaining = totalPersonnel > 0 ? Math.floor(cargoRations / totalPersonnel) : 999
  const isRationCritical = daysOfRationsRemaining <= 3 && totalPersonnel > 0

  // Form State for Standard Cargo
  const [name, setName] = useState("")
  const [category, setCategory] = useState("Supplies")
  const [quantity, setQuantity] = useState("1")
  const [weightTons, setWeightTons] = useState("1")
  const [valueCredits, setValueCredits] = useState("100")
  const [notes, setNotes] = useState("")

  // Form State for Hidden Cargo
  const [hiddenName, setHiddenName] = useState("")
  const [hiddenCategory, setHiddenCategory] = useState("Contraband")
  const [hiddenQuantity, setHiddenQuantity] = useState("1")
  const [hiddenWeightTons, setHiddenWeightTons] = useState("1")
  const [hiddenValueCredits, setValueCreditsHidden] = useState("500")
  const [hiddenNotes, setHiddenNotes] = useState("")

  // Removal Modal States
  const [activeRemoveItem, setActiveRemoveItem] = useState<{ item: CargoItem; isHidden: boolean } | null>(null)
  const [removeQuantity, setRemoveQuantity] = useState<number>(1)

  // Handle Adding Standard Cargo
  const handleAddCargo = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedQty = parseInt(quantity)
    const parsedWeight = parseFloat(weightTons)
    const parsedVal = parseFloat(valueCredits)

    if (!name.trim() || isNaN(parsedQty) || isNaN(parsedWeight) || isNaN(parsedVal)) {
      alert("Please fill in all required fields with valid numbers.")
      return
    }

    if (usedCapacityTons + parsedWeight > maxCapacityTons) {
      alert(`Cargo hold capacity exceeded! Adding this item requires ${parsedWeight} tons, but only ${(maxCapacityTons - usedCapacityTons).toFixed(1)} tons remain.`)
      return
    }

    const newItem: CargoItem = {
      id: `cargo-${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      quantity: parsedQty,
      weightTons: parsedWeight,
      valueCredits: parsedVal,
      notes: notes.trim(),
    }

    setCargo(prev => [newItem, ...prev])
    setName("")
    setQuantity("1")
    setWeightTons("1")
    setValueCredits("100")
    setNotes("")
  }

  // Handle Adding Hidden Cargo
  const handleAddHiddenCargo = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedQty = parseInt(hiddenQuantity)
    const parsedWeight = parseFloat(hiddenWeightTons)
    const parsedVal = parseFloat(hiddenValueCredits)

    if (!hiddenName.trim() || isNaN(parsedQty) || isNaN(parsedWeight) || isNaN(parsedVal)) {
      alert("Please fill in all hidden storage fields with valid numbers.")
      return
    }

    if (usedHiddenCapacityTons + parsedWeight > maxHiddenCapacityTons) {
      alert(`Hidden storage capacity exceeded! Requires ${parsedWeight} tons, but only ${(maxHiddenCapacityTons - usedHiddenCapacityTons).toFixed(1)} tons remain.`)
      return
    }

    const newItem: CargoItem = {
      id: `hidden-cargo-${Date.now()}`,
      name: hiddenName.trim(),
      category: hiddenCategory.trim(),
      quantity: parsedQty,
      weightTons: parsedWeight,
      valueCredits: parsedVal,
      notes: hiddenNotes.trim(),
    }

    setHiddenCargo(prev => [newItem, ...prev])
    setHiddenName("")
    setHiddenQuantity("1")
    setHiddenWeightTons("1")
    setValueCreditsHidden("500")
    setHiddenNotes("")
  }

  // Open Removal Modal
  const openRemoveModal = (item: CargoItem, isHidden: boolean) => {
    setActiveRemoveItem({ item, isHidden })
    setRemoveQuantity(item.quantity)
  }

  // Confirm Removal / Consumption
  const handleConfirmRemoval = () => {
    if (!activeRemoveItem) return
    const { item: target, isHidden } = activeRemoveItem

    const targetListSetter = isHidden ? setHiddenCargo : setCargo

    if (removeQuantity >= target.quantity) {
      targetListSetter(prev => prev.filter(i => i.id !== target.id))
    } else if (removeQuantity > 0) {
      targetListSetter(prev => prev.map(item => {
        if (item.id === target.id) {
          const ratio = (item.quantity - removeQuantity) / item.quantity
          return {
            ...item,
            quantity: item.quantity - removeQuantity,
            weightTons: Number((item.weightTons * ratio).toFixed(2)),
            valueCredits: Math.round(item.valueCredits * ratio),
          }
        }
        return item
      }))
    }

    setActiveRemoveItem(null)
  }

  // Jettison Logic for Freighter Role Mastery
  const toggleJettisonSelection = (item: CargoItem) => {
    setSelectedJettisonIds(prev => {
      const updated = { ...prev }
      if (updated[item.id]) {
        delete updated[item.id]
      } else {
        updated[item.id] = item.weightTons
      }
      return updated
    })
  }

  const selectedJettisonTons = Object.values(selectedJettisonIds).reduce((sum, wt) => sum + wt, 0)

  const handleExecuteJettison = () => {
    if (selectedJettisonTons < 50) return

    const jettisonedCount = Object.keys(selectedJettisonIds).length
    const totalDumped = selectedJettisonTons

    setCargo(prev => prev.filter(item => !selectedJettisonIds[item.id]))
    setSelectedJettisonIds({})

    if (totalDumped >= 75) {
      setJettisonFeedback(`JETTISON EXECUTED: Dumped ${totalDumped.toFixed(1)} tons across ${jettisonedCount} item stack(s). AUTOMATIC SUCCESS ON SAVING THROW! Area 300 ft long × 100 ft wide behind vessel is difficult terrain for 1 minute.`)
    } else {
      setJettisonFeedback(`JETTISON EXECUTED: Dumped ${totalDumped.toFixed(1)} tons across ${jettisonedCount} item stack(s). REROLL GRANTED ON SAVING THROW (must use new roll)! Area 300 ft long × 100 ft wide behind vessel is difficult terrain for 1 minute.`)
    }
  }

  return (
    <div className="flex flex-col gap-6 font-mono relative">
      {/* Top Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-md border border-bridge-border bg-bridge-panel p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-neon" />
            <h2 className="text-glow-cyan text-sm font-bold tracking-[0.25em] text-cyan-neon">
              CARGO HOLD MANIFEST
            </h2>
          </div>
          <p className="text-xs tracking-wider text-muted-foreground/70 mt-1">
            INVENTORY &amp; FREIGHT LOGISTICS // SHIP STORAGE
          </p>
        </div>
        
        {/* Capacity & Valuation Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          {isFreighterSpec && (
            <span className="rounded border border-amber-400/60 bg-amber-950/40 px-2.5 py-1 text-[9px] font-bold text-amber-300">
              FREIGHTER SPEC (50T BASE + STORAGE COMPARTMENT)
            </span>
          )}
          <div className="rounded border border-cyan-neon/30 bg-cyan-neon/5 px-3 py-1.5 text-xs text-cyan-neon">
            MANIFEST VALUE: <span className="font-bold">{totalValueCredits.toLocaleString()} CR</span>
          </div>
          <div className={`rounded border px-3 py-1.5 text-xs flex items-center gap-1.5 ${
            usedCapacityTons >= maxCapacityTons 
              ? "border-rose-500/50 bg-rose-500/10 text-rose-400" 
              : "border-cyan-neon/30 bg-cyan-neon/10 text-cyan-neon"
          }`}>
            {usedCapacityTons >= maxCapacityTons && <AlertTriangle className="h-3.5 w-3.5" />}
            CAPACITY: <span className="font-bold">{Number(usedCapacityTons.toFixed(2))} / {maxCapacityTons} TONS</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RATIONS & LIFE SUPPORT STOCK TELEMETRY (SYNCED W/ TIME & MANIFEST)       */}
      {/* ========================================================================= */}
      <section className={`rounded-md border p-4 shadow-sm transition-all ${
        isRationCritical
          ? "border-rose-500/60 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse"
          : "border-emerald-500/40 bg-slate-900/60"
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-bridge-border/60 pb-2 mb-3 gap-2">
          <div className="flex items-center gap-2">
            <Utensils className={`h-4 w-4 ${isRationCritical ? "text-rose-400" : "text-emerald-400"}`} />
            <h3 className={`text-xs font-bold tracking-[0.2em] uppercase ${isRationCritical ? "text-rose-400" : "text-emerald-400"}`}>
              Life Support &amp; Daily Ration Reserves
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            Campaign Day {currentDay} • Automatically consumed as days advance
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
          {/* Total Stocks */}
          <div className="bg-black/50 p-3 rounded border border-bridge-border/60">
            <span className="text-[10px] text-muted-foreground uppercase block mb-1">
              Rations in Stock
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${isRationCritical ? "text-rose-400" : "text-emerald-300"}`}>
                {cargoRations}
              </span>
              <span className="text-xs text-slate-400 font-normal">units</span>
            </div>
          </div>

          {/* Personnel on Board */}
          <div className="bg-black/50 p-3 rounded border border-bridge-border/60">
            <span className="text-[10px] text-muted-foreground uppercase block mb-1">
              Personnel on Board
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-cyan-300">
                {totalPersonnel}
              </span>
              <span className="text-xs text-slate-400 font-normal">POB</span>
            </div>
          </div>

          {/* Daily Burn Rate */}
          <div className="bg-black/50 p-3 rounded border border-bridge-border/60">
            <span className="text-[10px] text-muted-foreground uppercase block mb-1">
              Daily Burn Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-amber-300">
                {dailyBurnRate}
              </span>
              <span className="text-xs text-slate-400 font-normal">units/day</span>
            </div>
          </div>

          {/* Remaining Days Runway */}
          <div className={`p-3 rounded border ${
            isRationCritical
              ? "bg-rose-950/40 border-rose-500/60"
              : "bg-black/50 border-bridge-border/60"
          }`}>
            <span className="text-[10px] text-muted-foreground uppercase block mb-1">
              Supply Runway
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${isRationCritical ? "text-rose-400" : "text-sky-300"}`}>
                {daysOfRationsRemaining}
              </span>
              <span className="text-xs text-slate-400 font-normal">Days</span>
            </div>
          </div>
        </div>

        {/* Quick Inventory Adjustments */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-bridge-border/40 text-xs">
          <span className="text-[10px] text-slate-400">
            {isRationCritical ? (
              <strong className="text-rose-400">⚠️ CRITICAL: Food/Water stocks depleted within 3 days. Restock immediately via Finance.</strong>
            ) : (
              "Life support stocks nominal. 1 daily stock removed per person on board each day."
            )}
          </span>

          {onUpdateRations && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase">Manual Adjust:</span>
              <button
                type="button"
                onClick={() => onUpdateRations(prev => Math.max(0, prev - 5))}
                className="px-2 py-0.5 rounded border border-bridge-border bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => onUpdateRations(prev => Math.max(0, prev - 1))}
                className="px-2 py-0.5 rounded border border-bridge-border bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => onUpdateRations(prev => prev + 10)}
                className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-[10px] font-bold cursor-pointer"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => onUpdateRations(prev => prev + 50)}
                className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-[10px] font-bold cursor-pointer"
              >
                +50
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FREIGHTER ROLE MASTERY: EMERGENCY JETTISON PANEL */}
      {isFreighterMastery && (
        <section className="rounded-md border border-amber-500/50 bg-black/50 p-4 shadow-[0_0_15px_rgba(251,191,36,0.1)] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-bridge-border/60 pb-2">
            <div className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 className="text-xs font-bold tracking-[0.2em] text-amber-400 uppercase">
                Freighter Role Mastery: Emergency Cargo Jettison
              </h3>
            </div>
            <button
              onClick={() => setIsJettisonOpen(!isJettisonOpen)}
              className="text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 uppercase"
            >
              {isJettisonOpen ? "Close Controls" : "Open Jettison Controls"}
            </button>
          </div>

          <p className="text-[10px] text-slate-300 leading-relaxed">
            Reaction when your ship fails a Strength or Dexterity saving throw: Jettison cargo to stabilize trajectory. Jettisoning <strong>$\ge 50$ tons</strong> allows you to reroll the saving throw (must use new roll). Jettisoning <strong>$\ge 75$ tons</strong> grants automatic success! A line 300 ft long $\times$ 100 ft wide behind your ship becomes difficult terrain for 1 minute.
          </p>

          {isJettisonOpen && (
            <div className="p-3 rounded border border-bridge-border/60 bg-black/60 flex flex-col gap-3 mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground uppercase text-[10px]">
                  Select cargo stacks to dump into space:
                </span>
                <span className="font-bold font-mono">
                  Selected for Jettison: <strong className={selectedJettisonTons >= 75 ? "text-emerald-400" : selectedJettisonTons >= 50 ? "text-amber-300" : "text-slate-400"}>
                    {selectedJettisonTons.toFixed(1)} / {usedCapacityTons.toFixed(1)} Tons
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {cargo.map((item) => {
                  const isSelected = !!selectedJettisonIds[item.id]
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleJettisonSelection(item)}
                      className={`p-2 rounded border text-left text-xs transition-all flex justify-between items-center ${
                        isSelected
                          ? "bg-rose-950/40 border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                          : "bg-black/40 border-bridge-border/60 text-slate-300 hover:border-amber-400/40"
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold block truncate">{item.name}</span>
                        <span className="text-[9px] text-muted-foreground">{item.quantity} units</span>
                      </div>
                      <span className="font-mono font-bold shrink-0">{item.weightTons} T</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-bridge-border/40">
                <div className="text-[10px]">
                  {selectedJettisonTons >= 75 ? (
                    <span className="text-emerald-400 font-bold">✓ Threshold Reached: Automatic Success on Save</span>
                  ) : selectedJettisonTons >= 50 ? (
                    <span className="text-amber-300 font-bold">✓ Threshold Reached: Reroll Save Granted</span>
                  ) : (
                    <span className="text-muted-foreground">Select at least 50 tons to activate jettison benefits.</span>
                  )}
                </div>

                <button
                  disabled={selectedJettisonTons < 50}
                  onClick={handleExecuteJettison}
                  className="px-4 py-1.5 rounded border border-rose-500/60 bg-rose-500/20 text-xs font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-30 uppercase tracking-wider"
                >
                  Confirm Jettison ({selectedJettisonTons.toFixed(1)} T)
                </button>
              </div>
            </div>
          )}

          {jettisonFeedback && (
            <div className="p-2 rounded bg-amber-950/40 border border-amber-500/40 text-[10px] text-amber-200">
              {jettisonFeedback}
            </div>
          )}
        </section>
      )}

      {/* Main Grid: Manifest Table & Add Item Form */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Cargo Table (2 cols wide) */}
        <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 lg:col-span-2 flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-bridge-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-2">Item Name</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Weight</th>
                  <th className="p-2">Value</th>
                  <th className="p-2">Notes</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bridge-border/40 text-cyan-neon/90">
                {cargo.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground italic">
                      Cargo hold is currently empty.
                    </td>
                  </tr>
                ) : (
                  cargo.map((item) => (
                    <tr key={item.id} className="hover:bg-cyan-neon/5 transition-colors">
                      <td className="p-2 font-medium text-foreground">{item.name}</td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase bg-secondary text-secondary-foreground">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">{item.weightTons} T</td>
                      <td className="p-2 font-bold text-emerald-400">{item.valueCredits.toLocaleString()} CR</td>
                      <td className="p-2 text-muted-foreground/70 max-w-[150px] truncate" title={item.notes}>
                        {item.notes || "—"}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => openRemoveModal(item, false)}
                          title="Remove or Consume Cargo"
                          className="p-1 rounded border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Add Cargo Form */}
        <div className="rounded-md border border-bridge-border bg-bridge-panel p-4 flex flex-col">
          <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-cyan-neon" />
            STOW NEW CARGO
          </h3>

          <form onSubmit={handleAddCargo} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase block mb-1">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Plasma Coils..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-neon/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-neon/50"
                >
                  <option value="Supplies">Supplies</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Fuel/Ammo">Fuel/Ammo</option>
                  <option value="Valuables">Valuables</option>
                  <option value="Contraband">Contraband</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-neon/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase block mb-1">Weight (Tons)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={weightTons}
                  onChange={(e) => setWeightTons(e.target.value)}
                  className="w-full bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-neon/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase block mb-1">Value (CR)</label>
                <input
                  type="number"
                  min="0"
                  value={valueCredits}
                  onChange={(e) => setValueCredits(e.target.value)}
                  className="w-full bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-neon/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase block mb-1">Notes / Specs</label>
              <input
                type="text"
                placeholder="Optional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black border border-bridge-border text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-neon/50"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded border border-cyan-neon/60 bg-cyan-neon/20 py-2 text-xs font-bold text-cyan-neon hover:bg-cyan-neon/30 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Stow Cargo Item
            </button>
          </form>
        </div>
      </div>

      {/* ======================================================= */}
      {/* HIDDEN STORAGE SUITE (CONDITIONALLY RENDERED)            */}
      {/* ======================================================= */}
      {hasHiddenStorage && (
        <div className="flex flex-col gap-4 mt-2 border-t border-amber-500/40 pt-6">
          <div className="flex flex-col justify-between gap-4 rounded-md border border-amber-500/50 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-400" />
                <h2 className="text-sm font-bold tracking-[0.25em] text-amber-400">
                  CLASSIFIED / HIDDEN STORAGE COMPARTMENTS
                </h2>
              </div>
              <p className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>Finding compartments requires a successful <strong>DC 20 Intelligence (Investigation)</strong> check</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
                HOLD VALUE: <span className="font-bold">{totalHiddenValueCredits.toLocaleString()} CR</span>
              </div>
              <div className={`rounded border px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                usedHiddenCapacityTons >= maxHiddenCapacityTons 
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-400" 
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}>
                {usedHiddenCapacityTons >= maxHiddenCapacityTons && <AlertTriangle className="h-3.5 w-3.5" />}
                CAPACITY: <span className="font-bold">{Number(usedHiddenCapacityTons.toFixed(2))} / {maxHiddenCapacityTons} TONS</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-md border border-amber-500/30 bg-bridge-panel p-4 lg:col-span-2 flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-amber-500/30 text-[10px] uppercase tracking-widest text-amber-400/70">
                    <tr>
                      <th className="p-2">Item Name</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Weight</th>
                      <th className="p-2">Value</th>
                      <th className="p-2">Notes</th>
                      <th className="p-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/20 text-amber-200/90">
                    {hiddenCargo.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground italic">
                          Hidden storage compartments are currently empty.
                        </td>
                      </tr>
                    ) : (
                      hiddenCargo.map((item) => (
                        <tr key={item.id} className="hover:bg-amber-500/5 transition-colors">
                          <td className="p-2 font-medium text-foreground">{item.name}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] uppercase bg-secondary text-secondary-foreground">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">{item.weightTons} T</td>
                          <td className="p-2 font-bold text-emerald-400">{item.valueCredits.toLocaleString()} CR</td>
                          <td className="p-2 text-muted-foreground/70 max-w-[150px] truncate" title={item.notes}>
                            {item.notes || "—"}
                          </td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => openRemoveModal(item, true)}
                              title="Remove from Hidden Storage"
                              className="p-1 rounded border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border border-amber-500/30 bg-bridge-panel p-4 flex flex-col">
              <h3 className="text-xs font-bold tracking-[0.2em] text-amber-400 mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                STOW HIDDEN CARGO
              </h3>

              <form onSubmit={handleAddHiddenCargo} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-amber-400/70 uppercase block mb-1">Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Smuggled Goods..."
                    value={hiddenName}
                    onChange={(e) => setHiddenName(e.target.value)}
                    className="w-full bg-black border border-amber-500/30 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-amber-400/70 uppercase block mb-1">Category</label>
                    <select
                      value={hiddenCategory}
                      onChange={(e) => setHiddenCategory(e.target.value)}
                      className="w-full bg-black border border-amber-500/30 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                    >
                      <option value="Contraband">Contraband</option>
                      <option value="Valuables">Valuables</option>
                      <option value="Supplies">Supplies</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-400/70 uppercase block mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={hiddenQuantity}
                      onChange={(e) => setHiddenQuantity(e.target.value)}
                      className="w-full bg-black border border-amber-500/30 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-amber-400/70 uppercase block mb-1">Weight (Tons)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={hiddenWeightTons}
                      onChange={(e) => setHiddenWeightTons(e.target.value)}
                      className="w-full bg-black border border-amber-500/30 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-400/70 uppercase block mb-1">Value (CR)</label>
                    <input
                      type="number"
                      min="0"
                      value={hiddenValueCredits}
                      onChange={(e) => setValueCreditsHidden(e.target.value)}
                      className="w-full bg-black border border-amber-500/30 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-amber-400/70 uppercase block mb-1">Notes / Specs</label>
                  <input
                    type="text"
                    placeholder="Optional details..."
                    value={hiddenNotes}
                    onChange={(e) => setHiddenNotes(e.target.value)}
                    className="w-full bg-black border border-amber-500/30 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full rounded border border-amber-500/60 bg-amber-500/20 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/30 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Stow in Hidden Hold
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Removal / Consumption Modal Popup */}
      {activeRemoveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-md border border-bridge-border bg-bridge-panel p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-bridge-border">
              <div className="flex items-center gap-2">
                <MinusCircle className="h-5 w-5 text-rose-400" />
                <h3 className="text-xs font-bold tracking-[0.2em] text-rose-400 uppercase">
                  {activeRemoveItem.isHidden ? "Remove from Hidden Storage" : "Remove / Consume Cargo"}
                </h3>
              </div>
              <button
                onClick={() => setActiveRemoveItem(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <p className="text-sm font-bold text-foreground mb-1">{activeRemoveItem.item.name}</p>
              <p className="text-[11px] text-muted-foreground">
                Current Stack Quantity: <span className="font-bold text-cyan-neon">{activeRemoveItem.item.quantity}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Quantity to Remove / Jettison
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max={activeRemoveItem.item.quantity}
                  value={removeQuantity}
                  onChange={(e) => setRemoveQuantity(parseInt(e.target.value) || 1)}
                  className="flex-1 accent-rose-500 cursor-pointer"
                />
                <input
                  type="number"
                  min="1"
                  max={activeRemoveItem.item.quantity}
                  value={removeQuantity}
                  onChange={(e) => setRemoveQuantity(Math.max(1, Math.min(activeRemoveItem.item.quantity, parseInt(e.target.value) || 1)))}
                  className="w-16 bg-black border border-bridge-border text-xs text-center text-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-rose-500/50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-bridge-border">
              <button
                onClick={() => setActiveRemoveItem(null)}
                className="flex-1 rounded border border-bridge-border bg-black/40 py-2 text-xs font-bold text-muted-foreground hover:bg-black/60 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoval}
                className="flex-1 rounded border border-rose-500/60 bg-rose-500/20 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/30 uppercase tracking-widest transition-colors cursor-pointer"
              >
                {removeQuantity >= activeRemoveItem.item.quantity ? "Remove Entire Stack" : `Remove (${removeQuantity})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}