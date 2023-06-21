#!/usr/bin/node
/* eslint-disable no-underscore-dangle */
import { relative, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const INVALID_PATH = /[^a-z0-9/\-.]|-{2,}|(-\.)|(\.-)/g;

function cleanPath(path) {
  return relative(repoRoot, path.trim());
}

async function checkPaths(paths) {
  return paths.map(cleanPath).filter((path) => INVALID_PATH.test(path));
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
