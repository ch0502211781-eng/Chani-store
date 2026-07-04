const BASE_URL = 'https://dummyjson.com/products';

const BIN_ID = '6a465129da38895dfe21fee3'; 
const MASTER_KEY = '$2a$10$wlM286VzfjAof1lV5x8N..kU4fOtgHEUmTw6eWJV52C.agS01D8.K'; 
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Get all product categories from the server
async function fetchCategories() {
    try {
        const response = await fetch(`${BASE_URL}/category-list`);
        if (!response.ok) throw new Error('שגיאה בטעינת הקטגוריות');
        return await response.json();
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

// Get all products inside a specific category
async function fetchProductsByCategory(categoryName) {
    try {
        const response = await fetch(`${BASE_URL}/category/${categoryName}`);
        if (!response.ok) throw new Error(`שגיאה בטעינת מוצרים לקטגוריה ${categoryName}`);
        const data = await response.json();
        return data.products;
    } catch (error) {
        console.error(`Error fetching products for ${categoryName}:`, error);
        return [];
    }
}

// Search for products by input text
async function searchProducts(query) {
    try {
        const response = await fetch(`${BASE_URL}/search?q=${query}`);
        if (!response.ok) throw new Error('שגיאה בביצוע החיפוש');
        const data = await response.json();
        return data.products;
    } catch (error) {
        console.error('Error searching products:', error);
        return [];
    }
}

// Get full details of one product by its unique ID
async function fetchProductById(productId) {
    try {
        const response = await fetch(`${BASE_URL}/${productId}`);
        if (!response.ok) throw new Error('שגיאה בטעינת פרטי המוצר');
        return await response.json();
    } catch (error) {
        console.error(`Error fetching product ${productId}:`, error);
        return null;
    }
}

// Load all registered users from the cloud storage
async function getAllUsers() {
    try {
        const response = await fetch(`${BIN_URL}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': MASTER_KEY
            }
        });
        if (!response.ok) throw new Error('שגיאה במשיכת משתמשים מהשרת');
        const data = await response.json();
        return data.record || []; 
    } catch (error) {
        console.error('Error fetching users from jsonbin:', error);
        return [];
    }
}

// Save the updated list of users back to the cloud storage
async function saveAllUsers(usersArray) {
    try {
        const response = await fetch(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': MASTER_KEY
            },
            body: JSON.stringify(usersArray)
        });
        if (!response.ok) throw new Error('שגיאה בשמירת המשתמשים בשרת');
        return true;
    } catch (error) {
        console.error('Error saving users to jsonbin:', error);
        return false;
    }
}

export { 
    fetchCategories, 
    fetchProductsByCategory, 
    searchProducts, 
    fetchProductById,
    getAllUsers,
    saveAllUsers
};