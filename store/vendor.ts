import { create } from "zustand";
import type { VendorStore, VendorProduct, VendorAddOnGroup } from "../lib/groq";

interface VendorState {
  isVendor: boolean;
  store: VendorStore | null;
  products: VendorProduct[];
  addOnGroups: VendorAddOnGroup[];
  setIsVendor: (v: boolean) => void;
  setStore: (store: VendorStore | null) => void;
  setProducts: (products: VendorProduct[]) => void;
  setAddOnGroups: (groups: VendorAddOnGroup[]) => void;
  /** Optimistically toggle a product's isAvailable flag in local state. */
  toggleProductAvailable: (productId: string) => void;
  /** Optimistically toggle an add-on group's isActive flag in local state. */
  toggleAddOnGroupActive: (groupId: string) => void;
  clearVendor: () => void;
}

export const useVendorStore = create<VendorState>((set) => ({
  isVendor: false,
  store: null,
  products: [],
  addOnGroups: [],

  setIsVendor: (v) => set({ isVendor: v }),
  setStore: (store) => set({ store }),
  setProducts: (products) => set({ products }),
  setAddOnGroups: (groups) => set({ addOnGroups: groups }),

  toggleProductAvailable: (productId) =>
    set((state) => ({
      products: state.products.map((p) =>
        p._id === productId ? { ...p, isAvailable: !p.isAvailable } : p
      ),
    })),

  toggleAddOnGroupActive: (groupId) =>
    set((state) => ({
      addOnGroups: state.addOnGroups.map((g) =>
        g._id === groupId ? { ...g, isActive: !g.isActive } : g
      ),
    })),

  clearVendor: () =>
    set({ isVendor: false, store: null, products: [], addOnGroups: [] }),
}));
