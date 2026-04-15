/* ERP Web Push Service Worker */

self.addEventListener('push', function (event) {
  let title = 'Thông báo ERP';
  let options = {
    body: '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || '';
      options.data = { url: data.url || '/' };
    } catch {
      // Payload is not JSON — use it as plain text body
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const appUrl = self.location.origin + targetUrl;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(appUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(appUrl);
        }
      })
  );
});
