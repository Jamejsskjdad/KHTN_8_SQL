// public/frontend/admin/User_mng/user.js
// ====== CONFIG MẶC ĐỊNH (cho Element SDK) ======
const defaultConfig = {
// Màu sắc (tối đa 5 màu, đúng yêu cầu)
background_color: "#f0f4f8",   // BACKGROUND - xám xanh nhạt
surface_color: "#ffffff",      // SECONDARY_SURFACE - trắng cho card/panel
text_color: "#1e293b",         // TEXT - xanh đậm
primary_action_color: "#007bff", // PRIMARY_ACTION - xanh dương
secondary_action_color: "#0056b3", // SECONDARY_ACTION - xanh đậm hơn

// Font
font_family: "Inter",
font_size: 16,

// Văn bản có thể chỉnh trong Canva
page_title: "Quản lý người dùng",
search_placeholder: "Tìm theo tên hoặc tài khoản…",
view_button_text: "Xem",
edit_button_text: "Sửa",
lock_button_text: "Khóa / Mở khóa",
delete_button_text: "Xóa",
detail_modal_title: "Thông tin người dùng",
edit_modal_title: "Chỉnh sửa thông tin",
delete_modal_title: "Xác nhận xóa tài khoản",
delete_modal_description: "Bạn có chắc chắn muốn xóa tài khoản này không?"
};

// ====== TRẠNG THÁI ỨNG DỤNG (KHÔNG PERSIST) ======
const appState = {
    users: [],          // <-- không để dữ liệu demo nữa
    search: "",
    filterRole: "all",
    filterClass: "all",
    filterStatus: "all",
    currentPage: 1,
    pageSize: 4,
    modal: null,
    selectedUserId: null,
    toast: null
  };
  

// ====== TRỢ GIÚP CHUNG ======
function formatDateTime(isoStr) {
const d = new Date(isoStr);
const pad = (n) => n.toString().padStart(2, "0");
const day = pad(d.getDate());
const month = pad(d.getMonth() + 1);
const year = d.getFullYear();
const hour = pad(d.getHours());
const min = pad(d.getMinutes());
return `${day}/${month}/${year} – ${hour}:${min}`;
}

function getInitials(fullName) {
if (!fullName) return "?";
const parts = fullName.trim().split(/\s+/);
if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getFilteredUsers() {
return appState.users.filter((u) => {
    const q = appState.search.trim().toLowerCase();
    if (q) {
    const match =
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q);
    if (!match) return false;
    }
    if (appState.filterRole !== "all" && u.role !== appState.filterRole) {
    return false;
    }
    if (appState.filterClass !== "all") {
    if (u.role === "Admin" && appState.filterClass !== "Admin") {
        return false;
    }
    if (u.role !== "Admin" && u.className !== appState.filterClass) {
        return false;
    }
    }
    if (appState.filterStatus !== "all") {
    const desired = appState.filterStatus === "active";
    if (u.active !== desired) return false;
    }
    return true;
});
}

function openModal(type, userId) {
appState.modal = type;
appState.selectedUserId = userId;
updateModalVisibility();
fillEditFormIfNeeded();
fillDetailModalIfNeeded();
fillDeleteModalIfNeeded();
}

function closeModal() {
appState.modal = null;
appState.selectedUserId = null;
updateModalVisibility();
}

function showToast(type, message) {
appState.toast = { type, message };
renderToast();
setTimeout(() => {
    if (appState.toast && appState.toast.message === message) {
    appState.toast = null;
    renderToast();
    }
}, 2500);
}

// ====== TẠO UI CHÍNH BAN ĐẦU ======
function createLayout() {
    const root = document.getElementById("userRoot");
root.innerHTML = "";

const app = document.createElement("div");
app.className =
    "app-wrapper w-full h-full flex flex-col px-4 py-4 lg:px-8 lg:py-6";

// Thanh tiêu đề + filter
const header = document.createElement("section");
header.setAttribute("aria-label", "Thanh tiêu đề và bộ lọc");
header.className =
    "w-full mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between";

const titleBlock = document.createElement("div");
titleBlock.className = "flex flex-col gap-1";

const h1 = document.createElement("h1");
h1.id = "page-title";
h1.className =
    "font-semibold tracking-tight";
h1.textContent = defaultConfig.page_title;

const subtitle = document.createElement("p");
subtitle.id = "page-subtitle";
subtitle.className = "text-xs opacity-70";
subtitle.textContent = "Quản lý tài khoản học sinh, giáo viên và admin trong hệ thống.";

titleBlock.appendChild(h1);
titleBlock.appendChild(subtitle);

const controls = document.createElement("div");
controls.className =
    "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end lg:flex-1";

// Ô tìm kiếm
const searchWrapper = document.createElement("div");
searchWrapper.className =
    "flex items-center gap-2 rounded-full px-4 py-2 shadow-sm border border-blue-200 bg-white focus-within:border-blue-400";
searchWrapper.style.minWidth = "0";

const searchIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
searchIcon.setAttribute("viewBox", "0 0 24 24");
searchIcon.setAttribute("aria-hidden", "true");
searchIcon.classList.add("w-4", "h-4", "opacity-70", "flex-shrink-0");
searchIcon.innerHTML =
    '<path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79L19 20.49 20.49 19 15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>';
searchWrapper.appendChild(searchIcon);

const searchInput = document.createElement("input");
searchInput.id = "search-input";
searchInput.type = "text";
searchInput.className =
    "bg-transparent border-none outline-none text-xs lg:text-sm w-full placeholder:opacity-60 focus:ring-0";
searchInput.placeholder = defaultConfig.search_placeholder;
searchInput.addEventListener("input", (e) => {
    appState.search = e.target.value;
    appState.currentPage = 1;
    renderUserTable();
    renderUserPagination();
});
searchWrapper.appendChild(searchInput);

controls.appendChild(searchWrapper);

// Filter nhóm
const filterRow = document.createElement("div");
filterRow.className =
    "flex flex-wrap gap-2 lg:ml-3";

// Filter Role
const roleSelect = document.createElement("select");
roleSelect.id = "filter-role";
roleSelect.className =
    "focus-ring text-xs lg:text-sm rounded-full border border-blue-200 bg-white px-3 py-1.5 text-left";
["Tất cả quyền", "Admin", "User"].forEach((label, idx) => {
    const opt = document.createElement("option");
    opt.value = idx === 0 ? "all" : label;
    opt.textContent = label;
    roleSelect.appendChild(opt);
});
roleSelect.addEventListener("change", (e) => {
    appState.filterRole = e.target.value;
    appState.currentPage = 1;
    renderUserTable();
    renderUserPagination();
});

// Filter Class
const classSelect = document.createElement("select");
classSelect.id = "filter-class";
classSelect.className =
    "focus-ring text-xs lg:text-sm rounded-full border border-blue-200 bg-white px-3 py-1.5 text-left";
const classOptions = ["Tất cả lớp", "8A1", "8A2", "8A3", "Admin"];
classOptions.forEach((label, idx) => {
    const opt = document.createElement("option");
    opt.value = idx === 0 ? "all" : label;
    opt.textContent = label;
    classSelect.appendChild(opt);
});
classSelect.addEventListener("change", (e) => {
    appState.filterClass = e.target.value;
    appState.currentPage = 1;
    renderUserTable();
    renderUserPagination();
});

// Filter Status
const statusSelect = document.createElement("select");
statusSelect.id = "filter-status";
statusSelect.className =
    "focus-ring text-xs lg:text-sm rounded-full border border-blue-200 bg-white px-3 py-1.5 text-left";
const statusLabels = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "active", label: "Đang hoạt động" },
    { value: "locked", label: "Đã khóa" }
];
statusLabels.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    statusSelect.appendChild(opt);
});
statusSelect.addEventListener("change", (e) => {
    appState.filterStatus = e.target.value;
    appState.currentPage = 1;
    renderUserTable();
    renderUserPagination();
});

