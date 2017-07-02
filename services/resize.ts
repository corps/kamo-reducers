import {SizeMap, SizeUpdate, sizeUpdate} from "./sizing";
import {GlobalAction, SideEffect} from "../reducers";
import {Subject, Subscriber, Subscription} from "../subject";
import {debounce} from "./debounce";

export function withResizeWatcher<S extends SizeMap>(key: keyof S) {
  return (effect$: Subject<SideEffect>): Subscriber<GlobalAction> => {
    return {
      subscribe: (dispatch: (action: SizeUpdate<S>) => void) => {
        const subscription = new Subscription();

        let handler = () => {
          effect$.dispatch(debounce(sizeUpdate<S>(key, [window.innerWidth, window.innerHeight]), "window-resize"));
        };

        subscription.add(() => {
          window.removeEventListener("resize", handler);
        });

        window.addEventListener("resize", handler);
        handler();

        return subscription.unsubscribe;
      }
    }
  }
}