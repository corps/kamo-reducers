import {Subscriber, Subscription} from "./subject";

export function generateRootElement(): Subscriber<HTMLElement> {
  return {
    subscribe: (dispatch: (element: HTMLElement) => void) => {
      let subscription = new Subscription();

      function createElement() {
        let rootElement = document.createElement("DIV");
        document.body.appendChild(rootElement);

        subscription.add(() => rootElement.remove());
        dispatch(rootElement);
      }

      let state = document.readyState;
      if (state === 'complete' || state === 'interactive') {
        createElement();
      } else {
        document.addEventListener('DOMContentLoaded', createElement);
        subscription.add(() => document.removeEventListener('DOMContentLoaded', createElement));
      }

      return subscription.unsubscribe;
    }
  }
}
