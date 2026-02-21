import { useState } from 'react'
import './ScheduleView.css'
import WeeklyCalendar from './WeeklyCalendar'
import TaskList from './TaskList'

function ScheduleView({ tasks, sapixTexts = [], onToggleTask, onDeleteTask, onBulkDeleteTasks, onEditTask, userId }) {
  const [subView, setSubView] = useState('calendar') // 'calendar' or 'tasks'

  return (
    <div className="schedule-view">
      <div className="sub-tab-switcher">
        <button
          className={subView === 'calendar' ? 'active' : ''}
          onClick={() => setSubView('calendar')}
        >
          カレンダー
        </button>
        <button
          className={subView === 'tasks' ? 'active' : ''}
          onClick={() => setSubView('tasks')}
        >
          タスク一覧
        </button>
      </div>

      {subView === 'calendar' ? (
        <WeeklyCalendar
          tasks={tasks}
          sapixTexts={sapixTexts}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
          userId={userId}
        />
      ) : (
        <TaskList
          tasks={tasks}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
          onBulkDeleteTasks={onBulkDeleteTasks}
          onEditTask={onEditTask}
          userId={userId}
        />
      )}
    </div>
  )
}

export default ScheduleView
