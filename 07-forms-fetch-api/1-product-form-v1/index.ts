import { escapeHtml } from '../../shared/utils/escape-html';
import { fetchJson } from '../../shared/utils/fetch-json';

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const BACKEND_URL = 'https://course-js.javascript.ru';

interface ProductImage {
  url: string;
  source: string;
}

interface ImgurUploadResponse {
  data: {
    link: string;
  };
}

interface Subcategory {
  id: string;
  title: string;
}

interface Category {
  id: string;
  title: string;
  subcategories: Subcategory[];
}

interface Product {
  id?: string;
  title?: string;
  description?: string;
  price?: number;
  discount?: number;
  quantity?: number;
  status?: number;
  subcategory?: string;
  images?: ProductImage[];
}

export default class ProductForm {
  element: HTMLElement | null = null;
  productId?: string;

  private subElements: Record<string, HTMLElement> = {};
  private productData: Product = {};
  private categories: Category[] = [];

  constructor(productId?: string) {
    this.productId = productId;
  }

  async render(): Promise<HTMLElement | null> {
    const categories = await fetchJson<Category[]>(`${BACKEND_URL}/api/rest/categories`);
    this.categories = categories;

    if (this.productId) {
      const products = await fetchJson<Product[]>(
        `${BACKEND_URL}/api/rest/products?id=${this.productId}`
      );

      this.productData = products[0];
    }

    const element = document.createElement('div');
    element.innerHTML = this.getTemplate();

    this.element = element.firstElementChild as HTMLElement;

    this.subElements = {
      form: this.element.querySelector('[data-element="productForm"]') as HTMLElement,
      imageListContainer: this.element.querySelector('[data-element="imageListContainer"]') as HTMLElement,
      uploadImage: this.element.querySelector('[data-element="uploadImage"]') as HTMLElement
    };

    this.initEventListeners();

    return this.element;
  }

  getTemplate(): string {
    return `
      <div class="product-form">
        <form data-element="productForm" class="form-grid">
          <div class="form-group form-group__half_left">
            <fieldset>
              <label class="form-label">Название товара</label>
              <input id="title" required type="text" name="title" class="form-control"
                value="${escapeHtml(this.productData.title || '')}">
            </fieldset>
          </div>

          <div class="form-group form-group__wide">
            <label class="form-label">Описание</label>
            <textarea id="description" required class="form-control"
              name="description">${escapeHtml(this.productData.description || '')}</textarea>
          </div>

          <div class="form-group form-group__wide">
            <label class="form-label">Фото</label>

            <button type="button" class="button-primary-outline" data-element="uploadImage">
              Загрузить
            </button>

            <div data-element="imageListContainer">
              ${this.getImages()}
            </div>
          </div>

          <div class="form-group form-group__half_left">
            <label class="form-label">Категория</label>
            <select id="subcategory" name="subcategory" class="form-control">
              ${this.getCategories()}
            </select>
          </div>

          <div class="form-group form-group__half_left">
            <label class="form-label">Цена</label>
            <input id="price" type="number" name="price" class="form-control"
              value="${this.productData.price ?? ''}">
          </div>

          <div class="form-group form-group__half_left">
            <label class="form-label">Скидка</label>
            <input id="discount" type="number" name="discount" class="form-control"
              value="${this.productData.discount ?? ''}">
          </div>

          <div class="form-group form-group__half_left">
            <label class="form-label">Количество</label>
            <input id="quantity" type="number" name="quantity" class="form-control"
              value="${this.productData.quantity ?? ''}">
          </div>

          <div class="form-group form-group__half_left">
            <label class="form-label">Статус</label>
            <select id="status" name="status" class="form-control">
              <option value="1" ${this.productData.status === 1 ? 'selected' : ''}>Активен</option>
              <option value="0" ${this.productData.status === 0 ? 'selected' : ''}>Неактивен</option>
            </select>
          </div>

          <div class="form-buttons">
            <button type="submit" class="button-primary-outline">
              Сохранить товар
            </button>
          </div>
        </form>
      </div>
    `;
  }

  getCategories(): string {
    return this.categories
      .map(category =>
        (category.subcategories ?? [])
          .map((sub: Subcategory) => {
            const selected = sub.id === this.productData.subcategory ? 'selected' : '';
            return `<option value="${sub.id}" ${selected}>${category.title} > ${sub.title}</option>`;
          })
          .join('')
      )
      .join('');
  }

  getImages(): string {
    if (!this.productData.images) return '';

    return `
      <ul class="sortable-list">
        ${this.productData.images
          .map(
            (image: ProductImage) => `
          <li class="products-edit__imagelist-item sortable-list__item">
            <input type="hidden" name="url" value="${image.url}">
            <input type="hidden" name="source" value="${image.source}">
            <span>
              <img class="sortable-table__cell-img"
                src="${image.url}"
                alt="${image.source}">
            </span>
          </li>
        `
          )
          .join('')}
      </ul>
    `;
  }

  initEventListeners(): void {
    this.subElements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save();
    });

    this.subElements.uploadImage.addEventListener('click', this.uploadImage);
  }

  private uploadImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();

    input.onchange = async () => {
      if (!input.files?.length) return;

      const file = input.files[0];
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
        },
        body: formData
      });

      const result: ImgurUploadResponse = await response.json();

      const image: ProductImage = {
        url: result.data.link,
        source: file.name
      };

      const container = this.subElements.imageListContainer;

      let list = container.querySelector('ul');
      if (!list) {
        list = document.createElement('ul');
        list.className = 'sortable-list';
        container.appendChild(list);
      }

      const item = document.createElement('li');
      item.className = 'products-edit__imagelist-item sortable-list__item';

      item.innerHTML = `
        <input type="hidden" name="url" value="${image.url}">
        <input type="hidden" name="source" value="${image.source}">
        <span>
          <img class="sortable-table__cell-img"
            src="${image.url}"
            alt="${image.source}">
        </span>
      `;

      list.appendChild(item);
    };
  };

  async save(): Promise<void> {
    const form = this.subElements.form as HTMLFormElement;
    const formData = new FormData(form);

    const data = Object.fromEntries(formData.entries());

    const preparedData = {
      ...data,
      price: Number(data.price),
      discount: Number(data.discount),
      quantity: Number(data.quantity),
      status: Number(data.status)
    };

    await fetchJson(`${BACKEND_URL}/api/rest/products`, {
      method: this.productId ? 'PATCH' : 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preparedData)
    });

    const eventName = this.productId ? 'product-updated' : 'product-saved';

    this.element?.dispatchEvent(
      new CustomEvent(eventName, {
        detail: this.productId,
        bubbles: true
      })
    );
  }

  remove(): void {
    this.element?.remove();
  }

  destroy(): void {
    this.remove();
  }
}