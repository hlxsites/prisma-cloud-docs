import asciidoctor from '@asciidoctor/core';
import type { Converter, AbstractNode, ProcessorOptions } from '@asciidoctor/core';
import type * as AdocTypes from '@asciidoctor/core';

const AsciiDoctor = asciidoctor();

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
  admonition: AdocTypes.AbstractBlock;
  audio: AdocTypes.AbstractBlock;
  colist: AdocTypes.List;
  dlist: AdocTypes.List;
  olist: AdocTypes.List;
  ulist: AdocTypes.List;
  list_item: AdocTypes.AbstractBlock;
  inline_anchor: AdocTypes.AbstractBlock;
  inline_quoted: AdocTypes.AbstractNode;
  table: AdocTypes.Table;
  example: AdocTypes.AbstractBlock;
  paragraph: AdocTypes.AbstractBlock;
  'floating-title': AdocTypes.AbstractBlock;
  thematic_break: AdocTypes.AbstractNode;

  [key: string]: AdocTypes.AbstractNode;
}

class FranklinConverter implements Converter {
  baseConverter: Converter;
  // TODO: make node type -> node interface map
  templates: { [K in keyof NodeTypeMap]?: (node: NodeTypeMap[K]) => string };
  sectionDepth = 0;
  inSection = false;

  constructor() {
    this.baseConverter = new AsciiDoctor.Html5Converter();
    this.templates = {
      // TODO: complete templates
      paragraph: (node) => {
        // console.log('paragraph: ', node.getContent());
        return `<p>${node.getContent()}</p>`;
      },
      inline_anchor: (node) => {
        // console.debug('process inline_anchor');
        let url = node.target;
        if (url && url.endsWith('.html')) {
          url = url.slice(0, -'.html'.length);
        }
        return `<a href="${url}">${node.text}</a>`;
      },
      'floating-title': (node) => {
        console.debug('floating title: ', node);
        return `todo`;
      },
      embedded: (node) => {
        return node.getContent();
      },
      thematic_break: (_node) => {
        return '<hr>';
      },
      section: (node) => {
        console.debug('section context, id: ', node.getContext(), node.getId(), node.getTitle(), node.getLevel());
        // console.log('section node: ', node);

        const level = node.getLevel();
        const tag = `h${level + 1}`
        const blocks = node.getBlocks();
        console.log('section blocks: ', blocks.length);
        // const closers = new Array(level - 1).fill('</div>').join('');

        const closer = this.closeSection();
        this.sectionDepth += 1;
        // console.log('closer: ', closer);

        const content = `<${tag}>${node.getTitle()}</${tag}>
        ${blocks.map(block => this.convert(block)).join('')}`;
        // console.log('section content: ', content);

        const wrapper = `${closer}<div>${content}${closer ? '' : '</div>'}`;

        this.sectionDepth -= 1;
        return wrapper;
      },
      admonition: (node) => {
        const style = node.getStyle() || '';
        console.debug('process admonition: ', node);
        const hrefsToLinks = (line: string) => {
          return line.replace(/(https?:\/\/.*\S)/g, `<a href=$1>$1</a>`);
        }
        return `<div class="admonition ${style.toLowerCase()}"><div>${node.lines.map(line => `<p>${hrefsToLinks(line)}</p>`)
          }</div></div>`
      },
      inline_quoted: (node) => {
        // console.debug('process inline_quoted');
        const content = node.text;
        const tag = node.type === 'strong' ? 'strong' : undefined;
        if (!tag) {
          console.warn('[inline_quoted] unhandled node: ', node);
        }
        return tag ? `<${tag}>${content}</${tag}>` : content;
      },
      ulist: (node) => {
        const blocks = node.getBlocks();
        console.debug('process ulist: ', blocks.length, blocks);

        const content = blocks.map(block => this.convert(block)).join('');
        console.debug('ulist content: ', content);
        return content ? `<ul>${content}</ul>` : '';
      },
      list_item: (node) => {
        const blocks = node.getBlocks();
        const content = node.getContent();
        if (content) {
          return `<li>${content}</li>`
        }

        const text = node.text;
        // TODO: handle xrefs
        return text ? `<li>${text}</li>` : '';
      }
    }
  }

  closeSection() {
    if (this.sectionDepth) {
      return new Array(this.sectionDepth).fill(`</div>`).join('');
    }
    return '';
  }

  convert(node: AbstractNode, transform?: string, opts?: any) {
    // console.log('converting node...');
    const name = transform || node.getNodeName();
    console.log(`convert node: transform=${transform} name=${name} type=${(node as any).type}`);

    const template = this.templates[name];
    if (template) {
      return template(node);
    }

    console.log('handling node with base template...', name);
    const defaultContent = this.baseConverter.convert(node, transform, opts);
    console.log('handled node with base template: ', name, node, defaultContent);
    return defaultContent;

  }
}

AsciiDoctor.ConverterFactory.register(new FranklinConverter(), ['html5']);

const adoc2html = (
  content: string,
  opts: ProcessorOptions = {}
): string => `<main>${AsciiDoctor.convert(content, { ...opts, backend: 'html5' }) as string}</main>`;

export default adoc2html;