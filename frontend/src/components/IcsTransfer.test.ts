import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import IcsTransfer from "./IcsTransfer.vue";
import { eventsApi } from "../api/events.js";
import { useEventsStore } from "../stores/events.js";

beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
});

const chooseFile = async (wrapper: ReturnType<typeof mount>, content: string) => {
  const input = wrapper.find('input[type="file"]');
  // jsdom n'implémente pas File.text() : on fournit le contenu directement.
  const file = Object.assign(new File([content], "agenda.ics", { type: "text/calendar" }), {
    text: () => Promise.resolve(content),
  });
  Object.defineProperty(input.element, "files", { value: [file], configurable: true });
  await input.trigger("change");
  await flushPromises();
};

describe("IcsTransfer — export", () => {
  it("le lien Exporter télécharge /events/export sous le nom agenda.ics", () => {
    const wrapper = mount(IcsTransfer);
    const link = wrapper.find("a");

    expect(link.text()).toBe("Exporter");
    expect(link.attributes("href")).toMatch(/\/events\/export$/);
    expect(link.attributes("download")).toBe("agenda.ics");
  });
});

describe("IcsTransfer — import", () => {
  it("affiche le nombre d'événements importés", async () => {
    vi.spyOn(eventsApi, "importIcs").mockResolvedValue({ imported: 3, skipped: 0 });
    vi.spyOn(eventsApi, "list").mockResolvedValue([]);
    const wrapper = mount(IcsTransfer);

    await chooseFile(wrapper, "BEGIN:VCALENDAR");

    expect(wrapper.find('[role="status"]').text()).toBe("3 événement(s) importé(s).");
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("précise le nombre d'événements déjà présents et ignorés", async () => {
    vi.spyOn(eventsApi, "importIcs").mockResolvedValue({ imported: 1, skipped: 2 });
    vi.spyOn(eventsApi, "list").mockResolvedValue([]);
    const wrapper = mount(IcsTransfer);

    await chooseFile(wrapper, "BEGIN:VCALENDAR");

    expect(wrapper.find('[role="status"]').text()).toBe(
      "1 événement(s) importé(s), 2 déjà présent(s) ignoré(s)."
    );
  });

  it("relit la liste des événements après l'import", async () => {
    vi.spyOn(eventsApi, "importIcs").mockResolvedValue({ imported: 1, skipped: 0 });
    const list = vi.spyOn(eventsApi, "list").mockResolvedValue([]);
    const wrapper = mount(IcsTransfer);

    await chooseFile(wrapper, "BEGIN:VCALENDAR");

    expect(list).toHaveBeenCalledOnce();
    expect(useEventsStore().events).toEqual([]);
  });

  it("affiche les erreurs de validation renvoyées par l'API dans une alerte", async () => {
    vi.spyOn(eventsApi, "importIcs").mockRejectedValue(
      new Error('Événement 2 : Le champ "title" est requis.')
    );
    const wrapper = mount(IcsTransfer);

    await chooseFile(wrapper, "BEGIN:VCALENDAR");

    expect(wrapper.find('[role="alert"]').text()).toBe('Événement 2 : Le champ "title" est requis.');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it("envoie le contenu brut du fichier", async () => {
    const importIcs = vi.spyOn(eventsApi, "importIcs").mockResolvedValue({ imported: 0, skipped: 0 });
    vi.spyOn(eventsApi, "list").mockResolvedValue([]);
    const wrapper = mount(IcsTransfer);

    await chooseFile(wrapper, "BEGIN:VCALENDAR\r\nEND:VCALENDAR");

    expect(importIcs).toHaveBeenCalledWith("BEGIN:VCALENDAR\r\nEND:VCALENDAR");
  });
});
