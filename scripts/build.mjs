// Maakt per team een eigen app-map (index.html, manifest, service worker) uit app/template.html en teams/<team>.json.
// Gebruik: node scripts/build.mjs   (draait ook automatisch in GitHub Actions na het ophalen van CueScore)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const tpl = readFileSync("app/template.html", "utf8");
const swTpl = readFileSync("app/sw.js", "utf8");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fill = (s, vars) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
const teams = [];

for (const f of readdirSync("teams").filter(f => f.endsWith(".json")).sort()) {
  const t = JSON.parse(readFileSync(`teams/${f}`, "utf8"));
  const dir = t.slug;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const csPath = `${dir}/data/cuescore.json`;
  const cs = existsSync(csPath) ? JSON.parse(readFileSync(csPath, "utf8")) : null;
  const theme = { bg: "#0b0b0c", ...t.theme };
  const themeCss = Object.keys(t.theme || {}).length ? ":root{" + Object.entries(t.theme).map(([k, v]) => `--${k}:${v}`).join(";") + "}" : "";
  const admins = t.admins.length > 1;
  const pageVars = {
    name: esc(t.name), competition: esc(t.competition), standTitle: esc(t.standTitle),
    tournamentUrl: esc(t.tournamentUrl), teamUrl: esc(t.teamUrl), logo: esc(t.logo),
    heroClass: t.heroWide ? "" : " tall", themeColor: theme.bg, themeCss,
    adminNamesCap: esc(t.adminNames.charAt(0).toUpperCase() + t.adminNames.slice(1)), adminVerb: admins ? "maken" : "maakt",
    teamJson: JSON.stringify({ ...t, cs }).replace(/</g, "\\u003c"),
  };
  const html = fill(tpl, pageVars);
  writeFileSync(`${dir}/index.html`, html);
  const version = createHash("sha1").update(html).digest("hex").slice(0, 8);
  writeFileSync(`${dir}/sw.js`, fill(swTpl, { slug: t.slug, version, logo: t.logo }));
  writeFileSync(`${dir}/manifest.webmanifest`, JSON.stringify({
    name: t.name, short_name: t.name, description: `Volgende wedstrijd, aanwezigheid en speelvoorkeur voor ${t.name}.`,
    lang: "nl", id: `./`, start_url: "./", scope: "./", display: "standalone",
    background_color: theme.bg, theme_color: theme.bg,
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  }, null, 2) + "\n");
  teams.push(t);
  console.log(`${t.slug}: ${cs ? cs.matches.length : 0} wedstrijden`);
}
writeFileSync("teams.json", JSON.stringify(teams.map(t => ({ slug: t.slug, name: t.name, competition: t.competition, logo: `${t.slug}/${t.logo}` })), null, 2) + "\n");
