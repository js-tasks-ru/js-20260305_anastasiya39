export default class SortableList {
  element: HTMLElement;

  private dragItem: HTMLElement | null = null;
  private placeholder: HTMLElement | null = null;

  constructor({ items = [] }: { items?: HTMLElement[] } = {}) {
    this.element = document.createElement('ul');
    this.element.className = 'sortable-list';

    this.element.append(...items);

    this.initListeners();
  }

  private initListeners() {
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);

    this.element.addEventListener('pointerdown', this.onDelete);
  }

  private onDelete = (event: PointerEvent) => {
    const deleteHandle = (event.target as HTMLElement).closest(
      '[data-delete-handle]',
    );

    if (!deleteHandle) return;

    const item = deleteHandle.closest('li');
    if (!item) return;

    item.remove();
  };

  private onPointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement;

    const grabHandle = target.closest('[data-grab-handle]');
    const item = target.closest('li');

    if (!item) return;
    if (!grabHandle && target !== item) return;

    this.dragItem = item;

    this.placeholder = document.createElement('li');
    this.placeholder.className = 'sortable-list__placeholder';

    this.element.insertBefore(this.placeholder, item);

    item.classList.add('sortable-list__item_dragging');

    item.style.position = 'absolute';
    item.style.zIndex = '1000';
    item.style.pointerEvents = 'none';
    item.style.width = `${item.offsetWidth}px`;

    this.moveAt(event.pageY);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragItem || !this.placeholder) return;

    this.moveAt(event.pageY);

    const elemBelow = document.elementFromPoint(
      event.clientX,
      event.clientY,
    ) as HTMLElement | null;

    const item = elemBelow?.closest('li') as HTMLElement | null;

    if (!item || item === this.placeholder || item === this.dragItem) return;

    const rect = item.getBoundingClientRect();
    const middle = rect.top + rect.height / 2;

    if (event.clientY < middle) {
      this.element.insertBefore(this.placeholder, item);
    } else {
      this.element.insertBefore(this.placeholder, item.nextSibling);
    }
  };

  private onPointerUp = () => {
    if (!this.dragItem || !this.placeholder) return;

    this.placeholder.replaceWith(this.dragItem);

    this.dragItem.classList.remove('sortable-list__item_dragging');

    this.dragItem.style.position = '';
    this.dragItem.style.zIndex = '';
    this.dragItem.style.pointerEvents = '';
    this.dragItem.style.width = '';

    this.dragItem = null;
    this.placeholder = null;
  };

  private moveAt(pageY: number) {
    if (!this.dragItem) return;

    this.dragItem.style.top = `${pageY - this.dragItem.offsetHeight / 2}px`;
    this.dragItem.style.left = '0px';
  }

  remove() {
    this.element.remove();
  }

  destroy() {
    this.remove();

    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.element.removeEventListener('pointerdown', this.onDelete);
  }
}