// Keep the deployment URL server-side so a built image can be used with a different domain.
export const siteUrl = () =>
  process.env.SITE_URL ||
  process.env.WEB_ORIGIN ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000';
