import { createElement } from '../../shared/utils/create-element';

export default class SortableList {
  private _element: HTMLUListElement | null = null;
  items: HTMLElement[];
  draggingElem: HTMLElement | null = null;
  placeholderElem: HTMLElement | null = null;
  elementInitialIndex = 0;
  pointerInitialShift = { x: 0, y: 0 };

  constructor({ items = [] }: { items?: HTMLElement[] } = {}) {
    this.items = items;

    this.render();
  }

  get element(): HTMLUListElement {
    if (!this._element) {
      throw new Error("Element has been destroyed or not rendered");
    }
    return this._element;
  }

  get template(): string {
    return '<ul class="sortable-list"></ul>';
  }

  onDocumentPointerMove = ({ clientX, clientY }: PointerEvent): void => {
    const element = this.element;

    if (!this.draggingElem || !this.placeholderElem) {
      return;
    }

    this.moveDraggingAt(clientX, clientY);

    const { firstElementChild, lastElementChild, children } = element;
    const { top: firstElementTop } = firstElementChild!.getBoundingClientRect();
    const { bottom: lastElementBottom } = lastElementChild!.getBoundingClientRect();

    // handle simple cases first
    if (clientY < firstElementTop) {
      this.movePlaceholderAt(0);
    } else if (clientY > lastElementBottom) {
      this.movePlaceholderAt(children.length);
    } else {
      for (let i = 0; i < children.length; i++) {
        const li = children[i] as HTMLElement;

        // ignore to prevent bugs when dragging between elements
        if (li !== this.draggingElem) {
          const { top, bottom } = li.getBoundingClientRect();
          const { offsetHeight: height } = li;

          if (clientY > top && clientY < bottom) {
            // inside the element (y-axis)
            if (clientY < top + height / 2) {
              // upper half of the element
              this.movePlaceholderAt(i);
              break;
            } else {
              // lower half of the element
              this.movePlaceholderAt(i + 1);
              break;
            }
          }
        }
      }
    }

    this.scrollIfCloseToWindowEdge(clientY);
  };

  onDocumentPointerUp = (): void => {
    this.dragStop();
  };

  render(): void {
    this._element = createElement(this.template) as HTMLUListElement;

    this.addItems();
    this.initEventListeners();
  }

  initEventListeners(): void {
    this.element.addEventListener('pointerdown', event => this.onPointerDown(event));
  }

  addItems(): void {
    // item is a DOM element
    for (let item of this.items) {
      item.classList.add('sortable-list__item');
    }

    this.element.append(...this.items);
  }

  onPointerDown(event: PointerEvent): void | false {
    if (event.which !== 1) { // must be left-button
      return false;
    }

    const target = event.target as HTMLElement | null;
    const itemElem = target?.closest<HTMLElement>('.sortable-list__item');

    if (itemElem) {
      if (target?.closest('[data-grab-handle]')) {
        event.preventDefault();

        this.dragStart(itemElem, event);
      }

      if (target?.closest('[data-delete-handle]')) {
        event.preventDefault();

        itemElem.remove();
      }
    }
  }

  dragStart(itemElem: HTMLElement, { clientX, clientY }: PointerEvent): void {
    const element = this.element;

    this.elementInitialIndex = [...element.children].indexOf(itemElem);

    this.pointerInitialShift = {
      x: clientX - itemElem.getBoundingClientRect().x,
      y: clientY - itemElem.getBoundingClientRect().y
    };

    this.draggingElem = itemElem;

    this.placeholderElem = document.createElement('li');
    this.placeholderElem.className = 'sortable-list__placeholder';

    // itemElem will get position:fixed
    // so its width will be auto-set to fit the parent container
    itemElem.style.width = itemElem.offsetWidth + 'px';
    itemElem.style.height = itemElem.offsetHeight + 'px';

    this.placeholderElem.style.width = itemElem.style.width;
    this.placeholderElem.style.height = itemElem.style.height;

    itemElem.classList.add('sortable-list__item_dragging');

    itemElem.after(this.placeholderElem);

    // move to the end, to be over other list elements
    element.append(itemElem);

    this.moveDraggingAt(clientX, clientY);

    document.addEventListener('pointermove', this.onDocumentPointerMove);
    document.addEventListener('pointerup', this.onDocumentPointerUp);
  }

  moveDraggingAt(clientX: number, clientY: number): void {
    if (!this.draggingElem) {
      return;
    }

    this.draggingElem.style.left = `${clientX - this.pointerInitialShift.x}px`;
    this.draggingElem.style.top = `${clientY - this.pointerInitialShift.y}px`;
  }

  scrollIfCloseToWindowEdge(clientY: number): void {
    const scrollingValue = 10;
    const threshold = 20;

    if (clientY < threshold) {
      window.scrollBy(0, -scrollingValue);
    } else if (clientY > document.documentElement.clientHeight - threshold) {
      window.scrollBy(0, scrollingValue);
    }
  }

  movePlaceholderAt(index: number): void {
    const element = this.element;

    if (!this.placeholderElem) {
      return;
    }

    const currentElement = element.children[index];

    if (currentElement !== this.placeholderElem) {
      element.insertBefore(this.placeholderElem, currentElement);
    }
  }

  dragStop(): void {
    const element = this.element;

    if (!this.draggingElem || !this.placeholderElem) {
      return;
    }

    const placeholderIndex = [...element.children].indexOf(this.placeholderElem);

    // drop element back
    this.placeholderElem.replaceWith(this.draggingElem);
    this.draggingElem.classList.remove('sortable-list__item_dragging');

    this.draggingElem.style.left = '';
    this.draggingElem.style.top = '';
    this.draggingElem.style.width = '';
    this.draggingElem.style.height = '';

    document.removeEventListener('pointermove', this.onDocumentPointerMove);
    document.removeEventListener('pointerup', this.onDocumentPointerUp);

    this.draggingElem = null;
    this.placeholderElem = null;

    if (placeholderIndex !== this.elementInitialIndex) {
      element.dispatchEvent(new CustomEvent('sortable-list-reorder', {
        bubbles: true,
        detail: {
          from: this.elementInitialIndex,
          to: placeholderIndex
        }
      }));
    }
  }

  remove(): void {
    this.element.remove();
    document.removeEventListener('pointermove', this.onDocumentPointerMove);
    document.removeEventListener('pointerup', this.onDocumentPointerUp);
  }

  destroy(): void {
    this.remove();
  }
}
