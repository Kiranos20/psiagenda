'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export type Appointment = {
  id: string
  scheduled_at: string
  duration: number
  modality: 'presencial' | 'online'
  status: 'pendente' | 'confirmado' | 'cancelado' | 'realizado'
  notes: string | null
  patients: {
    name: string
    email: string | null
    phone: string | null
  }
}

// Busca todas as consultas de uma semana
export async function getAppointments(weekStart: string): Promise<Appointment[]> {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 7)

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`
      id, scheduled_at, duration, modality, status, notes,
      patients ( name, email, phone )
    `)
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString())
    .order('scheduled_at')

  if (error) throw new Error(error.message)
  return (data ?? []) as Appointment[]
}

// Atualiza o status de uma consulta
export async function updateStatus(
  id: string,
  status: Appointment['status']
) {
  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

// Atualiza anotações de uma consulta
export async function updateNotes(id: string, notes: string) {
  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ notes })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

// Cria uma consulta manualmente pelo admin
export async function createAppointment(data: {
  patientName: string
  patientPhone: string
  patientEmail: string
  scheduledAt: string
  duration: number
  modality: 'presencial' | 'online'
}) {
  // Cria ou reutiliza paciente pelo nome+telefone
  const { data: existing } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('name', data.patientName)
    .eq('phone', data.patientPhone)
    .maybeSingle()

  let patientId: string

  if (existing) {
    patientId = existing.id
  } else {
    const { data: newPatient, error: patientError } = await supabaseAdmin
      .from('patients')
      .insert({
        name: data.patientName,
        phone: data.patientPhone,
        email: data.patientEmail,
      })
      .select('id')
      .single()

    if (patientError) throw new Error(patientError.message)
    patientId = newPatient.id
  }

  const { error } = await supabaseAdmin.from('appointments').insert({
    patient_id: patientId,
    scheduled_at: data.scheduledAt,
    duration: data.duration,
    modality: data.modality,
    status: 'confirmado',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

// Deleta uma consulta
export async function deleteAppointment(id: string) {
  const { error } = await supabaseAdmin
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}