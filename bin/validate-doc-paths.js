#!/usr/bin/node
/* eslint-disable no-underscore-dangle */
import { relative, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const INVALID_PATH = /[^a-z0-9/\-.]|-{2,}|(-\.)|(\.-)/gi;
const IGNORED_FOLDERS = ['_graphics'];
const IGNORED_FILES = ['book_point_release.yml'];
const ROOT_FOLDER = 'docs/';
const IGNORED_ROOT_PATHS = ['docs/api/'];

function cleanPath(path) {
  return relative(repoRoot, path.trim());
}

function isInvalidPath(path) {
  if (!path.startsWith(ROOT_FOLDER)) {
    return false;
  }

  if (IGNORED_FILES.find((ignored) => path.endsWith(`/${ignored}`))) {
    return false;
  }

  if (IGNORED_ROOT_PATHS.find((ignored) => path.startsWith(ignored))) {
    return false;
  }
  if (IGNORED_FOLDERS.find((folder) => path.includes(`/${folder}/`))) {
    return false;
  }

  return INVALID_PATH.test(path);
}

function checkPaths(paths) {
  return paths.map(cleanPath).filter((path) => isInvalidPath(path));
}

(() => {
  try {
    const badFiles = checkPaths(process.argv.slice(2));
    if (!badFiles.length) return;

    console.error(`Invalid file paths: \n - ${badFiles.join('\n - ')}`);
    console.info('\n*** Note: paths can only contain lowercase letters, numbers, and -\n');
    process.exit(1);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
