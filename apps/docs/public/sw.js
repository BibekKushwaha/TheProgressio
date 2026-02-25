/// <reference lib="webworker" />

// self is a built-in ServiceWorker global — no declaration needed
const sw = /** @type {ServiceWorkerGlobalScope} */ (self);
const PUSH_DEBUG_PREFIX = '[PushDebug][SW]';

sw.addEventListener('install', (event) => {
    console.info(`${PUSH_DEBUG_PREFIX} install event`);
    event.waitUntil(sw.skipWaiting());
});

sw.addEventListener('activate', (event) => {
    console.info(`${PUSH_DEBUG_PREFIX} activate event`);
    event.waitUntil(sw.clients.claim());
});

sw.addEventListener('push', (event) => {
    console.info(`${PUSH_DEBUG_PREFIX} push event received`, {
        hasData: Boolean(event.data),
    });
    if (!event.data) {
        console.warn(`${PUSH_DEBUG_PREFIX} push event had no data payload`);
        return;
    }

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

                console.info(`${PUSH_DEBUG_PREFIX} push payload parsed`, {
                    topLevelKeys: data && typeof data === 'object' ? Object.keys(data) : [],
                });

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
                console.info(`${PUSH_DEBUG_PREFIX} showNotification success`, {
                    title,
                    tag: options.tag,
                    url: absoluteUrl,
                });
            } catch (err) {
                console.error('Error handling push event:', err);
            }
        })()
    );
});

sw.addEventListener('notificationclick', (event) => {
    console.info(`${PUSH_DEBUG_PREFIX} notification click`, {
        url: event.notification?.data?.url,
    });
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
