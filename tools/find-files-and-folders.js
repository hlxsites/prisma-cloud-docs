/* eslint-disable no-underscore-dangle */
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {(
 *   name: string,
 *   path: string,
 *   stats: import('fs').Stats
 * ) => boolean|Promise<boolean>} Predicate
 */

/**
 * @typedef {{
 *   files: string[];
 *   folders: string[];
 * }} Collector;
 */

/**
 * @param {Predicate} predicate
 * @param {string} dir
 * @param {Collector} collector
 */
const _findFilesAndFolders = async (predicate, dir, collector) => {
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

    if (await predicate(item, itemPath, itemStat)) {
      if (itemStat.isDirectory()) {
        collector.folders.push(itemPath);
      } else {
        collector.files.push(itemPath);
      }
    }

    if (itemStat.isDirectory()) {
      subdirs.push(itemPath);
    }
  }));

  await Promise.all(subdirs.map((subdir) => _findFilesAndFolders(predicate, subdir, collector)));
};

/**
 * @param {Predicate} predicate function to determine whether file matches condition
 * @param {string} [dir='<repo_root>/docs'] root dir
 * @returns {Promise<Collector>} absolute paths for each type
 */
const findFilesAndFolders = async (predicate, dir = path.resolve(__dirname, '../docs')) => {
  const collector = { files: [], folders: [] };
  await _findFilesAndFolders(predicate, dir, collector);
  return collector;
};

export default findFilesAndFolders;
