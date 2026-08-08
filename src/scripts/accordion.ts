function initAccordionGroup(group: Element) {
  const items = Array.from(group.querySelectorAll<HTMLElement>('[data-accordion-item]'));

  function setOpen(item: HTMLElement, isOpen: boolean) {
    const trigger = item.querySelector<HTMLElement>('[data-accordion-trigger]');
    item.classList.toggle('is-open', isOpen);
    trigger?.setAttribute('aria-expanded', String(isOpen));
  }

  items.forEach((item) => {
    const trigger = item.querySelector<HTMLElement>('[data-accordion-trigger]');
    trigger?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');
      items.forEach((other) => setOpen(other, false));
      if (!wasOpen) setOpen(item, true);
    });
  });
}

document.querySelectorAll('[data-accordion-group]').forEach(initAccordionGroup);
