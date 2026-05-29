// GROQ queries mirroring the web app's data fetching

export const ALL_POLYTECHNICS_QUERY = `
  *[_type == "polytechnic" && isActive == true] | order(name asc) {
    _id,
    name,
    shortName,
    "slug": slug.current,
    description,
    address,
    "image": image { asset->{ url } },
    "logo": logo { asset->{ url } },
    color
  }
`;

export const POLYTECHNIC_QUERY = `
  *[_type == "polytechnic" && slug.current == $slug][0] {
    _id,
    name,
    shortName,
    "slug": slug.current,
    description,
    address,
    "image": image { asset->{ url } },
    "logo": logo { asset->{ url } },
    color,
    "canteens": *[_type == "canteen" && polytechnic._ref == ^._id && isActive == true] | order(name asc) {
      _id,
      name,
      "slug": slug.current,
      description,
      location,
      openingHours,
      "image": image { asset->{ url } }
    }
  }
`;

export const ALL_CANTEENS_QUERY = `
  *[_type == "canteen" && isActive == true] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    location,
    openingHours,
    "image": image { asset->{ url } },
    "storeCount": count(*[_type == "store" && canteen._ref == ^._id && isActive == true]),
    "polytechnic": polytechnic->{
      _id,
      name,
      shortName,
      "slug": slug.current,
      color
    }
  }
`;

export const CANTEEN_QUERY = `
  *[_type == "canteen" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    location,
    openingHours,
    "image": image { asset->{ url } },
    "polytechnic": polytechnic->{
      _id,
      name,
      shortName,
      "slug": slug.current
    },
    "stores": *[_type == "store" && canteen._ref == ^._id && isActive == true] | order(name asc) {
      _id,
      name,
      "slug": slug.current,
      description,
      cuisine,
      stallNumber,
      "image": image { asset->{ url } },
      contactNumber
    }
  }
`;

export const STORE_QUERY = `
  *[_type == "store" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    cuisine,
    stallNumber,
    "image": image { asset->{ url } },
    contactNumber,
    "canteen": canteen->{
      _id,
      name,
      "slug": slug.current,
      "polytechnic": polytechnic->{
        _id,
        name,
        shortName,
        "slug": slug.current
      }
    },
    "products": *[_type == "foodProduct" && store._ref == ^._id && isAvailable == true] | order(name asc) {
      _id,
      name,
      "slug": slug.current,
      description,
      price,
      portionOptions[] { _key, label, priceInCents, isDefault, calories },
      "image": image { asset->{ url } },
      "category": category->{ _id, name, emoji },
      isVegetarian,
      isVegan,
      isHalal,
      isGlutenFree,
      containsNuts,
      spicyLevel,
      calories,
      tags,
      isRecommended,
      preparationTime
    }
  }
`;

export const ALL_STORES_QUERY = `
  *[_type == "store" && isActive == true] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    cuisine,
    stallNumber,
    "image": image { asset->{ url } },
    "canteen": canteen->{
      _id,
      name,
      "slug": slug.current,
      "polytechnic": polytechnic->{
        _id,
        name,
        shortName,
        "slug": slug.current
      }
    }
  }
`;

// Full product list with school + category info for filtering
export const ALL_FOOD_PRODUCTS_QUERY = `
  *[_type == "foodProduct" && isAvailable == true] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    price,
    portionOptions[] { _key, label, priceInCents, isDefault, calories },
    "image": image { asset->{ url } },
    "category": category->{ _id, name, emoji },
    isVegetarian,
    isVegan,
    isHalal,
    isGlutenFree,
    containsNuts,
    spicyLevel,
    calories,
    tags,
    isRecommended,
    "store": store->{
      _id,
      name,
      "slug": slug.current,
      "canteen": canteen->{
        _id,
        name,
        "polytechnic": polytechnic->{ _id, name, shortName, "slug": slug.current }
      }
    }
  }
`;

