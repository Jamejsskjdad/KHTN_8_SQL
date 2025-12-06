// public/frontend/admin/dashboard.js

// ===== 1. Bảo vệ trang: bắt buộc đăng nhập & là admin =====
(function () {
    const role = localStorage.getItem('authRole');
    if (!role) {
      window.location.href = '/login.html';
      return;
    }
    // Nếu bạn có phân quyền role cụ thể (admin/user/guest) thì check tại đây
    if (role !== 'admin') {
      // Không phải admin thì cho quay về trang chủ
      window.location.href = '/index.html';
    }
  })();
  // LẤY TOKEN TỪ localStorage ĐỂ GỬI LÊN BACKEND
function getAuthToken() {
  // Đổi 'authToken' thành đúng key mà bạn lưu khi login
  return localStorage.getItem('authToken') || localStorage.getItem('token');
}
function setupSidebarEvents() {
  const navPending  = document.getElementById('navPending');
  const navApproved = document.getElementById('navApproved');
  const navRejected = document.getElementById('navRejected');
  const navHome     = document.getElementById('navHome');

  if (navHome) {
    navHome.addEventListener('click', () => {
      window.location.href = '/index.html';
    });
  }

  function activateTab(tabBtn, status) {
    document
      .querySelectorAll('.db-nav-item')
      .forEach(btn => btn.classList.remove('db-nav-item--active'));
    tabBtn.classList.add('db-nav-item--active');
    currentTabStatus = status;
    loadPostsForCurrentTab(status);
  }

  if (navPending) {
    navPending.addEventListener('click', () => activateTab(navPending, 'pending'));
  }
  if (navApproved) {
    navApproved.addEventListener('click', () => activateTab(navApproved, 'approved'));
  }
  if (navRejected) {
    navRejected.addEventListener('click', () => activateTab(navRejected, 'rejected'));
  }
}

