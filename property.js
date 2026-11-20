'use strict';

// Цены заданы в масштабе рубля 1961 года. Денежные реформы игры
// пересчитывают как деньги на руках, так и стоимость товаров.
const propertyCatalog = [
  {id: 'sewing', name: 'Швейная машинка', first: 1917, last: 1965, price: 45, access: 0,
    annual: {intellect: 1}},
  {id: 'gramophone', name: 'Патефон', first: 1930, last: 1965, price: 36, access: 0,
    annual: {happiness: 2}},
  {id: 'dacha', name: '6 соток под дачу', first: 1949, last: 1999, price: 480, access: 12,
    annual: {health: 3}, description: 'Урожай смягчает нехватку денег на еду в 1990-е.'},
  {id: 'volga', name: 'Автомобиль «Волга»', first: 1956, last: 1991, price: 5200, access: 28,
    queue: [5, 8], markup: 2.1, receipt: {reputation: 15, connections: 15}, annual: {reputation: 3, connections: 3}},
  {id: 'apartment', name: 'Кооперативная квартира', first: 1962, last: 1991, price: 4800, access: 18,
    queue: [4, 8], markup: 1.85, annual: {health: 1, happiness: 2}, description: 'Сокращает бытовые расходы семьи.'},
  {id: 'levis', name: 'Джинсы Levi’s', first: 1965, last: 1991, price: 140, access: 34,
    annual: {happiness: 1, connections: 1}},
  {id: 'rubin', name: 'Цветной телевизор «Рубин»', first: 1967, last: 1991, price: 680, access: 18,
    annual: {happiness: 2, intellect: 1}},
  {id: 'wall-unit', name: 'Чешская стенка', first: 1968, last: 1991, price: 510, access: 24,
    annual: {reputation: 2, happiness: 1}},
  {id: 'zhiguli', name: 'Автомобиль «Жигули»', first: 1970, last: 1991, price: 2900, access: 10,
    queue: [3, 6], markup: 1.7, receipt: {reputation: 15, connections: 15}, annual: {reputation: 2, connections: 2}},
  {id: 'jacket', name: 'Малиновый пиджак', first: 1992, last: 1999, price: 210, access: 8,
    annual: {reputation: 1, connections: 2}},
  {id: 'pager', name: 'Пейджер', first: 1993, last: 1999, price: 310, access: 12,
    annual: {connections: 2, intellect: 1}}
];
const propertyById = Object.fromEntries(propertyCatalog.map(item => [item.id, item]));
const owns = (game, id) => Object.hasOwn(game.property, id);
const onSale = (item, year) => year >= item.first && year <= item.last;
const marketPrice = (game, item) => Math.round(item.price * priceScale(game.year));

function marketOptions(game, item) {
  if (game.endReason || owns(game, item.id)) return [];
  const available = onSale(item, game.year);
  const readyYear = game.orders[item.id];
  const price = marketPrice(game, item);
  const access = game.connections < item.access ? 'Нужен Блат ' + item.access : '';
  const offer = (route, label, cost, condition = '') => ({
    route, label, cost, blocked: condition || (cost != null && cost > game.money ? 'Не хватает ' + currency(cents(cost - game.money)) : '')
  });

  if (!item.queue) return available ? [offer('retail', 'Купить', price, access)] : [];
  if (readyYear && game.year >= readyYear) return [offer('redeem', 'Забрать по очереди', price)];
  if (!available) return [];

  const options = [];
  if (!readyYear) options.push(offer('queue', 'Встать в очередь', null, access));
  options.push(offer('favor', 'Без очереди по блату', price, game.connections > 60 ? '' : 'Нужен Блат выше 60'));
  options.push(offer('speculator', 'Без очереди у спекулянтов', Math.round(price * item.markup)));
  return options;
}

function applyPropertyStats(game, stats = {}) {
  for (const [key, amount] of Object.entries(stats)) game[key] = clamp(game[key] + amount, 0, 100);
}

function transactProperty(game, id, route) {
  const item = propertyById[id];
  const offer = item && marketOptions(game, item).find(option => option.route === route);
  if (!offer || offer.blocked) return {ok: false, message: offer?.blocked || 'Сделка сейчас недоступна.'};

  if (route === 'queue') {
    const readyYear = game.year + rand(...item.queue);
    game.orders[id] = readyYear;
    const message = 'Заявка принята. Можно будет забрать покупку в ' + readyYear + ' году.';
    note(game, 'Очередь · ' + item.name, message);
    return {ok: true, message};
  }

  game.money = cents(game.money - offer.cost);
  game.property[id] = {year: game.year};
  delete game.orders[id];
  applyPropertyStats(game, item.receipt);
  const message = item.name + ' теперь в вашем имуществе. Уплачено ' + currency(offer.cost) + '.';
  note(game, 'Покупка · ' + item.name, message + (route === 'favor' ? ' Через знакомых.' : route === 'speculator' ? ' У спекулянтов.' : ''));
  return {ok: true, message};
}

function creditPropertyYear(game) {
  for (const item of propertyCatalog) {
    if (owns(game, item.id)) applyPropertyStats(game, item.annual);
    if (game.orders[item.id] === game.year) {
      note(game, 'Подошла очередь · ' + item.name, 'Покупку можно забрать в разделе «Имущество и Дефицит».');
    }
  }
}

