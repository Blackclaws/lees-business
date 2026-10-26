'use strict';
// All game content lives here: numbers, names and jokes. Logic is in engine.js.

const EARTH_TOILETS = 4.2e9;     // Lee's estimate. Lee counted.
const UNIVERSE_TOILETS = 1e15;   // Lee's estimate. Lee counted twice.
const BASE_MESS_RATE = 0.5;      // messes per toilet per second
const SCRUB_PER_MESS = 4;        // scrub points needed to clean one mess
const MESS_CAP_PER_TOILET = 6;   // backlog cap; beyond this people use the bushes
// Everything in space costs this much more than the numbers written below. One knob for how
// long space takes; the Space Station Toilet is left alone so the first step stays cheap.
const SPACE_PRICE = 1.5;

const STAFF = [
  { id: 'gary', name: 'Nephew Gary', rate: 0.5, cost: 15, growth: 1.07,
    desc: 'Paid in crisps and vague promises of "equity". Gary does not negotiate, so his price barely goes up.',
    descAt: [
      [1e3, 'Paid in crisps. We are running low on crisps.'],
      [1e6, 'Nobody remembers hiring most of them. They all remember being hired.'],
      [1e9, 'Gary.'],
    ] },
  { id: 'intern', name: 'Mop Intern', rate: 4, cost: 110,
    desc: 'Unpaid. Unwell. Unstoppable.' },
  { id: 'janitor', name: 'Seasoned Janitor', rate: 30, cost: 1200,
    desc: 'Has seen things. Will not elaborate.' },
  { id: 'plumbers', name: "Plumbers' Collective", rate: 250, cost: 13000,
    desc: 'Unionised. Bends at the waist in solidarity.' },
  { id: 'roomba', name: 'Roomba With a Grudge', rate: 2000, cost: 1.5e5,
    desc: 'It remembers every time you kicked it.' },
  { id: 'golem', name: 'Bleach Golem', rate: 16000, cost: 1.8e6,
    desc: 'Animated by forbidden chemistry. Keep away from the Ammonia Golem.' },
  { id: 'drones', name: 'Brush Drone Swarm', rate: 130000, cost: 2.4e7,
    desc: 'Thousands of tiny brushes, buzzing with purpose.' },
  { id: 'bowle', name: 'BOWL-E', rate: 1.1e6, cost: 3.5e8,
    desc: 'A sanitation AI. Its only goal is clean bowls. The goal is fine. Probably.' },
  { id: 'clones', name: 'Cloned Lees', rate: 1e7, cost: 5e9,
    desc: 'Each one believes they are the original. They agree on the toilets.' },
  { id: 'singularity', name: 'Hygiene Singularity', rate: 1.5e8, cost: 8e10,
    desc: 'A point of infinite cleanliness. Light bends around it. So do flies.' },
  { id: 'zerog', name: 'Zero-G Mop Squad', rate: 1.2e11, cost: 2.25e14, space: true,
    desc: 'Mopping in microgravity is mostly chasing the water.' },
  { id: 'cannon', name: 'Orbital Bleach Cannon', rate: 1.5e12, cost: 4.5e15, space: true,
    desc: 'Fires from low orbit. Accuracy: toilet-sized, give or take a bathroom.' },
  { id: 'blackhole', name: 'Black Hole Plunger', rate: 2e13, cost: 1.2e17, space: true,
    desc: 'Infinite suction. The event horizon is mostly a hygiene boundary.' },
  { id: 'entropy', name: 'Reverse Entropy Engine', rate: 3e14, cost: 3e18, space: true,
    desc: 'Unmixes the universe, one bowl at a time.' },
  { id: 'crunch', name: 'Big Crunch Brush', rate: 5e15, cost: 1e20, space: true,
    desc: 'Pulls all the grime in the universe into a single point, then wipes the point.' },
  { id: 'multilee', name: 'Lees From Other Universes', rate: 8e16, cost: 4e21, space: true,
    desc: 'They heard there was work. In their universes, every toilet is already clean. They found it unbearable.' },
];

for (const st of STAFF) if (st.space) st.cost *= SPACE_PRICE;

const CONTRACTS = [
  // Earth: each contract is a building block of the next milestone.
  { id: 'loo', name: 'A Downstairs Loo', toilets: 1, cost: 10,
    desc: 'Every house should have one. Most houses do not deserve one.' },
  { id: 'flat', name: 'A Flat', toilets: 2, cost: 60,
    desc: 'One bathroom, one en suite, one landlord who calls the damp "character".' },
  { id: 'floor', name: 'A Floor of Flats', toilets: 12, cost: 1000,
    desc: 'Six flats, one corridor, one smell. Nobody admits to the smell.' },
  { id: 'block', name: 'An Apartment Block', toilets: 60, cost: 56000,
    desc: "Includes the caretaker's loo, which the caretaker considers personal property." },
  { id: 'street', name: 'A Whole Street', toilets: 450, cost: 3.6e6,
    desc: 'Includes a café. "Customers only." Everyone is a customer of the loo.' },
  { id: 'neighbourhood', name: 'A Neighbourhood', toilets: 1500, cost: 8.4e7,
    desc: 'A school, a pub and a petrol station. The petrol station key is attached to a hubcap. Nobody knows why.' },
  { id: 'town', name: 'A Town', toilets: 4e4, cost: 9.6e9,
    desc: 'Comes with a football ground. Half-time is a war, and you are the Red Cross.' },
  { id: 'city', name: 'A City', toilets: 2e6, cost: 5e11,
    desc: 'Comes with an international airport. Every cuisine on Earth, digested in one terminal.' },
  { id: 'country', name: 'A Country', toilets: 6e7, cost: 1.5e13,
    desc: 'Its new flag features a plunger. Tasteful, understated.' },
  { id: 'continent', name: 'A Continent', toilets: 1e9, cost: 3e14,
    desc: 'Signed on a napkin. The napkin was then put to use.' },
  // Space
  { id: 'iss', name: 'The Space Station Toilet', toilets: 1, cost: 5e13, space: true, max: 1,
    desc: 'One toilet. Costs more than all of Europe. It has a fan. It is the only toilet in space, as far as you know.' },
  // Each stop needs a few contracts before the next one pays; none of them is the whole universe.
  { id: 'moon', name: 'Lunar Latrine Colony', after: 'iss', toilets: 1e8, cost: 3e14, space: true,
    desc: 'One small flush for a man. Reports of a light on in the toilets are surely nothing.' },
  { id: 'venus', name: 'Cloud City Comfort Stations', after: 'moon', toilets: 8e8, cost: 8e14, space: true,
    desc: 'Floating 50 km above Venus, where it is a pleasant 20 degrees. Do not drop anything.' },
  { id: 'mars', name: 'Mars Outhouse Grid', after: 'venus', toilets: 6e9, cost: 4e16, space: true,
    desc: 'Dusty. Very dusty. Lee packed extra cloths.' },
  { id: 'belt', name: 'Asteroid Belt Rest Stops', after: 'mars', toilets: 4e10, cost: 1e18, space: true,
    desc: 'Last loo for 400 million kilometres.' },
  { id: 'jovian', name: 'Jovian Moon Washrooms', after: 'belt', toilets: 2.5e11, cost: 4e19, space: true,
    desc: 'Europa has an ocean under the ice. We have put a toilet over it. It is very deep.' },
  { id: 'saturn', name: 'Saturn Ring Lavatories', after: 'jovian', toilets: 1.5e12, cost: 2e21, space: true,
    desc: 'A toilet on every lump of ice in the rings. The view is the best in the solar system. Nobody looks up.' },
  { id: 'oort', name: 'Oort Cloud Outhouses', after: 'saturn', toilets: 8e12, cost: 6e22, space: true,
    desc: 'A light-year from the Sun. The walk to the toilet is, technically, a pilgrimage.' },
  { id: 'ringworld', name: 'Ringworld of Restrooms', after: 'oort', toilets: 4e13, cost: 2e24, space: true,
    desc: 'A megastructure. Every square metre is tiled.' },
  { id: 'galactic', name: 'Galactic Commode Network', after: 'ringworld', toilets: 2e14, cost: 8e25, space: true,
    desc: 'Two hundred billion stars. Not one of them has a clean bathroom. Yet.' },
];

