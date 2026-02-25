/// <reference lib="webworker" />

// self is a built-in ServiceWorker global — no declaration needed
const sw = /** @type {ServiceWorkerGlobalScope} */ (self);

sw.addEventListener('install', (event) => {
    event.waitUntil(sw.skipWaiting());
});

sw.addEventListener('activate', (event) => {
    event.waitUntil(sw.clients.claim());
});

sw.addEventListener('push', (event) => {
    if (!event.data) return;

    event.waitUntil(
        (async () => {
            try {
                const data = (() => {
                    try {
                        return event.data.json();
                    } catch {
                        return { body: event.data.text?.() ?? '' };
                    }
                })();

                const notification = data?.notification && typeof data.notification === 'object' ? data.notification : data;
                const title = typeof notification?.title === 'string' ? notification.title : 'Student Activity Tracker';
                const body = typeof notification?.body === 'string' ? notification.body : '';
                const icon = typeof notification?.icon === 'string' ? notification.icon : '/favicon.ico';
                const badge = typeof notification?.badge === 'string' ? notification.badge : '/favicon.ico';
                const rawData = notification?.data && typeof notification.data === 'object' ? notification.data : {};
                const url = typeof rawData.url === 'string' ? rawData.url : '/dashboard';
                const absoluteUrl = new URL(url, sw.location.origin).href;

                const tag = typeof rawData.nudgeId === 'string' ? `nudge-${rawData.nudgeId}` : undefined;
                const requireInteraction = rawData.priority === 'HIGH' ? true : undefined;

                const options = {
                    body,
                    icon,
                    badge,
                    tag,
                    requireInteraction,
                    data: { ...rawData, url: absoluteUrl },
                    vibrate: [100, 50, 100],
                };

                await sw.registration.showNotification(title, options);
            } catch (err) {
                console.error('Error handling push event:', err);
            }
        })()
    );
});

sw.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || new URL('/dashboard', sw.location.origin).href;
    const targetUrl = new URL(urlToOpen, sw.location.origin).href;

    event.waitUntil(
        (async () => {
            const windowClients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (!client.url) continue;
                try {
                    const clientUrl = new URL(client.url);
                    if (clientUrl.origin !== sw.location.origin) continue;
                    await client.focus();
                    if (client.url !== targetUrl && typeof client.navigate === 'function') {
                        await client.navigate(targetUrl);
                    }
                    return;
                } catch {
                    // ignore malformed client URLs
                }
            }
            if (sw.clients.openWindow) {
                await sw.clients.openWindow(targetUrl);
            }
        })()
    );
});
