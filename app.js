// Google Sheets Configuration
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxgTQ6a3jgnRcG5Gr5m1qb013dKtsFBnTLsXOr8PQ_TIuKm-xIgmfpOo2g7alDKtt2m/exec'; // هتعدلها بعدين

// Global Variables
let allCustomers = [];
let currentFilter = 'all';

// DOM Elements
const customerForm = document.getElementById('customerForm');
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearch = document.getElementById('clearSearch');
const noData = document.getElementById('noData');
const loading = document.getElementById('loading');
const totalCustomers = document.getElementById('totalCustomers');
const totalSales = document.getElementById('totalSales');
const exportBtn = document.getElementById('exportBtn');
const filterBtns = document.querySelectorAll('.filter-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCustomers();
    setDefaultDate();
    
    // Event Listeners
    customerForm.addEventListener('submit', handleAddCustomer);
    searchBtn.addEventListener('click', handleSearch);
    clearSearch.addEventListener('click', handleClearSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    exportBtn.addEventListener('click', exportToExcel);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn));
    });
});

// Set default date to today
function setDefaultDate() {
    const today = new Date();
    const formatted = today.toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = formatted;
}

// Show/Hide Loading
function toggleLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

// Format Date
function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('ar-EG', options);
}

// Format Currency
function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('ar-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' ج.م';
}

// Load Customers from Google Sheets
async function loadCustomers() {
    toggleLoading(true);
    try {
        // For now, load from localStorage until Google Sheets is configured
        allCustomers = JSON.parse(localStorage.getItem('heedMadeCustomers') || '[]');
        
        // When Google Sheets is ready, use this instead:
        // const response = await fetch(GOOGLE_SHEET_URL);
        // const data = await response.json();
        // allCustomers = data.customers || [];
        
        updateTable();
        updateStats();
    } catch (error) {
        console.error('Error loading customers:', error);
        showMessage('حدث خطأ في تحميل البيانات', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Save to localStorage (temporary until Google Sheets integration)
function saveToLocalStorage() {
    localStorage.setItem('heedMadeCustomers', JSON.stringify(allCustomers));
}

// Add Customer
async function handleAddCustomer(e) {
    e.preventDefault();
    
    const customer = {
        id: Date.now(),
        name: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        product: document.getElementById('productName').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value),
        date: document.getElementById('purchaseDate').value,
        createdAt: new Date().toISOString()
    };
    
    // Validation
    if (!customer.name || !customer.phone || !customer.address || 
        !customer.product || !customer.price || !customer.date) {
        showMessage('من فضلك أكمل جميع الحقول', 'warning');
        return;
    }
    
    // Phone validation (Egypt)
    const phoneRegex = /^(01[0125][0-9]{8}|(\+20|0020)?1[0125][0-9]{8})$/;
    if (!phoneRegex.test(customer.phone.replace(/[\s-]/g, ''))) {
        showMessage('رقم الهاتف غير صحيح', 'error');
        return;
    }
    
    toggleLoading(true);
    
    try {
        // Add to Google Sheets (when configured)
        // await addToGoogleSheets(customer);
        
        // Add to local array
        allCustomers.unshift(customer);
        saveToLocalStorage();
        
        updateTable();
        updateStats();
        customerForm.reset();
        setDefaultDate();
        showMessage('تمت إضافة العميل بنجاح ✨', 'success');
        
    } catch (error) {
        console.error('Error adding customer:', error);
        showMessage('حدث خطأ في إضافة العميل', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Update Table
function updateTable(customers = allCustomers) {
    tableBody.innerHTML = '';
    
    if (customers.length === 0) {
        noData.style.display = 'block';
        return;
    }
    
    noData.style.display = 'none';
    
    customers.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${customer.name}</td>
            <td dir="ltr" style="text-align: right;">${customer.phone}</td>
            <td>${customer.address}</td>
            <td>${customer.product}</td>
            <td>${formatCurrency(customer.price)}</td>
            <td>${formatDate(customer.date)}</td>
            <td>
                <button class="btn-delete" onclick="deleteCustomer(${customer.id})">
                    🗑️ حذف
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Delete Customer
async function deleteCustomer(id) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    
    toggleLoading(true);
    try {
        allCustomers = allCustomers.filter(c => c.id !== id);
        saveToLocalStorage();
        
        updateTable();
        updateStats();
        showMessage('تم حذف العميل بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting customer:', error);
        showMessage('حدث خطأ في حذف العميل', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Search
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        updateTable();
        return;
    }
    
    const filtered = allCustomers.filter(customer => 
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.product.toLowerCase().includes(query) ||
        customer.address.toLowerCase().includes(query)
    );
    
    updateTable(filtered);
}

// Clear Search
function handleClearSearch() {
    searchInput.value = '';
    updateTable();
}

// Filter
function handleFilter(btn) {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    currentFilter = btn.dataset.filter;
    applyFilter();
}

function applyFilter() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = allCustomers;
    
    switch(currentFilter) {
        case 'today':
            filtered = allCustomers.filter(c => {
                const cDate = new Date(c.date);
                cDate.setHours(0, 0, 0, 0);
                return cDate.getTime() === today.getTime();
            });
            break;
            
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = allCustomers.filter(c => new Date(c.date) >= weekAgo);
            break;
            
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            filtered = allCustomers.filter(c => new Date(c.date) >= monthAgo);
            break;
    }
    
    updateTable(filtered);
}

// Update Statistics
function updateStats() {
    totalCustomers.textContent = allCustomers.length;
    
    const total = allCustomers.reduce((sum, c) => sum + parseFloat(c.price || 0), 0);
    totalSales.textContent = formatCurrency(total);
}

// Export to Excel
function exportToExcel() {
    if (allCustomers.length === 0) {
        showMessage('لا يوجد بيانات للتصدير', 'warning');
        return;
    }
    
    // Create CSV content
    let csv = 'الاسم,رقم الهاتف,العنوان,المنتج,السعر,التاريخ\n';
    
    allCustomers.forEach(c => {
        csv += `${c.name},${c.phone},${c.address},${c.product},${c.price},${c.date}\n`;
    });
    
    // Create download link
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Heed_Made_Customers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('تم تصدير البيانات بنجاح 📥', 'success');
}

// Show Message
function showMessage(text, type) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = text;
    
    // Style the toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '15px 30px',
        borderRadius: '10px',
        color: 'white',
        fontWeight: '600',
        zIndex: '1001',
        animation: 'slideDown 0.3s ease',
        fontFamily: 'Cairo, sans-serif',
        boxShadow: '0 5px 20px rgba(0,0,0,0.2)'
    });
    
    // Set background color based on type
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800'
    };
    toast.style.background = colors[type] || colors.success;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translate(-50%, -100px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -100px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Google Sheets Integration (for future use)
async function addToGoogleSheets(customer) {
    const formData = new FormData();
    formData.append('name', customer.name);
    formData.append('phone', customer.phone);
    formData.append('address', customer.address);
    formData.append('product', customer.product);
    formData.append('price', customer.price);
    formData.append('date', customer.date);
    
    const response = await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        body: formData
    });
    
    return response.json();
}