// Inventory data structure
const inventory = {
    sections: {
        'KÜHLSCHRANK': { items: [], einkaufe: 4 },
        'NULL-GRAD-ZONE': { items: [], einkaufe: 1 },
        'GEFRIERSCHRANK': { items: [], einkaufe: 1 },
        'LEBENSMITTEL-VORRAT': { items: [], einkaufe: 0 }
    }
};

// DOM Elements
const modals = {
    scan: document.getElementById('scanModal'),
    addItem: document.getElementById('addItemModal')
};

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    // Scan icons
    document.querySelectorAll('.scan-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = e.target.closest('.item');
            openScanModal(item);
        });
    });

    // Items
    document.querySelectorAll('.item').forEach(item => {
        item.addEventListener('click', () => handleItemClick(item));
    });

    // Section headers
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
    });

    // Navigation
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => handleNavigation(button));
    });

    // Add item form
    document.getElementById('addItemForm')?.addEventListener('submit', handleAddItem);

    // Close buttons
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });
}

function handleItemClick(item) {
    // Visual feedback
    item.style.backgroundColor = '#f5f5f5';
    setTimeout(() => {
        item.style.backgroundColor = '';
    }, 200);

    // Show item details or edit
    const itemName = item.querySelector('.item-name').textContent;
    const section = item.dataset.section;
    console.log(`Clicked ${itemName} in ${section}`);
}

function openScanModal(item) {
    const modal = document.getElementById('scanModal');
    modal.classList.add('active');
    
    // Simulate scanning
    setTimeout(() => {
        closeModal('scanModal');
        // Show feedback
        item.style.backgroundColor = '#e8f0fe';
        setTimeout(() => {
            item.style.backgroundColor = '';
        }, 500);
    }, 2000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function toggleSection(header) {
    const section = header.closest('.section');
    const itemList = section.querySelector('.item-list');
    const isHidden = itemList.style.display === 'none';
    
    itemList.style.display = isHidden ? 'block' : 'none';
    header.style.opacity = isHidden ? '1' : '0.7';
}

function handleNavigation(button) {
    // Remove active class from all buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Handle view change
    const isVorrat = button.textContent.includes('Vorrat');
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = isVorrat ? 'block' : 'none';
    });
}

function handleAddItem(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const section = formData.get('section');
    const name = formData.get('name');
    const expiryDays = formData.get('expiryDays');
    
    // Add item to inventory
    const newItem = {
        name: name,
        section: section,
        expiryDays: expiryDays ? parseInt(expiryDays) : null,
        purchaseDate: new Date()
    };
    
    console.log('Adding new item:', newItem);
    
    // Close modal
    closeModal('addItemModal');
    e.target.reset();
}

// Helper function to format dates
function formatDate(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'Heute';
    if (diff === 1) return 'Gestern';
    return `Vor ${diff} Tagen`;
}

// Helper function to update item status
function updateItemStatus(item, status) {
    const statusElement = item.querySelector('.item-status');
    statusElement.textContent = status;
    
    // Update status classes
    statusElement.classList.remove('status-fresh', 'status-warning', 'status-expired');
    if (status.includes('verbleibend')) {
        statusElement.classList.add('status-fresh');
    } else if (status.includes('Ablaufdatum')) {
        statusElement.classList.add('status-warning');
    }
}
