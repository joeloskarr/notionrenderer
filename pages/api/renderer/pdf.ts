export function renderPDFBlock(pdf: any): string {
    const pdfUrl = pdf.file.url;
    const caption = pdf.caption.map((textObj: any) => textObj.plain_text).join(' ');

    return `
    <div class="pdf-block">
      <iframe 
        src="${pdfUrl}" 
        width="100%" 
        height="600px" 
        style="border: none;" 
        allowfullscreen>
      </iframe>
      ${caption ? `<div class="pdf-caption">${caption}</div>` : ''}
    </div>
  `;
}
