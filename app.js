import { 
    fetchCategories, 
    fetchProductsByCategory, 
    fetchProductById, 
    searchProducts,
    getAllUsers,
    saveAllUsers
} from './api.js';

const categoriesMenu = document.getElementById('categories-menu');
const contentArea = document.getElementById('content-area');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const cartLink = document.getElementById('cart-link');
const cartCount = document.getElementById('cart-count');
const userAuthContainer = document.getElementById('user-auth-container');

let currentCategory = '';
let cart = [];
let currentUser = null; 
let currentPage = 'home';


// Initialize the application on page load
async function initApp() {
    // Check if a user is already logged in from previous sessions
    const savedUser = localStorage.getItem('loggedUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        cart = currentUser.cart || [];
        updateCartCount(); 
        
        if (!currentUser.orders) {
            currentUser.orders = [];
        }
    }

    // Load and display all category links in the menu
    const categories = await fetchCategories();
    renderCategories(categories);
    
    // Remember the last page the user visited before reload
    const savedPage = localStorage.getItem('currentPage') || 'home';
    const savedCategory = localStorage.getItem('currentCategory') || '';

    if (savedPage === 'cart') {
        renderCartPage();
    } else if (savedPage === 'profile') {
        renderProfilePage();
    } else if (savedPage === 'category' && savedCategory) {
        currentCategory = savedCategory;
        handleCategoryClick(savedCategory);
    } else {
        renderWelcomeHomePage();
    }

    // Set up search bar buttons and enter-key events
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Set up shopping cart button event
    cartLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderCartPage();
        localStorage.setItem('currentPage', 'cart'); 
    });

    // Set up main logo click event to return home
    document.querySelector('.logo').addEventListener('click', () => {
        searchInput.value = '';
        renderWelcomeHomePage();
        localStorage.setItem('currentPage', 'home'); 
    });

    // Set up help and support contact alert button
    document.getElementById('btn-support-help').addEventListener('click', (e) => {
        e.preventDefault();
        alert('פנייתך לסיוע התקבלה! נציג תמיכה טכנית מעזריאלי יחזור אלייך במייל בהקדם. 📬');
    });

    updateAuthUI();

    // Show or hide the welcome popup based on current session
    const popupOverlay = document.getElementById('welcome-popup-overlay');
    const closePopupBtn = document.getElementById('close-popup-btn');

    if (popupOverlay && closePopupBtn) {
        const hasSeenPopup = sessionStorage.getItem('hasSeenWelcomePopup');

        if (hasSeenPopup === 'true') {
            popupOverlay.style.display = 'none';
        } else {
            popupOverlay.style.display = 'flex';
        }

        closePopupBtn.addEventListener('click', () => {
            popupOverlay.style.opacity = '0';
            sessionStorage.setItem('hasSeenWelcomePopup', 'true');
            
            setTimeout(() => {
                popupOverlay.style.display = 'none';
            }, 300);
        });
    }
}

