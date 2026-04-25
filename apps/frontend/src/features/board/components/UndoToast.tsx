interface UndoToastProps {
  memberNickname: string
  taskLabel: string
  onUndo: () => void
}

export function UndoToast({ memberNickname, taskLabel, onUndo }: UndoToastProps) {
  return (
    <div className="ios-undo-toast">
      <div>
        <small>打卡成功</small>
        <strong>
          {memberNickname} · {taskLabel}
        </strong>
      </div>
      <button type="button" onClick={onUndo}>
        撤销
      </button>
    </div>
  )
}