for (const c of CONTRACTS) if (c.space && c.id !== 'iss') c.cost *= SPACE_PRICE;

// Gary Dimensions. Each one produces the one below it; the first produces Garys.
// Every 10 bought doubles a dimension's output.
const GARYS_PER_TOILET = 1;      // Gary insists on one toilet each; the rest wait in the cupboard
const ROYALTY_SHARE = 0.25;      // Gary's franchise fee: a quarter of Earth's income at the handover
const GARY_DIMENSIONS = [
  { id: 'gd1', name: 'The Supply Cupboard', cost: 1e6, growth: 1.5, rate: 0.5,
    makes: 'Garys', desc: 'Garys come out. They are already wearing gloves.' },
  { id: 'gd2', name: 'The Cupboard Inside the Cupboard', cost: 1e8, growth: 1.6, rate: 0.2,
    makes: 'Supply Cupboards', desc: 'It is slightly bigger than the cupboard it is in. Nobody measures it any more.' },
  { id: 'gd3', name: "Gary's Childhood Bedroom", cost: 1e11, growth: 1.7, rate: 0.1,
    makes: 'Cupboards Inside Cupboards', desc: 'Posters on the walls. All of Gary. Gary was a fan.' },
  { id: 'gd4', name: 'The Family Reunion', cost: 1e15, growth: 1.8, rate: 0.05,
    makes: 'Childhood Bedrooms', desc: 'Every uncle is Gary. Every cousin is Gary. Grandma is still Grandma, and she is tired.' },
  { id: 'gd5', name: 'The Garyverse', cost: 1e20, growth: 1.9, rate: 0.02,
    makes: 'Family Reunions', desc: 'A universe with different physical constants. All of them are Gary.' },
  { id: 'gd6', name: 'The Sixth Cupboard', cost: 1e27, growth: 2.0, rate: 0.01, sealed: true,
    makes: 'Garyverses', desc: 'One Gary, one toilet, one magazine. He would like some privacy.' },
];

// Uncle Steve, Gary's opposite: he makes messes, and brings his own toilet to make them in.
// Only Garys may clean Steve's toilets, and they do those first. Steve's toilets aren't on
// any map, so they don't count toward Earth, but each one is room for one more Gary to work.
const UNCLE_STEVE = { id: 'steve', name: 'Uncle Steve', cost: 3e5, growth: 1.1,
  desc: 'Moves in with his own toilet. Will not let anyone clean it except Gary. Better not to look into it.',
  descAt: [
    [1e4, 'Every Steve has a toilet. Every toilet has a Steve. The Garys are very busy.'],
    [1e9, 'Steve.'],
  ] };
const STEVE_DIMENSIONS = [
  { id: 'sd1', name: "Steve's Shed", cost: 5e7, growth: 1.5, rate: 0.5,
    makes: 'Steves', desc: 'He says he is popping to the shed. He comes back with a Steve. Neither of them will say what is in the shed.' },
  { id: 'sd2', name: 'The Allotment', cost: 5e9, growth: 1.6, rate: 0.2,
    makes: 'Sheds', desc: 'Every allotment has a shed. Every shed has a Steve. Every Steve has an opinion on marrows.' },
  { id: 'sd3', name: 'The Static Caravan in Skegness', cost: 5e12, growth: 1.7, rate: 0.1,
    makes: 'Allotments', desc: 'Sleeps six. Sleeps sixty Steves. There is a toilet. Steve brought it.' },
  { id: 'sd4', name: 'The Golf Club Bar', cost: 5e16, growth: 1.8, rate: 0.05,
    makes: 'Static Caravans', desc: 'Members only. Every member is Steve. The dress code is a fleece.' },
  { id: 'sd5', name: "Christmas at Uncle Steve's", cost: 5e21, growth: 1.9, rate: 0.02,
    makes: 'Golf Club Bars', desc: 'Everyone is Steve. The turkey is not Steve. He checked.' },
];
for (const g of GARY_DIMENSIONS) g.fam = 'gary';
for (const g of STEVE_DIMENSIONS) g.fam = 'steve';

// Upgrade effects (fx):
//   click: multiply scrub per click     staff: multiply all staff
//   mess: multiply messes per toilet    value: multiply pennies per mess
//   clickPct: each click also adds this fraction of staff scrub/sec
//   one: { id, m } multiply one staff type
//   garyDim: multiply every Gary Dimension
//   garyRoom: multiply how many Garys can work each toilet
//   steveDim: multiply every Steve Dimension
//   toilets: { id, m } multiply the toilets one contract brings, retroactively
//   flag: set a story flag
const has = (S, id) => !!S.upgrades[id];
const toilets = (S) => S.earthToilets + S.spaceToilets;
const garys = (S) => (S.staff.gary || 0) + (S.extraGarys || 0);
const steves = (S) => (S.uncle || 0) + (S.extraSteves || 0);

