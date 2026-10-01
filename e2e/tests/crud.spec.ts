import { test, expect } from "@playwright/test";
import { resetEvents } from "./support/resetEvents.js";

test.beforeEach(async ({ page }) => {
  await resetEvents();
  await page.goto("/");
});

test("cycle CRUD complet d'un événement", async ({ page }) => {
  await page.getByRole("button", { name: "Créer" }).click();

  const dialog = page.getByRole("dialog", { name: "Nouvel événement" });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Titre").fill("Réunion équipe");
  await dialog.getByLabel("Lieu").fill("Salle A");
  await dialog.getByRole("button", { name: "Créer", exact: true }).click();

  await expect(dialog).toBeHidden();
  const eventButton = page.getByRole("button", { name: /Réunion équipe/ });
  await expect(eventButton).toBeVisible();

  // Édition : renommer l'événement créé.
  await eventButton.click();
  const editDialog = page.getByRole("dialog", { name: "Modifier l'événement" });
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel("Titre").fill("Réunion équipe (reportée)");
  await editDialog.getByRole("button", { name: "Enregistrer" }).click();

  await expect(editDialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Réunion équipe \(reportée\)/ })).toBeVisible();

  // Suppression, avec confirmation.
  await page.getByRole("button", { name: /Réunion équipe \(reportée\)/ }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Modifier l'événement" });
  await deleteDialog.getByRole("button", { name: "Supprimer" }).click();

  const confirmDialog = page.getByRole("alertdialog", { name: "Supprimer l'événement" });
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: "Supprimer" }).click();

  await expect(deleteDialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Réunion équipe/ })).toHaveCount(0);
});

test("validation : le titre est requis", async ({ page }) => {
  await page.getByRole("button", { name: "Créer" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouvel événement" });

  await dialog.getByRole("button", { name: "Créer", exact: true }).click();

  // Validation native HTML5 (required) : le formulaire ne se soumet pas,
  // la modale reste ouverte.
  await expect(dialog).toBeVisible();
});

test("annuler la suppression garde l'événement", async ({ page }) => {
  await page.getByRole("button", { name: "Créer" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouvel événement" });
  await dialog.getByLabel("Titre").fill("Déjeuner client");
  await dialog.getByRole("button", { name: "Créer", exact: true }).click();

  const eventButton = page.getByRole("button", { name: /Déjeuner client/ });
  await eventButton.click();
  const editDialog = page.getByRole("dialog", { name: "Modifier l'événement" });
  await editDialog.getByRole("button", { name: "Supprimer" }).click();

  const confirmDialog = page.getByRole("alertdialog", { name: "Supprimer l'événement" });
  await confirmDialog.getByRole("button", { name: "Annuler" }).click();

  await expect(confirmDialog).toBeHidden();
  await expect(editDialog).toBeVisible();
  await editDialog.getByRole("button", { name: "Annuler" }).click();
  await expect(eventButton).toBeVisible();
});
