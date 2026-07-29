export const fetchGoogleCalendarEvents = async (accessToken) => {
  if (!accessToken) return null;
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + new Date().toISOString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.status === 401) throw new Error("401");
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    if (e.message === "401") throw e;
    console.error("Google Calendar Fetch Error", e);
    return [];
  }
};

export const fetchGoogleTasks = async (accessToken) => {
  if (!accessToken) return null;
  try {
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.status === 401) throw new Error("401");
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    if (e.message === "401") throw e;
    console.error("Google Tasks Fetch Error", e);
    return [];
  }
};

export const createGoogleTask = async (accessToken, title, dueDate) => {
  if (!accessToken) return null;
  try {
    const dateObj = dueDate ? new Date(dueDate) : new Date();
    if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
    
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, due: dateObj.toISOString() })
    });
    if (res.status === 401) throw new Error("401");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("Create Task Error", e);
    return null;
  }
};

export const createGoogleCalendarEvent = async (accessToken, summary, startTime, endTime) => {
  if (!accessToken) return null;
  try {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 3600000);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Invalid date");

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() }
      })
    });
    if (res.status === 401) throw new Error("401");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("Create Calendar Event Error", e);
    return null;
  }
};
