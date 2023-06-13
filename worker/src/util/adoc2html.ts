/* eslint-disable class-methods-use-this */

import asciidoctor from '@asciidoctor/core';
import type * as AdocTypes from '@asciidoctor/core';
import type { Book } from '../types';
import { toClassName } from './string';

const AsciiDoctor = asciidoctor();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type NodeType = 'document' | 'embedded' | 'outline' | 'section' | 'admonition' | 'audio' | 'colist' |
  'dlist' | 'example' | 'floating-title' | 'image' | 'listing' | 'literal' | 'stem' | 'olist' | 'open' |
  'page_break' | 'paragraph' | 'preamble' | 'quote' | 'thematic_break' | 'sidebar' | 'table' | 'toc' |
  'ulist' | 'verse' | 'video' | 'inline_anchor' | 'inline_break' | 'inline_button' | 'inline_callout' |
  'inline_footnote' | 'inline_image' | 'inline_indexterm' | 'inline_kbd' | 'inline_menu' | 'inline_quoted';

export interface NodeTypeMap {
  document: AdocTypes.Document;
  embedded: AdocTypes.AbstractBlock;
  outline: AdocTypes.AbstractBlock;
  section: AdocTypes.Section;
  admonition: AdocTypes.Table;
  audio: AdocTypes.AbstractBlock;
  colist: AdocTypes.List;
  olist: AdocTypes.List;
  ulist: AdocTypes.List;
  dlist: AdocTypes.Table;
  list_item: AdocTypes.ListItem;
  inline_anchor: AdocTypes.Inline;
  inline_quoted: AdocTypes.Inline;
  literal: AdocTypes.AbstractBlock;
  table: AdocTypes.Table;
  image: AdocTypes.AbstractBlock;
  example: AdocTypes.AbstractBlock;
  paragraph: AdocTypes.AbstractBlock;
  floating_title: AdocTypes.AbstractBlock;
  thematic_break: AdocTypes.AbstractNode;

  [key: string]: AdocTypes.AbstractNode;
}

export interface Options extends AdocTypes.ProcessorOptions {
  backend?: 'franklin' | 'html5' | string;
  attributes?: Record<string, string>;
  plain?: boolean;
  book?: Book;
}

class FranklinConverter implements AdocTypes.Converter {
  baseConverter: AdocTypes.Converter;

  templates: { [K in keyof NodeTypeMap]?: (node: NodeTypeMap[K]) => string };

  sectionDepth = 0;

  inSection = false;

  doc: AdocTypes.Document;

  book: Book;

  constructor({
    book,
  }: {
    book: Book
  }) {
    this.book = book;
    this.baseConverter = new AsciiDoctor.Html5Converter();
    this.templates = {
      paragraph: (node) => {
        return `<p>${node.getContent()}</p>`;
      },
      inline_anchor: (node) => {
        let url = node.getTarget();
        if (url && url.endsWith('.franklin')) {
          url = url.slice(0, -'.franklin'.length);
          url = url.replace(/_/g, '-').replace(/-{2,}/, '-').toLowerCase();
        }
        return `<a href="${url}">${node.getText()}</a>`;
      },
      'floating-title': (node) => {
        console.error('NOT IMPLEMENTED: floating title: ', node);
        return '';
      },
      embedded: (node) => {
        return node.getContent();
      },
      thematic_break: (_node) => {
        return '<hr>';
      },
      section: (node) => {
        const level = node.getLevel();
        const title = node.getTitle();
        const tag = `h${level + 1}`;
        const blocks = node.getBlocks() as AdocTypes.AbstractBlock[];
        const closer = this.sectionDepth > 0 ? '</div>' : '';
        this.sectionDepth += 1;

        const content = `
          ${title ? `<${tag}>${title}</${tag}>` : ''}
          ${blocks.map((block) => this.convert(block)).join('\n')}`;

        const wrapper = `${closer}<div>${content}${closer ? '' : '</div>'}`;
        this.sectionDepth -= 1;

        return wrapper;
      },
      literal: (node) => {
        const content = node.getContent();
        return /* html */`<pre><code>${content}</code></pre>`;
      },
      admonition: (node) => {
        const style = node.getStyle() || '';

        let title = (node.getTitle() || '').trim();
        if (title) {
          title = /* html */`<h6>${title}</h6>`;
        }

        return /* html */`
          <div class="admonition ${style.toLowerCase()}">
            <div>
              <div>
                ${title ? `${title}\n` : ''}${node.getContent()}
              </div>
            </div>
          </div>`;
      },
      inline_quoted: (node) => {
        const content = node.getText();
        const type = node.getType();
        let tags = [] as unknown as [string, string];
        switch (type) {
          case 'strong':
            tags = ['<strong>', '</strong>'];
            break;
          case 'monospaced':
            tags = ['<code>', '</code>'];
            break;
          case 'emphasis':
            tags = ['<em>', '</em>'];
            break;
          default:
            console.warn('[inline_quoted] unhandled node: ', node, type);
            return content;
        }
        return `${tags[0]}${content}${tags[1]}`;
      },
      ulist: (node) => {
        const blocks = node.getBlocks() as AdocTypes.AbstractBlock[];
        const content = blocks.map((block) => this.convert(block)).join('');
        return content ? `<ul>${content}</ul>` : '';
      },
      dlist: (node) => {
        // TODO:? make into `ul` instead of a block
        // see: https://github.com/asciidoctor/asciidoctor/blob/main/lib/asciidoctor/converter/html5.rb#L516
        const rows = node.getBlocks() as AdocTypes.Inline[][];
        const convertCol = (col: AdocTypes.Inline | AdocTypes.Inline[]): string => {
          if (Array.isArray(col)) {
            return col.map(convertCol).join('');
          }
          return `<p>${col.getText()}</p>`;
        };
        return /* html */`
          <div class="dlist">
            ${rows.map((row) => `<div>${row.map((col) => `<div>${convertCol(col)}</div>`).join('')}</div>`).join('')}
          </div>`;
      },
      olist: (node) => {
        const blocks = node.getBlocks() as AdocTypes.AbstractBlock[];
        const content = blocks.map((block) => this.convert(block)).join('');
        const list = content ? `<ol>${content}</ol>` : '';
        if (node.getAttribute('role') !== 'procedure') {
          return list;
        }
        // TODO: use section metadata for procedure instead
        return this.makeBlock('procedure', list, [], true);
      },
      list_item: (node) => {
        const content = node.getContent();
        const text = node.getText();

        if (!text && !content) {
          return '';
        }

        const result = /* html */`<li>${text ? `<p>${text}</p>` : ''}${content || ''}</li>`;
        return result;
      },
      image: (node) => {
        const src = node.getAttribute('target') as string | undefined;
        if (!src) {
          return '';
        }

        const href = book.resolve(`/_graphics/${src}`);
        return /* html */`<img src="${href}" alt="${node.getAttribute('alt') as string || ''}" width="${node.getAttribute('width') as string}">`;
      },
      table: (node) => {
        const title = node.getTitle();
        const head = node.getHeadRows();

        if (title && head.length === 0) {
          // no header rows, only a title -> block
          const block = this.tableToBlock(title, node);
          if (block) {
            return block;
          }
        }

        // otherwise, insert rows/cols in a `table` block
        return this.tableToTableBlock(node);
      },
    };
  }

