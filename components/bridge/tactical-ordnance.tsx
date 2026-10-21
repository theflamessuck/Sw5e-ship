import { Panel } from "./panel"

const TORPEDO_CAPACITY = 4
const TORPEDO_LOADED = 4
const LASER_HEAT = 24

export function TacticalOrdnance() {
  return (
    <Panel title="Tactical Ordnance" code="ORD-02" accent="amber">
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] text-muted-foreground/70">
              PHOTON TORPEDOES
            </span>
            <span className="text-sm font-bold tabular-nums text-amber-neon">
              {TORPEDO_LOADED}/{TORPEDO_CAPACITY}
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: TORPEDO_CAPACITY }).map((_, i) => {
              const loaded = i < TORPEDO_LOADED
              return (
                <div
                  key={i}
                  className={[
                    "flex h-12 flex-1 items-center justify-center rounded-sm border text-[9px] font-bold tracking-widest",
                    loaded
                      ? "border-amber-neon/50 bg-amber-neon/10 text-amber-neon text-glow-amber"
                      : "border-bridge-border bg-bridge-panel-2 text-muted-foreground/40",
                  ].join(" ")}
                >
                  {loaded ? "ARMED" : "EMPTY"}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] text-muted-foreground/70">
              LASER BANK HEAT
            </span>
            <span className="text-sm font-bold tabular-nums text-cyan-neon">
              {LASER_HEAT}%
            </span>
          </div>
          <HeatGauge value={LASER_HEAT} />
          <div className="mt-1.5 flex justify-between text-[9px] tracking-[0.2em] text-muted-foreground/50">
            <span>COOL</span>
            <span>NOMINAL</span>
            <span>CRITICAL</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-bridge-border pt-4">
          <Stat label="CHARGE" value="98%" accent="cyan" />
          <Stat label="LOCK STATE" value="READY" accent="green" />
        </div>
      </div>
    </Panel>
  )
}

function HeatGauge({ value }: { value: number }) {
  const segments = 20
  const filled = Math.round((value / 100) * segments)
  return (
    <div
      className="flex gap-1"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Laser bank heat"
    >
      {Array.from({ length: segments }).map((_, i) => {
        const on = i < filled
        const hot = i >= segments * 0.75
        const warm = i >= segments * 0.5
        const color = hot
          ? "bg-red-alert"
          : warm
            ? "bg-amber-neon"
            : "bg-cyan-neon"
        return (
          <span
            key={i}
            className={[
              "h-6 flex-1 rounded-[1px]",
              on ? color : "bg-bridge-border/60",
            ].join(" ")}
          />
        )
      })}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: "cyan" | "green"
}) {
  const color = accent === "green" ? "text-green-neon" : "text-cyan-neon"
  return (
    <div className="rounded-sm border border-bridge-border bg-bridge-panel-2 px-3 py-2">
      <p className="text-[9px] tracking-[0.2em] text-muted-foreground/60">
        {label}
      </p>
      <p className={`text-sm font-bold tracking-wider ${color}`}>{value}</p>
    </div>
  )
}
