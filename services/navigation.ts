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

export interface SetBaseHref {
  effectType: 'set-base-href'
  href: string
}

export function setBaseHref(href: string): SetBaseHref {
  return {effectType: 'set-base-href', href};
}

export function historyPush(location: PathLocation): HistoryPush {
  return {effectType: "history-push", location}
}

export interface LoadPage {
  type: 'load-page',
  location: PathLocation
}

export function loadPage(location: PathLocation): LoadPage {
  return {type: 'load-page', location};
}

export const emptyLocation: PathLocation = {pathname: "", hash: "", search: ""};

export function withHistory(history: {
  listen: (listener: (location: PathLocation, action: string) => void) => () => void
  push: (location: PathLocation) => void
}, leaveBaseTag = false) {
  return (effect$: Subject<SideEffect>): Subscriber<GlobalAction> => {
    return {
      subscribe: (dispatch: (action: GlobalAction) => void) => {
        let subscription = new Subscription();
        let baseHrefSubscription = new Subscription();
        subscription.add(baseHrefSubscription.unsubscribe);

        subscription.add(history.listen((location, action) => {
          if (action !== "PUSH") {
            dispatch(loadPage(location));
          }
        }));

        subscription.add(effect$.subscribe((effect: HistoryPush | SetBaseHref | RequestBrowseToAppLocation | IgnoredSideEffect) => {
          switch (effect.effectType) {
            case 'history-push':
              history.push(effect.location);
              break;

            case 'request-browse-to-app-location':
              let basePath = inferBasePath();
              if (basePath[basePath.length - 1] !== "/") basePath += "/";
              let location = {...effect.location, pathname: basePath + effect.location.pathname};
              dispatch(visit(location));
              break;

            case 'set-base-href':
              baseHrefSubscription.unsubscribe();
              let baseElement = document.createElement("BASE") as HTMLBaseElement;
              baseElement.href = effect.href;
              document.head.appendChild(baseElement);
              if (!leaveBaseTag) {
                baseHrefSubscription.add(() => baseElement.remove());
              }

              break;
          }
        }));

        dispatch(loadPage(window.location));

        return subscription.unsubscribe;
      }
    }
  }
}

export interface Visit {
  type: 'visit',
  noHistory?: boolean,
  location: PathLocation
}

export function visit(location: PathLocation, noHistory = false): Visit {
  return {
    type: 'visit',
    location,
    noHistory
  }
}

export interface RequestBrowseToAppLocation {
  effectType: "request-browse-to-app-location",
  location: PathLocation
}

export function requestBrowseToAppLocation(location: PathLocation): RequestBrowseToAppLocation {
  return {
    effectType: "request-browse-to-app-location",
    location
  }
}

export type NavigationAction = Visit | LoadPage;

export function navigationReducer<State extends Object>(route: (state: State,
                                                                pathLocation: PathLocation) => ReductionWithEffect<State>) {
  return (state: State, action: NavigationAction): ReductionWithEffect<State> => {
    let withHistoryPush = false;
    let effect: SideEffect | 0 = null;

    switch (action.type) {
      case 'visit':
        withHistoryPush = !action.noHistory;

      case 'load-page':
        let reduction = route(state, locationFromBasePath(action.location));
        effect = sequence(effect, reduction.effect);
        state = reduction.state;

        if (withHistoryPush) {
          effect = sequence(effect, historyPush(action.location));
        }
        break;
    }

    return {state, effect};
  }
}

function inferBasePath(): string {
  let tags = document.getElementsByTagName("BASE");
  if (tags.length === 0) return "/";

  let parts = (tags[tags.length - 1] as HTMLBaseElement).href.split("/");
  return "/" + parts.slice(3).join("/");
}

function chopOffBasePath(pathname: string) {
  let base = inferBasePath();

  if (pathname.slice(0, base.length) === base) {
    return pathname.slice(base.lastIndexOf("/"));
  }

  return "/";
}

function locationFromBasePath(location: { pathname: string, search: string, hash: string }): PathLocation {
  const {pathname, search, hash} = location;
  return {pathname: chopOffBasePath(pathname), search, hash};
}

export function visitDispatcher(dispatch: (a: Visit) => void) {
  return ((event: { target: HTMLElement, preventDefault: () => void }) => {
    let tag = (event.target as HTMLAnchorElement);

    while (tag.parentElement != null && tag.tagName != "A") {
      tag = tag.parentElement as HTMLAnchorElement;
    }

    let {pathname, search, hash} = tag;
    dispatch(visit({pathname, search, hash}));
    event.preventDefault();
  })
}
