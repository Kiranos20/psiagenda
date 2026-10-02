'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Appointment } from './actions'
import {
  updateStatus,
  updateNotes,
  createAppointment,
  deleteAppointment,
} from './actions'

// ─── Tipos e constantes ──────────────────────────────────────────────────────

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DOW_FULL  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTHS    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_STYLES = {
  pendente:   { bg: 'bg-yellow-100 dark:bg-yellow-900/40',  border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-200',  dot: 'bg-yellow-400',  label: 'Pendente'   },
  confirmado: { bg: 'bg-green-100 dark:bg-green-900/40',    border: 'border-green-300 dark:border-green-700',   text: 'text-green-800 dark:text-green-200',    dot: 'bg-green-400',   label: 'Confirmado' },
  cancelado:  { bg: 'bg-red-100 dark:bg-red-900/40',        border: 'border-red-300 dark:border-red-700',       text: 'text-red-800 dark:text-red-200',        dot: 'bg-red-400',     label: 'Cancelado'  },
  realizado:  { bg: 'bg-purple-100 dark:bg-purple-900/40',  border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-800 dark:text-purple-200',   dot: 'bg-purple-400',  label: 'Realizado'  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function pad(n: number) { return String(n).padStart(2, '0') }
function toDatetimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function getWeekDays(base: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    return d
  })
}
function getMondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isSameHour(iso: string, day: Date, hour: number) {
  const d = new Date(iso)
  return isSameDay(d, day) && d.getHours() === hour
}

// ─── Modal de detalhes ────────────────────────────────────────────────────────

function AppointmentModal({ appt, onClose, fontSize }: { appt: Appointment; onClose: () => void; fontSize: number }) {
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(appt.notes ?? '')
  const [saved, setSaved] = useState(false)
  const s = STATUS_STYLES[appt.status]

  function handleStatus(status: Appointment['status']) {
    startTransition(async () => { await updateStatus(appt.id, status); onClose() })
  }
  function handleSaveNotes() {
    startTransition(async () => { await updateNotes(appt.id, notes); setSaved(true); setTimeout(() => setSaved(false), 2000) })
  }
  function handleDelete() {
    if (!confirm('Remover esta consulta definitivamente?')) return
    startTransition(async () => { await deleteAppointment(appt.id); onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" style={{ fontSize }}>
        {/* Header */}
        <div className={`px-5 py-4 ${s.bg} border-b ${s.border}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold ${s.text} uppercase tracking-widest mb-1`}>{s.label}</p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{appt.patients.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{fmtDateFull(appt.scheduled_at)} · {fmtTime(appt.scheduled_at)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1 rounded-lg hover:bg-black/10 transition">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Duração</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">{appt.duration} min</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Modalidade</p>
              <p className="font-medium text-gray-800 dark:text-gray-100 capitalize">{appt.modality}</p>
            </div>
            {appt.patients.phone && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Telefone</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{appt.patients.phone}</p>
              </div>
            )}
            {appt.patients.email && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">E-mail</p>
                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{appt.patients.email}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Anotações privadas</label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setSaved(false) }}
              rows={3}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder="Observações sobre a sessão..."
            />
            <button onClick={handleSaveNotes} disabled={isPending} className="mt-1 text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50">
              {saved ? '✓ Salvo' : 'Salvar anotação'}
            </button>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Alterar status</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_STYLES) as Appointment['status'][]).map(st => {
                const ss = STATUS_STYLES[st]
                return (
                  <button key={st} onClick={() => handleStatus(st)} disabled={isPending || appt.status === st}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition
                      ${appt.status === st ? `${ss.bg} ${ss.border} ${ss.text}` : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'} disabled:cursor-not-allowed`}>
                    <span className={`w-2 h-2 rounded-full ${ss.dot}`} />{ss.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-between">
          <button onClick={handleDelete} disabled={isPending} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">Remover</button>
          <button onClick={onClose} className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de nova consulta ───────────────────────────────────────────────────

function NewAppointmentModal({ onClose, fontSize }: { onClose: () => void; fontSize: number }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    patientName: '', patientPhone: '', patientEmail: '',
    scheduledAt: toDatetimeLocal(new Date()),
    duration: '50', modality: 'presencial' as 'presencial' | 'online',
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); setError('') }

  function handleSubmit() {
    if (!form.patientName.trim() || !form.scheduledAt) { setError('Nome e data/hora são obrigatórios.'); return }
    startTransition(async () => {
      try {
        await createAppointment({ ...form, duration: parseInt(form.duration) })
        onClose()
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro ao salvar.') }
    })
  }

  const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" style={{ fontSize }}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nova consulta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1 rounded-lg hover:bg-black/10 transition">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome do paciente *</label>
            <input className={inputClass} value={form.patientName} onChange={e => set('patientName', e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Telefone</label>
              <input className={inputClass} value={form.patientPhone} onChange={e => set('patientPhone', e.target.value)} placeholder="(21) 99999-9999" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">E-mail</label>
              <input type="email" className={inputClass} value={form.patientEmail} onChange={e => set('patientEmail', e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data e horário *</label>
            <input type="datetime-local" className={inputClass} value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Duração</label>
              <select className={inputClass} value={form.duration} onChange={e => set('duration', e.target.value)}>
                <option value="50">50 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Modalidade</label>
              <select className={inputClass} value={form.modality} onChange={e => set('modality', e.target.value as 'presencial' | 'online')}>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending} className="px-4 py-2 text-sm rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 font-medium">
            {isPending ? 'Salvando...' : 'Salvar consulta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Visão de dia (mobile) ────────────────────────────────────────────────────

function DayView({ day, appointments, onSelect }: { day: Date; appointments: Appointment[]; onSelect: (a: Appointment) => void }) {
  const dayAppts = appointments.filter(a => isSameDay(new Date(a.scheduled_at), day)).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  return (
    <div className="flex-1 overflow-y-auto">
      {HOURS.map(hour => {
        const cellAppts = dayAppts.filter(a => new Date(a.scheduled_at).getHours() === hour)
        return (
          <div key={hour} className="flex border-t border-gray-100 dark:border-gray-800 min-h-[64px]">
            <div className="w-14 shrink-0 text-right pr-3 pt-2 text-xs text-gray-300 dark:text-gray-600">{pad(hour)}:00</div>
            <div className="flex-1 p-1 space-y-1">
              {cellAppts.map(appt => {
                const s = STATUS_STYLES[appt.status]
                return (
                  <button key={appt.id} onClick={() => onSelect(appt)}
                    className={`w-full text-left rounded-xl px-3 py-2 border ${s.bg} ${s.border} hover:brightness-95 transition`}>
                    <p className={`text-sm font-medium ${s.text} truncate`}>{appt.patients.name}</p>
                    <p className={`text-xs ${s.text} opacity-70`}>{fmtTime(appt.scheduled_at)} · {appt.duration}min · {appt.modality}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Visão de semana (desktop) ────────────────────────────────────────────────

function WeekView({ days, appointments, onSelect }: { days: Date[]; appointments: Appointment[]; onSelect: (a: Appointment) => void }) {
  return (
    <div className="flex-1 overflow-auto">
      {/* Cabeçalho dos dias */}
      <div className="grid gap-0 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-950 z-10" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div />
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date())
          return (
            <div key={i} className="text-center py-3 px-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{DOW_SHORT[day.getDay()]}</p>
              <p className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-purple-600' : 'text-gray-400 dark:text-gray-500'}`}>{day.getDate()}</p>
            </div>
          )
        })}
      </div>

      {/* Grade */}
      <div className="grid gap-0" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        {HOURS.map(hour => (
          <>
            <div key={`l-${hour}`} className="text-right pr-3 pt-2 text-xs text-gray-300 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800 min-h-[56px]">{pad(hour)}:00</div>
            {days.map((day, di) => {
              const cellAppts = appointments.filter(a => isSameHour(a.scheduled_at, day, hour))
              return (
                <div key={`${hour}-${di}`} className="border-t border-l border-gray-100 dark:border-gray-800 relative min-h-[56px] hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                  {cellAppts.map(appt => {
                    const s = STATUS_STYLES[appt.status]
                    const topPct = (new Date(appt.scheduled_at).getMinutes() / 60) * 100
                    const heightPct = Math.min((appt.duration / 60) * 100, 100)
                    return (
                      <button key={appt.id} onClick={() => onSelect(appt)}
                        className={`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-left border ${s.bg} ${s.border} hover:brightness-95 transition overflow-hidden`}
                        style={{ top: `${topPct}%`, height: `${heightPct}%`, minHeight: 28 }}>
                        <p className={`text-xs font-medium ${s.text} truncate leading-tight`}>{appt.patients.name}</p>
                        <p className={`text-[10px] ${s.text} opacity-70 leading-tight`}>{fmtTime(appt.scheduled_at)}</p>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

// ─── Mini calendário (para navegação) ────────────────────────────────────────

function MiniCal({ selected, onSelect, appointments }: { selected: Date; onSelect: (d: Date) => void; appointments: Appointment[] }) {
  const [month, setMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1))
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const today = new Date(); today.setHours(0,0,0,0)

  const apptDays = new Set(appointments.map(a => {
    const d = new Date(a.scheduled_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }))

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 text-sm">←</button>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{MONTHS[month.getMonth()].slice(0,3)} {month.getFullYear()}</span>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 text-sm">→</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} className="text-center text-[10px] text-gray-400 py-1">{d}</div>)}
        {Array.from({length: firstDow}).map((_,i) => <div key={i} />)}
        {Array.from({length: daysInMonth}).map((_,i) => {
          const date = new Date(month.getFullYear(), month.getMonth(), i+1)
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          const isToday = date.getTime() === today.getTime()
          const isSel = isSameDay(date, selected)
          const hasAppt = apptDays.has(key)
          return (
            <button key={i} onClick={() => onSelect(date)}
              className={`text-[11px] py-1.5 rounded-lg relative font-medium transition
                ${isSel ? 'bg-purple-600 text-white' : isToday ? 'text-purple-600 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              {i+1}
              {hasAppt && !isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminCalendar({ appointments, weekStart }: { appointments: Appointment[]; weekStart: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [view, setView] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  const weekBase = getMondayOf(new Date(weekStart))
  const days = getWeekDays(weekBase)

  function navigate(offset: number) {
    const base = new Date(weekBase)
    base.setDate(base.getDate() + offset * 7)
    router.push(`/admin?semana=${base.toISOString()}`)
  }

  function handleDaySelect(day: Date) {
    setSelectedDay(day)
    setView('day')
    setShowSidebar(false)
  }

  const weekLabel = `${days[0].getDate()} ${MONTHS[days[0].getMonth()].slice(0,3)} – ${days[6].getDate()} ${MONTHS[days[6].getMonth()].slice(0,3)} ${days[6].getFullYear()}`
  const dayLabel = `${DOW_FULL[selectedDay.getDay()]}, ${selectedDay.getDate()} de ${MONTHS[selectedDay.getMonth()]}`

  return (
    <div className={`flex flex-col h-screen bg-gray-50 dark:bg-gray-950`} style={{ fontSize }}>  data-admin="true"

      {/* Topbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 flex-wrap">

        {/* Navegação de semana */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium">←</button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[160px] text-center">{view === 'week' ? weekLabel : dayLabel}</span>
          <button onClick={() => navigate(1)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium">→</button>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view==='week' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Semana</button>
          <button onClick={() => setView('day')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view==='day' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Dia</button>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Fonte */}
          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1">
            <button onClick={() => setFontSize(f => Math.max(12, f-1))} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 w-5 h-5 flex items-center justify-center font-bold">A-</button>
            <span className="text-xs text-gray-400 w-6 text-center">{fontSize}</span>
            <button onClick={() => setFontSize(f => Math.min(20, f+1))} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 w-5 h-5 flex items-center justify-center font-bold">A+</button>
          </div>

          {/* Modo noturno */}
          <button onClick={() => setDarkMode(d => !d)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm">
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Mini cal toggle (mobile) */}
          <button onClick={() => setShowSidebar(s => !s)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm lg:hidden">
            📅
          </button>

          {/* Nova consulta */}
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition shadow-sm shadow-purple-200 dark:shadow-none">
            + Nova
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar mini cal — desktop sempre visível, mobile toggle */}
        <aside className={`${showSidebar ? 'flex' : 'hidden'} lg:flex flex-col w-52 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 overflow-y-auto`}>
          <MiniCal selected={selectedDay} onSelect={handleDaySelect} appointments={appointments} />

          {/* Próximas consultas hoje */}
          <div className="px-3 pb-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Hoje</p>
            {appointments.filter(a => isSameDay(new Date(a.scheduled_at), new Date())).length === 0
              ? <p className="text-xs text-gray-400">Nenhuma consulta</p>
              : appointments.filter(a => isSameDay(new Date(a.scheduled_at), new Date())).sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()).map(appt => {
                  const s = STATUS_STYLES[appt.status]
                  return (
                    <button key={appt.id} onClick={() => setSelected(appt)} className="w-full text-left flex items-center gap-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-1 transition">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{appt.patients.name}</p>
                        <p className="text-[10px] text-gray-400">{fmtTime(appt.scheduled_at)}</p>
                      </div>
                    </button>
                  )
                })
            }
          </div>
        </aside>

        {/* Grade principal */}
        {view === 'week'
          ? <WeekView days={days} appointments={appointments} onSelect={setSelected} />
          : <DayView day={selectedDay} appointments={appointments} onSelect={setSelected} />
        }
      </div>

      {selected && <AppointmentModal appt={selected} onClose={() => setSelected(null)} fontSize={fontSize} />}
      {showNew && <NewAppointmentModal onClose={() => setShowNew(false)} fontSize={fontSize} />}
    </div>
  )
}