import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { SessionsApi } from './sessions.api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // HttpClient uses the fetch backend by default since Angular 21.
    provideHttpClient(),
    // Retry sessions that could not be saved earlier, without delaying the app start.
    provideAppInitializer(() => void inject(SessionsApi).flush()),
  ],
};
