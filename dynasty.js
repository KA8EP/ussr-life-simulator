'use strict';

const newspaperIssues = {
  1917: ['В Петрограде сменилась власть', 'II съезд Советов объявил о переходе власти к Советам.', 'Приняты декреты о мире и земле.', 0.45, 5.4],
  1929: ['Страна приступает к первой пятилетке', 'Утверждён первый пятилетний план. На промышленные стройки набирают рабочих.', 'В деревне усиливается кампания коллективизации.', 0.25, 1.94],
  1941: ['Германия напала на Советский Союз', '22 июня объявлено о начале войны. В стране идёт мобилизация.', 'В тыл отправляют семьи и заводское оборудование.', 0.85, 5.3],
  1945: ['Победа! Война в Европе окончена', '9 мая объявлен Днём Победы. Семьи ждут возвращения близких.', 'В освобождённых городах предстоит восстановить жильё и школы.', 1.05, 5.3],
  1953: ['Страна прощается с Иосифом Сталиным', 'В марте объявлено о смерти главы правительства.', 'Указ об амнистии меняет судьбы заключённых и их семей.', 1.60, 4],
  1961: ['Юрий Гагарин совершил полёт вокруг Земли', '12 апреля корабль «Восток-1» вышел на орбиту с первым космонавтом.', 'С января цены и выплаты пересчитывают в новых рублях.', 0.16, 0.9],
  1980: ['В Москве открылись Олимпийские игры', 'Столица принимает спортсменов и гостей. Олимпийский Мишка появился на витринах и открытках.', 'За соревнованиями следят у экранов по всей стране.', 0.20, 0.64],
  1986: ['Авария на Чернобыльской АЭС', 'После аварии на четвёртом энергоблоке эвакуируют жителей Припяти и окрестностей.', 'В разных городах организуют сбор помощи переселенцам.', 0.22, 0.71],
  1991: ['Советский Союз прекращает существование', 'Августовский путч провалился. В декабре союзные республики разошлись, а СССР прекратил существование.', 'Январский обмен купюр и рост цен отразились на семейных сбережениях.', 0.80, 32],
  1998: ['Августовский кризис: рубль слабеет', '17 августа российское правительство объявило о реструктуризации части государственного долга.', 'Поставщики меняют цены, банки задерживают расчёты.', 3.20, 20.65]
};

function initDynasty(game) {
  game.entryYear ??= game.birth;
  game.generation ??= 1;
  game.lineage ??= [];
  game.partner ??= null;
  game.marriedYear ??= null;
  game.children ??= [];
  game.stigma ??= false;
  game.badgeFacts ??= {};
  game.badgesEarned ??= [];
}

function childSurname(parent, sex) {
  const pair = surnames.find(forms => forms.includes(parent.surname));
  return pair ? pair[sex === 'm' ? 0 : 1] : parent.surname;
}

function applyFamilyChoice(game, action) {
  if (action === 'meet' && !game.partner) {
    const sex = game.sex === 'm' ? 'f' : 'm';
    game.partner = {name: pick(names[sex]), sex, year: game.year};
    return 'Знакомство: ' + game.partner.name + '.';
  }
  if (action === 'marry' && game.partner && game.marriedYear == null) {
    game.marriedYear = game.year;
    return 'Супруги: ' + game.firstName + ' и ' + game.partner.name + '.';
  }
  if (action === 'birth' && game.marriedYear != null && game.children.length < 3) {
    const sex = pick(['m', 'f']);
    const unusedNames = names[sex].filter(name => !game.children.some(child => child.firstName === name));
    const child = {sex, firstName: pick(unusedNames), surname: childSurname(game, sex), birth: game.year};
    game.children.push(child);
    return (sex === 'm' ? 'Родился сын: ' : 'Родилась дочь: ') + child.firstName + ' ' + child.surname + '.';
  }
  return '';
}

