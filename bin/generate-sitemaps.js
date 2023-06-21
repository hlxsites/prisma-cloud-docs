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
const ROOT_PATH = '/prisma/prisma-cloud';
const DESTINATION = (locale) => resolve(__dirname, `../prisma/prisma-cloud/docs/sitemaps/sitemap-${locale}.xml`);

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
 *   <loc>https://docs.paloaltonetworks.com/prisma/prisma-cloud/prisma-cloud-admin/get-started-with-prisma-cloud/prisma-cloud-licenses</loc>
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
 */

const isParentTopic = (topic) => !!(topic).topics;

let _pendingMeta;
const fetchMetadata = async () => {
  if (_pendingMeta) {
    return _pendingMeta;
  }

  _pendingMeta = fetch(META_SOURCE).then((res) => res.json());
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
 * @returns {Promise<any[]>}
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
          console.error(`invalid adoc (error), excluding from sitemap: ${adocPath}`, e);
          return;
        }

        const url = urlset.ele('url');
        // get rid of /docs prefix, since the page to visit on browser doesn't have it
        const path = topic.path.substring('/docs'.length);
        const lastMod = (await getLastModified(adocPath)).toISOString(); // relative to repo root
        /* eslint-disable indent */
        const meta = url
          .ele('loc').txt(`${ORIGIN}${ROOT_PATH}${path}`).up()
          .ele('lastmod').txt(lastMod).up()
          .ele('changefreq').txt(CHANGE_FREQ).up()
          .ele('priority').txt(PRIORITY).up()
          .ele('coveo:metadata');

        meta
            .ele('sitemap_modificationdate').txt(lastMod).up()
            .ele('sitemap_docType').txt(DOC_TYPE).up()
            .ele('sitemap_book-name').txt(data.book?.title).up()
            .ele('sitemap_productcategory').txt(PRODUCT_CATEGORY).up()
            .ele('sitemap_productFamily').txt(PRODUCT_FAMILY).up()
            .ele('sitemap_groupId').txt(GROUP_ID(data.book?.title)).up();

        const osVers = await OS_VERSION(dir);
        if (osVers) {
          meta.ele('sitemap_osversion').txt(osVers).up();
        }
        const isLatestVers = await IS_LATEST_VERSION(dir);
        if (isLatestVers) {
            meta.ele('sitemap_isLatestVersion').txt(isLatestVers).up();
        }
        meta.up();
        /* eslint-enable indent */
      });
    }));

    // write to /docs/sitemaps/sitemap-${locale}.xml
    const content = doc.end();
    const sitemapPath = DESTINATION(locale);
    console.log(`[bin/generate-sitemaps] writing ${sitemapPath}`);
    await fs.writeFile(sitemapPath, content);
  }));
};

generateSitemaps()
  .then(() => console.log(`[bin/generate-sitemaps] generated sitemaps for ${LOCALES.length} locales`))
  .catch(console.error);
