import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { defineComponent, h } from "vue";
import AppHeader from "./components/AppHeader.vue";
import AppSidebar from "./components/AppSidebar.vue";
import { useCalendarStore } from "./stores/calendar.js";

// AppHeader (bouton menu) et AppSidebar (focus management, Échap) sont deux
// composants distincts qui communiquent via le store : ce test vérifie leur
// câblage réel plutôt que chacun isolément.
const Shell = defineComponent({
  components: { AppHeader, AppSidebar },
  template: `
    <div>
      <AppHeader />
      <div v-if="store.isSidebarOpen" class="o-app-shell__backdrop" @click="store.closeSidebar()"></div>
      <AppSidebar />
    </div>
  `,
  setup() {
    return { store: useCalendarStore() };
  },
});

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("Header + sidebar mobile — câblage", () => {
  it("le bouton menu ouvre la sidebar, le clic sur le fond la referme et rend le focus au bouton", async () => {
    const store = useCalendarStore();
    const wrapper = mount(Shell, { attachTo: document.body });
    const menuToggle = wrapper.find(".c-app-header__menu-toggle");

    await menuToggle.trigger("click");
    expect(store.isSidebarOpen).toBe(true);
    expect(wrapper.find(".o-app-shell__backdrop").exists()).toBe(true);

    await wrapper.find(".o-app-shell__backdrop").trigger("click");
    await wrapper.vm.$nextTick();

    expect(store.isSidebarOpen).toBe(false);
    expect(document.activeElement).toBe(menuToggle.element);
    wrapper.unmount();
  });
});
