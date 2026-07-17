/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FACE_DEVICE_KEY?: string;
  readonly VITE_FACE_DEVICE_ID?: string;
  readonly VITE_DATA_ENTRY_DEVICE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