filterRow.appendChild(roleSelect);
filterRow.appendChild(classSelect);
filterRow.appendChild(statusSelect);
controls.appendChild(filterRow);

header.appendChild(titleBlock);
header.appendChild(controls);
app.appendChild(header);

// Bảng
const tableCard = document.createElement("section");
tableCard.setAttribute("aria-label", "Bảng danh sách người dùng")
tableCard.className =
    "flex-1 w-full rounded-2xl shadow-lg border border-blue-200 bg-white backdrop-blur-sm px-4 py-3 lg:px-5 lg:py-4 flex flex-col min-h-[0]";

const tableHeaderRow = document.createElement("div");
tableHeaderRow.className =
    "flex items-center justify-between mb-3 gap-2";

const tableTitle = document.createElement("h2");
tableTitle.id = "table-title";
tableTitle.className = "text-sm font-semibold opacity-90";
tableTitle.textContent = "Danh sách người dùng";
tableHeaderRow.appendChild(tableTitle);

const rightSection = document.createElement("div");
rightSection.className = "flex items-center gap-3";

const tableMeta = document.createElement("div");
tableMeta.className = "text-[11px] lg:text-xs opacity-70";
tableMeta.id = "table-meta";
tableMeta.textContent = "Tổng 0 người dùng";
rightSection.appendChild(tableMeta);

// Nút tạo tài khoản mới
const createBtn = document.createElement("button");
createBtn.type = "button";
createBtn.className =
    "focus-ring inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#4b3ccf] to-[#007bff] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-95 transition-opacity";
createBtn.innerHTML = '<span>+ Tạo</span>';
createBtn.addEventListener("click", () => openModal("create", null));
rightSection.appendChild(createBtn);

tableHeaderRow.appendChild(rightSection);

tableCard.appendChild(tableHeaderRow);

const tableWrapper = document.createElement("div");
tableWrapper.className =
    "relative overflow-x-auto rounded-xl border border-blue-100 bg-blue-50/30";
tableWrapper.style.maxHeight = "100%";
tableWrapper.style.minHeight = "0";

const table = document.createElement("table");
table.className = "min-w-full text-left text-xs lg:text-sm";
table.id = "user-table";

const thead = document.createElement("thead");
thead.className = "uppercase text-[10px] lg:text-[11px] tracking-wide";
const headerRow = document.createElement("tr");

const headers = [
    "Avatar",
    "Họ và tên",
    "Username",
    "Email",
    "Lớp",
    "Quyền",
    "Ngày tạo",
    "Thao tác"
];

headers.forEach((text, idx) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.className =
    "px-3 py-3 whitespace-nowrap font-medium opacity-70";
    if (idx === 0) th.classList.add("pl-4");
    if (idx === headers.length - 1) th.classList.add("pr-4", "text-right");
    th.textContent = text;
    headerRow.appendChild(th);
});
thead.appendChild(headerRow);
table.appendChild(thead);

const tbody = document.createElement("tbody");
tbody.id = "user-table-body";
table.appendChild(tbody);

tableWrapper.appendChild(table);
tableCard.appendChild(tableWrapper);

// Pagination
const paginationBar = document.createElement("div");
paginationBar.id = "pagination-bar";
paginationBar.className =
    "mt-3 flex items-center justify-between gap-2 text-[11px] lg:text-xs";
tableCard.appendChild(paginationBar);

app.appendChild(tableCard);

// Toast
const toastContainer = document.createElement("div");
toastContainer.id = "toast-container";
toastContainer.className =
    "fixed bottom-4 right-4 z-40 max-w-xs";
app.appendChild(toastContainer);

// MODALS
createModals(app);

root.appendChild(app);
}

