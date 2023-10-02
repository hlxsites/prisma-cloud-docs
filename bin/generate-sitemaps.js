#!/usr/bin/node
/* eslint-disable no-underscore-dangle,
                  newline-per-chained-call,
                  import/no-extraneous-dependencies */
import { create } from 'xmlbuilder2';
import processQueue from '@adobe/helix-shared-process-queue';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { dirname, resolve } from 'path';
import extractRawBooks from '../tools/extract-raw-books.js';
import getLastModified from '../tools/get-last-modified.js';
import normalizePath from '../tools/normalize-path.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ORIGIN = process.env.ORIGIN || 'https://docs.paloaltonetworks.com';
const META_SOURCE = 'https://main--prisma-cloud-docs-website--hlxsites.hlx.live/metadata.json';
const LOCALES = ['en', 'jp'];
const ROOT_PATH = '';
const DESTINATION = (locale) => resolve(__dirname, `../docs/sitemaps/sitemap-${locale}.xml`);

// metadata
const CHANGE_FREQ = 'weekly';
const PRIORITY = '1.0';

// coveo metadata
const DOC_TYPE = 'bookDetailPage';
const PRODUCT_CATEGORY = 'Prisma;Prisma Cloud';
const PRODUCT_FAMILY = 'prisma-cloud';
const GROUP_ID = (bookName) => `${PRODUCT_CATEGORY}-${bookName}`;
const IS_LATEST_VERSION = async (bookPath) => {
  // eslint-disable-next-line no-use-before-define
  const row = await getMetaRow(bookPath);
  if (!row) {
    return undefined;
  }
  return row['is-latest-version'];
};
const OS_VERSION = async (bookPath) => {
  // eslint-disable-next-line no-use-before-define
  const row = await getMetaRow(bookPath);
  if (!row) {
    return undefined;
  }
  return row['os-version'];
};

/**
 * @example
 * ```xml
 * <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:coveo="https://www.coveo.com/schemas/metadata">
 *  <url>
 *   <loc>https://docs.paloaltonetworks.com/en/enterprise-edition/admin/get-started-with-prisma-cloud/prisma-cloud-licenses</loc>
 *   <lastmod>2023-03-09T18:27:45.191-08:00</lastmod>
 *   <changefreq>weekly</changefreq>
 *   <priority>1.0</priority>
 *   <coveo:metadata>
 *    <sitemap_modificationdate>2023-03-09T18:27:45.191-08:00</sitemap_modificationdate>
 *    <sitemap_docType>bookDetailPage</sitemap_docType>
 *    <sitemap_book-name>Prisma Cloud Admin</sitemap_book-name>
 *    <sitemap_productcategory>Cloud-Native Security; Prisma; Prisma Cloud</sitemap_productcategory>
 *    <sitemap_osversion>Prisma Cloud Enterprise Edition</sitemap_osversion>
 *    <sitemap_productFamily>prisma-cloud</sitemap_productFamily>
 *    <sitemap_groupId>Cloud-Native Security-Prisma Cloud Admin</sitemap_groupId>
 *    <sitemap_isLatestVersion>true</sitemap_isLatestVersion>
 *   </coveo:metadata>
 *  </url>
 * </urlset>
 * ```
 *
 * @see https://docs.google.com/spreadsheets/d/1bf3i1YpdE61-Vc06NBCbm1-x1znJfd2kd2tL-oinvV8/edit
 *
 * @typedef {{
 *   loc: string;
 *   lastmod: string;
 *   changefreq: string;
 *   priority: string;
 *   'coveo:metadata': {
 *     sitemap_modificationdate: string;
 *     sitemap_docType: string;
 *     'sitemap_book-name': string;
 *     sitemap_productcategory: string;
 *     sitemap_osversion: string;
 *     sitemap_productFamily: string;
 *     sitemap_groupId: string;
 *     sitemap_isLatestVersion: boolean;
 *   }
 * }} SitemapEntry
 */

const isParentTopic = (topic) => !!(topic).topics;

let _pendingMeta;
const fetchMetadata = async () => {
  if (_pendingMeta) {
    return _pendingMeta;
  }

  _pendingMeta = fetch(META_SOURCE)
    .then((res) => res.json())
    .then((meta) => {
      // sort by `URL` key length descending,
      // since the longest common path will be the most specific matching entry
      meta.data = meta.data.sort((a, b) => b.URL.length - a.URL.length);
      return meta;
    });
  return _pendingMeta;
};

let _meta;
async function getMetaRow(bookPath) {
  if (!_meta) {
    _meta = await fetchMetadata();
  }
  const arow = _meta.data.find((row) => {
    const cropped = row.book.substring(`${ROOT_PATH}/docs`.length);
    return bookPath.endsWith(cropped);
  });
  return arow;
}

/**
 * @param {any} data
 * @param {string} repoPath
 * @returns {{ chapters: {title:string; path:string;}[]; topics: {title:string; path:string;}[]; }}
 */
