// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { transPokemonName } from 'pmgo-pokedex';
// Local modules.
import { hostUrl, assetUrl, cpFormatter } from './utils';

const getEggs = async () => {
  const researchUrl = urlJoin(hostUrl, '/eggs/');
  const res = await fetch(researchUrl);
  const xml = await res.text();

  const root = parse(xml);
  const eggItems = root.querySelectorAll('ul.egg-list-flex li.egg-list-item');

  const eggs = eggItems.map((eggItem, i) => {
    const imageUrlRaw = eggItem.querySelector('.egg-list-img img').getAttribute('src')!;
    const { 1: fileName, 3: noText } = imageUrlRaw.match(/(pokemon_icon_(pm)*(\d+)_.+)/)!;
    const imageUrl = urlJoin(assetUrl, fileName);

    const no = parseInt(noText);
    const originalName = eggItem.querySelector('.hatch-pkmn').rawText;
    const name = transPokemonName(originalName, no);

    const categoryRaw = eggItem.querySelector('.egg-list-img').getAttribute('class')!;
    const { 1: category } = categoryRaw.match(/.+ egg(\d+km)$/)!;

    return {
      no,
      name,
      originalName,
      category,
      cp: cpFormatter(eggItem.querySelector('.cp-range').lastChild.rawText),
      shinyAvailable: !!eggItem.querySelector('img.shiny-icon'),
      imageUrl,
    };
  });

  return eggs;
};

export {
  getEggs,
};
