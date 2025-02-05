// Barcode Scanner Funktionen
let quaggaInstance = null;

function openScanner() {
    const modal = document.getElementById('scannerModal');
    modal.classList.add('active');
    
    initQuagga();
}

function closeScanner() {
    const modal = document.getElementById('scannerModal');
    modal.classList.remove('active');
    
    if (quaggaInstance) {
        Quagga.stop();
        quaggaInstance = null;
    }
}

function initQuagga() {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: "#interactive",
            constraints: {
                facingMode: "environment"
            },
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader"]
        }
    }, function(err) {
        if (err) {
            console.error(err);
            showNotification('Kamera konnte nicht initialisiert werden', 'error');
            return;
        }
        quaggaInstance = true;
        Quagga.start();
    });

    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        document.getElementById('productCode').value = code;
        
        // Prüfen ob der Code bereits in der Datenbank existiert
        checkProductCode(code);
        
        // Scanner schließen
        closeScanner();
    });
}

function toggleFlash() {
    if (!quaggaInstance) return;
    
    const track = Quagga.CameraAccess.getActiveTrack();
    if (track && track.getCapabilities().torch) {
        const flashButton = document.querySelector('.flash-button');
        const torchState = !flashButton.classList.contains('active');
        
        track.applyConstraints({
            advanced: [{ torch: torchState }]
        });
        
        flashButton.classList.toggle('active');
    } else {
        showNotification('Blitz wird nicht unterstützt', 'warning');
    }
}

function checkProductCode(code) {
    const inventoryRef = firebase.database().ref('inventory');
    inventoryRef.orderByChild('productCode').equalTo(code).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const item = Object.values(snapshot.val())[0];
                showNotification(`Produkt "${item.name}" gefunden!`, 'success');
                
                // Popup zum Hinzufügen zur Einkaufsliste anzeigen
                showAddToShoppingListPopup(item);
            }
        })
        .catch((error) => {
            console.error('Error checking product code:', error);
            showNotification('Fehler beim Prüfen des Produktcodes', 'error');
        });
}

