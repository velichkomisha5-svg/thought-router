import * as Calendar from 'expo-calendar';

export const loadCalendars = async () => {
  const perm = await Calendar.requestCalendarPermissionsAsync();
  const { status, accessPrivileges } = perm;
  if (status === 'granted' && accessPrivileges !== 'writeOnly') {
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return { status, accessPrivileges, calendars: cals.filter(c => c.allowsModifications) };
  }
  return { status, accessPrivileges: accessPrivileges || 'none', calendars: [] };
};

export const createCalendarEvent = async (calendarId, reminder) => {
  const parsedDate = Date.parse(reminder.triggerDate);
  if (isNaN(parsedDate)) return;
  const startDate = new Date(parsedDate);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  await Calendar.createEventAsync(calendarId, {
    title: reminder.title,
    startDate,
    endDate,
    notes: reminder.body,
    timeZone: 'GMT',
  });
};