// ====== MODALS ======
function createModals(app) {
// Backdrop chung
const backdrop = document.createElement("div");
backdrop.id = "modal-backdrop";
backdrop.className =
    "modal-backdrop fixed inset-0 z-30 flex items-center justify-center px-4 py-4 lg:px-6";
backdrop.style.display = "none";

const modalContainer = document.createElement("div");
modalContainer.id = "modal-container";
modalContainer.className =
    "w-full max-w-md rounded-2xl shadow-2xl border border-blue-200 bg-white backdrop-blur-xl px-5 py-5 flex flex-col gap-4";
modalContainer.setAttribute("role", "dialog");
modalContainer.setAttribute("aria-modal", "true");

// Modal tiêu đề chung
const modalHeader = document.createElement("div");
modalHeader.className = "flex items-center justify-between gap-2";

const modalTitle = document.createElement("h3");
modalTitle.id = "modal-title";
modalTitle.className = "text-base font-semibold";
modalTitle.textContent = defaultConfig.detail_modal_title;
modalHeader.appendChild(modalTitle);

const closeBtn = document.createElement("button");
closeBtn.type = "button";
closeBtn.className =
    "focus-ring rounded-full p-1.5 text-xs border border-blue-200 hover:border-blue-400 hover:text-blue-600 transition-colors";
closeBtn.textContent = "×";
closeBtn.addEventListener("click", () => {
    closeModal();
});
modalHeader.appendChild(closeBtn);
modalContainer.appendChild(modalHeader);

// Nội dung container
const modalContent = document.createElement("div");
modalContent.id = "modal-content";
modalContent.className = "text-xs lg:text-sm";
modalContainer.appendChild(modalContent);

// Footer buttons
const modalFooter = document.createElement("div");
modalFooter.id = "modal-footer";
modalFooter.className = "flex justify-end gap-2 mt-2";
modalContainer.appendChild(modalFooter);

backdrop.appendChild(modalContainer);
app.appendChild(backdrop);

// Đóng khi click ra ngoài
backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
    closeModal();
    }
});
}

