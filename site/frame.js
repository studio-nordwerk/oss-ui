// Shared behaviour of the package documentation pages. Loaded by every page; a page's own script
// can import say() from here.

const toast = document.querySelector('.toast');
let toastTimer = 0;

/** Shows a short message, e.g. for links and buttons the examples only pretend to follow. */
export function say(text) {
  toast.textContent = text;
  toast.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 1800);
}

document.addEventListener('click', async (event) => {
  // www.nordwerk.studio serves each page at /oss/<name>, without the slash that <base href> ends
  // in, so "#section" would point at another address and reload the page.
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor && !event.defaultPrevented && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
    event.preventDefault();
    const hash = anchor.getAttribute('href');
    if (location.hash === hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else location.hash = hash;
    return;
  }
  // <button data-copy="id"> copies the text of the element with that id.
  const button = event.target.closest('[data-copy]');
  if (button) {
    try {
      await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select and copy';
    }
    setTimeout(() => (button.textContent = 'Copy'), 1600);
  }
});

// Example iframes post { frameHeight } with their content height, so they grow to it instead of
// scrolling.
window.addEventListener('message', (event) => {
  const height = event.data?.frameHeight;
  const frame = [...document.querySelectorAll('iframe')].find((iframe) => iframe.contentWindow == event.source);
  if (frame && height) frame.style.height = `${Math.ceil(height)}px`;
});
