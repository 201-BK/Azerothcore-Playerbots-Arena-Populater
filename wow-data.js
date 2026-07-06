const ALLIANCE_RACES = [1, 3, 4, 7, 11];
const HORDE_RACES = [2, 5, 6, 8, 10];

const RACE_NAMES = {
  1: 'Human', 2: 'Orc', 3: 'Dwarf', 4: 'Night Elf', 5: 'Undead',
  6: 'Tauren', 7: 'Gnome', 8: 'Troll', 10: 'Blood Elf', 11: 'Draenei',
};

const CLASS_NAMES = {
  1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue', 5: 'Priest',
  6: 'Death Knight', 7: 'Shaman', 8: 'Mage', 9: 'Warlock', 11: 'Druid',
};

const BRACKETS = [
  { type: 2, label: '2v2', size: 2 },
  { type: 3, label: '3v3', size: 3 },
  { type: 5, label: '5v5', size: 5 },
];

function factionOf(race) {
  if (ALLIANCE_RACES.includes(race)) return 'Alliance';
  if (HORDE_RACES.includes(race)) return 'Horde';
  return 'Unknown';
}

function raceListFor(faction) {
  return faction === 'Alliance' ? ALLIANCE_RACES : HORDE_RACES;
}

const ALLIANCE_PREFIXES = [
  'Silver', 'Golden', 'Radiant', 'Lion', 'Griffon', 'Dawn', 'Storm', 'Ivory',
  'Valiant', 'Noble', 'Crusading', 'Sunward', 'Highland', 'Steadfast',
  'Gallant', 'Argent', 'Skyward', 'Vigilant',
];
const ALLIANCE_SUFFIXES = [
  'Vanguard', 'Battalion', 'Guard', 'Company', 'Talons', 'Wardens', 'Blades',
  'Sentinels', 'Legion', 'Brigade', 'Watch', 'Knights', 'Riders', 'Crusaders',
  'Champions', 'Banner', 'Squadron', 'Order',
];

const HORDE_PREFIXES = [
  'Blood', 'Ash', 'Iron', 'Doom', 'Grim', 'Fel', 'Skull', 'Widow', 'Rage',
  'Black', 'Savage', 'Bone', 'Dread', 'Wild', 'Jagged', 'Molten', 'Night',
  'Vile',
];
const HORDE_SUFFIXES = [
  'Fang', 'Reavers', 'Warband', 'Skulls', 'Claws', 'Marauders', 'Howlers',
  'Ravagers', 'Blades', 'Stalkers', 'Brutes', 'Fists', 'Riders', 'Pack',
  'Berserkers', 'Wolves', 'Cutthroats', 'Horde',
];

function namePoolFor(faction) {
  return faction === 'Alliance'
    ? { prefixes: ALLIANCE_PREFIXES, suffixes: ALLIANCE_SUFFIXES }
    : { prefixes: HORDE_PREFIXES, suffixes: HORDE_SUFFIXES };
}

module.exports = {
  ALLIANCE_RACES,
  HORDE_RACES,
  RACE_NAMES,
  CLASS_NAMES,
  BRACKETS,
  factionOf,
  raceListFor,
  namePoolFor,
};
