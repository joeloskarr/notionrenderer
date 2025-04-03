import { parseRichTextToHTML } from './utils';

export function renderBookmark(block: any): string {
    const { url, metadata } = block.block.bookmark;
    const hostname = new URL(url).hostname.replace('www.', '');

    return `
    <div class="notion-bookmark">
      <a href="${url}" target="_blank" class="notion-bookmark-link">
        <div class="notion-bookmark-content">
          <div class="notion-bookmark-text">
            <div class="notion-bookmark-title">
              ${metadata.title}
            </div>
            ${metadata.description ? `
            <div class="notion-bookmark-description">
              ${metadata.description}
            </div>` : ''}
          </div>
          <div class="notion-bookmark-href">
            <img src="${metadata.favicon}" 
                 class="notion-bookmark-favicon" />
            <span>${url}</span>
          </div>
        </div>
        ${metadata.image ? `
        <div class="notion-bookmark-image">
          <img src="${metadata.image}" alt="${metadata.description || ''}" />
        </div>` : ''}
      </a>
    </div>
  `;
}
