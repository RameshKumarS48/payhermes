'use client'

import { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, Bot, Phone, Calendar, Webhook } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Workflow, type WorkflowQuestion } from '@/lib/workflow-schema'

interface Props {
  workflow: Workflow
  onChange: (w: Workflow) => void
}

const TYPE_LABELS: Record<WorkflowQuestion['type'], string> = {
  text: 'Text',
  phone: 'Phone',
  datetime: 'Date/Time',
  choice: 'Choice',
  number: 'Number',
  confirmation: 'Confirm',
}

function SortableQuestion({
  question,
  index,
  onUpdate,
  onDelete,
}: {
  question: WorkflowQuestion
  index: number
  onUpdate: (q: WorkflowQuestion) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-border bg-card p-4 space-y-3',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {index + 1}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{question.key}</span>
            <select
              value={question.type}
              onChange={(e) =>
                onUpdate({ ...question, type: e.target.value as WorkflowQuestion['type'] })
              }
              className="ml-auto text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground"
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <textarea
            value={question.prompt}
            onChange={(e) => onUpdate({ ...question, prompt: e.target.value })}
            rows={2}
            placeholder="What should the agent ask?"
            className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          {question.type === 'choice' && (
            <input
              value={(question.choices ?? []).join(', ')}
              onChange={(e) =>
                onUpdate({ ...question, choices: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
              }
              placeholder="Options separated by commas"
              className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => onUpdate({ ...question, required: e.target.checked })}
              className="rounded"
            />
            req
          </label>
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function WorkflowCards({ workflow, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const updateField = useCallback(
    <K extends keyof Workflow>(key: K, value: Workflow[K]) => {
      onChange({ ...workflow, [key]: value })
    },
    [workflow, onChange]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = workflow.questions.findIndex((q) => q.key === active.id)
      const newIndex = workflow.questions.findIndex((q) => q.key === over.id)
      updateField('questions', arrayMove(workflow.questions, oldIndex, newIndex))
    },
    [workflow.questions, updateField]
  )

  const updateQuestion = useCallback(
    (index: number, q: WorkflowQuestion) => {
      const next = [...workflow.questions]
      next[index] = q
      updateField('questions', next)
    },
    [workflow.questions, updateField]
  )

  const deleteQuestion = useCallback(
    (index: number) => {
      updateField('questions', workflow.questions.filter((_, i) => i !== index))
    },
    [workflow.questions, updateField]
  )

  const addQuestion = useCallback(() => {
    const newQ: WorkflowQuestion = {
      key: `question_${workflow.questions.length + 1}`,
      prompt: '',
      type: 'text',
      required: true,
    }
    updateField('questions', [...workflow.questions, newQ])
  }, [workflow.questions, updateField])

  const toolTypes = workflow.tools.map((t) => t.type)

  const toggleCalendar = useCallback(() => {
    if (toolTypes.includes('google_calendar.book')) {
      updateField('tools', workflow.tools.filter((t) => t.type !== 'google_calendar.book'))
    } else {
      updateField('tools', [
        ...workflow.tools,
        { type: 'google_calendar.book', config: { calendar_id: 'primary', duration_min: 30 } },
      ])
    }
  }, [toolTypes, workflow.tools, updateField])

  const toggleWebhook = useCallback(() => {
    if (toolTypes.includes('webhook')) {
      updateField('tools', workflow.tools.filter((t) => t.type !== 'webhook'))
    } else {
      updateField('tools', [
        ...workflow.tools,
        { type: 'webhook', config: { url: '', method: 'POST' as const } },
      ])
    }
  }, [toolTypes, workflow.tools, updateField])

  return (
    <div className="space-y-4">
      {/* Persona */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Bot className="h-4 w-4" />
          Persona
        </div>
        <input
          value={workflow.persona.role}
          onChange={(e) => updateField('persona', { ...workflow.persona, role: e.target.value })}
          placeholder="Agent role (e.g. appointment scheduler for Dr. Mehta)"
          className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
        <select
          value={workflow.persona.tone}
          onChange={(e) =>
            updateField('persona', { ...workflow.persona, tone: e.target.value as Workflow['persona']['tone'] })
          }
          className="text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
          <option value="playful">Playful</option>
          <option value="concise">Concise</option>
        </select>
      </div>

      {/* Greeting */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Greeting</div>
        <textarea
          value={workflow.greeting}
          onChange={(e) => updateField('greeting', e.target.value)}
          rows={2}
          placeholder="First thing the agent says…"
          className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      {/* Questions */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground px-1">Questions</div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={workflow.questions.map((q) => q.key)}
            strategy={verticalListSortingStrategy}
          >
            {workflow.questions.map((q, i) => (
              <SortableQuestion
                key={q.key}
                question={q}
                index={i}
                onUpdate={(updated) => updateQuestion(i, updated)}
                onDelete={() => deleteQuestion(i)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          onClick={addQuestion}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>

      {/* Tools */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-medium text-muted-foreground">Tools</div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={toolTypes.includes('google_calendar.book')}
            onChange={toggleCalendar}
            className="rounded"
          />
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Google Calendar — book slots</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={toolTypes.includes('webhook')}
            onChange={toggleWebhook}
            className="rounded"
          />
          <Webhook className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Webhook — POST captured data</span>
        </label>
      </div>

      {/* Closing */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Closing</div>
        <textarea
          value={workflow.closing}
          onChange={(e) => updateField('closing', e.target.value)}
          rows={2}
          placeholder="Goodbye message…"
          className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
    </div>
  )
}
