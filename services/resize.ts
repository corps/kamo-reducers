import {Sizing} from "./sizing";
import {IgnoredAction, ReductionWithEffect, SideEffect} from "../reducers";
import {Subject, Subscriber, Subscription} from "../subject";
import {debounce} from "./debounce";
export interface WindowResize {
  type: "window-resize"
}

const windowResize: WindowResize = {type: "window-resize"};

export function reduceWindowResizing(state: Sizing, action: WindowResize | IgnoredAction): ReductionWithEffect<Sizing> {
  switch (action.type) {
    case "window-resize":
      return {state: [window.innerWidth, window.innerHeight]};
  }

  return {state};
}

export function withResizeWatcher(effect$: Subject<SideEffect>): Subscriber<WindowResize> {
  return {
    subscribe: (dispatch: (action: WindowResize) => void) => {
      const subscription = new Subscription();
      const resizeHandler = () => {
        effect$.dispatch(debounce(windowResize, "window-resize"));
      };

      subscription.add(() => window.removeEventListener("resize", resizeHandler));
      window.addEventListener("resize", resizeHandler);

      return subscription.unsubscribe;
    }
  }
}
