import '@wealthfolio/addon-sdk';
import type React from 'react';

declare module '@wealthfolio/addon-sdk' {
  interface Settings {
    language?: string;
  }

  interface RouteConfig {
    id: string;
  }

  interface RouterManager {
    add(route: { id: string; path: string; component: React.ComponentType<unknown> }): void;
  }
}
