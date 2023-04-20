/* eslint-disable no-underscore-dangle, import/no-extraneous-dependencies */

/**
 * This script starts dev mode, rebuilding and relaunching miniflare dev server
 * when file changes are detected.
 *
 * Asciidoctor.js uses Opal to transpile Ruby to JS, which conflicts with how
 * Miniflare cleans up the process' scope during reloads. This script is a
 * workaround to create independent child processes for each Miniflare reload.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import express from 'express';
import { config as configEnv } from 'dotenv';
import build from './build.js';

/**
 * @typedef {import('child_process').ChildProcess} ChildProcess
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// port used for miniflare dev server, this is the one to use in a browser
const mfPort = process.env.MF_PORT || 3000;

// port 3001 is used for the -website repo dev server

// port used for github mock server, serves content from /docs/
// can't use the helix-cli for this since adoc/yaml aren't supported
const docPort = process.env.DOC_PORT || 3002;

configEnv({ path: path.resolve(__dirname, '.env.dev') });
process.env.NODE_ENV = 'development';

const debounce = (fn, time = 1000) => {
  let timer;
  return (...args) => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    timer = setTimeout(() => fn(...args), time);
  };
};

/** @type {ChildProcess} */
let mfProc;
/** @type {Promise<any>|undefined} */
let runMfProm;

/**
 * @param {ChildProcess} proc
 */
const kill = (proc) => new Promise((resolve, reject) => {
  proc.on('error', reject);
  proc.on('close', resolve);
  proc.on('exit', resolve);

  proc.kill('SIGINT');
});

const runMiniflare = async () => {
  if (runMfProm) {
    return runMfProm;
  }

  const _run = async () => {
    if (mfProc) {
      // console.debug('[worker/dev.js] rebuilding');
      await kill(mfProc);
      mfProc = undefined;
      await build();
    }
    // can't use `.bin/miniflare` for this;
    // it spawns a process for cli.js, but that process doesn't die with it's parent
    mfProc = spawn(process.execPath, [
      '--experimental-vm-modules',
      './node_modules/miniflare/dist/src/cli.js',
      '--build-command=:',
      '--modules',
      `--port=${mfPort}`,
      '--env=./worker/.env.dev',
      './worker/dist/index.mjs',
    ], {
      cwd: path.resolve(__dirname, '..'),
    });

    mfProc.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
    mfProc.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });
  };

  runMfProm = _run().finally(() => {
    runMfProm = undefined;
  });

  return runMfProm;
};

const runDocs = () => {
  const {
    DOC_REPO_OWNER: owner,
    DOC_REPO_NAME: repo,
    DOC_REPO_REF: ref,
  } = process.env;

  return new Promise((resolve) => {
    express()
      .use(`/${owner}/${repo}/${ref}/docs`, express.static(path.resolve(__dirname, '../docs')))
      .listen(docPort, resolve);
  });
};

Promise.all([runMiniflare(), runDocs()]).then(() => {
  console.debug('[worker/dev.js] succeeded!');

  // only need to restart miniflare on changes
  const watcher = fs.watch(path.resolve(__dirname, 'src'), { recursive: true });
  watcher.on('change', debounce(runMiniflare));
});
