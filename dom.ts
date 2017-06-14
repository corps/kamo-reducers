import {Subscription} from "./subject";
export function onDomReady(f: () => void) {
  let state = document.readyState;
  if (state === 'complete' || state === 'interactive') {
    f();
    return;
  }

  document.addEventListener('DOMContentLoaded', f);
  return () => document.removeEventListener('DOMContentLoaded', f);
}

export function setupRootElement(cleanup: Subscription) {
  let rootElement = document.createElement("DIV");
  cleanup.add(() => rootElement.remove());
  document.body.appendChild(rootElement);
  return rootElement;
}
