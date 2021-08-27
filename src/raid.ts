// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { transPokemonName } from 'pmgo-pokedex';
import type { HTMLElement } from 'node-html-parser';
// Local modules.
import { hostUrl, cpFormatter } from './utils';

const getRaidBosses = async () => {
  const bossUrl = urlJoin(hostUrl, '/boss/');
  const res = await fetch(bossUrl);
  const xml = await res.text();

  const root = parse(xml);
  const listItems = root.querySelectorAll('#raid-list ul.list li');
  let tierList: { tier: string, index: number }[] = [];
  const bossItems: HTMLElement[] = [];

  listItems.forEach((listItem, i) => {
    const isHeader = listItem.getAttribute('class') === 'header-li';

    if (isHeader) {
      const tierText = listItem.querySelector('h2.boss-tier-header').lastChild.rawText;
      const tier = tierText.toLowerCase().replace('tier', '').trim();
      const index = i - tierList.length;
      tierList.push({ tier, index });
    } else {
      bossItems.push(listItem);
    }
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
  tierList = _.uniqBy(tierList.reverse(), (o) => o.index).reverse();
  
  const raidBosses = bossItems.map((bossItem, i) => {
    const imageUrlRaw = bossItem.querySelector('div.boss-img img').getAttribute('src')!;

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

    const originalName = bossItem.querySelector('p.boss-name').firstChild.rawText;
    const name = transPokemonName(originalName, no);

    return {
      tier: _.maxBy(tierList.filter((o) => i >= o.index), 'index')?.tier,
      no,
      name,
      originalName,
      imageUrl,
      shinyAvailable: !!bossItem.querySelector('div.boss-img img.shiny-icon'),
      types: bossItem.querySelectorAll('div.boss-type img').map((node) =>
        node.getAttribute('title')?.toLowerCase()
      ),
      typeUrls: bossItem.querySelectorAll('div.boss-type img').map((node) =>
        urlJoin(hostUrl, node.getAttribute('src')!)
      ),
      cp: cpFormatter(bossItem.querySelector('div.boss-2').lastChild.rawText),
      boostedCp: cpFormatter(bossItem.querySelector('div.boss-3 span.boosted-cp').lastChild.rawText),
      boostedWeathers: bossItem.querySelectorAll('div.boss-3 .boss-weather img').map((node) => {
        const matches = node.getAttribute('src')?.match(/(\w+)\.png$/);
        return matches ? matches[1] : null;
      }).filter(Boolean),
      boostedWeatherUrls: bossItem.querySelectorAll('div.boss-3 .boss-weather img').map((node) => {
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
