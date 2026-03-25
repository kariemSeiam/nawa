/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHATSAPP_NUMBER?: string
  /** Set to `false` to allow the gate without device GPS (local dev / non-HTTPS). Default: require GPS. */
  readonly VITE_REQUIRE_DEVICE_GPS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
