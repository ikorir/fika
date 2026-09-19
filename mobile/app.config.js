// app.json, plus the one value that cannot live in it: the Google Maps key the Android map needs.
// It is read from the environment at build time so no key is ever committed. iOS draws Apple Maps and needs none.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY ?? '' } },
  },
});
