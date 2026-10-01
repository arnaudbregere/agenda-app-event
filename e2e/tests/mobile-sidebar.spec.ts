import { test, expect } from "@playwright/test";
import { resetEvents } from "./support/resetEvents.js";

test.use({ viewport: { width: 320, height: 720 } });

test.beforeEach(async ({ page }) => {
  await resetEvents();
  await page.goto("/");
});

test("ouverture/fermeture de la sidebar via le bouton", async ({ page }) => {
  const toggle = page.getByRole("button", { name: "Ouvrir le menu" });
  const sidebar = page.locator("#app-sidebar");

  await expect(sidebar).toBeHidden();
  await toggle.click();

  await expect(sidebar).toBeVisible();
  const closeToggle = page.getByRole("button", { name: "Fermer le menu" });
  await expect(closeToggle).toBeVisible();

  await closeToggle.click();
  await expect(sidebar).toBeHidden();
});

test("fermeture via clic sur le fond (backdrop)", async ({ page }) => {
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const sidebar = page.locator("#app-sidebar");
  await expect(sidebar).toBeVisible();

  // Le fond (.o-app-shell__backdrop) couvre toute la largeur, mais la
  // sidebar (z-index supérieur, _z-index.scss) le recouvre sur sa propre
  // largeur (min(--sidebar-width, 85vw)). On mesure cette largeur à
  // l'exécution plutôt que de la recalculer en dur, pour rester correct si
  // --sidebar-width ou le ratio 85vw changent.
  const sidebarBox = await sidebar.boundingBox();
  await page.locator(".o-app-shell__backdrop").click({
    position: { x: (sidebarBox?.width ?? 0) + 10, y: 50 },
  });

  await expect(sidebar).toBeHidden();
});

test("fermeture via Échap, focus restitué au bouton déclencheur", async ({ page }) => {
  const toggle = page.getByRole("button", { name: "Ouvrir le menu" });
  await toggle.click();

  const sidebar = page.locator("#app-sidebar");
  await expect(sidebar).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(sidebar).toBeHidden();
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeFocused();
});
