import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Runs automatically before `npm run dev` (npm lifecycle: predev -> dev).
// Re-imports owned variants + cost/bundle data from the local Marvel Snap
// save files, so the app always reflects your current in-game collection
// without having to remember to run `aggiorna-dati.bat` / the import
// scripts by hand. Also re-scrapes the full variant list from the source
// site, so newly announced/datamined unreleased cards show up without
// having to remember to run that script by hand either. Never blocks
// `npm run dev` from starting: if the save files aren't found (game not
// installed on this machine, different path, etc.) or there's no network
// access for the scrape, we just log a warning and continue with whatever
// data is already in public/*.json.
function runOptional(scriptName, label) {
  try {
    execFileSync('node', [path.join(__dirname, scriptName)], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch {
    console.warn(`\n⚠️  ${label} non riuscito (verrà usato l'ultimo file salvato). Non è un errore bloccante.\n`);
  }
}

console.log('🔄 Reimport automatico dal salvataggio di Marvel Snap...\n');
runOptional('importOwnedFromSave.js', 'Import varianti possedute');
runOptional('importCostData.js', 'Import dati costi/bundle');

console.log('🔄 Controllo nuove varianti non rilasciate/datamined...\n');
runOptional('extractAllVariants.js', 'Scraping varianti non rilasciate');

console.log('▶️  Avvio del server di sviluppo...\n');
