// Barrel export: re-exports all API functions from feature modules
// This maintains backward compatibility — import from 'api' still works.

export { api, apiWithoutContentType, headers, isCancel } from './client';
export * from './auth';
export * from './users';
export * from './tasks';
export * from './balagruha';
export * from './attendance';
export * from './sports';
export * from './music';
export * from './training';
export * from './repairs';
export * from './purchases';
export * from './schedule';
export * from './medical';
export * from './wtf';
export * from './notifications';
export * from './shop';
export * from './purchaseRequests';
export * from './machines';
