#!/usr/bin/node
/* eslint-disable no-underscore-dangle,
                  newline-per-chained-call,
                  import/no-extraneous-dependencies */
import { create } from 'xmlbuilder2';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ORIGIN = process.env.ORIGIN || 'https://docs.prismacloud.io';

/**
 * Check that each sitemap chunk file exists in sitemap-index
 * If not, log an error and exit with 1
 */
const checkSitemapIndex = async () => {
  const res = await fetch(`${ORIGIN}/sitemap-index.xml`);
  if (!res.ok) {
    console.error(`ERROR: Failed to fetch sitemap-index: ${res.status}`);
    process.exit(1);
  }

  const text = await res.text();
  const index = create(text).toObject();

  if (!index.sitemapindex?.sitemap) {
    console.error('ERROR: Invalid sitemap-index, unexpected structure');
    process.exit(1);
  }

  // find all the files in docs/sitemaps
  const items = await fs.readdir(resolve(__dirname, '../docs/sitemaps'));
  const existingMaps = Object.fromEntries(
    items
      .filter((sm) => sm.endsWith('.xml'))
      .map((sm) => [`/docs/sitemaps/${sm}`, false]),
  );

  /** @type {{loc:string}|{loc:string}[]} */
  let indexMaps = index.sitemapindex.sitemap;
  indexMaps = Array.isArray(indexMaps) ? indexMaps : [indexMaps];

  // mark all in index as existing
  indexMaps.forEach((sm) => {
    const { pathname } = new URL(sm.loc);
    if (!pathname.startsWith('/docs')) {
      return;
    }
    if (typeof existingMaps[pathname] === 'undefined') {
      console.warn(`WARNING: Sitemap exists in sitemap-index, but not in docs repository: ${pathname}`);
    }
    existingMaps[pathname] = true;
  }, {});

  // eslint-disable-next-line no-unused-vars
  const missing = Object.entries(existingMaps).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`ERROR: ${missing.length} sitemap(s) missing from sitemap-index: \n\t- ${missing.join('\n\t- ')}`);
    process.exit(1);
  }
};

checkSitemapIndex().catch(console.error);