function familyEvents() {
  const familyCard = (id, title, copy, eligible, choices, maxAge = 56) =>
    event('family-' + id, 18, maxAge, 1917, Infinity, title, copy, choices, {category: 'Семья', eligible});
  const looking = game => !game.partner;
  const engaged = game => game.partner && game.marriedYear == null && game.year > game.partner.year;
  const canHaveChild = game => game.marriedYear != null && game.year > game.marriedYear &&
    game.children.length < 3 && lifeAge(game) <= (game.sex === 'f' ? 44 : 55) &&
    game.year - (game.children.at(-1)?.birth ?? game.marriedYear - 1) >= 2;
  return [
    familyCard('meeting', 'Знакомство во дворе', 'Соседи зовут на чай и обещают познакомить с человеком, который недавно поселился рядом.', looking, [
      safe('Согласиться на знакомство', {family: 'meet', happiness: 6, reputation: 3}, 'Разговор продолжился до позднего вечера.'),
      risk('Сразу позвать на прогулку за город', 38, 'connections',
        {family: 'meet', happiness: 13, connections: 6}, {happiness: -7, money: -19}, 'Прогулка положила начало отношениям.', 'До прогулки дело не дошло.'),
      soul('Провести вечер в одиночестве', {money: -8, happiness: 7}, 'Появилось время заняться любимым делом.')
    ], 52),
    familyCard('second-meeting', 'Письмо с приглашением', 'В письме от друзей — приглашение на ужин и обещание нового знакомства.', looking, [
      safe('Зайти в гости и познакомиться', {family: 'meet', reputation: 4, happiness: 6}, 'Нашлись общие знакомые и темы для разговора.'),
      risk('Устроить встречу у себя дома', 35, 'connections', {family: 'meet', happiness: 12, connections: 6},
        {money: -24, happiness: -6}, 'Домашний вечер запомнился обоим.', 'Гости отменили встречу в последний момент.'),
      soul('Отдать вечер друзьям', {money: -12, happiness: 8}, 'Давно не удавалось так спокойно побыть вместе.')
    ], 59),
    familyCard('wedding', 'День свадьбы', game => 'У вас с ' + game.partner.name + ' заходит разговор о свадьбе. Родные уже спрашивают, когда готовить стол.', engaged, [
      safe('Оформить брак и собрать близких', {family: 'marry', money: -28, reputation: 7, happiness: 9}, 'Решили отпраздновать дома, вместе с самыми близкими.'),
      risk('Устроить большую свадьбу', 36, 'connections', {family: 'marry', happiness: 17, reputation: 8, money: -35},
        {family: 'marry', money: -100, happiness: -6}, 'Гости помогли устроить праздник и поделили расходы.', 'Брак оформили, но праздник обошёлся дороже, чем рассчитывали.'),
      soul('Отложить свадьбу и провести день вдвоём', {money: -8, happiness: 9}, 'День позволил спокойно обсудить планы.')
    ], 64),
    familyCard('small-wedding', 'Подписи вдвоём', game => game.partner.name + ' предлагает ещё раз поговорить о браке и зарегистрировать его без большой свадьбы.', engaged, [
      safe('Зарегистрировать брак', {family: 'marry', reputation: 7, happiness: 8}, 'День провели в кругу близких.'),
      risk('Позвать родственников из других городов', 32, 'connections', {family: 'marry', happiness: 15, connections: 7},
        {family: 'marry', money: -60, happiness: -5}, 'На свадьбу приехали даже дальние родные.', 'Большая часть гостей не приехала, но брак зарегистрировали.'),
      soul('Продолжать отношения без регистрации', {happiness: 7, money: -7}, 'У обоих осталось время подумать.')
    ], 66),
    ...[
      ['first-child', 'Место для колыбели', 'После разговора о детях близкие освободили угол комнаты и предложили старую колыбель.', 0],
      ['next-child', 'Семья становится больше', 'В доме снова обсуждают, как выкроить время, место и деньги для ребёнка.', 1],
      ['third-child', 'Третья колыбель', 'Близкие готовы помочь с детьми и спрашивают, хочется ли вам ещё одного ребёнка.', 2]
    ].map(([id, title, copy, childCount]) => familyCard(id, title, copy,
      game => canHaveChild(game) && game.children.length === childCount, [
        safe('Решиться на ребёнка и принять помощь семьи', {family: 'birth', money: -33, happiness: 9, reputation: 4}, 'Близкие помогли устроить комнату и первые недели ухода.'),
        risk('Положиться на свои силы', 40, 'health', {family: 'birth', happiness: 15, reputation: 6},
          {family: 'birth', money: -72, happiness: -7}, 'Семья смогла справиться с расходами и заботами.', 'Первые недели оказались тяжёлыми, пришлось просить помощи.'),
        soul('Отложить решение и провести время с семьёй', {money: -10, happiness: 8}, 'Спокойный вечер помог обсудить планы без спешки.')
      ])),
    event('badge-sport', 15, 55, 1932, 1941, 'Зачёт в районном спортивном клубе',
      'В клубе ОСОАВИАХИМа объявили зачёт на значок «Ворошиловский стрелок». Участникам предстоит пройти спортивную проверку.', [
        safe('Помочь клубу со списками участников', {reputation: 5, intellect: 3}, 'Зачёт провели по расписанию.'),
        risk('Записаться на спортивный зачёт', 37, 'health', {reputation: 12, happiness: 8},
          {happiness: -5}, 'Норматив принят, в клубе вручили значок.', 'До зачёта не хватило результата.'),
        soul('Поддержать знакомых на соревновании', {money: -9, happiness: 8}, 'После зачёта вместе посидели за чаем.')
      ], {category: 'Спортивный клуб'})
  ];
}

