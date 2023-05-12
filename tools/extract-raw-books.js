import fs from 'fs/promises';
import path from 'path';
import findBooks from './find-books.js';
import extractRawBook from './extract-raw-book.js';

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
    const data = extractRawBook(content);
    return {
      data,
      filename,
      dir: dirPath,
    };
  }));
  return books;
};

export default extractRawBooks;
