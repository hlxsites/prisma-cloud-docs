#!/usr/bin/node
/* eslint-disable no-underscore-dangle,
                  newline-per-chained-call,
                  import/no-extraneous-dependencies */
import processQueue from '@adobe/helix-shared-process-queue';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { resolve, dirname, relative } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = resolve(__dirname, '..');
const ADMIN_API = process.env.ADMIN_API ?? 'https://admin.hlx.page';
const API_URL = (api, path) => `${ADMIN_API}/${api}${path}`;

/**
 * This actually previews then publishes the resource,
 * since publish promotes the content in preview.
 * @param {string} path
 */
async function publish(path) {
  await fetch(API_URL('preview', path), { method: 'POST' });
  if (path.startsWith('examples')) {
    // don't publish examples
    return true;
  }

  await fetch(API_URL('publish', path), { method: 'POST' });
  return true;
}

function isDocPath(path) {
  const absPath = resolve(REPO_ROOT, path);
  const relPath = relative(REPO_ROOT, absPath);

  if (!relPath.startsWith('docs/') || relPath.startsWith('docs/api/')) {
    return false;
  }

  if (!relPath.endsWith('.yml') && !relPath.endsWith('.adoc')) {
    return false;
  }

  const stat = fs.statSync(absPath);
  if (!stat.isFile()) {
    return false;
  }
  return true;
}

function cleanPath(ppath) {
  let path = ppath;
  if (path.startsWith('.')) {
    path = path.substring(1);
  }
  if (path.endsWith('.yml')) {
    path = path.replace(/.yml$/, '.json');
  } else if (path.endsWith('.adoc')) {
    path = path.replace(/.adoc$/, '');
  }
  return path;
}

async function batchPublish(ppaths) {
  const paths = ppaths.filter(isDocPath).map(cleanPath);
  const res = await processQueue(paths, publish);
  return res;
}

batchPublish(process.argv.slice(2))
  .then((res) => console.log(`published ${res.length} docs`))
  .catch(console.error);
