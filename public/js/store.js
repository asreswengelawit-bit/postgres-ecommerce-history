let cart = [];
let searchTimeout = null;

// Initialize storefront state
document.addEventListener('DOMContentLoaded', () => {
  loadCatalog();
  loadCartFromStorage();
  
  // Show orders button if logged in as customer
  const user = getCurrentUser();
  if (user && user.role === 'customer') {
    document.getElementById('view-orders-btn').style.display = 'block';
  }

  // Bind checkout form handler
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }
});

// View switching
function switchStoreView(view) {
  const catalogView = document.getElementById('store-catalog-view');
  const ordersView = document.getElementById('store-orders-view');
  const catalogBtn = document.getElementById('view-catalog-btn');
  const ordersBtn = document.getElementById('view-orders-btn');

  if (view === 'orders') {
    catalogView.style.display = 'none';
    ordersView.style.display = 'block';
    ordersBtn.classList.add('btn-primary');
    ordersBtn.classList.remove('btn-secondary');
    catalogBtn.classList.add('btn-secondary');
    catalogBtn.classList.remove('btn-primary');
    loadOrders();
  } else {
    catalogView.style.display = 'block';
    ordersView.style.display = 'none';
    catalogBtn.classList.add('btn-primary');
    catalogBtn.classList.remove('btn-secondary');
    ordersBtn.classList.add('btn-secondary');
    ordersBtn.classList.remove('btn-primary');
    loadCatalog();
  }
}

// Fetch and render product catalog
async function loadCatalog() {
  const searchQuery = document.getElementById('search-input').value;
  const minPrice = document.getElementById('min-price').value;
  const maxPrice = document.getElementById('max-price').value;

  let queryParams = [];
  if (searchQuery) queryParams.push(`search=${encodeURIComponent(searchQuery)}`);
  if (minPrice) queryParams.push(`minPrice=${minPrice}`);
  if (maxPrice) queryParams.push(`maxPrice=${maxPrice}`);

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

  try {
    const data = await apiFetch(`/products${queryString}`);
    renderCatalog(data.products);
  } catch (err) {
    console.error('Error fetching catalog:', err);
    document.getElementById('catalog-list').innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--error); padding: 40px;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 12px;"></i>
        <p>Failed to load products: ${err.message}</p>
      </div>
    `;
  }
}

// Debounce search input to avoid spamming the database
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadCatalog();
  }, 400);
}

function renderCatalog(products) {
  const catalogList = document.getElementById('catalog-list');
  if (products.length === 0) {
    catalogList.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 60px 0;">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 16px; color: var(--text-muted);"></i>
        <p>No products match your search filters.</p>
      </div>
    `;
    return;
  }

  catalogList.innerHTML = products.map(product => {
    const defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
    const isOutOfStock = product.stock <= 0;

    return `
      <div class="glass-panel product-card">
        <div class="product-image-wrapper">
          <img class="product-image" src="${product.image_url || defaultImage}" alt="${product.name}" onerror="this.src='${defaultImage}'">
          <span class="product-badge">${product.store_name}</span>
        </div>
        <div class="product-content">
          <span class="product-vendor">Seller: ${product.store_name}</span>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-desc">${product.description || 'No description provided.'}</p>
          <div class="product-footer">
            <span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>
            ${isOutOfStock 
              ? `<span style="color: var(--error); font-weight: 500; font-size: 0.9rem;">Out of Stock</span>`
              : `<button class="btn btn-primary" onclick="addToCart({ id: ${product.id}, name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price}, imageUrl: '${product.image_url}', storeName: '${product.store_name}' })">
                  Add to Cart <i class="fa-solid fa-cart-plus"></i>
                 </button>`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Shopping Cart Management
function loadCartFromStorage() {
  const storedCart = localStorage.getItem('cart');
  try {
    cart = storedCart ? JSON.parse(storedCart) : [];
  } catch (e) {
    cart = [];
  }
  updateCartUI();
}

function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(product) {
  // Check if logged in first
  const user = getCurrentUser();
  if (!user) {
    alert('Please log in or register a customer account to purchase products.');
    window.location.href = '/login';
    return;
  }
  
  if (user.role !== 'customer') {
    alert('Only customers are authorized to buy products.');
    return;
  }

  const existingItem = cart.find(item => item.productId === product.id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      storeName: product.storeName,
      quantity: 1,
    });
  }

  saveCartToStorage();
  toggleCartDrawer(true); // Open drawer automatically
}

function updateCartQty(productId, delta) {
  const item = cart.find(i => i.productId === productId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      saveCartToStorage();
    }
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  saveCartToStorage();
}

function toggleCartDrawer(forceOpen = null) {
  const drawer = document.getElementById('cart-drawer');
  if (forceOpen === true) {
    drawer.classList.add('open');
  } else if (forceOpen === false) {
    drawer.classList.remove('open');
  } else {
    drawer.classList.toggle('open');
  }
}

function updateCartUI() {
  // Update badge counter
  const badge = document.getElementById('cart-counter');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = totalItems;

  const cartContainer = document.getElementById('cart-items');
  const cartTotalValue = document.getElementById('cart-total-value');

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div style="text-align: center; margin-top: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-basket-shopping" style="font-size: 3rem; margin-bottom: 16px;"></i>
        <p>Your cart is empty.</p>
      </div>
    `;
    cartTotalValue.textContent = '$0.00';
    return;
  }

  let subtotal = 0;
  cartContainer.innerHTML = cart.map(item => {
    const itemTotal = parseFloat(item.price) * item.quantity;
    subtotal += itemTotal;
    const defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';

    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.imageUrl || defaultImage}" alt="${item.name}" onerror="this.src='${defaultImage}'">
        <div class="cart-item-details">
          <div style="font-weight: 500; color: #fff; margin-bottom: 2px;">${item.name}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">Seller: ${item.storeName}</div>
          <div style="font-weight: 600; color: #fff;">$${parseFloat(item.price).toFixed(2)}</div>
          <div class="cart-item-qty">
            <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem;" onclick="updateCartQty(${item.productId}, -1)">-</button>
            <span style="font-weight: 500; font-size: 0.9rem;">${item.quantity}</span>
            <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem;" onclick="updateCartQty(${item.productId}, 1)">+</button>
          </div>
        </div>
        <button class="btn btn-secondary" style="padding: 8px; border-radius: 50%; color: var(--error);" onclick="removeFromCart(${item.productId})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');

  cartTotalValue.textContent = `$${subtotal.toFixed(2)}`;
}

// Checkout Flow
function openCheckoutModal() {
  if (cart.length === 0) {
    alert('Please add products to your cart before checking out.');
    return;
  }
  
  toggleCartDrawer(false); // Close cart drawer
  document.getElementById('checkout-modal').style.display = 'flex';
  
  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  document.getElementById('checkout-total-price').textContent = `$${subtotal.toFixed(2)}`;
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal').style.display = 'none';
  document.getElementById('checkout-alert').style.display = 'none';
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const alertEl = document.getElementById('checkout-alert');
  const shippingAddress = document.getElementById('shippingAddress').value;
  const contactNumber = document.getElementById('contactNumber').value;

  const items = cart.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  try {
    alertEl.style.display = 'none';
    const orderRes = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress, contactNumber, items }),
    });

    // Clear cart on success
    cart = [];
    saveCartToStorage();
    closeCheckoutModal();

    alert('Thank you! Your order has been placed successfully.');
    switchStoreView('orders'); // Go to orders list immediately to see progress!

  } catch (err) {
    alertEl.textContent = err.message || 'Checkout failed. Please verify stock availability.';
    alertEl.style.display = 'block';
    alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
    alertEl.style.color = '#ef4444';
    alertEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  }
}