function updateModalVisibility() {
const backdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalContent = document.getElementById("modal-content");
const modalFooter = document.getElementById("modal-footer");
if (!backdrop || !modalTitle || !modalContent || !modalFooter) return;

if (!appState.modal) {
    backdrop.style.display = "none";
    return;
}
backdrop.style.display = "flex";

modalContent.innerHTML = "";
modalFooter.innerHTML = "";

const currentUser = appState.users.find(
    (u) => u.id === appState.selectedUserId
);

if (appState.modal === "create") {
    modalTitle.textContent = "Tạo tài khoản mới";

    const form = document.createElement("form");
    form.id = "create-user-form";
    form.className = "flex flex-col gap-3";
    form.addEventListener("submit", (e) => {
    e.preventDefault();
    });

    // Fullname
    const fnGroup = document.createElement("div");
    fnGroup.className = "flex flex-col gap-1";
    const fnLabel = document.createElement("label");
    fnLabel.setAttribute("for", "create-fullname");
    fnLabel.className = "text-[11px] opacity-80";
    fnLabel.textContent = "Họ và tên *";
    const fnInput = document.createElement("input");
    fnInput.id = "create-fullname";
    fnInput.type = "text";
    fnInput.required = true;
    fnInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    fnInput.placeholder = "Nhập họ và tên...";
    fnGroup.appendChild(fnLabel);
    fnGroup.appendChild(fnInput);
    form.appendChild(fnGroup);

    // Username
    const unGroup = document.createElement("div");
    unGroup.className = "flex flex-col gap-1";
    const unLabel = document.createElement("label");
    unLabel.setAttribute("for", "create-username");
    unLabel.className = "text-[11px] opacity-80";
    unLabel.textContent = "Tên đăng nhập *";
    const unInput = document.createElement("input");
    unInput.id = "create-username";
    unInput.type = "text";
    unInput.required = true;
    unInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    unInput.placeholder = "Nhập tên đăng nhập...";
    unGroup.appendChild(unLabel);
    unGroup.appendChild(unInput);
    form.appendChild(unGroup);

    // Email
    const emGroup = document.createElement("div");
    emGroup.className = "flex flex-col gap-1";
    const emLabel = document.createElement("label");
    emLabel.setAttribute("for", "create-email");
    emLabel.className = "text-[11px] opacity-80";
    emLabel.textContent = "Email *";
    const emInput = document.createElement("input");
    emInput.id = "create-email";
    emInput.type = "email";
    emInput.required = true;
    emInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    emInput.placeholder = "Nhập email...";
    emGroup.appendChild(emLabel);
    emGroup.appendChild(emInput);
    form.appendChild(emGroup);

    // Password
    const pwGroup = document.createElement("div");
    pwGroup.className = "flex flex-col gap-1";
    const pwLabel = document.createElement("label");
    pwLabel.setAttribute("for", "create-password");
    pwLabel.className = "text-[11px] opacity-80";
    pwLabel.textContent = "Mật khẩu *";
    const pwInput = document.createElement("input");
    pwInput.id = "create-password";
    pwInput.type = "password";
    pwInput.required = true;
    pwInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    pwInput.placeholder = "Nhập mật khẩu...";
    pwGroup.appendChild(pwLabel);
    pwGroup.appendChild(pwInput);
    form.appendChild(pwGroup);

    // Lớp
    const classGroup = document.createElement("div");
    classGroup.className = "flex flex-col gap-1";
    const classLabel = document.createElement("label");
    classLabel.setAttribute("for", "create-class");
    classLabel.className = "text-[11px] opacity-80";
    classLabel.textContent = "Lớp";
    const classInput = document.createElement("input");
    classInput.id = "create-class";
    classInput.type = "text";
    classInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    classInput.placeholder = "Nhập lớp (nếu là User)...";
    classGroup.appendChild(classLabel);
    classGroup.appendChild(classInput);
    form.appendChild(classGroup);

    // Role
    const roleGroup = document.createElement("div");
    roleGroup.className = "flex flex-col gap-1";
    const roleLabel = document.createElement("label");
    roleLabel.setAttribute("for", "create-role");
    roleLabel.className = "text-[11px] opacity-80";
    roleLabel.textContent = "Quyền *";
    const roleSelect = document.createElement("select");
    roleSelect.id = "create-role";
    roleSelect.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    ["User", "Admin"].forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    roleSelect.appendChild(opt);
    });
    roleGroup.appendChild(roleLabel);
    roleGroup.appendChild(roleSelect);
    form.appendChild(roleGroup);

    modalContent.appendChild(form);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className =
    "focus-ring inline-flex items-center justify-center rounded-full border border-slate-600/80 px-4 py-1.5 text-xs hover:border-sky-400 hover:text-sky-300 transition-colors";
    cancelBtn.textContent = "Hủy";
    cancelBtn.addEventListener("click", () => closeModal());
    modalFooter.appendChild(cancelBtn);

    const createBtnModal = document.createElement("button");
    createBtnModal.type = "button";
    createBtnModal.className =
    "focus-ring inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#4b3ccf] to-[#007bff] px-4 py-1.5 text-xs font-medium text-white shadow-md hover:opacity-95 transition-opacity";
    createBtnModal.textContent = "Tạo tài khoản";
    createBtnModal.addEventListener("click", () => {
    const fullName = document.getElementById("create-fullname").value.trim();
    const username = document.getElementById("create-username").value.trim();
    const email = document.getElementById("create-email").value.trim();
    const password = document.getElementById("create-password").value.trim();
    const className = document.getElementById("create-class").value.trim();
    const role = document.getElementById("create-role").value;

    if (!fullName || !username || !email || !password) {
        showToast("error", "Vui lòng điền đầy đủ các trường bắt buộc.");
        return;
    }

    const newUser = {
        id: Date.now().toString(),
        fullName,
        username,
        email,
        className: role === "Admin" ? "" : (className || ""),
        role,
        createdAt: new Date().toISOString(),
        active: true
    };

    appState.users.push(newUser);
    renderUserTable();
    renderUserPagination();
    showToast("success", "Đã tạo tài khoản mới thành công!");
    closeModal();
    });
    modalFooter.appendChild(createBtnModal);
} else if (appState.modal === "view") {
    modalTitle.textContent = (window.elementSdk && window.elementSdk.config.detail_modal_title) || defaultConfig.detail_modal_title;

    if (!currentUser) return;

    // Avatar lớn
    const topArea = document.createElement("div");
    topArea.className = "flex items-center gap-4 mb-3";

    const avatar = document.createElement("div");
    avatar.className =
    "flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#007bff] to-[#0056b3] text-sm font-semibold text-white shadow-lg";
    avatar.textContent = getInitials(currentUser.fullName);
    topArea.appendChild(avatar);

    const infoHead = document.createElement("div");
    const nameEl = document.createElement("p");
    nameEl.className = "text-sm font-semibold";
    nameEl.textContent = currentUser.fullName;

    const usernameEl = document.createElement("p");
    usernameEl.className = "text-[11px] opacity-70";
    usernameEl.textContent = currentUser.username + " · " + currentUser.email;

    infoHead.appendChild(nameEl);
    infoHead.appendChild(usernameEl);
    topArea.appendChild(infoHead);
    modalContent.appendChild(topArea);

    // Các dòng chi tiết
    const detailGrid = document.createElement("div");
    detailGrid.className = "grid grid-cols-1 gap-2 text-[11px]";

    const rows = [
    ["Lớp", currentUser.role === "Admin" ? "—" : currentUser.className],
    ["Quyền", currentUser.role],
    ["Ngày tạo", formatDateTime(currentUser.createdAt)],
    ["Trạng thái", currentUser.active ? "Đang hoạt động" : "Đã khóa"]
    ];

    rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className =
        "flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2";
    const l = document.createElement("span");
    l.className = "opacity-70";
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "font-medium";
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    detailGrid.appendChild(row);
    });

    modalContent.appendChild(detailGrid);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className =
    "focus-ring mt-3 inline-flex items-center justify-center rounded-full border border-blue-200 px-4 py-1.5 text-xs hover:border-blue-400 hover:text-blue-600 transition-colors";
    closeBtn.textContent = "Đóng";
    closeBtn.addEventListener("click", () => closeModal());
    modalFooter.appendChild(closeBtn);
} else if (appState.modal === "edit") {
    modalTitle.textContent = (window.elementSdk && window.elementSdk.config.edit_modal_title) || defaultConfig.edit_modal_title;

    if (!currentUser) return;

    const form = document.createElement("form");
    form.id = "edit-user-form";
    form.className = "flex flex-col gap-3";
    form.addEventListener("submit", (e) => {
    e.preventDefault();
    });

    // Fullname
    const fnGroup = document.createElement("div");
    fnGroup.className = "flex flex-col gap-1";
    const fnLabel = document.createElement("label");
    fnLabel.setAttribute("for", "edit-fullname");
    fnLabel.className = "text-[11px] opacity-80";
    fnLabel.textContent = "Họ và tên";
    const fnInput = document.createElement("input");
    fnInput.id = "edit-fullname";
    fnInput.type = "text";
    fnInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    fnInput.value = currentUser.fullName;
    fnGroup.appendChild(fnLabel);
    fnGroup.appendChild(fnInput);
    form.appendChild(fnGroup);

    // Email
    const emGroup = document.createElement("div");
    emGroup.className = "flex flex-col gap-1";
    const emLabel = document.createElement("label");
    emLabel.setAttribute("for", "edit-email");
    emLabel.className = "text-[11px] opacity-80";
    emLabel.textContent = "Email";
    const emInput = document.createElement("input");
    emInput.id = "edit-email";
    emInput.type = "email";
    emInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    emInput.value = currentUser.email;
    emGroup.appendChild(emLabel);
    emGroup.appendChild(emInput);
    form.appendChild(emGroup);

    // Lớp
    const classGroup = document.createElement("div");
    classGroup.className = "flex flex-col gap-1";
    const classLabel = document.createElement("label");
    classLabel.setAttribute("for", "edit-class");
    classLabel.className = "text-[11px] opacity-80";
    classLabel.textContent = "Lớp";
    const classInput = document.createElement("input");
    classInput.id = "edit-class";
    classInput.type = "text";
    classInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    classInput.value = currentUser.role === "Admin" ? "" : currentUser.className;
    classGroup.appendChild(classLabel);
    classGroup.appendChild(classInput);
    form.appendChild(classGroup);

    // Role
    const roleGroup = document.createElement("div");
    roleGroup.className = "flex flex-col gap-1";
    const roleLabel = document.createElement("label");
    roleLabel.setAttribute("for", "edit-role");
    roleLabel.className = "text-[11px] opacity-80";
    roleLabel.textContent = "Quyền";
    const roleSelect = document.createElement("select");
    roleSelect.id = "edit-role";
    roleSelect.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    ["Admin", "User"].forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    if (r === currentUser.role) opt.selected = true;
    roleSelect.appendChild(opt);
    });
    roleGroup.appendChild(roleLabel);
    roleGroup.appendChild(roleSelect);
    form.appendChild(roleGroup);

    // Password
    const pwGroup = document.createElement("div");
    pwGroup.className = "flex flex-col gap-1";
    const pwLabel = document.createElement("label");
    pwLabel.setAttribute("for", "edit-password");
    pwLabel.className = "text-[11px] opacity-80";
    pwLabel.textContent = "Mật khẩu mới (để trống nếu không đổi)";
    const pwInput = document.createElement("input");
    pwInput.id = "edit-password";
    pwInput.type = "password";
    pwInput.className =
    "focus-ring rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-xs";
    pwInput.placeholder = "Nhập mật khẩu mới...";
    pwGroup.appendChild(pwLabel);
    pwGroup.appendChild(pwInput);
    form.appendChild(pwGroup);

    modalContent.appendChild(form);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className =
    "focus-ring inline-flex items-center justify-center rounded-full border border-slate-600/80 px-4 py-1.5 text-xs hover:border-sky-400 hover:text-sky-300 transition-colors";
    cancelBtn.textContent = "Hủy";
    cancelBtn.addEventListener("click", () => closeModal());
    modalFooter.appendChild(cancelBtn);

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className =
    "focus-ring inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#4b3ccf] to-[#007bff] px-4 py-1.5 text-xs font-medium text-white shadow-md hover:opacity-95 transition-opacity";
    saveBtn.textContent = (window.elementSdk && window.elementSdk.config.edit_button_text) || defaultConfig.edit_button_text;
    saveBtn.addEventListener("click", () => {
    const updated = appState.users.map((u) => {
        if (u.id !== currentUser.id) return u;
        return {
        ...u,
        fullName: document.getElementById("edit-fullname").value || u.fullName,
        email: document.getElementById("edit-email").value || u.email,
        className:
            (document.getElementById("edit-class").value || "").trim() ||
            u.className,
        role: document.getElementById("edit-role").value || u.role
        };
    });
    appState.users = updated;
    renderUserTable();
    showToast("success", "Đã lưu thay đổi người dùng.");
    closeModal();
    });
    modalFooter.appendChild(saveBtn);
} else if (appState.modal === "delete") {
    modalTitle.textContent = (window.elementSdk && window.elementSdk.config.delete_modal_title) || defaultConfig.delete_modal_title;

    const iconWrap = document.createElement("div");
    iconWrap.className =
    "w-10 h-10 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center mb-2";
    const warnIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    warnIcon.setAttribute("viewBox", "0 0 24 24");
    warnIcon.classList.add("w-5", "h-5", "text-red-400");
    warnIcon.innerHTML =
    '<path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>';
    iconWrap.appendChild(warnIcon);
    modalContent.appendChild(iconWrap);

    const message = document.createElement("p");
    message.className = "text-xs lg:text-sm";
    message.textContent =
    (window.elementSdk && window.elementSdk.config.delete_modal_description) ||
    defaultConfig.delete_modal_description;
    modalContent.appendChild(message);

    const helper = document.createElement("p");
    helper.className = "mt-1 text-[11px] opacity-70";
    helper.textContent =
    "Thao tác này không thể hoàn tác trong bản demo này, nhưng chỉ là minh họa UI.";
    modalContent.appendChild(helper);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className =
    "focus-ring inline-flex items-center justify-center rounded-full border border-slate-600/80 px-4 py-1.5 text-xs hover:border-sky-400 hover:text-sky-300 transition-colors";
    cancelBtn.textContent = "Hủy";
    cancelBtn.addEventListener("click", () => closeModal());
    modalFooter.appendChild(cancelBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className =
    "focus-ring inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-1.5 text-xs font-medium text-white shadow-md hover:bg-red-400 transition-colors";
    delBtn.textContent = (window.elementSdk && window.elementSdk.config.delete_button_text) || defaultConfig.delete_button_text;
    delBtn.addEventListener("click", () => {
    appState.users = appState.users.filter(
        (u) => u.id !== appState.selectedUserId
    );
    if (
        (appState.currentPage - 1) * appState.pageSize >= appState.users.length
    ) {
        appState.currentPage = Math.max(
        1,
        Math.ceil(appState.users.length / appState.pageSize)
        );
    }
    renderUserTable();
    renderUserPagination();
    showToast("success", "Đã xóa tài khoản (trong bản demo).");
    closeModal();
    });
    modalFooter.appendChild(delBtn);
}
}

