import { parseRichTextToHTML } from './utils';

export function renderImage(block: any): string {
    let imageUrl;

    if (block.block.image.type === 'external') {
        imageUrl = block.block.image.external.url;
    } else {
        imageUrl = block.block.image.file.url;
    }

    const caption = block.block.image.caption.map((textObj: any) => textObj.plain_text).join(' ');

    return `
    <div class="image-block">
      <img src="${imageUrl}" alt="${caption}" />
      ${caption ? `<div class="image-caption">${parseRichTextToHTML(block.block.image.caption)}</div>` : ''}
    </div>`;
}
