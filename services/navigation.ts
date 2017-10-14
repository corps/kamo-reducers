import {Subject, Subscriber, Subscription} from "../subject";
import {GlobalAction, IgnoredSideEffect, ReductionWithEffect, SideEffect} from "../reducers";
import {sequence} from "./sequence";

export interface PathLocation {
  pathname: string,
  search: string,
  hash: string,
}

export interface HistoryPush {
  effectType: 'history-push',
  location: PathLocation
}

export function historyPush(location: PathLocation): HistoryPush {
  return {effectType: "history-push", location}
}

export interface HistoryReplace {
  effectType: 'history-replace',
  location: PathLocation
}

export function historyReplace(location: PathLocation): HistoryReplace {
  return {
    effectType: "history-replace",
    location
  }
}

export interface Visit {
  type: 'visit',
  noHistory?: boolean,
  location: PathLocation
}

export function visit(location: PathLocation): Visit {
  return {type: "visit", location};
}

export interface LinkClick {
  type: 'link-click',
  location: PathLocation
}

export function linkClick(location: PathLocation): LinkClick {
  let {pathname, search, hash} = location;
  return {
    type: 'link-click',
    location: {pathname, search, hash}
  }
}

export interface SetOnUnloadMessage {
  effectType: 'set-on-unload-message',
  enable: boolean
}

export function setOnUnloadMessage(enable: boolean): SetOnUnloadMessage {
  return {
    effectType: 'set-on-unload-message',
    enable
  }
}

export function clearOnUnloadMessage(): SetOnUnloadMessage {
  return {effectType: "set-on-unload-message", enable: false}
}

export const emptyLocation: PathLocation = {pathname: "", hash: "", search: ""};

export interface HistoryProvider {
  push(location: PathLocation): void
  listen(cb: (location: PathLocation, action: string) => void): () => void
  replace(location: PathLocation): void
  location: PathLocation
}

export function withHistory(history: HistoryProvider) {
  return (effect$: Subject<SideEffect>): Subscriber<GlobalAction> => {
    return {
      subscribe: (dispatch: (action: GlobalAction) => void) => {
        let subscription = new Subscription();
        let unloadMessage = false;

        const onUnload = (e: BeforeUnloadEvent) => {
          if (unloadMessage) {
            e.returnValue = unloadMessage;
            return unloadMessage;
          }
        };

        window.addEventListener('beforeunload', onUnload);
        subscription.add(() => {
          window.removeEventListener('beforeunload', onUnload);
        });

        subscription.add(history.listen((location, action) => {
          dispatch(visit(location));
        }));

        subscription.add(effect$.subscribe((effect: HistoryPush | HistoryReplace | SetOnUnloadMessage | IgnoredSideEffect) => {
          switch (effect.effectType) {
            case "set-on-unload-message":
              unloadMessage = effect.enable;
              break;

            case 'history-replace':
              history.replace(effect.location);
              break;

            case 'history-push':
              history.push(effect.location);
              break;
          }
        }));

        history.replace(history.location);
        return subscription.unsubscribe;
      }
    }
  }
}

export type NavigationAction = Visit | LinkClick;

export function navigationReducer<State extends Object>(route: (state: State,
                                                                pathLocation: PathLocation) => ReductionWithEffect<State>) {
  return (state: State, action: NavigationAction): ReductionWithEffect<State> => {
    let effect: SideEffect | void = null;

    switch (action.type) {
      case 'visit':
        let reduction = route(state, action.location);
        effect = sequence(effect, reduction.effect);
        state = reduction.state;
        break;

      case 'link-click':
        effect = sequence(effect, historyPush(action.location));
        break;
    }

    return {state, effect};
  }
}

export function inferBasePath(): string {
  let tags = document.getElementsByTagName("BASE");
  if (tags.length === 0) return "/";

  let parts = (tags[tags.length - 1] as HTMLBaseElement).href.split("/");
  return "/" + parts.slice(3).join("/");
}

export function visitDispatcher(dispatch: (a: GlobalAction) => void) {
  return ((event: { preventDefault(): void, target: any }) => {
    let tag = (event.target as HTMLAnchorElement);

    while (tag.parentElement != null && tag.tagName != "A") {
      tag = tag.parentElement as HTMLAnchorElement;
    }

    let {pathname, search, hash} = tag;

    let basePath = inferBasePath();
    if (pathname.slice(0, basePath.length) == basePath) {
      pathname = "/" + pathname.slice(basePath.length);
    }

    dispatch(linkClick({pathname, search, hash}));
    event.preventDefault();
  });
}
