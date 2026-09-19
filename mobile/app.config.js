// app.json, plus the one value that cannot live in it: the Google Maps key the Android map needs.
// It is read from the environment at build time so no key is ever committed. iOS draws Apple Maps and needs none.
// .env is not uploaded by EAS, so an EAS Android build needs the same name as an EAS environment variable —
// otherwise the build succeeds with no key and the map draws a blank grid.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY ?? '' } },
  },
});
