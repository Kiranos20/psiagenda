import BookingPortal from './BookingPortal'
import { supabase } from '@/lib/supabase'

export default async function AgendarPage() {
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('active', true)
    .order('weekday')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('scheduled_at, duration')
    .gte('scheduled_at', new Date().toISOString())

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-medium text-gray-900">PsiAgenda</h1>
        <p className="text-sm text-gray-500">Agende sua consulta</p>
      </header>
      <BookingPortal
        availability={availability ?? []}
        bookedSlots={appointments ?? []}
      />
    </main>
  )
}
