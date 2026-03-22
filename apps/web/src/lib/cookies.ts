export function setSessionCookies(role: string): void {
  document.cookie = `xps_session=1; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`;
  document.cookie = `xps_role=${encodeURIComponent(role)}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`;
}

export function clearSessionCookies(): void {
  document.cookie = "xps_session=; Path=/; Max-Age=0; SameSite=Lax";
  document.cookie = "xps_role=; Path=/; Max-Age=0; SameSite=Lax";
}
