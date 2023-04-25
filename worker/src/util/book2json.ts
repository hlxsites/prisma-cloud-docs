import extractRawBook from '../../tools/extract-raw-book.js';

const book2json = (content: string): Record<string, unknown> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return extractRawBook(content);
};

export default book2json;
