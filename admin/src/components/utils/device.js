/**
 * Best-effort mobile/handset detection. There's no 100% reliable way to do
 * this from the browser, but the combination of the modern
 * `navigator.userAgentData.mobile` flag (Chromium) with a classic
 * user-agent regex fallback (Safari/Firefox/older browsers) covers the
 * overwhelming majority of real devices, which is what SRS §13.3's
 * "camera on handset, message on desktop" behavior needs.
 */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  if (navigator.userAgentData?.mobile !== undefined) {
    return navigator.userAgentData.mobile;
  }
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent || "");
}

export function hasCameraSupport() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}
