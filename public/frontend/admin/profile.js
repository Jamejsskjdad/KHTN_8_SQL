// ========== AUTH ==========
const token = localStorage.getItem('authToken');
const role = localStorage.getItem('authRole');

if (!token || role !== 'admin') {
  window.location.href = '/index.html';
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token
  };
}

// ========== TOAST ==========
function showToast(type, title, msg) {
  const box = document.getElementById('toastContainer');
  const t = document.createElement('div');

  t.className = 'toast ' + (type === 'success' ? 'toast-success' : 'toast-error');
  t.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${msg}</div>
    </div>
    <button class="toast-close-btn">×</button>
  `;

  t.querySelector('.toast-close-btn').onclick = () => t.remove();
  box.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ========== LOAD PROFILE ==========
async function loadProfile() {
  try {
    const res = await fetch('/api/admin/profile', {
      method: 'GET',
      headers: getHeaders()
    });

    if (!res.ok) throw new Error();

    const data = await res.json();

    const name = data.Name || data.Username || 'Admin';
    const email = data.Email || '';
    const created = data.CreatedAt
      ? new Date(data.CreatedAt).toLocaleString('vi-VN')
      : '...';
    const roleText = data.Role || 'admin';
    const first = name.charAt(0).toUpperCase() || 'A';

    // Header
    document.getElementById('headerAdminName').textContent = name;
    document.getElementById('headerAdminEmail').textContent = email;
    document.getElementById('headerAvatar').textContent = first;

    // Card
    document.getElementById('profileAvatarLarge').textContent = first;
    document.getElementById('profileFullname').textContent = name;
    document.getElementById('profileEmail').textContent = email;
    document.getElementById('profileRole').textContent = roleText;
    document.getElementById('profileCreatedAt').textContent = created;

    // Form
    document.getElementById('inputFullname').value = name;
    document.getElementById('inputEmail').value = email;
  } catch (err) {
    console.error(err);
    showToast('error', 'Lỗi', 'Không tải được thông tin tài khoản.');
  }
}

// ========== UPDATE PROFILE (CALL API) ==========
document.getElementById('editProfileForm').addEventListener('submit', async e => {
  e.preventDefault();

  const fullname = document.getElementById('inputFullname').value.trim();
  const email = document.getElementById('inputEmail').value.trim();

  if (!fullname || !email) {
    return showToast('error', 'Thiếu dữ liệu', 'Vui lòng nhập đủ họ tên và email.');
  }

  const btn = document.getElementById('btnSaveProfile');
  btn.disabled = true;

  try {
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ fullname, email })
    });

    const data = await res.json();

    if (!res.ok) {
      return showToast('error', 'Lỗi', data.message || 'Không cập nhật được thông tin.');
    }

    // cập nhật UI khi server OK
    const first = fullname.charAt(0).toUpperCase() || 'A';

    document.getElementById('headerAdminName').textContent = fullname;
    document.getElementById('headerAdminEmail').textContent = email;
    document.getElementById('headerAvatar').textContent = first;

    document.getElementById('profileFullname').textContent = fullname;
    document.getElementById('profileEmail').textContent = email;
    document.getElementById('profileAvatarLarge').textContent = first;

    showToast('success', 'Đã lưu', 'Cập nhật thông tin thành công.');
  } catch (err) {
    console.error(err);
    showToast('error', 'Lỗi', 'Không kết nối được server.');
  } finally {
    btn.disabled = false;
  }
});

// ========== CHANGE PASSWORD (CALL API) ==========
document.getElementById('changePasswordForm').addEventListener('submit', async e => {
  e.preventDefault();

  const oldPw = document.getElementById('inputOldPassword').value;
  const newPw = document.getElementById('inputNewPassword').value;
  const confirmPw = document.getElementById('inputConfirmPassword').value;

  if (!oldPw || !newPw || !confirmPw) {
    return showToast('error', 'Thiếu thông tin', 'Hãy nhập đủ 3 trường mật khẩu.');
  }

  if (newPw.length < 8) {
    return showToast('error', 'Mật khẩu yếu', 'Mật khẩu mới phải ≥ 8 ký tự.');
  }

  if (newPw !== confirmPw) {
    return showToast('error', 'Sai khớp', 'Mật khẩu mới nhập lại không trùng khớp.');
  }

  const btn = document.getElementById('btnChangePassword');
  btn.disabled = true;

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
    });

    const data = await res.json();

    if (!res.ok) {
      return showToast('error', 'Lỗi', data.message || 'Không đổi được mật khẩu.');
    }

    showToast('success', 'Thành công', 'Đã đổi mật khẩu.');

    document.getElementById('inputOldPassword').value = '';
    document.getElementById('inputNewPassword').value = '';
    document.getElementById('inputConfirmPassword').value = '';
  } catch (err) {
    console.error(err);
    showToast('error', 'Lỗi', 'Không kết nối được server.');
  } finally {
    btn.disabled = false;
  }
});

// ========== NAVIGATION ==========
document.getElementById('btnBackHome').onclick = () => {
  window.location.href = '/index.html';
};

document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authRole');
  window.location.href = '/login.html';
};

// Init
loadProfile();
