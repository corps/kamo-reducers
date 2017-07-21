import {Subject, Subscriber, Subscription} from "../subject";
import {GlobalAction, SideEffect} from "../reducers";
export interface ShowBrowserNotification {
  effectType: "show-browser-notification"
  title: string
  body: string
  name: string[]
}

export function showBrowserNotification(name: string[], title: string, body: string): ShowBrowserNotification {
  return {
    effectType: "show-browser-notification",
    name,
    title,
    body
  }
}

export interface BrowserNotificationClicked {
  type: "browser-notification-clicked"
  name: string[]
}

export function browserNotificationClicked(name: string[]): BrowserNotificationClicked {
  return {
    type: "browser-notification-clicked",
    name
  }
}

let permissionGranted = false;
function checkPermission(force = false) {
  if ((Notification as any).permission === "denied") {
    permissionGranted = false;
  }

  if ((Notification as any).permission === "granted") {
    permissionGranted = true;
  }

  Notification.requestPermission((status) => {
    permissionGranted = status === "granted";
  });
  return permissionGranted || force;
}

export function withBrowserNotifications(effect$: Subject<SideEffect>): Subscriber<GlobalAction> {
  return {
    subscribe: (dispatch: (action: GlobalAction) => void) => {
      let subscription = new Subscription();
      let notifications: Notification[] = [];
      subscription.add(effect$.subscribe((effect: ShowBrowserNotification) => {
        checkPermission();

        switch (effect.effectType) {
          case "show-browser-notification":
            if (permissionGranted) {
              let notification = new Notification(effect.title, {body: effect.body});
              notification.onclick = () => {
                window.focus();
                notification.close();
                dispatch(browserNotificationClicked(effect.name));
              };
              notifications.push(notification);
            }
            break;
        }
      }));
      subscription.add(() => notifications.map(n => n.close()));
      return subscription.unsubscribe;
    }
  }
}
