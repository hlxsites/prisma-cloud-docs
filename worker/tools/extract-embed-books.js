/* eslint-disable no-underscore-dangle */
import { fileURLToPath } from 'url';
import path from 'path';
import extractRawBooks from '../../tools/extract-raw-books.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {import('../src/types').BookData} EmbedBookData
 */

/**
 * @param {string} [dir='<repo_root>/docs'] root dir
 * @returns {Promise<EmbedBookData[]>}
 */
const extractEmbedBooks = async (dir) => {
  const rawBooks = await extractRawBooks(dir);
  const repoRoot = path.resolve(__dirname, '../..');

  return rawBooks.map((rawBook) => {
    const repoPath = `/${path.relative(repoRoot, rawBook.dir)}`;

    /** @type {EmbedBookData} */
    const embedBook = {
      path: repoPath,
      dita: rawBook.data.book.dita,
      ditamap: rawBook.data.book.ditamap,
      attributes: rawBook.data.book.attributes,
    };
    return embedBook;
  });
};

export default extractEmbedBooks;