// Display the home page with banner and popular categories
async function renderWelcomeHomePage() {
    currentPage = 'home';
    currentCategory = ''; 
    
    contentArea.innerHTML = `
        <div class="promo-banner">
            <h3>🔥 מבצעי הקיץ הגדולים של Chani! 🔥</h3>
            <p>הנחות של עד 40% על מגוון מוצרים אלקטרוניים וניחוחות מובילים. משלוח חינם ברכישה מעל $50!</p>
        </div>
        <h2>מוצרים נבחרים בשבילך</h2>
    `;

    // Fetch and show 3 items from chosen promo categories
    const promoCategories = ['smartphones', 'laptops', 'fragrances'];
    
    for (const cat of promoCategories) {
        const products = await fetchProductsByCategory(cat);
        const partialProducts = products.slice(0, 3); 
        
        if (partialProducts.length > 0) {
            const catTitle = document.createElement('h3');
            catTitle.className = 'category-section-title';
            catTitle.textContent = `${cat}`;
            contentArea.appendChild(catTitle);
            
            const grid = document.createElement('div');
            grid.className = 'products-grid';
            
            partialProducts.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <img src="${product.thumbnail}" alt="${product.title}">
                    <h3>${product.title}</h3>
                    <div class="price">$${product.price}</div>
                    <button class="btn-add-to-cart">הוספה לסל</button>
                `;
                
                // Card click logic: adds to cart if button clicked, else opens product page
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('btn-add-to-cart')) {
                        addToCart(product);
                    } else {
                        handleProductClick(product.id);
                    }
                });
                
                grid.appendChild(card);
            });
            
            contentArea.appendChild(grid);
        }
    }
}

// Update the user login status buttons in the header
function updateAuthUI() {
    userAuthContainer.innerHTML = '';
    
    if (currentUser) {
        // Create user greeting text
        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-static-name';
        nameSpan.textContent = `👤 שלום, ${currentUser.username}`;
        
        // Create profile dashboard button
        const profileBtn = document.createElement('button');
        profileBtn.className = 'nav-profile-btn';
        profileBtn.textContent = 'האזור האישי';
        profileBtn.addEventListener('click', renderProfilePage);
        
        // Create logout process button
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'nav-logout-btn';
        logoutBtn.style.marginRight = '10px';
        logoutBtn.textContent = 'התנתקות';
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            cart = [];
            localStorage.removeItem('loggedUser'); 
            
            updateCartCount();
            updateAuthUI();
            
            if (currentCategory) {
                handleCategoryClick(currentCategory);
            } else {
                renderWelcomeHomePage(); 
            }
        });
        
        userAuthContainer.appendChild(nameSpan);
        userAuthContainer.appendChild(profileBtn);
        userAuthContainer.appendChild(logoutBtn);
    } else {
        // Create login button if no user is found
        const loginBtn = document.createElement('button');
        loginBtn.className = 'nav-btn';
        loginBtn.textContent = 'התחברות';
        loginBtn.addEventListener('click', renderLoginPage);
        userAuthContainer.appendChild(loginBtn);
    }
}

// Render the categories lists as click links inside the nav bar
function renderCategories(categories) {
    categoriesMenu.innerHTML = '';
    categories.forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
        li.addEventListener('click', () => {
            currentCategory = category;
            searchInput.value = ''; 
            handleCategoryClick(category);
        });
        categoriesMenu.appendChild(li);
    });
}

// Handle action when clicking on a specific category
async function handleCategoryClick(category) {
    currentPage = 'category';
    contentArea.innerHTML = '<h2>טוען מוצרים...</h2>';
    const products = await fetchProductsByCategory(category);
    renderProducts(products, `מוצרים בקטגוריית ${category}`);
    localStorage.setItem('currentPage', 'category');
    localStorage.setItem('currentCategory', category); 
}

// Handle the user search text submission
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    contentArea.innerHTML = '<h2>מבצע חיפוש...</h2>';
    const products = await searchProducts(query);
    renderProducts(products, `תוצאות חיפוש עבור "${query}"`);
}

// Render product cards inside the shop grid layout view
function renderProducts(products, titleText) {
    contentArea.innerHTML = `<h2>${titleText}</h2>`;
    if (products.length === 0) {
        contentArea.innerHTML += '<p>לא נמצאו מוצרים תואמים.</p>';
        return;
    }
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.thumbnail}" alt="${product.title}">
            <h3>${product.title}</h3>
            <div class="price">$${product.price}</div>
            <button class="btn-add-to-cart">הוספה לסל</button>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-add-to-cart')) {
                addToCart(product);
            } else {
                handleProductClick(product.id);
            }
        });
        grid.appendChild(card);
    });
    contentArea.appendChild(grid);
}

// Add a selected product to the shopping cart
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1; // Increase quantity if item already exists
    } else {
        cart.push({ // Add new product structure to the cart array
            id: product.id,
            title: product.title,
            thumbnail: product.thumbnail,
            price: product.price,
            quantity: 1
        });
    }
    updateCartCount();
    syncCartToCloud();
    alert(`המוצר "${product.title}" נוסף לסל בהצלחה!`);
}

// Calculate and update the total number of items shown in the header icon
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

// Update item quantity when changed manually in the cart table view
function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = parseInt(newQuantity) || 1;
        updateCartCount();
        syncCartToCloud();
        renderCartPage();
    }
}

// Remove a specific product completely from the cart list array
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    syncCartToCloud();
    renderCartPage();
}

// Calculate the final price sum of all items combined inside the cart
function calculateTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
}

// Build and display the main dynamic shopping cart page
function renderCartPage() {
    currentPage = 'cart';
    contentArea.innerHTML = '<h2>סל הקניות שלך</h2>';
    
    if (cart.length === 0) {
        contentArea.innerHTML += '<p>סל הקניות שלך ריק כרגע.</p>';
        return;
    }
    
    // Create the structure layout table for cart items list view
    const table = document.createElement('table');
    table.className = 'cart-table';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>תמונה</th>
                <th>מוצר</th>
                <th>מחיר יחידה</th>
                <th>כמות</th>
                <th>סה"כ</th>
                <th>פעולות</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    // Loop through each cart item and inject its dynamic table row
    cart.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${item.thumbnail}" alt="${item.title}" class="cart-item-img"></td>
            <td>${item.title}</td>
            <td>$${item.price}</td>
            <td><input type="number" class="quantity-input" value="${item.quantity}" min="1"></td>
            <td>$${(item.price * item.quantity).toFixed(2)}</td>
            <td><button class="btn-delete">מחיקה</button></td>
        `;
        
        // Listeners for item quantity updates and delete buttons inside rows
        tr.querySelector('.quantity-input').addEventListener('change', (e) => {
            updateQuantity(item.id, e.target.value);
        });
        
        tr.querySelector('.btn-delete').addEventListener('click', () => {
            removeFromCart(item.id);
        });
        
        tbody.appendChild(tr);
    });
    
    contentArea.appendChild(table);
    
    // Display total sum summary line
    const summary = document.createElement('div');
    summary.className = 'cart-summary';
    summary.innerHTML = `לתשלום: $${calculateTotal()}`;
    contentArea.appendChild(summary);
    
    // Append secondary shopping navigation buttons view layout
    const actions = document.createElement('div');
    actions.className = 'cart-actions';
    actions.innerHTML = `
        <button class="btn-back" id="btn-cart-back">המשך בקניות</button>
        <button class="btn-checkout" id="btn-show-checkout">ביצוע רכישה</button>
    `;
    contentArea.appendChild(actions);
    
    // Set up return back click listener behavior
    document.getElementById('btn-cart-back').addEventListener('click', () => {
        if (currentCategory) {
            handleCategoryClick(currentCategory);
        } else {
            renderWelcomeHomePage();
        }
    });
    
    document.getElementById('btn-show-checkout').addEventListener('click', showCheckoutForm);
    localStorage.setItem('currentPage', 'cart');
}

