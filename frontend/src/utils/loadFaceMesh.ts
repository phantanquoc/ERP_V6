/**
 * Load MediaPipe FaceMesh script và trả về constructor.
 * Dùng dynamic script injection thay vì ES import hoặc <script> tag tĩnh
 * vì WASM Emscripten bundle không tương thích với Vite bundler.
 */

let loadPromise: Promise<any> | null = null;

export function loadFaceMesh(): Promise<any> {
  // Nếu đã load rồi, trả về ngay
  if ((window as any).FaceMesh) {
    return Promise.resolve((window as any).FaceMesh);
  }

  // Đảm bảo chỉ inject script 1 lần dù gọi nhiều lần đồng thời
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mediapipe]');
    if (existing) {
      // Script đang load — poll
      poll(resolve, reject);
      return;
    }

    const script = document.createElement('script');
    script.src = '/mediapipe/face_mesh.js';
    script.dataset.mediapipe = '1';
    script.onload  = () => poll(resolve, reject);
    script.onerror = () => reject(new Error('Không thể tải MediaPipe script từ /mediapipe/face_mesh.js'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

function poll(resolve: (v: any) => void, reject: (e: Error) => void, attempt = 0) {
  const ctor = (window as any).FaceMesh;
  if (ctor) {
    resolve(ctor);
    return;
  }
  if (attempt >= 20) { // 20 × 100ms = 2s
    reject(new Error('window.FaceMesh không khả dụng sau khi script load'));
    return;
  }
  setTimeout(() => poll(resolve, reject, attempt + 1), 100);
}
