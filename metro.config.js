const { getDefaultConfig } = require("expo/metro-config");
const { prepareBaseData } = require("./scripts/prepare-base-data.cjs");

prepareBaseData();
const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [
  ...new Set([
    ...config.resolver.assetExts,
    "csv",
    "xlsx",
    "xls",
    "kml",
    "kmz",
  ]),
];
module.exports = config;
