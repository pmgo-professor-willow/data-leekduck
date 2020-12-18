// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import moment from 'moment';
import type { HTMLElement } from 'node-html-parser';

const hostUrl = 'https://leekduck.com';

const getEvents = async () => {
  const url = urlJoin(hostUrl, '/events/');
  const res = await fetch(url);
  const xml = await res.text();

  const root = parse(xml);
  const currentEventItems = root.querySelectorAll('div.events-list.current-events a.event-item-link');
  const upcomingEventItems = root.querySelectorAll('div.events-list.upcoming-events a.event-item-link');

  const formatEvent = (eventItem: HTMLElement, label: string) => {
    const title = eventItem.querySelector('h2').rawText;
    const imageUrl = urlJoin(
      hostUrl,
      eventItem.querySelector('.event-img-wrapper img').getAttribute('src')!,
    );
    const countdownNode = eventItem.querySelector('.event-countdown');
    const countdownTo = countdownNode.getAttribute('data-countdown-to')!;
    const timeRaw = countdownNode.getAttribute('data-countdown')!;
    const isLocaleTime = ['start', 'end'].includes(countdownTo) ? !/^\d+$/.test(timeRaw) : null;
    const time = isLocaleTime ? moment(timeRaw).toISOString() : moment.unix(parseInt(timeRaw) / 1000).toISOString();
    const startTime = countdownTo === 'start' ? time : null;
    const endTime = countdownTo === 'end' ? time : null;

    return {
      title,
      imageUrl,
      label,
      isLocaleTime,
      startTime,
      endTime,
    };
  };

  const events = [
    ...currentEventItems.map((item) => formatEvent(item, 'current')),
    ...upcomingEventItems.map((item) => formatEvent(item, 'upcoming')),
  ];

  return events;
};

export {
  getEvents,
};