const processBook = (data, repoPath) => {
  const chapters = [];
  const topics = [];

  const processTopic = (chapterPath, topic, parentPath) => {
    if (isParentTopic(topic)) {
      // nested topics, recurse
      const topicKey = normalizePath(topic.dir); // todo: sanitize better
      topic.topics.forEach((subtopic) => processTopic(chapterPath, subtopic, parentPath ? `${parentPath}/${topicKey}` : topicKey));
      return;
    }

    const topicKey = normalizePath(topic.file.split('.').slice(0, -1).join('.'));
    topics.push({
      chapter: chapterPath,
      name: topic.name,
      path: parentPath ? `${chapterPath}/${parentPath}/${topicKey}` : `${chapterPath}/${topicKey}`,
    });
  };

  const processChapter = (chapter) => {
    const chapterKey = normalizePath(chapter.dir);
    const chapterPath = `${repoPath}/${chapterKey}`;
    chapters.push({
      path: chapterPath,
      name: chapter.name,
    });
    chapter.topics.forEach((topic) => processTopic(chapterPath, topic));
  };

  data.chapters.forEach(processChapter);

  return { chapters, topics };
};

/**
 * @param {{
 *   topic: {
 *     title: string;
 *     path: string;
 *   }
 *   adocPath: string;
 *   data: RawBookData;
 *   dir: string;
 * }} param0
 * @returns {Promise<SitemapEntry>}
 */
const getSitemapEntry = async ({
  topic,
  adocPath,
  data,
  dir,
}) => {
// get rid of /docs prefix, since the page to visit on browser doesn't have it
  const path = topic.path.substring('/docs'.length);
  const lastMod = (await getLastModified(adocPath)).toISOString(); // relative to repo root

  const entry = {
    loc: `${ORIGIN}${ROOT_PATH}${path}`,
    lastmod: lastMod,
    changefreq: CHANGE_FREQ,
    priority: PRIORITY,
    'coveo:metadata': {
      sitemap_modificationdate: lastMod,
      sitemap_docType: DOC_TYPE,
      'sitemap_book-name': data.book?.title,
      sitemap_productcategory: PRODUCT_CATEGORY,
      sitemap_productFamily: PRODUCT_FAMILY,
      sitemap_groupId: GROUP_ID(data.book?.title),
    },
  };

  const osVers = await OS_VERSION(dir);
  if (osVers) {
    entry['coveo:metadata'].sitemap_osversion = osVers;
  } else {
    console.warn('os version not defined for topic: ', topic.path, dir);
  }

  const isLatestVers = await IS_LATEST_VERSION(dir);
  if (isLatestVers) {
    entry['coveo:metadata'].sitemap_isLatestVersion = isLatestVers;
  }

  return entry;
};

/**
 * @param {Record<string, unknown>} obj
 * @param {import('xmlbuilder2/lib/interfaces.js').XMLBuilder} builder
 */
const addXMLObject = (obj, builder) => {
  Object.entries(obj).forEach(([key, val]) => {
    if (!val) return;

    const next = builder.ele(key);
    if (typeof val === 'object') {
      addXMLObject(val, next);
    } else {
      next.txt(val);
    }
  });
};

/**
 * @returns {Promise<void>}
 */
const generateSitemaps = async () => {
  await Promise.all(LOCALES.map(async (locale) => {
    const rawBooks = await extractRawBooks(resolve(__dirname, `../docs/${locale}`));
    const doc = create({ version: '1.0', encoding: 'utf-8' });
    const urlset = doc.ele('urlset', {
      xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
      'xmlns:xhtml': 'http://www.w3.org/1999/xhtml',
      'xmlns:coveo': 'https://www.coveo.com/schemas/metadata',
    });

    /** @type {SitemapEntry[]} */
    const entries = [];

    await Promise.all(rawBooks.map(async ({
      repoPath,
      data,
      dir,
    }) => {
      // eslint-disable-next-line no-unused-vars
      const { chapters, topics } = processBook(data, repoPath);
      // console.log(`[bin/generate-sitemaps] (${locale}) ${chapters.length} chapters`);
      // console.log(`[bin/generate-sitemaps] (${locale}) ${topics.length} topics`);

      await processQueue(topics, async (topic) => {
        const adocPath = `.${topic.path}.adoc`;
        try {
          const stat = await fs.stat(adocPath);
          if (!stat.isFile()) {
            console.warn(`invalid adoc (directory), excluding from sitemap: ${adocPath}`);
            return;
          }
        } catch (e) {
          if (e.code === 'ENOENT') {
            console.error(`invalid adoc (missing), excluding from sitemap: ${adocPath}`);
          } else {
            console.error(`error with adoc file, excluding from sitemap: ${adocPath}`);
          }
          return;
        }

        const entry = await getSitemapEntry({
          dir,
          adocPath,
          topic,
          data,
        });
        entries.push(entry);
      });

      // sort entries by path alphabetically to try to avoid blowing up git history size
      // eslint-disable-next-line no-nested-ternary
      entries.sort((a, b) => ((a.loc < b.loc) ? -1 : (a.loc > b.loc) ? 1 : 0));

      // add them to the xml
      entries.forEach((entry) => {
        const url = urlset.ele('url');
        addXMLObject(entry, url);
      });
    }));

    // write to /docs/sitemaps/sitemap-${locale}.xml
    const content = doc.end({ prettyPrint: true });
    const sitemapPath = DESTINATION(locale);
    console.log(`[bin/generate-sitemaps] writing ${sitemapPath}`);
    await fs.writeFile(sitemapPath, content);
  }));
};

generateSitemaps()
  .then(() => console.log(`[bin/generate-sitemaps] generated sitemaps for ${LOCALES.length} locales`))
  .catch(console.error);
