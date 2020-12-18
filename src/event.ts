// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import type { HTMLElement } from 'node-html-parser';

const hostUrl = 'https://leekduck.com';

// TODO:
const getEvents = async () => {
  const url = urlJoin(hostUrl, '/events/');
  const res = await fetch(url);
  const xml = await res.text();

  const root = parse(xml);
  const currentEventItems = root.querySelectorAll('div.events-list.current-events a.event-item-link');
  const upcomingEventItems = root.querySelectorAll('div.events-list.upcoming-events a.event-item-link');

  const formatEvent = (eventItem: HTMLElement) => {
    const title = eventItem.querySelector('h2').rawText;
    const imageUrl = urlJoin(
      hostUrl,
      eventItem.querySelector('.event-img-wrapper img').getAttribute('src')!,
    );
    const startTime = eventItem.querySelector('.event-countdown').getAttribute('data-countdown');
    const endTime = eventItem.querySelector('.event-countdown').getAttribute('data-countdown');

    return {
      title,
      imageUrl,
      startTime,
      endTime,
    };
  };

  const events = [
    ...currentEventItems.map(formatEvent),
    ...upcomingEventItems.map(formatEvent),
  ];

  return events;
};

export {
  getEvents,
};
