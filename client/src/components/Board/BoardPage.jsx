import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext, DragOverlay, closestCorners, useSensor, useSensors,
  PointerSensor, KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal, AlertCircle, Clock, User } from "lucide-react";
import { useTaskStore } from "../../context/stores";
import { emitTaskMove } from "../../services/socket";
import { formatDistanceToNow } from "date-fns";
import Avatar from "../common/Avatar";
import clsx from "clsx";
import toast from "react-hot-toast";
import TaskModal from "./TaskModal";

const COLUMNS = [
  { id: "backlog",     label: "Backlog",     color: "text-slate-400",  bg: "bg-slate-500/10" },
  { id: "todo",        label: "To Do",       color: "text-blue-400",   bg: "bg-blue-500/10"  },
  { id: "in_progress", label: "In Progress", color: "text-yellow-400", bg: "bg-yellow-500/10"},
  { id: "in_review",   label: "In Review",   color: "text-purple-400", bg: "bg-purple-500/10"},
  { id: "done",        label: "Done",        color: "text-green-400",  bg: "bg-green-500/10" },
];

const PRIORITY_COLORS = {
  none: "bg-slate-500/20 text-slate-400",
  low: "bg-blue-500/20 text-blue-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

function TaskCard({ task, onClick, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } =
    useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={clsx(
        "card-hover p-3 cursor-pointer group select-none",
        "hover:translate-y-[-1px]",
        isDragging && "drag-overlay"
      )}
    >
      {}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {task.priority !== "none" && (
          <span className={clsx("badge text-[10px]", PRIORITY_COLORS[task.priority])}>
            {task.priority}
          </span>
        )}
        {task.labels?.slice(0, 2).map((l) => (
          <span
            key={l.name}
            className="badge text-[10px]"
            style={{ backgroundColor: l.color + "30", color: l.color, border: `1px solid ${l.color}50` }}
          >
            {l.name}
          </span>
        ))}
      </div>

      {}
      <p className="text-sm text-slate-200 font-medium leading-snug mb-2">{task.title}</p>

      {}
      {task.checklist?.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{task.checklist.filter((c) => c.completed).length}/{task.checklist.length}</span>
          </div>
          <div className="h-1 bg-surface-500 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{
                width: `${Math.round(
                  (task.checklist.filter((c) => c.completed).length / task.checklist.length) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {}
      <div className="flex items-center justify-between mt-2">
        <div className="flex -space-x-1.5">
          {task.assignees?.slice(0, 3).map((u) => (
            <Avatar key={u._id} user={u} size="xs" className="ring-1 ring-surface-700" />
          ))}
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs">
              <Clock size={10} />
              {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
            </span>
          )}
          {task.comments?.length > 0 && (
            <span className="text-xs">{task.comments.length} 💬</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({ column, tasks, onAddTask, onOpenTask }) {
  const taskIds = tasks.map((t) => t._id);

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {}
      <div className={clsx("flex items-center justify-between px-3 py-2 rounded-xl mb-2", column.bg)}>
        <div className="flex items-center gap-2">
          <span className={clsx("font-semibold text-sm", column.color)}>{column.label}</span>
          <span className="text-xs bg-surface-600 text-slate-400 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1 rounded hover:bg-surface-500 text-slate-500 hover:text-white transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {}
      <div className="flex-1 space-y-2 min-h-[120px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onClick={onOpenTask} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            onClick={() => onAddTask(column.id)}
            className="h-20 border-2 border-dashed border-surface-500 rounded-xl flex items-center justify-center
                       text-slate-600 text-sm hover:border-brand-600/50 hover:text-brand-500 cursor-pointer transition-all"
          >
            + Add task
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { projectId } = useParams();
  const { tasks, fetchTasks, reorderTasks, createTask } = useTaskStore();
  const [activeTask, setActiveTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [addingToColumn, setAddingToColumn] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchTasks({ project: projectId });
  }, [projectId]);

  const getColumnTasks = (status) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find((t) => t._id === active.id));
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t._id === active.id);
    const overTask = tasks.find((t) => t._id === over.id);
    const overColumn = over.id;

    const newStatus = overTask?.status || over.id;
    if (!COLUMNS.find((c) => c.id === newStatus)) return;

    const columnTasks = getColumnTasks(newStatus);
    const overIndex = columnTasks.findIndex((t) => t._id === over.id);
    const newOrder = overIndex >= 0 ? overIndex : columnTasks.length;

    const updates = [{ id: activeTask._id, status: newStatus, order: newOrder }];

    emitTaskMove({
      taskId: activeTask._id,
      fromStatus: activeTask.status,
      toStatus: newStatus,
      order: newOrder,
      projectId,
    });

    reorderTasks(updates, projectId);
  };

  const handleAddTask = async (status) => {
    setAddingToColumn(status);
    setNewTaskTitle("");
  };

  const submitNewTask = async () => {
    if (!newTaskTitle.trim()) return setAddingToColumn(null);
    try {
      await createTask({ project: projectId, title: newTaskTitle.trim(), status: addingToColumn });
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    }
    setAddingToColumn(null);
    setNewTaskTitle("");
  };

  return (
    <div className="h-full flex flex-col">
      {}
      <div className="px-6 py-4 border-b border-surface-600 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-display font-bold text-white">Kanban Board</h1>
        <button
          onClick={() => handleAddTask("todo")}
          className="btn-primary btn-sm"
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => {
              const colTasks = getColumnTasks(col.id);
              return (
                <div key={col.id} className="flex flex-col w-72 flex-shrink-0">
                  {}
                  <div className={clsx("flex items-center justify-between px-3 py-2 rounded-xl mb-2", col.bg)}>
                    <div className="flex items-center gap-2">
                      <span className={clsx("font-semibold text-sm", col.color)}>{col.label}</span>
                      <span className="text-xs bg-surface-600 text-slate-400 px-1.5 py-0.5 rounded-full">
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddTask(col.id)}
                      className="p-1 rounded hover:bg-surface-500 text-slate-500 hover:text-white"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {}
                  {addingToColumn === col.id && (
                    <div className="card mb-2 p-2">
                      <input
                        autoFocus
                        className="input text-sm mb-2"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task title..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewTask();
                          if (e.key === "Escape") setAddingToColumn(null);
                        }}
                      />
                      <div className="flex gap-2">
                        <button onClick={submitNewTask} className="btn-primary btn-sm flex-1">Add</button>
                        <button onClick={() => setAddingToColumn(null)} className="btn-ghost btn-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  {}
                  <div className="flex-1 space-y-2 overflow-y-auto min-h-[80px] pr-1">
                    <SortableContext
                      items={colTasks.map((t) => t._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {colTasks.map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))}
                    </SortableContext>
                    {colTasks.length === 0 && (
                      <div
                        onClick={() => handleAddTask(col.id)}
                        className="h-16 border-2 border-dashed border-surface-500 rounded-xl flex items-center justify-center
                                   text-slate-600 text-xs hover:border-brand-600/50 hover:text-brand-500 cursor-pointer transition-all"
                      >
                        Drop here or click +
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {}
          <DragOverlay>
            {activeTask && (
              <TaskCard task={activeTask} onClick={() => {}} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
