/* global URL, console, fetch, process, setTimeout, AbortSignal */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://pokeapi.co/api/v2';
const CONCURRENCY = 5;
const MAX_ATTEMPTS = 4;

const output = fileURLToPath(new URL('../src/varieties-data.ts', import.meta.url));

function extractId(resourceUrl, type) {
  const match = new RegExp(`/${type}/(\\d+)/?$`).exec(resourceUrl);

  if (!match) {
    throw new Error(`Invalid ${type} URL: ${resourceUrl}`);
  }

  return Number(match[1]);
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Runvista-Catalog-Generator/1.0',
        },
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        return await response.json();
      }

      const retryable = response.status === 429 || response.status >= 500;

      if (!retryable || attempt === MAX_ATTEMPTS) {
        throw new Error(`HTTP ${response.status}: ${url}`);
      }

      await sleep(1000 * attempt);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }

      await sleep(1000 * attempt);
    }
  }

  throw new Error(`Unable to fetch ${url}`);
}

async function mapWithConcurrency(items, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()));

  return results;
}

async function main() {
  console.log('Downloading Pokemon species index...');

  const index = await fetchJson(`${BASE_URL}/pokemon-species/?limit=2000&offset=0`);

  if (
    typeof index.count !== 'number' ||
    !Array.isArray(index.results) ||
    index.results.length !== index.count ||
    index.results.length < 1000
  ) {
    throw new Error('Incomplete species index');
  }

  console.log(`Processing varieties for ${index.results.length} species...`);

  const allVarieties = await mapWithConcurrency(index.results, async (speciesEntry) => {
    const speciesId = extractId(speciesEntry.url, 'pokemon-species');

    const detail = await fetchJson(`${BASE_URL}/pokemon-species/${speciesId}/`);

    if (
      detail.id !== speciesId ||
      !Array.isArray(detail.varieties) ||
      detail.varieties.length === 0
    ) {
      throw new Error(`Invalid varieties for species ${speciesId}`);
    }

    const defaults = detail.varieties.filter((variety) => variety.is_default === true);

    if (defaults.length !== 1) {
      throw new Error(`Expected one default variety for species ${speciesId}`);
    }

    return detail.varieties.map((variety) => {
      if (
        typeof variety.is_default !== 'boolean' ||
        typeof variety.pokemon?.name !== 'string' ||
        typeof variety.pokemon?.url !== 'string'
      ) {
        throw new Error(`Invalid variety for species ${speciesId}`);
      }

      return {
        speciesId,
        pokemonId: extractId(variety.pokemon.url, 'pokemon'),
        name: variety.pokemon.name,
        isDefault: variety.is_default,
      };
    });
  });

  const varieties = allVarieties
    .flat()
    .sort(
      (a, b) =>
        a.speciesId - b.speciesId ||
        Number(b.isDefault) - Number(a.isDefault) ||
        a.pokemonId - b.pokemonId,
    );

  const ids = varieties.map((variety) => variety.pokemonId);

  if (new Set(ids).size !== ids.length) {
    throw new Error('Duplicated Pokemon variety IDs');
  }

  if (varieties.length < index.results.length) {
    throw new Error('Incomplete variety catalog');
  }

  const content = [
    '// Generated from PokéAPI.',
    '// Do not edit manually.',
    '// Run: pnpm --filter @runvista/pokemon generate:varieties',
    '',
    'export const POKEMON_VARIETIES_DATA =',
    `  ${JSON.stringify(varieties, null, 2)} as const;`,
    '',
  ].join('\n');

  // Solo escribimos después de validar la descarga completa.
  await writeFile(output, content, 'utf8');

  console.log(`Generated ${varieties.length} Pokemon varieties.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