// Одно приобретение может открыть разные ответы. На карточке остаётся
// максимум один дополнительный ответ, даже если подходят несколько вещей.
const propertyAnswers = {
  'archive-sewing-night': [['sewing', 'Принести свою машинку в клуб', {reputation: 9, happiness: 7}, 'В клубе закончили работу раньше и дали людям отдохнуть.']],
  'archive-record-radio': [['gramophone', 'Поставить пластинку на своём патефоне', {happiness: 12, connections: 4}, 'В паузе концерта весь дом подпевал знакомой записи.']],
  'later-34': [['gramophone', 'Послушать старые пластинки на патефоне', {happiness: 11, connections: 4}, 'Вечер превратился в обмен любимыми записями.']],
  'teen-10': [['sewing', 'Перешить куртку на своей машинке', {money: 28, happiness: 8}, 'На новой подкладке хватило ткани и для карманов.']],
  'farce': [['levis', 'Показать знакомым свои Levi’s и свести коллекционеров', {money: 205, connections: 7}, 'Коллекционеры договорились между собой и заплатили за знакомство.']],
  'coming-kitchen-rock': [['levis', 'Прийти в Levi’s и помочь собрать компанию', {happiness: 10, connections: 7}, 'После репетиции предложили познакомиться с другой группой.']],
  'adult-5': [
    ['apartment', 'Разместить семью в своей квартире', {happiness: 12, connections: 4}, 'Родным хватило места, а старые расходы удалось отложить.'],
    ['wall-unit', 'Освободить полки стенки для гостей', {happiness: 9, reputation: 6}, 'Дополнительное место позволило устроить общую комнату без ссор.']
  ],
  'adult-13': [['wall-unit', 'Переложить вещи в чешскую стенку', {reputation: 5, happiness: 9, money: 52}, 'После переезда вещей кладовку освободили без дополнительных расходов.']],
  'history-1980': [['rubin', 'Устроить показ на своём цветном «Рубине»', {happiness: 12, connections: 7, reputation: 4}, 'У экрана собрался весь подъезд. Соревнования впервые увидели в цвете.']],
  'later-30': [['rubin', 'Устроить домашний показ на «Рубине»', {happiness: 11, connections: 5}, 'Вместо большого зала собрался маленький круг соседей.']],
  'youth-12': [['dacha', 'Разбить грядки на своих шести сотках', {health: 5, happiness: 11, money: 95}, 'Первый урожай оказался щедрым, лишние овощи разобрали соседи.']],
  'senior-six-sotkas': [['dacha', 'Пустить соседей в свою теплицу', {health: 6, connections: 7, happiness: 7}, 'В благодарность соседи помогали на участке всё лето.']],
  'later-23': [['dacha', 'Привезти к столу овощи со своего участка', {health: 5, happiness: 8, money: 75}, 'Дачные запасы избавили от тяжёлой поездки на рынок.']],
  'history-1998': [['dacha', 'Переждать скачок цен за счёт дачного урожая', {health: 5, happiness: 12, money: 195}, 'Хватило картофеля и заготовок, часть урожая отдали близким.']],
  'adult-11': [
    ['volga', 'Подвезти семейного врача на своей «Волге»', {health: 11, reputation: 6, connections: 4}, 'Договорились об осмотре дома и обошлись без долгой дороги.'],
    ['zhiguli', 'Приехать на лечение на своих «Жигулях»', {health: 9, happiness: 5, money: -35}, 'Получилось добраться в удобный час с короткой остановкой у друзей.']
  ],
  'youth-17': [
    ['volga', 'Съездить с организаторами на своей «Волге»', {reputation: 9, connections: 7}, 'Организаторы заранее проверили маршрут и место для остановки.'],
    ['zhiguli', 'Подвезти оставшихся пассажиров на «Жигулях»', {reputation: 7, connections: 5, money: -28}, 'Тем, кто остался без места, тоже удалось поехать.']
  ],
  'adult-22': [['apartment', 'Остаться в своей кооперативной квартире', {happiness: 10, money: 125}, 'Переезд отменили, а сэкономленное отложили на ремонт.']],
  'midlife-workshop-1988': [['apartment', 'Принять первые заказы у себя дома', {money: 340, connections: 6, reputation: 4}, 'Договоры подписали без срочной аренды отдельного офиса.']],
  'midlife-shuttle': [
    ['pager', 'Согласовать заказы через пейджер до поездки', {money: 720, connections: 8}, 'Покупатели заранее подтвердили заказы и разобрали товар по приезде.'],
    ['jacket', 'Встретиться с торговцами в своём малиновом пиджаке', {money: 485, connections: 6}, 'Знакомые помогли свести поставщика с постоянными покупателями.']
  ],
  'midlife-barter': [['pager', 'Через пейджер собрать покупателей к расчёту', {money: 570, connections: 6}, 'Покупатели успели приехать к выдаче товара.']],
  'midlife-new-sign': [['jacket', 'Прийти в малиновом пиджаке на переговоры с владельцем', {money: 400, reputation: 7, connections: 5}, 'После встречи подписали договор о выплате части долга.']]
};

function propertyChoice(game, cardId) {
  const answer = propertyAnswers[cardId]?.find(([id]) => owns(game, id));
  if (!answer) return null;
  const [id, label, effects, outcome] = answer;
  return {...special(label, effects, outcome), propertyName: propertyById[id].name};
}
