const radians = Math.PI / 180;

// Normalized Web Mercator coordinates. Google uses a 256 px world at zoom 0.
export function mercator([latitude, longitude]: number[]) {
  const lat = Math.min(85.05112878, Math.max(-85.05112878, latitude));
  return {
    x: (longitude + 180) / 360,
    y: (1 - Math.asinh(Math.tan(lat * radians)) / Math.PI) / 2,
  };
}

export function fromMercator(x: number, y: number) {
  return {
    lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) / radians,
    lng: x * 360 - 180,
  };
}
