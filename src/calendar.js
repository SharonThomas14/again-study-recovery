import {personalBusy} from "./personal.js";
export function calendarControls() {
  return `<section class="calendar-connect"><div><span class="eyebrow">LET YOUR CALENDAR HELP</span><h3>Start with the space between things.</h3><p class="hint">Import busy time from Google, Apple or Outlook. Review the suggested daily budgets before applying them.</p></div><div class="button-row"><button type="button" class="secondary" id="google-busy">Connect Google Calendar ↗</button><button type="button" class="secondary" id="again-busy">Use my classes & commitments</button><label class="secondary file-button">Import .ics calendar<input type="file" id="ics-busy" accept=".ics,text/calendar" hidden></label></div><details><summary>Calendar preferences</summary><div class="form-row"><label class="field">Study window starts<input id="cal-start" type="number" min="0" max="22" value="9"></label><label class="field">Ends (24-hour)<input id="cal-end" type="number" min="1" max="23" value="21"></label><label class="field">Daily cap, minutes<input id="cal-cap" type="number" min="0" max="480" value="120"></label></div></details><p class="hint">Apple / Outlook: export your calendar as .ics. This is a snapshot, not continuous sync. Empty time is not automatically study time.</p><p id="calendar-status" role="status"></p></section>`;
}
export function initCalendar(getConfig) {
  let busy = [];
  const apply = async () => {
    const { freeMinutes } = await import("../vendor/calendar-core.js");
    const a = Number(document.querySelector("#cal-start").value),
      b = Number(document.querySelector("#cal-end").value),
      cap = Number(document.querySelector("#cal-cap").value);
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 0 ||
      b > 23 ||
      b <= a ||
      !Number.isInteger(cap) ||
      cap < 0 ||
      cap > 480
    )
      throw Error("Choose a valid study window and daily cap.");
    document
      .querySelectorAll("#availability-form .week-inputs input")
      .forEach(
        (input) => (input.value = freeMinutes(busy, input.name, a, b, cap)),
      );
    document.querySelector("#calendar-status").textContent =
      "Suggestions ready. Adjust for meals, travel and rest, then review availability. Only daily totals are saved.";
  };
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "ics-busy") return;
    const status = document.querySelector("#calendar-status");
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 3000000)
        throw Error("Please import a calendar smaller than 3 MB.");
      const inputs = [
        ...document.querySelectorAll("#availability-form .week-inputs input"),
      ];
      if (!inputs.length) return;
      const { readBusyCalendar } = await import("../vendor/calendar-core.js");
      const end = new Date(inputs.at(-1).name + "T00:00:00");
      end.setDate(end.getDate() + 1);
      busy = readBusyCalendar(
        await file.text(),
        new Date(inputs[0].name + "T00:00:00"),
        end,
      );
      await apply();
    } catch (error) {
      status.textContent = error.message;
    }
  });
  document.addEventListener("click", async (e) => {
    if(e.target.id==='again-busy'){try{busy=personalBusy([...document.querySelectorAll('#availability-form .week-inputs input')].map(x=>x.name));await apply();}catch(error){document.querySelector('#calendar-status').textContent=error.message;}return;}
    if (e.target.id !== "google-busy") return;
    const status = document.querySelector("#calendar-status");
    try {
      const config = await getConfig();
      if (!config.googleClientId)
        throw Error(
          "Google connection needs a Google OAuth client ID on this deployment. You can import an exported .ics calendar now.",
        );
      if (!window.google?.accounts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.onload = resolve;
          script.onerror = () =>
            reject(Error("Google sign-in could not load."));
          document.head.append(script);
        });
        status.textContent =
          "Google sign-in is ready. Click Connect Google Calendar again to open the consent window.";
        return;
      }
      const inputs = [
        ...document.querySelectorAll("#availability-form .week-inputs input"),
      ];
      if (!inputs.length) return;
      const end = new Date(inputs.at(-1).name + "T00:00:00");
      end.setDate(end.getDate() + 1);
      google.accounts.oauth2
        .initTokenClient({
          client_id: config.googleClientId,
          scope: "https://www.googleapis.com/auth/calendar.events.freebusy",
          error_callback: () =>
            (status.textContent =
              "Connection cancelled. You can still enter availability manually."),
          callback: async (result) => {
            try {
              if (result.error || !result.access_token)
                throw Error("Calendar permission was not granted.");
              const response = await fetch(
                "https://www.googleapis.com/calendar/v3/freeBusy",
                {
                  method: "POST",
                  headers: {
                    Authorization: "Bearer " + result.access_token,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    timeMin: new Date(
                      inputs[0].name + "T00:00:00",
                    ).toISOString(),
                    timeMax: end.toISOString(),
                    items: [{ id: "primary" }],
                  }),
                },
              );
              const data = await response.json();
              if (!response.ok || data.calendars?.primary?.errors)
                throw Error(
                  "Google could not return your primary calendar busy times.",
                );
              busy = data.calendars.primary.busy;
              await apply();
              status.textContent +=
                " Primary calendar only; token is not saved.";
            } catch (error) {
              status.textContent = error.message;
            }
          },
        })
        .requestAccessToken();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}
