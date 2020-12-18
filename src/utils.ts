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
  cpFormatter,
};
