// scripts/generate-changelog.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Pull the last 20 commits: hash, author date, and commit subject
  const gitLogOutput = execSync(
    'git log -n 20 --pretty=format:"%h|%as|%s"',
    { encoding: 'utf-8' }
  ).trim();

  const entries = gitLogOutput
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, date, message] = line.split('|');
      return { hash, date, message };
    });

  const outputPath = path.join(__dirname, '../lib/changelog.json');
  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`[Changelog] Successfully generated ${entries.length} release notes to lib/changelog.json`);
} catch (error) {
  console.warn('[Changelog] Could not pull Git history (shallow clone or git missing). Writing fallback.');
  const fallbackPath = path.join(__dirname, '../lib/changelog.json');
  if (!fs.existsSync(fallbackPath)) {
    fs.writeFileSync(fallbackPath, JSON.stringify([]), 'utf-8');
  }
}