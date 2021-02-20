// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { transPokemonName } from 'pmgo-pokedex';
import type { HTMLElement } from 'node-html-parser';
// Local modules.
import { hostUrl, assetUrl, cpFormatter } from './utils';

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
    // imageUrl: '//images.weserv.nl/?w=200&il&url=raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/pokemon_icon_460_51.png'
    // imageUrl: '//images.weserv.nl/?w=200&il&url=raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/pokemon_icon_pm0025_00_pgo_movie2020.png'
    const imageUrlRaw = bossItem.querySelector('div.boss-img img').getAttribute('src')!;
    const { 1: fileName, 3: noText } = imageUrlRaw.match(/(pokemon_icon_(pm)*(\d+)_.+)/)!;
    const imageUrl = urlJoin(assetUrl, fileName);

    const no = parseInt(noText);
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
      boostedWeathers: bossItem.querySelectorAll('div.boss-3 .boss-weather img').map((node) =>
        node.getAttribute('src')?.match(/(\w+)\.png$/)![1]
      ),
      boostedWeatherUrls: bossItem.querySelectorAll('div.boss-3 .boss-weather img').map((node) =>
        urlJoin(hostUrl, node.getAttribute('src')!)
      ),
    };
  });

  return raidBosses;
};

export {
  getRaidBosses,
};
