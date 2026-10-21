// scripts/build-planets.js
const fs = require("fs")
const path = require("path")

// 1. Point to the CSV file in your root directory
const csvPath = path.resolve(__dirname, "../Helper Tables for SW5e App - Planets.csv")
const outputPath = path.resolve(__dirname, "../lib/planets-data.ts")

if (!fs.existsSync(csvPath)) {
  console.error(`\n❌ Error: Could not find CSV at:\n${csvPath}\nMake sure "Helper Tables for SW5e App - Planets.csv" is in your project root folder.\n`)
  process.exit(1)
}

// Helper function to handle commas inside quotes (like "Humans, Twi'leks")
function parseCsvLine(line) {
  const result = []
  let current = []
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current.push('"')
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.join("").trim())
      current = []
    } else {
      current.push(char)
    }
  }
  result.push(current.join("").trim())
  return result
}

console.log("Reading CSV data...")
const rawContent = fs.readFileSync(csvPath, "utf-8")
const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0)

// Skip row 0 (headers: Region, Name, Sector, System, Inhabitants, Capital City, Grid Coordinates)
const rows = lines.slice(1).map(parseCsvLine)

const planets = rows.map((cols) => ({
  name: cols[1] || "Unknown",
  region: cols[0] || "Unknown",
  sector: cols[2] || "Unknown",
  system: cols[3] || "Unknown",
  inhabitants: cols[4] || "Unknown",
  capitalCity: cols[5] || "Unknown",
  gridCoordinates: cols[6] || "Unknown",
}))

// Ensure lib directory exists
const libDir = path.resolve(__dirname, "../lib")
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true })
}

const tsOutput = `// Auto-generated from Helper Tables for SW5e App - Planets.csv
// Total recorded planets: ${planets.length}
import type { PlanetRecord } from "./travel-matrix"

export const PLANETS_DATA: PlanetRecord[] = ${JSON.stringify(planets, null, 2)}
`

fs.writeFileSync(outputPath, tsOutput, "utf-8")
console.log(`\n✅ Success! Generated ${outputPath} with ${planets.length} planets.\n`)