  makeBlock(name: string, content: string, variants: string[] = [], singleCell = false): string {
    const variantStr = variants.map(toClassName).join(' ');
    return /* html */`
      <div class="${toClassName(name)}${variantStr ? ` ${variantStr}` : ''}">
        ${singleCell ? '<div><div>\n' : ''}${content.trim()}${singleCell ? '\n</div></div>' : ''}
      </div>`;
  }

  tableToTableBlock(node: AdocTypes.Table): string {
    return this.tableToBlock('table', node);
  }

  tableToBlock(name: string, node: AdocTypes.Table): string {
    const { head, body, foot } = node.getRows();

    const processCols = (cols: AdocTypes.Table.Cell[]) => {
      return cols.map((col) => /* html */`<div>${col.getContent()}</div>`).join('');
    };

    const processRows = (rows: AdocTypes.Table.Cell[][]) => {
      return rows.map((row) => /* html */`<div>${processCols(row)}</div>`).join('\n');
    };

    const content = `
    ${processRows(head)}
    ${processRows(body)}
    ${processRows(foot)}`;

    const variants = head.length === 0 ? ['headless'] : [''];
    return this.makeBlock(name, content, variants);
  }

  iconsEnabled(): boolean {
    return !!this.doc.getAttribute('icons');
  }

  hrefsToLinks(text: string) {
    return text.replace(/(https?:\/\/.*\S)/g, '<a href="$1">$1</a>');
  }

  convert(node: AdocTypes.AbstractNode, transform?: string, opts?: any) {
    const name = transform || node.getNodeName();
    console.debug(`convert node: transform=${transform} name=${name}`);

    this.doc = node.getDocument();

    const template = this.templates[name];
    if (template) {
      const content = template(node);
      if (content !== null) {
        return content;
      }
    }

    console.warn('handling node with base template...', name);
    const defaultContent = this.baseConverter.convert(node, transform, opts);
    console.info('handled node with base template: ', name, node, defaultContent);
    return defaultContent;
  }
}

const adoc2html = (
  content: string,
  options: Options = {},
): string => {
  const {
    backend = 'franklin',
    attributes,
    plain,
    book,
    ...opts
  } = options;

  AsciiDoctor.ConverterFactory.register(new FranklinConverter({ book }), ['franklin']);
  const html = AsciiDoctor.convert(content, {
    ...opts,
    backend,
    attributes,
  }) as string;

  return plain ? html : /* html */`
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="/scripts/scripts.js" type="module"></script>
      <link rel="stylesheet" href="/styles/styles.css">
      <link rel="icon" href="data:,">
    </head>
    
    <body>
      <header></header>
      <main>
        ${html}
      </main>
      <footer></footer>
    </body>
  </html>`;
};

export default adoc2html;
