"use client"

import { useState, useMemo } from "react"
import {
  Users,
  UserCheck,
  UserPlus,
  Trash2,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Crosshair,
  Coffee,
  Bed,
  Box,
  HeartPulse,
  Flame,
  ArrowRightLeft
} from "lucide-react"
import type {
  ManifestMember,
  ShipCompartmentId,
  ShipStationId
} from "./bridge-dashboard"
import { getCrewRole } from "./bridge-dashboard"
import type { Modification } from "./ship-modifications"

interface CrewStationProps {
  manifest: ManifestMember[]
  allMembers: ManifestMember[]
  onAddMember: (
    newMember: Omit<ManifestMember, "id" | "assignedOrder" | "hasTakenTurnThisRound">
  ) => void
  onRemoveMember: (id: string) => void
  onAssignLocation: (memberId: string, targetLocation: ShipCompartmentId) => void
  onToggleTurn: (memberId: string) => void
  onUpdateInitiative: (memberId: string, initiative: number) => void
  cargoRations: number
  installedMods?: Modification[]
}

const PRIMARY_STATIONS: { id: ShipStationId; label: string }[] = [
  { id: "helm", label: "Engines / Helm" },
  { id: "engineering", label: "Engineering" },
  { id: "weapons", label: "Weapons Control" },
  { id: "defense", label: "Defense & Shields" },
  { id: "sensors", label: "Sensors" },
  { id: "communications", label: "Communications" },
]

const LIVING_COMPARTMENTS: { id: ShipCompartmentId; label: string }[] = [
  { id: "crew_quarters", label: "Crew Quarters" },
  { id: "passenger_lounge", label: "Passenger Lounge" },
  { id: "medical_bay", label: "Medical Bay" },
  { id: "cargo_bay", label: "Cargo Hold" },
]

