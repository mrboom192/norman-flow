import { useEffect, useRef, useState } from "react";

type Camera = { center: { lat: number; lng: number }; zoom: number };
export type BasemapStatus = "loading" | "ready" | "unavailable";
type MapInstance = {
  moveCamera: (camera: Camera) => void;
  setMapTypeId: (type: string) => void;
  addListener: (
    event: "tilesloaded",
    callback: () => void,
  ) => { remove: () => void };
};
type Maps = {
  Map: new (
    host: HTMLDivElement,
    options: Camera & {
      mapTypeId: string;
      disableDefaultUI: boolean;
      gestureHandling: string;
      keyboardShortcuts: boolean;
      isFractionalZoomEnabled: boolean;
      clickableIcons: boolean;
    },
  ) => MapInstance;
};
type MapsWindow = Window & {
  google?: { maps: Maps };
  gm_authFailure?: () => void;
  normanFlowMapsReady?: () => void;
};

let api: Promise<Maps> | undefined;
let authorizationFailed = false;
const authListeners = new Set<() => void>();

function loadMaps(key: string) {
  const browser = window as MapsWindow;
  api ??= new Promise<Maps>((resolve, reject) => {
    const previousAuthFailure = browser.gm_authFailure;
    browser.gm_authFailure = () => {
      authorizationFailed = true;
      reject(new Error("Google Maps authorization failed."));
      authListeners.forEach((listener) => listener());
      previousAuthFailure?.();
    };
    if (browser.google?.maps?.Map) {
      resolve(browser.google.maps);
      return;
    }
    const script = document.createElement("script");
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.search = new URLSearchParams({
      key,
      loading: "async",
      callback: "normanFlowMapsReady",
      v: "quarterly",
      auth_referrer_policy: "origin",
    }).toString();
    browser.normanFlowMapsReady = () => {
      delete browser.normanFlowMapsReady;
      if (browser.google?.maps?.Map) resolve(browser.google.maps);
      else reject(new Error("Google Maps did not initialize."));
    };
    script.async = true;
    script.src = url.href;
    script.onerror = () => {
      delete browser.normanFlowMapsReady;
      script.remove();
      reject(new Error("Google Maps could not be loaded."));
    };
    document.head.append(script);
  });
  return api;
}

export const googleMapsWebKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY?.trim();

export function GoogleBasemap({
  camera,
  type,
  onStatus,
}: {
  camera: Camera;
  /** Google map type id: roadmap, satellite or hybrid (imagery with labels). */
  type: string;
  onStatus: (status: BasemapStatus) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const latest = useRef({ camera, type });
  const [status, setStatus] = useState<BasemapStatus>("loading");

  useEffect(() => {
    latest.current = { camera, type };
    map.current?.moveCamera(camera);
    map.current?.setMapTypeId(type);
  }, [camera, type]);

  useEffect(() => {
    const element = host.current;
    if (!element || !googleMapsWebKey) return;
    let cancelled = false;
    let listener: ReturnType<MapInstance["addListener"]> | undefined;
    const fail = () => {
      if (!cancelled) setStatus("unavailable");
    };
    const timeout = window.setTimeout(fail, 12_000);
    authListeners.add(fail);
    loadMaps(googleMapsWebKey)
      .then((maps) => {
        if (cancelled) return;
        if (authorizationFailed) {
          fail();
          return;
        }
        map.current = new maps.Map(element, {
          ...latest.current.camera,
          mapTypeId: latest.current.type,
          disableDefaultUI: true,
          gestureHandling: "none",
          keyboardShortcuts: false,
          isFractionalZoomEnabled: true,
          clickableIcons: false,
        });
        listener = map.current.addListener("tilesloaded", () => {
          window.clearTimeout(timeout);
          if (!authorizationFailed) setStatus("ready");
        });
      })
      .catch(fail);
    return () => {
      cancelled = true;
      authListeners.delete(fail);
      window.clearTimeout(timeout);
      listener?.remove();
      map.current = null;
      element.replaceChildren();
    };
  }, []);

  useEffect(() => onStatus(status), [onStatus, status]);

  return (
    <div
      ref={host}
      style={{
        position: "absolute",
        inset: 0,
        visibility: status === "ready" ? "visible" : "hidden",
      }}
    />
  );
}
