import { describe, it, expect, afterEach } from "vitest";
import { readCssDurationMs } from "./useTransitionDuration.js";

const setProp = (value: string) => document.documentElement.style.setProperty("--test-duration", value);

afterEach(() => {
  document.documentElement.style.removeProperty("--test-duration");
});

describe("readCssDurationMs", () => {
  it("convertit une durée en millisecondes (ex. transition-base)", () => {
    setProp("200ms ease-in-out");
    expect(readCssDurationMs("--test-duration")).toBe(200);
  });

  it("convertit une durée en secondes en millisecondes", () => {
    setProp("0.2s ease-in-out");
    expect(readCssDurationMs("--test-duration")).toBe(200);
  });

  it("gère une durée décimale en millisecondes", () => {
    setProp("150.5ms linear");
    expect(readCssDurationMs("--test-duration")).toBe(150.5);
  });

  it("retourne 0 si la propriété n'est pas définie", () => {
    expect(readCssDurationMs("--inexistante")).toBe(0);
  });

  it("retourne 0 si la valeur ne commence pas par un nombre", () => {
    setProp("ease-in-out");
    expect(readCssDurationMs("--test-duration")).toBe(0);
  });
});
