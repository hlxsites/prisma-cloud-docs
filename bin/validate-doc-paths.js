#!/usr/bin/node
/* eslint-disable no-underscore-dangle */
import { relative, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const INVALID_PATH = /[^a-z0-9/\-.]|-{2,}|(-\.)|(\.-)/g;
const IGNORED_FOLDERS = ['_graphics'];
const IGNORED_FILES = ['book_point_release.yml'];
const ROOT_FOLDER = 'docs/';
const IGNORED_ROOT_PATHS = ['docs/api/'];

function cleanPath(path) {
  return relative(repoRoot, path.trim());
}

function isInvalidPath(path) {
  const log = path.endsWith('test_sitemap.adoc') ? console.log : () => {};
  log('path: ', path);

  if (!path.startsWith(ROOT_FOLDER)) {
    log('0');

    return false;
  }

  if (IGNORED_FILES.find((ignored) => path.endsWith(`/${ignored}`))) {
    log('1');

    return false;
  }

  if (IGNORED_ROOT_PATHS.find((ignored) => path.startsWith(ignored))) {
    log('2');

    return false;
  }
  if (IGNORED_FOLDERS.find((folder) => path.includes(`/${folder}/`))) {
    log('3');

    return false;
  }
  log('re: ', INVALID_PATH.test(path));

  return INVALID_PATH.test(path);
}

async function checkPaths(paths) {
  console.log('input paths: ', paths, paths.length);
  return paths.map(cleanPath).filter(isInvalidPath);
}

checkPaths(process.argv.slice(2))
  .then((badFiles) => {
    if (!badFiles.length) return;

    console.error(`Invalid file paths: \n - ${badFiles.join('\n - ')}`);
    console.info('\n*** Note: paths can only contain lowercase letters, numbers, and -');
    process.exit(1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
