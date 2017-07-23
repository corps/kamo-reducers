export interface StoreLocalData {
  effectType: "store-local-data",
  data: object,
  key: string
}

export interface RequestLocalData {
  effectType: "request-local-data"
  key: string
}

export interface LoadLocalData {
  type: "load-local-data"
  key: string
  data: object | 0
}

export interface ClearLocalData {
  effectType: "clear-local-data"
}

export interface CancelLocalLoad {
  effectType: "cancel-local-load"
  key: string
}

export const clearLocalData: ClearLocalData = {effectType: "clear-local-data"};

export function cancelLocalLoad(key: string): CancelLocalLoad {
  return {effectType: "cancel-local-load", key};
}

export function storeLocalData(key: string, data: object): StoreLocalData {
  return {effectType: "store-local-data", key, data};
}

export function loadLocalData(key: string, data: object): LoadLocalData {
  return {type: "load-local-data", key, data};
}

export function requestLocalData(key: string): RequestLocalData {
  return {effectType: "request-local-data", key};
}