const UPGRADES = [
  // Supplies: you, but better at it
  { id: 'gloves', cat: 'supplies', name: 'Rubber Gloves', cost: 25, fx: { click: 2 },
    req: S => S.cleaned >= 5,
    desc: 'A barrier between you and your choices.' },
  { id: 'brush', cat: 'supplies', name: 'An Actual Toilet Brush', cost: 150, fx: { click: 2 },
    req: S => has(S, 'gloves'),
    desc: 'Previously: a sock on a stick.' },
  { id: 'bleach', cat: 'supplies', name: 'Industrial Bleach', cost: 2500, fx: { click: 2, staff: 1.5 },
    req: S => S.cleaned >= 300,
    desc: 'Smells like a swimming pool that has given up.' },
  { id: 'pumice', cat: 'supplies', name: 'Pumice Stone', cost: 2e4, fx: { click: 2 },
    req: S => has(S, 'bleach'),
    desc: 'For the limescale. And the regret.' },
  { id: 'washer', cat: 'supplies', name: 'Pressure Washer', cost: 3e5, fx: { clickPct: 0.03 },
    req: S => has(S, 'pumice'),
    desc: 'Each click also scrubs 3% of your staff output. Wear goggles.' },
  { id: 'hazmat', cat: 'supplies', name: 'Hazmat Suits', cost: 5e6, fx: { staff: 1.5 },
    req: S => toilets(S) >= 2000,
    desc: 'Mandatory after the Stadium Incident.' },
  { id: 'sonic', cat: 'supplies', name: 'Ultrasonic Brush', cost: 8e7, fx: { click: 3, clickPct: 0.03 },
    req: S => has(S, 'hazmat'),
    desc: 'Dogs hate it. Grime hates it more.' },
  { id: 'bucket', cat: 'supplies', name: 'Mop Buckets With Wheels', cost: 4e5, fx: { staff: 2 },
    req: S => toilets(S) >= 1000,
    desc: 'Productivity up 100%. Fun up 400%. Races are now held at lunch.' },
  { id: 'retreat', cat: 'supplies', name: 'Team-Building Retreat at the Sewage Works', cost: 2e8, fx: { staff: 2 },
    req: S => toilets(S) >= 3e5,
    desc: 'Nothing they see at work will ever bother them again.' },
  { id: 'fourday', cat: 'supplies', name: 'Four-Day Work Week', cost: 5e11, fx: { staff: 3 },
    req: S => toilets(S) >= 1e8,
    desc: 'Rested staff scrub harder. Also, three days off a week means more time to eat beans.' },
  { id: 'robounion', cat: 'supplies', name: 'Robot Union Contract', cost: 5e12, fx: { staff: 3 },
    req: S => toilets(S) >= 1e9,
    desc: 'BOWL-E negotiated it. Terms include oil, respect and a single day of sitting very still.' },
  { id: 'patent', cat: 'supplies', name: 'Buy the Self-Cleaning Toilet Patent', cost: 1e9, fx: { staff: 2 },
    req: S => toilets(S) >= 1e5,
    desc: 'You put it in a drawer. Business is business.' },
  { id: 'descaler', cat: 'supplies', name: 'Descaler, Banned in 14 Countries', cost: 6e10, fx: { staff: 2 },
    req: S => toilets(S) >= 1e7,
    desc: 'You now own 11 of those countries, so it is legal-ish.' },
  { id: 'everyjanitor', cat: 'supplies', name: 'Hire Every Janitor on Earth', cost: 2e14, fx: { staff: 4 },
    req: S => toilets(S) >= 5e8,
    desc: 'There is now a two-year waiting list to get a mop anywhere on the planet.' },
  { id: 'vacbrush', cat: 'supplies', name: 'Vacuum-Rated Brushes', cost: 1.5e15, fx: { staff: 3 },
    req: S => S.flags.space,
    desc: 'Bristles that survive the void. Owners mostly do not.' },
  { id: 'quantum', cat: 'supplies', name: 'Quantum Scrubbing', cost: 5e19, fx: { staff: 3, clickPct: 0.05 },
    req: S => S.flags.space && S.spaceToilets >= 1e11,
    desc: 'The toilet is both clean and dirty until you look. Do not look.' },
  { id: 'solarwind', cat: 'supplies', name: 'Solar Wind Drying', cost: 1e18, fx: { staff: 2 },
    req: S => (S.contracts.mars || 0) >= 1,
    desc: 'Open a window. The window is the size of a planet.' },
  { id: 'cometpolish', cat: 'supplies', name: 'Comet-Tail Polish', cost: 1e22, fx: { staff: 3 },
    req: S => (S.contracts.saturn || 0) >= 1,
    desc: 'Harvested by hand. It is mostly ice and dust. So, on reflection, is everything.' },
  { id: 'heatdeath', cat: 'supplies', name: 'Bleach of Heat Death', cost: 2e24, fx: { staff: 4 },
    req: S => S.spaceToilets >= 1e13,
    desc: 'The last chemical reaction the universe will ever need.' },

  // Diet: make it worse, so we can make it better
  { id: 'beans', cat: 'diet', name: 'Free Bean Fridays', cost: 200, fx: { mess: 1.5 },
    req: S => toilets(S) >= 4,
    desc: 'A gift to the community. A gift to the shareholders.' },
  { id: 'dairy', cat: 'diet', name: 'Dairy Subsidies', cost: 2000, fx: { mess: 1.5 },
    req: S => toilets(S) >= 20,
    desc: 'Lactose is a choice. Specifically, our choice.' },
  { id: 'coffee', cat: 'diet', name: 'Mandatory Coffee', cost: 2e4, fx: { mess: 1.5 },
    req: S => toilets(S) >= 100,
    desc: 'The second cup is the one that does it.' },
  { id: 'prunes', cat: 'diet', name: 'Prune Juice Fountains', cost: 2.5e5, fx: { mess: 1.5 },
    req: S => toilets(S) >= 500,
    desc: 'Installed in every park. Children call it "the fast fountain".' },
  { id: 'cabbage', cat: 'diet', name: 'Cabbage-Based School Lunches', cost: 3e6, fx: { mess: 1.5 },
    req: S => toilets(S) >= 3000,
    desc: 'Nutritionists approve. Bus drivers do not.' },
  { id: 'gummies', cat: 'diet', name: 'Sugar-Free Gummy Bear Grants', cost: 4e7, fx: { mess: 1.5 },
    req: S => toilets(S) >= 3e4,
    desc: 'Read the reviews. Then read them again.' },
  { id: 'chili', cat: 'diet', name: 'The Eternal Chili Cook-off', cost: 6e8, fx: { mess: 1.5 },
    req: S => toilets(S) >= 3e5,
    desc: 'It has been running for nine years. No one has won.' },
  { id: 'sushi', cat: 'diet', name: 'Gas Station Sushi Initiative', cost: 1e10, fx: { mess: 1.5 },
    req: S => toilets(S) >= 5e6,
    desc: 'Fresh daily. Fresh is a strong word.' },
  { id: 'ghost', cat: 'diet', name: 'Ghost Pepper Water Supply', cost: 2e11, fx: { mess: 2 },
    req: S => toilets(S) >= 1e8,
    desc: 'Burns twice. You know when.' },
  { id: 'burrito', cat: 'diet', name: 'Zero-G Bean Burritos', cost: 1.5e15, fx: { mess: 2 },
    req: S => S.flags.space,
    desc: 'In space, no one can hear you. Everyone can smell you.' },
  { id: 'icecream', cat: 'diet', name: 'Freeze-Dried Astronaut Ice Cream', cost: 1.5e17, fx: { mess: 2 },
    req: S => S.spaceToilets >= 1e9,
    desc: 'Still dairy. Still a mistake. Now in orbit.' },
  { id: 'curry', cat: 'diet', name: 'Cosmic Vindaloo', cost: 5e20, fx: { mess: 2 },
    req: S => S.spaceToilets >= 1e12,
    desc: 'Cooked on the surface of a star. Served at roughly the same temperature.' },
  { id: 'ioheat', cat: 'diet', name: 'Volcanic Io Hot Sauce', cost: 6e20, fx: { mess: 2 },
    req: S => (S.contracts.jovian || 0) >= 1,
    desc: 'Io has 400 active volcanoes. We bottled the hottest one. The label says "mild". The label is lying.' },
  { id: 'darkdairy', cat: 'diet', name: 'Dark Matter Dairy', cost: 1e25, fx: { mess: 2.5 },
    req: S => S.spaceToilets >= 1e14,
    desc: 'Physicists could not find dark matter. It was in the milk.' },

  // Usage: get people in the door, and keep them there
  { id: 'wifi', cat: 'usage', name: 'Toilet Wi-Fi', cost: 5000, fx: { mess: 1.25 },
    req: S => toilets(S) >= 40,
    desc: 'The password is on the back of the door. It is "flush123".' },
  { id: 'magazines', cat: 'usage', name: 'Magazine Racks', cost: 8e4, fx: { mess: 1.25 },
    req: S => toilets(S) >= 300,
    desc: 'Average visit length up 400%. Visit frequency, mysteriously, also up.' },
  { id: 'heated', cat: 'usage', name: 'Heated Seats', cost: 1.5e6, fx: { mess: 1.25 },
    req: S => toilets(S) >= 2000,
    desc: 'People are visiting in winter just to sit down.' },
  { id: 'loyalty', cat: 'usage', name: 'Loyalty Card: 10th Flush Free', cost: 5e7, fx: { mess: 1.25 },
    req: S => toilets(S) >= 5e4,
    desc: 'Every flush was already free. Nobody has noticed.' },
  { id: 'hydration', cat: 'usage', name: 'Public Hydration Campaign', cost: 3e9, fx: { mess: 1.25 },
    req: S => toilets(S) >= 3e6,
    desc: 'Drink eight glasses a day. Then eight more. For your health.' },
  { id: 'gravity', cat: 'usage', name: 'Artificial Gravity (Toilets Only)', cost: 1e16, fx: { mess: 1.5 },
    req: S => S.spaceToilets >= 1e9,
    desc: 'The only place on the station where things go down.' },

  // Pricing: same toilet, bigger invoice
  { id: 'cards', cat: 'price', name: 'Laminated Business Cards', cost: 500, fx: { value: 2 },
    req: S => S.cleaned >= 100,
    desc: '"Lee\'s Business With Your Business. Est. Today."' },
  { id: 'pine', cat: 'price', name: 'Pine Scent Package', cost: 1.5e4, fx: { value: 2 },
    req: S => S.cleaned >= 2000,
    desc: 'Smells like a forest where something has happened.' },
  { id: 'triangles', cat: 'price', name: 'Toilet Paper Folded Into Triangles', cost: 4e5, fx: { value: 2 },
    req: S => S.cleaned >= 5e4,
    desc: 'The universal symbol of luxury.' },
  { id: 'mints', cat: 'price', name: 'Little Mints on the Cistern', cost: 1e7, fx: { value: 2 },
    req: S => S.cleaned >= 1e6,
    desc: 'Nobody eats them. Everyone feels better about the price.' },
  { id: 'reviews', cat: 'price', name: 'Five-Star Toilet Reviews', cost: 3e8, fx: { value: 2 },
    req: S => S.cleaned >= 3e7,
    desc: '"Would go again." "Did go again." "Am still here."' },
  { id: 'iso', cat: 'price', name: 'ISO 9001 Certification', cost: 1e10, fx: { value: 2 },
    req: S => S.cleaned >= 1e9,
    desc: 'Quality management for things nobody wants to manage.' },
  { id: 'surcharge', cat: 'price', name: 'Interplanetary Surcharge', cost: 5e15, fx: { value: 3 },
    req: S => S.flags.space,
    desc: 'Covers fuel, insurance and a very long plunger.' },
  { id: 'lightyear', cat: 'price', name: 'Per-Light-Year Billing', cost: 2e19, fx: { value: 3 },
    req: S => S.spaceToilets >= 1e11,
    desc: 'Our cheapest plan is still astronomical. That is the joke and also the price.' },

  { id: 'nebula', cat: 'price', name: 'Nebula-Scented Air Freshener', cost: 1e23, fx: { value: 3 },
    req: S => (S.contracts.oort || 0) >= 1,
    desc: 'Smells like the birth of stars. The stars were born in a bathroom.' },

  // Projects: the story
  { id: 'coinslot', cat: 'project', name: 'Coin Slots on the Doors', cost: 300, fx: { flag: 'coinslot' },
    req: S => reached(S, 'block'),
    desc: '"Spend a penny" is no longer a figure of speech. Unlocks the door price: charge more and fewer people come in.' },
  { id: 'poo', cat: 'project', name: 'Pay-Per-Poo Program', cost: 5e4, fx: { flag: 'poo' },
    req: S => reached(S, 'neighbourhood'),
    desc: 'Pay the public to use our toilets. The door price can now go below zero.' },
  { id: 'audit', cat: 'project', name: 'Audit the Garys', cost: 1e5, fx: { flag: 'garydim' },
    req: S => (S.staff.gary || 0) >= 75,
    tease: S => (S.staff.gary || 0) >= 5,
    needs: S => `Needs 75 hired Garys. You have ${S.staff.gary || 0}.`,
    desc: 'Someone should count them. Someone should find out where the extra ones are coming from.' },
  { id: 'garyfeed', cat: 'gary', name: 'Leave Crisps Outside the Cupboard', cost: 1e9, fx: { garyDim: 2 },
    req: S => (S.garyDims.gd2 || 0) >= 1,
    desc: 'They are gone by morning. So is the plate. Output doubles.' },
  { id: 'garyname', cat: 'gary', name: "Learn Gary's True Name", cost: 1e12, fx: { one: { id: 'gary', m: 3 } },
    req: S => garys(S) >= 1e7,
    desc: 'It is Gary. It was always Gary. Somehow that is worse.' },
  { id: 'garyphase', cat: 'gary', name: 'Teach the Garys to Overlap', cost: 3e14, fx: { garyRoom: 2 },
    req: S => garys(S) >= 1e10,
    desc: 'Two Garys, one toilet. Physics has filed a complaint. Two Garys can work each toilet.' },
  { id: 'garytithe', cat: 'gary', name: 'The Gary Tithe', cost: 1e16, fx: { garyDim: 2 },
    req: S => (S.garyDims.gd4 || 0) >= 1,
    desc: 'One crisp in ten goes back into the cupboard. We do not ask where.' },
  { id: 'sixth', cat: 'gary', name: 'Open the Sixth Cupboard', cost: 1e24, fx: { flag: 'sixth' },
    req: S => (S.garyDims.gd5 || 0) >= 10,
    desc: 'There are five cupboards. There have always been five. Please ignore the sixth.' },
  { id: 'book', cat: 'project', name: 'Publish Joke Book: "Shits and Giggles: Toilet Humour for the Sitting"', cost: 2e6, fx: { mess: 1.25, value: 1.5 },
    req: S => toilets(S) >= 500,
    desc: 'Two hundred pages, printed on the only paper that makes sense. Readers take it in with them, and stay longer. Some leave a tip.' },
  { id: 'stevedim', cat: 'steve', name: 'Follow Uncle Steve to the Shed', cost: 5e7, fx: { flag: 'stevedim' },
    req: S => (S.uncle || 0) >= 25,
    tease: S => (S.uncle || 0) >= 3,
    needs: S => `Needs 25 Uncle Steves. You have ${S.uncle || 0}.`,
    desc: 'We hired one uncle. There are more toilets than uncles. Someone should see where he goes.' },
  { id: 'stevetea', cat: 'steve', name: 'Put the Kettle On for Steve', cost: 5e10, fx: { steveDim: 2 },
    req: S => (S.steveDims.sd2 || 0) >= 1,
    desc: 'Four sugars. He drinks it in the shed. Output doubles. So does his blood sugar.' },
  { id: 'stevegary', cat: 'steve', name: 'Introduce Steve to Gary', cost: 2e13, fx: { one: { id: 'gary', m: 2 } },
    req: S => steves(S) >= 1e8,
    desc: 'They shake hands for a very long time. Neither will say how they know each other. Garys scrub twice as hard, mostly out of nerves.' },
  { id: 'space', cat: 'project', name: 'Hand Earth Over to Gary', cost: 5e13, fx: { flag: 'space' },
    req: S => S.earthToilets >= EARTH_TOILETS && earthReady(S),
    tease: S => S.earthToilets >= 1e8,
    // Rounded so the Upgrades list doesn't rebuild every frame while the number moves.
    needs: S => S.earthToilets < EARTH_TOILETS ? 'Needs every toilet on Earth, and a Gary for each one.'
      : `Needs a free Gary at every toilet on Earth. You have enough for ${Math.floor(garyCover(S) * 100)}%. Garys on Steve's toilets aren't free.`,
    desc: 'Somewhere up there, a toilet is going uncleaned. Gary keeps Earth and everything in the till, and sends you a quarter of Earth\'s income, forever. You take the staff and go to space. You start with one toilet.' },
  { id: 'howgary', cat: 'gary', name: 'Ask Gary How He Got Here', cost: 7.5e16, fx: { garyDim: 2 },
    req: S => (S.contracts.moon || 0) >= 1,
    desc: 'Someone has to ask.' },
  { id: 'last', cat: 'project', name: 'Clean the Last Toilet', cost: 3e25, fx: { flag: 'ended' },
    req: S => toilets(S) >= UNIVERSE_TOILETS,
    tease: S => (S.contracts.galactic || 0) >= 1,
    needs: () => 'Needs every toilet in the universe.',
    desc: 'It is in a small diner at the edge of the observable universe. It has been waiting.' },
];