// Generate and smoothly scroll to the shipping and payment input form fields
function showCheckoutForm() {
    const existingCheckout = document.getElementById('checkout-section');
    if (existingCheckout) return;

    const checkoutSection = document.createElement('div');
    checkoutSection.id = 'checkout-section';
    checkoutSection.className = 'checkout-section';
    
    const savedAddress = currentUser ? currentUser.address : '';
    
    checkoutSection.innerHTML = `
        <h3>פרטי משלוח ותשלום</h3>
        <form id="checkout-form" class="checkout-form">
            <div class="form-group">
                <label for="address">כתובת למשלוח:</label>
                <input type="text" id="address" required value="${savedAddress}" placeholder="רחוב, עיר, מיקוד">
            </div>
            <div class="form-group">
                <label for="card-number">מספר כרטיס אשראי:</label>
                <input type="text" id="card-number" required placeholder="XXXX-XXXX-XXXX-XXXX" pattern="[0-9]{16}">
            </div>
            <button type="submit" class="btn-checkout">אשר רכישה ותשלום</button>
        </form>
    `;
    contentArea.appendChild(checkoutSection);
    checkoutSection.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('checkout-form').addEventListener('submit', handlePayment);
}

// Process the form fields submission and complete database checkout log
async function handlePayment(e) {
    e.preventDefault();
    const address = document.getElementById('address').value;
    
    // Log order history entry inside user object cloud record database repository
    if (currentUser) {
        const order = {
            date: new Date().toLocaleDateString('he-IL'),
            total: calculateTotal(),
            itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0)
        };
        currentUser.orders.push(order);
        
        const allUsers = await getAllUsers();
        const userIdx = allUsers.findIndex(u => u.username === currentUser.username);
        if (userIdx !== -1) {
            allUsers[userIdx].orders = currentUser.orders;
            await saveAllUsers(allUsers);
        }
    }

    // Display order success completion visual card UI view screen
    contentArea.innerHTML = `
        <div class="success-message">
            <h2>🎉 הרכישה בוצעה בהצלחה!</h2>
            <p>תודה שקנית אצלנו. ההזמנה שלך נרשמה במערכת.</p>
            <p><strong>הכתובת למשלוח:</strong> ${address}</p>
            <p>המוצרים בדרך אלייך! 🚚</p>
            <button class="btn-back" id="btn-success-back" style="margin-top: 20px;">חזרה לעמוד הראשי</button>
        </div>
    `;
    
    // Reset local cart variables values back to empty values state
    cart = [];
    updateCartCount();

    document.getElementById('btn-success-back').addEventListener('click', () => {
        if (currentCategory) {
            handleCategoryClick(currentCategory);
        } else {
            renderWelcomeHomePage();
        }
    });
}

