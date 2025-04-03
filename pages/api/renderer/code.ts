import { escapeHTML } from './utils';
const Prism = require('prismjs');
const loadLanguages = require('prismjs/components/');

export function renderCodeBlock(block: any): string {
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
}
