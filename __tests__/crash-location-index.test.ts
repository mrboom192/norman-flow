import { expect, it } from "@jest/globals";
import { createCrashLocationIndex } from "../src/analysis/crashLocationIndex";
import type { CrashPoint } from "../src/analysis/types";

it("splits nearby crashes as the map zooms and keeps coincident records together", () => {
  const points = [
    [35.2201, -97.4401],
    [35.2201, -97.4401],
    [35.2203, -97.4401],
  ];
  const query = createCrashLocationIndex(
    points.map((point) => ({ point }) as CrashPoint),
  );
  const city = {
    latitude: 35.2202,
    longitude: -97.4401,
    latitudeDelta: 0.3,
    longitudeDelta: 0.3,
    width: 390,
    height: 700,
  };
  expect(query(city).map((site) => site.count)).toEqual([3]);
  const street = { ...city, latitudeDelta: 0.0006, longitudeDelta: 0.0006 };
  expect(
    query(street)
      .map((site) => site.count)
      .sort(),
  ).toEqual([1, 2]);
  expect(query({ ...street, longitude: -97.5 })).toEqual([]);
  expect(query(city)[0].count).toBe(3);
});
