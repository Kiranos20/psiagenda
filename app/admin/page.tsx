import { getAppointments } from './actions'
import AdminCalendar from './AdminCalendar'

function getWeekStart(offset = 0): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  const monday = new Date(today.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

export default async function AdminPage({ searchParams }: { searchParams: any }) {
  const params = await searchParams
  const weekStart = params?.semana ?? getWeekStart()
  const appointments = await getAppointments(weekStart)

  return (
    <main className="min-h-screen">
      <AdminCalendar appointments={appointments} weekStart={weekStart} />
    </main>
  )
}
