import { parseRichTextToHTML } from './utils';

export function renderToggle(block: any, bgClass: string, renderBlock: Function): string {
  return `
    <details class="${bgClass}">
      <summary>${parseRichTextToHTML(block.block.toggle.rich_text)}</summary>
      <div class='toggle-children'>
        ${(block.block.children || []).map((child: any) => `
          <div class="block" id="${child.id}">
            ${renderBlock({ block: child })}
          </div>
        `).join('')}
      </div>
    </details>`;
}

export function renderCallout(block: any, bgClass: string, renderBlock: Function): string {
  const calloutColor = block.block.callout.color;
  const calloutCssVariable = calloutColor.includes("_background")
    ? `var(--color-bg-${calloutColor.split("_")[0]})`
    : `var(--color-text-${calloutColor})`;
  const calloutStyle = calloutColor.includes("_background")
    ? `background-color:${calloutCssVariable};`
    : `color:${calloutCssVariable};`;

  console.log(block.block.callout?.rich_text[0]?.plain_text);

  return `
    <div class="callout ${bgClass}" style="${calloutStyle}">
      <span class="callout-icon">${block.block.callout.icon.emoji}</span>
      <div class='callout-children'>
        ${block.block.callout?.rich_text[0]?.plain_text ? `<div class="block"><p>${parseRichTextToHTML(block.block.callout.rich_text)}</p></div>` : ''}
        ${(block.block.children || []).map((child: any) => `
          <div class="block" id="${child.id}">
            ${renderBlock({ block: child })}
          </div>
        `).join('')}
      </div>
    </div>`;
}

export function renderQuote(block: any): string {
  return `
    <blockquote style="border-left: 4px solid var(--color-text-${block.block.quote.color || 'default'}); padding-left: 10px; margin: 10px 0;">
      ${parseRichTextToHTML(block.block.quote.rich_text)}
    </blockquote>`;
}