// Render the login form layout view
function renderLoginPage() {
    contentArea.innerHTML = `
        <div class="auth-box">
            <h3>התחברות לחנות</h3>
            <form id="login-form" class="checkout-form">
                <div class="form-group">
                    <label>שם משתמש:</label>
                    <input type="text" id="login-username" required>
                </div>
                <div class="form-group">
                    <label>סיסמה:</label>
                    <input type="password" id="login-password" required>
                </div>
                <button type="submit" class="btn-checkout" style="width:100%">התחבר</button>
            </form>
            <span id="go-to-register" class="auth-toggle-link">עוד לא רשומים? לחצו כאן להרשמה</span>
        </div>
    `;
    document.getElementById('go-to-register').addEventListener('click', renderRegisterPage);
    document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
}

// Process the login form data submission and authenticate user
async function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    contentArea.innerHTML = '<h2>בודק פרטי התחברות...</h2>';
    const users = await getAllUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        cart = user.cart || []; 
        updateCartCount();
        currentUser.orders = user.orders || []; 

        // Save session state locally to keep user logged in on refresh
        localStorage.setItem('loggedUser', JSON.stringify(currentUser));
        
        updateAuthUI();
        alert(`ברוך הבא, ${username}!`);
        
        if (currentCategory) {
            handleCategoryClick(currentCategory);
        } else {
            renderWelcomeHomePage();
        }
    } else {
        alert('שם משתמש או סיסמה שגויים');
        renderLoginPage();
    }
}

