// jsdom n'implémente pas HTMLDialogElement.showModal()/close() (lacune
// connue, cf. https://github.com/jsdom/jsdom/issues/3294) : polyfill minimal
// pour que les composants qui pilotent un <dialog> nativement restent
// testables sans mock par fichier.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
