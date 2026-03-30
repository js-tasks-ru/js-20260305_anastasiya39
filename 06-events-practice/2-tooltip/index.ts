export default class Tooltip {
  element: HTMLElement | null = null;
  static instance: Tooltip | null = null;

  constructor() {
    if (Tooltip.instance) {
      return Tooltip.instance;
    }

    Tooltip.instance = this;
  }

  initialize() {
    document.addEventListener('pointerover', this.onPointerOver);
    document.addEventListener('pointerout', this.onPointerOut);
  }

  destroy() {
    document.removeEventListener('pointerover', this.onPointerOver);
    document.removeEventListener('pointerout', this.onPointerOut);

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    Tooltip.instance = null;
  }

  render(html: string) {
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.classList.add('tooltip');
      document.body.appendChild(this.element);
    }

    this.element.innerHTML = html;
  }

  private onPointerOver = (event: PointerEvent) => {
    const target = (event.target as HTMLElement).closest('[data-tooltip]') as HTMLElement;

    if (!target) return;

    this.render(target.dataset.tooltip || '');
  };

  private onPointerOut = (event: PointerEvent) => {
    const target = (event.target as HTMLElement).closest('[data-tooltip]');

    if (!target) return;

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  };
}