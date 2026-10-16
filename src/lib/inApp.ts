// Links opened inside LinkedIn, Instagram, Facebook, WhatsApp and similar apps load in the app's own browser,
// where Google sign-in often fails ("Invalid state"). We spot those and suggest opening the page in Chrome or Safari.
export function inAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|WhatsApp|Snapchat|Line\/|Twitter|MicroMessenger/i.test(navigator.userAgent);
}