export const RECOMMENDED_PRODUCTS_QUERY = `
  *[_type == "foodProduct" && isRecommended == true && isAvailable == true] | order(name asc)[0...10] {
    _id,
    name,
    price,
    portionOptions[] { _key, label, priceInCents, isDefault },
    "image": image { asset->{ url } },
    "category": category->{ _id, name, emoji },
    isHalal,
    isVegetarian,
    isVegan,
    spicyLevel,
    tags,
    "store": store->{ _id, name, "slug": slug.current }
  }
`;

export const ACTIVE_PROMOTIONS_QUERY = `
  *[_type == "promotion" && isActive == true && (validUntil == null || validUntil > now())] | order(displayOrder asc) {
    _id,
    title,
    subtitle,
    badge,
    bgColor,
    "image": image { asset->{ url } },
    "storeSlug": store->slug.current
  }
`;

// Fetch add-on groups that apply to a specific product
// Pass: storeId, productId, categoryId (empty string if no category)
export const PRODUCT_ADD_ON_GROUPS_QUERY = `
  *[_type == "addOnGroup"
    && store._ref == $storeId
    && isActive == true
    && (
      applicability == "all_products" ||
      (applicability == "by_category" && $categoryId != "" && $categoryId in applicableCategories[]._ref) ||
      (applicability == "by_product" && $productId in applicableProducts[]._ref)
    )
  ] | order(displayOrder asc) {
    _id,
    name,
    description,
    selectionType,
    isRequired,
    minSelections,
    maxSelections,
    "options": options[] {
      _key,
      name,
      priceInCents,
      isDefault,
      isAvailable,
      allergenNote,
      calories
    }
  }
`;

export const FOOD_PRODUCT_QUERY = `
  *[_type == "foodProduct" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    price,
    portionOptions[] { _key, label, priceInCents, isDefault, calories },
    "image": image { asset->{ url } },
    "category": category->{ _id, name, emoji },
    isVegetarian,
    isVegan,
    isHalal,
    isGlutenFree,
    containsNuts,
    containsDairy,
    containsEgg,
    allergenNotes,
    spicyLevel,
    calories,
    tags,
    isRecommended,
    preparationTime,
    "store": store->{
      _id,
      name,
      "slug": slug.current,
      "canteen": canteen->{
        _id,
        name,
        "slug": slug.current,
        "polytechnic": polytechnic->{
          _id,
          name,
          shortName,
          "slug": slug.current
        }
      }
    }
  }
`;

// ── Types ─────────────────────────────────────────────────────────

export type Polytechnic = {
  _id: string;
  name: string;
  shortName: string;
  slug: string;
  description?: string;
  address?: string;
  image?: { asset?: { url: string } };
  logo?: { asset?: { url: string } };
  color?: string;
};

export type PolytechnicWithCanteens = Polytechnic & {
  canteens: Canteen[];
};

export type Canteen = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  location?: string;
  openingHours?: string;
  storeCount?: number;
  image?: { asset?: { url: string } };
  polytechnic?: { _id: string; name: string; shortName: string; slug: string; color?: string };
};

export type CanteenWithStores = Canteen & {
  stores: Store[];
};

export type Store = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  cuisine?: string;
  stallNumber?: string;
  image?: { asset?: { url: string } };
  contactNumber?: string;
  canteen?: Canteen & { polytechnic?: { _id: string; name: string; shortName: string; slug: string } };
};

export type StoreWithProducts = Store & {
  products: FoodProduct[];
};

export type MealCategory = {
  _id: string;
  name: string;
  emoji?: string;
};

export type PortionOption = {
  _key: string;
  label: string;
  priceInCents: number;
  isDefault?: boolean;
  calories?: number;
};

export type AddOnOption = {
  _key: string;
  name: string;
  priceInCents: number;
  isDefault?: boolean;
  isAvailable?: boolean;
  allergenNote?: string;
  calories?: number;
};

