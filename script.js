document.addEventListener("DOMContentLoaded", function() {
    // 1. Penghitung Jumlah Pengunjung Nyata (CountAPI Publik + Fallback)
    const visitorEl = document.getElementById("visitorCount");
    if (visitorEl) {
        const hasVisitedSession = sessionStorage.getItem("umkm_session_visited");
        const endpoint = hasVisitedSession 
            ? "https://api.counterapi.dev/v1/kuliner-nusantara-umkm/visits" 
            : "https://api.counterapi.dev/v1/kuliner-nusantara-umkm/visits/up";

        fetch(endpoint)
            .then(res => res.json())
            .then(data => {
                if (data && typeof data.count === "number") {
                    visitorEl.textContent = data.count.toLocaleString("id-ID");
                    sessionStorage.setItem("umkm_session_visited", "true");
                }
            })
            .catch(() => {
                visitorEl.textContent = "1";
            });
    }

    // 2. Status Autentikasi Admin
    let isAdminLoggedIn = sessionStorage.getItem("umkm_admin_logged") === "true";

    function updateAdminUIState() {
        const navText = document.getElementById("adminNavText");
        if (navText) {
            navText.textContent = isAdminLoggedIn ? "Admin (Logout)" : "Login Admin";
        }
        processTableStocks();
    }

    // 3. Kalkulasi Status Stok & Fitur Edit Stok Admin
    function processTableStocks() {
        const rows = document.querySelectorAll(".data-table tbody tr");
        rows.forEach((row) => {
            const stockCell = row.querySelector(".stock-cell");
            const statusBadge = row.querySelector(".status-badge");
            const actionCell = row.querySelector(".action-cell");
            const prodId = row.getAttribute("data-id");
            
            if (stockCell) {
                const rawStock = stockCell.getAttribute("data-raw-stock") || stockCell.textContent.trim();
                const stockNum = parseInt(rawStock.replace(/[^0-9]/g, '')) || 0;
                const unitName = rawStock.replace(/[0-9]/g, '').trim() || 'Pcs';

                if (!stockCell.getAttribute("data-raw-stock")) {
                    stockCell.setAttribute("data-raw-stock", stockNum + " " + unitName);
                }

                document.querySelectorAll(`.add-to-cart-btn[data-id="${prodId}"]`).forEach(b => {
                    b.setAttribute("data-stock", stockNum);
                });

                if (isAdminLoggedIn) {
                    stockCell.innerHTML = `
                        <div class="stock-edit-wrap">
                            <input type="number" class="stock-input" value="${stockNum}" min="0" data-id="${prodId || ''}">
                            <button class="btn-save-stock save-stock-btn" title="Simpan Stok"><i class="fa-solid fa-check"></i></button>
                        </div>
                    `;
                } else {
                    stockCell.textContent = stockNum + " " + unitName;
                }
                
                if (statusBadge) {
                    if (stockNum === 0) {
                        statusBadge.className = "status-badge outofstock";
                        statusBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Habis';
                        if (actionCell) {
                            actionCell.innerHTML = '<span class="btn-table-action disabled"><i class="fa-solid fa-ban"></i></span>';
                        }
                    } else if (stockNum <= 5) {
                        statusBadge.className = "status-badge warning";
                        statusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Menipis';
                        if (actionCell && actionCell.querySelector('.disabled')) {
                            restoreActionCell(row, actionCell, stockNum);
                        }
                    } else {
                        statusBadge.className = "status-badge available";
                        statusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Ready Fresh';
                        if (actionCell && actionCell.querySelector('.disabled')) {
                            restoreActionCell(row, actionCell, stockNum);
                        }
                    }
                }
            }
        });

        if (isAdminLoggedIn) {
            document.querySelectorAll(".save-stock-btn").forEach(btn => {
                btn.addEventListener("click", function() {
                    const wrap = this.closest(".stock-edit-wrap");
                    const input = wrap.querySelector(".stock-input");
                    const newStockVal = parseInt(input.value) || 0;
                    const row = this.closest("tr");
                    const stockCell = row.querySelector(".stock-cell");
                    const prodId = row.getAttribute("data-id");
                    
                    const currentText = stockCell.getAttribute("data-raw-stock") || "30 Box";
                    const unitName = currentText.replace(/[0-9]/g, '').trim() || 'Pcs';
                    stockCell.setAttribute("data-raw-stock", newStockVal + " " + unitName);

                    document.querySelectorAll(`.add-to-cart-btn[data-id="${prodId}"]`).forEach(b => {
                        b.setAttribute("data-stock", newStockVal);
                    });

                    processTableStocks();
                });
            });
        }
    }

    function restoreActionCell(row, actionCell, stockNum) {
        const id = row.getAttribute("data-id");
        const name = row.getAttribute("data-name");
        const price = row.getAttribute("data-price");
        const img = row.getAttribute("data-img");

        actionCell.innerHTML = `
            <button class="btn-table-action add-to-cart-btn" data-id="${id}" data-name="${name}" data-price="${price}" data-img="${img}" data-stock="${stockNum}" title="Masukan Keranjang">
                <i class="fa-solid fa-cart-plus"></i>
            </button>
        `;

        const newBtn = actionCell.querySelector(".add-to-cart-btn");
        if (newBtn) {
            newBtn.addEventListener("click", handleAddToCartClick);
        }
    }

    // 4. Modal Dialog & Login Admin (dengan Show/Hide Password)
    const customDialogOverlay = document.getElementById("customDialogOverlay");
    const customDialogBox = document.getElementById("customDialogBox");

    const adminLoginNavBtn = document.getElementById("adminLoginNavBtn");
    if (adminLoginNavBtn) {
        adminLoginNavBtn.addEventListener("click", function(e) {
            e.preventDefault();
            if (isAdminLoggedIn) {
                sessionStorage.removeItem("umkm_admin_logged");
                isAdminLoggedIn = false;
                updateAdminUIState();
                return;
            }

            customDialogBox.innerHTML = `
                <div class="custom-dialog-icon"><i class="fa-solid fa-user-shield"></i></div>
                <h3>Login Admin</h3>
                <p>Masukkan username dan password admin untuk mengedit stok.</p>
                <input type="text" id="adminUser" placeholder="Username" style="margin-bottom:8px;">
                <div style="position:relative; margin-bottom:1.2rem;">
                    <input type="password" id="adminPass" placeholder="Password" style="margin-bottom:0; padding-right:40px;">
                    <button type="button" id="togglePassBtn" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--dark-muted); cursor:pointer; font-size:1rem;" title="Tampilkan/Sembunyikan Password">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="custom-dialog-buttons">
                    <button class="custom-dialog-btn btn-dialog-cancel" id="dialogCancelBtn">Batal</button>
                    <button class="custom-dialog-btn btn-dialog-confirm" id="dialogLoginBtn">Login</button>
                </div>
            `;
            customDialogOverlay.classList.add("active");

            const passInput = document.getElementById("adminPass");
            const togglePassBtn = document.getElementById("togglePassBtn");
            if (togglePassBtn && passInput) {
                togglePassBtn.onclick = () => {
                    if (passInput.type === "password") {
                        passInput.type = "text";
                        togglePassBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
                    } else {
                        passInput.type = "password";
                        togglePassBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
                    }
                };
            }

            document.getElementById("dialogCancelBtn").onclick = () => customDialogOverlay.classList.remove("active");
            document.getElementById("dialogLoginBtn").onclick = () => {
                const u = document.getElementById("adminUser").value.trim();
                const p = document.getElementById("adminPass").value.trim();

                if (u === "yulio" && p === "admin123") {
                    sessionStorage.setItem("umkm_admin_logged", "true");
                    isAdminLoggedIn = true;
                    customDialogOverlay.classList.remove("active");
                    updateAdminUIState();
                } else {
                    const errMsg = document.createElement("p");
                    errMsg.style.color = "var(--accent)";
                    errMsg.style.fontSize = "0.8rem";
                    errMsg.style.fontWeight = "700";
                    errMsg.textContent = "Username atau password salah! (Gunakan yulio / admin123)";
                    if (!customDialogBox.querySelector(".login-err")) {
                        errMsg.className = "login-err";
                        customDialogBox.insertBefore(errMsg, customDialogBox.querySelector(".custom-dialog-buttons"));
                    }
                }
            };
        });
    }

    updateAdminUIState();

    // 5. Sistem Keranjang Belanja & Pengurangan Stok Otomatis
    let cart = [];

    const openCartBtn = document.getElementById("openCartBtn");
    const closeCartBtn = document.getElementById("closeCartBtn");
    const addMoreItemsBtn = document.getElementById("addMoreItemsBtn");
    const cartOverlay = document.getElementById("cartOverlay");
    const cartDrawer = document.getElementById("cartDrawer");
    const cartCounter = document.getElementById("cartCounter");
    const cartDrawerBody = document.getElementById("cartDrawerBody");
    const cartTotalPrice = document.getElementById("cartTotalPrice");
    const checkoutWhatsappBtn = document.getElementById("checkoutWhatsappBtn");

    function toggleCart(open) {
        if (cartDrawer && cartOverlay) {
            if (open) {
                cartDrawer.classList.add("active");
                cartOverlay.classList.add("active");
            } else {
                cartDrawer.classList.remove("active");
                cartOverlay.classList.remove("active");
            }
        }
    }

    if (openCartBtn) openCartBtn.addEventListener("click", () => toggleCart(true));
    if (closeCartBtn) closeCartBtn.addEventListener("click", () => toggleCart(false));
    if (cartOverlay) cartOverlay.addEventListener("click", () => toggleCart(false));
    if (addMoreItemsBtn) addMoreItemsBtn.addEventListener("click", () => toggleCart(false));

    function showQuantityPrompt(productData) {
        const maxStock = parseInt(productData.stock) || 99;
        const existing = cart.find(i => i.id === productData.id);
        const currentInCart = existing ? existing.qty : 0;
        const remainingStock = maxStock - currentInCart;

        if (remainingStock <= 0) {
            customDialogBox.innerHTML = `
                <div class="custom-dialog-icon" style="color: var(--accent);"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h3>Stok Maksimal Tercapai</h3>
                <p>Stok untuk <strong>${productData.name}</strong> sisa ${maxStock}. Anda sudah memasukkan semuanya ke keranjang!</p>
                <div class="custom-dialog-buttons">
                    <button class="custom-dialog-btn btn-dialog-confirm" id="dialogOkBtn">OK</button>
                </div>
            `;
            customDialogOverlay.classList.add("active");
            document.getElementById("dialogOkBtn").onclick = () => customDialogOverlay.classList.remove("active");
            return;
        }

        customDialogBox.innerHTML = `
            <div class="custom-dialog-icon"><i class="fa-solid fa-basket-shopping"></i></div>
            <h3>Masukkan Jumlah</h3>
            <p>Berapa porsi / buah <strong>${productData.name}</strong> yang ingin dibeli?<br><small style="color:var(--primary);">Stok tersedia: ${maxStock} (di keranjang: ${currentInCart})</small></p>
            <input type="number" id="promptQtyInput" value="1" min="1" max="${remainingStock}">
            <div class="custom-dialog-buttons">
                <button class="custom-dialog-btn btn-dialog-cancel" id="dialogCancelBtn">Batal</button>
                <button class="custom-dialog-btn btn-dialog-confirm" id="dialogConfirmBtn">Masukan Keranjang</button>
            </div>
        `;
        customDialogOverlay.classList.add("active");

        const input = document.getElementById("promptQtyInput");
        if (input) {
            input.focus();
            input.select();
        }

        document.getElementById("dialogCancelBtn").onclick = () => customDialogOverlay.classList.remove("active");
        document.getElementById("dialogConfirmBtn").onclick = () => {
            let qty = parseInt(input ? input.value : 1) || 1;
            if (qty > remainingStock) qty = remainingStock;
            if (qty > 0) {
                addToCartAction(productData, qty);
                customDialogOverlay.classList.remove("active");
                toggleCart(true);
            }
        };
    }

    // Mengurangi stok secara nyata dan mereset keranjang jadi 0 setelah checkout
    function handleSuccessfulCheckout() {
        cart.forEach(cartItem => {
            const row = document.querySelector(`.data-table tr[data-id="${cartItem.id}"]`);
            if (row) {
                const stockCell = row.querySelector(".stock-cell");
                const rawStock = stockCell.getAttribute("data-raw-stock") || stockCell.textContent.trim();
                const currentStock = parseInt(rawStock.replace(/[^0-9]/g, '')) || 0;
                const unitName = rawStock.replace(/[0-9]/g, '').trim() || 'Pcs';
                
                const newStock = Math.max(0, currentStock - cartItem.qty);
                stockCell.setAttribute("data-raw-stock", newStock + " " + unitName);
            }
        });
        
        cart = [];
        updateCartUI();
        processTableStocks();
    }

    function showConfirmationDialog(totalPrice, waUrl) {
        customDialogBox.innerHTML = `
            <div class="custom-dialog-icon" style="color: #25d366;"><i class="fa-brands fa-whatsapp"></i></div>
            <h3>Konfirmasi Pesanan</h3>
            <p>Apakah Anda yakin akan membeli produk ini dengan total <strong>Rp ${totalPrice.toLocaleString('id-ID')}</strong>? Stok produk akan otomatis dikurangi dan keranjang dikosongkan setelah pesanan dikonfirmasi.</p>
            <div class="custom-dialog-buttons">
                <button class="custom-dialog-btn btn-dialog-cancel" id="dialogCancelBtn">Cek Lagi</button>
                <a href="${waUrl}" target="_blank" class="custom-dialog-btn btn-dialog-whatsapp" id="dialogWhatsappBtn" style="display:flex; align-items:center; justify-content:center; gap:5px;">Ya, Pesan Sekarang</a>
            </div>
        `;
        customDialogOverlay.classList.add("active");

        document.getElementById("dialogCancelBtn").onclick = () => customDialogOverlay.classList.remove("active");
        document.getElementById("dialogWhatsappBtn").onclick = () => {
            handleSuccessfulCheckout();
            customDialogOverlay.classList.remove("active");
            toggleCart(false);
        };
    }

    function handleAddToCartClick() {
        const prodId = this.getAttribute("data-id");
        const tableRow = document.querySelector(`.data-table tr[data-id="${prodId}"]`);
        const rawStock = tableRow ? tableRow.querySelector(".stock-cell")?.getAttribute("data-raw-stock") : null;
        const currentStock = rawStock ? (parseInt(rawStock.replace(/[^0-9]/g, '')) || 0) : (parseInt(this.getAttribute("data-stock")) || 0);

        if (currentStock <= 0) {
            customDialogBox.innerHTML = `
                <div class="custom-dialog-icon" style="color: var(--accent);"><i class="fa-solid fa-circle-xmark"></i></div>
                <h3>Stok Habis</h3>
                <p>Maaf, stok untuk produk ini sedang kosong (0).</p>
                <div class="custom-dialog-buttons">
                    <button class="custom-dialog-btn btn-dialog-confirm" id="dialogOkBtn">Tutup</button>
                </div>
            `;
            customDialogOverlay.classList.add("active");
            document.getElementById("dialogOkBtn").onclick = () => customDialogOverlay.classList.remove("active");
            return;
        }

        const productData = {
            id: prodId,
            name: this.getAttribute("data-name"),
            price: parseInt(this.getAttribute("data-price")),
            img: this.getAttribute("data-img"),
            stock: currentStock
        };
        showQuantityPrompt(productData);
    }

    document.querySelectorAll(".add-to-cart-btn").forEach(button => {
        button.addEventListener("click", handleAddToCartClick);
    });

    function addToCartAction(productData, quantity) {
        const existingItem = cart.find(item => item.id === productData.id);
        if (existingItem) {
            const newQty = existingItem.qty + quantity;
            existingItem.qty = newQty > productData.stock ? productData.stock : newQty;
        } else {
            cart.push({ ...productData, qty: quantity > productData.stock ? productData.stock : quantity });
        }
        updateCartUI();
    }

    function updateCartUI() {
        const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
        cartCounter.textContent = totalCount;

        if (cart.length === 0) {
            cartDrawerBody.innerHTML = `
                <div class="cart-empty-state">
                    <i class="fa-solid fa-basket-shopping"></i>
                    <p>Keranjang belanjaan Anda masih kosong.</p>
                </div>
            `;
            cartTotalPrice.textContent = "Rp 0";
            checkoutWhatsappBtn.classList.add("disabled");
            return;
        }

        let html = "";
        let totalPrice = 0;
        let waMessage = "Halo Admin, saya ingin memesan produk berikut dari Katalog Kuliner Nusantara:%0A%0A";

        cart.forEach((item, index) => {
            const itemSubtotal = item.price * item.qty;
            totalPrice += itemSubtotal;
            waMessage += `${index + 1}. *${item.name}* (${item.qty}x) - Rp ${itemSubtotal.toLocaleString('id-ID')}%0A`;

            html += `
                <div class="cart-item">
                    <img src="${item.img}" alt="${item.name}" class="cart-item-img" onerror="this.src='https://placehold.co/55x55/fed7aa/9a3412?text=Foto'">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">Rp ${item.price.toLocaleString('id-ID')}</div>
                        <div class="cart-item-controls">
                            <button class="qty-btn decrease-qty" data-id="${item.id}">-</button>
                            <span class="cart-item-qty">${item.qty}</span>
                            <button class="qty-btn increase-qty" data-id="${item.id}">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove remove-item" data-id="${item.id}" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        });

        waMessage += `%0A*Total Pembayaran: Rp ${totalPrice.toLocaleString('id-ID')}*%0ATerima kasih!`;

        cartDrawerBody.innerHTML = html;
        cartTotalPrice.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
        checkoutWhatsappBtn.classList.remove("disabled");

        checkoutWhatsappBtn.onclick = function() {
            if (cart.length > 0) {
                const waUrl = `https://wa.me/6285725752267?text=${waMessage}`;
                showConfirmationDialog(totalPrice, waUrl);
            }
        };

        document.querySelectorAll(".increase-qty").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                const item = cart.find(i => i.id === id);
                if (item && item.qty < item.stock) {
                    item.qty += 1;
                    updateCartUI();
                }
            });
        });

        document.querySelectorAll(".decrease-qty").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                const item = cart.find(i => i.id === id);
                if (item) {
                    item.qty -= 1;
                    if (item.qty <= 0) {
                        cart = cart.filter(i => i.id !== id);
                    }
                    updateCartUI();
                }
            });
        });

        document.querySelectorAll(".remove-item").forEach(btn => {
            btn.addEventListener("click", function() {
                const id = this.getAttribute("data-id");
                cart = cart.filter(i => i.id !== id);
                updateCartUI();
            });
        });
    }
});
