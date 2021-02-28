// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { XmlEntities } from 'html-entities';
import urlJoin from 'url-join';
import moment from 'moment';
import type { HTMLElement } from 'node-html-parser';
// Local modules.
import { hostUrl } from './utils';
import types from '../data/event-types.json';

const entities = new XmlEntities();

const typeMapping = (eventType: string) => {
  const matchedType = types.find((type) => type.text === eventType);

  if (matchedType) {
    return matchedType.displayText;
  } else {
    return types.find((type) => type.text === 'Others')?.displayText;
  }
};

const getEvents = async () => {
  const url = urlJoin(hostUrl, '/events/');
  const res = await fetch(url);
  const xml = await res.text();

  const root = parse(xml);
  const currentEventItems = root.querySelectorAll('div.events-list.current-events a.event-item-link');
  const upcomingEventItems = root.querySelectorAll('div.events-list.upcoming-events a.event-item-link');

  const formatEvent = (eventItem: HTMLElement, label: string) => {
    const title = entities.decode(eventItem.querySelector('h2').rawText);
    const link = urlJoin(hostUrl, eventItem.getAttribute('href')!);
    const type = typeMapping(eventItem.querySelector('.event-item-wrapper p').rawText);
    const imageUrl = urlJoin(
      hostUrl,
      eventItem.querySelector('.event-img-wrapper img').getAttribute('src')!,
    );
    const countdownNode = eventItem.querySelector('.event-countdown');
    const countdownTo = countdownNode.getAttribute('data-countdown-to')!;
    const timeRaw = countdownNode.getAttribute('data-countdown')!;
    const isLocaleTime = ['start', 'end'].includes(countdownTo) ? !/^\d+$/.test(timeRaw) : null;
    const time = isLocaleTime
      ? moment(timeRaw, 'MM/DD/YYYY HH:mm:ss').toISOString()
      : moment.unix(parseInt(timeRaw) / 1000).toISOString();
    const startTime = countdownTo === 'start' ? time : null;
    const endTime = countdownTo === 'end' ? time : null;

    return {
      title,
      link,
      type,
      imageUrl,
      label,
      isLocaleTime,
      startTime,
      endTime,
    };
  };

  const allEvents = [
    ...currentEventItems.map((item) => formatEvent(item, 'current')),
    ...upcomingEventItems.map((item) => formatEvent(item, 'upcoming')),
  ];

  const formattedEvents = _.chain(allEvents)
    .groupBy((event) => `${event.title}|${event.link}`)
    .map((events) => _.groupBy(events, (event) => event.label))
    .map((group) => {
      if (group.current && group.upcoming) {
        group.current.forEach((_event, idx) => {
          group.upcoming[idx].endTime = group.current[idx].endTime;
          group.current[idx].startTime = group.upcoming[idx].startTime;
        });
      }
      return _.concat(group.current, group.upcoming);
    })
    .flattenDeep()
    .filter(Boolean);

  return formattedEvents;
};

export {
  getEvents,
};
