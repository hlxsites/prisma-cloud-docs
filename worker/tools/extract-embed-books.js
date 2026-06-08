import extractRawBooks from '../../tools/extract-raw-books.js';

/**
 * @typedef {import('../src/types').BookData} EmbedBookData
 */

/**
 * @param {string} [dir='<repo_root>/docs'] root dir
 * @returns {Promise<EmbedBookData[]>}
 */
const extractEmbedBooks = async (dir) => {
  const rawBooks = await extractRawBooks(dir);

  return rawBooks.map((rawBook) => {
    /** @type {EmbedBookData} */
    const embedBook = {
      path: rawBook.repoPath,
      dita: rawBook.data.book.dita,
      ditamap: rawBook.data.book.ditamap,
      attributes: rawBook.data.book.attributes,
    };
    return embedBook;
  });
};

export default extractEmbedBooks;