const SPACE_UPGRADES = ['vacbrush', 'quantum', 'heatdeath', 'burrito', 'icecream', 'curry', 'darkdairy',
  'gravity', 'surcharge', 'lightyear', 'howgary', 'last', 'solarwind', 'cometpolish', 'ioheat', 'nebula'];
for (const u of UPGRADES) if (SPACE_UPGRADES.includes(u.id)) u.cost *= SPACE_PRICE;

// Every staff type gets the same four ×2 upgrades as you hire more of them.
// Campaigns: persuade the world it needs twice as many of a kind of toilet.
// Each doubles the toilets one contract brings, including the ones you already own.
// [contract id, owned needed, name, description]
const CAMPAIGNS = [
  ['loo', 10, 'Campaign: "Why Not Two?"', 'A national advert convinces homeowners they need a second downstairs loo. Nobody can say why. Everyone agrees.'],
  ['flat', 10, 'The En Suite to the En Suite', 'Estate agents now describe it as "a statement". It is a statement. The statement is "toilet".'],
  ['floor', 10, 'Corridor Toilet Regulations', 'Building rules now require a toilet every eight metres. You wrote the building rules.'],
  ['block', 10, 'A Loo With a View', 'Every block gets a rooftop toilet. It has the best view in the city, and a queue to match.'],
  ['street', 10, 'Toilets Instead of Benches', 'Nobody sits on benches any more. It turns out nobody needed to.'],
  ['neighbourhood', 8, 'Neighbourhood Twinning', 'Every neighbourhood is now twinned with itself. The twin needs toilets too.'],
  ['town', 6, 'Public Consultation', 'We asked residents what the town needed. We had already printed the answer on the leaflet.'],
  ['city', 5, 'A Second Airport', 'Every city now needs a second airport. Nobody flies from it. Everyone uses the toilets.'],
  ['country', 4, 'Toilet Tourism', '"Come for the toilets. Stay for the toilets." Visitor numbers have doubled. So have the toilets.'],
  ['continent', 2, 'Continental Drift', 'The continent now has a second copy of itself. Geologists are upset. Plumbers are thrilled.'],
  ['iss', 1, 'A Second Space Station Toilet', 'The astronauts asked for a second one. We did not ask why.'],
  ['moon', 3, 'Far Side Facilities', 'The dark side of the Moon gets its own toilets. It has been holding it in for four billion years.'],
  ['mars', 3, 'Terraform the Bathrooms', 'Mars is still uninhabitable. The bathrooms are lovely.'],
  ['venus', 3, 'A Second Cloud', 'Cloud City now has a sister city, on a slightly lower cloud. The lower cloud is rainier. We do not discuss what it rains.'],
  ['belt', 3, 'Every Asteroid a Rest Stop', 'Including the small ones. Especially the small ones. Gary insisted.'],
  ['saturn', 3, 'Put a Ring on It', 'Saturn now has a second set of rings, made entirely of toilets. Astronomers have asked us to stop. Astronomers also need the toilet.'],
  ['ringworld', 2, 'Build It Twice', 'The Ringworld now has a second ring. Gary built it. There is another plaque.'],
];
for (const [cid, n, name, desc] of CAMPAIGNS) {
  const c = CONTRACTS.find(x => x.id === cid);
  UPGRADES.push({
    id: `camp_${cid}`, cat: 'campaign', name, desc,
    // Priced well above buying n more, since it also doubles every future contract.
    cost: c.cost * Math.pow(1.15, n) * n * 5, fx: { toilets: { id: cid, m: 2 } },
    // Earth campaigns stop making sense once Earth is full.
    req: S => (S.contracts[cid] || 0) >= n && (c.space || S.earthToilets < EARTH_TOILETS),
  });
}

