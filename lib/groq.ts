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
    "products": *[_type == "foodProduct" && store._ref == ^._id && isAvailable == true] | order(category asc, name asc) {
      _id,
      name,
      "slug": slug.current,
      description,
      price,
      "image": image { asset->{ url } },
      category,
      isVegetarian,
      isHalal,
      spicyLevel,
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

export const ALL_FOOD_PRODUCTS_QUERY = `
  *[_type == "foodProduct" && isAvailable == true] | order(category asc, name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    price,
    "image": image { asset->{ url } },
    category,
    isVegetarian,
    isHalal,
    spicyLevel,
    "store": store->{
      _id,
      name,
      "slug": slug.current
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
    "image": image { asset->{ url } },
    category,
    isVegetarian,
    isHalal,
    spicyLevel,
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

// Types

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
  image?: { asset?: { url: string } };
  polytechnic?: { _id: string; name: string; shortName: string; slug: string };
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

export type FoodProduct = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  image?: { asset?: { url: string } };
  category?: "main" | "side" | "beverage" | "dessert" | "snack";
  isVegetarian?: boolean;
  isHalal?: boolean;
  spicyLevel?: number;
  preparationTime?: number;
  store?: Store & { canteen?: Canteen & { polytechnic?: { _id: string; name: string; shortName: string; slug: string } } };
};

export type FoodProductBrowse = Omit<FoodProduct, "store"> & {
  store?: { _id: string; name: string; slug: string };
};
