import {Subject, Subscriber, Subscription} from "../subject";
import {GlobalAction, IgnoredSideEffect, SideEffect} from "../reducers";
export interface AjaxConfig {
  url: string
  method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH"
  json?: Object
  query?: { [k: string]: string | number }
  body?: string
  headers?: { [k: string]: string }
  overrideMimeType?: string
}

export interface RequestAjax {
  effectType: "request-ajax"
  name: string[]
  config: AjaxConfig
}

export function requestAjax(name: string[], config: AjaxConfig): RequestAjax {
  return {
    effectType: "request-ajax",
    name,
    config
  }
}

export interface AbortRequest {
  effectType: "abort-request"
  name: string[]
  when: number
}

export function abortRequest(name: string[], when = Date.now()): AbortRequest {
  return {
    effectType: "abort-request",
    name,
    when
  }
}

export interface CompleteRequest {
  type: "complete-request"
  name: string[]
  success: boolean
  status: number
  response: string
  headers: string
  when: number
}

export function completeRequest(requestEffect: RequestAjax,
                                status: number, response: string,
                                headers: string, when = Date.now()): CompleteRequest {
  return {
    type: "complete-request",
    name: requestEffect.name,
    success: status >= 200 && status < 300,
    status: status,
    response: response,
    headers: headers,
    when
  }
}

export function withAjax(effect$: Subject<SideEffect>): Subscriber<GlobalAction> {
  return {
    subscribe: (dispatch: (action: GlobalAction) => void) => {
      const subscription = new Subscription();
      let requests = {} as { [k: string]: XMLHttpRequest };
      let existing: XMLHttpRequest;

      subscription.add(effect$.subscribe((effect: RequestAjax | AbortRequest | IgnoredSideEffect) => {
        let normalizedName: string;

        switch (effect.effectType) {
          case "abort-request":
            normalizedName = effect.name.join("-");
            existing = requests[normalizedName];

            if (existing) {
              existing.abort();
              delete requests[normalizedName];
            }
            break;

          case "request-ajax":
            normalizedName = effect.name.join("-");
            if (requests[normalizedName]) {
              effect$.dispatch(abortRequest(effect.name));
            }

            let xhr = requests[normalizedName] = new XMLHttpRequest();

            xhr.withCredentials = false;

            if (effect.config.overrideMimeType) {
              xhr.overrideMimeType(effect.config.overrideMimeType);
            }

            xhr.onerror = function () {
              if (requests[normalizedName] === xhr) {
                delete requests[normalizedName];
              }

              dispatch(completeRequest(effect, 0, "", ""));
            };

            xhr.onload = function () {
              if (requests[normalizedName] === xhr) {
                delete requests[normalizedName];
              }

              dispatch(completeRequest(effect, xhr.status, xhr.responseText, xhr.getAllResponseHeaders()));
            };

            xhr.ontimeout = function () {
              if (requests[normalizedName] === xhr) {
                delete requests[normalizedName];
              }

              dispatch(completeRequest(effect, 408, "", ""));
            };

            xhr.open(effect.config.method, getAjaxUrl(effect.config), true);

            const headers = effect.config.headers;
            if (headers) {
              for (let key in headers) {
                xhr.setRequestHeader(key, headers[key]);
              }
            }

            xhr.send(getAjaxBody(effect.config));
        }
      }));

      subscription.add(() => {
        let r = requests;
        requests = {};
        for (let k in r) {
          r[k].abort();
        }
      });

      return subscription.unsubscribe;
    }
  }
}

export function getAjaxUrl(config: AjaxConfig): string {
  let url = config.url;

  const query = config.query;
  if (query) {
    let parts = [] as string[];
    for (let key in query) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(query[key] as string));
    }

    if (parts.length) url += (url.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
  }

  return url;
}

export function getAjaxBody(config: AjaxConfig): string {
  if (config.body) return config.body;
  if (config.json) return JSON.stringify(config.json);
  return null;
}

const headerSeparator = '\u000d\u000a';
const headerValueSeparator = '\u003a\u0020';

export function parseResponseHeaders(headerStr: string) {
  let headers = {} as { [k: string]: string };
  if (!headerStr) {
    return headers;
  }

  let headerPairs = headerStr.split(headerSeparator);

  for (let i = 0, len = headerPairs.length; i < len; i++) {
    let headerPair = headerPairs[i];
    let idx = headerPair.indexOf(headerValueSeparator);
    if (idx > 0) {
      headers[headerPair.substring(0, idx).toLowerCase()] = headerPair.substring(idx + 2);
    }
  }

  return headers;
}

export function encodeResponseHeaders(headers: { [k: string]: string }) {
  return Object.keys(headers).map((k: string) => k + headerValueSeparator + headers[k]).join(headerSeparator);
}

export function encodeQueryParts(parts: { [k: string]: any }): { [k: string]: string } {
  let result = {} as { [k: string]: string };

  for (let k in parts) {
    let value = parts[k];
    if (typeof value === "string") {
      result[k] = value;
    } else if (typeof value === "number") {
      result[k] = value + "";
    } else if (Array.isArray(value)) {
      result[k] = value.join(",");
    } else {
      let subParts = encodeQueryParts(value);
      for (let subKey in subParts) {
        result[k + "[" + subKey + "]"] = subParts[subKey];
      }
    }
  }

  return result;
}
