export interface StoreProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  reviewsCount: number;
  inStock: boolean;
  stockCount: number;
  description: string;
  features: string[];
  image: string;
}

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 'prod-1',
    name: 'AeroSync Pro ANC Headphones',
    category: 'Electronics',
    price: 199.99,
    rating: 4.8,
    reviewsCount: 142,
    inStock: true,
    stockCount: 18,
    description: 'Active noise cancelling studio headphones with 40-hour battery life and spatial audio tuning.',
    features: ['40mm Titanium Drivers', 'Triple-Mic Array', 'Multipoint Bluetooth 5.3', 'Fast Charge 10m = 5h'],
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-2',
    name: 'ChronoKey 75% Mechanical Keyboard',
    category: 'Tech',
    price: 129.99,
    rating: 4.9,
    reviewsCount: 89,
    inStock: true,
    stockCount: 12,
    description: 'Custom hot-swappable tactile switches with acoustic silicone dampening and OLED status screen.',
    features: ['Gateron Oil King Switches', 'Aluminum CNC Casing', 'RGB South-Facing LEDs', 'Wireless 2.4GHz + Type-C'],
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-3',
    name: 'ThermoGlow Smart Ceramic Mug',
    category: 'Home',
    price: 49.99,
    rating: 4.5,
    reviewsCount: 64,
    inStock: true,
    stockCount: 25,
    description: 'Precision temperature controlled heating mug with wireless charging coaster and 14oz capacity.',
    features: ['Precision 120°F–145°F Dial', '3-Hour Battery', 'IPX7 Waterproof', 'Matte Ceramic Coating'],
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-4',
    name: 'ViewCraft 27" 4K HDR Display',
    category: 'Tech',
    price: 349.99,
    rating: 4.7,
    reviewsCount: 110,
    inStock: true,
    stockCount: 8,
    description: 'Ultra-thin bezel IPS panel with 99% DCI-P3 color calibration, 90W USB-C power delivery.',
    features: ['4K UHD 3840x2160', '90W USB-C Single Cable', 'HDR400 Certified', 'Ergonomic Height Pivot'],
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-5',
    name: 'CyberKnit Heavyweight Hoodie',
    category: 'Apparel',
    price: 65.00,
    rating: 4.6,
    reviewsCount: 53,
    inStock: true,
    stockCount: 30,
    description: '450 GSM French terry cotton with subtle high-density developer circuit weave embroidery.',
    features: ['100% Organic Ring-spun Cotton', 'Pre-Shrunk 450 GSM', 'Hidden Zip Kangaroo Pocket'],
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-6',
    name: 'VoltMini MagSafe Power Bank',
    category: 'Accessories',
    price: 39.99,
    rating: 4.4,
    reviewsCount: 97,
    inStock: true,
    stockCount: 40,
    description: '10,000mAh pocket-sized magnetic wireless pack with foldout kickstand and LED fuel gauge.',
    features: ['15W Qi Wireless Fast Charge', '20W PD Type-C In/Out', 'Zinc Alloy Kickstand', 'Pass-Through Charging'],
    image: 'https://images.unsplash.com/photo-1609592426508-cc037b545f44?w=600&auto=format&fit=crop&q=80'
  }
];

export interface CartItem {
  product: StoreProduct;
  quantity: number;
}
