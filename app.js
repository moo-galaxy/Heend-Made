// Google Sheets Configuration
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxgTQ6a3jgnRcG5Gr5m1qb013dKtsFBnTLsXOr8PQ_TIuKm-xIgmfpOo2g7alDKtt2m/exec';

// Global Variables
let allCustomers = [];
let currentFilter = 'all';
let deleteCustomerId = null;

// DOM Elements
const customerForm = document.getElementById('customerForm');
const tableBody = document.getElementById('tableBody');
const mobileCards = document.getElementById('mobileCards');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearch = document.getElementById('clearSearch');
const noData = document.getElementById('noData');
const loading = document.getElementById('loading');
const totalCustomers = document.getElementById('totalCustomers');
const totalSales = document.getElementById('totalSales');
const exportBtn = document.getElementById('exportBtn');
const refreshBtn = document.getElementById('refreshBtn');
const filterBtns = document.querySelectorAll('.filter-btn');
const toggleFormBtn = document.getElementById('toggleFormBtn');
const deleteModal = document.getElementById('deleteModal');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete = document.getElementById('cancelDelete');

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
    refreshBtn.addEventListener('click', () => loadCustomers());
    toggleFormBtn.addEventListener('click', toggleForm);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn));
    });
    
    // Modal events
    confirmDelete.addEventListener('click', executeDelete);
    cancelDelete.addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });
});

// ==================== Date & Format Functions ====================
function setDefaultDate() {
    const today = new Date();
    const formatted = today.toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = formatted;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('ar-EG', options);
}

function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('ar-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' ج.م';
}

// ==================== Loading ====================
function toggleLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

// ==================== Toggle Form ====================
function toggleForm() {
    const form = document.getElementById('customerForm');
    const icon = toggleFormBtn.querySelector('.toggle-icon');
    
    if (form.style.display === 'none') {
        form.style.display = 'flex';
        icon.textContent = '▼';
    } else {
        form.style.display = 'none';
        icon.textContent = '▶';
    }
}

// ==================== Google Sheets Integration ====================
async function loadCustomers() {
    toggleLoading(true);
    try {
        // Try Google Sheets first
        const response = await fetch(GOOGLE_SHEET_URL);
        const data = await response.json();
        
        if (data.customers && data.customers.length > 0) {
            allCustomers = data.customers.map((c, index) => ({
                id: index + 1,
                name: c.name || c[0] || '',
                phone: c.phone || c[1] || '',
                address: c.address || c[2] || '',
                product: c.product || c[3] || '',
                price: c.price || c[4] || 0,
                date: c.date || c[5] || ''
            }));
        } else {
            // Fallback to localStorage
            allCustomers = JSON.parse(localStorage.getItem('heedMadeCustomers') || '[]');
        }
        
        updateAllViews();
        updateStats();
    } catch (error) {
        console.log('Fetching from Google Sheets failed, using localStorage');
        // Fallback to localStorage
        allCustomers = JSON.parse(localStorage.getItem('heedMadeCustomers') || '[]');
        updateAllViews();
        updateStats();
    } finally {
        toggleLoading(false);
    }
}

async function saveCustomer(customer) {
    // Save to Google Sheets
    try {
        const formData = new FormData();
        formData.append('name', customer.name);
        formData.append('phone', customer.phone);
        formData.append('address', customer.address);
        formData.append('product', customer.product);
        formData.append('price', customer.price);
        formData.append('date', customer.date);
        
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.log('Google Sheets save failed, saved to localStorage only');
    }
    
    // Save to localStorage as backup
    localStorage.setItem('heedMadeCustomers', JSON.stringify(allCustomers));
}

