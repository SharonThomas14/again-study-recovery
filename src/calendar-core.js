import ICAL from "ical.js";
export function readBusyCalendar(text, start, end, includeMetadata = false) {
  if (text.length > 3000000)
    throw Error("Calendar exceeds 3 MB. Export a smaller calendar.");
  const root = new ICAL.Component(ICAL.parse(text));
  for (const zone of root.getAllSubcomponents("vtimezone"))
    ICAL.TimezoneService.register(new ICAL.Timezone(zone));
  const events = root.getAllSubcomponents("vevent");
  if (events.length > 5000)
    throw Error("Too many calendar events. Export a smaller date range.");
  const busy = [];
  let expanded = 0;
  for (const component of events) {
    if (
      component.getFirstPropertyValue("status") === "CANCELLED" ||
      component.getFirstPropertyValue("transp") === "TRANSPARENT"
    )
      continue;
    for (const name of ["dtstart", "dtend", "recurrence-id"]) {
      const zone = component.getFirstProperty(name)?.getParameter("tzid");
      if (zone && !ICAL.TimezoneService.has(zone))
        throw Error(
          "Calendar timezone definition is missing: " +
            zone +
            ". Export with timezone data or UTC times.",
        );
    }
    const event = new ICAL.Event(component);
    if (event.isRecurrenceException()) continue;
    for (const other of events) {
      if (
        other !== component &&
        other.getFirstPropertyValue("uid") === event.uid &&
        other.hasProperty("recurrence-id")
      )
        event.relateException(new ICAL.Event(other));
    }
    const add = (a, b) => {
      const s = a.toJSDate(),
        e = b.toJSDate();
      if (e > start && s < end)
        busy.push({
          start: s.toISOString(),
          end: e.toISOString(),
          ...(includeMetadata
            ? { title: event.summary, uid: event.uid, allDay: a.isDate }
            : {}),
        });
    };
    if (event.isRecurring()) {
      const iterator = event.iterator();
      let occurrence;
      while ((occurrence = iterator.next())) {
        if (++expanded > 15000)
          throw Error(
            "This calendar has too many recurring occurrences. Use a smaller export.",
          );
        if (occurrence.toJSDate() >= end) break;
        const detail = event.getOccurrenceDetails(occurrence);
        add(detail.startDate, detail.endDate);
      }
    } else add(event.startDate, event.endDate);
  }
  return busy;
}
export function freeMinutes(
  busy,
  date,
  startHour = 9,
  endHour = 21,
  cap = 120,
) {
  const start = new Date(
    date + "T" + String(startHour).padStart(2, "0") + ":00:00",
  ).getTime();
  const end = new Date(
    date + "T" + String(endHour).padStart(2, "0") + ":00:00",
  ).getTime();
  const ranges = busy
    .map((x) => [
      Math.max(start, new Date(x.start).getTime()),
      Math.min(end, new Date(x.end).getTime()),
    ])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let used = 0,
    right = start;
  for (const [a, b] of ranges) {
    used += Math.max(0, b - Math.max(a, right));
    right = Math.max(right, b);
  }
  return Math.max(0, Math.min(cap, Math.floor((end - start - used) / 60000)));
}