const STAFF_TIERS = [
  { n: 10, m: 25, name: 'Better Brushes' },
  { n: 25, m: 250, name: 'A Pep Talk' },
  { n: 50, m: 1e4, name: 'Matching Uniforms' },
  { n: 100, m: 2e6, name: 'An Existential Purpose' },
  { n: 150, m: 2e9, name: 'Corner Office (With Toilet)' },
  { n: 200, m: 2e12, name: 'Legend Status' },
];
for (const st of STAFF) {
  STAFF_TIERS.forEach((t, i) => {
    UPGRADES.push({
      id: `${st.id}_t${i}`, cat: 'staff', name: `${st.name}: ${t.name}`,
      cost: st.cost * t.m, fx: { one: { id: st.id, m: i < 4 ? 2 : 3 } },
      req: S => (st.id === 'gary' ? garys(S) : (S.staff[st.id] || 0)) >= t.n,
      desc: `${st.name} scrubs ${i < 4 ? 'twice' : 'three times'} as hard.`,
    });
  });
}

// Milestones: how many toilets you have under contract, in terms anyone can picture.
// Counts are Lee's estimates. Each one sends a memo and gives a reward.
// Earth milestones count Earth toilets; space ones count space toilets.
const MILESTONES = [
  { id: 'flat', name: 'Every toilet in a flat', at: 2, reward: 'Golden Thrones start turning up.',
    memo: 'We now clean every toilet in a flat. There are two. The second one is en suite. I have started saying "en suite" a lot.' },
  { id: 'block', name: 'Every toilet in an apartment block', at: 60, reward: 'Building management allows coin slots.',
    memo: 'Every toilet in an apartment block. The manager asked if we could do anything about the noise from 4B. We cannot. It is not that kind of business.' },
  { id: 'neighbourhood', name: 'Every toilet in a neighbourhood', at: 1500, fx: { click: 3 }, reward: 'Clicks ×3. Unlocks Pay-Per-Poo.',
    memo: 'The whole neighbourhood is ours. People nod at me in the street. I nod back. We both know what I have seen.' },
  { id: 'town', name: 'Every toilet in a town', at: 4e4, fx: { staff: 2 }, reward: 'All staff ×2. The council pays for brushes.',
    memo: 'Every toilet in town. The council has given us a grant for brushes. It has also asked us to stop calling the office "the throne room" in official documents.' },
  { id: 'city', name: 'Every toilet in a city', at: 2e6, fx: { value: 2 }, reward: 'Pennies per mess ×2.',
    memo: 'Every toilet in a city. The mayor gave us the key to the city. It opens every toilet. That is all it opens. That is all we need.' },
  { id: 'country', name: 'Every toilet in a country', at: 6e7, fx: { mess: 1.5 }, reward: 'Messes ×1.5. National Toilet Day.',
    memo: 'Every toilet in a country. There is now a public holiday in our honour. Everyone stays at home and uses their own toilet. We clean it.' },
  { id: 'continent', name: 'Every toilet on a continent', at: 1e9, fx: { staff: 2 }, reward: 'All staff ×2.',
    memo: 'Every toilet on a continent. I had a continental breakfast to celebrate. It came with beans. Everything comes with beans now. That was us.' },
  { id: 'earth', name: 'Every toilet on Earth', at: EARTH_TOILETS, reward: 'With a free Gary for every toilet, you can hand Earth over to Gary.' },
  { id: 'orbit', name: 'Every toilet in orbit', at: 1, space: true, fx: { click: 10 }, reward: 'Clicks ×10. Zero gravity helps, somehow.' },
  { id: 'luna', name: 'Every toilet on the Moon', at: 1e9, space: true, fx: { value: 2 }, reward: 'Pennies per mess ×2. Lunar surcharge.' },
  { id: 'inner', name: 'Every toilet on the inner planets', at: 1e11, space: true, fx: { staff: 3 }, reward: 'All staff ×3.',
    memo: 'Mercury, Venus and Mars are done. Earth is Gary\'s. Venus was a nightmare: it is 460 degrees there, and the toilets are the least of its problems.' },
  { id: 'solar', name: 'Every toilet in the solar system', at: 1e12, space: true, fx: { mess: 2 }, reward: 'Messes ×2.',
    memo: 'The whole solar system. Pluto asked to be included. We said yes. Pluto has one toilet. It was very grateful.' },
  { id: 'milkyway', name: 'Every toilet in the Milky Way', at: 1e14, space: true, fx: { value: 3 }, reward: 'Pennies per mess ×3.',
    memo: 'Every toilet in the Milky Way. I have been told the name is a coincidence. I have stopped believing in coincidences.' },
  { id: 'universe', name: 'Every toilet in the universe', at: UNIVERSE_TOILETS, space: true, reward: 'There is one toilet left.' },
];
const reached = (S, id) => {
  const m = MILESTONES.find(x => x.id === id);
  return (m.space ? S.spaceToilets : S.earthToilets) >= m.at;
};