function showAddToShoppingListPopup(item) {
    const popup = document.createElement('div');
    popup.className = 'notification add-to-list';
    popup.innerHTML = `
        <div class="add-to-list-content">
            <span>${item.name} zur Einkaufsliste hinzufügen?</span>
            <div class="add-to-list-buttons">
                <button onclick="addToShoppingList('${item.id}')">Ja</button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()">Nein</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Popup nach 10 Sekunden automatisch ausblenden
    setTimeout(() => {
        if (popup.parentElement) {
            popup.remove();
        }
    }, 10000);
}

function addToShoppingList(itemId) {
    const inventoryRef = firebase.database().ref('inventory').child(itemId);
    inventoryRef.once('value')
        .then((snapshot) => {
            const item = snapshot.val();
            if (item) {
                const productInput = document.getElementById('productInput');
                productInput.value = `${item.quantity}${item.unit} ${item.name}`;
                addProduct(); // Vorhandene Funktion zum Hinzufügen zur Einkaufsliste
                
                // Zur Einkaufsliste wechseln
                switchPage('shoppingListPage', document.querySelector('.nav-item'));
            }
        })
        .catch((error) => {
            console.error('Error adding to shopping list:', error);
            showNotification('Fehler beim Hinzufügen zur Einkaufsliste', 'error');
        });
}

// Bestehende Funktionen aktualisieren

function addInventoryItem() {
    const name = document.getElementById('inventoryInput').value;
    const quantity = document.getElementById('itemQuantity').value;
    const unit = document.getElementById('itemUnit').value;
    const mhd = document.getElementById('itemMhd').value;
    const location = document.getElementById('itemLocation').value;
    const productCode = document.getElementById('productCode').value;

    if (!name || !quantity || !mhd || !location) {
        showNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
        return;
    }

    const item = {
        id: Date.now(),
        name,
        quantity: parseFloat(quantity),
        unit,
        mhd,
        location,
        productCode,
        createdAt: new Date().toISOString()
    };

    saveInventoryItem(item)
        .then(() => {
            showNotification(`${name} wurde hinzugefügt`, 'success');
            clearInventoryForm();
            toggleInventoryForm();
        })
        .catch(error => {
            console.error('Error saving item:', error);
            showNotification('Fehler beim Speichern des Artikels', 'error');
        });
}

function clearInventoryForm() {
    document.getElementById('inventoryInput').value = '';
    document.getElementById('itemQuantity').value = '';
    document.getElementById('itemUnit').value = 'stk';
    document.getElementById('itemMhd').value = '';
    document.getElementById('itemLocation').value = '';
    document.getElementById('productCode').value = '';
    editingItemId = null;
    updateSubmitButton();
}

const firebaseConfig = {
    apiKey: "AIzaSyB6FaJir2q31UF9BbXCLfSEl-2LxxJBO3U",
    authDomain: "magnetkuechencenter.firebaseapp.com",
    databaseURL: "https://magnetkuechencenter-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "magnetkuechencenter",
    storageBucket: "magnetkuechencenter.firebasestorage.app",
    messagingSenderId: "22713316007",
    appId: "1:22713316007:web:fc5e45dcab720771d02182",
    measurementId: "G-5LW8DE5MS"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let selectedKey = null;
let currentDelta = 0;

function updateBudget(newValue) {
    const budgetValue = parseFloat(newValue.replace(',', '.'));
    
    if (!isNaN(budgetValue) && budgetValue >= 0) {
        database.ref('budget').set(budgetValue)
            .catch((error) => {
                alert('Fehler beim Speichern: ' + error.message);
            });
    } else {
        alert('Bitte einen gültigen positiven Zahlenwert eingeben!');
        updateBudgetDisplay();
    }
}

function updateBudgetDisplay() {
    database.ref('budget').once('value').then(snapshot => {
        const budget = snapshot.val() || 0;
        document.getElementById('budgetAmount').value = budget.toFixed(2);
        updateTotalDisplay();
    });
}

function parseInput(input) {
    if (!input || input.trim() === '') {
        return null;
    }

    const match = input.match(/^(\d+[,.]?\d*)\s*([a-zA-Z]{0,3})?\s*(.+?)(\s+(\d+[,.]?\d*))?$/);
    if (!match) {
        return null;
    }

    let unit = match[2]?.toLowerCase() || 'x';
    let quantity = parseFloat(match[1].replace(',', '.')) || 1;
    let namePart = match[3]?.trim() || '';
    let price = match[5]?.replace(',', '.') || null;

    if (!price) {
        const parts = namePart.split(/\s+/);
        const lastPart = parts[parts.length - 1];
        if (/^\d+([.,]\d{1,2})?$/.test(lastPart)) {
            price = lastPart.replace(',', '.');
            namePart = parts.slice(0, -1).join(' ');
        }
    }

    if (!namePart) {
        return null;
    }

    const units = { 'g': 'g', 'kg': 'kg', 'l': 'l', 'ml': 'ml', 'x': 'x', 'stk': 'x' };
    const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    
    return {
        value: quantity,
        unit: units[unit] || 'x',
        name: capitalizedName,
        price: price ? parseFloat(price) : null,
        category: 'sonstiges',
        completed: false,
        timestamp: Date.now()
    };
}

// Emoji-Mapping für Produkte
function getProductEmoji(name) {
    return '';
}

function createListItem(key, item) {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.dataset.key = key;

    // Format quantity
    const quantity = item.unit ? `${item.value}${item.unit}` : `${item.value}×`;

    div.innerHTML = `
        <div class="item-content">
            <div class="item-details">
                <div class="quantity-display">${quantity}</div>
                <span class="product-name">${item.name}</span>
                ${item.price !== null ? 
                    `<span class="product-price" onclick="event.stopPropagation(); promptPrice('${key}')">${item.price.toFixed(2)} €</span>` : 
                    `<span class="product-price" onclick="event.stopPropagation(); promptPrice('${key}')">+ Preis</span>`}
                <i class="fa-regular fa-trash-can delete-icon" onclick="event.stopPropagation(); deleteItem('${key}')"></i>
            </div>
        </div>
    `;

    // Add click event for completing item
    div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('product-price') && !e.target.classList.contains('delete-icon')) {
            // Add a quick scale animation when clicked
            div.style.transform = 'scale(0.95)';
            setTimeout(() => {
                div.style.transform = '';
                toggleCompleted(key, !item.completed);
            }, 150);
        }
    });

    return div;
}

function deleteItem(key) {
    if (confirm('Möchten Sie dieses Produkt wirklich löschen?')) {
        database.ref('items/' + key).remove()
            .then(() => {
                // The list will automatically update through the Firebase listener
            })
            .catch(error => {
                alert('Fehler beim Löschen: ' + error.message);
            });
    }
}

function toggleCompleted(key, completed) {
    const item = document.querySelector(`[data-key="${key}"]`);
    if (!item) return;

    // Get the target list
    const targetList = completed ? 
        document.getElementById('completedList') : 
        document.getElementById('activeList');

    // Calculate positions for animation
    const itemRect = item.getBoundingClientRect();
    const targetRect = targetList.getBoundingClientRect();
    
    // Create a clone for the animation
    const clone = item.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = itemRect.top + 'px';
    clone.style.left = itemRect.left + 'px';
    clone.style.width = itemRect.width + 'px';
    clone.style.height = itemRect.height + 'px';
    clone.style.transition = 'all 0.3s ease';
    clone.style.zIndex = '1000';
    document.body.appendChild(clone);

    // Hide original item
    item.style.opacity = '0';

    // Start animation
    requestAnimationFrame(() => {
        let targetY = completed ? 
            targetRect.top + targetList.scrollTop : 
            targetRect.top;
        
        clone.style.transform = `translateY(${targetY - itemRect.top}px)`;
        clone.style.opacity = '0';

        // Update database and remove clone after animation
        setTimeout(() => {
            database.ref('items/' + key).update({ completed })
                .then(() => {
                    clone.remove();
                    renderLists(items);
                });
        }, 300);
    });
}

function renderLists(items) {
    const activeList = document.getElementById('activeList');
    const completedList = document.getElementById('completedList');
    
    // Clear existing lists
    activeList.innerHTML = '';
    completedList.innerHTML = '';

    // Add heading for completed list with count
    const completedItems = Object.values(items || {}).filter(item => item.completed);
    const completedHeading = document.querySelector('h3[data-type="completed"]');
    if (completedHeading) {
        completedHeading.textContent = `Im Einkaufswagen (${completedItems.length})`;
    }
    
    // Sort items by timestamp
    const sortedItems = Object.entries(items || {}).sort((a, b) => {
        // First sort by completed status
        if (a[1].completed !== b[1].completed) {
            return a[1].completed ? 1 : -1;
        }
        // Then by timestamp
        return b[1].timestamp - a[1].timestamp;
    });
    
    sortedItems.forEach(([key, item]) => {
        const listItem = createListItem(key, item);
        if (item.completed) {
            completedList.appendChild(listItem);
        } else {
            activeList.appendChild(listItem);
        }
    });

    // Update empty states
    if (activeList.children.length === 0) {
        activeList.innerHTML = '<div class="empty-state">Keine Produkte in der Liste</div>';
    }
    if (completedList.children.length === 0) {
        completedList.innerHTML = '<div class="empty-state">Keine Produkte im Einkaufswagen</div>';
    }

    updateTotalDisplay();
}

function updateBudgetOverflowProducts(items) {
    const budget = parseFloat(document.getElementById('budgetAmount').value) || 0;
    let runningTotal = 0;
    const itemElements = document.querySelectorAll('.list-item');

    // First remove all overflow classes
    itemElements.forEach(item => item.classList.remove('budget-overflow'));

    // If we're under budget, no need to mark anything
    if (runningTotal <= budget) return;

    // Calculate running total and mark items that push us over budget
    itemElements.forEach(item => {
        const priceElement = item.querySelector('.product-price');
        if (priceElement) {
            const price = parseFloat(priceElement.textContent) || 0;
            runningTotal += price;
            
            if (runningTotal > budget) {
                item.classList.add('budget-overflow');
            }
        }
    });
}

function calculateTotal() {
    const items = document.querySelectorAll('#completedList .list-item');
    return Array.from(items).reduce((acc, item) => {
        const priceElement = item.querySelector('.product-price');
        return priceElement ? acc + parseFloat(priceElement.textContent) : acc;
    }, 0);
}

function findProductsToRemove(items, budget) {
    let totalCompleted = 0;
    const completedItems = [];

    // First, calculate total and collect completed items
    Object.entries(items).forEach(([key, item]) => {
        if (item.completed) {
            totalCompleted += parseFloat(item.price);
            completedItems.push({ key, ...item });
        }
    });

    // If we're under budget, no need to remove anything
    if (totalCompleted <= budget) {
        return [];
    }

    // Sort completed items by price (highest first)
    completedItems.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

    const itemsToRemove = [];
    let currentTotal = totalCompleted;

    // Find items to remove until we're under budget
    for (const item of completedItems) {
        if (currentTotal > budget) {
            itemsToRemove.push(item.key);
            currentTotal -= parseFloat(item.price);
        } else {
            break;
        }
    }

    return itemsToRemove;
}

function updateTotalDisplay() {
    database.ref('budget').once('value').then(snapshot => {
        const budget = snapshot.val() || 0;
        
        database.ref('items').once('value').then(itemsSnapshot => {
            const items = itemsSnapshot.val() || {};
            let totalCompleted = 0;
            let totalPending = 0;
            
            Object.values(items).forEach(item => {
                const price = parseFloat(item.price) || 0;
                if (item.completed) {
                    totalCompleted += price;
                } else {
                    totalPending += price;
                }
            });

            document.getElementById('budgetAmount').value = budget.toFixed(2);
            
            const totalElement = document.getElementById('totalAmount');
            totalElement.textContent = totalCompleted.toFixed(2);
            totalElement.title = `Ausstehend: ${totalPending.toFixed(2)}€`;
            
            const remaining = budget - totalCompleted;
            const remainingElement = document.getElementById('remainingAmount');
            remainingElement.textContent = remaining.toFixed(2);
            remainingElement.className = remaining >= 0 ? 'positive' : 'negative';

            // Remove old suggested-remove classes
            document.querySelectorAll('.suggested-remove').forEach(el => {
                el.classList.remove('suggested-remove');
            });

            // If we're over budget, mark items that should be removed
            if (remaining < 0) {
                const itemsToRemove = findProductsToRemove(items, budget);
                itemsToRemove.forEach(key => {
                    const element = document.querySelector(`[data-key="${key}"]`);
                    if (element) {
                        element.classList.add('suggested-remove');
                    }
                });
            }
        });
    });
}

function promptPrice(key) {
    const itemElement = document.querySelector(`.list-item[data-key="${key}"]`);
    if (!itemElement) return;

    // Entferne vorhandene Popups
    const existingPopup = document.querySelector('.price-edit-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Hole aktuellen Preis
    database.ref(`items/${key}`).once('value').then(snapshot => {
        const item = snapshot.val();
        const currentPrice = item?.price || 0;

        // Erstelle Popup
        const popup = document.createElement('div');
        popup.className = 'price-edit-popup';
        popup.innerHTML = `
            <button class="decrease">-</button>
            <input type="number" step="0.1" min="0" value="${currentPrice.toFixed(2)}">
            <button class="increase">+</button>
        `;

        // Füge Event Listener hinzu
        const input = popup.querySelector('input');
        const decreaseBtn = popup.querySelector('.decrease');
        const increaseBtn = popup.querySelector('.increase');

        decreaseBtn.addEventListener('click', () => {
            let value = parseFloat(input.value) || 0;
            value = Math.max(0, value - 0.5);
            input.value = value.toFixed(2);
        });

        increaseBtn.addEventListener('click', () => {
            let value = parseFloat(input.value) || 0;
            value += 0.5;
            input.value = value.toFixed(2);
        });

        // Speichere bei Enter oder wenn Input den Fokus verliert
        const savePrice = () => {
            const price = parseFloat(input.value) || 0;
            database.ref(`items/${key}`).update({ price });
            popup.remove();
        };

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                savePrice();
            }
        });

        input.addEventListener('blur', savePrice);

        // Verhindere Klick-Propagation
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Füge Popup zum Element hinzu
        itemElement.appendChild(popup);
        input.focus();
        input.select();
    });
}

function submitPrice() {
    const priceInput = document.getElementById('priceInput');
    const price = parseFloat(priceInput.value);
    
    if (!isNaN(price)) {
        database.ref(`items/${selectedKey}`).update({ price })
            .then(() => {
                document.getElementById('pricePopup').style.display = 'none';
                priceInput.value = '';
            })
            .catch((error) => {
                alert('Fehler beim Speichern: ' + error.message);
            });
    }
}

function addItem() {
    const input = document.getElementById('productInput');
    const errorMessage = document.getElementById('errorMessage');
    const parsed = parseInput(input.value);

    input.classList.remove('error');
    errorMessage.style.display = 'none';

    if (!parsed) {
        input.classList.add('error');
        errorMessage.textContent = "Bitte geben Sie eine gültige Eingabe ein (z.B. 3x Äpfel 2.50)";
        errorMessage.style.display = 'block';
        input.focus();
        return;
    }

    if (parsed.price === null || isNaN(parsed.price)) {
        input.classList.add('error');
        errorMessage.textContent = "Bitte einen gültigen Preis angeben (z.B. 3x Äpfel 2.50)";
        errorMessage.style.display = 'block';
        input.focus();
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
            input.classList.remove('error');
        }, 5000);
        return;
    }
    
    database.ref('items').push(parsed)
        .then(() => {
            input.value = '';
            input.focus();
        })
        .catch(error => {
            errorMessage.textContent = "Fehler beim Speichern: " + error.message;
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        });
}

// Page Switching
function switchPage(pageId, navItem) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    navItem.classList.add('active');
    
    // Show/hide budget details based on page
    const budgetWrapper = document.querySelector('.budget-wrapper');
    if (pageId === 'inventoryPage') {
        budgetWrapper.style.display = 'none';
    } else {
        budgetWrapper.style.display = 'block';
    }
}

// Benachrichtigungsfunktion
function showNotification(message, type = 'info') {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.insertBefore(container, document.querySelector('.bottom-nav'));
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Automatisch nach oben scrollen wenn neue Benachrichtigung hinzugefügt wird
    if (container.children.length > 0) {
        container.insertBefore(notification, container.firstChild);
    } else {
        container.appendChild(notification);
    }

    // Benachrichtigung nach 3 Sekunden ausblenden
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            notification.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

let editingItemId = null;

function toggleInventoryForm() {
    const form = document.querySelector('.inventory-form');
    const toggleButton = document.getElementById('toggleFormButton');
    form.classList.toggle('collapsed');
    
    // Button-Text ändern
    if (form.classList.contains('collapsed')) {
        toggleButton.innerHTML = '➕ Neuer Artikel';
        // Formular zurücksetzen beim Schließen
        clearInventoryForm();
    } else {
        toggleButton.innerHTML = '✖️ Schließen';
    }
}

function handleInventorySubmit() {
    if (editingItemId) {
        updateInventoryItem();
    } else {
        addInventoryItem();
    }
}

function updateInventoryItem() {
    const name = document.getElementById('inventoryInput').value;
    const quantity = document.getElementById('itemQuantity').value;
    const unit = document.getElementById('itemUnit').value;
    const mhd = document.getElementById('itemMhd').value;
    const location = document.getElementById('itemLocation').value;

    if (!name || !quantity || !mhd || !location) {
        showNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
        return;
    }

    const item = {
        id: editingItemId,
        name,
        quantity: parseFloat(quantity),
        unit,
        mhd,
        location,
        updatedAt: new Date().toISOString()
    };

    const inventoryRef = firebase.database().ref('inventory');
    inventoryRef.child(editingItemId).update(item)
        .then(() => {
            showNotification(`${name} wurde aktualisiert`, 'success');
            clearInventoryForm();
            toggleInventoryForm();
            editingItemId = null;
            updateSubmitButton();
        })
        .catch(error => {
            console.error('Error updating item:', error);
            showNotification('Fehler beim Aktualisieren des Artikels', 'error');
        });
}

function addInventoryItem() {
    const name = document.getElementById('inventoryInput').value;
    const quantity = document.getElementById('itemQuantity').value;
    const unit = document.getElementById('itemUnit').value;
    const mhd = document.getElementById('itemMhd').value;
    const location = document.getElementById('itemLocation').value;
    const productCode = document.getElementById('productCode').value;

    if (!name || !quantity || !mhd || !location) {
        showNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
        return;
    }

    const item = {
        id: Date.now(),
        name,
        quantity: parseFloat(quantity),
        unit,
        mhd,
        location,
        productCode,
        createdAt: new Date().toISOString()
    };

    saveInventoryItem(item)
        .then(() => {
            showNotification(`${name} wurde hinzugefügt`, 'success');
            clearInventoryForm();
            toggleInventoryForm();
        })
        .catch(error => {
            console.error('Error saving item:', error);
            showNotification('Fehler beim Speichern des Artikels', 'error');
        });
}

function editInventoryItem(id) {
    const inventoryRef = firebase.database().ref('inventory').child(id);
    inventoryRef.once('value')
        .then(snapshot => {
            const item = snapshot.val();
            if (!item) {
                showNotification('Artikel nicht gefunden', 'error');
                return;
            }

            editingItemId = id;
            document.getElementById('inventoryInput').value = item.name;
            document.getElementById('itemQuantity').value = item.quantity;
            document.getElementById('itemUnit').value = item.unit;
            document.getElementById('itemMhd').value = item.mhd;
            document.getElementById('itemLocation').value = item.location;

            // Formular öffnen und Button-Text aktualisieren
            const form = document.querySelector('.inventory-form');
            form.classList.remove('collapsed');
            updateSubmitButton();
            
            // Toggle-Button Text aktualisieren
            const toggleButton = document.getElementById('toggleFormButton');
            toggleButton.innerHTML = '✖️ Schließen';
        })
        .catch(error => {
            console.error('Error editing item:', error);
            showNotification('Fehler beim Laden des Artikels', 'error');
        });
}

function updateSubmitButton() {
    const submitButton = document.getElementById('submitButton');
    if (editingItemId) {
        submitButton.innerHTML = '<i class="fas fa-save"></i><span>Speichern</span>';
    } else {
        submitButton.innerHTML = '<i class="fas fa-plus"></i><span>Artikel hinzufügen</span>';
    }
}

function clearInventoryForm() {
    document.getElementById('inventoryInput').value = '';
    document.getElementById('itemQuantity').value = '';
    document.getElementById('itemUnit').value = 'stk';
    document.getElementById('itemMhd').value = '';
    document.getElementById('itemLocation').value = '';
    document.getElementById('productCode').value = '';
    editingItemId = null;
    updateSubmitButton();
}

function saveInventoryItem(item) {
    const inventoryRef = firebase.database().ref('inventory');
    return inventoryRef.child(item.id).set(item);
}

function deleteInventoryItem(id, showNotif = true) {
    const inventoryRef = firebase.database().ref('inventory').child(id);
    
    inventoryRef.once('value')
        .then(snapshot => {
            const item = snapshot.val();
            return inventoryRef.remove()
                .then(() => {
                    if (showNotif && item) {
                        showNotification(`${item.name} wurde gelöscht`, 'success');
                    }
                });
        })
        .catch(error => {
            console.error('Error deleting item:', error);
            if (showNotif) {
                showNotification('Fehler beim Löschen des Artikels', 'error');
            }
        });
}

// Überprüfung der ablaufenden Produkte
function checkExpiringProducts() {
    const inventoryRef = firebase.database().ref('inventory');
    try {
        inventoryRef.once('value')
            .then(snapshot => {
                const inventory = snapshot.val() || {};
                const today = new Date();
                
                Object.values(inventory).forEach(item => {
                    const mhdDate = new Date(item.mhd);
                    const daysUntilExpiry = Math.ceil((mhdDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntilExpiry <= 0) {
                        showNotification(`${item.name} ist abgelaufen!`, 'error');
                    } else if (daysUntilExpiry <= 3) {
                        showNotification(`${item.name} läuft in ${daysUntilExpiry} Tagen ab!`, 'warning');
                    }
                });
            });
    } catch (error) {
        console.error('Fehler bei der Überprüfung der ablaufenden Produkte:', error);
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebaseInventory();
    
    // Überprüfe die Produkte alle 12 Stunden
    setInterval(checkExpiringProducts, 12 * 60 * 60 * 1000);
    
    // Überprüfe die Produkte sofort beim Laden
    checkExpiringProducts();
});

// Firebase Inventory Management Functions
function initializeFirebaseInventory() {
    const inventoryRef = firebase.database().ref('inventory');
    
    // Listen for changes in the inventory
    inventoryRef.on('value', (snapshot) => {
        renderInventoryList(snapshot.val() || {});
    });
}

function getInventory(callback) {
    const inventoryRef = firebase.database().ref('inventory');
    inventoryRef.once('value')
        .then(snapshot => {
            const inventory = snapshot.val() || {};
            callback(Object.values(inventory));
        })
        .catch(error => {
            console.error('Error getting inventory:', error);
            callback([]);
        });
}

function renderInventoryList(inventoryData) {
    const inventoryList = document.getElementById('inventoryList');
    const inventory = Object.values(inventoryData);
    
    // Sort by MHD (earliest first)
    inventory.sort((a, b) => new Date(a.mhd) - new Date(b.mhd));

    inventoryList.innerHTML = inventory.map(item => {
        const mhdDate = new Date(item.mhd);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((mhdDate - today) / (1000 * 60 * 60 * 24));
        
        let mhdClass = '';
        if (daysUntilExpiry < 0) {
            mhdClass = 'mhd-expired';
        } else if (daysUntilExpiry <= 7) {
            mhdClass = 'mhd-warning';
        }

        return `
            <div class="inventory-item" data-id="${item.id}">
                <div class="inventory-item-main">
                    <div class="inventory-item-name">${item.name}</div>
                    <div class="inventory-item-details">
                        <span class="inventory-item-detail">
                            <i class="fas fa-box"></i>
                            ${item.quantity} ${item.unit}
                        </span>
                        <span class="inventory-item-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            ${item.location}
                        </span>
                        <span class="inventory-item-detail ${mhdClass}">
                            <i class="fas fa-calendar-alt"></i>
                            ${formatDate(item.mhd)} ${getMhdStatus(daysUntilExpiry)}
                        </span>
                    </div>
                </div>
                <div class="inventory-item-actions">
                    <button class="inventory-item-button" onclick="editInventoryItem('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="inventory-item-button" onclick="deleteInventoryItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function getMhdStatus(days) {
    if (days < 0) {
        return '(Abgelaufen)';
    } else if (days === 0) {
        return '(Läuft heute ab)';
    } else if (days === 1) {
        return '(Morgen)';
    } else if (days <= 7) {
        return `(Noch ${days} Tage)`;
    }
    return '';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('dark-mode');
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.price-popup')) {
            document.getElementById('pricePopup').style.display = 'none';
        }
    });

    document.getElementById('productInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') addItem();
    });

    document.getElementById('productInput').addEventListener('input', () => {
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('productInput').classList.remove('error');
    });

    // Firebase Listeners
    database.ref('budget').on('value', (snapshot) => {
        const budget = snapshot.val() || 0;
        document.getElementById('budgetAmount').value = budget.toFixed(2);
        updateTotalDisplay();
    });

    database.ref('items').on('value', (snapshot) => {
        const items = snapshot.val();
        renderLists(items);
        updateTotalDisplay();
    });

    // Budget toggle functionality
    const budgetToggle = document.querySelector('.budget-toggle');
    const budgetDisplay = document.querySelector('.budget-display');
    
    // Check if there's a saved state
    const isCollapsed = localStorage.getItem('budgetDisplayCollapsed') === 'true';
    if (isCollapsed) {
        budgetToggle.classList.add('collapsed');
        budgetDisplay.classList.add('collapsed');
    }
    
    budgetToggle.addEventListener('click', () => {
        budgetToggle.classList.toggle('collapsed');
        budgetDisplay.classList.toggle('collapsed');
        // Save the state
        localStorage.setItem('budgetDisplayCollapsed', budgetDisplay.classList.contains('collapsed'));
    });
});