function heirsOf(game) {
  return game.endReason && game.health <= 0 ? game.children : [];
}

function inheritDynasty(parent, child) {
  if (!heirsOf(parent).includes(child)) return null;
  const game = baseGame(child.birth);
  const stigma = parent.persecuted || parent.stigma;
  const inheritedProperty = Object.fromEntries(['apartment', 'dacha']
    .filter(id => owns(parent, id)).map(id => [id, {year: parent.year, inherited: true}]));
  const money = cents(Math.max(0, parent.money) * .6);
  const benefit = clamp(Math.floor(parent.connections / 4), 5, 25);
  Object.assign(game, {
    ...child, year: parent.year, entryYear: parent.year, city: parent.city, family: 'Династия ' + child.surname,
    money, peakMoney: money, property: inheritedProperty, bankShare: parent.bankShare, stigma,
    connections: stigma ? Math.min(12, game.connections) : clamp(game.connections + benefit, 0, 100),
    reputation: stigma ? clamp(game.reputation - 20, 0, 100) : game.reputation,
    loyalty: stigma ? clamp(game.loyalty - 10, 0, 100) : game.loyalty,
    originRisk: stigma ? Math.max(30, game.originRisk) : game.originRisk,
    generation: parent.generation + 1,
    lineage: [...parent.lineage, {name: parent.firstName + ' ' + parent.surname, birth: parent.birth, death: parent.year}]
  });
  const age = lifeAge(game);
  setJob(game, age >= 60 ? 'retiree' : age >= 18 ? (game.intellect >= 60 ? 'engineer' : 'worker') : age >= 7 ? 'school' : 'child');
  game.annualJob = game.job;
  game.draftChecked = age > 22;
  const property = Object.keys(inheritedProperty).map(id => propertyById[id].name).join(', ');
  game.badgeFacts.heirloom = Boolean(property);
  note(game, 'Принятие наследства', 'От ' + parent.firstName + ' ' + parent.surname + ': ' + currency(money) +
    (property ? ' · ' + property : '') + '. ' + (stigma ? 'В новом деле осталось клеймо репрессированной семьи.' : 'Семейные связи дали +' + benefit + ' к Блату.'));
  beginTurn(game);
  return game;
}

function recordBadgeFact(game, cardId, choice, success) {
  if (choice.kind !== 'risk' || !success) return;
  const facts = {'badge-sport': 'sport', 'archive-stakhanov': 'stakhanov', 'archive-celina': 'celina'};
  if (facts[cardId]) game.badgeFacts[facts[cardId]] = true;
  if (['farce', 'archive-nep-shop', 'archive-market-wartime', 'midlife-tape-deck', 'midlife-shuttle'].includes(cardId)) {
    game.badgeFacts.underground = (game.badgeFacts.underground ?? 0) + 1;
  }
}

