/**
 * Defaults shown on the site — edit these values here (no `.env` required).
 * Replace placeholders with your official WhatsApp, license number, and regulator text before production.
 */
export const SITE_WHATSAPP_NUMBER = '201000000000'

/**
 * Official license reference as shown in the footer (replace with your real رقم الترخيص).
 * Format mimics common registry-style references (serial / year).
 */
export const SITE_LICENSE_NUMBER = '1284 / 2024'

/** Supervisory body and any official qualifier, Arabic. */
export const SITE_REGULATOR_AR =
  'البنك المركزي المصري — يُستبدل بنص الجهة الرقابية والترخيص الرسمي عند النشر'

/**
 * When true, the visit gate requires device GPS.
 * Set to `false` only for local dev over HTTP or when testing without geolocation.
 */
export const SITE_REQUIRE_DEVICE_GPS = true
