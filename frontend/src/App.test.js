import { render, screen } from "@testing-library/react";
import App from "./App";

// Mock @vladmandic/human (face recognition) — requires @tensorflow/tfjs-node unavailable in test
jest.mock("@vladmandic/human", () => ({
  __esModule: true,
  default: class Human {
    constructor() {}
    load() { return Promise.resolve(); }
    detect() { return Promise.resolve({ face: [] }); }
  },
  Human: class Human {
    constructor() {}
    load() { return Promise.resolve(); }
    detect() { return Promise.resolve({ face: [] }); }
  }
}));

jest.mock("jspdf", () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  }));
});

jest.mock("jspdf-autotable", () => jest.fn());

test("renders student login form", () => {
  render(<App />);
  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
});
