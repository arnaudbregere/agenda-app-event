import { test, expect } from "@playwright/test";
import { resetEvents } from "./support/resetEvents.js";

test.beforeEach(async ({ page }) => {
  await resetEvents();
  await page.goto("/");
});

test("vue Mois active par défaut", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Mois", exact: true })).toHaveClass(/is-active/);
  await expect(page.locator(".c-month-grid")).toBeVisible();
});

test("bascule vers la vue Semaine : 7 colonnes de jour", async ({ page }) => {
  await page.getByRole("button", { name: "Semaine", exact: true }).click();
  await expect(page.getByRole("button", { name: "Semaine", exact: true })).toHaveClass(/is-active/);
  await expect(page.locator(".c-time-grid__head-day")).toHaveCount(7);
});

test("bascule vers la vue Jour : 1 seule colonne de jour", async ({ page }) => {
  await page.getByRole("button", { name: "Jour", exact: true }).click();
  await expect(page.getByRole("button", { name: "Jour", exact: true })).toHaveClass(/is-active/);
  await expect(page.locator(".c-time-grid__head-day")).toHaveCount(1);
});

test("bascule vers la vue Liste : état vide puis événement affiché", async ({ page }) => {
  await page.getByRole("button", { name: "Liste", exact: true }).click();
  await expect(page.getByRole("button", { name: "Liste", exact: true })).toHaveClass(/is-active/);
  await expect(page.locator(".c-agenda-list")).toContainText("Aucun événement ce mois-ci.");

  await page.getByRole("button", { name: "Créer" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouvel événement" });
  await dialog.getByLabel("Titre").fill("Revue de code");
  await dialog.getByRole("button", { name: "Créer", exact: true }).click();

  await expect(page.locator(".c-agenda-item", { hasText: "Revue de code" })).toBeVisible();
});
