(() => {
  // Lv9: difficulty 100 benchmark bank. All are fixed, unique-solution classics.
  const EXTREME_100 = [
    {
      name: 'AI Escargot', author: 'Arto Inkala', year: 2006,
      puzzle: '100007090030020008009600500005300900010080002600004000300000010040000007007000300'
    },
    {
      name: 'Platinum Blonde', author: 'gsf / coloin', year: 2005,
      puzzle: '.......12........3..23..4....18....5.6..7.8.......9.....85.....9...4.5..47...6...'
    },
    {
      name: 'Golden Nugget', author: 'tarek', year: 2007,
      puzzle: '000000039000010005003005800008009006070020000100400000009008050020000600400700000'
    }
  ];

  // Lv10: Arto Inkala's 2012 puzzle widely publicized as "World's Hardest Sudoku".
  const WORLD_HARDEST = {
    name: "Inkala's World's Hardest",
    author: 'Arto Inkala',
    year: 2012,
    puzzle: '800000000003600000070090200050007000000045700000100030001000068008500010090000400'
  };

  window.HardPuzzles={EXTREME_100,WORLD_HARDEST};
})();
