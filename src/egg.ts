// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { transPokemonName } from 'pmgo-pokedex';
// Local modules.
import { hostUrl, cpFormatter } from './utils';

const getEggs = async () => {
  const eggUrl = urlJoin(hostUrl, '/eggs/');
  const res = await fetch(eggUrl);
  const xml = await res.text();

  const root = parse(xml);
  const eggListItems = root.querySelectorAll('ul.egg-list-flex');

  const eggGroups = eggListItems.map((eggListItem) => {
    const eggItems = eggListItem.querySelectorAll('li.egg-list-item');

    const eggs = eggItems.map((eggItem, i) => {
      const imageUrlRaw = eggItem.querySelector('.egg-list-img img').getAttribute('src')!;
      const imageUrl = new URL(imageUrlRaw, eggUrl).href;
      const noText = String(
        // ../assets/img/pokemon_icons/pokemon_icon_656_00.png
        // ../assets/img/pokemon_icons/pokemon_icon_pm656_00.png
        imageUrlRaw.match(/(pokemon_icon_(pm)*(?<noText>\d+)_.+)/)?.groups?.noText
        // ../assets/img/pokemon_icons/pm731.icon.png
        || imageUrlRaw.match(/pm(?<noText>\d+)\.icon.+/)?.groups?.noText
      );

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
        cp: cpFormatter(eggItem.querySelector('.font-size-smaller').lastChild.rawText),
        shinyAvailable: !!eggItem.querySelector('img.shiny-icon'),
        regional: !!eggItem.querySelector('img.regional-icon'),
        imageUrl,
      };
    });
  
    return eggs;
  });

  // Update category.
  const groupNames: string[] = [];
  eggGroups.forEach((eggs) => {
    const [firstEgg] = eggs;

    if (!groupNames.includes(firstEgg.category)) {
      groupNames.push(firstEgg.category);
    } else {
      const updatedCategory = `時時刻刻冒險 ${firstEgg.category}`;
      eggs.forEach((egg) => egg.category = updatedCategory);
      groupNames.push(updatedCategory);
    }
  });

  return _.flatten(eggGroups);
};

export {
  getEggs,
};
