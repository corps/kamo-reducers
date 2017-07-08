import {Subscriber, Subscription} from "./subject";

export function generateRootElement(): Subscriber<HTMLElement> {
  return {
    subscribe: (dispatch: (element: HTMLElement) => void) => {
      let subscription = new Subscription();

      function createElement() {
        if (document.readyState !== 'complete') {
          return;
        }

        subscription.unsubscribe();

        let rootElement = document.createElement("DIV");
        document.body.appendChild(rootElement);

        subscription.add(() => rootElement.remove());
        dispatch(rootElement);
      }

      if (document.readyState === 'complete') {
        createElement();
      } else {
        document.addEventListener('readystatechange', createElement);
        subscription.add(() => document.removeEventListener('readystatechange', createElement));
      }

      return subscription.unsubscribe;
    }
  }
}
