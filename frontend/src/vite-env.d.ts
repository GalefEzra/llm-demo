/// <reference types="vite/client" />

declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Vite environment variables
declare const VITE_API_URL: string;
declare module '@env' {
  export const VITE_API_URL: string;
}

// Extend ImportMeta
declare interface ImportMeta {
  readonly env: {
    readonly VITE_API_URL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
  }
} 