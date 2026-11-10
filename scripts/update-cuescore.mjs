// Haalt voor elk team in teams/ het schema en de stand van CueScore op en schrijft <team>/data/cuescore.json.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { computeStats, teamStats } from "./stats.mjs";

const strip = d => JSON.stringify({ ...d, updated: undefined });
let failed = 0;
const cache = {}, subCache = {};
const getJson = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };
const writeIfChanged = (path, out) => {
  if (existsSync(path) && strip(JSON.parse(readFileSync(path, "utf8"))) === strip(out)) return false;
  writeFileSync(path, JSON.stringify(out, null, 1) + "\n"); return true;
};
for (const f of readdirSync("teams").filter(f => f.endsWith(".json")).sort()) {
  const t = JSON.parse(readFileSync(`teams/${f}`, "utf8"));
  try {
    const j = cache[t.tournamentId] ??= await getJson(`https://api.cuescore.com/tournament/?id=${t.tournamentId}`);
    const id = t.cuescoreTeamId;
    const out = {
      updated: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      standings: (j.standings?.["1"] || []).map(r => ({ pos: r.position, name: r.player?.name, played: r.played, wins: r.wins, ties: r.ties, losses: r.losses, fw: r.frameWins, fl: r.frameLosses, pts: r.points })),
      matches: (j.matches || []).filter(m => m.playerA?.teamId == id || m.playerB?.teamId == id)
        .map(m => ({ no: m.matchno, round: m.round, start: m.starttime, home: m.playerA?.name, away: m.playerB?.name, venue: m.playerA?.venue?.name || "", sa: m.scoreA, sb: m.scoreB, status: m.matchstatus, url: m.url }))
    };
    if (!out.matches.length) throw new Error("geen wedstrijden gevonden");
    mkdirSync(`${t.slug}/data`, { recursive: true });
    console.log(`${t.slug}: schema ${writeIfChanged(`${t.slug}/data/cuescore.json`, out) ? "bijgewerkt" : "ongewijzigd"} (${out.matches.length} wedstrijden)`);
    try {
      const list = subCache[t.tournamentId] ??= computeStats(j, await getJson(`https://api.cuescore.com/match/sub/all/?tournamentId=${t.tournamentId}`));
      const st = { updated: out.updated, ...teamStats(list, id) };
      console.log(`${t.slug}: statistieken ${writeIfChanged(`${t.slug}/data/stats.json`, st) ? "bijgewerkt" : "ongewijzigd"} (${st.team.length} spelers, MVP-lijst ${st.mvp.length})`);
    } catch (e) { failed++; console.log(`${t.slug}: statistieken mislukt (${e.message})`); }
  } catch (e) { failed++; console.log(`${t.slug}: mislukt (${e.message})`); }
}
if (failed) process.exitCode = 1;
