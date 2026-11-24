import { beforeEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import Welcome from "../src/app/welcome";
import { CoachTour } from "../src/components/CoachTour";
import { tourSteps } from "../src/config/tours";
import { useFlow } from "../src/store/useFlow";

jest.mock("expo-router", () => ({
  router: { dismissTo: jest.fn(), navigate: jest.fn() },
  usePathname: () => "/menu",
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("../src/components/Sheet", () => ({ Sheet: () => null }));
jest.mock("../src/components/tourTargets", () => ({
  getTourTarget: () => ({
    view: {
      measureInWindow: (callback: (...bounds: number[]) => void) =>
        callback(20, 100, 100, 100),
    },
  }),
}));
jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
jest.mock(
  "lucide-react-native",
  () =>
    new Proxy(
      {},
      { get: (_t, key) => (key === "__esModule" ? false : () => null) },
    ),
);

beforeEach(() => {
  jest.clearAllMocks();
  useFlow.setState({ welcomeSeen: false, tour: null });
});

it.each(["short", "detailed"] as const)(
  "starts the selected %s tour from the first stop",
  async (mode) => {
    await render(<Welcome />);
    await fireEvent.press(
      screen.getByRole("button", { name: `Start ${mode} tour` }),
    );
    expect(useFlow.getState()).toMatchObject({
      welcomeSeen: true,
      tour: { mode, step: 0 },
    });
    expect(router.dismissTo).toHaveBeenCalledWith("/");
  },
);

it("finishing either tour from the Menu tab returns to Home", async () => {
  useFlow.setState({
    tour: { mode: "short", step: tourSteps.short.length - 1 },
  });
  await render(<CoachTour />);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Finish tour" }),
  );
  expect(useFlow.getState().tour).toBeNull();
  expect(router.navigate).toHaveBeenCalledWith("/");
});