function fillEditFormIfNeeded() {
// Logic đã n���m trong updateModalVisibility, không cần thêm
}
function fillDetailModalIfNeeded() {}
function fillDeleteModalIfNeeded() {}

// ====== BẢNG VÀ PAGINATION ======
function renderUserTable() {
const tbody = document.getElementById("user-table-body");
const meta = document.getElementById("table-meta");
const totalLabel = document.querySelector("#user-count-label"); 
if (!tbody || !meta) return;

  tbody.innerHTML = "";

  const filtered = getFilteredUsers();
  const total = filtered.length;
  const startIdx = (appState.currentPage - 1) * appState.pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + appState.pageSize);

  meta.textContent = `Hiển thị ${pageItems.length === 0 ? 0 : startIdx + 1} đến ${startIdx + pageItems.length} trong tổng ${total}`;

  if (totalLabel) {
    totalLabel.textContent = `Tổng ${total} người dùng`;
  }

if (pageItems.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.className =
    "px-4 py-6 text-center text-xs opacity-70";
    td.textContent = "Không tìm thấy người dùng phù hợp với bộ lọc hiện tại.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
}

pageItems.forEach((u) => {
    const tr = document.createElement("tr");
    tr.className =
    "border-t border-slate-800/80 hover:bg-slate-800/40 transition-colors";

    // Avatar
    const tdAvatar = document.createElement("td");
    tdAvatar.className = "pl-4 pr-3 py-3 whitespace-nowrap";
    const avatar = document.createElement("div");
    avatar.className =
    "flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#4b3ccf] to-[#007bff] text-[11px] font-semibold text-white shadow-md";
    avatar.textContent = getInitials(u.fullName);
    tdAvatar.appendChild(avatar);
    tr.appendChild(tdAvatar);

    // Fullname
    const tdName = document.createElement("td");
    tdName.className =
    "px-3 py-3 whitespace-nowrap text-xs lg:text-sm font-medium";
    tdName.textContent = u.fullName;
    tr.appendChild(tdName);

    // Username
    const tdUser = document.createElement("td");
    tdUser.className =
    "px-3 py-3 whitespace-nowrap text-xs lg:text-sm opacity-80";
    tdUser.textContent = u.username;
    tr.appendChild(tdUser);

    // Email
    const tdEmail = document.createElement("td");
    tdEmail.className =
    "px-3 py-3 whitespace-nowrap text-xs lg:text-sm opacity-80";
    tdEmail.textContent = u.email;
    tr.appendChild(tdEmail);

    // Class
    const tdClass = document.createElement("td");
    tdClass.className =
    "px-3 py-3 whitespace-nowrap text-xs lg:text-sm";
    tdClass.textContent = u.role === "Admin" ? "—" : u.className;
    tr.appendChild(tdClass);

    // Role Badge
    const tdRole = document.createElement("td");
    tdRole.className =
    "px-3 py-3 whitespace-nowrap text-xs lg:text-sm";
    const badge = document.createElement("span");
    badge.className =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium";
    if (u.role === "Admin") {
    badge.classList.add("bg-red-100", "text-red-700", "border", "border-red-300");
    } else {
    badge.classList.add("bg-emerald-100", "text-emerald-700", "border", "border-emerald-300");
    }
    badge.textContent = u.role;
    tdRole.appendChild(badge);
    tr.appendChild(tdRole);

    // CreatedAt
    const tdDate = document.createElement("td");
    tdDate.className =
    "px-3 py-3 whitespace-nowrap text-[11px] lg:text-xs opacity-70";
    tdDate.textContent = formatDateTime(u.createdAt);
    tr.appendChild(tdDate);

    // Actions
    const tdActions = document.createElement("td");
    tdActions.className =
    "pr-4 pl-3 py-3 whitespace-nowrap text-right";

    const btnRow = document.createElement("div");
    btnRow.className =
    "flex items-center justify-end gap-1.5";

    const btnView = document.createElement("button");
    btnView.type = "button";
    btnView.className =
    "focus-ring inline-flex items-center justify-center rounded-full border border-slate-600/80 px-2.5 py-1 text-[10px] lg:text-[11px] hover:border-sky-400 hover:text-sky-300 transition-colors";
    btnView.textContent = (window.elementSdk && window.elementSdk.config.view_button_text) || defaultConfig.view_button_text;
    btnView.addEventListener("click", () => openModal("view", u.id));

    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className =
    "focus-ring inline-flex items-center justify-center rounded-full border border-slate-600/80 px-2.5 py-1 text-[10px] lg:text-[11px] hover:border-sky-400 hover:text-sky-300 transition-colors";
    btnEdit.textContent = (window.elementSdk && window.elementSdk.config.edit_button_text) || defaultConfig.edit_button_text;
    btnEdit.addEventListener("click", () => openModal("edit", u.id));

    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className =
    "focus-ring inline-flex items-center justify-center rounded-full border border-red-500/60 text-red-300 px-2.5 py-1 text-[10px] lg:text-[11px] hover:bg-red-500/10 transition-colors";
    btnDelete.textContent = (window.elementSdk && window.elementSdk.config.delete_button_text) || defaultConfig.delete_button_text;
    btnDelete.addEventListener("click", () => openModal("delete", u.id));

    btnRow.appendChild(btnView);
    btnRow.appendChild(btnEdit);
    btnRow.appendChild(btnDelete);

    tdActions.appendChild(btnRow);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
});
}

