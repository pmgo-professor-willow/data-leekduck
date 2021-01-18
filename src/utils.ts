const hostUrl = 'https://leekduck.com';
const assetUrl = 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/';

const cpFormatter = (cpRawText: string) => {
  const matches = cpRawText.trim().match(/^(\d+)[^\d]+(\d+)$/);

  if (matches) {
    return {
      min: parseInt(matches[1]),
      max: parseInt(matches[2]),
    };
  } else {
    return null;
  }
};

export {
  hostUrl,
  assetUrl,
  cpFormatter,
};
