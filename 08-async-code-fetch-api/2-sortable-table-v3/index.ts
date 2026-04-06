import { fetchJson } from "../../shared/utils/fetch-json";
import { createElement } from "../../shared/utils/create-element";
import { required } from "../../shared/utils/required";

const BACKEND_URL = 'https://course-js.javascript.ru';

type SortOrder = 'asc' | 'desc';

type SortableTableData = Record<string, unknown>;

type SortableTableSort = {
  id: string;
  order: SortOrder;
};

interface SortableTableHeader {
  id: string;
  title: string;
  sortable?: boolean;
  sortType?: 'string' | 'number' | 'custom';
  template?: (value: unknown) => string;
  customSorting?: (a: SortableTableData, b: SortableTableData) => number;
}

interface Options {
  url?: string;
  sorted?: SortableTableSort;
  isSortLocally?: boolean;
  step?: number;
  start?: number;
  end?: number;
}

export default class SortableTable {
  private _element: HTMLElement | null = null;

  private headersConfig: SortableTableHeader[];
  private data: SortableTableData[] = [];
  private sorted: SortableTableSort;
  private isSortLocally: boolean;

  private loading = false;
  private step: number;
  private start: number;
  private end: number;
  private url: URL;

  constructor(headersConfig: SortableTableHeader[] = [], {
    url = '',
    sorted,
    isSortLocally = false,
    step = 20,
    start = 1,
    end = start + step
  }: Options = {}) {
    this.headersConfig = headersConfig;
    this.url = new URL(url, BACKEND_URL);
    this.sorted = sorted ?? this.getDefaultSort();
    this.isSortLocally = isSortLocally;
    this.step = step;
    this.start = start;
    this.end = end;

    this.render();
  }

  get element(): HTMLElement {
    if (!this._element) {
      throw new Error("Element has been destroyed or not rendered");
    }
    return this._element;
  }

  private sub<T extends HTMLElement = HTMLElement>(element: string): T {
    return required(
      this.element.querySelector<T>(`[data-element="${element}"]`),
      `Sub element with data-element="${element}" not found`
    );
  }

  private onWindowScroll = async (): Promise<void> => {
    const element = this.element;

    const { bottom } = element.getBoundingClientRect();
    const { id, order } = this.sorted;

    if (bottom < document.documentElement.clientHeight && !this.loading && !this.isSortLocally) {
      this.start = this.end;
      this.end = this.start + this.step;

      this.loading = true;

      const data = await this.loadData(id, order, this.start, this.end);
      this.update(data);

      this.loading = false;
    }
  };

  private onSortClick = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null;
    const column = target?.closest<HTMLElement>('[data-sortable="true"]');

    const columnId = column?.dataset.id;

    if (!columnId) {
      return;
    }

    const { order } = column.dataset;
    const newOrder: SortOrder = order === 'asc' ? 'desc' : 'asc';

