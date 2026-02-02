// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import type { HTMLElement } from 'node-html-parser';
// Local modules.
import { hostUrl } from './constants/index';
import { cpFormatter } from './utils/calculator';
import { pokedex } from './utils/pokedex';

const getRaidBosses = async () => {
  const bossUrl = urlJoin(hostUrl, '/raid-bosses/');
  const res = await fetch(bossUrl);
  const xml = await res.text();

  const root = parse(xml);
  const grids = root.querySelectorAll('div.grid');
  const tierList: { tier: string, index: number }[] = [];
  const bossItems: HTMLElement[] = [];

  grids.forEach((grid) => {
    let tierHeader: HTMLElement | null = grid.previousElementSibling;
    while (tierHeader && (tierHeader.rawTagName !== 'h2' || !tierHeader.getAttribute('class')?.includes('header'))) {
      tierHeader = tierHeader.previousElementSibling;
    }
    const tierRaw = tierHeader?.getAttribute('data-tier') ?? '';
    const tier = tierRaw.toLowerCase();

    const cards = grid.querySelectorAll('div.card');
    const startIndex = bossItems.length;
    tierList.push({ tier, index: startIndex });
    cards.forEach((card) => bossItems.push(card));
  });

  /**
    Avoid this case:
    [
      { tier: '1', index: 0 },
      { tier: '3', index: 0 },
      { tier: '4', index: 4 },
      { tier: '5', index: 5 },
      { tier: 'mega', index: 9 }
    ]
   */
  tierList.sort((a, b) => a.index - b.index);
  const dedupedTierList = _.uniqBy(tierList, (o) => o.index);

  const raidBosses = bossItems.map((bossItem, i) => {
    const imageUrlRaw = bossItem.querySelector('div.boss-img img')?.getAttribute('src')!;

    let fileName: string;
    let no: number = 0;
    const imageUrl = new URL(imageUrlRaw, bossUrl).href;

    // imageUrl: '.../pm888.icon.png'
    const match1 = imageUrlRaw.match(/(pm(\d+)(\.(.+))?\.icon\..+)/)!;
    if (match1) {
      const { 1: fileNameRaw, 2: noRaw, 4: _formRaw } = match1;
      fileName = fileNameRaw;
      no = parseInt(noRaw);
    }

    // imageUrl: '.../pokemon_icon_460_51.png'
    const match2 = imageUrlRaw.match(/\/(pokemon_icon_(pm)*(\d+)_.+)/)!;
    if (match2) {
      const { 1: fileNameRaw, 3: noRaw } = match2;
      fileName = fileNameRaw;
      no = parseInt(noRaw);
    }

    // imageUrl: '.../pokemon_icon_pm0025_00_pgo_movie2020.png'
    const match3 = imageUrlRaw.match(/\/(pokemon_icon_pm(\d+).+)/)!;
    if (match3) {
      const { 1: fileNameRaw, 2: noRaw } = match3;
      fileName = fileNameRaw;
      no = parseInt(noRaw);
    }

    const originalName = bossItem.querySelector('p.name')?.firstChild?.rawText
      ?? bossItem.querySelector('p.name')?.text?.trim() ?? '';
    const name = pokedex.transPokemonName(originalName);

    const cpRangeEl = bossItem.querySelector('div.cp-range');
    const boostedCpEl = bossItem.querySelector('div.boosted-cp-row span.boosted-cp');
    const weatherContainer = bossItem.querySelector('div.weather-boosted') ?? bossItem.querySelector('div.boss-3');

    const cpRaw = (cpRangeEl?.text ?? cpRangeEl?.rawText ?? '')?.replace(/^CP\s*/i, '').trim();
    const boostedCpRaw = (boostedCpEl?.text ?? boostedCpEl?.rawText ?? '')?.replace(/^CP\s*/i, '').trim();

    return {
      tier: _.maxBy(dedupedTierList.filter((o) => i >= o.index), 'index')?.tier,
      no,
      name,
      originalName,
      imageUrl,
      shinyAvailable: !!bossItem.querySelector('div.boss-img .shiny-icon'),
      types: bossItem.querySelectorAll('div.boss-type img').map((node) =>
        node.getAttribute('title')?.toLowerCase()
      ).filter(Boolean),
      typeUrls: bossItem.querySelectorAll('div.boss-type img').map((node) => {
        const src = node.getAttribute('src');
        return src ? urlJoin(hostUrl, src) : null;
      }).filter(Boolean),
      cp: cpFormatter(cpRaw),
      boostedCp: cpFormatter(boostedCpRaw),
      boostedWeathers: (weatherContainer?.querySelectorAll('.boss-weather img') ?? []).map((node) => {
        const matches = node.getAttribute('src')?.match(/(\w+)\.png$/);
        return matches ? matches[1] : null;
      }).filter(Boolean),
      boostedWeatherUrls: (weatherContainer?.querySelectorAll('.boss-weather img') ?? []).map((node) => {
        const matches = node.getAttribute('src')?.match(/(\w+)\.png$/);
        return matches ? urlJoin(hostUrl, node.getAttribute('src')!) : null;
      }).filter(Boolean),
    };
  });

  return raidBosses;
};

export {
  getRaidBosses,
};
