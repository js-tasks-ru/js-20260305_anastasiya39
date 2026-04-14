import ColumnChart from '../../08-async-code-fetch-api/1-column-chart/';
import SortableTable from '../../08-async-code-fetch-api/2-sortable-table-v3/';
import RangePicker from '../../07-forms-fetch-api/2-range-picker/';

import header from './bestsellers-header';
import { fetchJson } from '../../shared/utils/fetch-json';
import { createElement } from '../../shared/utils/create-element';

const BACKEND_URL = 'https://course-js.javascript.ru/';

type PageComponents = {
  sortableTable: SortableTable;
  ordersChart: ColumnChart;
  salesChart: ColumnChart;
  customersChart: ColumnChart;
  rangePicker: RangePicker;
};

export default class Page {
  element: HTMLElement | null = null;

  private components: PageComponents;

  private from: Date;
  private to: Date;

  constructor() {
    this.from = new Date();
    this.to = new Date();
    this.from.setMonth(this.from.getMonth() - 1);

    const rangePicker = new RangePicker({
      from: this.from,
      to: this.to
    });

    const ordersChart = new ColumnChart({
      label: 'Orders',
      url: 'api/dashboard/orders'
    });

    const salesChart = new ColumnChart({
      label: 'Sales',
      url: 'api/dashboard/sales'
    });

    const customersChart = new ColumnChart({
      label: 'Customers',
      url: 'api/dashboard/customers'
    });

    const sortableTable = new SortableTable(header, {
      url: 'api/dashboard/bestsellers'
    });

    this.components = {
      rangePicker,
      ordersChart,
      salesChart,
      customersChart,
      sortableTable
    };
  }

  async render(): Promise<HTMLElement> {
    this.element = createElement(`
      <div class="dashboard">
        <div data-element="rangePicker"></div>
        <div data-element="charts" class="dashboard__charts"></div>
        <div data-element="table"></div>
      </div>
    `);

    this.initLayout(); 
    this.initEventListeners();
    this.update(this.from, this.to);

    return this.element;
  }

  private assertElement(): HTMLElement {
    if (!this.element) {
      throw new Error('Page is not initialized');
    }
    return this.element;
  }

  private sub(name: string): HTMLElement {
    const element = this.assertElement().querySelector(`[data-element="${name}"]`);

    if (!element) {
      throw new Error(`No sub element: ${name}`);
    }

    return element as HTMLElement;
  }

  private assertHTMLElement(el: HTMLElement | null, name: string): HTMLElement {
    if (!el) {
      throw new Error(`${name} is not initialized`);
    }
    return el;
  }
 
  private initLayout(): void {
    const {
      rangePicker,
      ordersChart,
      salesChart,
      customersChart,
      sortableTable
    } = this.components;

    this.sub('rangePicker').append(rangePicker.element);

    const charts = this.sub('charts');

    const ordersWrapper = document.createElement('div');
    ordersWrapper.setAttribute('data-element', 'ordersChart');
    ordersWrapper.append(this.assertHTMLElement(ordersChart.element, 'ordersChart'));

    const salesWrapper = document.createElement('div');
    salesWrapper.setAttribute('data-element', 'salesChart');
    salesWrapper.append(this.assertHTMLElement(salesChart.element, 'salesChart'));

    const customersWrapper = document.createElement('div');
    customersWrapper.setAttribute('data-element', 'customersChart');
    customersWrapper.append(this.assertHTMLElement(customersChart.element, 'customersChart'));

    charts.append(ordersWrapper, salesWrapper, customersWrapper);

    const tableElement = this.assertHTMLElement(
      sortableTable.element,
      'sortableTable'
    );

    tableElement.setAttribute('data-element', 'sortableTable');

    this.sub('table').append(tableElement);
  }

  private initEventListeners(): void {
    this.components.rangePicker.element.addEventListener('date-select', (event: Event) => {
      const { from, to } = (event as CustomEvent).detail;

      this.from = from;
      this.to = to;

      this.update(from, to);
    });
  }

  private update(from: Date, to: Date): void {
    const { ordersChart, salesChart, customersChart } = this.components;

    ordersChart.update(from, to);
    salesChart.update(from, to);
    customersChart.update(from, to);

    this.updateTable(from, to);
  }

  private updateTable(from: Date, to: Date): void {
    const container = this.sub('table');

    const newTable = new SortableTable(header, {
      url: `${BACKEND_URL}api/dashboard/bestsellers?from=${from.toISOString()}&to=${to.toISOString()}`
    });

    this.components.sortableTable = newTable;

    const wrapper = document.createElement('div');
    wrapper.dataset.element = 'sortableTable';

    wrapper.append(newTable.element);

    container.innerHTML = '';
    container.append(wrapper);
  }

  remove(): void {
    this.assertElement().remove();
  }

  destroy(): void {
    Object.values(this.components).forEach(c => c.destroy?.());
    this.remove();
  }
}