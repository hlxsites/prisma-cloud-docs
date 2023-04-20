// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import findBooks from './find-books.js';

/**
 * @typedef {import('./types').RawBook} RawBook
 */

/**
 * @param {string} [dir='<repo_root>/docs'] root dir
 * @returns {Promise<RawBook[]>}
 */
const extractRawBooks = async (dir) => {
  const bookPaths = await findBooks(dir);

  const books = await Promise.all(bookPaths.map(async (bookPath) => {
    const filename = path.basename(bookPath);
    const dirPath = bookPath.slice(0, -(filename.length + 1));
    const content = await fs.readFile(bookPath, 'utf-8');
    let docs;
    try {
      docs = yaml.loadAll(content);
    } catch (e) {
      console.error('failed to parse book: ', bookPath);
      throw e;
    }

    /** @type {Record<string, any[]>} map kind -> array of docs */
    const kinds = {};
    docs.forEach((doc) => {
      // doc may be null if there are multiple separators in a row
      if (!doc) return;

      const { kind = 'unknown' } = doc;
      if (!kinds[kind]) kinds[kind] = [];
      kinds[kind].push(doc);
    });

    // merge `book` docs, even though there should only be one in each book.yml file
    const data = {
      book: (kinds.book || []).reduce((prev, doc) => ({ ...prev, ...doc })),
    };

    // add each other kind as a key, maps to array of those docs
    Object.entries(kinds).forEach(([kind, group]) => {
      if (kind === 'book') return;
      data[`${kind}s`] = group;
    });

    return {
      data,
      filename,
      dir: dirPath,
    };
  }));
  return books;
};

export default extractRawBooks;
