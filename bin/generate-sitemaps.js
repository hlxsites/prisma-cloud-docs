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

const LOCALES = ['en', 'jp'];
const ORIGIN = 'https://docs.paloaltonetworks.com';
const ROOT_PATH = '/prisma/prisma-cloud';
const CHANGE_FREQ = {
  topic: 'weekly',
};
const PRIORITY = {
  topic: '1.0',
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

    await Promise.all(rawBooks.map(async ({ repoPath, data, book }) => {
      // eslint-disable-next-line no-unused-vars
      const { chapters, topics } = processBook(data, repoPath);
      // console.log(`[bin/generate-sitemaps] (${locale}) ${chapters.length} chapters`);
      // console.log(`[bin/generate-sitemaps] (${locale}) ${topics.length} topics`);

      await processQueue(topics, async (topic) => {
        const url = urlset.ele('url');
        // get rid of /docs prefix, since the page to visit on browser doesn't have it
        const path = topic.path.substring('/docs'.length);
        const lastMod = (await getLastModified(`.${topic.path}.adoc`)).toISOString(); // relative to repo root
        /* eslint-disable indent */
        url
          .ele('loc').txt(`${ORIGIN}${ROOT_PATH}${path}`).up()
          .ele('lastmod').txt(lastMod).up()
          .ele('changefreq').txt(CHANGE_FREQ.topic).up()
          .ele('priority').txt(PRIORITY.topic).up()
          .ele('coveo:metadata')
            .ele('sitemap_modificationdate').txt(lastMod).up()
            .ele('sitemap_docType').txt('topic').up()
            .ele('sitemap_book-name').txt(book?.title).up()
            .ele('sitemap_productcategory').txt().up()
            .ele('sitemap_osversion').txt().up()
            .ele('sitemap_productFamily').txt('prisma-cloud').up()
            .ele('sitemap_groupId').txt().up()
            .ele('sitemap_isLatestVersion').txt().up()
            .up();
        /* eslint-enable indent */
      });
    }));

    // write to /docs/sitemaps/sitemap-${locale}.xml
    const content = doc.end();
    const sitemapPath = resolve(__dirname, `../docs/sitemaps/sitemap-${locale}.xml`);
    console.log(`[bin/generate-sitemaps] writing ${sitemapPath}`);
    await fs.writeFile(sitemapPath, content);
  }));
};

generateSitemaps()
  .then(() => console.log(`[bin/generate-sitemaps] generated sitemaps for ${LOCALES.length} locales`))
  .catch(console.error);
