#!/usr/bin/node
/* eslint-disable no-underscore-dangle,
                  newline-per-chained-call,
                  import/no-extraneous-dependencies */
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { dirname, resolve } from 'path';
import extractRawBooks from '../tools/extract-raw-books.js';
import normalizePath from '../tools/normalize-path.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// path that comes before `/docs`
const ROOT_PATH = '';
const REDIRECTS_FILE_PATH = resolve(__dirname, '../redirects.json');
const CONSTANT_REDIRECTS = {
  // source: destination
  // '/foo/bar': '/foo/bar/baz' // path redirect
  // '/foo/bar.html': '/foo/bar' // extension redirect
  // '/foo/bar': 'https://example.com/foo/bar' // external redirect
};

const isParentTopic = (topic) => !!(topic).topics;

/**
 * @param {any} data
 * @param {string} repoPath
 * @returns {Record<string, string>}
*/
const processBook = (data, repoPath) => {
  const redirects = {};

  const processTopic = (topic, parentPath, parentKey) => {
    if (!isParentTopic(topic)) {
      const topicKey = normalizePath(topic.file.split('.').slice(0, -1).join('.'));
      // check if the topic has the same key as it's parent,
      // in which case add a redirect from the `/x/x` to `/x` path.
      if (topicKey === parentKey) {
        const source = `${parentPath}/${topicKey}.plain.html`;
        const destination = `${parentPath}.plain.html`;
        redirects[source] = destination;
      }
      return;
    }

    const topicKey = normalizePath(topic.dir);
    const nextParentPath = `${parentPath}/${topicKey}`;
    topic.topics.forEach((subtopic) => processTopic(subtopic, nextParentPath, topicKey));
  };

  const processChapter = (chapter) => {
    const chapterKey = normalizePath(chapter.dir);
    const chapterPath = `${ROOT_PATH}${repoPath}/${chapterKey}`;
    chapter.topics.forEach((topic) => processTopic(topic, chapterPath, chapterKey));
  };

  data.chapters.forEach(processChapter);

  return redirects;
};

/**
 * @param {RawBook[]} rawBooks
 * @returns {Promise<Record<string, string>>}
 */
const extractTopicRedirects = async () => {
  const rawBooks = await extractRawBooks(resolve(__dirname, '../docs'));

  /** @type {Record<string, string>} */
  let redirects = {};

  rawBooks.forEach(({
    repoPath,
    data,
  }) => {
    redirects = {
      ...redirects,
      ...processBook(data, repoPath),
    };
  });

  return redirects;
};

/**
 * @param {[key: string, value: string][]} entries
 * @returns {[key: string, value: string][]}
 */
// eslint-disable-next-line arrow-body-style
const sortEntries = (entries) => {
  // eslint-disable-next-line no-nested-ternary
  return entries.sort(([ka], [kb]) => ((ka < kb) ? -1 : (ka > kb) ? 1 : 0));
};

/**
 * @param {Record<string, string>} obj
 * @returns {{ data: Record<string, string>[] }}
 */
const objectToSheet = (obj) => {
  const entries = sortEntries(Object.entries(obj));
  return {
    total: entries.length,
    offset: 0,
    limit: entries.length,
    data: entries.map(([source, destination]) => ({
      source,
      destination,
    })),
    ':type': 'sheet',
  };
};

/**
 * @returns {Promise<number>}
 */
const generateRedirects = async () => {
  const redirects = {
    ...CONSTANT_REDIRECTS,
    ...(await extractTopicRedirects()),
  };

  const sheetData = objectToSheet(redirects);
  await fs.writeFile(REDIRECTS_FILE_PATH, JSON.stringify(sheetData, undefined, 1));
  return sheetData.data.length;
};

generateRedirects()
  .then((count) => console.info(`[bin/generate-redirects] generated ${count} redirects`))
  .catch(console.error);
