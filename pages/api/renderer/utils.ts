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
            const { href, title, description, icon_url } = linkMention;

            // Shorten description to 50 characters
            const shortDescription = description.length > 30 ? description.substring(0, 30) + "..." : description;
            const shortTitle = title.length > 30 ? title.substring(0, 30) + "..." : title;

            // Parse URL to get the domain
            const urlDomain = new URL(href).hostname.replace("www.", "");

            // One-line preview
            html = `
                <div class="link-preview" style="display: inline-flex; align-items: center; gap: 8px;">
                    <img src="${icon_url}" alt="favicon" style="width: 16px; height: 16px; border-radius: 2px;">
                    <span class="link-preview-domain">${escapeHTML(urlDomain)}</span>
                    <span class="link-preview-title">${escapeHTML(title)}</span>
                </div>
            `;

            // Hoverable box
            html += `
                <div class="link-preview-hover" style="position: relative; display: inline-block;">
                    <div class="hover-box" style="
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        width: 300px;
                        background: white;
                        border: 1px solid rgba(0, 0, 0, 0.1);
                        border-radius: 4px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        padding: 8px;
                        z-index: 10;
                    ">
                        <div style="display: flex; gap: 8px;">
                            <img src="${icon_url}" alt="icon" style="width: 33%; border-radius: 4px;">
                            <div style="flex: 1;">
                                <div class="link-preview-full-title" style="font-weight: bold;">${escapeHTML(title)}</div>
                                <div class="link-preview-full-description" style="color: gray; font-size: 0.9em;">${escapeHTML(description)}</div>
                            </div>
                        </div>
                        <div style="margin-top: 8px; font-size: 0.8em; color: gray; display: flex; align-items: center; gap: 4px;">
                            <img src="${icon_url}" alt="favicon" style="width: 12px; height: 12px; border-radius: 2px;">
                            <span>${escapeHTML(urlDomain)}</span>
                        </div>
                    </div>
                </div>
                <script>
                    document.querySelectorAll('.link-preview-hover').forEach(el => {
                        el.addEventListener('mouseenter', () => {
                            el.querySelector('.hover-box').style.display = 'block';
                        });
                        el.addEventListener('mouseleave', () => {
                            el.querySelector('.hover-box').style.display = 'none';
                        });
                    });
                </script>
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
                const match = url.match(/^https:\/\/github\.com\/.+\/.+\/.+\/.+$/);
                if (match) {
                    displayText = url.substring(url.lastIndexOf('/') + 1);
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
