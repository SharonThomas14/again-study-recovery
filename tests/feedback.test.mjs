import test from 'node:test';
import assert from 'node:assert/strict';
import {numericDate,parseNumericDate} from '../src/dates.js';
import {dateLabel} from '../src/planner.js';
import {readBusyCalendar} from '../src/calendar-core.js';
test('DD/MM/YY dates are unambiguous and reject invalid days',()=>{assert.equal(numericDate('2026-10-03'),'03/10/26');assert.equal(dateLabel('2026-10-03'),'03/10/26');assert.equal(parseNumericDate('03/10/26'),'2026-10-03');assert.equal(parseNumericDate('31/02/26'),null);assert.equal(parseNumericDate('02/13/26'),null);assert.equal(parseNumericDate('29/02/28'),'2028-02-29');});
test('calendar import can preserve titles without including them in busy-only mode',()=>{const text='BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:class1\nSUMMARY:Biology class\nDTSTART:20261003T090000\nDTEND:20261003T100000\nEND:VEVENT\nEND:VCALENDAR';const start=new Date('2026-10-03T00:00:00'),end=new Date('2026-10-04T00:00:00');assert.equal(readBusyCalendar(text,start,end,true)[0].title,'Biology class');assert.equal(readBusyCalendar(text,start,end)[0].title,undefined);});
test('missing timezone data fails visibly rather than inventing free time',()=>{const text='BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:a\nDTSTART;TZID=Missing/Zone:20261003T090000\nDTEND;TZID=Missing/Zone:20261003T100000\nEND:VEVENT\nEND:VCALENDAR';assert.throws(()=>readBusyCalendar(text,new Date('2026-10-03'),new Date('2026-10-04')),/timezone definition/);});
