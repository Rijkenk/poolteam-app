// Haalt voor elk team in teams/ het schema en de stand van CueScore op en schrijft <team>/data/cuescore.json.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";

const strip = d => JSON.stringify({ ...d, updated: undefined });
let failed = 0;
const cache = {};
for (const f of readdirSync("teams").filter(f => f.endsWith(".json")).sort()) {
  const t = JSON.parse(readFileSync(`teams/${f}`, "utf8"));
  try {
    const j = cache[t.tournamentId] ??= await (async () => {
      const r = await fetch(`https://api.cuescore.com/tournament/?id=${t.tournamentId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })();
    const id = t.cuescoreTeamId;
    const out = {
      updated: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      standings: (j.standings?.["1"] || []).map(r => ({ pos: r.position, name: r.player?.name, played: r.played, wins: r.wins, ties: r.ties, losses: r.losses, fw: r.frameWins, fl: r.frameLosses, pts: r.points })),
      matches: (j.matches || []).filter(m => m.playerA?.teamId == id || m.playerB?.teamId == id)
        .map(m => ({ no: m.matchno, round: m.round, start: m.starttime, home: m.playerA?.name, away: m.playerB?.name, venue: m.playerA?.venue?.name || "", sa: m.scoreA, sb: m.scoreB, status: m.matchstatus, url: m.url }))
    };
    if (!out.matches.length) throw new Error("geen wedstrijden gevonden");
    const path = `${t.slug}/data/cuescore.json`;
    if (existsSync(path) && strip(JSON.parse(readFileSync(path, "utf8"))) === strip(out)) { console.log(`${t.slug}: geen wijzigingen`); continue; }
    mkdirSync(`${t.slug}/data`, { recursive: true });
    writeFileSync(path, JSON.stringify(out, null, 1) + "\n");
    console.log(`${t.slug}: bijgewerkt (${out.matches.length} wedstrijden)`);
  } catch (e) { failed++; console.log(`${t.slug}: mislukt (${e.message})`); }
}
if (failed) process.exitCode = 1;
