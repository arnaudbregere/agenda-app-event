import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resetEvents } from "./support/resetEvents.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

test.beforeEach(async ({ page }) => {
  await resetEvents();
  await page.goto("/");
});

test("export : le lien Exporter télécharge un agenda.ics avec les événements", async ({ page, request }) => {
  await request.post("/api/events", {
    data: { title: "Export e2e", start: "2030-01-10T10:00:00.000Z", end: "2030-01-10T11:00:00.000Z" },
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exporter" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("agenda.ics");
  const content = await readFile(await download.path(), "utf-8");
  expect(content).toContain("BEGIN:VCALENDAR");
  expect(content).toContain("SUMMARY:Export e2e");
});

test("import : le bouton Importer crée les événements du fichier", async ({ page, request }) => {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importer" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(join(FIXTURES, "agenda-test.ics"));

  await expect(page.getByRole("status")).toHaveText("2 événement(s) importé(s).");
  const events = await (await request.get("/api/events")).json();
  expect(events.map((e: { title: string }) => e.title).sort()).toEqual(["Import e2e A", "Import e2e B"]);
});

test("import : un fichier invalide affiche l'erreur et n'importe rien", async ({ page, request }) => {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importer" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(join(FIXTURES, "agenda-invalid.ics"));

  await expect(page.getByRole("alert")).toHaveText('Événement 2 : Le champ "title" est requis.');
  const events = await (await request.get("/api/events")).json();
  expect(events).toEqual([]);
});
