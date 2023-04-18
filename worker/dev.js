/* eslint-disable no-underscore-dangle, import/no-extraneous-dependencies */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import build from './build.js';

/**
 * @typedef {import('child_process').ChildProcess} ChildProcess
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3001;
process.env.NODE_ENV = 'development';

/** @type {ChildProcess} */
let mfProc;
/** @type {Promise<any>|undefined} */
let runProm;

/**
 * @param {ChildProcess} proc
 */
const kill = (proc) => new Promise((resolve, reject) => {
  proc.on('error', reject);
  proc.on('close', resolve);
  proc.on('exit', resolve);

  proc.kill('SIGINT');
});

const run = async () => {
  if (runProm) {
    return runProm;
  }

  const _run = async () => {
    if (mfProc) {
      // console.debug('[worker/dev.js] rebuilding');
      await kill(mfProc);
      mfProc = undefined;
      await build();
    }
    mfProc = spawn(process.execPath, [
      '--experimental-vm-modules',
      './node_modules/miniflare/dist/src/cli.js',
      '--build-command=:',
      '--modules',
      `--port=${port}`,
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

  runProm = _run().finally(() => {
    runProm = undefined;
  });

  return runProm;
};

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

run().then(() => {
  console.debug(`[worker/dev.js] running at http://localhost:${port}`);
  const watcher = fs.watch(path.resolve(__dirname, 'src'), { recursive: true });
  watcher.addListener('change', debounce(run));
});
