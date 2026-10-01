import { test, expect } from "@playwright/test";
import { resetEvents } from "./support/resetEvents.js";

async function createEvent(page: import("@playwright/test").Page, title: string) {
  // Sous 900px, le bouton "Créer" est dans la sidebar drawer (fermée par
  // défaut) : on l'ouvre d'abord si le bouton d'ouverture est visible.
  const menuToggle = page.getByRole("button", { name: "Ouvrir le menu" });
  const openedSidebar = await menuToggle.isVisible();
  if (openedSidebar) await menuToggle.click();

  await page.getByRole("button", { name: "Créer" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouvel événement" });
  await dialog.getByLabel("Titre").fill(title);
  await dialog.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(dialog).toBeHidden();

  // Referme le drawer : sinon il reste ouvert par-dessus le header replié
  // (à 320px) et intercepte les clics des tests de recherche qui suivent.
  if (openedSidebar) await page.getByRole("button", { name: "Fermer le menu" }).click();
}

test.describe("recherche desktop", () => {
  test.beforeEach(async ({ page }) => {
    await resetEvents();
    await page.goto("/");
    await createEvent(page, "Entretien annuel");
  });

  test("affiche les résultats correspondants et sélectionne un événement", async ({ page }) => {
    const searchInput = page.getByRole("searchbox", { name: "Rechercher un événement" });
    await searchInput.fill("entretien");

    const results = page.getByRole("listbox", { name: "Résultats de la recherche" });
    await expect(results).toBeVisible();
    await expect(results.getByRole("option", { name: /Entretien annuel/ })).toBeVisible();

    await results.getByRole("option", { name: /Entretien annuel/ }).click();
    await expect(page.getByRole("dialog", { name: "Modifier l'événement" })).toBeVisible();
  });

  test("aucun résultat trouvé", async ({ page }) => {
    const searchInput = page.getByRole("searchbox", { name: "Rechercher un événement" });
    await searchInput.fill("zzz-introuvable");

    const results = page.getByRole("listbox", { name: "Résultats de la recherche" });
    await expect(results).toContainText("Aucun événement trouvé.");
  });
});

test.describe("recherche mobile (320px)", () => {
  test.use({ viewport: { width: 320, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await resetEvents();
    await page.goto("/");
    await createEvent(page, "Rendez-vous médecin");
  });

  test("repli/dépli du champ via le bouton dédié", async ({ page }) => {
    const searchToggle = page.getByRole("button", { name: "Rechercher" });
    const searchInput = page.getByRole("searchbox", { name: "Rechercher un événement" });

    await expect(searchInput).toBeHidden();
    await searchToggle.click();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();

    await searchInput.fill("médecin");
    const results = page.getByRole("listbox", { name: "Résultats de la recherche" });
    await expect(results.getByRole("option", { name: /Rendez-vous médecin/ })).toBeVisible();

    await results.getByRole("option", { name: /Rendez-vous médecin/ }).click();
    await expect(page.getByRole("dialog", { name: "Modifier l'événement" })).toBeVisible();
    // La sélection referme aussi le champ de recherche mobile.
    await page.keyboard.press("Escape");
    await expect(searchInput).toBeHidden();
  });

  test("fermeture via le bouton Fermer la recherche", async ({ page }) => {
    await page.getByRole("button", { name: "Rechercher" }).click();
    const searchInput = page.getByRole("searchbox", { name: "Rechercher un événement" });
    await expect(searchInput).toBeVisible();

    await page.getByRole("button", { name: "Fermer la recherche" }).click();
    await expect(searchInput).toBeHidden();
  });
});
