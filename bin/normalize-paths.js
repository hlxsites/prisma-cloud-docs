#!/usr/bin/node
/* eslint-disable no-underscore-dangle, no-console */

import fs from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import findFilesAndFolders from '../tools/find-files-and-folders.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const IGNORED_FOLDERS = ['_graphics'];
const IGNORED_FILES = ['.DS_Store'];
const IGNORED_ROOT_PATHS = [resolve(__dirname, '../docs/api')];

const NON_NORM_REGEX = /[_A-Z]/g;

/**
 * @type {import('../tools/find-files-and-folders.js').Predicate}
 */
const needsNormalization = (name, path, stat) => {
  if (IGNORED_ROOT_PATHS.find((ignored) => path.startsWith(ignored))) {
    return false;
  }
  if (stat.isDirectory() && IGNORED_FOLDERS.includes(name)) {
    return false;
  }
  if (stat.isFile() && IGNORED_FILES.includes(name)) {
    return false;
  }
  if (stat.isFile() && !/\.adoc$/.test(name)) {
    return false;
  }
  return NON_NORM_REGEX.test(name);
};

/**
 * @param {string} path
 */
const normalizePath = (path) => {
  const parts = path.split('/');
  const last = parts.pop().replace(/_/g, '-').replace(/-{2,}/, '-').toLowerCase();
  return [...parts, last].join('/');
};

/**
* @param {string} [dir='<repo_root>/docs'] root dir
* @returns {Promise<void>} absolute paths
*/
const normalizePaths = async (dir) => {
  const { files, folders } = await findFilesAndFolders(needsNormalization, dir);

  // process files first in parallel, since they won't impact other renames
  await Promise.all(files.map(async (path) => {
    const npath = normalizePath(path);
    return fs.rename(path, npath);
  }));

  // process folders in reverse sorted order, sequentially
  // so each rename doesn't impact path of later renames
  folders.sort().reverse();
  for (let i = 0; i < folders.length; i += 1) {
    const path = folders[i];
    const npath = normalizePath(path);
    // eslint-disable-next-line no-await-in-loop
    await fs.rename(path, npath);
  }

  return { files, folders };
};

normalizePaths()
  .then(({ files, folders }) => console.log(`normalized ${files.length} files and ${folders.length} folders`))
  .catch(console.error);
