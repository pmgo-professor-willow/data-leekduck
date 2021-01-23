// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { transPokemonName } from 'pmgo-pokedex';
// Local modules.
import { hostUrl, assetUrl, cpFormatter } from './utils';

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
    const { 1: fileName, 3: noText } = imageUrlRaw.match(/(pokemon_icon_(pm)*(\d+)_.+)/)!;
    const imageUrl = urlJoin(assetUrl, fileName);

    const no = parseInt(noText);
    const originalName = researchItem.querySelector('.task-reward .reward-text').rawText.trim();
    const name = transPokemonName(originalName, no);

    const categoryRaw = researchItem.querySelector('.task-text').getAttribute('class')!;
    const { 1: category } = categoryRaw.match(/.+ (\w+-research-tag)/)!;

    return {
      description: researchItem.querySelector('.task-text').rawText.trim(),
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
