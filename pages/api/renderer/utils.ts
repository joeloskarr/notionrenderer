// Function to escape HTML special characters
export function escapeHTML(str: string): string {
    return str
        .replace(/&/g, "\&")
        .replace(/</g, "\<")
        .replace(/>/g, "\>")
        .replace(/"/g, '\"')
        .replace(/'/g, "\'");
}

// Function to parse rich text annotations and generate HTML
export function parseRichTextToHTML(richText: any[]): string {
    return richText.map((textObj) => {
        let content, html;

        if (textObj.type === 'equation') {
            // Handle equations
            const expression = textObj.equation?.expression || '';
            const { color } = textObj.annotations;

            // Apply color styling if specified
            let style = '';
            if (color && color !== "default") {
                const cssVariable = `var(--color-text-${color})`;
                style = `style="color:${cssVariable};"`;
            }

            return `<span class="math-expression" ${style}>\\(${escapeHTML(expression)}\\)</span>`;
        }

        if (textObj.type === "mention" && (textObj.mention?.type === "link_mention" || textObj.mention?.type === "link_preview")) {
            const isLinkPreview = (textObj.mention?.type === "link_preview");
            const linkMention = textObj.mention.link_mention || textObj.mention.link_preview;
            const { title, description } = linkMention;
            const thumbnail_url = linkMention.thumbnail_url || linkMention.image_url || linkMention.icon_url;
            const href = linkMention.url || linkMention.href;
            const icon_url = linkMention.icon_url || linkMention.favicon;
            // Shorten description and title

            let shortTitle = title;
            if (href.startsWith("https://github.com")) { //Special case for GitHub links :)
                console.log(shortTitle);
                const urlParts = href.split("/").filter(Boolean);
                const titleParts = title.split(" · ").filter(Boolean);
                const repoName = urlParts[3]; // Extract repository name
                console.log(href, title, urlParts.length);
                console.log(urlParts[0], urlParts[1], urlParts[2], urlParts[3], urlParts[4], urlParts[5]);
                if (urlParts.length === 5) {
                    // Format: https://github.com/user/repo/pulls
                    shortTitle = `${repoName} ${titleParts[0]}`;
                } else if (urlParts.length === 6) {
                    // Format: https://github.com/user/repo/pull/38
                    shortTitle = `${titleParts[1]}`;
                } else if (urlParts.length === 4) {
                    shortTitle = `${repoName}`;
                }
            } else if (title.length > 60) {
                shortTitle = title.substring(0, 60) + "...";
            }

            // Parse URL to get the domain
            const urlDomain = new URL(href).hostname.replace("www.", "");

            // One-line preview with hover-box
            html = `
                <span class="link-preview" style="display: inline-flex; align-items: center; gap: 8px; position: relative;">
                    <a href="${href}" target="_blank" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 8px;">
                        <img src="${icon_url}" alt="favicon" style="width: 16px; height: 16px; border-radius: 2px;">
                        ${isLinkPreview ? '' : '<span class="link-preview-domain">' + escapeHTML(urlDomain) + '</span>'}
                        <span class="link-preview-title">${escapeHTML(shortTitle)}</span>
                    </a>
                    `;

            if (!isLinkPreview) {
                html += `<span class="hover-box">
                        <span class="hover-box-content">
                            <span class="link-preview-full-thumbnail"><img src="${thumbnail_url}" alt="icon"></span>
                            <span class="link-preview-full-title" style="font-weight: bold; text-align: left;">${escapeHTML(title)}</span>
                            <span class="link-preview-full-description">${escapeHTML(description)}</span>
                        </span>
                        <span class="hover-box-footer" style="margin-top: 8px; font-size: 0.8em; color: gray; display: flex; align-items: center; gap: 4px;">
                            <img src="${icon_url}" alt="favicon" style="width: 12px; height: 12px; border-radius: 2px;">
                            <span>${escapeHTML(urlDomain)}</span>
                        </span>
                    </span>
                    `;
            }

            html += "</span>"

            return html;
        }

        if (textObj.text) {
            content = textObj.text.content;
        } else {
            content = textObj.plain_text; // Fallback to plain_text if content is not available
        }
        const { bold, italic, strikethrough, underline, code, color } = textObj.annotations;

        html = escapeHTML(content); // Escape HTML special characters

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
            const url = textObj.text?.link?.url || textObj.href;
            let displayText = html;
            html = `<a href="${url}">${displayText}</a>`;
        }


        return html;
    }).join("");
}

// Function to get option style based on color
export function getOptionStyle(color: string): string {
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


export function extractIcon(icon: any) {
    if (!icon) return null;
    if (icon.type === 'external') return icon.external.url;
    if (icon.type === 'emoji') return icon.emoji;
    if (icon.type === 'file') return icon.file.url;
    return null;
}
