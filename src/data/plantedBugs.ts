import { PlantedBugConfig } from '../types/qa';

export const INITIAL_PLANTED_BUGS: PlantedBugConfig[] = [
  {
    id: 'BUG_INVALID_AUTH',
    name: 'Broken Auth: Invalid Password Allowed',
    category: 'AUTH',
    severity: 'CRITICAL',
    description: 'Login form accepts invalid credentials ("wrongpass" or empty password) and sets authenticated state without credential verification.',
    enabled: true,
    expectedAnomaly: 'Authentication bypass occurred: unauthorized credentials allowed session establishment.'
  },
  {
    id: 'BUG_NEGATIVE_QUANTITY',
    name: 'Cart Logic: Negative / Fractional Quantity Accepted',
    category: 'VALIDATION',
    severity: 'HIGH',
    description: 'Product quantity input does not restrict inputs to positive integers. Negative values (e.g., -2) subtract money from the cart subtotal.',
    enabled: true,
    expectedAnomaly: 'Cart total computed using negative quantity (-2 units), yielding invalid subtotal.'
  },
  {
    id: 'BUG_CART_TAX_CALCULATION',
    name: 'Financial Math: Tax Inversion Glitch',
    category: 'CALCULATION',
    severity: 'HIGH',
    description: 'The cart calculates 8% sales tax as a discount deduction rather than an addition to the subtotal, yielding an incorrect final bill.',
    enabled: true,
    expectedAnomaly: 'Final total formula applied tax as (Subtotal - Tax + Shipping) instead of (Subtotal + Tax + Shipping).'
  },
  {
    id: 'BUG_COUPON_OVERDISCOUNT',
    name: 'Promotion Abuse: Coupon Multi-Apply & Over-Discount',
    category: 'CALCULATION',
    severity: 'HIGH',
    description: 'Promo code "SAVE50" erroneously grants 100% off total, and invalid/expired coupons fail open instead of failing closed.',
    enabled: true,
    expectedAnomaly: 'Coupon "SAVE50" applied a $100% discount, zeroing out total balance.'
  },
  {
    id: 'BUG_CHECKOUT_EMPTY_REQUIRED',
    name: 'Form Bypass: Missing Required Shipping Fields',
    category: 'VALIDATION',
    severity: 'MEDIUM',
    description: 'Checkout allows placing an order even when shipping street address and postal code are completely empty or whitespace.',
    enabled: true,
    expectedAnomaly: 'Order was placed successfully with empty shipping address and postal code.'
  },
  {
    id: 'BUG_SEARCH_INJECTION_FAIL',
    name: 'Catalog Search: Malformed Query Inversion',
    category: 'SEARCH',
    severity: 'MEDIUM',
    description: 'Searching for specific keywords (e.g. "keyboard" or special chars `\'"`) inverts results and displays completely unrelated audio gadgets.',
    enabled: true,
    expectedAnomaly: 'Search query for "keyboard" returned items belonging to "Headphones" category with zero match.'
  },
  {
    id: 'BUG_DUPLICATE_ORDER_RACE',
    name: 'Idempotency Failure: Double-Click Creates Duplicate Orders',
    category: 'IDEMPOTENCY',
    severity: 'HIGH',
    description: 'The "Place Order" button lacks debouncing and server idempotency keys. Rapid clicking submits duplicate orders with identical carts.',
    enabled: true,
    expectedAnomaly: 'Two distinct orders (ORD-101 and ORD-102) created simultaneously for a single checkout intent.'
  },
  {
    id: 'BUG_SESSION_PERSISTENCE_LEAK',
    name: 'Session Security: Logout Fails to Invalidate Storage',
    category: 'SESSION',
    severity: 'HIGH',
    description: 'Clicking "Log Out" updates UI badge but fails to purge user auth token and order history in localStorage, leaking session on refresh.',
    enabled: true,
    expectedAnomaly: 'Sensitive order history and cached user token remained accessible in storage after logout.'
  }
];
