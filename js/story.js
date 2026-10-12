// =============================================================
// KOFI KESE - story, dialogue and tutorial signs
// English is the working reference. Twi will replace "t" later.
// Character names render in Kradin (Koradin font).
// =============================================================
window.KK = window.KK || {};

KK.CHARACTERS = {
  kofitia:    { name: 'Kofitia',      color: '#d93a2b' },
  odade:      { name: 'Odade',        color: '#2a2a2a' },
  samanteng:  { name: 'Samanteng',    color: '#e9e3d0' },
  sasabonsam: { name: 'Sasabonsam',   color: '#7b3fa0' },
  brafo:      { name: 'Barafo Boneng', color: '#3a2f2a' },
  basa:       { name: 'Awurade Basa', color: '#c9971a' },
  narrator:   { name: '',             color: '#000000' },
  // mini-bosses (giant mobs). Twi names to be checked by a Twi speaker.
  giant_snake:        { name: 'Ɔwɔ Kɛseɛ',          color: '#5b8a3a' },
  giant_goat:         { name: 'Aponkye Kɛseɛ',      color: '#8a6a4a' },
  giant_fowl:         { name: 'Akɔmfɛm Kɛseɛ',      color: '#4a4a5a' },
  giant_monkey:       { name: 'Kwakuo Kɛseɛ',       color: '#6a4a2a' },
  giant_panther:      { name: 'Ɔsebɔ Kɛseɛ',        color: '#2a2a2a' },
  giant_whiteMmoatia: { name: 'Aboatia Fitaa',      color: '#e8e8e0' },
  giant_goldMask:     { name: 'Sika Anim Kɛseɛ',    color: '#c9971a' },
  giant_goldLion:     { name: 'Sika Gyata Kɛseɛ',   color: '#d9a520' },
  giant_goldSlime:    { name: 'Sika Nsuo Kɛseɛ',    color: '#e0b030' },
};

