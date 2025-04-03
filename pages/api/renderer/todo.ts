import { parseRichTextToHTML } from './utils';

export function renderToDo(block: any): string {
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
