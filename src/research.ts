// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { transPokemonName } from 'pmgo-pokedex';
import { sprintf } from 'sprintf-js';
// Local modules.
import { hostUrl, cpFormatter } from './utils';
import tags from '../data/research-category-tags.json';
import descriptionDict from '../data/research-description-dictionary.json';

const categoryMapping = (categoryTag: string) => {
  const matchedTag = tags.find((tag) => tag.text === categoryTag);

  if (matchedTag) {
    return matchedTag.displayText;
  } else {
    return tags.find((tag) => tag.text === 'misc-research-tag')?.displayText;
  }
};

const translateDescription = (description: string) => {
  const matchedRule = descriptionDict.find((rule) => (new RegExp(rule.pattern)).test(description));

  if (matchedRule) {
    const [, ...matches] = description.match(new RegExp(matchedRule.pattern))!;
    return sprintf(matchedRule.displayText, ...matches);
  } else {
    return description;
  }
};

const getResearches = async () => {
  const researchUrl = urlJoin(hostUrl, '/research/');
  const res = await fetch(researchUrl);
  const xml = await res.text();

  const root = parse(xml);
  const researchItems = root.querySelectorAll('#task-list ul.list li');

  const researches = researchItems.map((researchItem, i) => {
    // imageUrl: '//images.weserv.nl/?w=200&il&url=raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/pokemon_icon_460_51.png'
    // imageUrl: '//images.weserv.nl/?w=200&il&url=raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/pokemon_icon_pm0025_00_pgo_movie2020.png'
    const imageUrlRaw = researchItem.querySelector('.task-reward .reward-img img').getAttribute('src')!;
    const { 1: _fileName, 3: noText } = imageUrlRaw.match(/(pokemon_icon_(pm)*(\d+)_.+)/)!;
    const imageUrl = new URL(imageUrlRaw, researchUrl).href;

    const no = parseInt(noText);
    const originalName = researchItem.querySelector('.task-reward .reward-text').rawText.trim();
    const name = transPokemonName(originalName, no);

    const categoryRaw = researchItem.querySelector('.task-text').getAttribute('class')!;
    const { 1: categoryTag } = categoryRaw.match(/.+ (\w+-research-tag)/)!;
    const category = categoryMapping(categoryTag);

    return {
      description: translateDescription(researchItem.querySelector('.task-text').rawText.trim()),
      category,
      rewardPokemon: {
        no,
        name,
        originalName,
        cp: cpFormatter(researchItem.querySelector('.task-reward .reward-cp-range').lastChild.rawText),
        shinyAvailable: !!researchItem.querySelector('.task-reward img.shiny-icon'),
        imageUrl,
      },
    };
  });

  return researches;
};

export {
  getResearches,
};
