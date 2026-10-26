export type SystemNotificationState =
  "off" | "ready" | "denied" | "unsupported" | "unavailable";
const scope = "/slotly-notifications/";
const permissionAttemptKey =
  "slotly:system-notifications:permission-requested:v1";
let permissionAttempted = false;
let preparingWorker: Promise<ServiceWorkerRegistration> | null = null;
let requestingPermission: Promise<SystemNotificationState> | null = null;
const preferences = new Map<string, boolean>();
export const systemNotificationPreferenceKey = (businessId: string) =>
  "slotly:notifications:" + businessId;
export function readSystemNotificationPreference(businessId: string) {
  try {
    const stored = localStorage.getItem(
      systemNotificationPreferenceKey(businessId),
    );
    return stored === null
      ? (preferences.get(businessId) ?? true)
      : stored !== "false";
  } catch {
    return preferences.get(businessId) ?? true;
  }
}
export function writeSystemNotificationPreference(
  businessId: string,
  enabled: boolean,
) {
  preferences.set(businessId, enabled);
  try {
    localStorage.setItem(
      systemNotificationPreferenceKey(businessId),
      String(enabled),
    );
  } catch {
    /* Keep this session's explicit choice. */
  }
}
export function notificationSupport() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}
async function activeRegistration(registration: ServiceWorkerRegistration) {
  if (registration.active?.state === "activated") return registration;
  const worker =
    registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error("Notification worker unavailable");
  await new Promise<void>((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer);
      worker.removeEventListener("statechange", changed);
    };
    const changed = () => {
      if (worker.state === "activated") {
        stop();
        resolve();
      } else if (worker.state === "redundant") {
        stop();
        reject(new Error("Notification worker unavailable"));
      }
    };
    const timer = setTimeout(() => {
      stop();
      reject(new Error("Notification worker activation timeout"));
    }, 10000);
    worker.addEventListener("statechange", changed);
    changed();
  });
  return registration;
}
function prepareWorker() {
  preparingWorker ??= (async () => {
    const existing = await navigator.serviceWorker.getRegistration(scope);
    return await activeRegistration(
      existing ??
        (await navigator.serviceWorker.register("/slotly-notifications-sw.js", {
          scope,
        })),
    );
  })().finally(() => {
    preparingWorker = null;
  });
  return preparingWorker;
}
export async function currentNotificationState(): Promise<SystemNotificationState> {
  if (!notificationSupport()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  const registration = await prepareWorker();
  return "showNotification" in registration ? "ready" : "unsupported";
}
function firstPermissionGesture() {
  if (permissionAttempted) return false;
  permissionAttempted = true;
  try {
    if (localStorage.getItem(permissionAttemptKey) === "true") return false;
    localStorage.setItem(permissionAttemptKey, "true");
  } catch {
    /* Storage unavailable: still ask at most once in this page lifetime. */
  }
  return true;
}
// Opening the bell is the explicit gesture. No await precedes requestPermission.
// Loading/focus only prepares a worker for permission already granted.
export async function enableSystemNotifications(
  explicitSetting = false,
): Promise<SystemNotificationState> {
  if (!notificationSupport()) return "unsupported";
  if (Notification.permission === "granted")
    return await currentNotificationState();
  if (Notification.permission === "denied") return "denied";
  if (requestingPermission) return await requestingPermission;
  const first = firstPermissionGesture();
  if (!first && !explicitSetting) return "off";
  const permission = Notification.requestPermission();
  requestingPermission = (async () => {
    const granted = await permission;
    if (granted !== "granted") return granted === "denied" ? "denied" : "off";
    const registration = await prepareWorker();
    return "showNotification" in registration ? "ready" : "unsupported";
  })().finally(() => {
    requestingPermission = null;
  });
  return await requestingPermission;
}
export async function showSystemReminder(tag: string, canShow: () => boolean = () => true) {
  const registration = await navigator.serviceWorker.getRegistration(scope);
  if (!canShow()) return;
  if (!registration?.active || Notification.permission !== "granted")
    throw new Error("Notification unavailable");
  const options: NotificationOptions & { renotify: boolean } = {
    body: "Tienes una cita próxima.",
    tag: "slotly-" + tag,
    renotify: true,
  };
  await registration.showNotification("Slotly", options);
}
