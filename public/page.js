
const defaultConfig = {
    site_title: "Website học KHTN lớp 8",
    site_subtitle: "Học tập thông minh, phát triển toàn diện",
    footer_text: "© 2024 Website học KHTN lớp 8. Tất cả quyền được bảo lưu."
};

let currentPage = 'home';
let previousPage = 'home';
let allContent = [];

const typeIcons = {
    videos: '🎥',
    comics: '📚',
    flashcards: '🎴',
    games: '🎮',
    experiments: '🔬',
    quizzes: '📝',
    inforgraphic: ''
};

const typeLabels = {
    videos: 'Video bài học',
    comics: 'Truyện tranh',
    flashcards: 'Thẻ Flashcard',
    games: 'Game',
    experiments: 'Thí nghiệm',
    quizzes: 'Trắc nghiệm',
    inforgraphic: 'Inforgraphic' // thêm dòng này
};

async function loadData() {
    try {
        const res = await fetch('/api/content');
        allContent = await res.json();
    } catch (e) {
        console.error('Lỗi tải dữ liệu:', e);
        allContent = [];
    }
    renderAllContent();
}

// Ta không dùng saveData() tổng nữa, mà gọi API khi thêm/xoá
function saveData() {
    // Không cần hoặc để trống, tuỳ bạn
}


function initApp() {
    loadData();
}

