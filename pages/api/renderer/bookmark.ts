import { server } from '@/app/config';

export function renderBookmark(block: any): string {
  const { url, metadata } = block.block.bookmark;

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

export async function fetchBookmarkMetadata(url: string) {
  try {
    const response = await fetch(server + `bookmark-metadata?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Failed to fetch metadata');
    return await response.json();
  } catch (error) {
    console.error('Metadata fetch failed:', error);
    return {
      title: new URL(url).hostname,
      description: '',
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
      image: null
    };
  }
}
