type SortOrder = 'asc' | 'desc';

type SortableTableData = Record<string, string | number>;

type SortableTableSort = {
  id: string;
  order: SortOrder;
};

interface SortableTableHeader {
  id: string;
  title: string;
  sortable?: boolean;
  sortType?: 'string' | 'number' | 'custom';
  template?: (value: string | number) => string;
  customSorting?: (a: SortableTableData, b: SortableTableData) => number;
}

interface Options {
  data?: SortableTableData[];
  sorted?: SortableTableSort;
  isSortLocally?: boolean;
}

export default class SortableTable {
  element: HTMLElement | null = null;
  private headers: SortableTableHeader[];
  private data: SortableTableData[];
  private sorted: SortableTableSort;
  private isSortLocally: boolean;

  constructor(headersConfig: SortableTableHeader[] = [], {
    data = [],
    sorted = { id: '', order: 'asc' },
    isSortLocally = true
  }: Options = {}) {
    this.headers = headersConfig;
    this.data = [...data];
    this.sorted = sorted;
    this.isSortLocally = isSortLocally;

    if (this.sorted.id) {
      this.sort(this.sorted.id, this.sorted.order);
    }
   
    this.render();
    this.initEventListeners();  
  }

  private render() {
    const html = `
      <div class="sortable-table">
        <div data-element="header" class="sortable-table__header sortable-table__row">
          ${this.headers.map(header => `
            <div class="sortable-table__cell"
                data-id="${header.id}"
                data-sortable="${header.sortable ? 'true' : 'false'}">
              <span>${header.title}</span>
              ${header.sortable ? `
                <span data-element="arrow" class="sortable-table__sort-arrow">
                  <span class="sort-arrow"></span>
                </span>` : ''}
            </div>
          `).join('')}
        </div>
        <div data-element="body" class="sortable-table__body">
          ${this.getTableBody(this.data)}
        </div>
      </div>
    `;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    this.element = wrapper.firstElementChild as HTMLElement;
  }

  private getTableBody(data: SortableTableData[]) {
    return data.map(row => `
      <a href="/products/${row['title']}" class="sortable-table__row">
        ${this.headers.map(header => {
          const value = row[header.id];
          return header.template ? header.template(value) : `<div class="sortable-table__cell">${value}</div>`;
        }).join('')}
      </a>
    `).join('');
  }

  private initEventListeners() {
    if (!this.element) return;
    const header = this.element.querySelector('[data-element="header"]');
    header?.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement;
      const cell = target.closest('.sortable-table__cell') as HTMLElement;

      if (!cell || cell.dataset.sortable !== 'true') return;

      const field = cell.dataset.id!;

      const order = this.sorted.id === field 
        ? (this.sorted.order === 'asc' ? 'desc' : 'asc') 
        : 'desc';

      this.sort(field, order);
    });
  }

  sort(field: string, order: SortOrder = 'asc') {
    this.sorted = { id: field, order };

    if (this.isSortLocally) {
      this.sortOnClient(field, order);
    } else {
      this.sortOnServer();
    }
  }

  private sortOnClient(field: string, order: SortOrder) {
    const header = this.headers.find(h => h.id === field && h.sortable);
    if (!header) return;

    const direction = order === 'asc' ? 1 : -1;
    const sortType = header.sortType || 'string';

    this.data.sort((a, b) => {
      const { id } = header;
      const aValue = a[id];
      const bValue = b[id];

      if (sortType === 'custom' && header.customSorting) {
        return direction * header.customSorting(a, b);
      }

      if (sortType === 'number') {
      return direction * ((aValue as number) - (bValue as number));
      }

      return direction * String(aValue).localeCompare(
        String(bValue),
        ['ru', 'en'],
        { numeric: true, caseFirst: 'upper' }
      );
    });

    if (!this.element) return;

    this.element.querySelectorAll<HTMLElement>('.sortable-table__cell').forEach(cell => {
      if (cell.dataset.id === field) cell.dataset.order = order;
      else delete cell.dataset.order;
    });

    const body = this.element.querySelector<HTMLElement>('[data-element="body"]');
    if (body) body.innerHTML = this.getTableBody(this.data);
  }

  private sortOnServer() {
    console.log('Server sorting...');
  }

  remove() {
    if (this.element) this.element.remove();
  }

  destroy() {
    this.remove();
    this.data = [];
    this.headers = [];
    this.element = null;
  }
}