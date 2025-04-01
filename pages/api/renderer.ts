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

  const metaBlock = blocks[0]?.master;
  const isDatabaseRow = metaBlock?.parent?.type === 'database_id';
  const isDatabase = metaBlock?.object === 'database';

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
      let content;
      if (textObj.text) {
        content = textObj.text.content;
      } else
        content = textObj.plain_text; // Fallback to plain_text if content is not available
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
      if (textObj.text?.link || textObj.href) {
        html = `<a href="${textObj.text?.link?.url || textObj.href}">${html}</a>`;
      }

      return html;
    }).join("");
  }

  function getOrderedProps(database: any, rows: any): string[] {
    // Search for the "notionrooms" column

    const notionRoomsColumn = Object.entries(database.properties).find(([key, prop]: [string, any]) =>
      prop.name.toLowerCase() === "notionrooms"
    );

    if (notionRoomsColumn) {
      const [_, column] = notionRoomsColumn as [string, { id: string }];

      // Look through all cells in the "notionrooms" column
      for (const row of rows || []) {

        const cellValue = row.properties["notionrooms"]?.rich_text?.[0]?.plain_text || '';

        const match = cellValue.match(/\[Order:\s*(.*?)\]/);

        if (match) {
          return match[1].split(',').map((prop: string) => prop.trim()); // Trim whitespace
        }
      }
    }

    // Fallback to default order if no match is found
    return Object.keys(database.properties);
  }


  function getOptionStyle(color: string) {
    const colorMap: Record<string, string> = {
      'default': 'var(--color-text-default)',
      'gray': 'var(--color-text-gray)',
      'brown': 'var(--color-text-brown)',
      'orange': 'var(--color-text-orange)',
      'yellow': 'var(--color-text-yellow)',
      'green': 'var(--color-text-green)',
      'blue': 'var(--color-text-blue)',
      'purple': 'var(--color-text-purple)',
      'pink': 'var(--color-text-pink)',
      'red': 'var(--color-text-red)'
    };
    return `color: ${colorMap[color]}; background-color: var(--color-bg-${color})`;
  }


  function renderBlock(block: any) {

    let type = "";
    if (block.block) type = block.block.type
    else type = block.type;

    // Extract color and determine background style if applicable
    const color = block.block[type]?.color || block[type]?.color;
    const bgClass = color && color.includes("_background")
      ? `color-bg-${color.split("_")[0]}`
      : "";

    switch (type) {
      case 'paragraph':
        return `<p class="${bgClass}">${parseRichTextToHTML(block.block.paragraph.rich_text)}</p>`;
      case 'child_page':
        return `
          <div class="child-page ${bgClass}">
            <a href="${block.page.public_url}" target="_blank">
              <span class="emoji">${block.page.icon?.emoji || '📄'}</span> <span class="alink">${block.page.properties.title.title[0].plain_text}</span>
            </a>
          </div>`;
      case 'heading_1':
        if (block.block.heading_1.is_toggleable) {
          return `
            <details class="${bgClass}">
              <summary><h2>${parseRichTextToHTML(block.block.heading_1.rich_text)}</h2></summary>
              <div class='toggle-children'>${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}</div>
            </details>`;
        }
        return `<h2 class="${bgClass}">${parseRichTextToHTML(block.block.heading_1.rich_text)}</h2>`;
      case 'heading_2':
        if (block.block.heading_2.is_toggleable) {
          return `
            <details class="${bgClass}">
              <summary><h3>${parseRichTextToHTML(block.block.heading_2.rich_text)}</h3></summary>
              <div class='toggle-children'>${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}</div>
            </details>`;
        }
        return `<h3 class="${bgClass}">${parseRichTextToHTML(block.block.heading_2.rich_text)}</h3>`;
      case 'heading_3':
        if (block.block.heading_3.is_toggleable) {
          return `
            <details>
              <summary><h4>${parseRichTextToHTML(block.block.heading_3.rich_text)}</h4></summary>
              <div class='toggle-children'>${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}</div>
            </details>`;
        }
        return `<h4 class="${bgClass}">${parseRichTextToHTML(block.block.heading_3.rich_text)}</h4>`;
      case 'toggle':
        return `
          <details class="${bgClass}">
            <summary>${parseRichTextToHTML(block.block.toggle.rich_text)}</summary>
            <div class='toggle-children'>${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}</div>
          </details>`;
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
          <div class="callout ${bgClass}" style="${calloutStyle}">
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
        let dividerAdj = (46 * (block.block.columns - 1)) / (block.block.columns) + "px";
        return `
          <div class="column" style="width: calc(100% / ${block.block.columns} - ${dividerAdj});">
            ${(block.block.children || []).map((child: any) => renderBlock({ block: child })).join('')}
          </div>`;
      case 'image':
        let imageUrl;

        if (block.block.image.type === 'external')
          imageUrl = block.block.image.external.url;
        else
          imageUrl = block.block.image.file.url;

        const caption = block.block.image.caption.map((textObj: any) => textObj.plain_text).join(' ');
        return `
          <div class="image-block">
            <img src="${imageUrl}" alt="${caption}" />
            ${caption ? `<div class="image-caption">${parseRichTextToHTML(block.block.image.caption)}</div>` : ''}
          </div>`;
      case 'quote':
        return `
          <blockquote style="border-left: 4px solid var(--color-text-${block.block.quote.color || 'default'}); padding-left: 10px; margin: 10px 0;">
            ${parseRichTextToHTML(block.block.quote.rich_text)}
          </blockquote>`;
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
      case 'to_do': {
        const todo = block.block.to_do;
        const isChecked = todo.checked;
        const colorClass = todo.color !== 'default' ? ` notion-todo-${todo.color}` : '';

        return `
          <div class="notion-todo${colorClass}${isChecked ? ' checked' : ''}">
            <div class="notion-todo-checkbox">
              ${isChecked ? `
                <svg viewBox="0 0 14 14" class="checkmark">
                  <path d="M5.5 12L14 3.5 12.5 2l-7 7-4-4.003L0 6.499z" fill="currentColor"/>
                </svg>
              ` : ''}
            </div>
            <div class="notion-todo-text">
              ${parseRichTextToHTML(todo.rich_text)}
            </div>
          </div>
        `;
      }
      case 'child_database':
        if (block.block.database.is_inline) {
          return renderDatabase(block.block.database, block.block.rows);
        } else {
          return `
        <div class="child-page">
          <a href="${block.block.database.public_url}" target="_blank">
            <span class="emoji">${block.block.database.icon?.emoji || '📄'}</span> <span class="alink">${block.block.database.title[0].plain_text}</span>
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
          const propValue = rows[0][propName];
          const renderedValue = renderPropertyValue(propValue, prop);

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

      default:
        return '';
    }
  }


  // Add new renderDatabase function
  function renderDatabase(database: any, rows: any[] = []) {
    // Get the ordered properties, excluding "hidden text"
    let orderedProps = getOrderedProps(database, rows);

    // Navigation panel HTML
    const navigationPanel = `
    <div class="notion-database-navigation">
    <span class="notion-database-view active"><i class="fa-solid fa-table"></i>&nbsp;Default Table View</span>
    <span class="notion-database-view"><i class="fa-solid fa-list"></i>&nbsp;<s>List</s></span>
    <span class="notion-database-view"><i class="fa-solid fa-th"></i>&nbsp;<s>Gallery</s></span>
    <span class="notion-database-view"><i class="fa-solid fa-columns"></i>&nbsp;<s>Board</s></span>
    <span class="notion-database-view"><i class="fa-solid fa-calendar-alt"></i>&nbsp;<s>Calendar</s></span>
    <span class="notion-database-view"><i class="fa-solid fa-stream"></i>&nbsp;<s>Timeline</s></span>
    </div>
    `;

    return `
<div class="notion-database ${isDatabase ? ' notion-database-database-page' : ''}">
  ${navigationPanel}
  ${isDatabase ? '' : `
    <div class="notion-database-header">
      <h3>${parseRichTextToHTML(database.title)}</h3>
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
      const renderedValue = renderPropertyValue(propValue, database.properties[propName.replace("-Sel", "-sel")]);
      return `
                <td>
                  ${database.properties[propName]?.type === 'title' ? `
                  ${row.icon ? (row.icon.startsWith('http') ? `<img src="${row.icon}" alt="icon" class="row-icon" />` : `${row.icon}`) : '<i class="fa-solid fa-file"></i>'}
                  <a href="${row.public_url}">
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
        return property.number?.toString() || '';

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
              ${person.object === 'user' ? (person.data?.status ? 'N/A' : person.data) : 'N/A'}
            </div>
          `;
        }).join('');

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

    let html1 = "";

    // Render cover image if available
    if (metaBlock.cover) {
      const coverUrl = metaBlock.cover.type === "external" ? metaBlock.cover.external.url : metaBlock.cover.file.url;
      html1 += `<div class='notion-header-cover'><img src="${coverUrl}" alt="Cover Image" /></div>`;
    }

    html1 += "<div class='layout-content' style='position: relative; z-index: 2;'>";
    if (metaBlock.icon?.emoji) html1 += `<div class='notion-header-icon'>${metaBlock.icon.emoji}</div>`;
    html1 += `<div class='notion-header-title'><h1>${title}</h1></div>`;
    html1 += '</div>';
    return html1;
  }

  function renderNestedList(blocks: any[], type: string, start: number = 1): string {
    let html = type === 'numbered_list_item' ? `<ol start="${start}">` : '<ul>';

    blocks.forEach((block: any) => {

      html += `<div class="block" id="${block.id}">`;
      html += renderBlock({ block: block });

      if (block.block.children?.length > 0) {
        html += renderNestedList(block.block.children, type);
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
    let html = '<div class="layout-full' + (isDatabase ? ' database-page' : '') + '">';

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
