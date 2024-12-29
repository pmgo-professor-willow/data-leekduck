// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
import urlJoin from 'url-join';
import moment from 'moment';
import { sprintf } from 'sprintf-js';
import type { HTMLElement } from 'node-html-parser';
// Local modules.
import { hostUrl } from './constants/index';
import { pokedex } from './utils/pokedex';
import types from '../data/event-types.json';
import titleDict from '../data/event-title-dictionary.json';

const typeMapping = (eventType: string) => {
  const matchedType = types.find((type) => type.text === eventType);

  if (matchedType) {
    return matchedType.displayText;
  } else {
    return types.find((type) => type.text === 'Others')?.displayText;
  }
};


const translateEventTitle = (title: string) => {
  // Remove the prefix: 'Event: '.
  const matchedRule = titleDict.find((rule) => (new RegExp(rule.pattern, 'i')).test(title));

  if (matchedRule) {
    const [, ...matches] = title.match(new RegExp(matchedRule.pattern, 'i'))!;

    let translatedDescription = sprintf(matchedRule.displayText, ...matches);

    // Replace specific pokemon name.
    const pokemonNamePatterns = translatedDescription.match(/##POKEMON_(.+)##/g) || [];
    pokemonNamePatterns.forEach((pokemonNamePattern) => {
      const { 1: pokemonRawName } = pokemonNamePattern.match(/##POKEMON_(.+)##/)!;
      translatedDescription = translatedDescription.replace(pokemonNamePattern, pokedex.transPokemonName(pokemonRawName));
    });

    return translatedDescription;
  }

  return title;
};

const getEvents = async () => {
  const url = urlJoin(hostUrl, '/events/');
  const res = await fetch(url);
  const xml = await res.text();

  const root = parse(xml);
  const currentEventItems = root.querySelectorAll('div.events-list.current-events a.event-item-link');
  const upcomingEventItems = root.querySelectorAll('div.events-list.upcoming-events a.event-item-link');

  const formatEvent = (eventItem: HTMLElement, label: string) => {
    const originalTitle = decode(eventItem.querySelector('h2')?.rawText);
    const title = translateEventTitle(originalTitle);
    const link = urlJoin(hostUrl, eventItem.getAttribute('href')!);
    const type = typeMapping(eventItem.querySelector('.event-item-wrapper p')?.rawText!);
    const imageUrl = new URL(
      eventItem.querySelector('.event-img-wrapper img')?.getAttribute('src')!,
      hostUrl
    );
    const countdownNode = eventItem.querySelector('.event-countdown');
    const countdownTo = countdownNode?.getAttribute('data-countdown-to')!;
    const timeRaw = countdownNode?.getAttribute('data-countdown')!;
    const isLocaleTime = ['start', 'end'].includes(countdownTo) ? !/^\d+$/.test(timeRaw) : null;
    const time = isLocaleTime
      ? moment(timeRaw, 'MM/DD/YYYY HH:mm:ss').toISOString()
      : moment.unix(parseInt(timeRaw) / 1000).toISOString();
    const startTime = countdownTo === 'start' ? time : null;
    const endTime = countdownTo === 'end' ? time : null;

    return {
      title,
      originalTitle,
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
