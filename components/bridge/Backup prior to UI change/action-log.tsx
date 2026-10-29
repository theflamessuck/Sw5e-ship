import { Panel } from "./panel"

type LogLevel = "info" | "warn" | "alert" | "ok"

const EVENTS: { time: string; level: LogLevel; text: string }[] = [
  { time: "4210.5", level: "alert", text: "Target lock acquired: TGT-01 [HOSTILE]" },
  { time: "4210.4", level: "ok", text: "Photon torpedo bays reloaded — 4/4 armed" },
  { time: "4210.3", level: "warn", text: "Laser bank heat rising: 24% and climbing" },
  { time: "4210.2", level: "info", text: "Sensor sweep complete — 3 contacts logged" },
  { time: "4210.1", level: "ok", text: "Shield harmonics recalibrated to 400.8 MHz" },
  { time: "4210.0", level: "info", text: "Helm rerouted power to forward weapons array" },
  { time: "4209.9", level: "alert", text: "Proximity alert: unidentified vessel at 4.2 KKM" },
  { time: "4209.8", level: "info", text: "Tactical station online — Lt. Cmdr. Vega at post" },
]

const LEVEL_STYLES: Record<LogLevel, { dot: string; text: string; tag: string }> = {
  alert: { dot: "bg-red-alert", text: "text-red-alert", tag: "ALERT" },
  warn: { dot: "bg-amber-neon", text: "text-amber-neon", tag: "WARN" },
  ok: { dot: "bg-green-neon", text: "text-green-neon", tag: "OK" },
  info: { dot: "bg-cyan-neon", text: "text-cyan-neon", tag: "INFO" },
}

export function ActionLog() {
  return (
    <Panel title="Action Log" code="LOG-03" className="lg:col-span-2">
      <ul className="flex flex-col divide-y divide-bridge-border/70">
        {EVENTS.map((e, i) => {
          const s = LEVEL_STYLES[e.level]
          return (
            <li key={i} className="flex items-start gap-3 py-2 text-xs">
              <span
                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`}
                aria-hidden="true"
              />
              <span className="shrink-0 tabular-nums tracking-wider text-muted-foreground/60">
                {e.time}
              </span>
              <span
                className={`w-12 shrink-0 text-[10px] font-bold tracking-widest ${s.text}`}
              >
                {s.tag}
              </span>
              <span className="text-foreground/85">{e.text}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