function renderUserPagination() {
const bar = document.getElementById("pagination-bar");
if (!bar) return;
bar.innerHTML = "";

const filtered = getFilteredUsers();
const total = filtered.length;
const totalPages = Math.max(
    1,
    Math.ceil(total / appState.pageSize)
);
if (appState.currentPage > totalPages) appState.currentPage = totalPages;

const info = document.createElement("div");
info.className = "opacity-70";
const start = total === 0 ? 0 : (appState.currentPage - 1) * appState.pageSize + 1;
const end = Math.min(total, appState.currentPage * appState.pageSize);
info.textContent = `Hiển thị ${start}đến${end} trong tổng ${total}`;

const pager = document.createElement("div");
pager.className = "flex items-center gap-1";

const prevBtn = document.createElement("button");
prevBtn.type = "button";
prevBtn.className =
    "focus-ring rounded-full px-2.5 py-1 text-[11px] border border-slate-700/80 hover:border-sky-400 hover:text-sky-300 transition-colors disabled:opacity-40 disabled:hover:border-slate-700/80 disabled:hover:text-inherit";
prevBtn.textContent = "Trước";
prevBtn.disabled = appState.currentPage === 1;
prevBtn.addEventListener("click", () => {
    if (appState.currentPage > 1) {
    appState.currentPage--;
    renderUserTable();
    renderUserPagination();
    }
});
pager.appendChild(prevBtn);

// Các trang (tối đa 5)
const maxPagesToShow = 5;
let startPage = Math.max(
    1,
    appState.currentPage - Math.floor(maxPagesToShow / 2)
);
let endPage = startPage + maxPagesToShow - 1;
if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
}

