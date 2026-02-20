/// <reference lib="webworker" />

/* global self */
// eslint-disable-next-line no-undef
const sw = /** @type {ServiceWorkerGlobalScope} */ (self);

sw.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const notification = data.notification;

        const title = notification.title || 'Student Activity Tracker';
        const options = {
            body: notification.body,
            icon: notification.icon || '/favicon.ico',
            badge: '/favicon.ico',
            data: notification.data || { url: '/dashboard' },
            vibrate: [100, 50, 100],
        };

        event.waitUntil(sw.registration.showNotification(title, options));
    } catch (err) {
        console.error('Error handling push event:', err);
    }
});

sw.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window open and focus it or open a new one
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (sw.clients.openWindow) {
                return sw.clients.openWindow(urlToOpen);
            }
        })
    );
});
