/**
 * MyTasks - Quản lý công việc cá nhân To-Do List
 * Hoạt động 100% offline, lưu trữ bằng LocalStorage
 */

// Key lưu trữ LocalStorage
const STORAGE_KEY = 'mytasks_data_store';
const THEME_KEY = 'mytasks_theme_mode';

// Danh sách danh mục hiển thị
const CATEGORY_NAMES = {
    work: 'Công việc',
    study: 'Học tập',
    personal: 'Cá nhân',
    health: 'Sức khỏe'
};

const PRIORITY_NAMES = {
    high: 'Ưu tiên cao',
    medium: 'Trung bình',
    low: 'Ưu tiên thấp'
};

// State ứng dụng
let tasks = [];
let currentStatusFilter = 'all';
let currentCategoryFilter = 'all';
let currentSearchQuery = '';
let currentSort = 'newest';

// Dữ liệu mẫu ban đầu nếu người dùng mới dùng lần đầu
const DEFAULT_TASKS = [
    {
        id: 'task-1',
        title: 'Lên kế hoạch công việc tuần này',
        category: 'work',
        priority: 'high',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        completed: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 'task-2',
        title: 'Học 30 phút từ vựng tiếng Anh',
        category: 'study',
        priority: 'medium',
        deadline: '',
        completed: true,
        createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 'task-3',
        title: 'Đi bộ thể dục 30 phút buổi chiều',
        category: 'health',
        priority: 'low',
        deadline: '',
        completed: false,
        createdAt: new Date().toISOString()
    }
];

// Khởi chạy khi tài liệu sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadTasks();
    initEventListeners();
    render();
});

// ======================
// KHỞI TẠO & THEME
// ======================
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light-theme';
    document.body.className = savedTheme;
    updateThemeButtonText(savedTheme === 'dark-theme');
}

function updateThemeButtonText(isDark) {
    const label = document.getElementById('theme-label');
    const icon = document.querySelector('#theme-toggle i');
    if (isDark) {
        label.textContent = 'Chế độ sáng';
        icon.className = 'fa-solid fa-sun';
    } else {
        label.textContent = 'Chế độ tối';
        icon.className = 'fa-solid fa-moon';
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light-theme' : 'dark-theme';
    document.body.className = newTheme;
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeButtonText(!isDark);
}

// ======================
// QUẢN LÝ DỮ LIỆU
// ======================
function loadTasks() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            tasks = JSON.parse(data);
        } else {
            tasks = [...DEFAULT_TASKS];
            saveTasks();
        }
    } catch (e) {
        console.error('Lỗi khi đọc dữ liệu:', e);
        tasks = [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ======================
// LẮNG NGHE SỰ KIỆN
// ======================
function initEventListeners() {
    // Thêm việc mới
    document.getElementById('task-form').addEventListener('submit', handleAddTask);

    // Tìm kiếm
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = currentSearchQuery ? 'block' : 'none';
        render();
    });
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        render();
    });

    // Sắp xếp
    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        render();
    });

    // Lọc theo trạng thái
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatusFilter = btn.dataset.filter;
            updateViewTitle();
            render();
        });
    });

    // Lọc theo danh mục
    document.querySelectorAll('.cat-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCategoryFilter = item.dataset.category;
            render();
        });
    });

    // Xóa tất cả đã hoàn thành
    document.getElementById('btn-clear-completed').addEventListener('click', () => {
        const completedCount = tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            alert('Chưa có công việc nào đã hoàn thành để xóa!');
            return;
        }
        if (confirm(`Bạn có chắc chắn muốn xóa ${completedCount} công việc đã hoàn thành không?`)) {
            tasks = tasks.filter(t => !t.completed);
            saveTasks();
            render();
        }
    });

    // Chuyển đổi Theme
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Xuất dữ liệu ra file JSON
    document.getElementById('btn-export').addEventListener('click', handleExport);

    // Nhập dữ liệu từ file JSON
    const importInput = document.getElementById('file-import');
    document.getElementById('btn-import-trigger').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImport);

    // Modal Sửa công việc
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-edit').addEventListener('click', closeModal);
    document.getElementById('edit-modal-overlay').addEventListener('click', closeModal);
    document.getElementById('edit-form').addEventListener('submit', handleSaveEdit);

    // Phím tắt Esc đóng modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function updateViewTitle() {
    const titleEl = document.getElementById('current-view-title');
    switch (currentStatusFilter) {
        case 'today': titleEl.textContent = 'Công việc hôm nay'; break;
        case 'pending': titleEl.textContent = 'Công việc chưa hoàn thành'; break;
        case 'completed': titleEl.textContent = 'Công việc đã hoàn thành'; break;
        default: titleEl.textContent = 'Tất cả công việc';
    }
}

// ======================
// THÊM & SỬA & XÓA CÔNG VIỆC
// ======================
function handleAddTask(e) {
    e.preventDefault();
    const titleInput = document.getElementById('task-title-input');
    const categorySelect = document.getElementById('task-category-select');
    const prioritySelect = document.getElementById('task-priority-select');
    const deadlineInput = document.getElementById('task-deadline-input');

    const title = titleInput.value.trim();
    if (!title) return;

    const newTask = {
        id: 'task_' + Date.now(),
        title: title,
        category: categorySelect.value,
        priority: prioritySelect.value,
        deadline: deadlineInput.value || '',
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();

    // Reset input
    titleInput.value = '';
    deadlineInput.value = '';
    titleInput.focus();

    render();
}

function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        render();
    }
}

