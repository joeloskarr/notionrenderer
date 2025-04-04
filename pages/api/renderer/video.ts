import { parseRichTextToHTML } from './utils';

export function renderVideoBlock(video: any): string {
  if (video.type === 'external' &&
    (video.external.url.startsWith('https://www.youtube.com/watch?') ||
      video.external.url.startsWith('https://youtu.be/') ||
      video.external.url.startsWith('https://youtube.com/watch?') ||
      video.external.url.startsWith('https://www.youtube.com/watch?'))) {
    console.log("video.external.url", video.external.url, video.external.url.split('/').pop())
    const videoId = new URL(video.external.url).searchParams.get('v') || (video.external.url.includes("youtu.be/") ? video.external.url.split('/').pop() : '');
    return `
      <div class="video-block" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
        <iframe 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
        src="https://www.youtube.com/embed/${videoId}" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
        </iframe>
      </div>
        ${video.caption?.length ? `<div class="image-caption">${parseRichTextToHTML(video.caption)}</div>` : ''}
    `;
  }

  if (video.type === 'external' &&
    (video.external.url.startsWith('https://www.loom.com/share/') ||
      video.external.url.startsWith('https://loom.com/share/'))) {
    const videoId = video.external.url.split('/').pop();
    return `
      <div class="video-block" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
        <iframe 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
        src="https://www.loom.com/embed/${videoId}" 
        frameborder="0" 
        webkitallowfullscreen 
        mozallowfullscreen 
        allowfullscreen>
        </iframe>
      </div>
        ${video.caption?.length ? `<div class="image-caption">${parseRichTextToHTML(video.caption)}</div>` : ''}
    `;
  }

  // Fallback for unsupported video types
  if (video.type === 'file') {
    return `
      <div class="video-block">
        <video controls style="width: 100%;">
          <source src="${video.file.url}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
        ${video.caption?.length ? `<div class="image-caption">${parseRichTextToHTML(video.caption)}</div>` : ''}
      </div>
    `;
  }

  return ''; // Fallback for unsupported video types
}
