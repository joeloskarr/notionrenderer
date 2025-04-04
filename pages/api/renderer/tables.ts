import { parseRichTextToHTML } from './utils';

export function renderTables(table: any, rows: any[]): string {
    const { table_width, has_column_header, has_row_header } = table.table;

    let html = '<table class="notion-table">';

    // Render table rows
    rows.forEach((row: any, rowIndex: number) => {
        if (row.table_row.cells.every((cell: any[]) => cell.length === 0)) {
            return; // Skip empty rows
        }

        const isHeaderRow = has_column_header && rowIndex === 0;
        html += `<tr class="notion-table-row">`;

        row.table_row.cells.forEach((cell: any[], cellIndex: number) => {
            const isHeaderCell = isHeaderRow || (has_row_header && cellIndex === 0);
            const tag = isHeaderCell ? 'th' : 'td';
            const additionalClass = [
                has_row_header && cellIndex === 0 ? 'notion-table-row-header' : '',
                isHeaderRow ? 'notion-table-column-header' : ''
            ].filter(Boolean).join(' ');
            const cellContent = cell.map((textObj: any) => parseRichTextToHTML([textObj])).join('');
            html += `<${tag} class="${additionalClass.trim()}"><span class="notion-table-cell-text">${cellContent}</span></${tag}>`;
        });

        html += '</tr>';
    });

    html += '</table>';
    return html;
}
