import { parseRichTextToHTML } from './utils';

export function renderColumnList(block: any, renderBlock: Function): string {
  return `
    <div class="column-list">
      ${block.block.children
      .map((column: any, index: number, array: any[]) => `
          ${renderBlock({ block: column })}
          ${index < array.length ? '<div class="column-divider"></div>' : ''}
        `).join('')}
    </div>`;
}

export function renderColumn(block: any, renderBlock: Function): string {
  const dividerAdj = (46 * (block.block.columns - 1)) / block.block.columns + "px";
  return `
    <div class="column" style="width: calc(100% / ${block.block.columns} - ${dividerAdj});">
      ${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}
    </div>`;
}
