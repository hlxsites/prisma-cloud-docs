import asciidoctor from '@asciidoctor/core';
import type { Converter, AbstractNode, ProcessorOptions } from '@asciidoctor/core';

const AsciiDoctor = asciidoctor();

type NodeType = 'document' | 'embedded' | 'outline' | 'section' | 'admonition' | 'audio' | 'colist' | 'dlist' | 'example' | 'floating-title' | 'image' | 'listing' | 'literal' | 'stem' | 'olist' | 'open' | 'page_break' | 'paragraph' | 'preamble' | 'quote' | 'thematic_break' | 'sidebar' | 'table' | 'toc' | 'ulist' | 'verse' | 'video' | 'inline_anchor' | 'inline_break' | 'inline_button' | 'inline_callout' | 'inline_footnote' | 'inline_image' | 'inline_indexterm' | 'inline_kbd' | 'inline_menu' | 'inline_quoted';

class FranklinConverter implements Converter {
  baseConverter: Converter;
  // TODO: make node type -> node interface map
  templates: { [key in NodeType]?: (node: AbstractNode) => string };

  constructor() {
    this.baseConverter = new AsciiDoctor.Html5Converter();
    this.templates = {
      // TODO: complete templates
      paragraph: (node) => `<p class="paragraph">${(node as any).getContent()}</p>`
    }
  }

  convert(node: AbstractNode, transform?: string, opts?: any) {
    console.log('convert node: ', transform, (node as any).type);

    const name = transform || node.getNodeName();
    console.log(`convert node: name=${name}`);

    const template = this.templates[name];
    if (template) {
      return template(node)
    }
    return this.baseConverter.convert(node, transform, opts)
  }
}

AsciiDoctor.ConverterFactory.register(new FranklinConverter(), ['franklin'])

export default (
  content: string,
  opts: ProcessorOptions = {}
) => AsciiDoctor.convert(content, { ...opts, backend: 'franklin' });