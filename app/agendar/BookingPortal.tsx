'use client'

import { useState } from 'react'

type Availability = {
  id: string
  weekday: number
  start_time: string
  end_time: string
  slot_duration: number
}

type BookedSlot = {
  scheduled_at: string
  duration: number
}

type Props = {
  availability: Availability[]
  bookedSlots: BookedSlot[]
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function generateSlots(availability: Availability[], bookedSlots: BookedSlot[], date: Date): string[] {
  const weekday = date.getDay()
  const avail = availability.find(a => a.weekday === weekday)
  if (!avail) return []

  const slots: string[] = []
  const [startH, startM] = avail.start_time.split(':').map(Number)
  const [endH, endM] = avail.end_time.split(':').map(Number)
  const duration = avail.slot_duration

  let current = startH * 60 + startM
  const end = endH * 60 + endM

  while (current + duration <= end) {
    const h = Math.floor(current / 60)
    const m = current % 60
    const slotDate = new Date(date)
    slotDate.setHours(h, m, 0, 0)

    const isBooked = bookedSlots.some(b => {
      const bookedDate = new Date(b.scheduled_at)
      return Math.abs(bookedDate.getTime() - slotDate.getTime()) < b.duration * 60 * 1000
    })

    if (!isBooked && slotDate > new Date()) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }

    current += duration
  }

  return slots
}

export default function BookingPortal({ availability, bookedSlots }: Props) {
  const [step, setStep] = useState<'date' | 'time' | 'form' | 'success'>('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [error, setError] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const availableWeekdays = new Set(availability.map(a => a.weekday))

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function isAvailable(date: Date) {
    if (date < today) return false
    return availableWeekdays.has(date.getDay())
  }

  function handleDateSelect(date: Date) {
    setSelectedDate(date)
    setStep('time')
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    if (!selectedDate || !selectedTime) return

    setLoading(true)
    setError('')

    const [h, m] = selectedTime.split(':').map(Number)
    const scheduledAt = new Date(selectedDate)
    scheduledAt.setHours(h, m, 0, 0)

    try {
      const res = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          scheduledAt: scheduledAt.toISOString(),
          duration: availability.find(a => a.weekday === selectedDate.getDay())?.slot_duration ?? 50,
        }),
      })

      if (!res.ok) throw new Error('Erro ao agendar')
      setStep('success')
    } catch {
      setError('Erro ao agendar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const slots = selectedDate ? generateSlots(availability, bookedSlots, selectedDate) : []
  const daysInMonth = getDaysInMonth(calMonth.getFullYear(), calMonth.getMonth())
  const firstDow = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay()

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto mt-16 text-center px-4">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-medium text-gray-900 mb-2">Consulta agendada!</h2>
        <p className="text-gray-500 mb-1">
          {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <p className="text-gray-500 mb-6">às {selectedTime}</p>
        <p className="text-sm text-gray-400">Em breve você receberá uma confirmação.</p>
        <button
          onClick={() => { setStep('date'); setSelectedDate(null); setSelectedTime(null); setForm({ name: '', phone: '', email: '' }) }}
          className="mt-6 text-sm text-purple-600 hover:underline"
        >
          Fazer outro agendamento
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {['Data', 'Horário', 'Seus dados'].map((s, i) => {
          const stepKeys = ['date', 'time', 'form']
          const active = stepKeys.indexOf(step) >= i
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${active ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </div>
              <span className={`text-sm ${active ? 'text-gray-700' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className={`flex-1 h-px w-8 ${active ? 'bg-purple-300' : 'bg-gray-200'}`} />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Data */}
      {step === 'date' && (
        <div>
          <h2 className="text-base font-medium text-gray-900 mb-4">Escolha uma data</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="text-gray-400 hover:text-gray-600 px-2">←</button>
              <span className="text-sm font-medium text-gray-700">{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="text-gray-400 hover:text-gray-600 px-2">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => <div key={i} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), i + 1)
                const avail = isAvailable(date)
                const isSelected = selectedDate?.toDateString() === date.toDateString()
                return (
                  <button
                    key={i}
                    disabled={!avail}
                    onClick={() => handleDateSelect(date)}
                    className={`text-sm py-2 rounded-lg font-medium transition
                      ${isSelected ? 'bg-purple-600 text-white' : ''}
                      ${avail && !isSelected ? 'hover:bg-purple-50 text-gray-700' : ''}
                      ${!avail ? 'text-gray-300 cursor-not-allowed' : ''}
                    `}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Horário */}
      {step === 'time' && (
        <div>
          <button onClick={() => setStep('date')} className="text-sm text-purple-600 hover:underline mb-4 block">← Voltar</button>
          <h2 className="text-base font-medium text-gray-900 mb-1">Escolha um horário</h2>
          <p className="text-sm text-gray-500 mb-4">
            {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {slots.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum horário disponível para esta data.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => (
                <button
                  key={slot}
                  onClick={() => { setSelectedTime(slot); setStep('form') }}
                  className="py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-purple-400 hover:bg-purple-50 transition"
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Formulário */}
      {step === 'form' && (
        <div>
          <button onClick={() => setStep('time')} className="text-sm text-purple-600 hover:underline mb-4 block">← Voltar</button>
          <h2 className="text-base font-medium text-gray-900 mb-1">Seus dados</h2>
          <p className="text-sm text-gray-500 mb-4">
            {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {selectedTime}
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome completo *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(21) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {loading ? 'Agendando...' : 'Confirmar agendamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
