import { fetchJson } from "../../shared/utils/fetch-json";

const BACKEND_URL = 'https://course-js.javascript.ru';

interface Options {
  label?: string;
  link?: string;
  chartHeight?: number;
  url?: string;
}

interface ColumnChartData {
  [key: string]: number;
}

export default class ColumnChart {
  element: HTMLElement | null = null;
  chartHeight: number;
  private data: ColumnChartData = {};
  private chartContainer: HTMLElement | null = null;
  private chartHeader: HTMLElement | null = null;
  private label: string;
  private link?: string;
  private url: string;

  constructor({ label = '', link = '', chartHeight = 50, url = '' }: Options = {}) {
    this.label = label;
    this.link = link;
    this.chartHeight = chartHeight;
    this.url = url;

    this.render();
  }

  private render() {
    const element = document.createElement('div');
    element.className = 'column-chart column-chart_loading';
    element.style.setProperty('--chart-height', String(this.chartHeight));

    element.innerHTML = `
      <div class="column-chart__title">
        ${this.label}
        ${this.link ? `<a class="column-chart__link" href="${this.link}">View all</a>` : ''}
      </div>
      <div class="column-chart__container">
        <div data-element="header" class="column-chart__header"></div>
        <div data-element="body" class="column-chart__chart"></div>
      </div>
    `;

    this.element = element;
    this.chartContainer = this.element.querySelector('[data-element="body"]')!;
    this.chartHeader = this.element.querySelector('[data-element="header"]')!;

    this.showSkeleton();
  }

  private showSkeleton() {
    this.chartContainer!.innerHTML = `<img src="/charts-skeleton.svg" alt="loading...">`;
  }

  private getColumnProps(data: ColumnChartData) {
    const values = Object.values(data);
    const maxValue = Math.max(...values);
    const scale = this.chartHeight / maxValue;

    return Object.entries(data).map(([key, value]) => {
      const scaledValue = Math.floor(value * scale);
      const percent = ((value / maxValue) * 100).toFixed(0);
      return `<div style="--value: ${scaledValue}" data-tooltip="${percent}%"></div>`;
    }).join('');
  }

  async update(from: Date, to: Date) {
    this.element!.classList.add('column-chart_loading');
    this.showSkeleton();

    const fromStr = from.toISOString();
    const toStr = to.toISOString();

    const url = new URL(this.url || '', BACKEND_URL);
    url.searchParams.set('from', fromStr);
    url.searchParams.set('to', toStr);

    this.data = await fetchJson(url.toString());

    const values = Object.values(this.data);
    const total = values.reduce((acc, val) => acc + val, 0);

    this.chartHeader!.textContent = total.toString();
    this.chartContainer!.innerHTML = this.getColumnProps(this.data);

    this.element!.classList.remove('column-chart_loading');

    return this.data;
  }

  destroy() {
    this.element?.remove();
    this.data = {};
  }
}