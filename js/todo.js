/**
 * @class TodoManager
 * Manages the to-do list data, including loading, saving,
 * and manipulating to-do items. All interactions with localStorage
 * are handled within this class.
 */
class TodoManager {
  constructor() {
    this.storageKey = 'gredoTodos';
    this.legacyStorageKey = 'myClockTodos';
    this.version = 1;
    this.todos = [];
    this.migrateLegacyStorage();
    this.load();
  }

  /**
   * Copies data saved under the old "myclock" storage key over to the
   * new "gredo" key, once, if the new key hasn't been written yet.
   */
  migrateLegacyStorage() {
    if (localStorage.getItem(this.storageKey) !== null) return;
    const legacy = localStorage.getItem(this.legacyStorageKey);
    if (legacy !== null) localStorage.setItem(this.storageKey, legacy);
  }

  /**
   * Loads to-dos from localStorage.
   * Handles data migration if versions mismatch (placeholder).
   */
  load() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey));
      if (data && data.version === this.version) {
        this.todos = data.todos;
      } else if (data) {
        // Placeholder for future migration logic
        console.warn(`Data version mismatch. Found ${data.version}, expected ${this.version}. Simple load for now.`);
        this.todos = data.todos || [];
        this.save(); // Save with the new version
      }
    } catch (error) {
      console.error("Failed to load todos from localStorage:", error);
      this.todos = [];
    }
  }

  /**
   * Saves the current to-do list to localStorage.
   */
  save() {
    try {
      const data = {
        version: this.version,
        todos: this.todos,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save todos to localStorage:", error);
    }
  }

  /**
   * Adds a new to-do item.
   * @param {string} text - The content of the to-do item.
   * @returns {object|null} The new to-do object or null if text is empty.
   */
  add(text) {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return null;
    }
    const newTodo = {
      id: Date.now(), // Simple unique ID
      text: trimmedText,
      completed: false,
    };
    this.todos.push(newTodo);
    this.save();
    return newTodo;
  }

  /**
   * Removes a to-do item by its ID.
   * @param {number} id - The ID of the to-do to remove.
   */
  remove(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
    this.save();
  }

  /**
   * Toggles the 'completed' status of a to-do item.
   * @param {number} id - The ID of the to-do to toggle.
   */
  toggle(id) {
    const todo = this.todos.find(todo => todo.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.save();
    }
  }

  /**
   * Updates the text of an existing to-do item.
   * @param {number} id - The ID of the to-do to update.
   * @param {string} text - The new text for the to-do.
   * @returns {boolean} True if the update was successful, false otherwise.
   */
  update(id, text) {
    const trimmedText = text.trim();
    if (!trimmedText) return false;

    const todo = this.todos.find(todo => todo.id === id);
    if (todo) {
      todo.text = trimmedText;
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Removes all completed to-do items from the list.
   * @returns {boolean} True if items were removed, false otherwise.
   */
  clearCompleted() {
    const initialCount = this.todos.length;
    this.todos = this.todos.filter(todo => !todo.completed);
    if (this.todos.length < initialCount) {
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Reorders the to-do list based on an array of IDs.
   * @param {number[]} orderedIds - An array of to-do IDs in the new order.
   */
  reorder(orderedIds) {
    const todoMap = new Map(this.todos.map(todo => [String(todo.id), todo]));
    this.todos = orderedIds.map(id => todoMap.get(id)).filter(Boolean); // filter(Boolean) to remove undefined if IDs mismatch
    this.save();
  }

  /**
   * Exports the current to-do list as a JSON file.
   */
  exportJSON() {
    const dataStr = JSON.stringify({ version: this.version, todos: this.todos }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gredo-todos-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports to-dos from a user-selected JSON file.
   * @param {File} file - The file selected by the user.
   * @returns {Promise<void>} A promise that resolves when import is complete or rejects on error.
   */
  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data && Array.isArray(data.todos)) {
            this.todos = data.todos;
            this.save();
            resolve();
          } else {
            reject(new Error("잘못된 JSON 파일 형식입니다. 'todos' 배열이 필요합니다."));
          }
        } catch (error) {
          reject(new Error("JSON 파일을 읽는 중 오류가 발생했습니다."));
        }
      };
      reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
      reader.readAsText(file);
    });
  }
}

/**
 * UI management for the To-Do List.
 * Handles rendering and event listeners.
 */
class TodoUI {
  constructor(todoManager) {
    this.manager = todoManager;
    this.todoListEl = document.getElementById('todoList');
    this.todoForm = document.getElementById('todoForm');
    this.todoInput = document.getElementById('todoInput');
    this.exportBtn = document.getElementById('exportBtn');
    this.importInput = document.getElementById('importInput');
    this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
    this.toastEl = document.getElementById('toast');
    this.toastTimer = null;
    this.draggedItem = null;

    this.ioInfoBackdrop = document.getElementById('ioInfoBackdrop');
    this.ioInfoPanel = document.getElementById('ioInfoPanel');
    this.ioInfoCancelBtn = document.getElementById('ioInfoCancelBtn');
    this.ioInfoConfirmBtn = document.getElementById('ioInfoConfirmBtn');

    this.init();
  }

  init() {
    this.render();
    this.addEventListeners();
  }

