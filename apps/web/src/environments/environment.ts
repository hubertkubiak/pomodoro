/** Replaced at build time with `ng build --define`. See .github/workflows/deploy-pages.yml. */
declare const API_URL: string | undefined;

export const environment = {
  /** By default a same-origin path, which the Angular CLI proxy forwards to the API in development. */
  apiUrl: typeof API_URL === 'undefined' ? '/api' : API_URL,
};