// Fetch and render Customer Orders History
async function loadOrders() {
  const container = document.getElementById('orders-list');
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 12px; color: var(--primary);"></i>
      <p>Loading your orders...</p>
    </div>
  `;

  try {
    const data = await apiFetch('/orders/customer');
    if (data.orders.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 16px;"></i>
          <p>You have not placed any orders yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.orders.map(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      
      const itemsHtml = order.items.map(item => {
        const defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
        const statusClass = `status-${item.status.toLowerCase()}`;

        return `
          <div style="display: flex; gap: 16px; align-items: center; padding: 16px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <img src="${item.image_url || defaultImage}" alt="${item.product_name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-sm);" onerror="this.src='${defaultImage}'">
            <div style="flex-grow: 1;">
              <div style="font-weight: 500; color: #fff;">${item.product_name}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">Seller: ${item.store_name} | Qty: ${item.quantity} | Price: $${parseFloat(item.price).toFixed(2)}</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              <span class="badge-status ${statusClass}">${item.status}</span>
              <a href="/track/${item.order_item_id}" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm);">
                Track <i class="fa-solid fa-map-location-dot"></i>
              </a>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="border: 1px solid var(--glass-border); padding: 24px; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.01); margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px; border-bottom: 1px dashed var(--glass-border); padding-bottom: 16px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Order Number</div>
              <div style="font-weight: 600; color: #fff;">#OR-${order.id}</div>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Date Placed</div>
              <div style="color: var(--text-secondary);">${orderDate}</div>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Total Spent</div>
              <div style="font-weight: 700; color: var(--secondary);">$${parseFloat(order.total_price).toFixed(2)}</div>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Shipping Address</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem;">${order.shipping_address}</div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column;">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading customer purchases:', err);
    container.innerHTML = `
      <div style="text-align: center; color: var(--error); padding: 20px;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem;"></i>
        <p>Failed to load orders: ${err.message}</p>
      </div>
    `;
  }
}
