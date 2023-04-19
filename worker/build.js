/* eslint-disable no-underscore-dangle, import/no-extraneous-dependencies */
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV === 'development';

// force resolves the browser bundle from asciidoctor
const asciidoctorResolvePlugin = {
  name: 'asciidoctor-resolve-plugin',
  setup({ onResolve }) {
    onResolve({ filter: /@asciidoctor\/core/ }, () => ({
      path: path.resolve(__dirname, '../node_modules/@asciidoctor/core/dist/browser/asciidoctor.js'),
    }));
  },
};

let built = false;
const build = async () => {
  try {
    console.debug(`[worker/build.js] ${built ? 're' : ''}building`);
    built = true;

    await esbuild.build({
      bundle: true,
      sourcemap: dev,
      minify: !dev,
      treeShaking: true,
      format: 'esm',
      define: {},
      platform: 'browser',
      target: 'esnext',
      external: ['__STATIC_CONTENT_MANIFEST'],
      mainFields: ['browser', 'module', 'main'],
      conditions: ['browser', 'worker'],
      entryPoints: [path.resolve(__dirname, 'src', 'index.ts')],
      outdir: path.resolve(__dirname, 'dist'),
      outExtension: { '.js': '.mjs' },
      tsconfig: path.resolve(__dirname, './tsconfig.json'),
      plugins: [
        asciidoctorResolvePlugin,
      ],
    });
  } catch {
    process.exitCode = 1;
  }
};

build();
export default build;