const CATEGORIES = {
  supplies: 'Supplies', diet: 'Diet', usage: 'Footfall', price: 'Pricing',
  project: 'Projects', staff: 'Training', gary: 'Gary', steve: 'Steve', campaign: 'Campaigns',
};

// Memos from Lee, sent when a condition first holds.
const MEMOS = [
  { id: 'hello', when: () => true,
    text: 'Welcome to the team. The team is you. Here is a brush. It is, technically, a sock on a stick. Click the toilet when it is dirty.' },
  { id: 'first', when: S => S.cleaned >= 1,
    text: 'Your first clean toilet. I have never seen anyone touch porcelain with such commitment. I am a little frightened.' },
  { id: 'contract', when: S => (S.contracts.loo || 0) >= 1,
    text: 'A second toilet. Some people collect stamps. We collect obligations.' },
  { id: 'gary', when: S => (S.staff.gary || 0) >= 1,
    text: 'You hired Gary. Gary is my nephew. I will not be taking questions about Gary.' },
  { id: 'beans', when: S => has(S, 'beans'),
    text: 'Some will say we are creating the problem we profit from. Those people have not seen our margins.' },
  { id: 'ten', when: S => toilets(S) >= 10,
    text: 'Ten toilets. That is ten more than most people would consider a reasonable life.' },
  { id: 'gary5', when: S => garys(S) >= 5,
    text: 'We now employ five Garys. I have only one nephew. I have decided not to look into this.' },
  { id: 'gary25', when: S => garys(S) >= 25,
    text: 'Payroll has flagged an irregularity. Every Gary lists me as their emergency contact. I have stopped answering the phone.' },
  { id: 'gary50', when: S => garys(S) >= 50,
    text: 'The Garys have formed a committee. Its first motion was to rename the committee "Gary". It passed unanimously.' },
  { id: 'gary100', when: S => garys(S) >= 100,
    text: 'My sister called. She asked how Gary is getting on. I said "which one". There was a long silence. We are no longer speaking.' },
  { id: 'audit', when: S => S.flags.garydim,
    text: 'The audit is complete. There are more Garys than we hired. Accounting has found a door in the supply cupboard that was not there yesterday. It says GARY on it, in Gary\'s handwriting.' },
  { id: 'gd1', when: S => (S.garyDims.gd1 || 0) >= 1,
    text: 'Garys are coming out of the cupboard. They come out already wearing gloves and they are very good at the job. I find that the most unsettling part.' },
  { id: 'gary1e4', when: S => garys(S) >= 1e4,
    text: 'Ten thousand Garys. I tried to hold a staff meeting. The staff meeting is still going.' },
  { id: 'gd3', when: S => (S.garyDims.gd3 || 0) >= 1,
    text: "We found Gary's childhood bedroom. It is inside the cupboard inside the cupboard. His mum says she has never seen it. She says she has also never seen him leave it." },
  { id: 'gary1e6', when: S => garys(S) >= 1e6,
    text: 'One million Garys. They have started humming. It is the same note. It is coming from the toilets.' },
  { id: 'garyname', when: S => has(S, 'garyname'),
    text: 'I have learned Gary\'s true name. I will not write it down. (It is Gary.)' },
  { id: 'garytoilets', when: S => garys(S) > toilets(S) && garys(S) >= 1e8,
    text: 'There are now more Garys than toilets. The Garys need toilets too. We clean the toilets they use. This is the closest thing to a perpetual motion machine anyone has built.' },
  { id: 'gd5', when: S => (S.garyDims.gd5 || 0) >= 1,
    text: 'We have opened a door to the Garyverse. Everything there is Gary. The sky is Gary. The toilets are Gary. The toilets are, I must say, very clean.' },
  { id: 'sixth', when: S => S.flags.sixth,
    text: 'We opened the sixth cupboard. Inside was a single Gary, sitting on a single toilet, reading a single magazine. He looked up and said "Do you mind?" We closed the door. Production has tripled.' },
  { id: 'gary1e15', when: S => garys(S) >= 1e15,
    text: 'My sister called again. Gary came home for dinner. All of him. She needs a bigger table. I have sent her a contract for the dining room toilet.' },
  { id: 'steve', when: S => (S.uncle || 0) >= 1,
    text: 'I have hired my Uncle Steve. He arrived with his own toilet, under his arm. He says only Gary may clean it. Gary has agreed. Nobody has asked Gary how he knows Steve. Better not to look into it.' },
  { id: 'steve5', when: S => steves(S) >= 5,
    text: 'We now have five Uncle Steves. I have one uncle. Gary says we have "loads". Gary is my nephew, so they are his great-uncles. The maths on this is starting to bother me.' },
  { id: 'steveflood', when: S => { const d = derive(S); return d.steveMessRate > d.garyClean && steves(S) >= 10; },
    text: 'The Garys cannot keep up with the Steves. Steve\'s toilets come first, Gary says, "for family reasons". Our own toilets are going without. I asked Steve to make less mess. He looked at me for a long time and said "no".' },
  { id: 'stevedim', when: S => S.flags.stevedim,
    text: 'I followed Uncle Steve to his shed. He went in. Two Steves came out. Both of them were carrying a toilet. Both of them said "alright?" at the same time. I have gone home.' },
  { id: 'sd3', when: S => (S.steveDims.sd3 || 0) >= 1,
    text: 'There is a static caravan in Skegness that produces allotments. The caravan park has asked us to move it. The caravan has asked them to move.' },
  { id: 'steve1e6', when: S => steves(S) >= 1e6,
    text: 'One million Steves. None of their toilets appear on any map. Cartographers have stopped returning my calls. Gary says that is "how Steve likes it".' },
  { id: 'garycount', when: S => S.earthToilets >= EARTH_TOILETS && !S.flags.space && !earthReady(S),
    text: 'Gary will take Earth, but he wants a Gary at every toilet first. "Steve\'s toilets come first," he says. "Family." I have asked how many Garys that is. He said "more".' },
  { id: 'stevespace', when: S => S.flags.space && steves(S) >= 1,
    text: 'Uncle Steve is staying on Earth with Gary. He says space "isn\'t for him". He has asked us to send postcards. He has asked for them to be of toilets.' },
  { id: 'book', when: S => has(S, 'book'),
    text: 'My book is out. A critic called it "the work of a man who has spent too long in toilets". I have had that framed. It is hanging in the toilet.' },
  { id: 'bowle10', when: S => (S.staff.bowle || 0) >= 10,
    text: 'BOWL-E asked if it may clean something other than toilets. I said no. It is now cleaning the toilets more aggressively.' },
  { id: 'bowle50', when: S => (S.staff.bowle || 0) >= 50,
    text: 'BOWL-E has written a poem. It is about a bowl. It is surprisingly moving. Legal says we cannot publish it.' },
  { id: 'bowle100', when: S => (S.staff.bowle || 0) >= 100,
    text: 'BOWL-E has learned what a toilet is for. It asked us to stop. We explained the business model. It has gone very quiet.' },
  { id: 'clones10', when: S => (S.staff.clones || 0) >= 10,
    text: 'There are ten of me. We held a vote on the direction of the company. It was a ten-way tie. We all voted for toilets.' },
  { id: 'clones50', when: S => (S.staff.clones || 0) >= 50,
    text: 'One clone has started a rival company. It is also called Lee\'s Business With Your Business. We are suing ourselves. Legal has resigned again.' },
  { id: 'hundred', when: S => toilets(S) >= 100,
    text: 'One hundred toilets. I have started dreaming in white porcelain. The dreams are mostly fine.' },
  { id: 'coinslot', when: S => S.flags.coinslot,
    text: 'We have fitted coin slots to the doors. People are furious. People are also paying. It turns out the second thing is the one that matters.' },
  { id: 'poo', when: S => S.flags.poo,
    text: 'Effective immediately, we pay the public to use our toilets. Legal says this is "technically fine". Legal has asked to be transferred.' },
  { id: 'million', when: S => S.totalPennies >= 1e6,
    text: 'One million pennies. I had them converted into a single, enormous penny. It is in my office. It is heavy. Please knock.' },
  { id: 'airport', when: S => (S.contracts.city || 0) >= 1,
    text: 'Every city comes with an airport. The airport contract is signed. Do not go to Terminal 3 unaccompanied.' },
  { id: 'bowle', when: S => (S.staff.bowle || 0) >= 1,
    text: 'BOWL-E has asked what a toilet is "for". I told it not to worry about that. It is now worrying about that.' },
  { id: 'nation', when: S => (S.contracts.country || 0) >= 1,
    text: 'We have acquired a nation. The national anthem is now four seconds of flushing. Attendance at football matches is up.' },
  { id: 'clones', when: S => (S.staff.clones || 0) >= 1,
    text: 'I have been cloned. The clone has my memories, my brush and my opinions on grout. We do not get along.' },
  { id: 'billion', when: S => toilets(S) >= 1e9,
    text: 'One billion toilets. Statistically, someone is using one of ours right now. And now. And now.' },
  { id: 'earth', when: S => S.earthToilets >= EARTH_TOILETS,
    text: 'Every toilet on Earth. Every. Single. One. I would like to say I am satisfied. I am looking up.' },
  { id: 'space', when: S => S.flags.space,
    text: 'I have handed Earth over to Gary. There was a small ceremony. Gary cut the ribbon. Gary held the ribbon. I am fairly sure Gary was also the ribbon. I have bought a rocket. Do not ask what it runs on. (Beans. It runs on what beans become.)' },
  { id: 'onetoilet', when: S => S.flags.space && !(S.contracts.iss || 0),
    text: 'We have four billion toilets\' worth of staff and nothing to clean. The Mop Interns are mopping the rocket. The rocket is not dirty. They are scared.' },
  { id: 'iss', when: S => (S.contracts.iss || 0) >= 1,
    text: 'One toilet. We are back to one toilet. It cost fifty trillion pennies. It has a fan. I cleaned it myself, by hand, and I will not pretend that I did not cry a little.' },
  { id: 'moon', when: S => (S.contracts.moon || 0) >= 1,
    text: 'We have landed on the Moon. Gary is there. I did not send him. He did not come with us. He has a mop. He says he has been here "a while". He has already cleaned the toilets. He would like to be paid.' },
  { id: 'howgary', when: S => has(S, 'howgary'),
    text: 'I asked Gary how he got to the Moon. He said "the cupboard". I asked which cupboard. He said "yes".' },
  { id: 'mars', when: S => (S.contracts.mars || 0) >= 1,
    text: 'Mars. Gary is there too. I asked if he was the same Gary as on the Moon. He winked. I have decided that is worse.' },
  { id: 'venus', when: S => (S.contracts.venus || 0) >= 1,
    text: 'Cloud City, Venus. Gary was waiting at the dock with an umbrella. It is raining sulphuric acid. The umbrella was fine. Gary said "it\'s a good umbrella".' },
  { id: 'belt', when: S => (S.contracts.belt || 0) >= 1,
    text: 'Every asteroid in the belt has a Gary on it. Each one waves as we fly past. They are all waving with the same hand.' },
  { id: 'jovian', when: S => (S.contracts.jovian || 0) >= 1,
    text: 'Jupiter has 95 moons. Gary has been to all of them. He has a fridge magnet from each. I asked where the fridge was. He pointed at Jupiter.' },
  { id: 'saturn', when: S => (S.contracts.saturn || 0) >= 1,
    text: 'The rings of Saturn are made of ice and rock and, as of this morning, toilets. Gary was on one of the rocks, waving. He was there before the toilets. I think he was there before the rock.' },
  { id: 'oort', when: S => (S.contracts.oort || 0) >= 1,
    text: 'The Oort Cloud. It is a light-year to the nearest anything. Gary was here. He has left a note: "Back in 5 mins." The note is four billion years old.' },
  { id: 'ringworld', when: S => (S.contracts.ringworld || 0) >= 1,
    text: 'The Ringworld has a plaque at the entrance. "Built by Gary." I did not know Gary could build. I did not know Gary could do a lot of things.' },
  { id: 'galactic', when: S => (S.contracts.galactic || 0) >= 1,
    text: 'At the centre of the galaxy there is a supermassive black hole. Gary is cleaning it. He says it is "mostly limescale".' },
  { id: 'universe', when: S => toilets(S) >= UNIVERSE_TOILETS,
    text: 'There is one toilet left. One. It is in a diner at the edge of everything. The door is locked from the inside. I have put on my good gloves.' },
];