function renderAllContent() {
    // thêm inforgraphic vào danh sách type
    const types = ['videos', 'comics', 'flashcards', 'games', 'experiments', 'quizzes', 'inforgraphic'];

    types.forEach(type => {
        const grid = document.getElementById(`${type}Grid`);
        if (!grid) return;

        const items = allContent.filter(item => item.type === type);

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${typeIcons[type] || ''}</div>
                    <div class="empty-state-text">Chưa có ${typeLabels[type]?.toLowerCase() || ''}</div>
                    <div class="empty-state-subtext">Vào trang Quản trị để thêm nội dung mới</div>
                </div>
            `;
        } else {
            // Nếu là inforgraphic thì hiển thị ảnh
            if (type === 'inforgraphic') {
                grid.innerHTML = items.map(item => `
                    <div class="card">
                        <button class="delete-btn" onclick="deleteItem(event, '${item.__backendId}')" title="Xóa">️🗑️</button>
                        <div class="card-title">${item.title}</div>
                        <img src="${item.link}" alt="${item.title}"
                             style="width:100%;border-radius:8px;margin:10px 0;">
                        <button class="card-btn" onclick="openLink(event, '${item.link}')">Xem ảnh</button>
                    </div>
                `).join('');
            } else {
                // Các loại khác giữ nguyên cách hiển thị
                grid.innerHTML = items.map(item => `
                    <div class="card">
                        <button class="delete-btn" onclick="deleteItem(event, '${item.__backendId}')" title="Xóa">️🗑️</button>
                        <div class="card-title">${typeIcons[type] || ''} ${item.title}</div>
                        <button class="card-btn" onclick="openLink(event, '${item.link}')">Xem ngay</button>
                    </div>
                `).join('');
            }
        }
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
    }
    
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
        btn.textContent.toLowerCase().includes(pageId === 'home' ? 'trang chủ' : 
            pageId === 'admin' ? 'quản trị' : typeLabels[pageId]?.toLowerCase() || '')
    );
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    if (pageId !== 'detail') {
        previousPage = currentPage;
    }
    currentPage = pageId;
}

function openLink(event, url) {
    // Prevent any parent element click events
    event.stopPropagation();
    
    // Open link in new tab with security attributes
    window.open(url, '_blank', 'noopener,noreferrer');
}

function goBack() {
    showPage(previousPage);
}

function deleteItem(event, itemId) {
    // Prevent card click event
    event.stopPropagation();
    
    const item = allContent.find(i => i.__backendId === itemId);
    if (!item) return;
    
    // Create custom confirmation modal instead of alert
    const confirmModal = document.createElement('div');
    confirmModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;
    
    confirmModal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px; margin: 20px;">
            <h3 style="margin-top: 0; color: #333;">Xác nhận xóa</h3>
            <p style="color: #666; margin: 20px 0;">Bạn có chắc chắn muốn xóa "${item.title}"?</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button onclick="confirmDelete('${itemId}')" style="background: #ff4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Xóa</button>
                <button onclick="cancelDelete()" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Hủy</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    window.currentConfirmModal = confirmModal;
}

async function confirmDelete(itemId) {
    try {
        await fetch(`/api/content/${itemId}`, {
            method: 'DELETE'
        });

        allContent = allContent.filter(item => item.__backendId !== itemId);
        renderAllContent();

        if (window.currentConfirmModal) {
            document.body.removeChild(window.currentConfirmModal);
            window.currentConfirmModal = null;
        }

        const successDiv = document.createElement('div');
        successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px; border-radius: 8px; z-index: 4000;';
        successDiv.textContent = 'Đã xóa thành công!';
        document.body.appendChild(successDiv);
        setTimeout(() => {
            if (document.body.contains(successDiv)) {
                document.body.removeChild(successDiv);
            }
        }, 3000);
    } catch (err) {
        console.error(err);
        alert('Lỗi khi xoá nội dung');
    }
}

function cancelDelete() {
    if (window.currentConfirmModal) {
        document.body.removeChild(window.currentConfirmModal);
        window.currentConfirmModal = null;
    }
}
function updateAdminFields() {
    const typeSelect = document.getElementById('contentType');
    const linkGroup = document.getElementById('contentLinkGroup');
    const imageGroup = document.getElementById('contentImageGroup');
    const linkInput = document.getElementById('contentLink');
    const imageInput = document.getElementById('contentImage');

    if (!typeSelect || !linkGroup || !imageGroup || !linkInput || !imageInput) return;

    if (typeSelect.value === 'inforgraphic') {
        // Ẩn ô link, hiện ô upload ảnh
        linkGroup.style.display = 'none';
        linkInput.required = false;

        imageGroup.style.display = 'block';
        imageInput.required = true;
    } else {
        // Ngược lại
        linkGroup.style.display = 'block';
        linkInput.required = true;

        imageGroup.style.display = 'none';
        imageInput.required = false;
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang thêm...';

    const type = document.getElementById('contentType').value;
    const title = document.getElementById('contentTitle').value;
    const linkInput = document.getElementById('contentLink');
    const imageInput = document.getElementById('contentImage');

    try {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('title', title);

        if (type === 'inforgraphic') {
            if (!imageInput.files || !imageInput.files[0]) {
                alert('Vui lòng chọn ảnh Inforgraphic (PNG/JPG)');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Thêm mới';
                return;
            }
            formData.append('image', imageInput.files[0]);
        } else {
            formData.append('link', linkInput.value);
        }

        const res = await fetch('/api/content', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Lỗi khi thêm nội dung');
        }

        const newItem = await res.json();

        allContent.push(newItem);
        renderAllContent();

        document.getElementById('adminForm').reset();
        updateAdminFields(); // reset lại hiển thị các field

        const successDiv = document.createElement('div');
        successDiv.style.cssText =
            'background: #4CAF50; color: white; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center;';
        successDiv.textContent = 'Đã thêm nội dung thành công!';
        document.querySelector('.admin-form').appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Lỗi khi thêm nội dung');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Thêm mới';
}

function closeChatbot() {
    document.getElementById('chatbotModal').classList.remove('active');
}

const modal = document.getElementById('chatbotModal');
if (modal) {
    modal.addEventListener('click', function (e) {
        if (e.target === this) {
            closeChatbot();
        }
    });
}


function onConfigChange(config) {
    document.getElementById('siteTitle').textContent = config.site_title || defaultConfig.site_title;
    document.getElementById('siteSubtitle').textContent = config.site_subtitle || defaultConfig.site_subtitle;
    document.getElementById('footerText').textContent = config.footer_text || defaultConfig.footer_text;
}

// Create floating icons at random positions
// Create floating icons at random positions (SAFE VERSION)
function createFloatingIcons() {
    const icons = ['🔬', '⚗️', '🧪', '🧲', '⚡', '🔭', '🌡️', '📐', '📏', '⚖️', '💡', '🔋', '🧬', '⚛️', '🌊', '🔥', '💧', '🌪️'];
    const container = document.getElementById('floatingIcons');

    // Nếu không tìm thấy div, không làm gì để tránh crash
    if (!container) {
        console.warn('floatingIcons container not found');
        return;
    }

    const iconCount = 30;
    for (let i = 0; i < iconCount; i++) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'floating-icon';
        iconDiv.textContent = icons[Math.floor(Math.random() * icons.length)];

        iconDiv.style.left = Math.random() * 100 + '%';
        iconDiv.style.top = Math.random() * 100 + '%';
        iconDiv.style.animationDelay = Math.random() * 5 + 's';
        iconDiv.style.animationDuration = (15 + Math.random() * 10) + 's';

        container.appendChild(iconDiv);
    }
}


if (window.elementSdk) {
    window.elementSdk.init({
        defaultConfig: defaultConfig,
        onConfigChange: onConfigChange,
        mapToCapabilities: (config) => ({
            recolorables: [],
            borderables: [],
            fontEditable: undefined,
            fontSizeable: undefined
        }),
        mapToEditPanelValues: (config) => new Map([
            ["site_title", config.site_title || defaultConfig.site_title],
            ["site_subtitle", config.site_subtitle || defaultConfig.site_subtitle],
            ["footer_text", config.footer_text || defaultConfig.footer_text]
        ])
    });
}
function openChatbot() {
    const modal = document.getElementById('chatbotModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeChatbot() {
    const modal = document.getElementById('chatbotModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function onConfigChange(config) {
    document.getElementById('siteTitle').textContent = config.site_title || defaultConfig.site_title;
    document.getElementById('siteSubtitle').textContent = config.site_subtitle || defaultConfig.site_subtitle;
    document.getElementById('footerText').textContent = config.footer_text || defaultConfig.footer_text;
}

// Create floating icons at random positions (SAFE VERSION)
function createFloatingIcons() {
    const icons = ['🔬', '⚗️', '🧪', '🧲', '⚡', '🔭', '🌡️', '📐', '📏', '⚖️', '💡', '🔋', '🧬', '⚛️', '🌊', '🔥', '💧', '🌪️'];
    const container = document.getElementById('floatingIcons');

    // Nếu không tìm thấy div, không làm gì để tránh crash
    if (!container) {
        console.warn('floatingIcons container not found');
        return;
    }

    const iconCount = 30;
    for (let i = 0; i < iconCount; i++) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'floating-icon';
        iconDiv.textContent = icons[Math.floor(Math.random() * icons.length)];

        iconDiv.style.left = Math.random() * 100 + '%';
        iconDiv.style.top = Math.random() * 100 + '%';
        iconDiv.style.animationDelay = Math.random() * 5 + 's';
        iconDiv.style.animationDuration = (15 + Math.random() * 10) + 's';

        container.appendChild(iconDiv);
    }
}

// Khởi chạy mọi thứ sau khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // Bắt sự kiện đóng chatbot khi click ra ngoài
    const modal = document.getElementById('chatbotModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeChatbot();
            }
        });
    }

    // Tạo icon bay
    createFloatingIcons();

    // Khởi tạo app (load dữ liệu từ backend)
    initApp();

    // Khởi tạo elementSdk nếu có (không bắt buộc)
    if (window.elementSdk) {
        window.elementSdk.init({
            defaultConfig: defaultConfig,
            onConfigChange: onConfigChange,
            mapToCapabilities: (config) => ({
                recolorables: [],
                borderables: [],
                fontEditable: undefined,
                fontSizeable: undefined
            }),
            mapToEditPanelValues: (config) => new Map([
                ['site_title', config.site_title || defaultConfig.site_title],
                ['site_subtitle', config.site_subtitle || defaultConfig.site_subtitle],
                ['footer_text', config.footer_text || defaultConfig.footer_text]
            ])
        });
    }

    // Cập nhật hiển thị ô Link / Upload ảnh trong trang quản trị
    const typeSelect = document.getElementById('contentType');
    if (typeSelect) {
        typeSelect.addEventListener('change', updateAdminFields);
        updateAdminFields();
    }
});
