// Reusable tools videos: the editable list and the screen's coming-soon and
// watch behavior.
import { expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import Videos from "../src/app/videos";
import { tools, toolVideos } from "../src/config/toolVideos";

jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(async () => ({ type: "opened" })),
}));
jest.mock(
  "lucide-react-native",
  () =>
    new Proxy(
      {},
      { get: (_t, key) => (key === "__esModule" ? false : () => null) },
    ),
);

it("lists videos for known tools, with unique ids and https links", () => {
  const toolIds = new Set(tools.map((t) => t.id));
  expect(new Set(toolVideos.map((v) => v.id)).size).toBe(toolVideos.length);
  for (const v of toolVideos) {
    expect(toolIds.has(v.tool)).toBe(true);
    if (v.url) expect(v.url).toMatch(/^https:\/\//);
  }
  expect(tools.map((t) => t.name)).toEqual([
    "Norman Flow Excel tool",
    "Google Colab notebook",
    "Power BI",
    "Google Sheets",
  ]);
});

it("shows unpublished videos as coming soon and opens published ones", async () => {
  const video = toolVideos[0];
  const original = video.url;
  await render(<Videos />);
  expect(screen.getAllByText("Video coming soon").length).toBe(
    toolVideos.filter((v) => !v.url).length,
  );
  expect(screen.getAllByText("In development")).toHaveLength(2);

  video.url = "https://example.com/excel-rerank";
  try {
    await screen.rerender(<Videos />);
    await fireEvent.press(screen.getByText(video.title));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      "https://example.com/excel-rerank",
    );
  } finally {
    video.url = original;
  }
});