// Render the user registration account form interface
function renderRegisterPage() {
    contentArea.innerHTML = `
        <div class="auth-box">
            <h3>הרשמה למערכת</h3>
            <form id="register-form" class="checkout-form">
                <div class="form-group">
                    <label>שם משתמש:</label>
                    <input type="text" id="reg-username" required>
                </div>
                <div class="form-group">
                    <label>אימייל:</label>
                    <input type="email" id="reg-email" required>
                </div>
                <div class="form-group">
                    <label>כתובת מלאה:</label>
                    <input type="text" id="reg-address" required>
                </div>
                <div class="form-group">
                    <label>סיסמה:</label>
                    <input type="password" id="reg-password" required>
                </div>
                <button type="submit" class="btn-checkout" style="width:100%">הרשם עכשיו</button>
            </form>
            <span id="go-to-login" class="auth-toggle-link">כבר רשומים? לחצו כאן להתחברות</span>
        </div>
    `;
    document.getElementById('go-to-login').addEventListener('click', renderLoginPage);
    document.getElementById('register-form').addEventListener('submit', handleRegisterSubmit);
}

// Handle registration submission and create new account on the server
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const address = document.getElementById('reg-address').value.trim();
    const password = document.getElementById('reg-password').value;

    contentArea.innerHTML = '<h2>מבצע הרשמה בשרת...</h2>';
    const users = await getAllUsers();

    // Validate that the chosen username is not taken
    if (users.some(u => u.username === username)) {
        alert('שם משתמש זה כבר קיים במערכת');
        renderRegisterPage();
        return;
    }

    const newUser = { username, email, address, password, orders: [], cart: [] };
    users.push(newUser);

    const success = await saveAllUsers(users);
    if (success) {
        currentUser = newUser;
        localStorage.setItem('loggedUser', JSON.stringify(newUser));
        updateAuthUI();
        alert('נרשמת בהצלחה לחנות!');
        
        if (currentCategory) {
            handleCategoryClick(currentCategory); 
        } else {
            renderWelcomeHomePage(); 
        }
    } else {
        alert('תקלה זמנית בתקשורת עם השרת, נא לנסות שוב');
        renderRegisterPage();
    }
}

// Render the personal dashboard panel showing order history logs
function renderProfilePage() {
    currentPage = 'profile';
    if (!currentUser) return;
    
    let ordersHtml = '';
    if (currentUser.orders && currentUser.orders.length > 0) {
        // Reverse array order to show the latest orders first
        const reversedOrders = [...currentUser.orders].reverse();
        reversedOrders.forEach((order, index) => {
            ordersHtml += `
                <div class="order-card-modern">
                    <div class="order-card-header">
                        <span class="order-id">🆔 הזמנה #${reversedOrders.length - index}</span>
                        <span class="order-date">📅 ${order.date}</span>
                    </div>
                    <div class="order-card-body">
                        <div class="order-meta-item">
                            <span class="meta-label">כמות פריטים:</span>
                            <span class="meta-value">${order.itemsCount}</span>
                        </div>
                        <div class="order-meta-item">
                            <span class="meta-label">סך הכל שולם:</span>
                            <span class="meta-value price-highlight">$${order.total}</span>
                        </div>
                        <div class="order-status-badge">✓ הושלמה</div>
                    </div>
                </div>
            `;
        });
    } else {
        ordersHtml = `
            <div class="empty-orders-state">
                <p>📦 לא בוצעו רכישות בעבר.</p>
            </div>
        `;
    }

    // Generate dashboard split layout screen structure
    contentArea.innerHTML = `
        <div class="profile-dashboard-container">
            <aside class="profile-sidebar-card">
                <div class="profile-avatar-zone">
                    <div class="profile-avatar-circle">👤</div>
                    <h2>${currentUser.username}</h2>
                    <span class="profile-role-tag">לקוח רשום</span>
                </div>
                <div class="profile-details-list">
                    <div class="detail-row">
                        <span class="detail-icon">📧</span>
                        <div class="detail-text">
                            <label>אימייל</label>
                            <p>${currentUser.email}</p>
                        </div>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">📍</span>
                        <div class="detail-text">
                            <label>כתובת שמורה</label>
                            <p>${currentUser.address || 'לא הוגדרה כתובת'}</p>
                        </div>
                    </div>
                </div>
                <button class="dashboard-back-btn" id="btn-profile-back">🛍️ חזרה לעמוד הראשי</button>
            </aside>

            <main class="profile-orders-area">
                <div class="orders-area-header">
                    <h3>📦 היסטוריית רכישות עבר</h3>
                    <span class="orders-count-badge">${currentUser.orders ? currentUser.orders.length : 0} הזמנות</span>
                </div>
                <div class="orders-list-grid">
                    ${ordersHtml}
                </div>
            </main>
        </div>
    `;

    document.getElementById('btn-profile-back').addEventListener('click', () => {
        if (currentCategory) {
            handleCategoryClick(currentCategory);
        } else {
            renderWelcomeHomePage(); 
        }
    });
    localStorage.setItem('currentPage', 'profile');
}

