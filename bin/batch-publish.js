#!/usr/bin/node
/* eslint-disable no-underscore-dangle,
                  newline-per-chained-call,
                  import/no-extraneous-dependencies */
import processQueue from '@adobe/helix-shared-process-queue';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { resolve, dirname, relative } from 'path';
import normalizePath from '../tools/normalize-path.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OWNER = 'hlxsites';
const REPO = 'prisma-cloud-docs';
const PATH_PREFIX = '/prisma/prisma-cloud';
const REPO_ROOT = resolve(__dirname, '..');
const ADMIN_API = process.env.ADMIN_API ?? 'https://admin.hlx.page';
const API_URL = (api, path) => `${ADMIN_API}/${api}/${OWNER}/${REPO}/main${path}`;

/**
 * This actually previews then publishes the resource,
 * since publish promotes the content in preview.
 * @param {string} path
 */
async function publishDoc(path) {
  const { status: preview } = await fetch(API_URL('preview', path), { method: 'POST' });
  if (preview === 404 || path.startsWith('examples')) {
    // don't publish examples, or missing docs
    return { path, preview };
  }

  const { status: publish } = await fetch(API_URL('live', path), { method: 'POST' });
  return { path, preview, publish };
}

function isDocPath(path) {
  if (!path) {
    return false;
  }

  const absPath = resolve(REPO_ROOT, path);
  const relPath = relative(REPO_ROOT, absPath);

  if (!relPath.startsWith('docs/') || relPath.startsWith('docs/api/')) {
    return false;
  }

  // if (!relPath.endsWith('.adoc')) { // only adocs
  // if (!relPath.endsWith('.yml')) { // only books
  if (!relPath.endsWith('.yml') && !relPath.endsWith('.adoc')) { // both
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
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  if (path.endsWith('.yml')) {
    path = path.replace(/.yml$/, '.json');
  } else if (path.endsWith('.adoc')) {
    path = path.replace(/.adoc$/, '');
  }

  path = `${PATH_PREFIX}${normalizePath(path)}`;
  return path;
}

async function batchPublish(ppaths) {
  let paths = ppaths;

  // get file as array, whitespace delimited
  if (paths[0] === '-f' || paths[0] === '--file') {
    const data = fs.readFileSync(paths[1]);
    const text = data.toString('utf8');
    paths = text.split(/\s+/);
    console.log('file paths: ', paths);
  }

  paths = paths.filter(isDocPath).map(cleanPath);
  return processQueue(paths, publishDoc);
}

batchPublish(process.argv.slice(2))
  .then((results) => console.info(JSON.stringify(results, undefined, 2), `published ${results.length} docs`))
  .catch(console.error);
