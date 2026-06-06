import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { sessionsApi } from '../../api/services';
import { SessionStatus, STATUS_COLORS, type CalendarEntryDto } from '../../types';
import { Spinner, Badge } from '../ui';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales: { es },
});

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEntryDto;
}

interface CalendarViewProps { athleteId?: string }

export function CalendarView({ athleteId }: CalendarViewProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(Views.MONTH);

  const from = startOfMonth(addMonths(currentDate, -1));
  const to = endOfMonth(addMonths(currentDate, 1));

  const { data: entries, isLoading } = useQuery({
    queryKey: ['calendar', from.toISOString(), to.toISOString(), athleteId],
    queryFn: () => sessionsApi.getCalendar(from, to, athleteId),
  });

  const events: CalEvent[] = useMemo(() =>
    (entries ?? []).map(e => ({
      id: e.sessionId,
      title: e.sessionTitle ?? `${e.wodPieceCount} piezas`,
      start: new Date(e.scheduledDate),
      end: new Date(e.scheduledDate),
      resource: e,
    })), [entries]);

  const eventStyleGetter = useCallback((event: CalEvent) => {
    const color = STATUS_COLORS[event.resource.status];
    return {
      style: {
        backgroundColor: `${color}22`,
        borderLeft: `3px solid ${color}`,
        color: event.resource.status === SessionStatus.Completed ? '#10B981' : '#F0F2F8',
        borderRadius: '6px',
        fontSize: '11px',
        padding: '1px 6px',
      },
    };
  }, []);

  const handleSelectEvent = useCallback((event: CalEvent) => {
    navigate(`/sessions/${event.id}`);
  }, [navigate]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      {/* Stats row */}
      <div className="flex gap-4">
        {Object.values(SessionStatus).map(s => {
          const count = entries?.filter(e => e.status === s).length ?? 0;
          return (
            <div key={s} className="flex items-center gap-2">
              <Badge color={STATUS_COLORS[s]}>{s}</Badge>
              <span className="text-sm text-[var(--color-muted)]">{count}</span>
            </div>
          );
        })}
        <span className="ml-auto text-sm text-[var(--color-muted)]">
          {entries?.length ?? 0} sesiones en vista
        </span>
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-0" style={{ height: 'calc(100vh - 200px)' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view as any}
          onView={v => setView(v as any)}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          culture="es"
          popup
          messages={{
            next: '→', back: '←', today: 'Hoy',
            month: 'Mes', week: 'Semana', day: 'Día', agenda: 'Lista',
            showMore: (n: number) => `+${n} más`,
          }}
        />
      </div>
    </div>
  );
}