// ==================== CRUD Operations ====================
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
    
    // Phone validation
    const phoneRegex = /^(01[0125][0-9]{8}|(\+20|0020)?1[0125][0-9]{8})$/;
    if (!phoneRegex.test(customer.phone.replace(/[\s-]/g, ''))) {
        showMessage('رقم الهاتف غير صحيح', 'error');
        return;
    }
    
    toggleLoading(true);
    
    try {
        allCustomers.unshift(customer);
        await saveCustomer(customer);
        
        updateAllViews();
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

function showDeleteModal(id) {
    deleteCustomerId = id;
    deleteModal.style.display = 'flex';
}

function closeDeleteModal() {
    deleteModal.style.display = 'none';
    deleteCustomerId = null;
}

async function executeDelete() {
    if (!deleteCustomerId) return;
    
    toggleLoading(true);
    try {
        allCustomers = allCustomers.filter(c => c.id !== deleteCustomerId);
        localStorage.setItem('heedMadeCustomers', JSON.stringify(allCustomers));
        
        updateAllViews();
        updateStats();
        showMessage('تم حذف العميل بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting customer:', error);
        showMessage('حدث خطأ في حذف العميل', 'error');
    } finally {
        toggleLoading(false);
        closeDeleteModal();
    }
}

// ==================== UI Updates ====================
function updateAllViews(customers = allCustomers) {
    updateTableView(customers);
    updateMobileCards(customers);
    
    if (customers.length === 0) {
        noData.style.display = 'block';
        document.querySelector('.desktop-view').style.display = 'none';
        document.querySelector('.mobile-view').style.display = 'none';
    } else {
        noData.style.display = 'none';
        if (window.innerWidth > 768) {
            document.querySelector('.desktop-view').style.display = 'block';
            document.querySelector('.mobile-view').style.display = 'none';
        } else {
            document.querySelector('.desktop-view').style.display = 'none';
            document.querySelector('.mobile-view').style.display = 'block';
        }
    }
}

function updateTableView(customers) {
    tableBody.innerHTML = '';
    
    customers.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${customer.name}</strong></td>
            <td dir="ltr" style="text-align: right;">${customer.phone}</td>
            <td>${customer.address}</td>
            <td>${customer.product}</td>
            <td><strong>${formatCurrency(customer.price)}</strong></td>
            <td>${formatDate(customer.date)}</td>
            <td>
                <button class="btn-delete" onclick="showDeleteModal(${customer.id})">
                    🗑️
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateMobileCards(customers) {
    mobileCards.innerHTML = '';
    
    customers.forEach((customer, index) => {
        const card = document.createElement('div');
        card.className = 'customer-card';
        card.innerHTML = `
            <div class="customer-card-header">
                <div class="customer-card-name">#${index + 1} - ${customer.name}</div>
                <div class="customer-card-date">📅 ${formatDate(customer.date)}</div>
            </div>
            <div class="customer-card-details">
                <div class="detail-item">
                    <span class="detail-label">📱 رقم الهاتف</span>
                    <span class="detail-value" dir="ltr">${customer.phone}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">📍 العنوان</span>
                    <span class="detail-value">${customer.address}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">🎁 المنتج</span>
                    <span class="detail-value">${customer.product}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">💵 السعر</span>
                    <span class="detail-value price">${formatCurrency(customer.price)}</span>
                </div>
            </div>
            <div class="customer-card-footer">
                <button class="btn-delete" onclick="showDeleteModal(${customer.id})">
                    🗑️ حذف
                </button>
            </div>
        `;
        mobileCards.appendChild(card);
    });
}

function updateStats() {
    totalCustomers.textContent = allCustomers.length;
    const total = allCustomers.reduce((sum, c) => sum + parseFloat(c.price || 0), 0);
    totalSales.textContent = formatCurrency(total);
}

// ==================== Search & Filter ====================
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        applyFilter();
        return;
    }
    
    const filtered = allCustomers.filter(customer => 
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.product.toLowerCase().includes(query) ||
        customer.address.toLowerCase().includes(query)
    );
    
    updateAllViews(filtered);
}

function handleClearSearch() {
    searchInput.value = '';
    applyFilter();
}

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
    
    updateAllViews(filtered);
}

// ==================== Export ====================
function exportToExcel() {
    if (allCustomers.length === 0) {
        showMessage('لا يوجد بيانات للتصدير', 'warning');
        return;
    }
    
    let csv = 'الاسم,رقم الهاتف,العنوان,المنتج,السعر,التاريخ\n';
    allCustomers.forEach(c => {
        csv += `"${c.name}","${c.phone}","${c.address}","${c.product}",${c.price},"${c.date}"\n`;
    });
    
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

// ==================== Toast Messages ====================
function showMessage(text, type) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800'
    };
    toast.style.background = colors[type] || colors.success;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Handle Window Resize ====================
window.addEventListener('resize', () => {
    if (allCustomers.length > 0) {
        if (window.innerWidth > 768) {
            document.querySelector('.desktop-view').style.display = 'block';
            document.querySelector('.mobile-view').style.display = 'none';
        } else {
            document.querySelector('.desktop-view').style.display = 'none';
            document.querySelector('.mobile-view').style.display = 'block';
        }
    }
});