import type { NextApiRequest, NextApiResponse } from 'next';
import { renderPDFBlock } from './renderer/pdf';
import { renderVideoBlock } from './renderer/video';
import { escapeHTML, parseRichTextToHTML, getOptionStyle, extractIcon } from './renderer/utils';
import { renderHeading1, renderHeading2, renderHeading3 } from './renderer/headings';
import { renderCodeBlock } from './renderer/code';
import { renderCallout, renderToggle, renderQuote } from './renderer/misc';
import { renderColumnList, renderColumn } from './renderer/columns';
import { renderImage } from './renderer/image';
import { renderBookmark } from './renderer/bookmark';
import { renderToDo } from './renderer/todo';
import { renderTables } from './renderer/tables';
import { server } from '@/app/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://46.101.7.7:3000'); // Replace with your frontend's origins
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end(); // Handle preflight requests
    return;
  }

  const { id, nk, links } = req.query; // Extract 'id' from the query parameters

  if (!id || id === 'null' || id === 'undefined') {
    return res.status(400).json({ error: 'No ID provided' });
  }

  const response = await fetch(server + `get?id=${id}&nk=${nk}&links=${links}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'Failed to fetch data', details: errorText });
  }

  //const blocks = exampleBlocks;
  const blocks = await response.json();

  const metaBlock = blocks[0]?.master;
  const isDatabaseRow = metaBlock?.parent?.type === 'database_id';
  const isDatabase = metaBlock?.object === 'database';

  function getOrderedProps(database: any, rows: any): string[] {
    // Search for the "notionrooms" column

    const notionRoomsColumn = Object.entries(database.properties).find(([key, prop]: [string, any]) =>
      prop.name.toLowerCase() === "notionrooms"
    );

    let orderedProps: string[] = [];

    if (notionRoomsColumn) {
      const [_, column] = notionRoomsColumn as [string, { id: string }];

      // Look through all cells in the "notionrooms" column
      for (const row of rows || []) {
        const cellValue = row.properties["notionrooms"]?.rich_text?.[0]?.plain_text || '';
        const match = cellValue.match(/\[Order:\s*(.*?)\]/);

        if (match) {
          orderedProps = match[1].split(',').map((prop: string) => prop.trim()); // Trim whitespace
          break;
        }
      }
    }

    // Fallback to default order if no match is found
    if (orderedProps.length === 0) {
      orderedProps = Object.keys(database.properties);
    }

    // Ensure "title" is always the first property
    const titleIndex = orderedProps.findIndex((prop) => database.properties[prop]?.id === "title");
    if (titleIndex > -1) {
      const [titleProp] = orderedProps.splice(titleIndex, 1);
      orderedProps.unshift(titleProp);
    }

    return orderedProps;
  }

  function renderBlock(block: any) {

    let type = "";
    if (block.block) type = block.block.type
    else type = block.type;

    // Extract color and determine background style if applicable
    const color = block.block[type]?.color || block[type]?.color;
    const colorOption = color
      ? color.includes("_background")
        ? `color-bg-${color.split("_")[0]}`
        : `color-text-${color}`
      : "";

    switch (type) {
      case 'paragraph':
        return `<p class="${colorOption}">${parseRichTextToHTML(block.block.paragraph.rich_text)}</p>`;
      case 'child_page':
        return `
          <div class="child-page ${colorOption}">
          <span class="emoji">${block.block.page.icon?.emoji || '📄'}</span>   
          <a href="${block.block.page.service_url}">
              <span class="alink">${block.block.page.properties.title.title[0].plain_text}</span>
            </a>
          </div>`;
      case 'heading_1':
        return renderHeading1(block, colorOption, renderBlock);

      case 'heading_2':
        return renderHeading2(block, colorOption, renderBlock);

      case 'heading_3':
        return renderHeading3(block, colorOption, renderBlock);

      case 'toggle':
        return renderToggle(block, colorOption, renderBlock);
      case 'divider':
        return `<span class="divider-container"><span class="divider">&nbsp;</span></span>`;
      case 'callout':
        return renderCallout(block, colorOption, renderBlock);
      case 'column_list':
        return renderColumnList(block, renderBlock);
      case 'column':
        return renderColumn(block, renderBlock);
      case 'image':
        return renderImage(block);
      case 'quote':
        return renderQuote(block);
      case 'bulleted_list_item':
        return renderNestedList([block.block], 'bulleted_list_item');
      case 'numbered_list_item':
        const start = getNumberedListStart(blocks, block.block.id);
        return renderNestedList([block.block], 'numbered_list_item', start);
      case 'code':
        return renderCodeBlock(block);
      case 'table_of_contents':
        return renderTableOfContents(blocks); // Render the table of contents
      case 'bookmark':
        return renderBookmark(block);
      case 'to_do':
        return renderToDo(block);
      case 'child_database':
        if (block.block.database?.is_inline !== false || isDatabase) {
          return renderDatabase(block.block.database, block.block.rows);
        } else {
          return `
        <div class="child-page">
        <span class="emoji">${block.block.database.icon?.emoji || '📄'}</span>   
        <a href="${block.block.database.service_url}" target="_blank">
            <span class="alink">${block.block.database?.title[0]?.plain_text || "Untitled"}</span>
          </a>
        </div>`;
        }
      case 'database_row': {
        const database = block.block.database;
        const rows = [block.block.properties];

        return `
            <div class="notion-database">
              <div class="notion-database-table-wrapper">
          <table class="notion-database-table">
            <tbody>
              ${Object.keys(database.properties).map(propName => {
          const prop = database.properties[propName];
          if (prop.id === "title" || propName === 'notionrooms') return ""; //Filters
          const propValue = rows[0][propName];
          const renderedValue = renderPropertyValue(propValue, prop) || '<span class="column-name">Empty</span>';

          return `
            <tr>
              <td class="property-label database-row">
                <div class="column-name">
                  <i class="fa-solid ${getFontAwesomeIcon(prop.type)} column-icon"></i>
                  ${propName}
                </div>
              </td>
              <td class="property-value database-row">
                ${renderedValue}
              </td>
            </tr>
                `;
        }).join('')}
            </tbody>
          </table>
              </div>
            </div>
          `;
      }
      case 'video': {
        return renderVideoBlock(block.block.video);
      }
      case 'embed': {
        const embedUrl = block.block.embed.url;
        const twitterRegex = /(twitter\.com|x\.com)\/.*\/status\/(\d+)/;
        const spotifyPlaylistRegex = /https:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/;
        const spotifyPodcastRegex = /https:\/\/open\.spotify\.com\/episode\/([a-zA-Z0-9]+)/;
        const spotifyTrackRegex = /https:\/\/open\.spotify\.com\/(?:embed\/)?track\/([a-zA-Z0-9]+)/;
        const googleMapsRegex = /https:\/\/www\.google\.com\/maps\/place\/([^/]+)/;
        const figmaRegex = /https:\/\/www\.figma\.com\/file\/([a-zA-Z0-9]+)\/([^?]+)/;
        const soundcloudRegex = /https:\/\/soundcloud\.com\/([a-zA-Z0-9-_]+)\/([a-zA-Z0-9-_]+)/;
        const airtableRegex = /https:\/\/airtable\.com\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/;

        const twitterMatch = embedUrl.match(twitterRegex);
        const spotifyPlaylistMatch = embedUrl.match(spotifyPlaylistRegex);
        const spotifyPodcastMatch = embedUrl.match(spotifyPodcastRegex);
        const spotifyTrackMatch = embedUrl.match(spotifyTrackRegex);
        const googleMapsMatch = embedUrl.match(googleMapsRegex);
        const figmaMatch = embedUrl.match(figmaRegex);
        const soundcloudMatch = embedUrl.match(soundcloudRegex);
        const airtableMatch = embedUrl.match(airtableRegex);

        if (twitterMatch) {
          const tweetId = twitterMatch[2];
          return `
            <div class="video-block no-scrollbar">
              <iframe id="if-${tweetId}" scrolling="no" class="no-scrollbar" src="https://platform.twitter.com/embed/Tweet.html?id=${tweetId}" >
              </iframe>
            </div>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          `;
        }

        if (spotifyPlaylistMatch) {
          const playlistId = spotifyPlaylistMatch[1];
          return `
            <div class="spotify-block">
              <iframe 
                src="https://open.spotify.com/embed/playlist/${playlistId}" 
                width="100%" 
                height="380" 
                frameborder="0" 
                allowtransparency="true" 
                allow="encrypted-media">
              </iframe>
            </div>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          `;
        }

        if (spotifyPodcastMatch) {
          const episodeId = spotifyPodcastMatch[1];
          return `
            <div class="spotify-block">
              <iframe 
                src="https://open.spotify.com/embed/episode/${episodeId}" 
                width="100%" 
                height="152" 
                frameborder="0" 
                allowtransparency="true" 
                allow="encrypted-media">
              </iframe>
            </div>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          `;
        }

        if (spotifyTrackMatch) {
          const trackId = spotifyTrackMatch[1];
          return `
            <div class="spotify-block">
              <iframe 
                src="https://open.spotify.com/embed/track/${trackId}" 
                width="100%" 
                height="152" 
                frameborder="0" 
                allowtransparency="true" 
                allow="encrypted-media">
              </iframe>
            </div>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          `;
        }

        if (googleMapsMatch) {
          const place = googleMapsMatch[1];
          return `
            <div class="google-maps-block">
              <iframe 
                src="https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_MAPS}&q=${encodeURIComponent(place)}" 
                width="100%" 
                height="450" 
                style="border:0;" 
                allowfullscreen="" 
                loading="lazy">
              </iframe>
            </div>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          `;
        }

        if (figmaMatch) {
          const fileId = figmaMatch[1];
          const fileName = figmaMatch[2];
          return `
            <div class="figma-block">
              <iframe 
                src="https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/${fileId}/${encodeURIComponent(fileName)}" 
                width="100%" 
                height="450" 
                allowfullscreen 
                style="border: none;">
              </iframe>
            </div>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          `;
        }

        if (soundcloudMatch) {
          const user = soundcloudMatch[1];
          const track = soundcloudMatch[2];
          return `
            <div class="soundcloud-block">
              <iframe 
                width="100%" 
                height="166" 
                scrolling="no" 
                frameborder="no" 
                allow="autoplay" 
                src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/${user}/${track}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true">
              </iframe>
            </div>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          `;
        }

        if (airtableMatch) {
          const baseId = airtableMatch[1];
          const tableId = airtableMatch[2];
          return `
            <div class="airtable-block">
              <iframe 
                src="https://airtable.com/embed/${baseId}/${tableId}" 
                width="100%" 
                height="533" 
                frameborder="0" 
                style="background: transparent; border: 1px solid #ccc;">
              </iframe>
            </div>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          `;
        }

        // Fallback for unsupported embeds
        return `
          <div class="embed-block">
            <iframe 
              src="${embedUrl}" 
              width="100%" 
              height="450" 
              frameborder="0" 
              allowfullscreen 
              style="border: none;">
            </iframe>
            ${block.block.embed.caption?.length ? `
              <div class="image-caption">
                ${parseRichTextToHTML(block.block.embed.caption)}
              </div>
            ` : ''}
          </div>
        `;
      }
      case 'pdf':
        return renderPDFBlock(block.block.pdf);
      case 'audio': {
        const audioUrl = block.block.audio.type === 'external'
          ? block.block.audio.external.url
          : block.block.audio.file.url;

        const caption = block.block.audio.caption.map((textObj: any) => textObj.plain_text).join(' ');

        return `
          <div class="audio-block">
            <audio controls>
              <source src="${audioUrl}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>
            ${caption ? `<div class="audio-caption">${parseRichTextToHTML(block.block.audio.caption)}</div>` : ''}
          </div>
        `;
      }
      case 'file': {
        const fileData = block.block.file;
        const fileUrl = fileData.file.url;
        const fileName = fileData.name;

        if (!fileName) {
          return ''; // Skip rendering if the name property is missing
        }

        return `
          <div class="file-block">
            <a href="${fileUrl}" download="${fileName}" class="file-download-link">
              <i class="fa-solid fa-download"></i> ${fileName}
            </a>
          </div>
        `;
      }
      case 'synced_block': {
        return `<p class="column-name">[Synced block are not supported]</p>`;
      }
      case 'equation': {
        const expression = block.block.equation?.expression || '';
        return `
          <div class="equation-block">
            <span class="math-expression">
              \\(${expression}\\)
            </span>
          </div>
        `;
      }
      case 'link_preview': {
        const href = block.block.link_preview.url;
        const icon_url = block.block.link_preview.favicon || '';
        const thumbnail_url = block.block.link_preview.image || '';
        const title = block.block.link_preview.title || '';
        const shortTitle = title.length > 30 ? `${title.substring(0, 30)}...` : title;
        const description = block.block.link_preview.description || '';
        const urlDomain = new URL(href).hostname;

        return `
          <span class="link-preview" style="display: inline-flex; align-items: center; gap: 8px; position: relative;">
            <a href="${href}" target="_blank" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 8px;">
              <img src="${icon_url}" alt="favicon" style="width: 16px; height: 16px; border-radius: 2px;">
              <span class="link-preview-domain">${escapeHTML(urlDomain)}</span>
              <span class="link-preview-title">${escapeHTML(shortTitle)}</span>
            </a>
            <span class="hover-box">
              <span class="hover-box-content">
                <span class="link-preview-full-thumbnail"><img src="${thumbnail_url}" alt="thumbnail"></span>
                <span class="link-preview-full-title" style="font-weight: bold; text-align: left;">${escapeHTML(title)}</span>
                <span class="link-preview-full-description">${escapeHTML(description)}</span>
              </span>
              <span class="hover-box-footer" style="margin-top: 8px; font-size: 0.8em; color: gray; display: flex; align-items: center; gap: 4px;">
                <img src="${icon_url}" alt="favicon" style="width: 12px; height: 12px; border-radius: 2px;">
                <span>${escapeHTML(urlDomain)}</span>
              </span>
            </span>
          </span>
        `;
      }
      case 'table':
        return renderTables(block.block, block.block.children);
      case 'breadcrumb':
        return renderBreadcrumb(metaBlock.breadcrumb);
      default:
        return '';
    }
  }

  // Ridiculously complex function to get the start number of a numbered list
  function getNumberedListStart(listBlocks: any[], currentBlockId: string): number {
    let targetBlock: any = null;
    let parentBlockId: string | null = null;

    // Helper function to find the block with currentBlockId and its parent
    function findBlockAndParent(blocksParam: any[], currentBlockId: string): boolean {
      for (const arrayBlock of blocksParam) {
        let block = arrayBlock.block || arrayBlock;

        if (block?.id === currentBlockId) {
          targetBlock = block;
          parentBlockId = block?.parent[block?.parent?.type] || null;
          return true;
        }

        // Check children recursively
        if (block?.children) {
          const foundInChildren = findBlockAndParent(block.children, currentBlockId);
          if (foundInChildren) return true;
        }
      }
      return false;
    }

    // Helper function to count numbered_list_items before the target block
    function countNumberedListItems(parentChildren: any[], currentBlockId: string): number {
      let count = 0;
      for (const arrayChild of parentChildren) {
        let child = arrayChild.block || arrayChild;
        if (child.id === currentBlockId) break;
        if (child.type === 'numbered_list_item') count++;
      }
      return count;
    }

    // Step 1: Find the target block and its parent
    findBlockAndParent(listBlocks, currentBlockId);

    if (!targetBlock || !parentBlockId) return 1; // Default to 1 if block or parent not found

    // Step 2: Find the parent's children
    let parentChildren: any[] = [];
    function findParentChildren(blocksParam: any[], parentBlockId: string): boolean {
      for (const arrayBlock of blocksParam) {
        let block = arrayBlock.block || arrayBlock;
        if (block?.id === parentBlockId) {
          parentChildren = block?.children || [];
          return true;
        }

        // Check children recursively
        if (block?.children) {
          const foundInChildren = findParentChildren(block.children, parentBlockId);
          if (foundInChildren) return true;
        }
      }
      return false;
    }

    findParentChildren(listBlocks, parentBlockId);

    // Case for top level numbered lists where parent is the page itself
    if (parentBlockId == metaBlock.id) {
      return countNumberedListItems(blocks, currentBlockId) + 1; // Start numbering from 1
    }
    // Step 3: Count numbered_list_items before the target block
    return countNumberedListItems(parentChildren, currentBlockId) + 1; // Start numbering from 1
  }


  // Add new renderDatabase function
  function renderDatabase(database: any, rows: any[] = []) {
    // Get the ordered properties, excluding "hidden text"
    let orderedProps = getOrderedProps(database, rows);

    const databaseTitle = database.title?.[0]?.plain_text || database.title.plain_text;

    // Navigation panel HTML
    const navigationPanel = `
    <div class="notion-database-navigation">
    <span class="notion-database-view active"><i class="fa-solid fa-table"></i>&nbsp;Default Table View</span>
    </div>
    `;

    return `
<div class="notion-database ${isDatabase ? ' notion-database-database-page' : ''}">
  ${navigationPanel}
  ${isDatabase ? '' : `
    <div class="notion-database-header">
      <h3>${databaseTitle ? parseRichTextToHTML(database.title) : 'Untitled'}</h3>
      ${database.description?.length > 0 ? `
        <div class="notion-database-description">
          ${parseRichTextToHTML(database.description)}
        </div>
      ` : ''}
    </div>
  `}
  <div class="notion-database-table-wrapper">
    <table class="notion-database-table">
      <thead>
        <tr>
          ${orderedProps.map(propName => {
      const prop = database.properties[propName.replace("-Sel", "-sel")];
      return `
              <th data-type="${prop.type}" class="column-name">
                <i class="fa-solid ${getFontAwesomeIcon(prop.type.toLowerCase())}"></i> ${prop.name}
              </th>
            `;
    }).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${orderedProps.map(propName => {
      const propValue = row.properties[propName.replace("-Sel", "-sel")];
      const renderedValue = renderPropertyValue(propValue, database.properties[propName.replace("-Sel", "-sel")]) || '';
      return `
                <td>
                  ${database.properties[propName]?.type === 'title' ? `
                  ${row.icon ? (row.icon.startsWith('http') ? `<img src="${row.icon}" alt="icon" class="row-icon" />` : `${row.icon}`) : '<i class="fa-solid fa-file"></i>'}
                  <a href="${row.service_url}">
                    ${renderedValue}
                  </a>` : renderedValue}
                </td>`;
    }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</div>
`;
  }


  function renderPropertyValue(property: any, schema: any) {
    if (!property) return '';

    switch (schema.type) {
      case 'title':
        return parseRichTextToHTML(property.title);

      case 'rich_text':
        return parseRichTextToHTML(property.rich_text);

      case 'number':
        return property.number !== null && property.number !== undefined
          ? property.number.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
          : '';

      case 'select':
        return property.select ? `
          <span class="option-pill" style="${getOptionStyle(property.select.color)}">
            ${property.select.name}
          </span>
        ` : '';

      case 'multi_select':
        return property.multi_select.map((option: any) => `
          <span class="option-pill" style="${getOptionStyle(option.color)}">
            ${option.name}
          </span>
        `).join('');

      case 'created_time':
        return `
          <div class="date-cell">
            ${new Date(property.created_time).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        `;
      case 'last_edited_time':
        return `
          <div class="date-cell">
            ${new Date(property.last_edited_time).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        `;
      case 'date':
        return property.date?.start ? `
          <div class="date-cell">
            ${new Date(property.date.start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            ${property.date.end ? ` → ${new Date(property.date.end).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
          </div>
        ` : '';

      case 'checkbox':
        return `
          <div class="checkbox-cell ${property.checkbox ? 'checked' : ''}">
            <svg viewBox="0 0 14 14">
              <path d="M5.5 12L14 3.5 12.5 2l-7 7-4-4.003L0 6.499z" fill="currentColor"/>
            </svg>
          </div>
        `;

      case 'url':
        return property.url ? `
          <a href="${property.url}" target="_blank" class="url-cell">
            ${new URL(property.url).hostname}
          </a>
        ` : '';

      case 'email':
        return property.email ? `
          <a href="mailto:${property.email}" class="email-cell">
            ${property.email}
          </a>
        ` : '';

      case 'phone_number':
        return property.phone_number ? `
          <a href="tel:${property.phone_number}" class="phone-cell">
            ${property.phone_number}
          </a>
        ` : '';

      case 'files':
        return property.files.map((file: any) => {
          return `
            <div class="file-cell">
              ${file.isImage ? `
                <img src="${file.file?.url || file.external?.url}" alt="${file.name}" />
              ` : `
                <a href="${file.file?.url}" target="_blank">${file.name}</a>
              `}
            </div>
          `;
        }).join('');

      case 'people':
        return property.people.map((person: any) => {
          return `
            <div class="person-cell">
              ${person.object === 'user' ? (person.data?.status != '403' ? person.data : '<span class="column-name">N/A</span>') : '<span class="column-name">N/A</span>'}
            </div>
          `;
        }).join('');
      case 'pdf':
        renderPDFBlock(property);


      default:
        return '';
    }
  }

  // Function to map property names to Font Awesome icons
  function getFontAwesomeIcon(propName: string): string {

    if (propName === "multi-select") propName = "multi_select";

    const iconMap: Record<string, string> = {
      "checkbox": "fa-check-square",
      "created_time": "fa-clock",
      "created": "fa-clock",
      "date": "fa-calendar-alt",
      "datetime": "fa-calendar-alt",
      "email": "fa-envelope",
      "files": "fa-file",
      "formula": "fa-calculator",
      "last_edited_by": "fa-user-edit",
      "last_edited_time": "fa-history",
      "multi_select": "fa-list-ul",
      "number": "fa-hashtag",
      "person": "fa-person",
      "people": "fa-person",
      "phone_number": "fa-phone",
      "relation": "fa-link",
      "name": "fa-align-left",
      "text": "fa-align-left",
      "rich_text": "fa-align-left",
      "rollup": "fa-layer-group",
      "select": "fa-check-circle",
      "status": "fa-tasks",
      "title": "fa-font",
      "url": "fa-link"
    };
    return iconMap[propName.toLowerCase()] || "fa-question-circle"; // Default icon
  }

  function renderHeader() {
    let title = "";

    if (isDatabase) { // Means it's a database
      title = metaBlock.title[0]?.plain_text || ""; // Extract plain_text from the title property
    } else if (isDatabaseRow) { // Means it's a row in the database
      const titleProperty = Object.entries(metaBlock.properties).find(([key, prop]: [string, any]) => prop.id === "title");
      if (titleProperty) {
        const titleProp = titleProperty[1] as { title: { plain_text: string }[] };
        title = titleProp.title[0]?.plain_text || ""; // Extract plain_text from the title property
      }
    } else { // Normal page
      title = metaBlock.properties?.title?.title[0]?.plain_text; // If normal page
    }

    let html1 = "<div class='notion-header-cover'>";

    // Render cover image if available
    const coverUrl = (metaBlock.cover?.type === "external" ? metaBlock.cover?.external?.url : metaBlock.cover?.file?.url) || "";
    if (coverUrl.length >= 5) {
      html1 += `<img src="${coverUrl}" alt="Cover Image" />`;
    }

    html1 += "</div>";

    html1 += "<div class='layout-content content-header' style='position: relative; z-index: 2;'>";
    if (metaBlock.icon?.type === "file") {
      html1 += `<div class='notion-header-icon'><img src="${metaBlock.icon.file.url}" alt="Icon" /></div>`;
    } if (metaBlock.icon?.type === "external") {
      html1 += `<div class='notion-header-icon'><img src="${metaBlock.icon.external.url}" alt="Icon" /></div>`;
    }
    else if (metaBlock.icon?.emoji) {
      html1 += `<div class='notion-header-icon'><span>${metaBlock.icon.emoji}</span></div>`;
    }
    html1 += `<div class='notion-header-title'><h1>${title}</h1></div>`;
    html1 += '</div>';
    return html1;
  }

  function renderNestedList(listBlocks: any[], type: string, start: number = 1): string {
    let html = type === 'numbered_list_item' ? `<ol start="${start}">` : '<ul>';

    listBlocks.forEach((block: any) => {
      if (!block.type.includes("list_item")) return;

      // if (type != 'numbered_list_item')
      //   console.log("Logging", parseRichTextToHTML(block.bulleted_list_item.rich_text));

      html += `<div class="block" id="${block.id}">`;
      html += '<li>' + parseRichTextToHTML(block[type].rich_text) + '</li>';
      //html += renderBlock({ block: block });

      let children = block.block?.children || block.children;

      if (children && children.length > 0) {
        html += renderNestedList(children, type);
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

  function renderBreadcrumb(breadcrumb: any[]): string {
    return `
      <div class="breadcrumb-bar">
        ${breadcrumb.map((item, index) => {
      const isLast = index === breadcrumb.length - 1;
      return isLast
        ? `<span class="breadcrumb-item current">
                 <span class="breadcrumb-icon-and-name">
                   ${item.icon?.startsWith('http') ? `<img src="${item.icon}" alt="icon" class="breadcrumb-icon" />` : item.icon || ''}
                   <span class="breadcrumb-name">${item.name}</span>
                 </span>
               </span>`
        : `<a href="${item.service_url}" class="breadcrumb-item">
                 <span class="breadcrumb-icon-and-name">
                   ${item.icon?.startsWith('http') ? `<img src="${item.icon}" alt="icon" class="breadcrumb-icon" />` : item.icon || ''}
                   <span class="breadcrumb-name">${item.name}</span>
                 </span>
               </a>`;
    }).join('<span class="breadcrumb-separator">/</span>')}
      </div>
    `;
  }

  function renderContent() {

    let html = "<div class='notion-background'>";

    // Render breadcrumb if available
    if (metaBlock.breadcrumb) {
      html += renderBreadcrumb(metaBlock.breadcrumb);
    }

    html += '<div class="layout-full' + (isDatabase ? ' database-page' : '') + '">';

    html += renderHeader();

    html += "<div class='layout-content'>";
    html += "<div class='notion-page-content'>";

    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i];
      if (block.master) { // Don't render header. It is rendered above.
        i++;
        continue;
      }

      html += `<div class="block" id="${block.block.id}">`;
      html += renderBlock(block);
      html += '</div>';
      i++;
    }

    html += '</div>'; // Close notion-page-content
    html += '</div>'; // Close layout-content
    html += '</div>'; // Close layout-full
    html += '</div>'; // Close notion-background

    // Extract headers
    const headers = {
      title: metaBlock.properties?.title?.title[0]?.plain_text || '',
      favicon: extractIcon(metaBlock.icon)
    };

    return { headers, html };
  }

  const { headers, html } = renderContent();

  res.status(200).json({ headers, html });
}
