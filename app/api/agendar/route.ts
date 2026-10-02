import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, phone, email, scheduledAt, duration } = body

  if (!name || !scheduledAt) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Cria ou reutiliza paciente
  const { data: existing } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('name', name)
    .eq('phone', phone ?? '')
    .maybeSingle()

  let patientId: string

  if (existing) {
    patientId = existing.id
  } else {
    const { data: newPatient, error } = await supabaseAdmin
      .from('patients')
      .insert({ name, phone, email })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    patientId = newPatient.id
  }

  // Cria a consulta
  const { error } = await supabaseAdmin.from('appointments').insert({
    patient_id: patientId,
    scheduled_at: scheduledAt,
    duration: duration ?? 50,
    modality: 'presencial',
    status: 'pendente',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
