// Optional Google Maps credentials for native builds; never edit generated projects.
module.exports = ({ config }) => {
  const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY;
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  return {
    ...config,
    extra: {
      ...config.extra,
      googleMapsIosEnabled: Boolean(iosGoogleMapsApiKey),
    },
    plugins: [
      ...(config.plugins ?? []),
      ...(iosGoogleMapsApiKey || androidGoogleMapsApiKey
        ? [
            [
              "react-native-maps",
              { iosGoogleMapsApiKey, androidGoogleMapsApiKey },
            ],
          ]
        : []),
    ],
  };
};
