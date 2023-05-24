/* eslint-disable class-methods-use-this */

import asciidoctor from '@asciidoctor/core';
import type * as AdocTypes from '@asciidoctor/core';
import type { Book } from '../types';

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
      // TODO: complete templates
      paragraph: (node) => {
        // console.log('paragraph: ', node.getContent());
        return `<p>${node.getContent()}</p>`;
      },
      inline_anchor: (node) => {
        // console.debug('process inline_anchor');
        let url = node.getTarget();
        let chop = 0;
        if (url && url.endsWith('.html')) {
          chop = '.html'.length;
        } else if (url && url.endsWith('.franklin')) {
          chop = '.franklin'.length;
        }
        url = url.slice(0, -chop);

        return `<a href="${url}">${node.getText()}</a>`;
      },
      'floating-title': (node) => {
        console.debug('TODO: floating title: ', node);
        return 'todo';
      },
      embedded: (node) => {
        return node.getContent();
      },
      thematic_break: (_node) => {
        return '<hr>';
      },
      section: (node) => {
        const level = node.getLevel();
        const tag = `h${level + 1}`;
        const blocks = node.getBlocks() as AdocTypes.AbstractBlock[];
        const closer = this.closeSection();
        this.sectionDepth += 1;

        const content = `<${tag}>${node.getTitle()}</${tag}>
        ${blocks.map((block) => this.convert(block)).join('')}`;

        const wrapper = `${closer}<div>${content}${closer ? '' : '</div>'}`;
        this.sectionDepth -= 1;

        return wrapper;
      },
      literal: (node) => {
        const content = node.getContent();
        return `<pre><code>${content}</code></pre>`;
      },
      admonition: (node) => {
        const style = node.getStyle() || '';

        let title = (node.getTitle() || '').trim();
        if (title) {
          title = `<h6>${title}</h6>`;
        }

        return /* html */`
          <div class="admonition ${style.toLowerCase()}">
            <div>
              ${title}
              ${node.getContent()}
            </div>
          </div>`;
      },
      inline_quoted: (node) => {
        // console.debug('process inline_quoted');
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
        // TODO: make into `ul` instead of a block
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
        return content ? `<ol>${content}</ol>` : '';
      },
      list_item: (node) => {
        // const blocks = node.getBlocks();
        const content = this.hrefsToLinks(node.getContent());
        if (content) {
          return content.startsWith('<ul>') || content.startsWith('<ol>') ? content : `<li>${content}</li>`;
        }

        const text = node.getText();
        // TODO: handle xrefs
        return text ? `<li><p>${this.hrefsToLinks(text)}</p></li>` : '';
      },
      image: (node) => {
        const src = node.getAttribute('target') as string | undefined;
        if (!src) {
          return '';
        }

        const href = book.resolve(`/_graphics/${src}`);
        return `<img src="${href}" alt="${node.getAttribute('alt') as string || ''}" width="${node.getAttribute('width') as string}">`;
      },
      table: (node) => {
        const title = node.getTitle() || '';
        switch (title.toLowerCase()) {
          case 'fragment':
            return this.tableToFragment(node);
          default:
            return null;
        }
      },
    };
  }

  tableToFragment(node: AdocTypes.Table): string {
    const rows = node.getRows();
    const cell = rows.body[0][0];
    const href = (cell as unknown as { text: string }).text;

    return /* html */`
      <div class="fragment">
        <div>
          <a href="${href}">${href}</a>
        </div>
      </div>`;
  }

  iconsEnabled(): boolean {
    return !!this.doc.getAttribute('icons');
  }

  hrefsToLinks(text: string) {
    return text.replace(/(https?:\/\/.*\S)/g, '<a href=$1>$1</a>');
  }

  closeSection() {
    if (this.sectionDepth) {
      return new Array(this.sectionDepth).fill('</div>').join('');
    }
    return '';
  }

  convert(node: AdocTypes.AbstractNode, transform?: string, opts?: any) {
    // console.log('converting node...');
    const name = transform || node.getNodeName();
    console.log(`convert node: transform=${transform} name=${name}`);

    this.doc = node.getDocument();

    const template = this.templates[name];
    if (template) {
      const content = template(node);
      if (content !== null) {
        return content;
      }
    }

    console.log('handling node with base template...', name);
    const defaultContent = this.baseConverter.convert(node, transform, opts);
    console.log('handled node with base template: ', name, node, defaultContent);
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
