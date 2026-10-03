import {BUSINESS_PATH} from './life-events/intent.js';

if (location.pathname.replace(/\/$/, '') === BUSINESS_PATH) {
  await import('./checklist-client.js');
} else {
  await import('./client.js');
}
