// Mock data for AM Foods Restaurant

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "breakfast" | "lunch" | "dinner" | "desserts" | "beverages";
  image: string;
  isVeg: boolean;
  isSpicy: boolean;
  featured?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  items: { menuItem: MenuItem; quantity: number }[];
  total: number;
  status: "pending" | "preparing" | "out-for-delivery" | "delivered" | "cancelled";
  paymentMethod: "cod" | "easypaisa" | "jazzcash" | "bank";
  deliveryAddress: string;
  createdAt: string;
  riderId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: "user" | "rider" | "admin";
}

export interface Rider {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "online" | "offline" | "on-delivery";
  currentOrders: string[];
  completedOrders: number;
  earnings: number;
}

export interface Deal {
  id: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  image: string;
  validUntil: string;
  isActive: boolean;
}

export const mockMenuItems: MenuItem[] = [
  // Breakfast
  {
    id: "1",
    name: "Halwa Puri",
    description: "Traditional Pakistani breakfast with halwa, puri, chana and achar",
    price: 250,
    category: "breakfast",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500",
    isVeg: true,
    isSpicy: false,
    featured: true,
  },
  {
    id: "2",
    name: "Aloo Paratha",
    description: "Stuffed flatbread with spiced potato filling, served with yogurt",
    price: 180,
    category: "breakfast",
    image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500",
    isVeg: true,
    isSpicy: true,
  },
  {
    id: "3",
    name: "Nihari",
    description: "Slow-cooked meat stew with aromatic spices, served with naan",
    price: 450,
    category: "breakfast",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500",
    isVeg: false,
    isSpicy: true,
    featured: true,
  },
  // Lunch
  {
    id: "4",
    name: "Chicken Biryani",
    description: "Aromatic basmati rice with tender chicken and traditional spices",
    price: 380,
    category: "lunch",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500",
    isVeg: false,
    isSpicy: true,
    featured: true,
  },
  {
    id: "5",
    name: "Karahi Chicken",
    description: "Spicy chicken cooked in traditional karahi with tomatoes and peppers",
    price: 550,
    category: "lunch",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500",
    isVeg: false,
    isSpicy: true,
  },
  {
    id: "6",
    name: "Palak Paneer",
    description: "Cottage cheese cubes in creamy spinach gravy",
    price: 320,
    category: "lunch",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500",
    isVeg: true,
    isSpicy: false,
  },
  // Dinner
  {
    id: "7",
    name: "Mutton Karahi",
    description: "Tender mutton pieces cooked with tomatoes, ginger and green chilies",
    price: 750,
    category: "dinner",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500",
    isVeg: false,
    isSpicy: true,
    featured: true,
  },
  {
    id: "8",
    name: "Seekh Kebab",
    description: "Grilled spiced meat skewers with mint chutney",
    price: 420,
    category: "dinner",
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500",
    isVeg: false,
    isSpicy: true,
  },
  {
    id: "9",
    name: "Dal Makhani",
    description: "Creamy black lentils slow-cooked with butter and cream",
    price: 280,
    category: "dinner",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500",
    isVeg: true,
    isSpicy: false,
  },
  // Desserts
  {
    id: "10",
    name: "Gulab Jamun",
    description: "Sweet milk balls soaked in rose-flavored syrup",
    price: 150,
    category: "desserts",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500",
    isVeg: true,
    isSpicy: false,
  },
  {
    id: "11",
    name: "Kheer",
    description: "Traditional rice pudding with cardamom and nuts",
    price: 180,
    category: "desserts",
    image: "https://images.unsplash.com/photo-1575467678930-c7fcd65f6ad3?w=500",
    isVeg: true,
    isSpicy: false,
  },
  // Beverages
  {
    id: "12",
    name: "Mango Lassi",
    description: "Refreshing yogurt-based mango smoothie",
    price: 120,
    category: "beverages",
    image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500",
    isVeg: true,
    isSpicy: false,
  },
  {
    id: "13",
    name: "Masala Chai",
    description: "Traditional spiced tea with aromatic herbs",
    price: 80,
    category: "beverages",
    image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500",
    isVeg: true,
    isSpicy: false,
  },
];

export const mockOrders: Order[] = [
  {
    id: "ORD-001",
    userId: "user1",
    items: [
      { menuItem: mockMenuItems[3], quantity: 2 },
      { menuItem: mockMenuItems[11], quantity: 1 },
    ],
    total: 880,
    status: "out-for-delivery",
    paymentMethod: "cod",
    deliveryAddress: "123 Main Street, Lahore",
    createdAt: new Date().toISOString(),
    riderId: "rider1",
  },
  {
    id: "ORD-002",
    userId: "user2",
    items: [
      { menuItem: mockMenuItems[0], quantity: 3 },
    ],
    total: 750,
    status: "preparing",
    paymentMethod: "easypaisa",
    deliveryAddress: "456 Park Avenue, Karachi",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const mockUsers: User[] = [
  {
    id: "user1",
    name: "Ahmed Khan",
    email: "ahmed@example.com",
    phone: "+92 300 1234567",
    address: "123 Main Street, Lahore",
    role: "user",
  },
  {
    id: "user2",
    name: "Fatima Ali",
    email: "fatima@example.com",
    phone: "+92 321 7654321",
    address: "456 Park Avenue, Karachi",
    role: "user",
  },
  {
    id: "admin1",
    name: "Admin User",
    email: "admin@amfoods.com",
    phone: "+92 300 0000000",
    address: "AM Foods HQ, Lahore",
    role: "admin",
  },
  {
    id: "rider1",
    name: "Ali Hassan",
    email: "ali@example.com",
    phone: "+92 310 9876543",
    address: "Lahore",
    role: "rider",
  },
];

export const mockRiders: Rider[] = [
  {
    id: "rider1",
    name: "Hassan Raza",
    email: "hassan@amfoods.com",
    phone: "+92 310 9876543",
    status: "on-delivery",
    currentOrders: ["ORD-001"],
    completedOrders: 145,
    earnings: 52000,
  },
  {
    id: "rider2",
    name: "Usman Malik",
    email: "usman@amfoods.com",
    phone: "+92 315 5554444",
    status: "online",
    currentOrders: [],
    completedOrders: 98,
    earnings: 38000,
  },
];

export const serviceAreas = [
  "Lahore - Gulberg",
  "Lahore - DHA",
  "Lahore - Johar Town",
  "Karachi - Clifton",
  "Karachi - DHA",
  "Islamabad - F-7",
  "Islamabad - G-10",
];

export const mockDeals: Deal[] = [
  {
    id: "deal-1",
    name: "Family Feast",
    description: "2 Biryanis + 1 Karahi + 2 Drinks + 1 Dessert",
    price: 1500,
    discount: 20,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500",
    validUntil: "2025-11-30",
    isActive: true,
  },
  {
    id: "deal-2",
    name: "Breakfast Special",
    description: "Halwa Puri + Chai for 2 persons",
    price: 400,
    discount: 15,
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500",
    validUntil: "2025-11-15",
    isActive: true,
  },
];
