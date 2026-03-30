type DoubleSliderSelected = {
  from: number;
  to: number;
};

interface Options {
  min?: number;
  max?: number;
  formatValue?: (value: number) => string;
  selected?: DoubleSliderSelected;
}

export default class DoubleSlider {
  element: HTMLElement | null = null;
  min: number;
  max: number;

  private formatValue: (value: number) => string;
  private selected: DoubleSliderSelected;

  private subElements: Record<string, HTMLElement> = {};
  private activeThumb: 'left' | 'right' | null = null;

  constructor({
    min = 0,
    max = 200,
    formatValue = (value: number) => `$${value}`,
    selected = { from: min, to: max }
  }: Options = {}) {
    this.min = min;
    this.max = max;
    this.formatValue = formatValue;
    this.selected = selected;

    this.render();
    this.initEventListeners();
    this.update();
  }

  render() {
    const element = document.createElement('div');
    element.classList.add('range-slider');

    element.innerHTML = `
      <span data-element="from"></span>
      <div class="range-slider__inner" data-element="inner">
        <span class="range-slider__progress" data-element="progress"></span>
        <span class="range-slider__thumb-left" data-element="thumbLeft"></span>
        <span class="range-slider__thumb-right" data-element="thumbRight"></span>
      </div>
      <span data-element="to"></span>
    `;

    this.element = element;

    this.subElements = {
      from: element.querySelector('[data-element="from"]')!,
      to: element.querySelector('[data-element="to"]')!,
      inner: element.querySelector('[data-element="inner"]')!,
      progress: element.querySelector('[data-element="progress"]')!,
      thumbLeft: element.querySelector('[data-element="thumbLeft"]')!,
      thumbRight: element.querySelector('[data-element="thumbRight"]')!,
    };
  }

  initEventListeners() {
    this.subElements.thumbLeft.addEventListener('pointerdown', this.onPointerDown);
    this.subElements.thumbRight.addEventListener('pointerdown', this.onPointerDown);
  }

  onPointerDown = (event: PointerEvent) => {
    event.preventDefault();

    if (event.target === this.subElements.thumbLeft) {
      this.activeThumb = 'left';
    }

    if (event.target === this.subElements.thumbRight) {
      this.activeThumb = 'right';
    }

    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  };

  onPointerMove = (event: PointerEvent) => {
    const rect = this.subElements.inner.getBoundingClientRect();
    const relative = (event.clientX - rect.left) / rect.width;
    const clamped = Math.min(Math.max(relative, 0), 1);

    const value = this.min + clamped * (this.max - this.min);

    if (this.activeThumb === 'left') {
      this.selected.from = Math.min(value, this.selected.to);
    }

    if (this.activeThumb === 'right') {
      this.selected.to = Math.max(value, this.selected.from);
    }

    this.update();
  };

  onPointerUp = () => {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);

    this.dispatchEvent();
    this.activeThumb = null;
  };

  update() {
    const range = this.max - this.min || 1;

    const leftPercent = ((this.selected.from - this.min) / range) * 100;
    const rightPercent = ((this.max - this.selected.to) / range) * 100;

    this.subElements.thumbLeft.style.left = `${leftPercent}%`;
    this.subElements.thumbRight.style.right = `${rightPercent}%`;

    this.subElements.progress.style.left = `${leftPercent}%`;
    this.subElements.progress.style.right = `${rightPercent}%`;

    this.subElements.from.textContent = this.formatValue(Math.round(this.selected.from));
    this.subElements.to.textContent = this.formatValue(Math.round(this.selected.to));
  }

  dispatchEvent() {
    if (!this.element) return;

    const event = new CustomEvent('range-select', {
      detail: {
        from: Math.round(this.selected.from),
        to: Math.round(this.selected.to),
      },
      bubbles: true
    });

    this.element.dispatchEvent(event);
  }

  destroy() {
    if (!this.element) return;
    this.subElements.thumbLeft.removeEventListener('pointerdown', this.onPointerDown);
    this.subElements.thumbRight.removeEventListener('pointerdown', this.onPointerDown);

    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);

    this.element.remove();
  }
}