/* eslint-disable no-underscore-dangle */
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isBookYamlFile = (filename) => /book.*.ya?ml/.test(filename);

const _findBooks = async (dir, arr) => {
  const stat = await fs.stat(dir);
  if (!stat.isDirectory()) {
    return;
  }

  /** @type {string[]} absolute paths */
  const subdirs = [];
  const items = await fs.readdir(dir);

  await Promise.all(items.map(async (item) => {
    const itemPath = path.resolve(dir, item);
    const itemStat = await fs.stat(itemPath);

    if (itemStat.isDirectory()) {
      subdirs.push(itemPath);
    } else if (isBookYamlFile(item)) {
      arr.push(itemPath);
    }
  }));

  await Promise.all(subdirs.map((subdir) => _findBooks(subdir, arr)));
};

/**
 * @param {string} [dir='<repo_root>/docs'] root dir
 * @returns {Promise<string[]>} absolute paths
 */
const findBooks = async (dir = path.resolve(__dirname, '../../docs')) => {
  const books = [];
  await _findBooks(dir, books);
  return books;
};

export default findBooks;
