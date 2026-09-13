// Dynamic wrapper around app.json: google-services.json is gitignored and
// fetched per-machine from the Firebase console (docs/RUNNING-CALLS.md §6).
// Without this wrapper, a checkout that doesn't have the file yet can't
// even `expo start` ("Could not parse Expo config") — so drop the
// androidgoogleServicesFile reference when the file is absent. Expo Go and
// plain Metro don't need it; a native build made this way simply ships
// without FCM (no killed-app incoming-call wake) until the file is added
// and `npx expo prebuild --platform android --clean` is re-run.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const googleServicesPath = path.join(__dirname, 'google-services.json');
  if (!fs.existsSync(googleServicesPath) && config.android?.googleServicesFile) {
    console.warn(
      '[app.config] google-services.json not found — configuring without FCM. ' +
        'Incoming-call push will not work in native builds until you download it ' +
        'from the Firebase console (see docs/RUNNING-CALLS.md §6).'
    );
    delete config.android.googleServicesFile;
  }
  return config;
};