export type AddOnGroup = {
  _id: string;
  name: string;
  description?: string;
  selectionType: "single" | "multiple";
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: AddOnOption[];
};

export type Promotion = {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  bgColor?: string;
  image?: { asset?: { url: string } };
  storeSlug?: string;
};

export type FoodProduct = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price?: number | null;
  portionOptions?: PortionOption[];
  image?: { asset?: { url: string } };
  category?: MealCategory;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  containsNuts?: boolean;
  containsDairy?: boolean;
  containsEgg?: boolean;
  allergenNotes?: string;
  spicyLevel?: number;
  calories?: number;
  tags?: string[];
  isRecommended?: boolean;
  preparationTime?: number;
  store?: Store & { canteen?: Canteen & { polytechnic?: { _id: string; name: string; shortName: string; slug: string } } };
};

export type FoodProductBrowse = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price?: number | null;
  portionOptions?: PortionOption[];
  image?: { asset?: { url: string } };
  category?: MealCategory;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  containsNuts?: boolean;
  spicyLevel?: number;
  calories?: number;
  tags?: string[];
  isRecommended?: boolean;
  store?: {
    _id: string;
    name: string;
    slug: string;
    canteen?: {
      _id: string;
      name: string;
      polytechnic?: { _id: string; name: string; shortName: string; slug: string };
    };
  };
};

// ─── Vendor queries ───────────────────────────────────────────────────────────

/** Fetch the store whose vendorEmail matches the logged-in user's email. */
export const VENDOR_STORE_QUERY = `
  *[_type == "store" && vendorEmail == $email][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    cuisine,
    stallNumber,
    contactNumber,
    vendorEmail,
    "image": image { asset->{ url } },
    "canteen": canteen->{
      _id,
      name,
      location,
      "polytechnic": polytechnic->{ _id, name, shortName }
    }
  }
`;

/** All products for a store (includes unavailable ones so vendor can toggle them). */
export const VENDOR_PRODUCTS_QUERY = `
  *[_type == "foodProduct" && store._ref == $storeId] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    price,
    portionOptions[] { _key, label, priceInCents, isDefault, calories },
    "image": image { asset->{ url } },
    "category": category->{ _id, name, emoji },
    isAvailable,
    isRecommended,
    tags,
    spicyLevel,
    isVegetarian,
    isVegan,
    isHalal,
    preparationTime,
    calories
  }
`;

/** All add-on groups for a store (vendor view — includes inactive). */
export const VENDOR_ADD_ON_GROUPS_QUERY = `
  *[_type == "addOnGroup" && store._ref == $storeId] | order(displayOrder asc, name asc) {
    _id,
    name,
    description,
    isActive,
    selectionType,
    isRequired,
    minSelections,
    maxSelections,
    "options": options[] {
      _key,
      name,
      priceInCents,
      isDefault,
      isAvailable,
      allergenNote
    }
  }
`;

// ─── Vendor types ─────────────────────────────────────────────────────────────

export type VendorStore = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  cuisine?: string;
  stallNumber?: string;
  contactNumber?: string;
  vendorEmail?: string;
  image?: { asset?: { url: string } };
  canteen?: {
    _id: string;
    name: string;
    location?: string;
    polytechnic?: { _id: string; name: string; shortName: string };
  };
};

export type VendorProduct = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price?: number | null;
  portionOptions?: PortionOption[];
  image?: { asset?: { url: string } };
  category?: MealCategory;
  isAvailable: boolean;
  isRecommended?: boolean;
  tags?: string[];
  spicyLevel?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  preparationTime?: number;
  calories?: number;
};

export type VendorAddOnGroup = {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  selectionType: "single" | "multiple";
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: {
    _key: string;
    name: string;
    priceInCents: number;
    isDefault?: boolean;
    isAvailable?: boolean;
    allergenNote?: string;
  }[];
};
