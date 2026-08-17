/* Polymaker's published hex codes.
 *
 * Bundled rather than fetched. The page these come from is a 51 MB GitBook
 * document — 814 KB even gzipped — served without an Access-Control-Allow-Origin
 * header, so a browser cannot read it at all and a phone should not download it
 * to answer one question. The table itself is 6 KB, which is nothing.
 *
 * Source: wiki.polymaker.com/polymaker-products/more-about-our-products/
 *         hex-codes-and-transmission-distances
 * Refresh: npm run polymaker  (scripts/fetch-polymaker.mjs) */
export const POLYMAKER_HEX = {
  "Translucent Cyan":"#08ABFB", "Translucent Magenta":"#D93B90", "Translucent Yellow":"#F9ED3D",
  "Translucent Grey":"#9199A4", "Neon Pink":"#FF3670", "Neon Green":"#00F263", "Neon Yellow":"#E5DB2E",
  "Neon Orange":"#FF7800", "Neon Magenta":"#F21185", "Neon Red":"#FE2D42", "Metallic Gold":"#DA9F1D",
  "Metallic Silver":"#7A838E", "Metallic Bronze":"#926043", "Celestial Blue":"#6ADCF7",
  "Celestial Green":"#6FE2D2", "Celestial Purple":"#9678C8", "Starlight Mars":"#962E31",
  "Starlight Mercury":"#33322D", "Starlight Meteor":"#2F3117", "Starlight Nebula":"#462F32",
  "Starlight Neptune":"#113148", "Starlight Twilight":"#1E3445", "UV Shift Natural/Orange":"#F1DBBF",
  "Galaxy Black":"#161617", "Galaxy Dark Blue":"#18192D", "Galaxy Dark Green":"#13484D",
  "Galaxy Dark Red":"#451E14", "Galaxy Dark Grey":"#4E5658", "Glow Blue":"#F3EADB",
  "Glow Green":"#F2EADB", "Luminous Blue":"#5FA8C2", "Luminous Green":"#BFEB8C",
  "Luminous Orange":"#FEBE5F", "Luminous Pink":"#FE9176", "Luminous Yellow":"#EEDC48",
  "Metallic Blue":"#2C3449", "Translucent Natural":"#E8E6D0", "Starlight Aurora":"#314530",
  "Starlight Comet":"#1F312A", "Starlight Jupiter":"#774718", "Metallic Green":"#434D43",
  "Starlight Midnight":"#475A64", "Starlight Pulsar":"#5C7BC1", "Celestial White":"#DCDAD0",
  "Celestial Light Yellow":"#D7CE89", "Celestial Light Pink":"#C3ADB8", "Celestial Yellow":"#F4C76A",
  "Silk Black":"#363538", "Silk Blue":"#4999C9", "Silk Brass":"#968162", "Silk Bronze":"#AF6B4C",
  "Silk Chrome":"#85898B", "Silk Gold":"#C49449", "Silk Green":"#55B687", "Silk Light Blue":"#4CC1CB",
  "Silk Lime":"#C4CF4C", "Silk Magenta":"#AA538E", "Silk Orange":"#EB6232",
  "Silk Peridot Green":"#7F865B", "Silk Quartz Pink":"#DBBBBB", "Silk Purple":"#786BB0",
  "Silk Red":"#C1443F", "Silk Rose":"#CF6076", "Silk Rose Gold":"#CBB0B1", "Silk Silver":"#BCC2C8",
  "Silk Teal":"#66C2B6", "Silk White":"#DFE4E4", "Silk Yellow":"#EEC810", "Silk Dark Blue":"#23599A",
  "Silk Gunmetal Grey":"#676B6A", "Silk Periwinkle":"#768EC7", "Matte Sky Blue":"#1AC5FC",
  "Matte Lotus Pink":"#DD76C0", "Marble Sandstone":"#C1BE97", "Marble Slate Grey":"#94B9C2",
  "Marble White":"#D7D4DA", "Matte Arctic Teal":"#61BCC3", "Matte Army Beige":"#DBBAA5",
  "Matte Army Blue":"#2E4462", "Matte Army Brown":"#795A4D", "Matte Army Dark Green":"#5F6244",
  "Matte Army Light Green":"#AB8C02", "Matte Army Purple":"#36364A", "Matte Army Red":"#BF312E",
  "Matte Ash Grey":"#485155", "Matte Charcoal Black":"#2F2E30", "Matte Cotton White":"#F4EFEB",
  "Matte Earth Brown":"#7C594A", "Matte Electric Indigo":"#6858A9", "Matte Forest Green":"#60AD70",
  "Matte Fossil Grey":"#8A8C94", "Matte Lava Red":"#ED2F2E", "Matte Lavender Purple":"#9572BF",
  "Matte Lime Green":"#D7D602", "Matte Muted Blue":"#5F778E", "Matte Muted Green":"#777E71",
  "Matte Muted Purple":"#7C5C78", "Matte Muted Red":"#D84B2E", "Matte Muted White":"#BBADA4",
  "Matte Pastel Banana":"#F7D475", "Matte Pastel Candy":"#F0D6D9", "Matte Pastel Ice":"#A4D0DF",
  "Matte Pastel Mint":"#D2DEBB", "Matte Pastel Peach":"#F6BF8B", "Matte Pastel Peanut":"#BF9573",
  "Matte Pastel Watermelon":"#EE474B", "Matte Pastel Periwinkle":"#ADB4E6",
  "Matte Sakura Pink":"#EAADBD", "Matte Sapphire Blue":"#0163A6", "Matte Savannah Yellow":"#F3C432",
  "Matte Sunrise Orange":"#F88B17", "Matte Wood Brown":"#AB7449", "Marble Limestone":"#BCBEBE",
  "Marble Brick":"#CD7456", "Satin Blue":"#0162A6", "Satin Green":"#5EAB71", "Satin Grey":"#797E89",
  "Satin Orange":"#FE9217", "Satin Polymaker Teal":"#61BBC1", "Satin Purple":"#9272C1",
  "Satin Red":"#DA1521", "Satin White":"#F5F0EC", "Satin Yellow":"#F4C131", "Satin Black":"#302E30",
  "Black":"#080A0D", "White":"#EBF7FF", "Grey":"#8C9099", "Blue":"#003776", "Red":"#E72F1D",
  "Yellow":"#FFE800", "Orange":"#F67405", "Green":"#06924D", "Purple":"#6C47B2",
  "Polymaker Teal":"#4CC0C7", "Steel Grey":"#616469", "Brown":"#55331A", "Aqua Blue":"#5EBDDB",
  "Beige":"#C2AB72", "Cold White":"#D9DFE5", "Cream":"#EED1A8", "Dark Grey":"#485259",
  "Jungle Green":"#4E742D", "Lemon Yellow":"#EED230", "Lime Green":"#D5D701", "Magenta":"#F24574",
  "Olive Drab Green":"#575B54", "Olive Green":"#948902", "Pink":"#F1A1AF", "Stone Blue":"#487BA2",
  "Tan":"#A79E82", "Wine Red":"#D60212", "Azure Blue":"#0066D9", "Dark Olive Drab":"#575B54",
  "Navy Blue":"#30548E", "Light Grey":"#ADC4D6", "Desert Sand":"#CEB69C", "Dark Red":"#855261",
  "Natural":"#DFD3C3", "Dark Blue":"#041B3D", "Glow Orange":"#FEBE5F", "Olive Brown":"#A79565",
  "Dark Gray Green":"#4C5F46", "Hedgehog Makes - Galaxy Red":"#760007", "Silk Pink":"#FFA7C4",
  "Version A - Durability with extra sand-ability":"#A7A4A8", "FDE Beige":"#90755D",
  "Army Green":"#665A30", "Silver":"#8A8D95", "Army Beige":"#C28D5E", "Light Blue":"#A8D4E8",
  "Light Green":"#C0DDA3", "Light Yellow":"#F4DA78", "Dark Purple":"#2C1C30", "Light Red":"#DC605A",
  "Gold":"#A66301", "Bronze":"#AE6840", "Blue-Green":"#022B33",
  "3D Print General Flat Dark Earth":"#90785E", "LM Sparkle Green":"#434D43",
  "Version B - Sand-ability with extra durability":"#BCBABB", "Metallic Red":"#8D352C",
  "Metallic Magenta":"#743063", "Metallic Chrome":"#505A5D", "Metallic Black":"#0C0E0C",
  "Wood":"#A8754B", "Bright Orange":"#F07806", "Bright Green":"#BDD901", "Bright Yellow":"#F6BD01",
  "Bright Red":"#D6001C", "Draft PLA":"#16161A", "Teal":"#5FCCB7", "Power Tool Yellow":"#F6B649",
  "Power Tool Red":"#CA4140", "Power Tool Green":"#CECF45", "Power Tool Teal":"#215966",
  "Clear":"#DBD5D6", "Translucent Red":"#BE0017", "Translucent Blue":"#01062F",
  "Translucent Green":"#005F2F", "Dark Green":"#2C342D", "PolyLite PETG":"#161618", "Lime":"#D8DB00",
  "Electric Blue":"#0076C1", "Transparent":"#DAD5D4", "Pearl White":"#F6F1EC",
  "Galaxy Orange":"#F57517", "Galaxy Purple":"#6545A5", "Galaxy Teal":"#2DCCD3",
  "PolyLite ABS":"#16161A", "Polymaker ASA":"#17161A", "Army Brown":"#624234", "Galaxy Blue":"#012C61",
  "Galaxy Red":"#BF1A11", "Galaxy Green":"#2E764C", "Pop Blue":"#008DC3", "Pop Pink":"#D83076",
  "Pop Green":"#77D730", "Jet Black":"#161618", "Slate Grey":"#7DA1AA", "Coral Red":"#F04B2A",
  "Snow White":"#F5F0EC", "Grass Green":"#ACE063", "Matte Pastel Beige":"#E4D0B0",
  "Matte Pastel Coral":"#F09A7E", "Matte Muted Terracotta":"#C06443", "Matte Muted Mauve":"#A36D82",
  "Matte Muted Teal":"#5D989E", "Matte Muted Moss":"#92864F", "Matte Emerald Green":"#22624F",
  "Matte Wine Burgundy":"#753E4C", "Matte Raspberry Blue":"#5472D0", "Matte Seafoam Green":"#7DD4BE",
  "Matte Grass Green":"#32BC46", "Matte Electric Magenta":"#D33A6D", "Matte Sunshine Yellow":"#F9DA07"
};

/* Polymaker names its colours by finish as well as hue — "Matte Lava Red" for
   what the spool label calls "Lava Red" — so an exact match is tried first and a
   containment match second. That order matters: "Yellow" is itself a colour and
   would otherwise be swallowed by the six that merely end in it.

   Several matches means the name is too vague to act on, and guessing at a hex
   is worse than saying so. */
export function polymakerMatch(colorName) {
  const flat = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const want = flat(colorName || "");
  if (!want) return null;
  const all = Object.keys(POLYMAKER_HEX);
  const exact = all.find(k => flat(k) === want);
  if (exact) return { name: exact, hex: POLYMAKER_HEX[exact] };
  const near = all.filter(k => flat(k).includes(want));
  return near.length === 1 ? { name: near[0], hex: POLYMAKER_HEX[near[0]] } : { ambiguous: near.length };
}

/* Polymaker sells under Polymaker, PolyTerra, PolyLite, PolyMax and more. */
export const isPolymaker = brand => /^poly/i.test((brand || "").trim());
