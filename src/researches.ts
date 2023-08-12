// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import urlJoin from 'url-join';
import { sprintf } from 'sprintf-js';
import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
// Local modules.
import { hostUrl } from './constants/index';
import { pokedex } from './utils/pokedex';
import tags from '../data/research-category-tags.json';
import descriptionDict from '../data/research-description-dictionary.json';

interface Resaerch {
  description: string;
  originalDescription: string;
  category: string;
  rewardPokemons: RewardPokemon[];
  rewardPokemonMegaCandies: RewardPokemonMegaCandy[];
}

interface RewardPokemon {
  no: number;
  name: string;
  originalName: string;
  cp: {
    min: number;
    max: number;
  };
  shinyAvailable: boolean;
  imageUrl: string;
}

interface RewardPokemonMegaCandy {
  no: number;
  name: string;
  originalName: string;
  count: number;
  imageUrl: string;
  megaCandyImageUrl: string;
}

const categoryMapping = (categoryTag: string) => {
  const matchedTag = tags.find((tag) => {
    return tag.text === categoryTag
      || new RegExp(tag.text, 'i').test(categoryTag);
  });

  if (matchedTag) {
    return matchedTag.displayText;
  } else {
    return tags.find((tag) => tag.text === 'Miscellaneous Tasks')?.displayText!;
  }
};

const translateDescription = (description: string) => {
  const matchedRule = descriptionDict.find((rule) => (new RegExp(rule.pattern, 'i')).test(description));

  if (matchedRule) {
    const [, ...matches] = description.match(new RegExp(matchedRule.pattern, 'i'))!;

    // Translate term 'pokemon type'.
    const types = description.match(/(\w+-(type)?)/ig) || [];

    // FIXME: typings error.
    let translatedDescription = (types as any).reduce((currentDisplayText: any, type: any) => {
      const formattedType = /-type/i.test(type) ? type : `${type}type`
      return currentDisplayText.replace(type, pokedex.transType(formattedType)!);
    }, sprintf(matchedRule.displayText, ...matches));

    // Replace specific pokemon name.
    const pokemonNamePatterns = translatedDescription.match(/##POKEMON_(\w+)##/g) || [];
    pokemonNamePatterns.forEach((pokemonNamePattern: string) => {
      const { 1: pokemonRawName } = pokemonNamePattern.match(/##POKEMON_(\w+)##/)!;
      translatedDescription = translatedDescription.replace(pokemonNamePattern, pokedex.getPokemonByFuzzyName(pokemonRawName).name);
    });

    return translatedDescription;
  }

  // Cannot find any rule from dictionary, keep original.
  return description;
};

const getRewardPokemons = (researchItem: HTMLElement) => {
  const rewardPokemonItems = researchItem.querySelectorAll('.reward-list .reward[data-reward-type="encounter"]');
  const rewardPokemons: RewardPokemon[] = rewardPokemonItems.map((rewardPokemonItem) => {
    const imageUrlRaw = rewardPokemonItem.querySelector('img')?.getAttribute('src')!;
    const imageUrl = new URL(`/research/${imageUrlRaw}`, hostUrl).href;

    // No.
    let no = -1;
    switch (true) {
      // example: '../../assets/img/pokemon_icons_crop/pm129.icon.png'
      case /pm(\d+)\.icon\.png$/.test(imageUrlRaw): {
        const { 1: noText } = imageUrlRaw.match(/pm(\d+)\.icon\.png$/)!;
        no = parseInt(noText);
        break;
      }
      // example: '../../assets/img/pokemon_icons_crop/pm25.fWCS_2023.icon.png'
      case /pm(\d+)\.f(.+)\.icon\.png$/.test(imageUrlRaw): {
        const { 1: noText, 2: formText } = imageUrlRaw.match(/pm(\d+)\.f(.+)\.icon\.png$/)!;
        no = parseInt(noText);
        break;
      }
    }

    // CP.
    const minCP = parseInt(rewardPokemonItem.querySelector('.cp-values .min-cp')?.rawText.replace(/Min CP/g, '').trim() ?? '0', 10);
    const maxCP = parseInt(rewardPokemonItem.querySelector('.cp-values .max-cp')?.rawText.replace(/Max CP/g, '').trim() ?? '0', 10);

    // Shiny Available.
    const shinyAvailable = !!rewardPokemonItem.querySelector('.shiny-icon');

    return {
      no,
      name: pokedex.getPokemonNameByNo(no, 'zh-TW')!,
      originalName: pokedex.getPokemonNameByNo(no, 'en-US')!,
      cp: {
        min: minCP,
        max: maxCP,
      },
      shinyAvailable,
      imageUrl,
    };
  });

  return rewardPokemons;
};

const getRewardPokemonMegaCandies = (researchItem: HTMLElement) => {
  const rewardItems = researchItem.querySelectorAll('.reward-list .reward[data-reward-type="resource"]');
  const rewards: RewardPokemonMegaCandy[] = rewardItems.map((rewardItem) => {
    // Images.
    const imageUrlRaw = rewardItem.querySelector('.resource-info img.reward-image')?.getAttribute('src')!;
    const imageUrl = new URL(`/research/${imageUrlRaw}`, hostUrl).href;
    const megaCandyImageUrlRaw = rewardItem.querySelector('img.reward-image')?.getAttribute('src')!;
    const megaCandyImageUrl = new URL(`/research/${megaCandyImageUrlRaw}`, hostUrl).href;

    // No.
    const { 1: noText } = imageUrlRaw.match(/pm(\d+)\.icon\.png$/)!;
    const no = parseInt(noText, 10);

    // Amount of Mega candies.
    const count = parseInt(rewardItem.querySelector('.quantity')?.text!.replace(/×/, '') ?? '0', 10);

    return {
      no,
      name: pokedex.getPokemonNameByNo(no, 'zh-TW')!,
      originalName: pokedex.getPokemonNameByNo(no, 'en-US')!,
      count: count,
      imageUrl,
      megaCandyImageUrl,
    };
  });

  return rewards;
};

const getResearches = async () => {
  const url = urlJoin(hostUrl, '/research/');
  const res = await fetch(url);
  const xml = await res.text();

  const root = parse(xml);

  const researches: Resaerch[] = [];

  const researchGroupItems = root.querySelectorAll('.task-category');

  researchGroupItems.forEach((researchGroupItem) => {
    const category = categoryMapping(researchGroupItem.querySelector('h2')?.rawText.trim()!);
    const researchItems = researchGroupItem.querySelectorAll('.task-item');

    researchItems.forEach((researchItem) => {
      researches.push({
        description: translateDescription(researchItem.querySelector('.task-text')?.rawText.trim()!),
        originalDescription: researchItem.querySelector('.task-text')?.rawText.trim()!,
        category,
        rewardPokemons: getRewardPokemons(researchItem),
        rewardPokemonMegaCandies: getRewardPokemonMegaCandies(researchItem),
      });
    });
  });

  const sortedResearches = _.orderBy(researches, (research) => {
    const matchedTag = tags.find((tag) => tag.displayText === research.category);
    return matchedTag?.priority;
  }, ['asc']);

  return sortedResearches;
};

export {
  getResearches,
};
