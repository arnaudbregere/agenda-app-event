// Catégories disponibles pour les événements, avec leur couleur associée.
// Centralisé ici pour rester la source de vérité côté serveur (validation)
// et être exposé au frontend via GET /api/categories.
export const CATEGORIES = [
  { id: "personnel", label: "Personnel", color: "#4285f4" },
  { id: "travail", label: "Travail", color: "#0b8043" },
  { id: "important", label: "Important", color: "#d50000" },
  { id: "famille", label: "Famille", color: "#f4511e" },
  { id: "loisirs", label: "Loisirs", color: "#8e24aa" },
  { id: "autre", label: "Autre", color: "#616161" },
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategoryId = Category["id"];

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id);

export function getCategoryColor(id?: string): string {
  return CATEGORIES.find((c) => c.id === id)?.color ?? "#616161";
}