export function CrewStation({
  manifest,
  allMembers,
  onAddMember,
  onRemoveMember,
  onAssignLocation,
  onToggleTurn,
  onUpdateInitiative,
  cargoRations,
  installedMods = [],
}: CrewStationProps) {
  // --- FORM STATE ---
  const [newName, setNewName] = useState("")
  const [isPlayer, setIsPlayer] = useState(true)
  const [isPassenger, setIsPassenger] = useState(false)
  const [selectedInitialLocation, setSelectedInitialLocation] = useState<ShipCompartmentId>("crew_quarters")
  const [notes, setNotes] = useState("")

  // --- DYNAMIC TURRET EXTRACTION ---
  const installedTurrets = useMemo(() => {
    return installedMods
      .filter((m) => m.name.toLowerCase().includes("turret") || m.name.toLowerCase().includes("gunner"))
      .map((t, idx) => ({
        id: `turret-${t.instanceId || idx + 1}` as ShipCompartmentId,
        label: `Turret: ${t.name} (${t.location || `Mount ${idx + 1}`})`,
      }))
  }, [installedMods])

  // --- METRICS ---
  const totalSouls = manifest.length
  const pcCount = manifest.filter((m) => m.isPlayer).length
  const passengerCount = manifest.filter((m) => m.isPassenger).length
  const npcCrewCount = totalSouls - pcCount - passengerCount
  const daysOfRationsLeft = totalSouls > 0 ? Math.floor(cargoRations / totalSouls) : 999

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    onAddMember({
      name: newName.trim(),
      isPlayer,
      isPassenger,
      location: isPassenger ? "passenger_lounge" : selectedInitialLocation,
      individualInitiative: 10,
      notes: notes.trim() || undefined,
    })

    setNewName("")
    setNotes("")
    if (isPassenger) {
      setSelectedInitialLocation("passenger_lounge")
    }
  }

  const getCompartmentName = (locId: ShipCompartmentId) => {
    if (locId.startsWith("turret-")) {
      const match = installedTurrets.find((t) => t.id === locId)
      return match ? match.label : "Gunner Turret"
    }
    const foundPrimary = PRIMARY_STATIONS.find((s) => s.id === locId)
    if (foundPrimary) return foundPrimary.label
    const foundLiving = LIVING_COMPARTMENTS.find((l) => l.id === locId)
    if (foundLiving) return foundLiving.label
    return locId
  }

  const getLocationIcon = (locId: ShipCompartmentId) => {
    if (locId.startsWith("turret-")) return <Crosshair className="h-4 w-4 text-rose-400" />
    if (locId === "passenger_lounge") return <Coffee className="h-4 w-4 text-emerald-400" />
    if (locId === "medical_bay") return <HeartPulse className="h-4 w-4 text-red-400" />
    if (locId === "cargo_bay") return <Box className="h-4 w-4 text-amber-400" />
    if (locId === "crew_quarters") return <Bed className="h-4 w-4 text-cyan-400" />
    return <MapPin className="h-4 w-4 text-sky-400" />
  }

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-mono">
      {/* TOP STAT BAR: LIFE SUPPORT & MANIFEST TOTALS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded border border-cyan-500/30 bg-slate-900/80 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-widest">
            <span>Personnel on Board</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-cyan-300">
            {totalSouls}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {pcCount} PCs • {npcCrewCount} Crew NPCs • {passengerCount} Passengers
          </div>
        </div>

        <div className="rounded border border-amber-500/30 bg-slate-900/80 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-widest">
            <span>Daily Burn</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">
            {totalSouls} <span className="text-xs text-slate-400 font-normal">rations/day</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Standard 1 stock unit per person
          </div>
        </div>

        <div className={`rounded border p-3 shadow-sm ${
          daysOfRationsLeft <= 3 
            ? "border-rose-500/50 bg-rose-950/20" 
            : "border-emerald-500/30 bg-slate-900/80"
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-widest">
            <span>Ration Reserves</span>
            <Box className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-300">
            {cargoRations} <span className="text-xs text-slate-400 font-normal">units</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Supply reserve in cargo hold
          </div>
        </div>

        <div className={`rounded border p-3 shadow-sm ${
          daysOfRationsLeft <= 3 
            ? "border-rose-500/60 bg-rose-950/40 animate-pulse" 
            : "border-sky-500/30 bg-slate-900/80"
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-widest">
            <span>Life Support Runway</span>
            <ShieldAlert className="h-4 w-4 text-sky-400" />
          </div>
          <div className={`mt-2 text-2xl font-black ${daysOfRationsLeft <= 3 ? "text-rose-400" : "text-sky-300"}`}>
            {daysOfRationsLeft} <span className="text-xs text-slate-400 font-normal">Days</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {daysOfRationsLeft <= 3 ? "CRITICAL: Restock immediate" : "Depletion synchronized"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ADD PERSONNEL TO MANIFEST */}
        <div className="lg:col-span-1 rounded border border-slate-700 bg-slate-900/60 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <UserPlus className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Add Personnel to Manifest
            </h3>
          </div>

          <form onSubmit={handleCreateMember} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Personnel Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Wedge Antilles"
                required
                className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 border border-slate-800 rounded p-2 bg-slate-950/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPlayer}
                  onChange={(e) => {
                    setIsPlayer(e.target.checked)
                    if (e.target.checked) setIsPassenger(false)
                  }}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300">Player Character</span>
              </label>

              <label className="flex items-center gap-2 border border-slate-800 rounded p-2 bg-slate-950/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPassenger}
                  onChange={(e) => {
                    setIsPassenger(e.target.checked)
                    if (e.target.checked) {
                      setIsPlayer(false)
                      setSelectedInitialLocation("passenger_lounge")
                    }
                  }}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span className="text-[11px] text-amber-300">Passenger / Guest</span>
              </label>
            </div>

            {!isPassenger && (
              <div>
                <label className="text-slate-400 block mb-1">Initial Duty Post</label>
                <select
                  value={selectedInitialLocation}
                  onChange={(e) => setSelectedInitialLocation(e.target.value as ShipCompartmentId)}
                  className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <optgroup label="Operational Consoles">
                    {PRIMARY_STATIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                  {installedTurrets.length > 0 && (
                    <optgroup label="Turret Hardpoints">
                      {installedTurrets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Compartments">
                    {LIVING_COMPARTMENTS.filter((l) => l.id !== "passenger_lounge").map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            <div>
              <label className="text-slate-400 block mb-1">Dossier / Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Species, role notes, clearance level..."
                className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono resize-none"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-2 px-4 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold uppercase tracking-wider text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Enroll On Board
            </button>
          </form>
        </div>

        {/* ACTIVE CREW ROSTER TABLE */}
        <div className="lg:col-span-2 rounded border border-slate-700 bg-slate-900/60 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Ship's Manifest & Duty Roster
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">
              Push or Pull: Dropdowns dynamically reassign posts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Name / Callout</th>
                  <th className="py-2 px-3">Assigned Role</th>
                  <th className="py-2 px-3">Location Post</th>
                  <th className="py-2 px-2 text-center">Turn</th>
                  <th className="py-2 px-2 text-center">Init</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {manifest.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      No personnel currently logged in the vessel manifest.
                    </td>
                  </tr>
                ) : (
                  manifest.map((member) => {
                    const role = getCrewRole(member, allMembers)
                    const isGunner = member.location.startsWith("turret-")
                    const isLead =
                      role === "Pilot" ||
                      role === "Chief Engineer" ||
                      role.includes("Officer")

                    return (
                      <tr
                        key={member.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          member.hasTakenTurnThisRound ? "opacity-60" : ""
                        }`}
                      >
                        {/* Status Icon */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {member.isPassenger ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                              Guest
                            </span>
                          ) : member.isPlayer ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                              PC
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-slate-300 border border-slate-600 uppercase">
                              NPC
                            </span>
                          )}
                        </td>

                        {/* Name & Notes */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            {member.name}
                            {isLead && (
                              <span className="px-1 py-0.2 rounded text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                LEAD
                              </span>
                            )}
                          </div>
                          {member.notes && (
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {member.notes}
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              isLead
                                ? "text-emerald-300"
                                : isGunner
                                ? "text-rose-300"
                                : member.isPassenger
                                ? "text-amber-300/80"
                                : "text-slate-300"
                            }`}
                          >
                            {role}
                          </span>
                        </td>

                        {/* Push Location Dropdown */}
                        <td className="py-2 px-3">
                          {member.isPassenger ? (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Coffee className="h-3.5 w-3.5 text-amber-400" />
                              Passenger Lounge
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {getLocationIcon(member.location)}
                              <select
                                value={member.location}
                                onChange={(e) =>
                                  onAssignLocation(
                                    member.id,
                                    e.target.value as ShipCompartmentId
                                  )
                                }
                                className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
                              >
                                <optgroup label="Stations">
                                  {PRIMARY_STATIONS.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </optgroup>
                                {installedTurrets.length > 0 && (
                                  <optgroup label="Turrets (1 Crew Only)">
                                    {installedTurrets.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                <optgroup label="Compartments">
                                  {LIVING_COMPARTMENTS.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                          )}
                        </td>

                        {/* Turn Checkbox */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onToggleTurn(member.id)}
                            className={`p-1 rounded border transition ${
                              member.hasTakenTurnThisRound
                                ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                                : "bg-slate-950 border-slate-700 text-slate-500 hover:text-slate-300"
                            }`}
                            title={member.hasTakenTurnThisRound ? "Turn Completed" : "Turn Pending"}
                          >
                            {member.hasTakenTurnThisRound ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        {/* Initiative Input */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <input
                            type="number"
                            value={member.individualInitiative || 0}
                            onChange={(e) =>
                              onUpdateInitiative(member.id, parseInt(e.target.value) || 0)
                            }
                            className="w-12 text-center rounded bg-slate-950 border border-slate-700 py-1 text-slate-200 font-bold focus:outline-none focus:border-cyan-500 text-[11px]"
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onRemoveMember(member.id)}
                            className="p-1.5 rounded hover:bg-rose-950/40 border border-transparent hover:border-rose-500/40 text-slate-500 hover:text-rose-400 transition"
                            title="Remove from vessel"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}