let vendorProfile = null;

// Initialize dashboard state on load
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  
  if (!user || user.role !== 'vendor') {
    alert('Unauthorized. Please sign in to a verified vendor account.');
    window.location.href = '/login';
    return;
  }

  // Bind Form Listeners
  document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
  document.getElementById('fulfill-form').addEventListener('submit', handleFulfillSubmit);

  loadDashboard();
});

async function loadDashboard() {
  try {
    // 1. Fetch vendor profile meta
    const profileData = await apiFetch('/auth/me');
    vendorProfile = profileData.user;
    
    // Set titles
    document.getElementById('dashboard-store-title').textContent = `${vendorProfile.storeName} Store Portal`;
    document.getElementById('dashboard-store-desc').textContent = `Fulfillment operations center for owner: ${vendorProfile.name}`;

    // 2. Load Stats, Products, and Orders
    await Promise.all([
      loadStats(),
      loadInventory(),
      loadOrders()
    ]);

  } catch (err) {
    console.error('Error loading dashboard:', err);
    alert('Failed to load dashboard workspace. Re-authenticating.');
    logout();
  }
}

// 1. Fetch Analytics Stats
async function loadStats() {
  try {
    const data = await apiFetch('/vendors/stats');
    const { stats } = data;

    document.getElementById('stat-revenue').textContent = `$${stats.revenue.toFixed(2)}`;
    
    // Count units sold
    const unitsSold = stats.statusCounts.reduce((sum, item) => sum + parseInt(item.count, 10), 0);
    document.getElementById('stat-orders').textContent = unitsSold;

    // Display low stock alert counts
    document.getElementById('stat-alerts').textContent = stats.lowStock.length;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// 2. Fetch and render Vendor Inventory listings
async function loadInventory() {
  const tbody = document.getElementById('inventory-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 30px;">
        <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading product listings...
      </td>
    </tr>
  `;

  try {
    // Fetch products filtered by current vendor user ID
    const user = getCurrentUser();
    const data = await apiFetch(`/products?vendorId=${user.vendorId}`);
    const products = data.products;

    // Update active products statistic
    document.getElementById('stat-listings').textContent = products.length;

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
            <i class="fa-solid fa-boxes-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
            You haven't listed any products yet. Click "Add New Product" to start selling!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = products.map(product => {
      const defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
      const isLowStock = product.stock < 10;
      const stockColor = isLowStock ? 'color: var(--warning); font-weight: bold;' : '';

      return `
        <tr>
          <td>
            <img src="${product.image_url || defaultImage}" alt="${product.name}" style="width: 45px; height: 45px; object-fit: cover; border-radius: var(--radius-sm);" onerror="this.src='${defaultImage}'">
          </td>
          <td>
            <div style="font-weight: 600; color: #fff;">${product.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; max-width: 300px; overflow: hidden;">${product.description || 'No description'}</div>
          </td>
          <td style="font-weight: 500; color: #fff;">$${parseFloat(product.price).toFixed(2)}</td>
          <td style="${stockColor}">${product.stock} units</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 8px;">
              <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                <i class="fa-regular fa-pen-to-square"></i> Edit
              </button>
              <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="deleteProduct(${product.id})">
                <i class="fa-solid fa-trash-can"></i> Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching inventory:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--error);">Error loading inventory: ${err.message}</td></tr>`;
  }
}

// 3. Fetch and render order items requiring vendor fulfillment
async function loadOrders() {
  const tbody = document.getElementById('orders-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 30px;">
        <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading active order queues...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/orders/vendor');
    const orders = data.orderItems;

    if (orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px;">
            <i class="fa-solid fa-clipboard-list" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
            No customer orders assigned to your shop yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const subtotal = parseFloat(order.price) * order.quantity;
      const statusClass = `status-${order.status.toLowerCase()}`;

      return `
        <tr>
          <td><span style="font-weight: 600; color: #fff;">#OR-${order.order_id}</span><div style="font-size: 0.75rem; color: var(--text-muted);">${orderDate}</div></td>
          <td><div style="font-weight: 500; color: #fff;">${order.customer_name}</div></td>
          <td><div style="font-weight: 500; color: #fff;">${order.product_name}</div></td>
          <td>${order.quantity}</td>
          <td style="font-weight: 600; color: #fff;">$${subtotal.toFixed(2)}</td>
          <td>
            <div style="font-size: 0.85rem; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${order.shipping_address}">${order.shipping_address}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${order.contact_number}</div>
          </td>
          <td><span class="badge-status ${statusClass}">${order.status}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openFulfillModal(${order.order_item_id}, '${order.status}')">
              Update Status <i class="fa-solid fa-truck-ramp-box"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching order items:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--error);">Error loading orders: ${err.message}</td></tr>`;
  }
}

// Product Modal controls
function openProductModal(product = null) {
  const alertEl = document.getElementById('product-modal-alert');
  alertEl.style.display = 'none';

  if (product) {
    // Edit mode
    document.getElementById('product-modal-title').textContent = 'Edit Product Listing';
    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImageUrl').value = product.image_url || '';
    document.getElementById('product-submit-btn').innerHTML = 'Save Changes <i class="fa-solid fa-circle-check"></i>';
  } else {
    // Add mode
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    document.getElementById('edit-product-id').value = '';
    document.getElementById('product-form').reset();
    document.getElementById('product-submit-btn').innerHTML = 'Save Product <i class="fa-solid fa-circle-plus"></i>';
  }

  document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const alertEl = document.getElementById('product-modal-alert');
  alertEl.style.display = 'none';

  const productId = document.getElementById('edit-product-id').value;
  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  const price = document.getElementById('productPrice').value;
  const stock = document.getElementById('productStock').value;
  const imageUrl = document.getElementById('productImageUrl').value;

  const payload = { name, description, price, stock, imageUrl };
  
  const isEditing = productId !== '';
  const url = isEditing ? `/products/${productId}` : '/products';
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    closeProductModal();
    alert(res.message || 'Product listing saved.');
    
    // Reload components
    await Promise.all([
      loadStats(),
      loadInventory()
    ]);

  } catch (err) {
    alertEl.textContent = err.message || 'Failed to submit product details.';
    alertEl.style.display = 'block';
    alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
    alertEl.style.color = '#ef4444';
    alertEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product listing? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await apiFetch(`/products/${productId}`, {
      method: 'DELETE',
    });

    alert(res.message || 'Product deleted.');
    
    await Promise.all([
      loadStats(),
      loadInventory()
    ]);

  } catch (err) {
    alert(`Failed to delete listing: ${err.message}`);
  }
}

// Fulfillment Modal controls
function openFulfillModal(itemId, currentStatus) {
  const alertEl = document.getElementById('fulfill-modal-alert');
  alertEl.style.display = 'none';

  document.getElementById('fulfill-item-id').value = itemId;
  document.getElementById('fulfillStatus').value = currentStatus;
  
  // Set default descriptions based on status
  let defaultDesc = '';
  if (currentStatus === 'Pending') defaultDesc = 'Vendor TechZone has acknowledged the order and is preparing the package.';
  else if (currentStatus === 'Processing') defaultDesc = 'Vendor has completed packaging and scheduled courier pickup.';
  else if (currentStatus === 'Shipped') defaultDesc = 'Package has been delivered to the customer shipping location.';
  document.getElementById('fulfillDescription').value = defaultDesc;

  document.getElementById('fulfill-modal').style.display = 'flex';
}

function closeFulfillModal() {
  document.getElementById('fulfill-modal').style.display = 'none';
}

async function handleFulfillSubmit(e) {
  e.preventDefault();
  const alertEl = document.getElementById('fulfill-modal-alert');
  alertEl.style.display = 'none';

  const itemId = document.getElementById('fulfill-item-id').value;
  const status = document.getElementById('fulfillStatus').value;
  const description = document.getElementById('fulfillDescription').value;

  try {
    const res = await apiFetch(`/orders/item/${itemId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, description }),
    });

    closeFulfillModal();
    alert(res.message || 'Fulfillment status updated.');

    await Promise.all([
      loadStats(),
      loadOrders()
    ]);

  } catch (err) {
    alertEl.textContent = err.message || 'Failed to update status.';
    alertEl.style.display = 'block';
    alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
    alertEl.style.color = '#ef4444';
    alertEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  }
}
