(function() {
    const input = document.getElementById('todoInput');
    const list = document.getElementById('todoList');
    const addBtn = document.getElementById('addTodo');

    function loadTodos() {
        try {
            return JSON.parse(localStorage.getItem('todos') || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveTodos(todos) {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    function render() {
        const todos = loadTodos();
        list.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.className = 'todo-item' + (todo.done ? ' completed' : '');

            const span = document.createElement('span');
            span.textContent = todo.text;
            li.appendChild(span);

            const actions = document.createElement('div');

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = todo.done;
            toggle.addEventListener('change', () => {
                todos[index].done = toggle.checked;
                saveTodos(todos);
                render();
            });
            actions.appendChild(toggle);

            const delBtn = document.createElement('button');
            delBtn.textContent = '✖';
            delBtn.className = 'delete-button';
            delBtn.addEventListener('click', () => {
                todos.splice(index, 1);
                saveTodos(todos);
                render();
            });
            actions.appendChild(delBtn);

            li.appendChild(actions);
            list.appendChild(li);
        });
    }

    addBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text) return;
        const todos = loadTodos();
        todos.push({ text, done: false });
        saveTodos(todos);
        input.value = '';
        render();
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addBtn.click();
        }
    });

    render();
})();
