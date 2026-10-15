import React, { useState } from 'react';
import { 
  ShoppingBag, Search, Star, Trash2, ArrowRight, CheckCircle2, 
  AlertTriangle, ShieldCheck, User, Lock, RotateCcw, 
  Sparkles, ExternalLink, RefreshCw
} from 'lucide-react';
import { STORE_PRODUCTS, StoreProduct } from '../../data/mockStore';
import { PlantedBugConfig } from '../../types/qa';

export interface CartItemState {
  product: StoreProduct;
  quantity: number;
}

export interface StoreOrder {
  id: string;
  items: CartItemState[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  customerName: string;
  shippingAddress: string;
  createdAt: string;
}

interface StoreViewProps {
  bugConfigs: PlantedBugConfig[];
  onTriggerEvent?: (event: { type: string; details: any }) => void;
  externalActiveHighlightSelector?: string | null;
}

export const StoreView: React.FC<StoreViewProps> = ({
  bugConfigs,
  onTriggerEvent,
  externalActiveHighlightSelector
}) => {
  // Navigation / Page state
  const [currentPage, setCurrentPage] = useState<'home' | 'details' | 'cart' | 'checkout' | 'confirmation'>('home');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct>(STORE_PRODUCTS[0]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Product Details Page state
  const [productQuantityInput, setProductQuantityInput] = useState<number | string>(1);
  
  // Auth state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

  // Cart state
  const [cartItems, setCartItems] = useState<CartItemState[]>([
    { product: STORE_PRODUCTS[0], quantity: 1 }
  ]);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  // Checkout Form state
  const [shippingName, setShippingName] = useState('Alice Tester');
  const [shippingEmail, setShippingEmail] = useState('alice@tester.com');
  const [shippingAddress, setShippingAddress] = useState('742 Evergreen Terrace');
  const [shippingCity, setShippingCity] = useState('Springfield');
  const [shippingZip, setShippingZip] = useState('97477');
  const [checkoutErrors, setCheckoutErrors] = useState<{ [key: string]: string }>({});

  // Orders
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<StoreOrder | null>(null);

  // Helper: check if a planted bug is currently enabled
  const isBugActive = (bugId: string) => {
    const config = bugConfigs.find(b => b.id === bugId);
    return config ? config.enabled : false;
  };

  // ---------------------------------------------
  // BUGGY OR ACCURATE CALCULATIONS
  // ---------------------------------------------
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Tax calculation: If BUG_CART_TAX_CALCULATION is enabled, tax is inverted (-8%) or discounted
  const taxRate = 0.08;
  const standardTax = subtotal > 0 ? parseFloat((subtotal * taxRate).toFixed(2)) : 0;
  const tax = isBugActive('BUG_CART_TAX_CALCULATION') ? -standardTax : standardTax;

  const shipping = subtotal > 0 ? 15.00 : 0;

  // Coupon calculation: If BUG_COUPON_OVERDISCOUNT is enabled, "SAVE50" grants 100% off total
  let discount = 0;
  if (appliedCoupon === 'SAVE50') {
    if (isBugActive('BUG_COUPON_OVERDISCOUNT')) {
      discount = subtotal; // Bug: 100% off subtotal!
    } else {
      discount = parseFloat((subtotal * 0.5).toFixed(2));
    }
  } else if (appliedCoupon === 'SAVE10') {
    discount = 10.00;
  }

  // Final Total
  const rawTotal = subtotal + tax + shipping - discount;
  const total = parseFloat(Math.max(0, rawTotal).toFixed(2));

  // ---------------------------------------------
  // AUTH LOGIC
  // ---------------------------------------------
  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const isInvalid = !loginEmailInput || loginPasswordInput === 'wrong_secret_123' || loginPasswordInput.length < 4;

    if (isInvalid) {
      if (isBugActive('BUG_INVALID_AUTH')) {
        // BUG: Accept invalid password anyway!
        setIsLoggedIn(true);
        setCurrentUserEmail(loginEmailInput || 'hacked_admin@shop.com');
        setIsLoginModalOpen(false);
        setLoginErrorMessage('');
        localStorage.setItem('apexmart_auth_token', 'TOKEN_GLITCH_VALID_SESSION');
        onTriggerEvent?.({ type: 'auth_anomaly', details: { reason: 'Invalid password logged in successfully' } });
      } else {
        // Correct behavior: Reject!
        setLoginErrorMessage('Invalid email or password. Please try again.');
      }
    } else {
      setIsLoggedIn(true);
      setCurrentUserEmail(loginEmailInput);
      setIsLoginModalOpen(false);
      setLoginErrorMessage('');
      localStorage.setItem('apexmart_auth_token', 'TOKEN_AUTHENTICATED_USER');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserEmail(null);
    if (!isBugActive('BUG_SESSION_PERSISTENCE_LEAK')) {
      localStorage.removeItem('apexmart_auth_token');
    } else {
      // BUG: Leaves token in storage!
      onTriggerEvent?.({ type: 'session_leak', details: { token: localStorage.getItem('apexmart_auth_token') } });
    }
  };

  // ---------------------------------------------
  // CART ACTIONS
  // ---------------------------------------------
  const handleAddToCart = (product: StoreProduct, qty: number | string) => {
    let parsedQty = typeof qty === 'string' ? parseInt(qty, 10) : qty;
    if (isNaN(parsedQty)) parsedQty = 1;

    // Check negative quantity bug
    if (!isBugActive('BUG_NEGATIVE_QUANTITY')) {
      // Correct behavior: enforce min 1
      if (parsedQty <= 0) parsedQty = 1;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + parsedQty }
            : item
        );
      }
      return [...prev, { product, quantity: parsedQty }];
    });

    onTriggerEvent?.({
      type: 'cart_add',
      details: { productId: product.id, quantity: parsedQty, isNegative: parsedQty < 0 }
    });
  };

  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError('');
    const code = couponInput.trim().toUpperCase();

    if (code === 'SAVE50' || code === 'SAVE10') {
      setAppliedCoupon(code);
      setCouponInput('');
    } else {
      setCouponError('Invalid coupon code. Try "SAVE50"');
    }
  };

  // ---------------------------------------------
  // CHECKOUT ACTIONS
  // ---------------------------------------------
  const handlePlaceOrder = (isSimulatedDoubleClick = false) => {
    const errors: { [key: string]: string } = {};

    if (!shippingName.trim()) errors.name = 'Full name is required';

    // BUG CHECKOUT_EMPTY_REQUIRED:
    if (!isBugActive('BUG_CHECKOUT_EMPTY_REQUIRED')) {
      if (!shippingAddress.trim()) errors.address = 'Street address is required';
      if (!shippingZip.trim()) errors.zip = 'Postal code is required';
    }

    if (Object.keys(errors).length > 0) {
      setCheckoutErrors(errors);
      return;
    }

    setCheckoutErrors({});

    const createOrderRecord = (customPrefix = 'ORD') => {
      const orderNum = `${customPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        id: orderNum,
        items: [...cartItems],
        subtotal,
        tax,
        shipping,
        discount,
        total,
        customerName: shippingName,
        shippingAddress: shippingAddress || '(Empty Address - Glitch Allowed)',
        createdAt: new Date().toLocaleTimeString()
      };
    };

    const newOrder = createOrderRecord();

    // BUG DUPLICATE_ORDER_RACE:
    if (isBugActive('BUG_DUPLICATE_ORDER_RACE') && isSimulatedDoubleClick) {
      // Generates two orders because no debouncing or idempotency!
      const duplicateOrder = createOrderRecord('ORD-DUP');
      setOrders(prev => [duplicateOrder, newOrder, ...prev]);
      setLastPlacedOrder(newOrder);
      setCurrentPage('confirmation');
      onTriggerEvent?.({ type: 'duplicate_order', details: { order1: newOrder.id, order2: duplicateOrder.id } });
      return;
    }

    setOrders(prev => [newOrder, ...prev]);
    setLastPlacedOrder(newOrder);
    setCartItems([]);
    setAppliedCoupon(null);
    setCurrentPage('confirmation');
  };

  // ---------------------------------------------
  // SEARCH FILTERING
  // ---------------------------------------------
  const filteredProducts = STORE_PRODUCTS.filter(product => {
    // If BUG_SEARCH_INJECTION_FAIL is active and query is "keyboard", invert and return only headphones!
    if (isBugActive('BUG_SEARCH_INJECTION_FAIL') && searchQuery.toLowerCase().includes('keyboard')) {
      return product.category === 'Electronics';
    }

    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Helper for styling active simulated selector
  const isTargeted = (selector: string) => {
    if (!externalActiveHighlightSelector) return false;
    return selector === externalActiveHighlightSelector || externalActiveHighlightSelector.includes(selector.replace('#', ''));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Target App Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            id="btn-nav-home"
            onClick={() => setCurrentPage('home')}
            className={`flex items-center gap-2 text-indigo-400 font-bold text-lg hover:text-indigo-300 transition-colors ${
              isTargeted('#btn-nav-home') ? 'ring-2 ring-amber-400 p-1 rounded bg-amber-400/10' : ''
            }`}
          >
            <ShoppingBag className="w-6 h-6 text-indigo-500" />
            <span>ApexMart</span>
          </button>
          <span className="hidden sm:inline-block text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
            Target Environment v1.0.4
          </span>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xs mx-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="input-global-search"
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all ${
                isTargeted('#input-global-search') ? 'ring-2 ring-amber-400 bg-amber-400/10' : ''
              }`}
            />
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Auth Button */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span id="auth-status-badge" className="text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {currentUserEmail?.split('@')[0] || 'User'}
              </span>
              <button
                id="btn-logout"
                onClick={handleLogout}
                className={`text-xs text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 ${
                  isTargeted('#btn-logout') ? 'ring-2 ring-amber-400 rounded' : ''
                }`}
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              id="btn-login-modal"
              onClick={() => setIsLoginModalOpen(true)}
              className={`flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors ${
                isTargeted('#btn-login-modal') ? 'ring-2 ring-amber-400 bg-amber-400/10' : ''
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sign In</span>
              <span id="auth-status-badge" className="text-[10px] text-slate-400 ml-1">(Guest)</span>
            </button>
          )}

          {/* Cart Trigger */}
          <button
            id="btn-open-cart"
            onClick={() => setCurrentPage('cart')}
            className={`relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 ${
              isTargeted('#btn-open-cart') ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : ''
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cart</span>
            <span id="cart-badge" className="bg-white text-indigo-700 font-mono font-bold text-[10px] px-1.5 py-0.2 rounded-full">
              {totalCartCount}
            </span>
          </button>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* =========================================
            VIEW 1: HOME & PRODUCTS CATALOG
        ========================================= */}
        {currentPage === 'home' && (
          <div className="space-y-6">
            {/* Promo Banner */}
            <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/50 mb-2">
                  Summer Tech Sale
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">Upgrade Your Developer Rig</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  Premium gear tuned for high performance. Use code <span className="font-mono font-bold text-amber-300">SAVE50</span> at checkout for special discount.
                </p>
              </div>
              <button 
                onClick={() => setSelectedCategory('Tech')}
                className="text-xs font-medium bg-white text-slate-900 hover:bg-slate-200 px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Shop Tech</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {['All', 'Electronics', 'Tech', 'Home', 'Apparel', 'Accessories'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div id="product-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  id={`prod-card-${product.id}`}
                  className={`group bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-black/50 ${
                    isTargeted(`#prod-card-${product.id}`) ? 'ring-2 ring-amber-400 bg-indigo-950/30' : ''
                  }`}
                >
                  <div>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 mb-3 border border-slate-800/60">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100" 
                      />
                      <span className="absolute top-2 right-2 text-[10px] font-mono bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                        {product.category}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                      <div className="flex items-center text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[11px] font-medium ml-1 text-slate-300">{product.rating}</span>
                      </div>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-400">{product.reviewsCount} reviews</span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Price</span>
                      <span className="font-mono font-bold text-base text-slate-100">${product.price.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setCurrentPage('details');
                        }}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                      >
                        Details
                      </button>
                      <button
                        id={`btn-quick-add-${product.id}`}
                        onClick={() => handleAddToCart(product, 1)}
                        className={`text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                          isTargeted(`#btn-quick-add-${product.id}`) ? 'ring-2 ring-amber-400' : ''
                        }`}
                      >
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================
            VIEW 2: PRODUCT DETAILS
        ========================================= */}
        {currentPage === 'details' && selectedProduct && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentPage('home')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <span>← Back to Catalog</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800 px-2 py-0.5 rounded">
                    {selectedProduct.category}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">
                    {selectedProduct.name}
                  </h1>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {selectedProduct.description}
                  </p>

                  <div className="mt-4 space-y-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Key Specs:</span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      {selectedProduct.features.map((feat, idx) => (
                        <li key={idx}>{feat}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Unit Price:</span>
                      <div className="text-2xl font-mono font-bold text-white">
                        ${selectedProduct.price.toFixed(2)}
                      </div>
                    </div>
                    
                    {/* QUANTITY INPUT (Boundary Test Point) */}
                    <div>
                      <label htmlFor="input-product-quantity" className="text-xs text-slate-400 block mb-1">
                        Quantity:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="input-product-quantity"
                          type="number"
                          value={productQuantityInput}
                          onChange={(e) => setProductQuantityInput(e.target.value)}
                          className={`w-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-mono text-sm text-white focus:outline-none focus:border-indigo-500 ${
                            isTargeted('#input-product-quantity') ? 'ring-2 ring-amber-400 bg-amber-400/10' : ''
                          }`}
                        />
                      </div>
                      {isBugActive('BUG_NEGATIVE_QUANTITY') && (
                        <span className="text-[10px] text-amber-400/80 block mt-1">
                          (Accepts negative values without validation)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    id="btn-add-to-cart"
                    onClick={() => {
                      handleAddToCart(selectedProduct, productQuantityInput);
                      setCurrentPage('cart');
                    }}
                    className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 ${
                      isTargeted('#btn-add-to-cart') ? 'ring-2 ring-amber-400 bg-amber-500 text-slate-950' : ''
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            VIEW 3: CART & DISCOUNT MATH
        ========================================= */}
        {currentPage === 'cart' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <span>Shopping Cart ({cartItems.length} items)</span>
              </h2>
              <button
                onClick={() => setCurrentPage('home')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Continue Shopping
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-10 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">Your cart is currently empty.</p>
                <button
                  onClick={() => setCurrentPage('home')}
                  className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cart Line Items */}
                <div className="md:col-span-2 space-y-3">
                  {cartItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800">
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-slate-200 truncate">{item.product.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">${item.product.price.toFixed(2)} ea</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Qty:</span>
                        <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                          item.quantity < 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-200'
                        }`}>
                          {item.quantity}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono font-bold text-xs ${item.quantity < 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() => setCartItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-[10px] text-slate-500 hover:text-rose-400 mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Coupon Code Section */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">Apply Discount Code</span>
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        id="input-coupon-code"
                        type="text"
                        placeholder="Try 'SAVE50'"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className={`flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 uppercase ${
                          isTargeted('#input-coupon-code') ? 'ring-2 ring-amber-400 bg-amber-400/10' : ''
                        }`}
                      />
                      <button
                        id="btn-apply-coupon"
                        type="submit"
                        className={`bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-1.5 rounded-lg font-medium border border-slate-700 transition-colors ${
                          isTargeted('#btn-apply-coupon') ? 'ring-2 ring-amber-400' : ''
                        }`}
                      >
                        Apply
                      </button>
                    </form>
                    {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}
                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded">
                        <span>Coupon applied: <strong className="font-mono">{appliedCoupon}</strong></span>
                        <button onClick={() => setAppliedCoupon(null)} className="text-[10px] underline text-slate-400 hover:text-white">
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary Card */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5 text-xs">
                    <h3 className="font-bold text-slate-200 pb-2 border-b border-slate-800">Order Summary</h3>
                    
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span id="cart-subtotal" className={`font-mono font-medium ${subtotal < 0 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Estimated Tax (8%)</span>
                      <span id="cart-tax" className={`font-mono ${tax < 0 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        {tax < 0 ? `-$${Math.abs(tax).toFixed(2)} (Tax Glitch)` : `$${tax.toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Standard Shipping</span>
                      <span id="cart-shipping" className="font-mono text-slate-200">${shipping.toFixed(2)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount ({appliedCoupon})</span>
                        <span id="cart-discount" className="font-mono">-${discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                      <span>Total</span>
                      <span id="cart-total-value" className="font-mono text-indigo-400 text-base">
                        ${total.toFixed(2)}
                      </span>
                    </div>

                    {/* Hidden formula inspectable by QA Engine */}
                    <div id="cart-financial-formula" className="hidden" data-subtotal={subtotal} data-tax={tax} data-total={total} data-shipping={shipping}>
                      Subtotal: {subtotal}, Tax: {tax}, Shipping: {shipping}, Total: {total}
                    </div>
                  </div>

                  <button
                    id="btn-proceed-checkout"
                    onClick={() => setCurrentPage('checkout')}
                    className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 ${
                      isTargeted('#btn-proceed-checkout') ? 'ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            VIEW 4: CHECKOUT FORM
        ========================================= */}
        {currentPage === 'checkout' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <button
              onClick={() => setCurrentPage('cart')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <span>← Back to Cart</span>
            </button>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">Shipping & Contact Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">Please provide your destination delivery address.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="input-ship-name" className="block text-slate-300 font-medium mb-1">Full Name *</label>
                  <input
                    id="input-ship-name"
                    type="text"
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    className={`w-full bg-slate-950 border ${checkoutErrors.name ? 'border-rose-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-white text-xs ${
                      isTargeted('#input-ship-name') ? 'ring-2 ring-amber-400' : ''
                    }`}
                  />
                  {checkoutErrors.name && <span className="text-[10px] text-rose-400 mt-1 block">{checkoutErrors.name}</span>}
                </div>

                <div>
                  <label htmlFor="input-ship-email" className="block text-slate-300 font-medium mb-1">Email Address *</label>
                  <input
                    id="input-ship-email"
                    type="email"
                    value={shippingEmail}
                    onChange={(e) => setShippingEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="input-ship-address" className="block text-slate-300 font-medium mb-1">Street Address *</label>
                  <input
                    id="input-ship-address"
                    type="text"
                    placeholder="e.g. 123 Automation Blvd"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className={`w-full bg-slate-950 border ${checkoutErrors.address ? 'border-rose-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-white text-xs ${
                      isTargeted('#input-ship-address') ? 'ring-2 ring-amber-400 bg-amber-400/10' : ''
                    }`}
                  />
                  {checkoutErrors.address && <span className="text-[10px] text-rose-400 mt-1 block">{checkoutErrors.address}</span>}
                  {isBugActive('BUG_CHECKOUT_EMPTY_REQUIRED') && (
                    <span className="text-[10px] text-amber-400/80 block mt-1">
                      (Bug: Empty address validation check is bypassed)
                    </span>
                  )}
                </div>

                <div>
                  <label htmlFor="input-ship-city" className="block text-slate-300 font-medium mb-1">City</label>
                  <input
                    id="input-ship-city"
                    type="text"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="input-ship-zip" className="block text-slate-300 font-medium mb-1">Postal Code *</label>
                  <input
                    id="input-ship-zip"
                    type="text"
                    value={shippingZip}
                    onChange={(e) => setShippingZip(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              {/* Order summary small box */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Due Today:</span>
                <span className="font-mono font-bold text-sm text-indigo-400">${total.toFixed(2)}</span>
              </div>

              {/* PLACE ORDER BUTTON */}
              <div className="pt-2">
                <button
                  id="btn-place-order"
                  onClick={() => handlePlaceOrder(false)}
                  onDoubleClick={() => handlePlaceOrder(true)}
                  className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 ${
                    isTargeted('#btn-place-order') ? 'ring-2 ring-amber-400 bg-amber-500 text-slate-950' : ''
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Place Order (${total.toFixed(2)})</span>
                </button>
                {isBugActive('BUG_DUPLICATE_ORDER_RACE') && (
                  <span className="text-[10px] text-amber-400/80 block text-center mt-1">
                    (Notice: No debounce protection on Place Order button)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            VIEW 5: ORDER CONFIRMATION
        ========================================= */}
        {currentPage === 'confirmation' && (
          <div className="space-y-6 max-w-xl mx-auto text-center">
            <div id="order-confirmed-banner" className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h2 className="text-xl font-bold text-white">Order Confirmed!</h2>
              <p className="text-xs text-slate-300">
                Thank you for your purchase. We have received your order.
              </p>

              {lastPlacedOrder && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-left space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Order Number:</span>
                    <span id="confirmed-order-id" className="text-white font-bold">{lastPlacedOrder.id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Recipient:</span>
                    <span className="text-white">{lastPlacedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping Address:</span>
                    <span className="text-white truncate max-w-[200px]">{lastPlacedOrder.shippingAddress}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Amount Charged:</span>
                    <span className="text-emerald-400 font-bold">${lastPlacedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Order count badge for idempotency check */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="text-xs text-slate-400">Total Orders in Session:</span>
                <span id="order-count-badge" className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                  orders.length > 1 ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-200'
                }`}>
                  {orders.length}
                </span>
              </div>

              {orders.length > 1 && (
                <div className="bg-amber-950/40 border border-amber-800/60 rounded p-2.5 text-[11px] text-amber-300 text-left">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Duplicate Orders Detected!
                  </span>
                  <span>Orders {orders.map(o => o.id).join(', ')} were placed simultaneously.</span>
                </div>
              )}

              <button
                onClick={() => {
                  setCurrentPage('home');
                  setOrders([]);
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Back to Shop
              </button>
            </div>
          </div>
        )}

      </main>

      {/* =========================================
          LOGIN MODAL
      ========================================= */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Customer Sign In</span>
              </h3>
              <button onClick={() => setIsLoginModalOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
              <div>
                <label htmlFor="input-login-email" className="block text-slate-300 mb-1">Email</label>
                <input
                  id="input-login-email"
                  type="email"
                  placeholder="tester@shop.com"
                  value={loginEmailInput}
                  onChange={(e) => setLoginEmailInput(e.target.value)}
                  className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white ${
                    isTargeted('#input-login-email') ? 'ring-2 ring-amber-400' : ''
                  }`}
                />
              </div>

              <div>
                <label htmlFor="input-login-password" className="block text-slate-300 mb-1">Password</label>
                <input
                  id="input-login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPasswordInput}
                  onChange={(e) => setLoginPasswordInput(e.target.value)}
                  className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white ${
                    isTargeted('#input-login-password') ? 'ring-2 ring-amber-400' : ''
                  }`}
                />
              </div>

              {loginErrorMessage && (
                <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800/40">
                  {loginErrorMessage}
                </p>
              )}

              <button
                id="btn-submit-login"
                type="submit"
                className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-lg transition-colors ${
                  isTargeted('#btn-submit-login') ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Hidden storage inspection node for session leak verification */}
      <div id="storage-auth-token" className="hidden" data-token={localStorage.getItem('apexmart_auth_token') || ''}>
        {localStorage.getItem('apexmart_auth_token') || ''}
      </div>
    </div>
  );
};
