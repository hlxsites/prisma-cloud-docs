// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'js-yaml';

/**
 * @param {string} content
 */
const extractRawBook = (content) => {
  let docs;
  try {
    docs = yaml.loadAll(content);
  } catch (e) {
    console.error('failed to parse book: ', e);
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

  return data;
};

export default extractRawBook;