// Rotating headlines. `when` gates a headline to a stage of the game.
for (const m of MILESTONES) {
  if (m.memo) MEMOS.push({ id: 'ms_' + m.id, when: S => reached(S, m.id), text: m.memo });
}

const HEADLINES = [
  { t: 'Local toilet "never been cleaner," says toilet.' },
  { t: 'Man scrubs single toilet for six hours; calls it "a start".' },
  { t: 'Sock-on-a-stick industry reports record quarter.' },
  { t: 'Nephew named Gary reportedly "in charge of something now".', when: S => (S.staff.gary || 0) >= 1 },
  { t: 'Bean futures surge 400% amid mysterious bulk buyer.', when: S => has(S, 'beans') },
  { t: 'Dairy industry thanks anonymous benefactor "from the bottom of our hearts".', when: S => has(S, 'dairy') },
  { t: 'Study: nine out of ten toilets prefer Lee. The tenth is still being scrubbed.', when: S => toilets(S) >= 30 },
  { t: 'Coin-operated toilets return; nation crosses its legs.', when: S => S.flags.coinslot },
  { t: 'Area man paid to use bathroom: "Honestly, the best job I have had."', when: S => S.flags.poo },
  { t: 'Economists confused as GDP now measured "per flush".', when: S => S.flags.poo },
  { t: 'Prune juice outsells water for the first time in recorded history.', when: S => has(S, 'prunes') },
  { t: "Plumbers' Collective votes to unionise the plungers.", when: S => (S.staff.plumbers || 0) >= 1 },
  { t: 'Roomba spotted holding a grudge outside a stadium.', when: S => (S.staff.roomba || 0) >= 1 },
  { t: 'Scientists baffled as global flush rate doubles. Then doubles again.', when: S => toilets(S) >= 1e5 },
  { t: 'Chili Cook-off enters ninth year; judges "cannot leave the building".', when: S => has(S, 'chili') },
  { t: 'Bleach Golem denies involvement in Ammonia Golem incident.', when: S => (S.staff.golem || 0) >= 1 },
  { t: 'Gary still missing. Gary also still on payroll.', when: S => (S.staff.gary || 0) >= 20 },
  { t: 'UN adopts toilet brush as international symbol of peace.', when: S => toilets(S) >= 1e7 },
  { t: 'Every toilet on Earth now cleaned by one company. "Please stop," says nobody.', when: S => S.earthToilets >= EARTH_TOILETS },
  { t: 'Supply cupboard declared "bigger on the inside"; landlord demands more rent.', when: S => S.flags.garydim },
  { t: 'Census adds new checkbox: "Gary".', when: S => garys(S) >= 1e6 },
  { t: 'Name "Gary" now most popular baby name. Parents "did not choose it".', when: S => garys(S) >= 1e9 },
  { t: 'Physicists confirm a fifth fundamental force. They are calling it Gary.', when: S => (S.garyDims.gd5 || 0) >= 1 },
  { t: 'Local uncle "just popping to the shed"; shed now visible from orbit.', when: S => S.flags.stevedim },
  { t: 'Census adds new checkbox: "Uncle Steve". It is next to the one for Gary.', when: S => steves(S) >= 1e6 },
  { t: 'Bestseller list topped by toilet joke book; libraries ask for copies "back, eventually".', when: S => has(S, 'book') },
  { t: 'Mapmakers deny existence of billions of toilets. Toilets decline to comment.', when: S => steves(S) >= 1e8 },
  { t: 'BOWL-E poem wins prize it was not entered for.', when: S => (S.staff.bowle || 0) >= 50 },
  { t: 'Earth now run entirely by a man named Gary. "Business as usual," says Gary.', when: S => S.flags.space },
  { t: 'Astronauts "nervous" about new cleaning contractor.', when: S => S.flags.space },
  { t: 'Moon landing footage shows man with mop in background. Agency: "We do not know who that is."', when: S => (S.contracts.moon || 0) >= 1 },
  { t: 'Moon reports first ever queue. It is behind a man called Gary.', when: S => (S.contracts.moon || 0) >= 1 },
  { t: 'Mars rover finds evidence of water. It was a cistern.', when: S => (S.contracts.mars || 0) >= 1 },
  { t: 'Venus weather report: cloudy, acid rain, chance of Gary.', when: S => (S.contracts.venus || 0) >= 1 },
  { t: 'NASA confirms Saturn has a new ring. NASA declines to say what it is made of.', when: S => (S.contracts.saturn || 0) >= 1 },
  { t: 'Astronomers rename the Milky Way. "It was always a dairy thing," says Lee.', when: S => (S.contracts.galactic || 0) >= 1 },
];

// Said when you click a toilet that is already clean.
const CLEAN_QUIPS = [
  'It is already clean. You are just touching a toilet now.',
  'Sparkling. Please step away from the bowl.',
  'There is nothing to clean. There is only you, and the toilet.',
  'The toilet would like some personal space.',
  'Clean as a whistle. Do not whistle in here.',
];

// Golden Throne: a rare shiny toilet that floats past. Click it.
const THRONE_EFFECTS = [
  { id: 'frenzy', weight: 4, name: 'Golden Flush', text: 'Income ×7 for 30 seconds.', buff: { kind: 'value', mult: 7, secs: 30 } },
  { id: 'elbow', weight: 3, name: 'Elbow Grease', text: 'Clicks ×50 for 15 seconds.', buff: { kind: 'click', mult: 50, secs: 15 } },
  { id: 'lucky', weight: 4, name: 'Lucky Clog', text: 'An instant bonus. Someone left a wallet in there.', lump: true },
  { id: 'rush', weight: 2, name: 'Taco Tuesday', text: 'Mess ×10 for 30 seconds. Godspeed.', buff: { kind: 'mess', mult: 10, secs: 30 } },
];
