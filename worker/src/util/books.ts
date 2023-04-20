import type { Book, BookData } from '../types';

// loaded by esbuild
const EMBED_BOOK_DATA: BookData[] = process.env.EMBED_BOOKS as unknown as BookData[];

// eslint-disable-next-line no-underscore-dangle
let _books: Book[];
export const getBooks = () => {
  if (_books) return _books;
  _books = EMBED_BOOK_DATA.map((bookData) => {
    const book: Book = {
      ...bookData,
      match(this: Book, path) {
        return path.startsWith(`/${this.dita}`);
      },
      resolve(this: Book, path) {
        const relpath = path.substring(this.dita.length + 1);
        return `${this.path}${relpath}`;
      },
    };
    return book;
  });
  return _books;
};

export const resolvePath = (path: string): string | undefined => {
  const books = getBooks();
  const book = books.find((one) => one.match(path));
  if (!book) return undefined;
  return book.resolve(path);
};

export const resolveAttributes = (path: string): Record<string, string> => {
  const books = getBooks();
  const book = books.find((one) => one.match(path));
  if (!book) return {};
  return book.attributes || {};
};