KK.DIALOGUE = {
  // ---- mini-bosses who talk (key = mini_<level>_<n>, n = order of the Q tiles from left to right, starting at 0) ----
  mini_w1_l1_0: [
    { s: 'kofitia', t: 'Great guinea fowl! Which way to Awurade Basa?' },
    { s: 'giant_fowl', t: 'Basa? A human king? Ha!' },
    { s: 'giant_fowl', t: 'The humans of Adanse steal our eggs and burn the bush we nest in.' },
    { s: 'giant_fowl', t: 'And you, a forest spirit, carry gold for them? Find the way yourself.' },
  ],
  mini_w1_l2_1: [
    { s: 'kofitia', t: 'Elder of the grass, show me the path through this wilderness.' },
    { s: 'giant_snake', t: 'So you can lead more humans in here? No.' },
    { s: 'giant_snake', t: 'This morning I watched one of them squat and foul the river of my master, the obosom Ofin.' },
    { s: 'giant_snake', t: 'In his own river! Humans are fools, and those who serve them are worse.' },
    { s: 'kofitia', t: 'Then I will find the path without you.' },
    { s: 'giant_snake', t: 'You will find my fangs first.' },
  ],
  mini_w2_l1_1: [
    { s: 'kofitia', t: 'A white Mmoatia! Sister, which way leads out of this forest?' },
    { s: 'giant_whiteMmoatia', t: 'Sister? You run errands for humans now, little red one.' },
    { s: 'giant_whiteMmoatia', t: 'They cut down the odum tree where our grandmothers danced, and sold it at the market.' },
    { s: 'giant_whiteMmoatia', t: 'No Mmoatia who serves them walks through my forest.' },
  ],
  mini_w2_l2_0: [
    { s: 'kofitia', t: 'Ɔsebɔ, I only need the way to the end of the grove.' },
    { s: 'giant_panther', t: 'The way? Follow the smoke. Humans set the forest on fire to clear their farms.' },
    { s: 'giant_panther', t: 'My cubs ran from the flames. Now the forest belongs to whoever burns it.' },
    { s: 'giant_panther', t: 'Turn back, or I will treat you the way they treat us.' },
  ],
  mini_w3_l1_1: [
    { s: 'kofitia', t: 'Golden one, is this the road to Awurade Basa?' },
    { s: 'giant_goldMask', t: 'Every road here is gold. That is why humans would tear it apart.' },
    { s: 'giant_goldMask', t: 'In Adanse they rip the earth open for gold and pour poison into the rivers.' },
    { s: 'giant_goldMask', t: 'The fish die. The children drink it. And still they dig.' },
    { s: 'giant_goldMask', t: 'You carry gold to a human king. You will not pass.' },
  ],
  mini_w3_l2_0: [
    { s: 'kofitia', t: 'Sika Gyata, the clouds hide the way. Will you show me?' },
    { s: 'giant_goldLion', t: 'For a hundred years I guarded the sacred grove of Adanse.' },
    { s: 'giant_goldLion', t: 'Then men came with saws. They said the trees were only wood.' },
    { s: 'giant_goldLion', t: 'A people that cuts down its own shrines does not need a king. It needs a lesson.' },
  ],

  opening: [
    { s: 'odade', t: 'Kofitia. Come closer to the fire.' },
    { s: 'odade', t: 'Seven nights I have hammered this gold. Seven nights the forge has not slept.' },
    { s: 'odade', t: 'This is Afenakwa. Its edge was cooled in river water and blessed with the names of our ancestors.' },
    { s: 'kofitia', t: 'It is heavier than it looks, Master.' },
    { s: 'odade', t: 'A kingdom always is.' },
    { s: 'odade', t: 'Carry Afenakwa to Awurade Basa, the Okanemanhene. With it, he will raise the kingdom.' },
    { s: 'odade', t: 'But hear me. Not everyone wants this kingdom to be born. Powerful beings will stand in your way.' },
    { s: 'kofitia', t: 'Then they will meet a Mmoatia who does not turn back.' },
    { s: 'odade', t: 'Ha! Small feet, big heart. That is why they call you Kofi Kese.' },
    { s: 'odade', t: 'Go. Eat when you are hungry, rest when you are tired, and never let go of the sword.' },
  ],

  samantengIntro: [
    { s: 'samanteng', t: 'A little Mmoatia, walking through my forest... carrying gold that sings.' },
    { s: 'samanteng', t: 'Do you hear it, my children? Bring it to me.' },
  ],
  samantengSeize: [
    { s: 'samanteng', t: 'Enough!' },
  ],
  samantengThrow: [
    { s: 'samanteng', t: 'Let the trees keep your shiny gift. Now nothing stands between my claws and your bones.' },
    { s: 'kofitia', t: 'Odade forged me a blade too. It is not gold, but it bites.' },
  ],
  samantengDefeat: [
    { s: 'samanteng', t: 'You think you have won? My husband rules the deep forest...' },
    { s: 'samanteng', t: '...and he never lets gold fall to the ground.' },
    { s: 'kofitia', t: 'Then I will take it back from him.' },
  ],
  portalHint: [
    { s: 'narrator', t: 'A brass pan of water rests on the Nyamedua. In the water, another world is moving.' },
  ],

  sasabonsamIntro: [
    { s: 'sasabonsam', t: 'So you are the one who made my wife cry.' },
    { s: 'sasabonsam', t: 'I am Sasabonsam. Samanteng is my wife, and this forest is my house.' },
    { s: 'sasabonsam', t: 'Looking for the golden sabre? It fell into my forest like ripe fruit.' },
    { s: 'kofitia', t: 'It belongs to Awurade Basa. Give it back.' },
    { s: 'sasabonsam', t: 'Come and take it. But little feet cannot reach the sky.' },
    { s: 'kofitia', t: '(He is too strong on the ground. I must strike him from above.)' },
  ],
  sasabonsamDefeat: [
    { s: 'sasabonsam', t: 'Ah... you strike like a hawk, little one.' },
    { s: 'kofitia', t: 'Afenakwa. Where is it?' },
    { s: 'sasabonsam', t: 'Gone. I gave it to Barafo Boneng, the executioner beyond the clouds.' },
    { s: 'sasabonsam', t: 'He will not play with you the way we did.' },
  ],

  brafoIntro: [
    { s: 'brafo', t: 'Mmoatia. You climbed very far to die.' },
    { s: 'kofitia', t: 'Afenakwa is not yours, Barafo Boneng.' },
    { s: 'brafo', t: 'Nothing belongs to anyone until it is taken.' },
    { s: 'brafo', t: 'With this blade I will go down to Aburokyire and cut it from the map. Every road. Every house. Every name.' },
    { s: 'kofitia', t: 'Then I stop you here.' },
    { s: 'kofitia', t: '(Light strikes will not even scratch him. Only heavy attacks will get through.)' },
  ],
  brafoRegen: [
    { s: 'brafo', t: 'Hm. You found my skin.' },
    { s: 'brafo', t: 'But gold remembers its master. Afenakwa, mend me!' },
  ],
  brafoDefeat: [
    { s: 'brafo', t: 'The blade... chose... the small one...' },
    { s: 'kofitia', t: 'Afenakwa. You are coming home.' },
  ],

  ending: [
    { s: 'narrator', t: 'Through a hole in the clouds, Kofitia let Afenakwa fall.' },
    { s: 'narrator', t: 'It fell like a star, past the birds, past the trees, into the waiting hands of Awurade Basa.' },
    { s: 'basa', t: 'Afenakwa. Odade\'s fire, and a small one\'s courage.' },
    { s: 'basa', t: 'Today, the kingdom is born.' },
  ],
};

// Tutorial / hint signs, referenced by digits 1-9 in level maps
KK.SIGNS = {
  w1_l1: {
    1: 'Move left and right. Push UP to jump, hold it to jump higher. Push UP again in the air to jump twice.',
    2: 'Jump under a box to break it with your head.',
    3: 'ATTACK strikes fast. Tap it up to 5 times for a combo. Landing hits also charge your power (blue).',
    4: 'DODGE: a quick dash that hurts what you pass through. Uses stamina (orange).',
    5: 'HEAVY 1 uses stamina. Tap ATTACK a few times then HEAVY 1 for a combo finisher. HEAVY 2 uses power and crosses the whole land.',
    6: 'Bananas heal you. Cocoa restores power. Gye Nyame gold weights raise your score. Some are hidden.',
    7: 'At a ladder, push UP or DOWN to climb. Elsewhere, DOWN crouches: crouch and attack to stun an enemy.',
    8: 'Gap too wide? Jump, then dodge in mid-air. Land on enemies to stomp them.',
    9: 'In the air, hold HEAVY 1 to spin a shield. It burns stamina and hurts anything it touches.',
  },
  w1_l2: {
    1: 'Some walls are not what they seem.',
    2: 'Three paths: safe below, skilled above, risky at the top. Hold DOWN on a thin platform to drop through.',
  },
  w2_l1: {
    1: 'White Mmoatia spit fire. Dodge through the flames.',
  },
  w2_l2: {
    1: 'Strike a switch to wake the platforms.',
  },
  w3_l1: {
    1: 'In the clouds, your stamina and power are full. Fight boldly.',
  },
  w3_l2: {},
  w3_boss: {},
};
