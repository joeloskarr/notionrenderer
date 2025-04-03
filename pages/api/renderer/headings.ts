import { parseRichTextToHTML } from './utils';

export function renderHeading1(block: any, bgClass: string, renderBlock: Function): string {
    if (block.block.heading_1.is_toggleable) {
        return `
      <details class="${bgClass}">
        <summary><h2>${parseRichTextToHTML(block.block.heading_1.rich_text)}</h2></summary>
        <div class='toggle-children'>${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}</div>
      </details>`;
    }
    return `<h2 class="${bgClass}">${parseRichTextToHTML(block.block.heading_1.rich_text)}</h2>`;
}

export function renderHeading2(block: any, bgClass: string, renderBlock: Function): string {
    if (block.block.heading_2.is_toggleable) {
        return `
      <details class="${bgClass}">
        <summary><h3>${parseRichTextToHTML(block.block.heading_2.rich_text)}</h3></summary>
        <div class='toggle-children'>${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}</div>
      </details>`;
    }
    return `<h3 class="${bgClass}">${parseRichTextToHTML(block.block.heading_2.rich_text)}</h3>`;
}

export function renderHeading3(block: any, bgClass: string, renderBlock: Function): string {
    if (block.block.heading_3.is_toggleable) {
        return `
      <details>
        <summary><h4>${parseRichTextToHTML(block.block.heading_3.rich_text)}</h4></summary>
        <div class='toggle-children'>${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}</div>
      </details>`;
    }
    return `<h4 class="${bgClass}">${parseRichTextToHTML(block.block.heading_3.rich_text)}</h4>`;
}