  render() {
    this.todoListEl.innerHTML = '';
    let hasCompleted = false;

    if (this.manager.todos.length === 0) {
      this.todoListEl.innerHTML = '<li class="todo-item-empty">할 일이 없습니다.</li>';
    } else {
      this.manager.todos.forEach(todo => {
        const itemEl = document.createElement('li');
        itemEl.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        itemEl.dataset.id = todo.id; // Use dataset for ID
        if (todo.completed) hasCompleted = true;
        itemEl.draggable = true;
        itemEl.innerHTML = `
          <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
          <span class="todo-text">${todo.text}</span>
          <input type="text" class="todo-edit-input" value="${todo.text}" style="display: none;">
          <button class="todo-delete-btn" aria-label="삭제">×</button>
        `;
        this.todoListEl.appendChild(itemEl);
      });
    }

    // Show the "Clear Completed" button only if there are completed items
    this.clearCompletedBtn.style.display = hasCompleted ? 'block' : 'none';
  }

  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove("show"), 3200);
  }

  openIoInfo() {
    this.ioInfoBackdrop.classList.add('open');
    this.ioInfoPanel.classList.add('open');
  }

  closeIoInfo() {
    this.ioInfoBackdrop.classList.remove('open');
    this.ioInfoPanel.classList.remove('open');
  }

  addEventListeners() {
    this.todoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.manager.add(this.todoInput.value)) {
        this.todoInput.value = '';
        this.render();
      }
    });

    this.todoListEl.addEventListener('click', (e) => {
      const target = e.target;
      const itemEl = target.closest('.todo-item');
      if (!itemEl) return;

      const id = Number(itemEl.dataset.id);
      if (target.classList.contains('todo-delete-btn')) {
        this.manager.remove(id);
      } else if (target.classList.contains('todo-checkbox')) {
        this.manager.toggle(id);
      }
      this.render();
    });

    this.todoListEl.addEventListener('dblclick', (e) => {
      const textSpan = e.target.closest('.todo-text');
      if (!textSpan) return;

      const itemEl = textSpan.closest('.todo-item');
      itemEl.classList.add('editing');

      const input = itemEl.querySelector('.todo-edit-input');
      input.style.display = 'block';
      textSpan.style.display = 'none';
      input.focus();
      input.select();

      const saveAndExit = () => {
        const newText = input.value;
        const id = Number(itemEl.dataset.id);

        this.manager.update(id, newText);
        // The full render will switch back to the span view
        this.render();
      };

      const onKeyDown = (ev) => {
        if (ev.key === 'Enter') {
          saveAndExit();
        } else if (ev.key === 'Escape') {
          // Just re-render to cancel, no saving
          this.render();
        }
      };

      input.addEventListener('blur', saveAndExit, { once: true });
      input.addEventListener('keydown', onKeyDown);
    });

    this.exportBtn.addEventListener('click', () => {
      this.openIoInfo();
    });

    this.ioInfoCancelBtn.addEventListener('click', () => {
      this.closeIoInfo();
    });

    this.ioInfoBackdrop.addEventListener('click', () => {
      this.closeIoInfo();
    });

    this.ioInfoConfirmBtn.addEventListener('click', () => {
      this.manager.exportJSON();
      this.showToast("할 일 목록이 파일로 저장되었습니다.");
      this.closeIoInfo();
    });

    this.importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.manager.importJSON(file)
          .then(() => {
            this.render();
            this.showToast("할 일 목록을 불러왔습니다.");
          })
          .catch(error => this.showToast(error.message));
      }
      // Reset input to allow importing the same file again
      e.target.value = '';
    });

    this.clearCompletedBtn.addEventListener('click', () => {
      if (this.manager.clearCompleted()) {
        this.render();
        this.showToast("완료된 항목을 모두 삭제했습니다.");
      } else {
        // This case should ideally not be reachable if the button is hidden
        this.showToast("삭제할 완료된 항목이 없습니다.");
      }
    });

    // --- Drag and Drop Event Listeners ---

    this.todoListEl.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('todo-item')) {
        this.draggedItem = e.target;
        // Add a class to the dragged item for styling after a short delay
        setTimeout(() => {
          this.draggedItem.classList.add('dragging');
        }, 0);
      }
    });

    this.todoListEl.addEventListener('dragend', () => {
      if (this.draggedItem) {
        this.draggedItem.classList.remove('dragging');
        this.draggedItem = null;

        // After drop, get the new order of IDs from the DOM
        const orderedIds = Array.from(this.todoListEl.querySelectorAll('.todo-item'))
                                .map(item => Number(item.dataset.id));
        
        // Update the data and save
        this.manager.reorder(orderedIds);
        // No need to re-render here as the DOM is already updated visually
      }
    });

    this.todoListEl.addEventListener('dragover', (e) => {
      e.preventDefault(); // Necessary to allow dropping
      const afterElement = this.getDragAfterElement(this.todoListEl, e.clientY);
      if (afterElement == null) {
        this.todoListEl.appendChild(this.draggedItem);
      } else {
        this.todoListEl.insertBefore(this.draggedItem, afterElement);
      }
    });
  }

  /**
   * Finds the list item that should appear after the dragged item.
   * @param {HTMLElement} container - The list container.
   * @param {number} y - The vertical mouse position.
   * @returns {HTMLElement|null} The element to insert before, or null.
   */
  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const todoManager = new TodoManager();
  new TodoUI(todoManager);
});