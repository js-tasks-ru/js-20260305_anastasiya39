import ColumnChart from '../../../08-async-code-fetch-api/1-column-chart/src/index';
import SortableTable from '../../../08-async-code-fetch-api/2-sortable-table-v3/src/index';
import RangePicker from '../../../07-forms-fetch-api/2-range-picker/src/index';

import header from './bestsellers-header';
import { fetchJson } from '../../shared/utils/fetch-json';
import { createElement } from '../../shared/utils/create-element';
import { required } from '../../shared/utils/required';

const BACKEND_URL = 'https://course-js.javascript.ru/';

type DashboardData = Array<Record<string, unknown>>;

type PageComponents = {
  sortableTable: SortableTable;
  ordersChart: ColumnChart;
  salesChart: ColumnChart;
  customersChart: ColumnChart;
  rangePicker: RangePicker;
};

export default class Page {
  private _element: HTMLElement | null = null;
  components = {} as PageComponents;
  url = new URL('api/dashboard/bestsellers', BACKEND_URL);

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

  async updateComponents(from: Date, to: Date): Promise<void> {
    const data = await this.loadData(from, to);

    this.components.sortableTable.update(data);

    this.components.ordersChart.update(from, to);
    this.components.salesChart.update(from, to);
    this.components.customersChart.update(from, to);
  }

  loadData(from: Date, to: Date): Promise<DashboardData> {
    this.url.searchParams.set('_start', '1');
    this.url.searchParams.set('_end', '21');
    this.url.searchParams.set('_sort', 'title');
    this.url.searchParams.set('_order', 'asc');
    this.url.searchParams.set('from', from.toISOString());
    this.url.searchParams.set('to', to.toISOString());

    return fetchJson<DashboardData>(this.url);
  }

  initComponents(): void {
    const now = new Date();
    const to = new Date();
    const from = new Date(now.setMonth(now.getMonth() - 1));

    const rangePicker = new RangePicker({
      from,
      to
    });

    const sortableTable = new SortableTable(header, {
      url: `api/dashboard/bestsellers?_start=1&_end=20&from=${from.toISOString()}&to=${to.toISOString()}`,
      isSortLocally: true
    });

    const ordersChart = new ColumnChart({
      url: 'api/dashboard/orders',
      range: {
        from,
        to
      },
      label: 'orders',
      link: '#'
    });

    const salesChart = new ColumnChart({
      url: 'api/dashboard/sales',
      label: 'sales',
      range: {
        from,
        to
      }
    });

    const customersChart = new ColumnChart({
      url: 'api/dashboard/customers',
      label: 'customers',
      range: {
        from,
        to
      }
    });

    this.components = {
      sortableTable,
      ordersChart,
      salesChart,
      customersChart,
      rangePicker
    };
  }

  renderComponents(): void {
    Object.entries(this.components).forEach(([componentName, component]) => {
      const root = this.sub(componentName);
      root.append(component.element);
    });
  }

  get template(): string {
    return `<div class="dashboard">
      <div class="content__top-panel">
        <h2 class="page-title">Dashboard</h2>
        <!-- RangePicker component -->
        <div data-element="rangePicker"></div>
      </div>
      <div data-element="chartsRoot" class="dashboard__charts">
        <!-- column-chart components -->
        <div data-element="ordersChart" class="dashboard__chart_orders"></div>
        <div data-element="salesChart" class="dashboard__chart_sales"></div>
        <div data-element="customersChart" class="dashboard__chart_customers"></div>
      </div>

      <h3 class="block-title">Best sellers</h3>

      <div data-element="sortableTable">
        <!-- sortable-table component -->
      </div>
    </div>`;
  }

  render(): HTMLElement | null {
    this._element = createElement(this.template)

    this.initComponents();
    this.renderComponents();
    this.initEventListeners();

    return this.element;
  }

  initEventListeners(): void {
    const rangePickerElement = this.components.rangePicker.element;

    if (!rangePickerElement) {
      return;
    }

    rangePickerElement.addEventListener('date-select', event => {
      const { from, to } = (event as CustomEvent<{ from: Date; to: Date }>).detail;

      this.updateComponents(from, to);
    });
  }

  remove(): void {
    this.element.remove();
  }

  destroy(): void {
    this.remove();
    this._element = null;

    for (const component of Object.values(this.components)) {
      component.destroy();
    }
  }
}
