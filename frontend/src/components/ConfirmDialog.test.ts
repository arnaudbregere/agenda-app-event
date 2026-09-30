import { describe, it, expect, afterEach } from "vitest";
import { mount, flushPromises, DOMWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import ConfirmDialog from "./ConfirmDialog.vue";

let wrapper: ReturnType<typeof mount> | undefined;

function mountDialog(props: InstanceType<typeof ConfirmDialog>["$props"]) {
  wrapper = mount(ConfirmDialog, { props, attachTo: document.body });
  return wrapper;
}

// ConfirmDialog se rend via <Teleport to="body"> : son contenu n'est pas un
// descendant du root du wrapper monté, donc on interroge document.body
// directement plutôt que `wrapper.find(...)`.
function body() {
  return new DOMWrapper(document.body);
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("ConfirmDialog", () => {
  it("n'affiche rien quand open est faux", () => {
    mountDialog({ open: false, title: "Titre", message: "Message" });
    expect(body().find('[role="alertdialog"]').exists()).toBe(false);
  });

  it("affiche le titre et le message, avec les libellés par défaut", () => {
    mountDialog({ open: true, title: "Supprimer ?", message: "Cette action est définitive." });

    const dialog = body().find('[role="alertdialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(body().find("#confirm-dialog-title").text()).toBe("Supprimer ?");
    expect(body().find("#confirm-dialog-message").text()).toBe("Cette action est définitive.");
    expect(body().find(".c-btn--text").text()).toBe("Annuler");
    expect(body().find(".c-btn--primary").text()).toBe("Confirmer");
  });

  it("utilise les libellés personnalisés et le style destructif quand danger est vrai", () => {
    mountDialog({
      open: true,
      title: "Supprimer l'événement",
      message: "Irréversible.",
      confirmLabel: "Supprimer",
      danger: true,
    });

    expect(body().find(".c-btn--text").text()).toBe("Annuler");
    const confirmBtn = body().find(".c-btn--danger-solid");
    expect(confirmBtn.exists()).toBe(true);
    expect(confirmBtn.text()).toBe("Supprimer");
    expect(body().find(".c-btn--primary").exists()).toBe(false);
  });

  it("clic sur Annuler émet cancel, pas confirm", async () => {
    mountDialog({ open: true, title: "Titre", message: "Message" });

    await body().find(".c-btn--text").trigger("click");

    expect(wrapper!.emitted("cancel")).toHaveLength(1);
    expect(wrapper!.emitted("confirm")).toBeUndefined();
  });

  it("clic sur le bouton de confirmation émet confirm", async () => {
    mountDialog({ open: true, title: "Titre", message: "Message" });

    await body().find(".c-btn--primary").trigger("click");

    expect(wrapper!.emitted("confirm")).toHaveLength(1);
    expect(wrapper!.emitted("cancel")).toBeUndefined();
  });

  it("Échap émet cancel (événement natif \"cancel\" du <dialog>)", async () => {
    mountDialog({ open: true, title: "Titre", message: "Message" });

    // Un <dialog> ouvert répond nativement à Échap en émettant "cancel",
    // pas un keydown classique : on simule cet événement natif plutôt que
    // le keydown, pour ne pas dépendre d'une gestion manuelle inexistante.
    await body().find('[role="alertdialog"]').trigger("cancel");

    expect(wrapper!.emitted("cancel")).toHaveLength(1);
  });

  it("clic sur le fond (overlay) émet cancel", async () => {
    mountDialog({ open: true, title: "Titre", message: "Message" });

    await body().find(".c-confirm-dialog__overlay").trigger("mousedown");

    expect(wrapper!.emitted("cancel")).toHaveLength(1);
  });

  it("clic à l'intérieur du panneau n'émet pas cancel", async () => {
    mountDialog({ open: true, title: "Titre", message: "Message" });

    await body().find(".c-confirm-dialog__panel").trigger("mousedown");

    expect(wrapper!.emitted("cancel")).toBeUndefined();
  });

  it("place le focus sur Annuler à l'ouverture", async () => {
    mountDialog({ open: false, title: "Titre", message: "Message" });
    await wrapper!.setProps({ open: true });
    await flushPromises();

    expect(document.activeElement?.textContent).toBe("Annuler");
  });

  it("restitue le focus à l'élément déclencheur à la fermeture", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Ouvrir";
    document.body.appendChild(trigger);
    trigger.focus();

    mountDialog({ open: true, title: "Titre", message: "Message" });
    await nextTick();
    await wrapper!.setProps({ open: false });
    await nextTick();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
