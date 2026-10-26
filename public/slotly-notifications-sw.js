// Display only: no push subscription, cache, fetch handler or private data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const dashboard = windows.find(client => new URL(client.url).origin === self.location.origin && new URL(client.url).pathname === "/dashboard");
    if (dashboard) return dashboard.focus();
    return self.clients.openWindow("/dashboard");
  })());
});
