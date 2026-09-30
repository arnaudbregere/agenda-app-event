// Lit une durée de transition CSS déclarée en custom property (ex.
// "200ms ease-in-out", --transition-base dans tools/_tokens.scss) et la
// retourne en millisecondes, pour piloter <Transition :duration="...">.
//
// Sans ce prop, <Transition> attend l'événement transitionend natif pour
// retirer le nœud du DOM une fois la sortie terminée. Cet événement peut ne
// jamais se déclencher dans certains cas limites (propriété transitionnée
// qui n'a pas réellement changé de valeur, transition interrompue en plein
// vol...), laissant l'élément — et son overlay plein écran — coincé
// indéfiniment dans le DOM (issue #61). Passer une durée explicite fait
// utiliser un minuteur à Vue à la place, qui complète toujours la
// transition, quoi qu'il arrive côté navigateur.
export const readCssDurationMs = (customProperty: string): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(customProperty).trim();
  const match = raw.match(/^([\d.]+)(ms|s)/);
  if (!match) return 0;
  const [, value, unit] = match;
  return unit === "ms" ? Number(value) : Number(value) * 1000;
};
