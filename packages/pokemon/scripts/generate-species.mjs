/* global URL, console, fetch, process */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const endpoint = 'https://pokeapi.co/api/v2/pokemon-species/?limit=2000&offset=0';

const output = fileURLToPath(new URL('../src/species-data.ts', import.meta.url));

function extractId(url) {
  const match = /\/pokemon-species\/(\d+)\/?$/.exec(url);

  if (!match) {
    throw new Error(`Invalid Pokemon species URL: ${url}`);
  }

  return Number(match[1]);
}

async function main() {
  console.log('Downloading Pokemon species catalog...');

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Runvista-Catalog-Generator/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`PokeAPI returned HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (!payload || !Array.isArray(payload.results) || typeof payload.count !== 'number') {
    throw new Error('Invalid PokeAPI response');
  }

  if (payload.results.length !== payload.count || payload.results.length < 1000) {
    throw new Error('Incomplete species catalog; refusing to overwrite local data');
  }

  const species = payload.results.map((entry) => {
    if (typeof entry.name !== 'string' || typeof entry.url !== 'string') {
      throw new Error('Invalid species entry');
    }

    return {
      id: extractId(entry.url),
      name: entry.name,
    };
  });

  species.sort((a, b) => a.id - b.id);

  if (new Set(species.map((entry) => entry.id)).size !== species.length) {
    throw new Error('Duplicated species identifiers');
  }

  const content = [
    '// Generated from PokéAPI.',
    '// Do not edit manually.',
    '// Run: node packages/pokemon/scripts/generate-species.mjs',
    '',
    'export const POKEMON_SPECIES_DATA =',
    `  ${JSON.stringify(species, null, 2)} as const;`,
    '',
  ].join('\n');

  await mkdir(fileURLToPath(new URL('../src/', import.meta.url)), { recursive: true });

  await writeFile(output, content, 'utf8');

  console.log(`Generated ${species.length} species.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