function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

  // ===== 2. Hằng số & biến global =====
  
  /** map Type trong DB -> label hiển thị */
  const TYPE_LABELS = {
    videos: 'Video',
    comics: 'Truyện tranh',
    flashcards: 'Flashcard',
    games: 'Game',
    experiments: 'Thí nghiệm',
    quizzes: 'Trắc nghiệm',
    inforgraphic: 'Infographic',
  };
  
  const STATUS_LABELS = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
  };
  
  // tab hiện tại trên sidebar (all | pending | approved | rejected)
  let currentTabStatus = 'pending';
  
  let allSubmissions = [];      // dữ liệu lấy từ backend cho tab hiện tại
  let filteredSubmissions = []; // sau khi search + filter
  let currentSearch = '';
  let currentDetail = null;     // bài đang xem trong modal
  
  // ===== 3. Khởi động khi load trang =====
  document.addEventListener('DOMContentLoaded', () => {
    initSidebarEvents();
    loadDashboardData();
    const homeBtn = document.getElementById('navHome');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.href = '/index.html';
      });
    }
  });
  
  // ===== 4. Sidebar: chuyển tab theo trạng thái =====
  
  function initSidebarEvents() {
    const navPending = document.getElementById('navPending');
    const navApproved = document.getElementById('navApproved');
    const navRejected = document.getElementById('navRejected');
  
    if (navPending) {
      navPending.addEventListener('click', () => changeTab('pending'));
    }
    if (navApproved) {
      navApproved.addEventListener('click', () => changeTab('approved'));
    }
    if (navRejected) {
      navRejected.addEventListener('click', () => changeTab('rejected'));
    }
  }
  
  /**
   * Đổi tab sidebar + load dữ liệu theo status
   * @param {'all'|'pending'|'approved'|'rejected'} status
   */
  function changeTab(status) {
    currentTabStatus = status;
  
    // Đổi class active của sidebar
    document
      .querySelectorAll('.db-sidebar-nav .db-nav-item')
      .forEach((btn) => btn.classList.remove('db-nav-item--active'));
  
    if (status === 'pending') {
      document.getElementById('navPending')?.classList.add('db-nav-item--active');
    } else if (status === 'approved') {
      document.getElementById('navApproved')?.classList.add('db-nav-item--active');
    } else if (status === 'rejected') {
      document.getElementById('navRejected')?.classList.add('db-nav-item--active');
    } else {
      // tab Trang chủ (all)
      document.getElementById('navHome')?.classList.add('db-nav-item--active');
    }
  
    // Reset filter trạng thái về "all" mỗi lần đổi tab
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) filterStatus.value = 'all';
  
    // Đổi tiêu đề bảng cho rõ ràng hơn
    const titleEl = document.querySelector(
      '.db-table-header-left .db-section-title'
    );
    if (titleEl) {
      if (status === 'pending') {
        titleEl.textContent = 'Danh sách bài chờ duyệt';
      } else if (status === 'approved') {
        titleEl.textContent = 'Danh sách bài đã duyệt';
      } else if (status === 'rejected') {
        titleEl.textContent = 'Danh sách bài bị từ chối';
      } else {
        titleEl.textContent = 'Danh sách tất cả bài đăng';
      }
    }
  
    // Load lại dữ liệu theo tab
    loadPostsForCurrentTab();
  }
  
  // ===== 5. Load dữ liệu từ backend =====
  
  async function loadDashboardData() {
    // song song: summary + danh sách theo tab hiện tại
    await Promise.all([loadSummary(), loadPostsForCurrentTab()]);
  }
  
  async function loadSummary() {
    try {
      const res = await fetch('/api/admin/posts/summary', {
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
  
      document.getElementById('metricPending').textContent =
        data.pending ?? 0;
      document.getElementById('metricApproved').textContent =
        data.approved ?? 0;
      document.getElementById('metricRejected').textContent =
        data.rejected ?? 0;
  
      if (typeof data.activeUsers !== 'undefined') {
        document.getElementById('metricUsers').textContent =
          data.activeUsers;
      }
    } catch (err) {
      console.error('Không lấy được summary:', err);
    }
  }
  
  /**
   * Gọi API /api/admin/posts?status=...
   * dựa trên currentTabStatus
   */
  async function loadPostsForCurrentTab() {
    try {
      const statusParam = encodeURIComponent(currentTabStatus || 'all');
      const res = await fetch(`/api/admin/posts?status=${statusParam}`, {
        headers: getAuthHeaders(),
      });
  
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
  
      allSubmissions = Array.isArray(data) ? data : [];
      applyFilters();
    } catch (err) {
      console.error('Không lấy được danh sách bài:', err);
    }
  }
  
  // ===== 6. Search & filter =====
  
  function handleSearch(term) {
    currentSearch = (term || '').toLowerCase();
    applyFilters();
  }
  window.handleSearch = handleSearch; // để HTML inline gọi được
  
  function applyFilters() {
    const typeVal = document.getElementById('filterType').value;
    const statusVal = document.getElementById('filterStatus').value; // all | pending | approved | rejected
  
    filteredSubmissions = allSubmissions.filter((item) => {
      const type = item.Type; // lấy đúng tên cột backend
      const status = (item.Status || '').toLowerCase();
  
      if (typeVal !== 'all' && type !== typeVal) return false;
      if (statusVal !== 'all' && status !== statusVal) return false;
  
      if (currentSearch) {
        const haystack =
          (item.Title || '').toLowerCase() +
          ' ' +
          String(item.PostId).toLowerCase() +
          ' ' +
          (item.CreatedBy || '').toLowerCase();
        if (!haystack.includes(currentSearch)) return false;
      }
  
      return true;
    });
  
    renderTable();
  }
  window.applyFilters = applyFilters;
  
  // ===== 7. Render bảng =====
  
  function renderTable() {
    const tbody = document.getElementById('submissionsBody');
    const emptyState = document.getElementById('emptyState');
    const badge = document.getElementById('badgeTotal');
  
    tbody.innerHTML = '';
  
    if (!filteredSubmissions.length) {
      emptyState.style.display = 'block';
      badge.textContent = '0 bài';
      return;
    }
  
    emptyState.style.display = 'none';
    badge.textContent = filteredSubmissions.length + ' bài';
  
    filteredSubmissions.forEach((item) => {
      const tr = document.createElement('tr');
  
      const typeKey = item.Type;
      const typeLabel = TYPE_LABELS[typeKey] || typeKey;
      const statusKey = (item.Status || '').toLowerCase();
      const statusLabel = STATUS_LABELS[statusKey] || item.Status || '';

      const createdAtText = formatDateTime(item.CreatedAt);

      // Quyết định hiển thị gì ở cột Hành động
      let actionHtml = '';

      if (statusKey === 'approved') {
        // ĐÃ DUYỆT → không cho thao tác nữa
        actionHtml = `
          <span class="db-text-muted">
            Đã duyệt – không còn thao tác
          </span>
        `;
      } else if (statusKey === 'rejected') {
        // BỊ TỪ CHỐI → cũng không cho thao tác nữa
        actionHtml = `
          <span class="db-text-muted">
            Đã từ chối – không còn thao tác
          </span>
        `;
      } else {
        // pending → vẫn cho Xem / Duyệt / Từ chối
        actionHtml = `
          <button class="db-btn db-btn--ghost"
                  onclick="openDetailModal(${item.PostId})">
            Xem
          </button>
          <button class="db-btn db-btn--primary"
                  onclick="approvePost(${item.PostId})">
            Duyệt
          </button>
          <button class="db-btn db-btn--danger"
                  onclick="rejectPost(${item.PostId})">
            Từ chối
          </button>
        `;
      }

      tr.innerHTML = `
        <td>${item.PostId}</td>
        <td>
          <div class="db-title-cell">${escapeHtml(item.Title || '')}</div>
        </td>
        <td>${typeLabel}</td>
        <td>${escapeHtml(item.CreatedBy || '')}</td>
        <td>${createdAtText}</td>
        <td>
          <span class="db-status db-status--${statusKey}">
            ${statusLabel}
          </span>
        </td>
        <td class="db-td-actions">
          ${actionHtml}
        </td>
      `;  
      tbody.appendChild(tr);
    });
  }
  
  
  // ===== 8. Modal chi tiết =====
  
  function openDetailModal(postId) {
    const record = allSubmissions.find((p) => p.PostId === postId);
    if (!record) return;
  
    currentDetail = record;
  
    const statusKey = (record.Status || '').toLowerCase();
    const statusLabel = STATUS_LABELS[statusKey] || record.Status || '';
  
    document.getElementById('detailId').textContent = '#' + record.PostId;
    document.getElementById('detailTitle').textContent = record.Title || '';
    document.getElementById('detailTitleText').textContent = record.Title || '';
  
    // Nếu sau này có Description trong DB thì dùng record.Description
    document.getElementById('detailDescription').textContent =
      record.Description || '';
  
    document.getElementById('detailType').textContent =
      TYPE_LABELS[record.Type] || record.Type || '';
  
    document.getElementById('detailLink').textContent =
      record.LinkOrImage || '';
  
    document.getElementById('detailAuthor').textContent =
      record.CreatedBy || '';
  
    document.getElementById('detailSubmittedAt').textContent =
      formatDateTime(record.CreatedAt);
  
    document.getElementById('detailStatusPill').innerHTML = `
      <span class="db-status db-status--${statusKey}">
        Trạng thái: ${statusLabel}
      </span>
    `;
    // Ẩn / hiện các nút trong modal tùy trạng thái
    const approveBtn = document.querySelector('.db-modal-actions .db-btn--primary');
    const rejectBtn  = document.querySelector('.db-modal-actions .db-btn--danger');
    const requestBtn = document.querySelector('.db-modal-actions .db-btn--warning');

    if (statusKey === 'pending') {
      // cho phép thao tác
      if (approveBtn) approveBtn.style.display = '';
      if (rejectBtn)  rejectBtn.style.display  = '';
      if (requestBtn) requestBtn.style.display = '';
    } else {
      // approved / rejected → không còn thao tác
      if (approveBtn) approveBtn.style.display = 'none';
      if (rejectBtn)  rejectBtn.style.display  = 'none';
      if (requestBtn) requestBtn.style.display = 'none';
    }

  
    // Preview đơn giản: chỉ hiển thị link, bạn có thể tùy biến thêm
    const previewBox = document.getElementById('detailPreview');
    previewBox.textContent = record.LinkOrImage || 'Chưa có link preview';
  
    document.getElementById('detailFeedback').value = '';
  
    const backdrop = document.getElementById('detailBackdrop');
    backdrop.style.display = 'flex';
  }
  window.openDetailModal = openDetailModal;
  
  function closeDetailModal() {
    const backdrop = document.getElementById('detailBackdrop');
    backdrop.style.display = 'none';
    currentDetail = null;
  }
  window.closeDetailModal = closeDetailModal;
  
  // ===== 9. Approve / Reject từ bảng =====
  
  async function approvePost(postId) {
    if (!confirm('Bạn chắc chắn muốn duyệt bài #' + postId + ' ?')) return;
  
    try {
      const res = await fetch(`/api/admin/posts/${postId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
  
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Lỗi duyệt bài');
      }
  
      alert('Đã duyệt bài #' + postId);
      await loadDashboardData();
    } catch (err) {
      console.error('Lỗi approve:', err);
      alert('Không duyệt được bài. Vui lòng thử lại.');
    }
  }
  window.approvePost = approvePost;
  
  async function rejectPost(postId) {
    if (!confirm('Bạn chắc chắn muốn từ chối bài #' + postId + ' ?')) return;
  
    try {
      const res = await fetch(`/api/admin/posts/${postId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
  
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Lỗi từ chối bài');
      }
  
      alert('Đã từ chối bài #' + postId);
      await loadDashboardData();
    } catch (err) {
      console.error('Lỗi reject:', err);
      alert('Không từ chối được bài. Vui lòng thử lại.');
    }
  }
  window.rejectPost = rejectPost;
  
  // ===== 10. Nút trong modal sử dụng lại approve/reject =====
  
  function handleApprove() {
    if (!currentDetail) return;
    approvePost(currentDetail.PostId).then(closeDetailModal);
  }
  window.handleApprove = handleApprove;
  
  function handleReject() {
    if (!currentDetail) return;
    rejectPost(currentDetail.PostId).then(closeDetailModal);
  }
  window.handleReject = handleReject;
  
  function handleRequestChanges() {
    // backend hiện tại chưa có trạng thái "review"/"request changes"
    // nên tạm thời chỉ thông báo.
    alert(
      'Chức năng "Gửi yêu cầu chỉnh sửa" sẽ được bổ sung sau khi backend hỗ trợ trạng thái này.'
    );
  }
  window.handleRequestChanges = handleRequestChanges;
  
  // ===== 11. Helpers =====
  
  function formatDateTime(value) {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(value);
    }
  }
  
  /** escape thô để tránh lỗi nếu tiêu đề có ký tự đặc biệt */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  