    this.sort(columnId, newOrder);
  };

  private getDefaultSort(): SortableTableSort {
    const sortableColumn = this.headersConfig.find(item => item.sortable) ?? this.headersConfig[0];

    return {
      id: sortableColumn?.id ?? '',
      order: 'asc'
    };
  }

  private getHeaderRow({ id, title, sortable }: SortableTableHeader): string {
    const isSortable = Boolean(sortable);
    const isSortedColumn = this.sorted.id === id;
    const order = isSortable ? (isSortedColumn ? this.sorted.order : 'asc') : '';
    const orderAttribute = order ? ` data-order="${order}"` : '';

    return `
      <div class="sortable-table__cell" data-id="${id}" data-sortable="${isSortable}"${orderAttribute}>
        <span>${title}</span>
        ${isSortable && isSortedColumn ? `
          <span data-element="arrow" class="sortable-table__sort-arrow">
            <span class="sort-arrow"></span>
          </span>
        ` : ''}
      </div>
    `;
  }

  private getTableBody(): string {
    return `
      <div data-element="body" class="sortable-table__body">
        ${this.getTableRows(this.data)}
      </div>`;
  }

  private getTableRows(data: SortableTableData[]): string {
    return data.map(item => {
      return `
        <div class="sortable-table__row">
          ${this.getTableRow(item)}
        </div>`;
    }).join('');
  }

  private getTableRow(item: SortableTableData): string {
    const cells: string[] = [];

    for (const { id, template } of this.headersConfig) {
      const value = item[id];

      cells.push(template
        ? template(value)
        : `<div class="sortable-table__cell">${value}</div>`);
    }

    return cells.join('');
  }

  get template(): string {
    return `
      <div class="sortable-table">
        <div data-element="header" class="sortable-table__header sortable-table__row">
          ${this.headersConfig.map(item => this.getHeaderRow(item)).join('')}
        </div>
        ${this.getTableBody()}

        <div data-element="loading" class="loading-line sortable-table__loading-line"></div>

        <div data-element="emptyPlaceholder" class="sortable-table__empty-placeholder">
          No products
        </div>
      </div>`;
  }

  async render(): Promise<void> {
    const { id, order } = this.sorted;
    this._element = createElement(this.template);

    const data = await this.loadData(id, order, this.start, this.end);

    this.renderRows(data);
    this.initEventListeners();
  }

  private async loadData(field: string, order: SortOrder, start = this.start, end = this.end): Promise<SortableTableData[]> {
    this.url.searchParams.set('_sort', field);
    this.url.searchParams.set('_order', order);
    this.url.searchParams.set('_start', String(start));
    this.url.searchParams.set('_end', String(end));

    this.element.classList.add('sortable-table_loading');

    const data = await fetchJson<SortableTableData[]>(this.url.toString());

    this.element.classList.remove('sortable-table_loading');

    return data;
  }

  private addRows(data: SortableTableData[]): void {
    this.data = data;

    const body = this.sub('body');
    body.innerHTML = this.getTableRows(data);
  }

  update(data: SortableTableData[]): void {
    const body = this.sub('body');
    const rows = document.createElement('div');

    this.data = [...this.data, ...data];
    rows.innerHTML = this.getTableRows(data);

    body.append(...rows.childNodes);
  }

  private initEventListeners(): void {
    this.sub('header').addEventListener('pointerdown', this.onSortClick);
    document.addEventListener('scroll', this.onWindowScroll);
  }

  sort(field: string, order: SortOrder): void {
    const headerColumn = this.headersConfig.find(item => item.id === field);

    if (!headerColumn?.sortable) {
      return;
    }

    const headerElement = this.sub('header');
    const currentColumn = headerElement.querySelector<HTMLElement>(`.sortable-table__cell[data-id="${field}"]`);

    if (!currentColumn) {
      return;
    }

    currentColumn.dataset.order = order;

    const arrow = this.sub('arrow');
    currentColumn.append(arrow);

    this.sorted = {
      id: field,
      order
    };

    if (this.isSortLocally) {
      this.sortOnClient(field, order);
    } else {
      this.sortOnServer(field, order);
    }
  }

  sortOnClient(field: string, order: SortOrder): void {
    const sortedData = this.sortData(field, order);

    const body = this.sub('body');
    body.innerHTML = this.getTableRows(sortedData);
  }

  async sortOnServer(field: string, order: SortOrder): Promise<void> {
    const start = 1;
    const end = start + this.step;
    const data = await this.loadData(field, order, start, end);

    this.renderRows(data);
  }

  private renderRows(data: SortableTableData[]): void {
    const element = this.element;

    if (data.length) {
      element.classList.remove('sortable-table_empty');
      this.addRows(data);
    } else {
      element.classList.add('sortable-table_empty');
    }
  }

  private sortData(field: string, order: SortOrder): SortableTableData[] {
    const arr = [...this.data];
    const column = this.headersConfig.find(item => item.id === field);

    if (!column) {
      return arr;
    }

    const sortType = column?.sortType ?? 'string';
    const customSorting = column?.customSorting;
    const directions = {
      asc: 1,
      desc: -1
    };
    const direction = directions[order];

    return arr.sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      switch (sortType) {
      case 'number':
        return direction * (Number(aValue) - Number(bValue));
      case 'string':
        return direction * String(aValue).localeCompare(String(bValue), 'ru');
      case 'custom':
        return customSorting ? direction * customSorting(a, b) : 0;
      default:
        return direction * (Number(aValue) - Number(bValue));
      }
    });
  }

  remove(): void {
    this.sub('header').removeEventListener('pointerdown', this.onSortClick);
    document.removeEventListener('scroll', this.onWindowScroll);

    this.element.remove();
  }

  destroy(): void {
    this.remove();
    this._element = null;
  }
}