const museumBadges = [
  ['sport', 'Ворошиловский стрелок', 'Сдать спортивный зачёт в ОСОАВИАХИМе.', '◎', 'red', g => g.badgeFacts.sport],
  ['shock', 'Ударник пятилетки', 'Успешно взять рекордную стахановскую смену.', '★', 'red', g => g.badgeFacts.stakhanov],
  ['veteran', 'Ветеран ВОВ', 'Пройти военную службу и дожить до конца войны.', '✦', 'gold', g => g.warServiceYear != null && g.year >= 1946],
  ['virgin', 'Покоритель целины', 'Удачно завершить сезонную работу на целине.', '✿', 'green', g => g.badgeFacts.celina],
  ['nineties', 'Пережил лихие 90-е', 'Начать до 1993 года и встретить 2000-й.', '◆', 'blue', g => g.entryYear <= 1992 && g.year >= 2000],
  ['dynasty', 'Основатель династии', 'Продолжить жизнь за ребёнка героя.', '♜', 'gold', g => g.generation >= 2],
  ['underground', 'Подпольный миллионер', 'Успешно провести две теневые сделки и накопить 7 500 ₽ в масштабе 1961 года.', '₽', 'gold', g => g.badgeFacts.underground >= 2 && g.peakMoney / priceScale(g.year) >= 7500],
  ['marriage', 'Семейная печать', 'Зарегистрировать брак.', '♥', 'red', g => g.marriedYear != null],
  ['parent', 'Колыбель в доме', 'Стать родителем.', '○', 'green', g => g.children.length > 0],
  ['heirloom', 'Семейное наследство', 'Унаследовать квартиру или дачу.', '⌂', 'green', g => g.badgeFacts.heirloom],
  ['garden', 'Садовод-любитель', 'Приобрести дачу.', '✿', 'green', g => owns(g, 'dacha')],
  ['motorist', 'Автолюбитель', 'Получить «Жигули» или «Волгу».', '◉', 'blue', g => owns(g, 'zhiguli') || owns(g, 'volga')],
  ['coop', 'Кооператор', 'Создать кооператив или начать работать кооператором.', '⚙', 'red', g => g.career.includes('cooperator')],
  ['engineer', 'Инженерный знак', 'Стать инженером.', '◇', 'blue', g => g.career.includes('engineer')],
  ['scholar', 'Книжный человек', 'Довести Интеллект до 85.', '✎', 'blue', g => g.intellect >= 85],
  ['respected', 'Почётный гражданин', 'Довести Репутацию до 90.', '★', 'gold', g => g.reputation >= 90],
  ['friends', 'Свой человек', 'Довести Блат до 80.', '✧', 'green', g => g.connections >= 80],
  ['lucky', 'Везунчик', 'Успешно пройти 10 рискованных решений.', '♣', 'red', g => g.riskWins >= 10],
  ['longlife', 'Долгожитель', 'Дожить до 80 лет.', '✦', 'gold', g => lifeAge(g) >= 80],
  ['recovered', 'Начать сначала', 'Вернуться на свободу после ареста.', '☀', 'blue', g => g.arrests > 0 && g.job !== 'prisoner']
];
const museumKey = 'life-file-ussr:museum:1';
const sessionMuseum = new Set();

function readMuseum() {
  try {
    const saved = JSON.parse(localStorage.getItem(museumKey));
    if (Array.isArray(saved)) {
      for (const id of saved) if (museumBadges.some(([known]) => known === id)) sessionMuseum.add(id);
    }
  } catch {}
  return sessionMuseum;
}

function unlockBadges(game) {
  const collected = readMuseum();
  let changed = false;
  for (const [id, title, , , , condition] of museumBadges) {
    if (!game.badgesEarned.includes(id) && condition(game)) {
      game.badgesEarned.push(id);
      if (!collected.has(id)) note(game, 'Музей наград · ' + title, 'Значок добавлен в постоянную коллекцию.');
    }
    if (game.badgesEarned.includes(id) && !collected.has(id)) {
      collected.add(id);
      changed = true;
    }
  }
  if (changed) {
    try { localStorage.setItem(museumKey, JSON.stringify([...collected])); } catch {}
  }
}
