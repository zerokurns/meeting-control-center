# 03h — Remove the calendar

Branch: `strip/calendar`. Protocol: `docs/tasks/README.md`. Map: `docs/codebase-map.md` §9h.
Runs after 03a–03e are integrated (03a already edited `drawer/Content.svelte`, `Navigation.svelte`,
`types/Tabs.ts`, `values/tabs.ts`).

## Goal
Remove calendar events, show scheduling and scheduled actions. Timers and clocks are unrelated and stay.

## Delete
- `src/frontend/components/drawer/calendar/` (whole dir), `drawer/navigation/CalendarTabs.svelte`,
  `drawer/info/CalendarInfo.svelte`
- `src/frontend/converters/calendar.ts`, `src/types/Calendar.ts`
- `src/frontend/components/main/popups/EditEvent.svelte`, `ImportCalendar.svelte`
- `src/frontend/components/slide/views/DynamicEvents.svelte` (the `events` slide item)
- `src/server/remote/components/tablet/layout/drawer/pages/TabletDrawerCalendar.svelte` and its tab

## Edit (remove only calendar lines)
- `src/types/Tabs.ts`: `"calendar"` in `DrawerTabIds` and `TopViews`. `src/frontend/values/tabs.ts`,
  `drawer/Content.svelte`, `drawer/Navigation.svelte`, `drawer/info/Info.svelte`.
- `src/types/Show.ts`: `"events"` in `ItemType`, `DynamicEvent`; `components/slide/SlideItems.svelte`,
  `components/edit/values/items.ts`, `components/edit/editbox/` item options for events.
- `src/frontend/stores.ts`: `activeDays`, `eventEdit`, `nextActionEventStart`, `nextActionEventPaused`,
  `calendars`, `events`, `calendarAddShow`. `src/types/Save.ts`: `events`, `calendars`, `calendarAddShow`
  and the `EVENTS` entry in `SaveData`. `src/electron/data/store.ts`: the `EVENTS` store file;
  `data/save.ts`, `data/backup.ts`, `data/defaults.ts`.
- Scheduled actions: `src/frontend/components/actions/` entries that trigger actions from calendar events,
  `helpers/timerTick.ts` / `tick.ts` event checks, `main/popups/Action.svelte` calendar trigger options,
  `utils/startup.ts`, `utils/receivers.ts`, `listeners.ts`, `context/contextMenus.ts`, `menuClick.ts`,
  `main/Popup.svelte`, `main/popups/Import.svelte` (ICS import), `quicksearch/`.
- `src/types/IPC/Main.ts` / `ToMain.ts` and both `responsesMain.ts`: calendar/ICS ids.
- Find the rest: `grep -rniE "calendar|\bevents?\b|ical|\.ics\b" src --include=*.ts --include=*.svelte -l`
  and discard hits where "event" means a DOM/Node event or `DynamicEvent` has already gone.

## Keep
Timers (`drawer/timers/`), clocks, `nextActionEvent*`-free action scheduling via timers, `types/History.ts`.
