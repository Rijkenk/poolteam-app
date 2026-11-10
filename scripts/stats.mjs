// Berekent uit alle losse partijen van een competitie (CueScore /match/sub/all) per speler de winstpercentages per spelsoort,
// plus de MVP-lijst van de hele competitie (alleen enkelpartijen, net als op CueScore).
const DISC = { "8-Ball": "8b", "9-Ball": "9b", "10-Ball": "10b", "Straightpool": "141" };
export const MIN_PR = 0.6;

export function computeStats(tournament, subs) {
  const parents = new Map((tournament.matches || []).map(m => [m.matchId, m]));
  const teamPlayed = {};                       // teamId -> aantal gespeelde teamwedstrijden
  for (const m of tournament.matches || []) if (m.matchstatus === "finished")
    for (const t of [m.playerA?.teamId, m.playerB?.teamId]) if (t) teamPlayed[t] = (teamPlayed[t] || 0) + 1;
  const players = new Map();                   // playerId -> {id,name,teamId,team,rounds:Set,g:{key:{p,w,fw,fl}}}
  const get = (p, team) => {
    if (!players.has(p.playerId)) players.set(p.playerId, { id: String(p.playerId), name: p.name, teamId: team?.teamId, team: team?.name, rounds: new Set(), g: {} });
    return players.get(p.playerId);
  };
  const add = (pl, key, won, fw, fl, parentId) => {
    const s = pl.g[key] ||= { p: 0, w: 0, fw: 0, fl: 0 };
    s.p++; if (won) s.w++; s.fw += fw; s.fl += fl; pl.rounds.add(parentId);
  };
  for (const x of subs) {
    if (x.matchstatus !== "finished") continue;
    const parent = parents.get(x.parentId); if (!parent) continue;
    const a = +x.scoreA || 0, b = +x.scoreB || 0;
    if (a === b) continue;                     // niet gespeeld of onbeslist
    const doubles = x.matchType == 2;
    const key = doubles ? "k9b" : DISC[x.discipline]; if (!key) continue;
    for (const [side, partner, team, mine, theirs] of [["playerA", "doublesA", parent.playerA, a, b], ["playerB", "doublesB", parent.playerB, b, a]]) {
      for (const p of [x[side], doubles ? x[partner] : null]) {
        if (!p || !(p.playerId > 0)) continue;
        add(get(p, team), key, mine > theirs, mine, theirs, x.parentId);
      }
    }
  }
  const list = [...players.values()].map(pl => {
    const singles = Object.entries(pl.g).filter(([k]) => k !== "k9b").map(([, s]) => s);
    const p = singles.reduce((n, s) => n + s.p, 0), w = singles.reduce((n, s) => n + s.w, 0);
    const pr = teamPlayed[pl.teamId] ? pl.rounds.size / teamPlayed[pl.teamId] : 0;
    return { id: pl.id, name: pl.name, teamId: pl.teamId, team: pl.team, p, w, pct: p ? w / p : 0, pr: Math.min(1, pr), g: pl.g };
  });
  return list;
}

export function teamStats(list, teamId) {
  const r = v => Math.round(v * 1000) / 1000;
  const mvp = list.filter(x => x.p > 0).sort((a, b) => b.pct - a.pct || b.w - a.w || b.p - a.p || a.name.localeCompare(b.name));
  return {
    team: list.filter(x => x.teamId == teamId).sort((a, b) => a.name.localeCompare(b.name)).map(x => ({ id: x.id, name: x.name, p: x.p, w: x.w, pr: r(x.pr), g: x.g })),
    mvp: mvp.map(x => ({ id: x.id, name: x.name, team: x.team, us: x.teamId == teamId, p: x.p, w: x.w, pct: r(x.pct), pr: r(x.pr), low: x.pr < MIN_PR }))
  };
}
