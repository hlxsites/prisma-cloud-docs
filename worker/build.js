/* eslint-disable no-underscore-dangle, import/no-extraneous-dependencies */
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import extractEmbedBooks from './tools/extract-embed-books.js';

// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const build = async () => {
  try {
    console.debug('[worker/build.js] building');
    const embedBooks = await extractEmbedBooks();

    await esbuild.build({
      bundle: true,
      sourcemap: dev,
      minify: !dev,
      treeShaking: true,
      format: 'esm',
      define: {
        'process.env.EMBED_BOOKS': JSON.stringify(embedBooks),
      },
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
  } catch (e) {
    console.error('build error: ', e);
    process.exitCode = 1;
  }
};

build();
export default build;