for (let p = startPage; p <= endPage; p++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
    "focus-ring rounded-full px-2.5 py-1 text-[11px] border border-slate-700/80 hover:border-sky-400 hover:text-sky-300 transition-colors";
    if (p === appState.currentPage) {
    btn.classList.add(
        "bg-gradient-to-r",
        "from-[#4b3ccf]",
        "to-[#007bff]",
        "text-white",
        "border-transparent"
    );
    }
    btn.textContent = p.toString();
    btn.addEventListener("click", () => {
    appState.currentPage = p;
    renderUserTable();
    renderUserPagination();
    });
    pager.appendChild(btn);
}

const nextBtn = document.createElement("button");
nextBtn.type = "button";
nextBtn.className =
    "focus-ring rounded-full px-2.5 py-1 text-[11px] border border-slate-700/80 hover:border-sky-400 hover:text-sky-300 transition-colors disabled:opacity-40 disabled:hover:border-slate-700/80 disabled:hover:text-inherit";
nextBtn.textContent = "Tiếp";
nextBtn.disabled = appState.currentPage === totalPages || totalPages === 0;
nextBtn.addEventListener("click", () => {
    if (appState.currentPage < totalPages) {
    appState.currentPage++;
    renderUserTable();
    renderUserPagination();
    }
});
pager.appendChild(nextBtn);

bar.appendChild(info);
bar.appendChild(pager);
}

// ====== TOAST ======
function renderToast() {
const container = document.getElementById("toast-container");
if (!container) return;
container.innerHTML = "";
if (!appState.toast) return;

const toast = document.createElement("div");
toast.className =
    "rounded-xl border px-3 py-2 text-xs shadow-lg flex items-start gap-2";
if (appState.toast.type === "success") {
    toast.classList.add(
    "border-emerald-500/50",
    "bg-emerald-500/20",
    "text-emerald-100"
    );
} else {
    toast.classList.add(
    "border-red-500/50",
    "bg-red-500/20",
    "text-red-100"
    );
}

const text = document.createElement("div");
text.textContent = appState.toast.message;
toast.appendChild(text);
container.appendChild(toast);
}

// ====== ELEMENT SDK: ÁP D��NG MÀU + FONT + TEXT ======
// async function initElementSdk() {
// if (!window.elementSdk) {
//     createLayout();
//     renderUserTable();
//     renderUserPagination();
//     updateModalVisibility();
//     applyConfigToUI(defaultConfig);
//     return;
// }

// window.elementSdk.init({
//     defaultConfig,
//     onConfigChange: async (config) => {
//     applyConfigToUI(config);
//     },
//     mapToCapabilities: (config) => {
//     const c = config || defaultConfig;

//     const recolorables = [
//         {
//         get: () => c.background_color || defaultConfig.background_color,
//         set: (value) => {
//             c.background_color = value;
//             window.elementSdk.setConfig({ background_color: value });
//         }
//         },
//         {
//         get: () => c.surface_color || defaultConfig.surface_color,
//         set: (value) => {
//             c.surface_color = value;
//             window.elementSdk.setConfig({ surface_color: value });
//         }
//         },
//         {
//         get: () => c.text_color || defaultConfig.text_color,
//         set: (value) => {
//             c.text_color = value;
//             window.elementSdk.setConfig({ text_color: value });
//         }
//         },
//         {
//         get: () => c.primary_action_color || defaultConfig.primary_action_color,
//         set: (value) => {
//             c.primary_action_color = value;
//             window.elementSdk.setConfig({ primary_action_color: value });
//         }
//         },
//         {
//         get: () => c.secondary_action_color || defaultConfig.secondary_action_color,
//         set: (value) => {
//             c.secondary_action_color = value;
//             window.elementSdk.setConfig({ secondary_action_color: value });
//         }
//         }
//     ];

//     const fontEditable = {
//         get: () => c.font_family || defaultConfig.font_family,
//         set: (value) => {
//         c.font_family = value;
//         window.elementSdk.setConfig({ font_family: value });
//         }
//     };

//     const fontSizeable = {
//         get: () => c.font_size || defaultConfig.font_size,
//         set: (value) => {
//         c.font_size = value;
//         window.elementSdk.setConfig({ font_size: value });
//         }
//     };

//     return {
//         recolorables,
//         borderables: [],
//         fontEditable,
//         fontSizeable
//     };
//     },
//     mapToEditPanelValues: (config) => {
//     const c = config || defaultConfig;
//     return new Map([
//         ["page_title", c.page_title || defaultConfig.page_title],
//         ["search_placeholder", c.search_placeholder || defaultConfig.search_placeholder],
//         ["view_button_text", c.view_button_text || defaultConfig.view_button_text],
//         ["edit_button_text", c.edit_button_text || defaultConfig.edit_button_text],
//         ["lock_button_text", c.lock_button_text || defaultConfig.lock_button_text],
//         ["delete_button_text", c.delete_button_text || defaultConfig.delete_button_text],
//         ["detail_modal_title", c.detail_modal_title || defaultConfig.detail_modal_title],
//         ["edit_modal_title", c.edit_modal_title || defaultConfig.edit_modal_title],
//         ["delete_modal_title", c.delete_modal_title || defaultConfig.delete_modal_title],
//         ["delete_modal_description", c.delete_modal_description || defaultConfig.delete_modal_description]
//     ]);
//     }
// });

