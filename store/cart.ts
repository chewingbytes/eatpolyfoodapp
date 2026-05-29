import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItemAddOn {
  name: string;
  priceInCents: number;
}

export interface CartItem {
  id: string;          // Sanity _id of foodProduct
  name: string;
  priceInCents: number; // SGD cents per item, including add-ons (e.g. 450 = $4.50)
  basePriceInCents?: number; // base price before add-ons
  addOns?: CartItemAddOn[];  // selected add-ons for display breakdown
  qty: number;
  storeId: string;     // Sanity _id of store
  storeName: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalCents: () => number;
  totalQty: () => number;
}

const CART_KEY = "fap-cart";

async function persistCart(items: CartItem[]) {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    const current = get().items;
    const existingStore = current[0]?.storeId;

    // Different store — clear cart first
    let base = existingStore && existingStore !== item.storeId ? [] : current;

    const idx = base.findIndex((i) => i.id === item.id);
    let next: CartItem[];
    if (idx >= 0) {
      next = base.map((i, n) => (n === idx ? { ...i, qty: i.qty + item.qty } : i));
    } else {
      next = [...base, item];
    }
    set({ items: next });
    persistCart(next);
  },

  removeItem: (productId) => {
    const next = get().items.filter((i) => i.id !== productId);
    set({ items: next });
    persistCart(next);
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    const next = get().items.map((i) => (i.id === productId ? { ...i, qty } : i));
    set({ items: next });
    persistCart(next);
  },

  clearCart: () => {
    set({ items: [] });
    AsyncStorage.removeItem(CART_KEY);
  },

  totalCents: () => get().items.reduce((sum, i) => sum + i.priceInCents * i.qty, 0),

  totalQty: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));

// Hydrate cart from AsyncStorage on app start
export async function hydrateCart() {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    if (raw) {
      const items: CartItem[] = JSON.parse(raw);
      useCartStore.setState({ items });
    }
  } catch {
    // ignore parse errors
  }
}
