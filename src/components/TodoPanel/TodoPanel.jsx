function TodoPanel({ tasks }) {
  return (
    <section className="todo-panel" aria-label="Aaj ka kaam">
      <h3>Aaj ka Kaam</h3>
      <ul>
        {tasks.slice(0, 3).map((task) => (
          <li key={task.id} className={`task-item task-${task.status}`}>
            <span>{task.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TodoPanel;
