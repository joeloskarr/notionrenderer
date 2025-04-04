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
    console.log(richText);
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

        if (textObj.type === "mention" && textObj.mention?.type === "link_mention") {
            const linkMention = textObj.mention.link_mention;
            const { href, title, description, icon_url, thumbnail_url } = linkMention;

            // Shorten description and title
            const shortDescription = description.length > 30 ? description.substring(0, 30) + "..." : description;

            let shortTitle = title;
            if (href.startsWith("https://github.com")) {
                const urlParts = href.split("/").filter(Boolean);
                const repoName = urlParts[3]; // Extract repository name
                if (urlParts.length === 5) {
                    // Format: https://github.com/user/repo/pulls
                    shortTitle = `${repoName} Pull requests`;
                } else if (urlParts.length === 6 && urlParts[4] === "pull") {
                    // Format: https://github.com/user/repo/pull/38
                    const pullNumber = urlParts[5];
                    shortTitle = `${repoName} Pull Request #${pullNumber}`;
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
                        <span class="link-preview-domain">${escapeHTML(urlDomain)}</span>
                        <span class="link-preview-title">${escapeHTML(shortTitle)}</span>
                    </a>
                    <span class="hover-box">
                        <span class="hover-box-content" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <span class="link-preview-full-thumbnail"><img src="${thumbnail_url}" alt="icon" style="width: 48px; height: 48px; border-radius: 4px;"></span>
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
            const isGitHubLink = url.startsWith("https://github.com");
            let displayText = html;

            if (isGitHubLink) {
                if (url === "https://github.com/transitive-bullshit/react-static-tweets") {
                    displayText = "react-static-tweets";
                } else {
                    const match = url.match(/^https:\/\/github\.com\/.+\/.+\/.+\/.+$/);
                    if (match) {
                        displayText = url.substring(url.lastIndexOf('/') + 1);
                    }
                }
            }

            const icon = isGitHubLink ? '<i class="fab fa-github"></i> ' : '';
            html = `${icon}<a href="${url}">${displayText}</a>`;
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