// Fetch single product data from server when clicked
async function handleProductClick(productId) {
    contentArea.innerHTML = '<h2>טוען פרטי מוצר...</h2>';
    const product = await fetchProductById(productId);
    if (!product) {
        contentArea.innerHTML = '<h2>שגיאה בטעינת המוצר</h2>';
        return;
    }
    renderProductDetails(product);
}

// Render the fully detailed dynamic page for a single selected product
function renderProductDetails(product) {
    let reviewsHtml = '';
    if (product.reviews && product.reviews.length > 0) {
        product.reviews.forEach(review => {
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            reviewsHtml += `
                <div class="review-item">
                    <div class="review-header">
                        <span>${review.reviewerName}</span>
                        <span class="review-rating">${stars}</span>
                    </div>
                    <p>${review.comment}</p>
                </div>
            `;
        });
    } else {
        reviewsHtml = '<p>אין ביקורות למוצר זה עדיין.</p>';
    }

    contentArea.innerHTML = `
        <div class="product-details">
            <div class="product-main-info">
                <div class="product-gallery">
                    <img src="${product.images[0] || product.thumbnail}" alt="${product.title}">
                </div>
                <div class="product-specs">
                    <h2>${product.title}</h2>
                    <p class="description">${product.description}</p>
                    <div class="price-tag">$${product.price}</div>
                    <div class="additional-info">
                        <h3>מידע נוסף:</h3>
                        <p><strong>מידות:</strong> רוחב ${product.dimensions?.width || 'N/A'} ס"מ | גובה ${product.dimensions?.height || 'N/A'} ס"מ | עומק ${product.dimensions?.depth || 'N/A'} ס"מ</p>
                        <p><strong>משקל:</strong> ${product.weight || 'N/A'} ק"ג</p>
                        <p><strong>מלאי זמין:</strong> ${product.stock} יחידות</p>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-back" id="btn-back-to-shop">חזרה לדף הבית</button>
                        <button class="btn-add-to-cart-details" style="background-color: #a78bfa; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">הוספה לסל</button>
                    </div>
                </div>
            </div>
            <div class="reviews-section">
                <h3>ביקורות (${product.reviews?.length || 0}):</h3>
                ${reviewsHtml}
            </div>
        </div>
    `;

    // Note: Updated the 'Add to cart' button color above to match your pastel layout style (#a78bfa)
    document.getElementById('btn-back-to-shop').addEventListener('click', () => {
        if (currentCategory) {
            handleCategoryClick(currentCategory);
        } else {
            renderWelcomeHomePage();
        }
    });

    contentArea.querySelector('.btn-add-to-cart-details').addEventListener('click', () => {
        addToCart(product);
    });
}

// Sync current cart modifications to localStorage and update cloud server storage
async function syncCartToCloud() {
    if (!currentUser) return; 

    currentUser.cart = cart; 
    localStorage.setItem('loggedUser', JSON.stringify(currentUser));
 
    const allUsers = await getAllUsers();
    const userIdx = allUsers.findIndex(u => u.username === currentUser.username);
    if (userIdx !== -1) {
        allUsers[userIdx].cart = cart;
        await saveAllUsers(allUsers);
    }
}

document.addEventListener('DOMContentLoaded', initApp);