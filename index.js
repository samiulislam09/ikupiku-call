// Custom entry: killed-state FCM handling must be registered BEFORE
// expo-router mounts any UI — a data-only push can invoke this file
// headlessly. require() (not import) so Babel can't hoist the entry
// module above the registration call.
const { registerKilledStateHandlers } = require('./src/services/incoming-push-service');

registerKilledStateHandlers();

require('expo-router/entry');