// createLayout();
// renderUserTable();
// renderUserPagination();
// updateModalVisibility();
// applyConfigToUI(window.elementSdk.config || defaultConfig);
// }

function applyConfigToUI(config) {
const c = config || defaultConfig;
const root = document.getElementById("userRoot");
if (!root) return;

// Màu nền tổng
document.body.style.backgroundColor =
    c.background_color || defaultConfig.background_color;

// Các thẻ chính
const app = document.querySelector(".app-wrapper");
if (app) {
    app.style.color = c.text_color || defaultConfig.text_color;
    app.style.fontFamily =
    (c.font_family || defaultConfig.font_family) + ", system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
}

// Card bảng
const tableCard = document.querySelector(
    "section[aria-label='B��ng danh sách người dùng']"
);
if (tableCard) {
    tableCard.style.backgroundColor =
    c.surface_color || defaultConfig.surface_color;
}

const headerTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");
const tableTitle = document.getElementById("table-title");
const infoMeta = document.getElementById("table-meta");

const baseSize = c.font_size || defaultConfig.font_size;
if (headerTitle) headerTitle.style.fontSize = baseSize * 1.5 + "px";
if (pageSubtitle) pageSubtitle.style.fontSize = baseSize * 0.8 + "px";
if (tableTitle) tableTitle.style.fontSize = baseSize * 1.0 + "px";
if (infoMeta) infoMeta.style.fontSize = baseSize * 0.75 + "px";

// Nút gradient chính: sử dụng primary_action_color và secondary_action_color
const primaryGradients = document.querySelectorAll(
    ".bg-gradient-to-r.from-\\[\\#4b3ccf\\].to-\\[\\#007bff\\]"
);
primaryGradients.forEach((el) => {
    el.style.backgroundImage = `linear-gradient(90deg, ${
    c.primary_action_color || defaultConfig.primary_action_color
    }, ${c.secondary_action_color || defaultConfig.secondary_action_color})`;
});

// Nút có class bg-gradient-to-r from-[#4b3ccf] to-[#007bff] khác
const customGradientButtons = document.querySelectorAll(
    ".bg-gradient-to-r.from-\\[\\#4b3ccf\\].to-\\[\\#007bff\\]"
);
customGradientButtons.forEach((el) => {
    el.style.backgroundImage = `linear-gradient(90deg, ${
    c.primary_action_color || defaultConfig.primary_action_color
    }, ${c.secondary_action_color || defaultConfig.secondary_action_color})`;
});

// Text & placeholder
const searchInput = document.getElementById("search-input");
if (searchInput) {
    searchInput.placeholder =
    c.search_placeholder || defaultConfig.search_placeholder;
    searchInput.style.fontSize = baseSize * 0.85 + "px";
}

// Cập nhật text nút theo config
const allButtons = document.querySelectorAll("button");
allButtons.forEach((btn) => {
    if (btn.textContent === defaultConfig.view_button_text) {
    btn.textContent = c.view_button_text || defaultConfig.view_button_text;
    } else if (btn.textContent === defaultConfig.edit_button_text) {
    btn.textContent = c.edit_button_text || defaultConfig.edit_button_text;
    } else if (btn.textContent === defaultConfig.delete_button_text) {
    btn.textContent = c.delete_button_text || defaultConfig.delete_button_text;
    } else if (btn.textContent === defaultConfig.lock_button_text) {
    // nút Khóa/Mở khóa đã custom theo trạng thái, nên bỏ qua
    }
});

const modalTitle = document.getElementById("modal-title");
if (modalTitle) {
    // Nội dung sẽ được cập nhật lại mỗi khi mở modal
    modalTitle.style.fontSize = baseSize * 1.1 + "px";
}

// Tiêu đề trang / bảng
const titleEl = document.getElementById("page-title");
if (titleEl) {
    titleEl.textContent = c.page_title || defaultConfig.page_title;
}
}
// Khởi tạo khi dashboard load view "users"
// ====== CALL API LẤY USER THẬT TỪ BACKEND ======
async function fetchUsersFromServer() {
    try {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
  
      const res = await fetch("/api/admin/users", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
      });
  
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
  
      console.log("API /api/admin/users trả về:", data);
  
      appState.users = data.map((u) => ({
        id: String(u.id),
        fullName: u.fullName || "",
        username: u.username,
        email: u.email,
        className: u.className || "",
        role: u.role, // 'user' | 'admin'
        createdAt: u.createdAt,
        active: true,
      }));
  
      console.log("appState.users sau fetch =", appState.users);
    } catch (err) {
      console.error("Không load được users:", err);
    }
  }
  
  // ====== HÀM KHỞI TẠO TRANG QUẢN LÝ NGƯỜI DÙNG ======
  async function initAdminUserPage() {
    // 1. Lấy dữ liệu thật
    await fetchUsersFromServer();
  
    // 2. Dựng UI + render bảng
    createLayout();
    renderUserTable();
    renderUserPagination();
    updateModalVisibility();
    applyConfigToUI(defaultConfig);
  }
  
  // Export ra global để dashboard gọi
  window.initAdminUserPage = initAdminUserPage;
  
  // Nếu chỗ nào trong HTML/JS cũ vẫn đang gọi initElementSdk()
  // thì "chuyển hướng" nó sang dùng initAdminUserPage luôn:
  window.initElementSdk = initAdminUserPage;
  
  