import apiClient from './apiClient';

/**
 * Convert a URL-safe base64 string to a Uint8Array.
 * Required to pass the VAPID public key to pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class PushNotificationService {
  /**
   * Fetch the VAPID public key from the backend.
   */
  async getVapidPublicKey(): Promise<string> {
    const response = await apiClient.get<{ success: boolean; data: { publicKey: string } }>(
      '/notifications/push/vapid-public-key'
    );
    return response.data?.data?.publicKey ?? response.data?.publicKey ?? '';
  }

  /**
   * Check if the browser supports push and the user is currently subscribed.
   */
  async isSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }
    if (Notification.permission !== 'granted') {
      return false;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch {
      return false;
    }
  }

  /**
   * Request permission, create a push subscription, and save it to the backend.
   * Throws if permission is denied or subscription fails.
   */
  async subscribeToPush(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported in this browser.');
    }

    const publicKey = await this.getVapidPublicKey();
    if (!publicKey) {
      throw new Error('VAPID public key is not configured on the server.');
    }

    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const subscriptionJson = subscription.toJSON();

    await apiClient.post('/notifications/push/subscribe', {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh ?? '',
        auth: subscriptionJson.keys?.auth ?? '',
      },
    });
  }

  /**
   * Unsubscribe from push notifications and remove the subscription from the backend.
   */
  async unsubscribeFromPush(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        return;
      }

      const endpoint = subscription.endpoint;

      // Remove from backend first, then unsubscribe locally
      await apiClient.post('/notifications/push/unsubscribe', { endpoint });

      await subscription.unsubscribe();
    } catch (error) {
      console.error('[PushNotificationService] Error unsubscribing:', error);
      throw error;
    }
  }
}

export default new PushNotificationService();
