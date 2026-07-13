import React, { createContext, useContext, useState, useCallback } from 'react';
import { loadCalendars as loadCalendarsService } from '../services/calendar';

const CalendarContext = createContext(null);

export function CalendarProvider({ children }) {
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [accessPrivileges, setAccessPrivileges] = useState('none');

  const refreshCalendars = useCallback(async () => {
    const { status, accessPrivileges: priv, calendars } = await loadCalendarsService();
    setPermissionStatus(status);
    setAccessPrivileges(priv);
    setAvailableCalendars(calendars);
    setSelectedCalendarId(prev => prev ?? (calendars.find(c => c.isPrimary) || calendars[0])?.id ?? null);
  }, []);

  return <CalendarContext.Provider value={{ availableCalendars, selectedCalendarId, setSelectedCalendarId, permissionStatus, accessPrivileges, refreshCalendars }}>{children}</CalendarContext.Provider>;
}
export const useCalendar = () => useContext(CalendarContext);
