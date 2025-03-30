import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const response = await fetch('http://localhost:3000/api/get', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Failed to fetch data' });
  }

  //const blocks = exampleBlocks;
  const blocks = await response.json();

  // Function to escape HTML special characters
  function escapeHTML(str: string): string {
    return str
      .replace(/&/g, "\&")
      .replace(/</g, "\<")
      .replace(/>/g, "\>")
      .replace(/"/g, '\"')
      .replace(/'/g, "\'");
  }

  // Function to parse rich text annotations and generate HTML
  function parseRichTextToHTML(richText: any[]): string {
    return richText.map((textObj) => {
      const { content } = textObj.text;
      const { bold, italic, strikethrough, underline, code, color } = textObj.annotations;

      let html = escapeHTML(content); // Escape HTML special characters

      // Apply annotations
      if (bold) html = `<b>${html}</b>`;
      if (italic) html = `<i>${html}</i>`;
      if (strikethrough) html = `<s>${html}</s>`;
      if (underline) html = `<u>${html}</u>`;
      if (code) html = `<code>${html}</code>`;

      // Apply color styling using CSS variables
      if (color && color !== "default") {
        const cssVariable = color.includes("_background")
          ? `var(--color-bg-${color.split("_")[0]})`
          : `var(--color-text-${color})`;
        const style = color.includes("_background")
          ? `background-color:${cssVariable};`
          : `color:${cssVariable};`;
        html = `<span style="${style}">${html}</span>`;
      }

      // Handle links
      if (textObj.text.link) {
        html = `<a href="${textObj.text.link.url}">${html}</a>`;
      }

      return html;
    }).join("");
  }


  function renderBlock(block: any) {

    let type = "";
    if (block.block) type = block.block.type
    else type = block.type;

    switch (type) {
      case 'paragraph':
        return `<p>${parseRichTextToHTML(block.block.paragraph.rich_text)}</p>`;
      case 'child_page':
        return `
          <div class="child-page">
            <a href="${block.page.public_url}" target="_blank">
              <span class="emoji">${block.page.icon?.emoji || '📄'}</span> <span class="alink">${block.page.properties.title.title[0].plain_text}</span>
            </a>
          </div>`;
      case 'heading_1':
        return `<h2>${parseRichTextToHTML(block.block.heading_1.rich_text)}</h2>`;
      case 'heading_2':
        return `<h3>${parseRichTextToHTML(block.block.heading_2.rich_text)}</h3>`;
      case 'heading_3':
        return `<h4>${parseRichTextToHTML(block.block.heading_3.rich_text)}</h4>`;
      case 'divider':
        return `<div class="divider" />`;
      case 'callout':
        const calloutColor = block.block.callout.color;
        const calloutCssVariable = calloutColor.includes("_background")
          ? `var(--color-bg-${calloutColor.split("_")[0]})`
          : `var(--color-text-${calloutColor})`;
        const calloutStyle = calloutColor.includes("_background")
          ? `background-color:${calloutCssVariable};`
          : `color:${calloutCssVariable};`;
        return `
          <div class="callout" style="${calloutStyle}">
            <span class="callout-icon">${block.block.callout.icon.emoji}</span>
            ${parseRichTextToHTML(block.block.callout.rich_text)}
          </div>`;
      case 'column_list':
        return `
          <div class="column-list">
            ${block.block.children
            .map((column: any, index: number, array: any[]) => `
                ${renderBlock({ block: column })}
                ${index < array.length ? '<div class="column-divider"></div>' : ''}
              `).join('')}
          </div>`;
      case 'column':
        return `
          <div class="column">
            ${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}
          </div>`;
      case 'image':
        const imageUrl = block.block.image.file.url;
        const caption = block.block.image.caption.map((textObj: any) => textObj.plain_text).join(' ');
        return `
          <div class="image-block">
            <img src="${imageUrl}" alt="${caption}" />
            ${caption ? `<div class="image-caption">${caption}</div>` : ''}
          </div>`;
      case 'quote':
        return `
          <blockquote style="border-left: 4px solid var(--color-text-${block.block.quote.color || 'default'}); padding-left: 10px; margin: 10px 0;">
            ${parseRichTextToHTML(block.block.quote.rich_text)}
          </blockquote>`;
      case 'toggle':
        return `
          <details style="margin: 10px 0; padding: 5px; border-radius: 5px;">
            <summary>${parseRichTextToHTML(block.block.toggle.rich_text)}</summary>
            <div class='toggle-children'>${(block.children || []).map((child: any) => renderBlock({ block: child })).join('')}</div>
          </details>`;
      case 'bulleted_list_item':
        return `<li>${parseRichTextToHTML(block.block.bulleted_list_item.rich_text)}</li>`;
      case 'numbered_list_item':
        return `<li>${parseRichTextToHTML(block.block.numbered_list_item.rich_text)}</li>`;
      case 'code':
        const Prism = require('prismjs');
        const loadLanguages = require('prismjs/components/');
        const codeContent = block.block.code.rich_text.map((textObj: any) => textObj.plain_text).join('');
        const codeLanguage = block.block.code.language || 'plaintext';
        loadLanguages([codeLanguage]);
        const highlightedCode = Prism.highlight(escapeHTML(codeContent), Prism.languages[codeLanguage], codeLanguage);
        return `
          <div class="code-block-container">
            <div class="code-block-header">
              <span class="code-language">${codeLanguage}</span>
              <button class="copy-button" onclick="navigator.clipboard.writeText(\`${escapeHTML(codeContent)}\`)">Copy</button>
            </div>
            <pre class="code-block" style="overflow-x: auto; white-space: pre;"><code class="language-${codeLanguage}">${highlightedCode}</code></pre>
          </div>`;
      case 'table_of_contents':
        return renderTableOfContents(blocks); // Render the table of contents
      case 'bookmark': {
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

      default:
        return '';
    }
  }

  function renderHeader() {
    let html1 = "<div class='layout-content'>";
    if (blocks[0].master.icon?.emoji) html1 += `<div class='notion-header-icon'>${blocks[0].master.icon.emoji}</div>`;
    html1 += `<div class='notion-header-title'><h1>${blocks[0].master.properties.title.title[0].plain_text}</h1></div>`;
    html1 += '</div>'
    return html1;
  }

  function renderNestedList(blocks: any[], type: string, start: number = 1): string {
    let html = type === 'numbered_list_item' ? `<ol start="${start}">` : '<ul>';

    blocks.forEach((block: any) => {

      html += `<div class="block" id="${block.id}">`;
      html += renderBlock({ block: block });

      if (block.children?.length > 0) {
        html += renderNestedList(block.children, type);
      }
      html += '</div>';
    });
    html += type === 'numbered_list_item' ? '</ol>' : '</ul>';
    return html;
  }

  function renderTableOfContents(blocks: any[]): string {
    const headings = blocks.filter((block: any) => {
      const type = block.block?.type || block.type;
      return type === 'heading_1' || type === 'heading_2' || type === 'heading_3';
    });

    if (headings.length === 0) return ''; // No headings, no table of contents

    let html = '<div class="table-of-contents"><ul>';

    headings.forEach((block: any) => {
      const type = block.block?.type || block.type;
      const headingText = block.block[type].rich_text.map((textObj: any) => textObj.plain_text).join(''); // Use plain text
      const headingId = block.block.id;

      let listItemClass = '';
      if (type === 'heading_1') listItemClass = 'toc-heading-1';
      else if (type === 'heading_2') listItemClass = 'toc-heading-2';
      else if (type === 'heading_3') listItemClass = 'toc-heading-3';

      html += `<div class="block" id="${block.block.id}">`;

      html += `<li class="${listItemClass}"><a href="#${headingId}"><span class="link">${headingText}</span></a></li>`;

      html += '</div>';
    });

    html += '</ul></div>';
    return html;
  }

  function renderContent() {
    let html = '<div class="layout-full">';

    html += renderHeader();

    html += "<div class='layout-content'>";
    html += "<div class='notion-page-content'>";

    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i];
      if (block.master) { //Don't render header. It is rendered above.
        i++;
        continue;
      }

      const type = block.block?.type || block.type;

      // NUMBERED LISTS LOGIC
      if (type === 'numbered_list_item') {
        html += `<div class="block" id="${block.block.id}">`;
        let start = block.block.numbered_list_item.start || 1;
        const numberedBlocks = [];

        // Collect consecutive numbered_list_item blocks
        while (i < blocks.length && blocks[i].block?.type === 'numbered_list_item') {
          numberedBlocks.push(blocks[i].block);
          i++;
        }

        html += renderNestedList(numberedBlocks, 'numbered_list_item', start);
        html += '</div>';
        // BULLETED LISTS LOGIC
      } else if (type === 'bulleted_list_item') {
        html += `<div class="block" id="${block.block.id}">`;
        html += renderNestedList([block.block], 'bulleted_list_item');
        html += '</div>';
        i++;
        // DEFAULT BLOCKS
      } else {
        html += `<div class="block" id="${block.block.id}">`;
        html += renderBlock(block);
        html += '</div>';
        i++;
      }
    }

    html += '</div>'; // Close notion-page-content
    html += '</div>'; // Close layout-content
    html += '</div>'; // Close layout-full
    return html;
  }

  const html = renderContent();

  res.status(200).json(html);
}