function deleteTask(id) {
    if (confirm('Bạn có chắc muốn xóa công việc này không?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        render();
    }
}

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-category').value = task.category;
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-deadline').value = task.deadline || '';

    document.getElementById('edit-modal').classList.add('active');
    document.getElementById('edit-task-title').focus();
}

function closeModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

function handleSaveEdit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.title = document.getElementById('edit-task-title').value.trim();
    task.category = document.getElementById('edit-task-category').value;
    task.priority = document.getElementById('edit-task-priority').value;
    task.deadline = document.getElementById('edit-task-deadline').value || '';

    saveTasks();
    closeModal();
    render();
}

// ======================
// XUẤT / NHẬP DỮ LIỆU
// ======================
function handleExport() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `MyTasks_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                if (confirm(`Tìm thấy ${importedData.length} công việc trong file. Bạn muốn thay thế danh sách hiện tại không?`)) {
                    tasks = importedData;
                    saveTasks();
                    render();
                    alert('Đã nhập dữ liệu thành công!');
                }
            } else {
                alert('Tập tin không đúng định dạng!');
            }
        } catch (err) {
            alert('Không thể đọc file: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ======================
// RENDER GIAO DIỆN
// ======================
function render() {
    updateBadgesAndStats();

    const taskListEl = document.getElementById('task-list');
    const emptyStateEl = document.getElementById('empty-state');

    // 1. Lọc dữ liệu
    let filtered = tasks.filter(task => {
        // Lọc trạng thái
        if (currentStatusFilter === 'pending' && task.completed) return false;
        if (currentStatusFilter === 'completed' && !task.completed) return false;
        if (currentStatusFilter === 'today') {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline).toDateString();
            const todayDate = new Date().toDateString();
            if (taskDate !== todayDate) return false;
        }

        // Lọc danh mục
        if (currentCategoryFilter !== 'all' && task.category !== currentCategoryFilter) return false;

        // Lọc tìm kiếm
        if (currentSearchQuery) {
            const matchTitle = task.title.toLowerCase().includes(currentSearchQuery);
            const matchCat = (CATEGORY_NAMES[task.category] || '').toLowerCase().includes(currentSearchQuery);
            if (!matchTitle && !matchCat) return false;
        }

        return true;
    });

    // 2. Sắp xếp
    filtered.sort((a, b) => {
        if (currentSort === 'newest') {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (currentSort === 'oldest') {
            return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (currentSort === 'deadline') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
        if (currentSort === 'priority') {
            const weight = { high: 3, medium: 2, low: 1 };
            return (weight[b.priority] || 0) - (weight[a.priority] || 0);
        }
        return 0;
    });

    // 3. Hiển thị danh sách
    taskListEl.innerHTML = '';
    if (filtered.length === 0) {
        emptyStateEl.style.display = 'block';
    } else {
        emptyStateEl.style.display = 'none';
        filtered.forEach(task => {
            const li = createTaskElement(task);
            taskListEl.appendChild(li);
        });
    }
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    // Định dạng deadline
    let deadlineHtml = '';
    if (task.deadline) {
        const d = new Date(task.deadline);
        const now = new Date();
        const isOverdue = !task.completed && d < now;
        const isToday = d.toDateString() === now.toDateString();

        let badgeClass = 'deadline-badge';
        if (isOverdue) badgeClass += ' overdue';
        else if (isToday) badgeClass += ' today';

        const timeStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        const prefix = isOverdue ? 'Quá hạn: ' : (isToday ? 'Hôm nay: ' : 'Hạn: ');

        deadlineHtml = `
            <span class="${badgeClass}">
                <i class="fa-regular fa-clock"></i> ${prefix}${timeStr}
            </span>
        `;
    }

    li.innerHTML = `
        <div class="task-checkbox-wrapper" onclick="toggleTaskComplete('${task.id}')">
            <div class="task-checkbox">
                <i class="fa-solid fa-check"></i>
            </div>
        </div>
        <div class="task-content">
            <span class="task-title">${escapeHtml(task.title)}</span>
            <div class="task-meta">
                <span class="tag-badge tag-${task.category}">
                    <i class="fa-solid fa-tag"></i> ${CATEGORY_NAMES[task.category] || task.category}
                </span>
                <span class="tag-badge priority-${task.priority}">
                    ${PRIORITY_NAMES[task.priority] || task.priority}
                </span>
                ${deadlineHtml}
            </div>
        </div>
        <div class="task-actions">
            <button class="btn-icon" onclick="openEditModal('${task.id}')" title="Sửa">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon delete" onclick="deleteTask('${task.id}')" title="Xóa">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </div>
    `;

    return li;
}

function updateBadgesAndStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    const now = new Date();
    const today = tasks.filter(t => {
        if (!t.deadline) return false;
        return new Date(t.deadline).toDateString() === now.toDateString();
    }).length;

    // Cập nhật số đếm trên badge
    document.getElementById('badge-all').textContent = total;
    document.getElementById('badge-today').textContent = today;
    document.getElementById('badge-pending').textContent = pending;
    document.getElementById('badge-completed').textContent = completed;

    // Cập nhật thống kê tiến độ
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('progress-percent').textContent = `${percent}%`;
    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('completed-count').textContent = completed;
    document.getElementById('pending-count').textContent = pending;
}

// Xử lý bảo mật XSS khi render chuỗi người dùng nhập
function escapeHtml(string) {
    const div = document.createElement('div');
    div.textContent = string;
    return div.innerHTML;
}
